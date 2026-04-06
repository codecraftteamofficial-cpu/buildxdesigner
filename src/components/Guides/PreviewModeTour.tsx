"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface PreviewModeTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function PreviewModeTour({
  showOnMount = false,
  onComplete,
}: PreviewModeTourProps) {
  const steps = useMemo(
    () => [
      {
        title: "Preview Your Design",
        description:
          "See how your design looks in a real-world environment. Preview mode disables editing so you can test interactions.",
      },
      {
        element: '[data-tour="top-bar-preview"]',
        title: "Toggle Preview",
        description:
          "Click this play icon to enter Preview mode and experience your page exactly like a visitor would.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        title: "Test Everything",
        description:
          "In Preview, you can test buttons, forms, and navigation links to ensure everything is working correctly.",
      },
      {
        title: "Design with Confidence",
        description:
          "Switch back to Design mode anytime to make further adjustments. Keep building!",
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
