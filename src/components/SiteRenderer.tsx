import React from "react";
import type { ComponentData } from "../App";
import { RenderableComponent } from "./RenderableComponent";

interface SiteRendererProps {
    components: ComponentData[];
    projectId?: string;
    userProjectConfig?: {
        supabaseUrl: string;
        supabaseKey: string;
    };
    backgroundColor?: string;
    showGrid?: boolean; // Kept for compatibility but ignored
    activePageId?: string;
    navigate?: (path: string) => void;
    siteTitle?: string;
    siteLogoUrl?: string;
}

export function SiteRenderer({
    components,
    projectId,
    userProjectConfig,
    backgroundColor = "#ffffff",
    activePageId = 'home',
    navigate,
    siteTitle,
    siteLogoUrl,
}: SiteRendererProps) {
    // Update document title and favicon if siteTitle/siteLogoUrl are provided
    React.useEffect(() => {
        if (siteTitle) {
            document.title = siteTitle;
        }

        if (siteLogoUrl) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = siteLogoUrl;
        }
    }, [siteTitle, siteLogoUrl]);
    // Filter components by activePageId or 'all'
    const filteredComponents = components.filter(c => {
        const componentPageId = c.page_id || 'home';
        const activeId = activePageId || 'home';

        if (c.page_id === 'all') return true;
        return componentPageId === activeId;
    });

    // Compute the canvas height needed so the container is tall enough to show all
    // absolutely-positioned components (matching Canvas.tsx behaviour).
    const canvasHeight = filteredComponents.reduce((maxY, comp) => {
        const y = comp.position?.y ?? 0;
        const h =
            Number.parseFloat(String(comp.style?.height || "100").replace("px", "")) || 100;
        return Math.max(maxY, y + h);
    }, 0);

    // Add some bottom padding so components near the edge don't get clipped
    const containerHeight = Math.max(canvasHeight + 80, window.innerHeight);

    return (
        <div
            className="w-full relative"
            style={{ backgroundColor, minHeight: `${containerHeight}px`, height: `${containerHeight}px` }}
        >
            {filteredComponents.map((component) => {
                const position = component.position || { x: 0, y: 0 };
                return (
                    <div
                        key={component.id}
                        id={component.id}
                        data-component-id={component.id}
                        style={{
                            position: "absolute",
                            left: `${position.x}px`,
                            top: `${position.y}px`,
                            width: "fit-content",
                            height: "fit-content",
                        }}
                    >
                        <RenderableComponent
                            component={component}
                            projectId={projectId}
                            isSelected={false}
                            onUpdate={() => { }}
                            onDelete={() => { }}
                            disabled={false}
                            isPreview={true}
                            userProjectConfig={userProjectConfig}
                            onEditComponent={() => { }}
                            navigate={navigate}
                        />
                    </div>
                );
            })}
        </div>
    );
}
