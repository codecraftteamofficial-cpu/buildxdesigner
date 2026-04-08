"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface BuildXIntroductionProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  onOpenTemplateModal?: () => void;
}

export function BuildXIntroduction({
  showOnMount = false,
  onComplete,
  onOpenTemplateModal,
}: BuildXIntroductionProps) {
  const steps = useMemo(
    () => [
      {
        title: "Using Templates",
        description:
          "Learn how to browse, preview, and create projects from templates. This guide covers Recommended templates, Trending templates, and how to explore a template's details before starting your project.",
      },
      {
        element: '[data-tour="recommended-templates"]',
        title: "Recommended Templates",
        description:
          "This section shows templates curated specifically for you. Browse through the cards to find one that fits your project style and category.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="trending-templates"]',
        title: "Trending Templates",
        description:
          "Further down the page you'll find Trending templates — the most popular designs in the BuildX community right now.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        title: "Open a Template",
        description:
          "I'll open the template browser for you now. This allows you to explore all our professionally designed starting points.",
        onHighlightStarted: () => {
          onOpenTemplateModal?.();
        },
      },
      {
        element: '[data-tour="create-website-templates"]',
        title: "Choose Your Template",
        description:
          "Within the browser, search or browse by category. Pick any template you like to see its full details — then come back and click Next.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="template-details-dialog"]',
        title: "Template Details",
        description:
          "After selecting a template, this screen appears. You can see the template preview, its name, and category.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="template-details-description"]',
        title: "Template Description",
        description:
          "Read this to understand what the template is designed for — its category, use case, and any notes from the creator.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="template-comment-textarea"]',
        title: "Leave a Comment",
        description:
          "Have feedback or a question for the creator? Leave a comment here before starting your project.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        title: "You're All Set!",
        description:
          "You now know how to browse templates, view their details, and engage with the creator. Pick one and hit Create Project when ready!",
      },
    ],
    [onOpenTemplateModal]
  );

  return (
    <MultiStepTour
      steps={steps}
      showOnMount={showOnMount}
      onComplete={onComplete}
    />
  );
}