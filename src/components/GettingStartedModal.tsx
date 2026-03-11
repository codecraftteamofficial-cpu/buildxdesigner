"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface GettingStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBuildXIntroduction?: () => void;
  onStartWebsiteCreation?: () => void;
  onStartPublishingBasics?: () => void;
}

export function GettingStartedModal({
  isOpen,
  onClose,
  onStartBuildXIntroduction,
  onStartWebsiteCreation,
  onStartPublishingBasics,
}: GettingStartedModalProps) {
  const [introDone, setIntroDone] = useState(false);
  const [websiteDone, setWebsiteDone] = useState(false);
  const [publishingDone, setPublishingDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIntroDone(localStorage.getItem("buildx-tutorial-intro") === "1");
    setWebsiteDone(localStorage.getItem("buildx-tutorial-website-creation") === "1");
    setPublishingDone(
      localStorage.getItem("buildx-tutorial-publishing-basics") === "1",
    );
  }, [isOpen]);

  const cards = useMemo(() => {
    const websiteUnlocked = introDone;
    const publishingUnlocked = introDone && websiteDone;

    return [
      {
        title: "BuildX Introduction",
        description:
          "Introduce the features of BuildX Designer and how to use them.",
        stepLabel: "Step 1",
        status: introDone ? "Completed" : "Required",
        disabled: false,
      },
      {
        title: "Website Creation",
        description: "Tutorial on how to create a website using the editor.",
        stepLabel: "Step 2",
        status: websiteDone ? "Completed" : websiteUnlocked ? "Unlocked" : "Locked",
        disabled: !websiteUnlocked,
      },
      {
        title: "Publishing Basics",
        description: "Basic guide on how to publish your website online.",
        stepLabel: "Step 3",
        status: publishingDone
          ? "Completed"
          : publishingUnlocked
            ? "Unlocked"
            : "Locked",
        disabled: !publishingUnlocked,
      },
    ];
  }, [introDone, websiteDone, publishingDone]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[54rem] max-w-[95vw] sm:max-w-7xl border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle>Tutorial</DialogTitle>
          <DialogDescription>
            Complete the tutorials in order to unlock the next step.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-row flex-nowrap justify-center items-stretch gap-6 my-4">
          {cards.map((card) => {
            const borderColor =
              card.status === "Completed"
                ? "#22c55e" // green-500
                : card.status === "Locked"
                  ? "#000000" // black
                  : "#ffffff"; // white

            return (
            <Card
              key={card.title}
              className={`flex-1 min-w-0 transition-shadow border-2 ${
                card.disabled ? "opacity-60" : "hover:shadow-lg"
              }`}
              style={{ borderColor }}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {card.stepLabel}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {card.status}
                  </span>
                </div>
                <CardTitle className="text-center mt-2">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground text-center">
                  {card.description}
                </p>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                  disabled={card.disabled}
                  onClick={() => {
                    if (card.disabled) return;
                    if (card.title === "BuildX Introduction") {
                      onClose();
                      onStartBuildXIntroduction?.();
                    }
                    if (card.title === "Website Creation") {
                      onClose();
                      onStartWebsiteCreation?.();
                    }
                    if (card.title === "Publishing Basics") {
                      onClose();
                      onStartPublishingBasics?.();
                    }
                  }}
                >
                  {card.status === "Completed" ? "Review" : "Start Tutorial"}
                </Button>
              </CardContent>
            </Card>
          )})}
        </div>

      </DialogContent>
    </Dialog>
  );
}
