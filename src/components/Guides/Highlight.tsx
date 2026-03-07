"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface TourGuideProps {
    targetElement: string;
    title: string;
    description: string;
    side?: "top" | "bottom" | "left" | "right";
    showOnMount?: boolean; 
    onComplete?: () => void;
}

export function TourGuide({
    targetElement,
    title,
    description,
    side = "right",
    showOnMount = true,
    onComplete,
}: TourGuideProps) {
    const driverRef = useRef<ReturnType<typeof driver> | null>(null);

    useEffect(() => {
        if (!showOnMount) return;

        driverRef.current = driver();

        driverRef.current.highlight({
            element: targetElement,
            popover:{
                title,
                description,
                side,
                nextBtnText: "Next",
                prevBtnText: "Back",
                doneBtnText: "Close",  
            },
        });

        return() => {
            driverRef.current?.destroy();
        };
    }, [targetElement, title, description, side, showOnMount]);

    return null;
}