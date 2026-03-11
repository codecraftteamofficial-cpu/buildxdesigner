import { driver } from "driver.js"
import "driver.js/dist/driver.css"

export const startGettingStartedTour = (
  onViewModeChange?: (mode: "design" | "code") => void,
  onToggleAIAssistant?: () => void,
  isAIAssistantVisible?: boolean
) => {
  const driverObj = driver({
    showProgress: true,
    showButtons: ["next", "previous", "close"],
    steps: [
      {
        popover: {
          title: "Welcome to BuildX Designer! 🎉",
          description: "Let's take a quick tour to get you started with building your first website.",
        },
      },
      {
        element: '[data-tour="sidebar-palette"]',
        popover: {
          title: "Components Palette",
          description: "This is your toolbox! Drag any component from here onto the canvas to start building your website.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="canvas-area"]',
        popover: {
          title: "Canvas Area",
          description: "This is your workspace. Drop components here, resize them, and arrange them to create your layout.",
          side: "top",
          align: "center",
        },
        onHighlightStarted: () => {
          if (onViewModeChange) {
            onViewModeChange("design")
          }
        },
      },
      {
        element: '[data-tour="properties-panel"]',
        popover: {
          title: "Properties Panel",
          description: "Click on any component on the canvas to edit its properties here - change colors, text, spacing, and more!",
          side: "left",
          align: "start",
        },
        onHighlightStarted: () => {
          // If AI assistant is open, close it to show properties panel
          if (isAIAssistantVisible && onToggleAIAssistant) {
            onToggleAIAssistant()
          }
        },
      },
      {
        element: "#ai-assistant-chat",
        popover: {
          title: "AI Assistant",
            description: "Need help? Ask our AI assistant for design tips, code snippets, or general guidance right here.",
            side: "top",
            align: "center",
        },
        onHighlightStarted: () => {
          if (onToggleAIAssistant) {
            onToggleAIAssistant()
          }
        },
      },
      {
        element: "#toolbar-top",
        popover: {
          title: "Toolbar",
          description: "Use these tools to undo, redo, preview your site, and export your work when you're done.",
          side: "bottom",
          align: "center",
        },
        onHighlightStarted: () => {
          if (onToggleAIAssistant) {
            onToggleAIAssistant()
          }
        },
      },
      {
        element: "#code-editor-content",
        popover: {
            title: "Code Editor",
            description: "This is the code view to see and edit the underlying code of your design. Perfect for fine-tuning and customizations!",
            side: "top",
            align: "center",
        },
        onHighlightStarted: () => {
          if (onViewModeChange) {
            onViewModeChange("code")
          }
        },
      },
      {
        element: "#code-editor-files",
        popover: {
            title: "File Explorer",
            description: "Here you can manage your project files. Open, edit, and organize your code files with ease.",
            side: "top",
            align: "center",
        },
      },
      {
        element: '[data-tour="save-button"]',
        popover: {
          title: "Save Your Work",
          description: "Don't forget to save! Your project will be stored and you can come back to it anytime.",
          side: "bottom",
          align: "end",
        },
        onHighlightStarted: () => {
          if (onViewModeChange) {
            onViewModeChange("design")
          }
        },
      },
      {
        popover: {
          title: "You're Ready! 🎉",
          description: "That's it! Start creating by dragging components onto the canvas. Have fun building!",
        },
      },
    ],
    onDestroyStarted: () => {
      if (onViewModeChange) {
        onViewModeChange("design")
      }
      driverObj.destroy()
    },
  })

  driverObj.drive()
}
