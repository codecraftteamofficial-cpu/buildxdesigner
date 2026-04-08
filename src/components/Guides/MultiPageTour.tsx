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
        element: '[data-tour="create-new-page"]',
        title: "Creating New Pages",
        description:
          "Need more space? Open the selector and click 'Create New Page' to add a new route to your project.",
        side: "bottom" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="new-page-modal"]',
        title: "Creating New Pages",
        description:
          "Add the name of your new page and its Path, and then click 'Create'. Your new page will be added to the selector and you can start designing right away!",
        side: "bottom" as const,
        align: "start" as const,
      },
      {
        title: "Global vs Local",
        description:
          "Some components (like Navbars and Footers) can be set to appear on all pages, while others are unique to a specific page.",
      },
      {
        title: "Multi-Page Done!",
        description:
          "You're all set to create and manage multiple pages in your project. Happy building!",
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
