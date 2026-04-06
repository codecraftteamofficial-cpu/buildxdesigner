"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface PublishTemplateTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function PublishTemplateTour({
  showOnMount = false,
  onComplete,
}: PublishTemplateTourProps) {
  const steps = useMemo(
    () => [
      {
        title: "Sharing as a Template",
        description:
          "Finished a masterpiece? You can share it as a reusable template for the entire BuildX community to use!",
      },
      {
        element: '[data-tour="top-bar-publish-template"]',
        title: "Publish to Marketplace",
        description:
          "Click this button to open the publishing settings. You can add a name, category, and description before your template goes live.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        title: "Ready to Share!",
        description:
          "Sharing helps the community grow and shows off your skills. We can't wait to see what you build!",
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
