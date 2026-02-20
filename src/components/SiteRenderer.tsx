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
}

export function SiteRenderer({
    components,
    projectId,
    userProjectConfig,
    backgroundColor = "#ffffff",
}: SiteRendererProps) {
    // Compute the canvas height needed so the container is tall enough to show all
    // absolutely-positioned components (matching Canvas.tsx behaviour).
    const canvasHeight = components.reduce((maxY, comp) => {
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
            {components.map((component) => {
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
                        />
                    </div>
                );
            })}
        </div>
    );
}
