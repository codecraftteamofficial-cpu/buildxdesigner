import { useEffect, useRef } from "react";
import { driver } from "driver.js";

interface CodeEditorTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  onViewModeChange?: (mode: "design" | "code") => void;
}

export function CodeEditorTour({
  showOnMount,
  onComplete,
  onViewModeChange,
}: CodeEditorTourProps) {
  const driverRef = useRef<any>(null);
  const isDestroyingRef = useRef(false);

  useEffect(() => {
    if (!showOnMount) return;

    if (driverRef.current) {
      return;
    }

    isDestroyingRef.current = false;
    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      allowClose: false,
      overlayClickBehavior: "close",
      allowKeyboardControl: false,
      disableActiveInteraction: false,
      steps: [
        {
          popover: {
            title: "Code Editor & Files 💻",
            description:
              "Every component in BuildX has underlying HTML and CSS. The code editor lets you fine-tune anything the visual editor doesn't expose directly — and it syncs back to the canvas automatically.",
          },
        },
        {
          element: "[data-tour='toolbar-top']",
          popover: {
            title: "Switch to Code view",
            description:
              "Find the Design / Code toggle in the toolbar. Click Code to switch from the visual canvas to the raw HTML and CSS of your current page.",
            side: "bottom",
            align: "center",
          },
          onHighlightStarted: () => {
            if (onViewModeChange) onViewModeChange("design");
          },
        },
        {
          element: "[data-tour='code-editor-files']",
          popover: {
            title: "File Explorer",
            description:
              "The file explorer on the left lists all your project files. Click any file to open it in the editor — HTML pages, CSS stylesheets, and more. Everything in your project lives here.",
            side: "right",
            align: "start",
          },
          onHighlightStarted: () => {
            if (onViewModeChange) onViewModeChange("code");
          },
        },
        {
          element: "[data-tour='code-editor-content']",
          popover: {
            title: "Edit Backend Code directly",
            description:
              "The main editor shows your page's HTML and Backend Code. Click anywhere to position your cursor and start editing the Backend Code like PHP, JavaScript, and more.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='code-editor-content']",
          popover: {
            title: "Undo code changes",
            description:
              "If you break something in code view, press Ctrl+Z (Cmd+Z on Mac) to undo. The editor keeps a full history. You can also switch back to Design view and use Undo there.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='toolbar-top']",
          popover: {
            title: "Switch back to Design view",
            description:
              "Click the Design toggle in the toolbar to return to the visual canvas. Your code changes sync back automatically — no extra steps needed.",
            side: "bottom",
            align: "center",
          },
          onHighlightStarted: () => {
            if (onViewModeChange) onViewModeChange("design");
          },
        },
        {
          popover: {
            title: "Code Editor — done! ✅",
            description:
              "You can now edit your design at the code level. Next up: the Components Library — browse and import community-built UI blocks directly into your projects.",
          },
        },
      ],
      doneBtnText: "Done", // Ensures final button says "Done"
      onDestroyed: () => {
        // Handle completion on ANY destroy (Done button, overlay click, etc.)
        if (!isDestroyingRef.current) {
          isDestroyingRef.current = true;
          if (onViewModeChange) onViewModeChange("design");
          localStorage.setItem("buildx-tutorial-code", "1");
          onComplete?.();
        }
        driverRef.current = null;
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();

    return () => {
      if (driverRef.current && !isDestroyingRef.current) {
        isDestroyingRef.current = true;
        try {
          driverRef.current.destroy();
        } catch (e) {}
        driverRef.current = null;
      }
    };
  }, [showOnMount]);

  return null;
}