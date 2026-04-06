"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface LayersPanelTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function LayersPanelTour({
  showOnMount = false,
  onComplete,
}: LayersPanelTourProps) {
  const steps = useMemo(
    () => [
      {
        title: "Layers Panel",
        description:
          "The Layers Panel shows the hierarchical structure of your page. It helps you manage complex layouts easily.",
      },
      {
        element: '[data-tour="tab-layers"]',
        title: "Layers Tab",
        description:
          "Click here to see all elements currently on your canvas listed in their nesting order.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="layers-tree"]', // I should check if this exists in Sidebar.tsx
        title: "Element Tree",
        description:
          "You can select, rename, and reorder elements directly from this tree. Drag and drop layers to change their stacking order.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="layer-visibility"]', // I should add these to the layer item component
        title: "Visibility & Locking",
        description:
          "Toggle visibility or lock elements to prevent accidental changes while you work on other parts of the page.",
        side: "right" as const,
        align: "start" as const,
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
