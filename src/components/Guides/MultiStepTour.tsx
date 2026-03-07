"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface TourStep {
    element?: string; 
    title: string;
    description: string;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    onHighlightStarted?: () => void;
}

interface MultiStepTourProps {
    steps: TourStep[];
    showOnMount?: boolean;
    onComplete?: () => void;
    showProgress?: boolean;
    showButtons?: ("next" | "previous" | "close")[];
}

export function MultiStepTour({
    steps,
    showOnMount = true,
    onComplete,
    showProgress = true,
    showButtons = ["next", "previous", "close"]
}: MultiStepTourProps) {
    const driverRef = useRef<ReturnType<typeof driver> | null>(null);
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (!showOnMount) {
            
            hasStartedRef.current = false;
            return;
        }

        
        if (hasStartedRef.current) {
            return;
        }

        hasStartedRef.current = true;

        const driverSteps = steps.map(step => ({
            element: step.element,
            popover: {
                title: step.title,
                description: step.description,
                side: step.side || "right",
                align: step.align || "start",
            },
            onHighlightStarted: step.onHighlightStarted,
        }));

        driverRef.current = driver({
            showProgress,
            showButtons,
            steps: driverSteps,
            disableActiveInteraction: true,
            allowClose: false,
            onDestroyStarted: () => {
                hasStartedRef.current = false;
                onComplete?.();
                driverRef.current?.destroy();
            },
        });

        driverRef.current.drive();

        return () => {
            driverRef.current?.destroy();
        };
    }, [showOnMount]);

    return null;
}