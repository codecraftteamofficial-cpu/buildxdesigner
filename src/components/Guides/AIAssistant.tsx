import { useEffect } from "react";
import { driver } from "driver.js";

interface AIAssistantProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  onToggleAIAssistant?: () => void;
  isAIAssistantVisible?: boolean;
}

export function AIAssistant({
  showOnMount,
  onComplete,
  onToggleAIAssistant,
  isAIAssistantVisible,
}: AIAssistantProps) {
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
            title: "AI Assistant 🤖",
            description:
              "BuildX has a built-in AI that helps you design, write content, generate code snippets, and debug your layouts — all in plain English. No technical knowledge required.",
          },
        },
        {
          element: "[data-tour='ai-mentor-toolbar']",
          popover: {
            title: "Open the AI Mentor",
            description:
              "Click the chat icon in the toolbar to open the AI Mentorpanel. It slides in from the side so you can use it alongside your canvas without losing your place.",
            side: "top",
            align: "center",
          },
          onHighlightStarted: () => {
            if (!isAIAssistantVisible && onToggleAIAssistant) {
              onToggleAIAssistant();
            }
          },
        },
        {
          element: "[data-tour='ai-mentor-chat']",
          popover: {
            title: "Ask for design help",
            description:
              'Type a request in plain English. For example: "Recommend a color scheme for a website". The AI guides you through them.',
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='ai-mentor-chat']",
          popover: {
            title: "Generate content",
            description:
              'Ask the AI to write copy for you. Try: "Write a tagline for a bakery website", "Give me 3 bullet points describing a SaaS product\'s key features", or "Write a short About section for a photography portfolio".',
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='ai-mentor-chat']",
          popover: {
            title: "Get code snippets",
            description:
              'Ask for HTML or CSS directly: "Give me a CSS hover animation for this button" or "Write a responsive navbar in HTML". Copy the snippet and paste it into the Code Editor to apply it.',
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='ai-mentor-chat']",
          popover: {
            title: "Be specific for best results",
            description:
              'Vague prompts get vague answers. Instead of "make it better", say exactly what you want — component name, property, and desired outcome. Example: "Increase the font size of the hero heading to 48px and make it bold".',
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='properties-toolbar']",
          popover: {
            title: "Close the AI Mentor panel",
            description:
              "Click the Properties panel to check out the properties of the component you are working on. Your conversation is saved so you can pick it up later, just click AI Mentor in the toolbar to open it again.",
            side: "bottom",
            align: "center",
          },
          onHighlightStarted: () => {
            if (isAIAssistantVisible && onToggleAIAssistant) {
              onToggleAIAssistant();
            }
          },
        },
        {
          popover: {
            title: "AI Mentor — done! ✅",
            description:
              "You know how to use the AI Mentor to speed up your design and content work. Next up: the Code Editor — fine-tune your design at the HTML and CSS level.",
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
        localStorage.setItem("buildx-tutorial-ai", "1");
        onComplete?.();
      },
    });

    driverObj.drive();
  }, [showOnMount, onComplete]);

  return null;
}