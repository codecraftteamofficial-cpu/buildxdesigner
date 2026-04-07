"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface ExportFilesTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function ExportFilesTour({
  showOnMount = false,
  onComplete,
}: ExportFilesTourProps) {
  const steps = useMemo(
    () => [
      {
        title: "Export Your Project",
        description:
          "Ready to take your design offline? You can export your entire project as a clean, production-ready codebase.",
      },
      {
        element: '[data-tour="toolbar-top"]',
        title: "Export Code in Code View",
        description:
          "Switch to Code view using the toggle in the toolbar.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="code-editor-content"]',
        title: "Export Code in Code View",
        description:
          "In here you can find the Download Zip button that lets you download your project as a ZIP file containing all your HTML, CSS, and JS files.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        element: '[data-tour="download-zip"]',
        title: "Export Code",
        description:
          "Click here to open the export options. You can download your project as a ZIP file containing HTML, CSS, and JS.",
        side: "bottom" as const,
        align: "end" as const,
      },
      {
        title: "Platform Ready",
        description:
          "Our export supports multiple formats, ensuring your code works perfectly on any hosting platform or internal server.",
      },
      {
        title: "Congratulations!",
        description:
          "You've completed the Advanced track. You're now a BuildX power user. Go create something amazing!",
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
