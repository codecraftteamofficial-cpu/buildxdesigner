"use client";
 
import React, { useMemo } from "react";
import { MultiStepTour } from "./MultiStepTour";
 
 interface BuildXIntroductionProps {
   showOnMount?: boolean;
   onComplete?: () => void;
 }
 
 export function BuildXIntroduction({
  showOnMount = false,
   onComplete,
 }: BuildXIntroductionProps) {
   const steps = useMemo(
     () => [
       {
         element: '[data-tour="recommended-templates"]',
         title: "Recommended templates",
         description:
           "Start here to pick a template. These are curated to help you launch quickly.",
         side: "top" as const,
         align: "center" as const,
       },
       {
        element:
          '[data-tour="recommended-template-card"]:nth-child(2) [data-tour="template-like-button"]',
         title: "Like templates",
         description:
           "See something you like? Tap the heart to save it and help it trend.",
         side: "top" as const,
         align: "center" as const,
       },
       {
        title: "Open a template",
        description:
          "Next we'll look at template comments. I'll open a template details dialog for you—then click Next.",
         onHighlightStarted: () => {
           // Ensure the template detail modal is open so the comment box exists.
           const card = document.querySelector(
            '[data-tour="recommended-template-card"]:nth-child(2)'
           ) as HTMLElement | null;
           card?.click();
         },
       },
       {
        element:'[data-tour="template-details-dialog"]',
        title: "Template Details",
        description:
          "This is a template details dialog. You can see the template details here.",
        side: "top" as const,
        align: "center" as const,
       },
      {
        element: '[data-tour="template-comment-textarea"]',
        title: "Comment on templates",
        description:
          "Leave feedback on a template before you create your project from it.",
        side: "top" as const,
        align: "center" as const,
      },
      {
        title: "You're Done!",
        description:
          "Nice work—now you know where to find recommended templates, how to like them, and how to leave comments. Pick a template and click Create Project when you're ready.",
      },
     ],
     []
   );
 
   return (
     <MultiStepTour steps={steps} showOnMount={showOnMount} onComplete={onComplete} />
   );
 }