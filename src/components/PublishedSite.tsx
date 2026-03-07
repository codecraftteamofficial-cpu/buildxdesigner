import React, { useEffect, useState } from "react";

import { fetchProjectBySubdomain } from "../supabase/data/projectService";
import { Loader2 } from "lucide-react";

import { SiteRenderer } from "./SiteRenderer";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';


export function PublishedSite() {
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activePageId, setActivePageId] = useState<string>('home');

    const getActivePageFromPath = (path: string, pages: any[]) => {
        if (!pages || pages.length === 0) return 'home';

        const normalizedPath = path.startsWith('/') ? path : `/${path}`;

        if (normalizedPath === '/' || normalizedPath === '/home') {
            return 'home';
        }

        const page = pages.find(p => {
            const pagePathNormalized = p.path.startsWith('/') ? p.path : `/${p.path}`;
            return pagePathNormalized === normalizedPath;
        });

        return page ? page.id : 'home';
    };

    const navigate = (path: string) => {
        window.history.pushState({}, '', path);
        const newPageId = getActivePageFromPath(path, project?.pages || []);
        setActivePageId(newPageId);
    };

    useEffect(() => {
        const loadProject = async () => {
            const hostname = window.location.hostname;
            const parts = hostname.split(".");
            let subdomain = "";

            if (process.env.NODE_ENV === "development" && hostname.includes("localhost")) {
                // Dev mode: use ?subdomain=xxx query param
                const params = new URLSearchParams(window.location.search);
                const override = params.get("subdomain");
                if (override) {
                    subdomain = override;
                }
            } else {
                // Production: *.buildxdesigner.site
                // parts[0] is the subdomain for any host with 3+ segments
                // e.g. "l3yuu.buildxdesigner.site" → ["l3yuu", "buildxdesigner", "site"]
                if (parts.length >= 3) {
                    subdomain = parts[0];
                } else if (parts.length === 2) {
                    // Apex domain hit (buildxdesigner.site) — no subdomain
                    subdomain = "";
                }
            }

            // Guard against non-project subdomains
            const RESERVED = ["www", "app", "api", "mail", "ftp", "buildxdesigner"];
            if (!subdomain || RESERVED.includes(subdomain)) {
                setError("No subdomain found");
                setLoading(false);
                return;
            }

            try {
                console.log("[PublishedSite] Loading subdomain:", subdomain);
                const { data, error: fetchError } = await fetchProjectBySubdomain(subdomain);

                if (fetchError) {
                    console.error("[PublishedSite] Fetch error:", fetchError);
                    setError("Site not found");
                    setLoading(false);
                    return;
                }

                if (!data) {
                    console.warn("[PublishedSite] No data returned for subdomain:", subdomain);
                    setError("Site not found");
                    setLoading(false);
                    return;
                }

                // Extract optional Supabase config from layout
                const configNode = data.project_layout?.find((c: any) => c.type === 'project-config');
                let extractedConfig = undefined;

                if (configNode?.props?.supabaseUrl && configNode?.props?.supabaseKey) {
                    extractedConfig = {
                        supabaseUrl: configNode.props.supabaseUrl,
                        supabaseKey: configNode.props.supabaseKey
                    };
                }

                // Strip config node from rendered layout
                if (data.project_layout) {
                    data.project_layout = data.project_layout.filter((c: any) => c.type !== 'project-config');
                }

                setProject({ ...data, userProjectConfig: extractedConfig });
            } catch (err) {
                console.error("[PublishedSite] Unexpected error:", err);
                setError("Failed to load site");
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, []);

    useEffect(() => {
        if (!project) return;

        const handlePopState = () => {
            setActivePageId(getActivePageFromPath(window.location.pathname, project.pages || []));
        };

        setActivePageId(getActivePageFromPath(window.location.pathname, project.pages || []));

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [project]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground animate-in fade-in zoom-in duration-300">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-xl text-muted-foreground">{error || "Site not found"}</p>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <SiteRenderer
                projectId={project.id}
                components={project.project_layout || []}
                backgroundColor={project.backgroundColor || "#ffffff"}
                activePageId={activePageId}
                navigate={navigate}
                userProjectConfig={project.userProjectConfig}
                siteTitle={project.siteTitle}
                siteLogoUrl={project.siteLogoUrl}
            />
        </DndProvider>
    );
}