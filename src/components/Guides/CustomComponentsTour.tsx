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
        element: '[data-tour="create-custom-code"]',
        title: "Edit Custom Component Code",
        description:
          "Click here to edit your custom component's HTML, CSS, and JavaScript directly. Make pixel-perfect tweaks and add custom logic that syncs back to your design.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="create-custom-code"]',
        title: "Unlimited Flexibility",
        description:
          "Once you've created your component space, you can write code to build anything from custom forms to complex animations.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="save-custom-code"]',
        title: "Save and Reuse",
        description:
          "Now, save your custom components! Your custom components work just like regular blocks. Just drag them onto your canvas whenever you need them!",
        side: "right" as const,
        align: "start" as const,
      },
      {
        title: "Create Custom Components — done! ✅",
        description:
          "You can now create your own custom components with code. Next up: the Components Library — browse and import community-built UI blocks directly into your projects.",
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
