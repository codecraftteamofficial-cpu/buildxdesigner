"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface MultiPageTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function MultiPageTour({
  showOnMount = false,
  onComplete,
}: MultiPageTourProps) {
  const steps = useMemo(
    () => [
      {
        title: "Multi-Page Projects",
        description:
          "Build complex websites with multiple pages. Each page can have its own unique layout and components.",
      },
      {
        element: '[data-tour="page-selector-trigger"]',
        title: "Page Selector",
        description:
          "Click here to see a list of all pages in your project. You can switch between pages instantly.",
        side: "bottom" as const,
        align: "start" as const,
      },
      {
        title: "Creating New Pages",
        description:
          "Need more space? Open the selector and click 'Create New Page' to add a new route to your project.",
      },
      {
        title: "Global vs Local",
        description:
          "Some components (like Navbars and Footers) can be set to appear on all pages, while others are unique to a specific page.",
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
