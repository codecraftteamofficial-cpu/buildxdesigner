"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface WebsiteCreationProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  /** Ensures Create New Website modal is open so template tour targets exist in the DOM */
  onEnsureCreateWebsiteModalOpen?: () => void;
}

export function WebsiteCreation({
  showOnMount = false,
  onComplete,
  onEnsureCreateWebsiteModalOpen,
}: WebsiteCreationProps) {
  const ensureModalRef = useRef(onEnsureCreateWebsiteModalOpen);
  useEffect(() => {
    ensureModalRef.current = onEnsureCreateWebsiteModalOpen;
  }, [onEnsureCreateWebsiteModalOpen]);

  const steps = useMemo(
    () => [
      {
        title: "Website Creation 🌐",
        description:
          "In this step you'll learn how to start a new project — from picking a template to opening your first blank canvas. The later guides will go deep on each tool.",
      },
      {
        element: '[data-tour="create-website-templates"]',
        title: "Start from a template",
        description:
          "This Create New Website dialog shows recommended templates. Pick one that matches your goal or start blank if you want full control.",
        side: "top" as const,
        align: "center" as const,
        onHighlightStarted: () => {
          ensureModalRef.current?.();
        },
      },
      {
        element: '[data-tour="template-details-dialog"]',
        title: "Pick your template",
        description:
          "Click a template card to select it. You'll be asked to name your project before it opens in the editor.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="sidebar-palette"]',
        title: "Components palette",
        description:
          "Once in the editor, the palette on the left is your toolbox. Drag any component onto the canvas to start building. We'll go deeper on this in the next guide.",
        side: "right" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="canvas-area"]',
        title: "Your canvas",
        description:
          "Everything you drag lands here. This is a live preview of your page — what you see is what your visitors see. We'll cover all the canvas controls in the Canvas Area guide.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="save-progress"]',
        title: "Save early, save often",
        description:
          "Hit Ctrl+S (Cmd+S on Mac) or click the Save button any time. BuildX also auto-saves, but manual saves ensure nothing is lost before you close the tab.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        title: "Website Creation — done! ✅",
        description:
          "You know how to start a project and open the editor. The next guides will go step-by-step through the Canvas, Properties Panel, AI Assistant, Code Editor, and more.",
          
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