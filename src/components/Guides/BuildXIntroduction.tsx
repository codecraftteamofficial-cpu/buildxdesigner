"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface BuildXIntroductionProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function BuildXIntroduction({
  showOnMount = false,
  onComplete,
}: BuildXIntroductionProps) {
  const steps = useMemo(
    () => [
      {
        title: "Using Templates",
        description:
          "Learn how to browse, preview, and create projects from templates. This guide will walk you through the Recommended and Trending sections, opening a template, reading its details, and leaving a comment.",
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
          "Scroll down to find the Trending section — these are the most popular templates in the BuildX community right now. Great for inspiration!",
        side: "top" as const,
        align: "center" as const,
      },
      {
        title: "Open a Template",
        description:
          "Click a template card to open its details dialog. I'll open one for you now — then click Next to continue.",
        onHighlightStarted: () => {
          const card = document.querySelector(
            '[data-tour="recommended-template-card"]:nth-child(2)'
          ) as HTMLElement | null;
          card?.click();
        },
      },
      {
        element: '[data-tour="template-details-dialog"]',
        title: "Template Details",
        description:
          "This dialog shows you a full preview of the template. Take a moment to explore what it looks like before committing to it.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="template-details-description"]',
        title: "Template Description",
        description:
          "Read the template's description here to understand what it's designed for — the category, use case, and any notes from the creator.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="template-comment-textarea"]',
        title: "Leave a Comment",
        description:
          "Have feedback or a question for the template creator? Type it here. Your comment helps creators improve their work and helps others decide if the template is right for them.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        title: "You're Ready!",
        description:
          "You now know how to browse Recommended and Trending templates, preview a template's details, read its description, and leave a comment. Pick one you like and hit Create Project to get started!",
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