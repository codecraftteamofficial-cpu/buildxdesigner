"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface CustomComponentsTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function CustomComponentsTour({
  showOnMount = false,
  onComplete,
}: CustomComponentsTourProps) {
  const steps = useMemo(
    () => [
      {
        title: "Create Custom Components",
        description:
          "Take control by building your own components with full HTML, CSS, and JS integration.",
      },
      {
        element: '[data-tour="tab-custom"]',
        title: "Custom Tab",
        description:
          "All your custom-built elements are stored here for easy reuse across projects.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="create-custom-btn"]',
        title: "Build New Container",
        description:
          "Click here to open the creation dialog. You can name your component and start defining its structure.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        title: "Unlimited Flexibility",
        description:
          "Once you've created your component space, you can write code to build anything from custom forms to complex animations.",
      },
      {
        title: "Save and Reuse",
        description:
          "Your custom components work just like regular blocks. Just drag them onto your canvas whenever you need them!",
      },
    ],
    []
  );

  return (
    <MultiStepTour
      steps={steps}
      showOnMount={showOnMount}
      onComplete={onComplete}
    />
  );
}
