"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface DashboardOverviewProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  onNavigateToAllProjects?: () => void;  // ADD THIS
  onNavigateToDashboard?: () => void;    // ADD THIS
}

export function DashboardOverview({
  showOnMount = false,
  onComplete,
  onNavigateToAllProjects,   // ADD THIS
  onNavigateToDashboard,     // ADD THIS
}: DashboardOverviewProps) {
  const steps = useMemo(
    () => [
      {
        title: "Dashboard Overview",
        description:
          "Let's take a quick tour of your home base. The Dashboard is where you manage all your projects, discover templates, and jump into the editor.",
      },
      {
        element: '[data-tour="recommended-templates"]',
        title: "Recommended Templates",
        description:
          "The main area shows templates recommended for you. Browse by category using the filter pills, or click 'Browse all' to see every template in the marketplace.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="sidebar-nav"]',
        title: "Sidebar Navigation",
        description:
          "The left sidebar is your main navigation. Switch between Dashboard, Components Library, All Projects, Drafts, and Trash — each section organizes your work differently.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="sidebar-search"]',
        title: "Search Your Projects",
        description:
          "Use the search bar to quickly find any project by name or description. Results update as you type.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="sidebar-profile"]',
        title: "Account & Settings",
        description:
          "Click your avatar or name to open Account Settings or log out. Update your profile, manage integrations, and change your plan here.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="theme-switcher"]',
        title: "Theme Switcher",
        description:
          "Switch between Light, Dark, and System modes. The change applies across the entire app immediately.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        onHighlightStarted: () => {
          onNavigateToDashboard?.();
        },
        title: "You're Ready!",
        description:
          "That covers the Dashboard. You know how to navigate sections, search projects, manage your account, and switch themes. Next step: Navigating Projects.",
      },
    ],
    [onNavigateToAllProjects, onNavigateToDashboard],
  );

  return (
    <MultiStepTour
      steps={steps}
      showOnMount={showOnMount}
      onComplete={onComplete}
    />
  );
}