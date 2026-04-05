import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface ComponentsLibraryProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function ComponentsLibrary({
  showOnMount = false,
  onComplete,
}: ComponentsLibraryProps) {
  const steps = useMemo(
    () => [
      {
        title: "Components Library 📚",
        description:
          "This is your marketplace for reusable components. Browse community-built blocks, search quickly, and import what you need into your projects.",
      },
      {
        element: '[data-tour="sidebar-components-library"]',
        title: "Open Components Library",
        description:
          "Use the sidebar shortcut to jump back to the library any time while working in the dashboard.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="components-library-search"]',
        title: "Search components",
        description:
          "Type keywords like 'hero', 'navbar', or 'form' to find relevant components faster.",
        side: "bottom" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="components-library-card"]',
        title: "Browse component cards",
        description:
          "Each card previews a component and shows its creator details so you can evaluate before importing.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="components-library-import"]',
        title: "Import a component",
        description:
          "Click the import button to add a component to your personal library. You can reuse it across projects.",
        side: "left" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="components-library-my-components"]',
        title: "Manage My Components",
        description:
          "Open My Components to manage your imported and published components in one place.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        title: "Components Library — done! ✅",
        description:
          "You now know how to discover, search, and import reusable components. Continue to Saving & Collaboration when ready.",
      },
    ],
    [],
  );

  return (
    <MultiStepTour steps={steps} showOnMount={showOnMount} onComplete={onComplete} />
  );
}
