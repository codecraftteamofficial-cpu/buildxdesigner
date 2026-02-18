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
    // Recursively render components
    const renderComponentTree = (component: ComponentData) => {
        const position = component.position || { x: 0, y: 0 };

        return (
            <div
                key={component.id}
                id={component.id} // Ensure ID is present for anchor links/scripts
                data-component-id={component.id}
                style={{
                    position: "absolute",
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: "fit-content",
                    height: "fit-content",
                    // Removing pointer-events: auto wrapper logic. Let the component handle it.
                }}
                className="site-component"
            >
                <RenderableComponent
                    component={component}
                    projectId={projectId}
                    isSelected={false} // Never selected
                    onUpdate={() => { }} // No-op
                    onDelete={() => { }} // No-op
                    disabled={false} // Interactive
                    isPreview={true} // Enable preview/live mode behavior
                    userProjectConfig={userProjectConfig}
                    onEditComponent={() => { }} // No-op
                />
                {/* Render children recursively if any (e.g., for groups/containers) */}
                {component.children &&
                    component.children.map((child) => renderComponentTree(child))}
            </div>
        );
    };

    return (
        <div
            className="w-full min-h-screen relative overflow-x-hidden"
            style={{
                backgroundColor: backgroundColor,
                // Ensure no transform scaling here. Just pure layout.
            }}
        >
            {components.map((component) => renderComponentTree(component))}
        </div>
    );
}
