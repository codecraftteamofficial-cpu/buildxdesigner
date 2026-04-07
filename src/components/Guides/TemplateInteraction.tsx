"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface TemplateInteractionProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  onNavigateToSection?: (section: string) => void;
}

export function TemplateInteraction({
  showOnMount = false,
  onComplete,
  onNavigateToSection,
}: TemplateInteractionProps) {
  const steps = useMemo(
    () => [
      {
        title: "Template Interaction",
        description:
          "Learn how to engage with the BuildX community — liking templates you love and reporting ones that need attention.",
        onHighlightStarted: () => onNavigateToSection?.("new-chat"),
      },
      {
        element: '[data-tour="template-like-button"]',
        title: "Like a Template",
        description:
          "Click the heart icon on any template card to like it. Likes help great templates surface for other users.",
        side: "top" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="template-report"]',
        title: "Report a Template",
        description:
          "If you spot something inappropriate or broken, use the flag icon to report it. This keeps the community safe and high quality.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        title: "Community Ready!",
        description:
          "You now know how to support great creators and help moderate the platform. Keep exploring!",
      },
    ],
    [onNavigateToSection]
  );

  return (
    <MultiStepTour
      steps={steps}
      showOnMount={showOnMount}
      onComplete={onComplete}
    />
  );
}