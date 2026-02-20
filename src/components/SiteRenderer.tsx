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
    // Sort components top-to-bottom by their canvas Y position, then left-to-right by X
    const sorted = [...components].sort((a, b) => {
        const ay = a.position?.y ?? 0;
        const by = b.position?.y ?? 0;
        if (ay !== by) return ay - by;
        return (a.position?.x ?? 0) - (b.position?.x ?? 0);
    });

    const renderComponentTree = (component: ComponentData) => {
        return (
            <div
                key={component.id}
                id={component.id}
                data-component-id={component.id}
                className="site-component w-full"
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
                {component.children &&
                    component.children.map((child) => renderComponentTree(child))}
            </div>
        );
    };

    return (
        <div
            className="w-full min-h-screen"
            style={{ backgroundColor }}
        >
            {sorted.map((component) => renderComponentTree(component))}
        </div>
    );
}
