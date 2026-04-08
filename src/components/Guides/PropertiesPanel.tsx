import { useEffect, useRef } from "react";
import { driver } from "driver.js";

interface PropertiesPanelProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function PropertiesPanel({ showOnMount, onComplete }: PropertiesPanelProps) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!showOnMount) return;

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
            title: "Properties Panel 🎛️",
            description:
              "When you select a component on the canvas, this panel lights up with every visual detail you can control — colors, text, spacing, borders, and more. Changes apply instantly, no save needed between edits.",
          },
        },
        {
          element: '[data-tour="canvas-area-dnd"]',
          popover: {
            title: "Select a component first",
            description:
              "Click any component on the canvas to select it. The Properties Panel on the right will populate with that component's settings — each section is collapsible so scroll down if you can't find a property.",
            side: "left",
            align: "start",
          },
        },
        {
          element: '[data-tour="canvas-area-dnd"]',
          popover: {
            title: "Edit text content",
            description:
              "Find the Content or Text field at the top of the panel and type directly to change the component's label or body text. You can also double-click the component on the canvas to edit it inline.",
            side: "left",
            align: "start",
          },
        },
        {
          element: '[data-tour="canvas-area-dnd"]',
          popover: {
            title: "Change colors",
            description:
              "Click any color swatch in the panel to open the color picker. Choose a color visually using the palette, or type a hex code (e.g. #1e3a8a) directly into the input field.",
            side: "left",
            align: "start",
          },
        },
        {
          element: '[data-tour="canvas-area-dnd"]',
          popover: {
            title: "Adjust spacing",
            description:
              "Find the Padding and Margin fields to control internal and external spacing. Enter values in pixels — padding adds space inside the component, margin adds space around it.",
            side: "left",
            align: "start",
          },
        },
        {
          element: '[data-tour="properties-panel"]',
          popover: {
            title: "Typography controls",
            description:
              "Use the Font Family, Size, and Weight dropdowns to style your text. You can also set line height and letter spacing to get the exact typographic feel you want.",
            side: "left",
            align: "start",
          },
        },
        {
          element: '[data-tour="canvas-area-dnd"]',
          popover: {
            title: "Borders & shadows",
            description:
              "Toggle the Border section to add a border — set the width, style (solid or dashed), and color. Use the Shadow section to add a drop shadow with custom offset and blur values.",
            side: "left",
            align: "start",
          },
        },
        {
          element: '[data-tour="canvas-area-dnd"]',
          popover: {
            title: "Responsive breakpoints",
            description:
              "At the top of the panel, switch between Desktop, Tablet, and Mobile tabs. Properties you change per breakpoint only apply at that screen size — giving you full responsive control.",
            side: "left",
            align: "start",
          },
        },
        {
          popover: {
            title: "Properties Panel — done! ✅",
            description:
              "You can now control every visual detail of your components. Next up: the AI Assistant — use it to get design suggestions, generate content, and produce code snippets without leaving the editor.",
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
        localStorage.setItem("buildx-tutorial-properties", "1");
        onCompleteRef.current?.();
      },
    });

    driverObj.drive();

    return () => {
      driverObj.destroy();
    };
  }, [showOnMount]); // ← onComplete intentionally excluded; accessed via ref

  return null;
}