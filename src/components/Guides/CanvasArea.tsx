import { useEffect } from "react";
import { driver } from "driver.js";

interface CanvasAreaProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function CanvasArea({ showOnMount, onComplete }: CanvasAreaProps) {
  useEffect(() => {
    if (!showOnMount) return;

    let completedAllSteps = false;

    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: [
        {
          popover: {
            title: "Canvas Area 🎨",
            description:
              "This is your visual workspace. Everything you see here is exactly what your visitors will see — drop components, arrange sections, and design your layout.",
          },
        },
        {
          element: '[data-tour="canvas-area"]',
          popover: {
            title: "Select a component",
            description:
              "Click any component on the canvas to select it. A blue outline with resize handles will appear around it — this means it's ready to be edited or moved.",
            side: "top",
            align: "center",
          },
        },
        {
          element: '[data-tour="canvas-area"]',
          popover: {
            title: "Move components",
            description:
              "With a component selected, click and drag it to reposition it anywhere on the canvas. Release to drop it in its new location.",
            side: "top",
            align: "center",
          },
        },
        {
          element: '[data-tour="canvas-area"]',
          popover: {
            title: "Resize components",
            description:
              "Drag any corner or edge handle on the selected component to resize it. Hold Shift while dragging a corner to maintain the original aspect ratio.",
            side: "top",
            align: "center",
          },
        },
        {
          element: '[data-tour="canvas-area"]',
          popover: {
            title: "Reorder sections",
            description:
              "Use the layer panel on the right side to change the stacking order of your components — drag a layer up or down to reorder it on the page.",
            side: "top",
            align: "center",
          },
        },
        {
          element: '[data-tour="canvas-area"]',
          popover: {
            title: "Delete a component",
            description:
              "Select a component and press the Delete key on your keyboard to remove it. You can also right-click the component and choose Delete from the context menu.",
            side: "top",
            align: "center",
          },
        },
        {
          element: '[data-tour="canvas-area"]',
          popover: {
            title: "Undo & redo",
            description:
              "Made a mistake? Press Ctrl+Z (Cmd+Z on Mac) to undo. Press Ctrl+Y (Cmd+Y) to redo. The editor keeps a full history of your actions.",
            side: "top",
            align: "center",
          },
        },
        {
          element: '[data-tour="toolbar-top"]',
          popover: {
            title: "Viewport preview",
            description:
              "Use the viewport toggle in the toolbar to preview your layout at different screen sizes — desktop, tablet, or mobile.",
            side: "bottom",
            align: "center",
          },
        },
        {
          popover: {
            title: "Canvas Area — done! ✅",
            description:
              "You now know how to select, move, resize, reorder, and delete components. Next up: the Properties Panel.",
          },
          // Mark complete when the final step is reached
          onHighlightStarted: () => {
            completedAllSteps = true;
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
        if (completedAllSteps) {
          localStorage.setItem("buildx-tutorial-canvas", "1");
        }
        onComplete?.();
      },
    });

    driverObj.drive();
  }, [showOnMount]);

  return null;
}