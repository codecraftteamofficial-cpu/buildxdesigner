"use client";

import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";

interface PublishTemplateTourProps {
  showOnMount?: boolean;
  onComplete?: () => void;
}

export function PublishTemplateTour({
  showOnMount = false,
  onComplete,
}: PublishTemplateTourProps) {
  const steps = useMemo(
    () => [
      {
        title: "Sharing as a Template",
        description:
          "Finished a masterpiece? You can share it as a reusable template for the entire BuildX community to use!",
      },
      {
        element: '[data-tour="top-bar-publish-template"]',
        title: "Publish to Web",
        description:
          "Click the Publish button in the top bar to open the web publishing options. This is where you can publish your project as a live website.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="top-bar-publish-template-web"]',
        title: "Publish to Web",
        description:
          "In here you can add your Website Title, Website Logo, and edit your subdomain before your project goes live on the web.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        title: "Now we move on to Publishing to Marketplace!",
        description:
          "Publishing to the web is great for sharing your project as a live website, but if you want to share your project as a reusable template in the BuildX Marketplace, keep following the tour!",
        onHighlightStarted: () => {
          // Close the publish site modal
          window.dispatchEvent(new CustomEvent('close-publish-site-modal'));
        },
      },
      {
        element: '[data-tour="more-options"]',
        title: "Publish to Marketplace",
        description:
          "Click the Three Dots menu to see the option to publish your project as a template in the BuildX Marketplace. ",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        element: '[data-tour="publish-marketplace"]',
        title: "Publish to Marketplace",
        description:
          "In here you can publish your project as a template in the BuildX Marketplace. This is where you can share your project with the community as a reusable template.",
        side: "bottom" as const,
        align: "center" as const,
      },
      {
        title: "Ready to Share!",
        description:
          "Sharing helps the community grow and shows off your skills. We can't wait to see what you build!",
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
