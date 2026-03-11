"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface PublishingBasicsProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function PublishingBasics({
  showOnMount = false,
  onComplete,
}: PublishingBasicsProps) {
  const steps = useMemo(
    () => [
      {
        title: "Publishing Basics",
        description:
          "Let’s walk through connecting payments and Supabase so you can publish a fully powered site.",
      },
      {
        element: '[data-tour="database-integration"]',
        title: "Database Integration",
        description:
          "Here you can view and manage your database integration for this project.",
        side: "bottom" as const,
        align: "end" as const,
        onHighlightStarted: () => {
          // Ensure the Integration dialog is open for the next step.
          const hasIntegrationDialog = document.querySelector(
            '[data-tour="integration"]',
          );
          if (!hasIntegrationDialog) {
            const btn = document.querySelector(
              '[data-tour="database-integration"]',
            ) as HTMLElement | null;
            btn?.click();
          }
        },
      },
      {
        element: '[data-tour="integration"]',
        title: "Integration",
        description:
          "This Integration Settings panel lets you review how external services connect to your editor session.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="go-to-integration"]',
        title: "Go to Integration",
        description:
          'Use this button to open your full account-level integration settings without leaving the editor.',
        side: "top" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="integration-settings"]',
        title: "Integration Settings",
        description:
          "Here you can configure both PayMongo and Supabase integrations that power your site’s payments and database.",
        side: "top" as const,
        align: "start" as const,
        onHighlightStarted: () => {
          // Make sure the Account Settings modal is open on the Integration tab
          // so that PayMongo and Supabase sections are visible in the next steps.
          const hasPaymongo = document.querySelector(
            '[data-tour="paymongo-integration"]',
          );
          if (!hasPaymongo) {
            const goBtn = document.querySelector(
              '[data-tour="go-to-integration"]',
            ) as HTMLElement | null;
            goBtn?.click();
          }
        },
      },
      {
        element: '[data-tour="paymongo-integration"]',
        title: "Paymongo Integration",
        description:
          "Add your PayMongo API key here to enable payments and checkout flows on your published site.",
        side: "top" as const,
        align: "start" as const,
      },
      {
        element: '[data-tour="supabase-connection"]',
        title: "Supabase Connection",
        description:
          "Connect Supabase so you can read and write data (like users, content, or orders) from your site.",
        side: "top" as const,
        align: "end" as const,
      },
      {
        title: "You're Ready to Publish",
        description:
          "With payments and Supabase connected, you’re ready to publish and share your site with the world.",
      },
    ],
    [],
  );

  const handleComplete = () => {
    const closeBtn = document.querySelector(
      '[data-tour="account-settings-close"]',
    ) as HTMLElement | null;
    closeBtn?.click();
    onComplete?.();
  };

  return (
    <MultiStepTour
      steps={steps}
      showOnMount={showOnMount}
      onComplete={handleComplete}
    />
  );
}

