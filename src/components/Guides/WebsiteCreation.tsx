"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface WebsiteCreationProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function WebsiteCreation({
  showOnMount = false,
  onComplete,
}: WebsiteCreationProps) {
  const steps = useMemo(
    () => [
      {
        title: "Website Creation",
        description:
          "Let's build a simple page: add a component, place it on the canvas, and tweak its properties.",
      },
      {
        element: '[data-tour="sidebar-palette"]',
        title: "Pick a component",
        description:
          "Drag a component from the palette onto the canvas to start building.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="canvas-area"]',
        title: "Drop it on the canvas",
        description:
          "This is where your website is assembled. Drop components here and arrange your layout.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="properties-panel"]',
        title: "Customize it",
        description:
          "Select a component to edit text, colors, spacing, and more in the Properties Panel.",
        side: "left" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="toolbar-top"]',
        title: "Toolbar",
        description:
          "This top toolbar gives you quick access to key actions like previewing, exporting, database integration, publishing, and sharing.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="design-mode"]',
        title: "Design Mode",
        description:
          "Switch back to Design Mode to build visually on the canvas.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="code-view"]',
        title: "Code View",
        description:
          "Switch to Code View to inspect and fine-tune the generated code behind your design.",
        side: "bottom" as const,
        align: "center" as const,
        onHighlightStarted: () => {
          const btn = document.querySelector(
            '[data-tour="code-view"]',
          ) as HTMLElement | null;
          btn?.click();
        },
      },
      {
        element:'[data-tour="export-project"]',
        title: "Export Project",
        description:
          "Export or download your project so you can keep a local copy or deploy elsewhere.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        element: '[data-tour="download-project"]',
        title: "Download Project",
        description:
          "Download your project so you can keep a local copy or deploy elsewhere.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        element: '[data-tour="save-progress"]',
        title: "Save Progress",
        description:
          "Keep an eye on your save status so you know when changes are saved (or still unsaved).",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="more-options"]',
        title: "More Options",
        description:
          "Open extra actions like Save, preferences, shortcuts, and more.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        element: '[data-tour="preview"]',
        title: "Preview",
        description:
          "Preview your website to see how it looks and behaves.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        element: '[data-tour="database-integration"]',
        title: "Database Integration",
        description:
          "Connect your database to power dynamic content and data-driven components.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        element: '[data-tour="publish"]',
        title: "Publish",
        description:
          "Publish your website when you're ready to share it with the world.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        element: '[data-tour="share"]',
        title: "Share",
        description:
          "Share a link so others can view (or collaborate on) your project.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        title: "You're Done!",
        description:
          "Nice work—try adding a few more components and adjusting their properties to refine your layout.",
      },
    ],
    []
  );

  return (
    <MultiStepTour steps={steps} showOnMount={showOnMount} onComplete={onComplete} />
  );
}