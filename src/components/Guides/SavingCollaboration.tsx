import { useEffect } from "react";
import { driver } from "driver.js";

interface SavingCollaborationProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function SavingCollaboration({ showOnMount, onComplete }: SavingCollaborationProps) {
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
            title: "Saving & Collaboration 🤝",
            description:
              "Your work is only safe when it's saved. This tutorial covers manual saving, auto-save, and how to invite teammates to collaborate on your project with the right permissions.",
          },
        },
        {
          element: '[data-tour="save-button"]',
          popover: {
            title: "Save button",
            description:
              "Click the Save button in the toolbar at any time to manually save your project. You can also press Ctrl+S (Cmd+S on Mac) from anywhere in the editor — always save before switching projects.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="save-progress"]',
          popover: {
            title: "Auto-save indicator",
            description:
              "BuildX auto-saves your work periodically. Watch for the 'Saved' indicator in the toolbar — it confirms your latest changes are stored. Even with auto-save, it's good practice to save manually before closing a tab.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: '[data-tour="share"]',
          popover: {
            title: "Share your project",
            description:
              "Click the Share button in the toolbar to invite collaborators. A dialog will open where you enter your collaborator's email address — they'll receive an email with a direct link to your project.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="share-modal"]',
          popover: {
            title: "Visibility and Access Control",
            description:
              "This allows you to control who can access your project. You can invite specific people or make your project public for anyone with the link to view or edit, depending on the permissions you set.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: '[data-tour="share-modal"]',
          popover: {
            title: "Editor vs. Viewer roles",
            description:
              "When inviting a collaborator, choose their role carefully. Editor — they can make changes to your project. Viewer — they can only view it, read-only access, no edits allowed.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "[data-tour='toolbar-top']",
          popover: {
            title: "Accessing shared projects",
            description:
              "Projects shared with you appear in the Dashboard under All Projects → Shared tab. You'll also receive an email with a direct link whenever someone invites you to collaborate.",
            side: "bottom",
            align: "center",
          },
        },
        {
          popover: {
            title: "Saving & Collaboration — done! ✅",
            description:
              "Your work is protected and your team is in sync. Last step: Publishing — connect your integrations and take your site live on the internet.",
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
        localStorage.setItem("buildx-tutorial-collab", "1");
        onComplete?.();
      },
    });

    driverObj.drive();
  }, [showOnMount, onComplete]);

  return null;
}