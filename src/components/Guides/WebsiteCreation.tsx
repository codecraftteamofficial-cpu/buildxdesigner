"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface WebsiteCreationProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  onEnsureCreateWebsiteModalOpen?: () => void;
}

export function WebsiteCreation({
  showOnMount = false,
  onComplete,
  onEnsureCreateWebsiteModalOpen,
}: WebsiteCreationProps) {
  const steps = useMemo(
    () => [
      {
        title: "Create Your First Project 🚀",
        description:
          "This guide walks you through creating your very first website project in BuildX — from choosing a template to opening your canvas. Let's get started!",
      },
      {
        element: '[data-tour="recommended-templates"]',
        title: "Browse Recommended Templates",
        description:
          "The dashboard shows templates recommended for you. Each card is a ready-made starting point — pick one that fits your goal or scroll down to see more.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="recommended-template-card"]',
        title: "Click a Template to Start",
        description:
          "Click any template card to open the project setup dialog. You'll get to preview the layout before committing.",
        side: "bottom" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="create-website-templates"]',
        title: "Choose Your Template",
        description:
          "Inside the dialog, you can browse all available templates by category. Click one to select it — it will be highlighted so you know it's chosen.",
        side: "top" as const,
        align: "center" as const,
        onHighlightStarted: () => {
          onEnsureCreateWebsiteModalOpen?.();
        },
      },
      {
        element: '[data-tour="template-details-dialog"]',
        title: "Name Your Project",
        description:
          "Give your project a name and optionally set a category and description. Then click 'Create Project' to open it in the editor.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        title: "You're Ready to Build! ✅",
        description:
          "Once you click Create Project, your canvas opens and you can start designing. The next guides will walk you through the canvas, properties panel, AI assistant, and more.",
      },
    ],
    [onEnsureCreateWebsiteModalOpen]
  );

  return (
    <MultiStepTour
      steps={steps}
      showOnMount={showOnMount}
      onComplete={onComplete}
    />
  );
}