import { useEffect } from "react";
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
  useEffect(() => {
    if (!showOnMount) return;

    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: [
        {
          popover: {
            title: "Code Editor & Files 💻",
            description:
              "Every component in BuildX has underlying HTML and CSS. The code editor lets you fine-tune anything the visual editor doesn't expose directly — and it syncs back to the canvas automatically.",
          },
        },
        {
          element: "#toolbar-top",
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
          element: "#code-editor-files",
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
          element: "#code-editor-content",
          popover: {
            title: "Edit HTML directly",
            description:
              "The main editor shows your page's HTML. Click anywhere to position your cursor and start editing — add tags, change attributes, modify text content, or restructure your layout.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#code-editor-content",
          popover: {
            title: "Add custom CSS",
            description:
              "Open your CSS file from the file explorer (usually style.css) and add your own rules. Changes apply to the canvas in real time when you switch back to Design view.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#code-editor-content",
          popover: {
            title: "Paste AI-generated snippets",
            description:
              "If the AI Assistant gave you a code snippet, this is where you paste it. Find the right place in the HTML or CSS file, paste the snippet in, then switch back to Design view to see the result.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#code-editor-content",
          popover: {
            title: "Undo code changes",
            description:
              "If you break something in code view, press Ctrl+Z (Cmd+Z on Mac) to undo. The editor keeps a full history. You can also switch back to Design view and use Undo there.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#toolbar-top",
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
      onDestroyStarted: () => {
        if (onViewModeChange) onViewModeChange("design");
        driverObj.destroy();
        localStorage.setItem("buildx-tutorial-code", "1");
        onComplete?.();
      },
    });

    driverObj.drive();
  }, [showOnMount]);

  return null;
}