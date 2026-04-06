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
          "Welcome to the template interaction guide! Learn how to engage with community designs by liking and reporting them.",
      },
      {
        element: '[data-tour="recommended-templates"]',
        title: "Discover Templates",
        description:
          "Browse through a collection of templates shared by other users. You can explore different styles and inspiration right here.",
        side: "top" as const,
        align: "start" as const,
        onHighlightStarted: () => onNavigateToSection?.("new-chat"),
      },
      {
        element: '[data-tour="template-like-button"]',
        title: "Show Some Love",
        description:
          "If you find a design you like, show your support by clicking the heart icon. Liking a template helps other users find the best content.",
        side: "top" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="template-report"]',
        title: "Report Issues",
        description:
          "Found something inappropriate or buggy? Use the report flag to notify our moderators. Let's keep the community safe and high quality!",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        title: "Engagement Expert!",
        description:
          "You're now ready to join the conversation and contribute to the BuildX community. Enjoy exploring!",
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
