"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface BlocksPaletteTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function BlocksPaletteTour({
  showOnMount = false,
  onComplete,
}: BlocksPaletteTourProps) {
  const steps = useMemo(
    () => [
      {
        title: "Blocks Palette",
        description:
          "The Blocks Palette is your toolkit for building web pages. It contains all the UI elements you can drag onto your canvas.",
      },
      {
        element: '[data-tour="sidebar-tabs"]',
        title: "Switching Panels",
        description:
          "Use these tabs to switch between standard Blocks, Custom Components, and the Layer structure of your page.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="tab-blocks"]',
        title: "Standard Blocks",
        description:
          "Here you'll find common elements like Headers, Footers, Sections, and Buttons to jumpstart your design.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="blocks-palette-search"]', // I should add this selector or use search input
        title: "Quick Search",
        description:
          "Looking for something specific? Type a name here to quickly find the block you need.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        title: "Happy Building!",
        description:
          "Just drag any block from the palette onto the canvas to start creating. It's that easy!",
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
