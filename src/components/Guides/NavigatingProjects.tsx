"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface NavigatingProjectsProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  onNavigateToSection?: (section: string) => void;
}

export function NavigatingProjects({
  showOnMount = false,
  onComplete,
  onNavigateToSection,
}: NavigatingProjectsProps) {
  const steps = useMemo(
    () => [
      {
        title: "Navigating Your Projects",
        description:
          "Welcome to the project navigation guide! Here, we'll show you how to manage your work across different categories in the sidebar.",
      },
      {
        element: '[data-tour="nav-dashboard"]',
        title: "Dashboard (Recents)",
        description:
          "This is your home base. It shows your most recently edited projects and recommended templates to help you get started quickly.",
        side: "right" as const,
        align: "start" as const,
        onHighlightStarted: () => onNavigateToSection?.("new-chat"),
      },
      {
        element: '[data-tour="nav-all"]',
        title: "All Projects",
        description:
          "View every project you've ever created in one place. Perfect for when you need to find an older piece of work.",
        side: "right" as const,
        align: "start" as const,
        onHighlightStarted: () => onNavigateToSection?.("all"),
      },
      {
        element: '[data-tour="nav-drafts"]',
        title: "Drafts",
        description:
          "Projects that are still in progress and haven't been published yet are tucked away here for easy access.",
        side: "right" as const,
        align: "start" as const,
        onHighlightStarted: () => onNavigateToSection?.("drafts"),
      },
      {
        element: '[data-tour="nav-trash"]',
        title: "Trash",
        description:
          "Accidentally deleted something? Check the Trash folder to restore your projects or permanently remove them.",
        side: "right" as const,
        align: "start" as const,
        onHighlightStarted: () => onNavigateToSection?.("trash"),
      },
      {
        title: "Navigation Master!",
        description:
          "You now know how to navigate your workspace like a pro. Keep building!",
        onHighlightStarted: () => onNavigateToSection?.("new-chat"),
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
