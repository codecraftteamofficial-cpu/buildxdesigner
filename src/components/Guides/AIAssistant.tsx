"use client";

import { useEffect } from "react";
import { driver } from "driver.js";

interface AIAssistantProps {
  showOnMount?: boolean;
  onComplete?: () => void;
  onSwitchToProperties?: () => void;
}

export function AIAssistant({
  showOnMount,
  onComplete,
  onSwitchToProperties,
}: AIAssistantProps) {
  useEffect(() => {
    if (!showOnMount) return;

    const timeout = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        allowClose: false,
        overlayClickBehavior: "nextStep",
        allowKeyboardControl: false,
        disableActiveInteraction: false,
        steps: [
          {
            popover: {
              title: "AI Mentor 🤖",
              description:
                "BuildX has a built-in AI Mentor that helps you design, write content, generate code snippets, and debug your layouts — all in plain English. No technical knowledge required.",
            },
          },
          {
            element: "[data-tour='ai-mentor-chat']",
            popover: {
              title: "Your AI chat panel",
              description:
                "This is the AI Mentor chat. It's already open so you can follow along. Type any design question or request here and the AI will respond instantly.",
              side: "left",
              align: "start",
            },
          },
          {
            element: "[data-tour='ai-mentor-chat']",
            popover: {
              title: "Ask for design help",
              description:
                'Type a request in plain English. For example: "Recommend a color scheme for a travel website" or "What layout works best for a landing page?"',
              side: "left",
              align: "center",
            },
          },
          {
            element: "[data-tour='ai-mentor-chat']",
            popover: {
              title: "Generate content",
              description:
                'Ask the AI to write copy for you. Try: "Write a tagline for a bakery website", "Give me 3 bullet points describing a SaaS product\'s key features", or "Write a short About section for a photography portfolio".',
              side: "left",
              align: "center",
            },
          },
          {
            element: "[data-tour='ai-mentor-chat']",
            popover: {
              title: "Get code snippets",
              description:
                'Ask for HTML or CSS directly: "Give me a CSS hover animation for a button" or "Write a responsive navbar in HTML". Copy the snippet and paste it into the Code Editor to apply it.',
              side: "left",
              align: "center",
            },
          },
          {
            element: "[data-tour='ai-mentor-chat']",
            popover: {
              title: "Be specific for best results",
              description:
                'Vague prompts get vague answers. Instead of "make it better", say exactly what you want. Example: "Increase the font size of the hero heading to 48px and make it bold".',
              side: "left",
              align: "center",
            },
          },
          {
            popover: {
              title: "AI Mentor — done! ✅",
              description:
                "You now know how to use the AI Mentor to speed up your design and content work. Switching you back to the Properties panel now.",
            },
          },
        ],
        onDestroyStarted: () => {
          driverObj.destroy();
          localStorage.setItem("buildx-tutorial-ai", "1");
          // Switch back to Properties panel before calling onComplete
          onSwitchToProperties?.();
          onComplete?.();
        },
      });

      driverObj.drive();
    }, 500);

    return () => clearTimeout(timeout);
  }, [showOnMount, onComplete, onSwitchToProperties]);

  return null;
}