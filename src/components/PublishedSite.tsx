import React, { useEffect, useState } from "react";
import { Canvas } from "./Canvas";
import { fetchProjectBySubdomain } from "../supabase/data/projectService";
import { Loader2 } from "lucide-react";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export function PublishedSite() {
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProject = async () => {
            const hostname = window.location.hostname;
            // Extract subdomain: "mysite.buildxdesigner.site" -> "mysite"
            // For localhost testing, we might need a different logic or manual override
            // Assuming structure is [subdomain].[domain].[tld]
            const parts = hostname.split(".");
            let subdomain = "";

            if (process.env.NODE_ENV === "development" && hostname.includes("localhost")) {
                // Allow testing with query param in dev: http://localhost:3000/?subdomain=mysite
                const params = new URLSearchParams(window.location.search);
                const override = params.get("subdomain");
                if (override) {
                    subdomain = override;
                }
            } else if (parts.length > 2) {
                subdomain = parts[0];
            }

            if (!subdomain || subdomain === "www" || subdomain === "app") {
                // Should have been handled by App.tsx routing, but just in case
                setError("No subdomain found");
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await fetchProjectBySubdomain(subdomain);
                if (error || !data) {
                    setError("Site not found");
                } else {
                    setProject(data);
                }
            } catch (err) {
                setError("Failed to load site");
            } finally {
                setLoading(false);
            }
        };

        loadProject();
    }, []);

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
            <div className="w-full h-screen overflow-hidden bg-background">
                <div className="pointer-events-auto h-full overflow-auto">

                    <Canvas
                        projectId={project.id}
                        projectName={project.name || "Published Site"}
                        readOnly={true}
                        // These handlers are disabled in readOnly mode, but required by types
                        onSelectComponent={() => { }}
                        onUpdateComponent={() => { }}
                        onDeleteComponent={() => { }}
                        onReorderComponent={() => { }}
                        onZoomChange={() => { }}
                        components={project.project_layout || []}
                        selectedComponent={null}
                        canvasZoom={100}
                        backgroundColor={project.backgroundColor || "#ffffff"}
                        showGrid={false}
                    />
                </div>
            </div>
        </DndProvider>
    );
}
