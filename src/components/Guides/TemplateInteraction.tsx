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
          "Learn how to engage with the BuildX community — liking templates you love and reporting ones that need attention. Let's head to the Trending section!",
        onHighlightStarted: () => onNavigateToSection?.("new-chat"),
      },
      {
        element: '[data-tour="trending-templates"]',
        title: "Trending Templates",
        description:
          "These are the most popular templates created by the community. Scroll down to explore them — you can like or report any card here.",
        side: "top" as const,
        align: "center" as const,
        onHighlightStarted: () => {
          // Scroll the trending section into view smoothly
          const el = document.querySelector('[data-tour="trending-templates"]');
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        },
      },
      {
        element: '[data-tour="trending-like-button"]',
        title: "Like a Template",
        description:
          "Click the heart icon on any trending template card to like it. Likes help great templates rise to the top for everyone.",
        side: "top" as const,
        align: "start" as const,
        onHighlightStarted: () => {
          const el = document.querySelector('[data-tour="trending-like-button"]');
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        },
      },
      {
        element: '[data-tour="trending-report"]',
        title: "Report a Template",
        description:
          "If you spot something inappropriate or broken, use the flag icon to report it. This keeps the community safe and high quality.",
        side: "top" as const,
        align: "end" as const,
        onHighlightStarted: () => {
          const el = document.querySelector('[data-tour="trending-report"]');
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        },
      },
      {
        title: "Community Ready!",
        description:
          "You now know how to support great creators and help moderate the platform. Keep exploring BuildX!",
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