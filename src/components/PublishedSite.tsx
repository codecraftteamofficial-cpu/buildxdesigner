import React, { useEffect, useState } from "react";

import { fetchProjectBySubdomain } from "../supabase/data/projectService";
import { Loader2 } from "lucide-react";

import { SiteRenderer } from "./SiteRenderer";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from "./ui/sonner";


export function PublishedSite() {
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activePageId, setActivePageId] = useState<string>('home');

    const getActivePageFromPath = (path: string, pages: any[]) => {
        if (!pages || pages.length === 0) return 'home';

        let pathname = path;
        
        // Handle subdomain mode with page parameter
        if (path.includes('?page=')) {
            const urlParams = new URLSearchParams(path.split('?')[1]);
            pathname = '/' + (urlParams.get('page') || 'home');
        } else if (path.startsWith('?')) {
            // Handle cases where path is just the search params
            const urlParams = new URLSearchParams(path.substring(1));
            pathname = '/' + (urlParams.get('page') || 'home');
        } else {
            pathname = path.split('?')[0];
        }
        
        if (pathname.length > 1 && pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }
        const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

        // Handle root path or /home alias
        if (normalizedPath === '/' || normalizedPath === '/home') {
            return 'home';
        }

        // Find page by path
        const page = pages.find(p => {
            let pagePath = p.path.startsWith('/') ? p.path : `/${p.path}`;
            if (pagePath.length > 1 && pagePath.endsWith('/')) {
                pagePath = pagePath.slice(0, -1);
            }
            return pagePath === normalizedPath;
        });

        return page ? page.id : 'home';
    };

    const navigate = (path: string) => {
        // Handle subdomain-based navigation
        const currentUrl = new URL(window.location.href);
        const isSubdomainMode = currentUrl.searchParams.has('subdomain');
        
        if (isSubdomainMode && path.startsWith('/')) {
            // For subdomain mode, update the page parameter instead of changing the path
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('page', path.replace('/', ''));
            window.history.pushState({}, '', newUrl.toString());
        } else if (isSubdomainMode && path.includes('?page=')) {
            // Handle direct page parameter navigation
            window.history.pushState({}, '', path);
        } else {
            // Normal navigation
            window.history.pushState({}, '', path);
        }
        
        const newPageId = getActivePageFromPath(path, project?.pages || []);
        setActivePageId(newPageId);
    };

    useEffect(() => {
        const loadProject = async () => {
            const hostname = window.location.hostname;
            const parts = hostname.split(".");
            let subdomain = "";

            if (process.env.NODE_ENV === "development" && hostname.includes("localhost")) {
                const params = new URLSearchParams(window.location.search);
                const override = params.get("subdomain");
                if (override) {
                    subdomain = override;
                }
            } else if (parts.length > 2) {
                const isVercel = hostname.endsWith(".vercel.app");
                if (!isVercel) {
                    subdomain = parts[0];
                }
            }

            if (!subdomain || subdomain === "www" || subdomain === "app") {
                setError("No subdomain found");
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await fetchProjectBySubdomain(subdomain);
                if (error || !data) {
                    setError("Site not found");
                } else {
                    const configNode = data.project_layout?.find((c: any) => c.type === 'project-config');
                    let extractedConfig = undefined;

                    if (configNode?.props?.supabaseUrl && configNode?.props?.supabaseKey) {
                        extractedConfig = {
                            supabaseUrl: configNode.props.supabaseUrl,
                            supabaseKey: configNode.props.supabaseKey
                        };
                    }

                    if (data.project_layout) {
                        data.project_layout = data.project_layout.filter((c: any) => c.type !== 'project-config');
                    }

                    setProject({ ...data, userProjectConfig: extractedConfig });
                }
            } catch (err) {
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
            // Check for page parameter in subdomain mode
            const currentUrl = new URL(window.location.href);
            const isSubdomainMode = currentUrl.searchParams.has('subdomain');
            
            let pathToUse;
            if (isSubdomainMode) {
                const pageParam = currentUrl.searchParams.get('page');
                pathToUse = pageParam ? `?page=${pageParam}` : window.location.search + window.location.hash;
            } else {
                pathToUse = window.location.pathname;
            }
            
            setActivePageId(getActivePageFromPath(pathToUse, project.pages || []));
        };

        // Initial detection
        const currentUrl = new URL(window.location.href);
        const isSubdomainMode = currentUrl.searchParams.has('subdomain');
        
        let initialPath;
        if (isSubdomainMode) {
            const pageParam = currentUrl.searchParams.get('page');
            initialPath = pageParam ? `?page=${pageParam}` : window.location.search + window.location.hash;
        } else {
            initialPath = window.location.pathname;
        }
        
        setActivePageId(getActivePageFromPath(initialPath, project.pages || []));

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
            <Toaster position="top-right" richColors />
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
