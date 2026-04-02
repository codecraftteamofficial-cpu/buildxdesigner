
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

interface GettingStartedGuideContentProps {
  onStartBuildXIntroduction?: () => void;
  onStartWebsiteCreation?: () => void;
  onStartPublishingBasics?: () => void;
  onStartDashboardOverview?: () => void;
  onStartComponentsPalette?: () => void;
  onStartCanvasArea?: () => void;
  onStartPropertiesPanel?: () => void;
  onStartAIAssistant?: () => void;
  onStartCodeEditor?: () => void;
  onStartComponentsLibrary?: () => void;
  onStartSavingCollaboration?: () => void;
}

export function GettingStartedGuideContent({
  onStartBuildXIntroduction,
  onStartWebsiteCreation,
  onStartPublishingBasics,
  onStartDashboardOverview,
  onStartComponentsPalette,
  onStartCanvasArea,
  onStartPropertiesPanel,
  onStartAIAssistant,
  onStartCodeEditor,
  onStartComponentsLibrary,
  onStartSavingCollaboration,
}: GettingStartedGuideContentProps) {
  const [activePhase, setActivePhase] = useState("all");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCompleted({
      "dashboard":   localStorage.getItem("buildx-tutorial-dashboard") === "1",
      "palette":     localStorage.getItem("buildx-tutorial-intro") === "1",
      "canvas":      localStorage.getItem("buildx-tutorial-canvas") === "1",
      "properties":  localStorage.getItem("buildx-tutorial-properties") === "1",
      "website":     localStorage.getItem("buildx-tutorial-website-creation") === "1",
      "ai":          localStorage.getItem("buildx-tutorial-ai") === "1",
      "code":        localStorage.getItem("buildx-tutorial-code") === "1",
      "library":     localStorage.getItem("buildx-tutorial-library") === "1",
      "collab":      localStorage.getItem("buildx-tutorial-collab") === "1",
      "publishing":  localStorage.getItem("buildx-tutorial-publishing-basics") === "1",
    });
  }, []);

  const doneCount = Object.values(completed).filter(Boolean).length;
  const totalCount = 10;

  const STEPS = [
    {
      id: "dashboard", phase: "orientation", badge: "Step 1",
      title: "Dashboard overview",
      desc: "Get familiar with the sidebar, project sections, and theme switcher.",
      action: onStartDashboardOverview,
    },
    {
      id: "palette", phase: "orientation", badge: "Step 2",
      title: "Components palette",
      desc: "Find and drag components from your toolbox onto the canvas.",
      action: onStartBuildXIntroduction,
    },
    {
      id: "website", phase: "building", badge: "Step 3",       // ← moved up
      title: "Website creation",
      desc: "Build a complete page from a template or from scratch.",
      action: onStartWebsiteCreation,
    },
    {
      id: "canvas", phase: "building", badge: "Step 4",        // ← was Step 3
      title: "Canvas area",
      desc: "Drop, arrange, resize, and reorder components on your canvas.",
      action: onStartCanvasArea,
    },
    {
      id: "properties", phase: "building", badge: "Step 5",    // ← was Step 4
      title: "Properties panel",
      desc: "Edit colors, text, spacing, and more for any selected component.",
      action: onStartPropertiesPanel,
    },
    {
      id: "ai", phase: "customizing", badge: "Step 6",
      title: "AI assistant",
      desc: "Use the built-in AI for design tips, content, and code snippets.",
      action: onStartAIAssistant,
    },
    {
      id: "code", phase: "customizing", badge: "Step 7",
      title: "Code editor & files",
      desc: "Switch to code view to fine-tune your design's HTML/CSS.",
      action: onStartCodeEditor,
    },
    {
      id: "library", phase: "customizing", badge: "Step 8",
      title: "Components library",
      desc: "Browse, import, and publish reusable components.",
      action: onStartComponentsLibrary,
    },
    {
      id: "collab", phase: "publishing", badge: "Step 9",
      title: "Saving & collaboration",
      desc: "Save your work, share with teammates, and manage access.",
      action: onStartSavingCollaboration,
    },
    {
      id: "publishing", phase: "publishing", badge: "Step 10",
      title: "Publishing basics",
      desc: "Publish your site live and share templates with the community.",
      action: onStartPublishingBasics,
    },
  ];

  const PHASES = [
    { id: "all", label: "All steps" },
    { id: "orientation", label: "1. Orientation" },
    { id: "building", label: "2. Building" },
    { id: "customizing", label: "3. Customizing" },
    { id: "publishing", label: "4. Publishing" },
  ];

  const phaseColorMap: Record<string, { border: string; badge: string; btn: string }> = {
    orientation: {
      border: "border-blue-500",
      badge: "text-blue-600 dark:text-blue-400",
      btn: "bg-blue-600 hover:bg-blue-700",
    },
    building: {
      border: "border-emerald-500",
      badge: "text-emerald-600 dark:text-emerald-400",
      btn: "bg-emerald-600 hover:bg-emerald-700",
    },
    customizing: {
      border: "border-amber-500",
      badge: "text-amber-600 dark:text-amber-400",
      btn: "bg-amber-600 hover:bg-amber-700",
    },
    publishing: {
      border: "border-orange-500",
      badge: "text-orange-600 dark:text-orange-400",
      btn: "bg-orange-600 hover:bg-orange-700",
    },
  };

  const visible = STEPS.filter(s => activePhase === "all" || s.phase === activePhase);

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {doneCount} / {totalCount} complete
        </span>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-2 flex-wrap">
        {PHASES.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePhase(p.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              activePhase === p.id
                ? "bg-muted border-border text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:border-border"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Step cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map(step => {
          const done = completed[step.id];
          const colors = phaseColorMap[step.phase];
          return (
            <div
              key={step.id}
              className={`flex flex-col border-2 rounded-xl p-4 gap-2 transition-all bg-card ${colors.border} ${done ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${colors.badge}`}>{step.badge}</span>
                <span className={`text-xs font-medium ${done ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {done ? "✓ Completed" : "To do"}
                </span>
              </div>
              <p className="font-semibold text-sm text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground flex-1">{step.desc}</p>
              <Button
                size="sm"
                className={`text-white mt-1 w-full ${colors.btn}`}
                onClick={() => step.action?.()}
              >
                {done ? "Review" : "Start Tutorial"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface GettingStartedModalProps extends GettingStartedGuideContentProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDashboardOverview?: () => void;
  onStartCanvasArea?: () => void;
  onStartPropertiesPanel?: () => void;
  onStartAIAssistant?: () => void;
  onStartCodeEditor?: () => void;
  onStartComponentsLibrary?: () => void;
  onStartSavingCollaboration?: () => void;
}

export function GettingStartedModal({
  isOpen,
  onClose,
  onStartBuildXIntroduction,
  onStartWebsiteCreation,
  onStartPublishingBasics,
  onStartDashboardOverview,
  onStartCanvasArea,
  onStartPropertiesPanel,
  onStartAIAssistant,
  onStartCodeEditor,
  onStartComponentsLibrary,
  onStartSavingCollaboration,
}: GettingStartedModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-216 max-w-[95vw] sm:max-w-7xl border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle>Tutorial</DialogTitle>
          <DialogDescription>
            Complete the tutorials in order to unlock the next step.
          </DialogDescription>
        </DialogHeader>

        <GettingStartedGuideContent
          onStartBuildXIntroduction={() => { onClose(); onStartBuildXIntroduction?.(); }}
          onStartWebsiteCreation={() => { onClose(); onStartWebsiteCreation?.(); }}
          onStartPublishingBasics={() => { onClose(); onStartPublishingBasics?.(); }}
          onStartDashboardOverview={() => { onClose(); onStartDashboardOverview?.(); }}
          onStartCanvasArea={() => { onClose(); onStartCanvasArea?.(); }}
          onStartPropertiesPanel={() => { onClose(); onStartPropertiesPanel?.(); }}
          onStartAIAssistant={() => { onClose(); onStartAIAssistant?.(); }}
          onStartCodeEditor={() => { onClose(); onStartCodeEditor?.(); }}
          onStartComponentsLibrary={() => { onClose(); onStartComponentsLibrary?.(); }}
          onStartSavingCollaboration={() => { onClose(); onStartSavingCollaboration?.(); }}
        />

      </DialogContent>
    </Dialog>
  );
}
