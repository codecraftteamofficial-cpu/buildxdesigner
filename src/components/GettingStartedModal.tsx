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
import {
  fetchTutorialProgress,
  readLocalProgress,
  writeLocalProgress,
  migrateLocalProgressToDB,
} from "../supabase/data/tutorialProgressService";

interface GettingStartedGuideContentProps {
  userId?: string | null;  
  refreshKey?: number; 
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
  userId,
  refreshKey, 
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
}: GettingStartedGuideContentProps) {
  const [activePhase, setActivePhase] = useState("all");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [progressLoading, setProgressLoading] = useState(false);
  
  useEffect(() => {
    const loadProgress = async () => {
      if (!userId) {
        setCompleted(readLocalProgress());
        return;
      }

      try {
        setProgressLoading(true);
        const rows = await fetchTutorialProgress(userId);

        if (rows.length > 0) {
          const dbCompleted = Object.fromEntries(
            rows.map((r) => [r.step_key, r.completed])
          );
          writeLocalProgress(dbCompleted);
          setCompleted(dbCompleted);
        } else {
          const localCompleted = readLocalProgress();
          setCompleted(localCompleted);
          await migrateLocalProgressToDB(userId, localCompleted);
        }
      } catch (err) {
        console.error("Failed to load tutorial progress:", err);
        setCompleted(readLocalProgress());
      } finally {
        setProgressLoading(false);
      }
    };

    loadProgress();
  }, [userId, refreshKey]);

  const doneCount = Object.values(completed).filter(Boolean).length;
  const totalCount = 9; // ← updated from 10

  const STEPS = [
    {
      id: "dashboard", phase: "orientation", badge: "Step 1",
      title: "Dashboard Overview",
      desc: "Get familiar with the sidebar, project sections, and theme switcher.",
      action: onStartDashboardOverview,
    },
    {
      id: "palette", phase: "orientation", badge: "Step 2",
      title: "Templates",
      desc: "Explore and create templates to reuse across your projects.",
      action: onStartBuildXIntroduction,
    },
    {
      id: "website", phase: "building", badge: "Step 3",
      title: "Website creation",
      desc: "Build a complete page from a template or from scratch.",
      action: onStartWebsiteCreation,
    },
    {
      id: "canvas", phase: "building", badge: "Step 4",
      title: "Canvas area",
      desc: "Drop, arrange, resize, and reorder components on your canvas.",
      action: onStartCanvasArea,
    },
    {
      id: "properties", phase: "building", badge: "Step 5",
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
      id: "collab", phase: "publishing", badge: "Step 8",
      title: "Saving & collaboration",
      desc: "Save your work, share with teammates, and manage access.",
      action: onStartSavingCollaboration,
    },
    {
      id: "publishing", phase: "publishing", badge: "Step 9",
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        {visible.map(step => {
          const done = completed[step.id];
          const stepIndex = STEPS.findIndex((s) => s.id === step.id);
          const prevStepId = stepIndex > 0 ? STEPS[stepIndex - 1]?.id : undefined;
          const locked = !done && stepIndex > 0 ? !completed[prevStepId ?? ""] : false;

          const colors = phaseColorMap[step.phase];
          const borderColorClass = done
            ? "border-blue-500"
            : locked
              ? "border-black dark:border-black"
              : "border-white dark:border-white";

          return (
            <div
              key={step.id}
              className={`flex flex-col border-2 rounded-xl p-4 gap-2 transition-all bg-card ${borderColorClass} ${locked ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${colors.badge}`}>{step.badge}</span>
                <span
                  className={`text-xs font-medium ${
                    done ? "text-blue-500" : locked ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {done ? "✓ Completed" : locked ? "Locked" : "Unlocked"}
                </span>
              </div>
              <p className="font-semibold text-sm text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground flex-1">{step.desc}</p>
              <Button
                size="sm"
                disabled={locked}
                className={`text-white mt-1 w-full ${
                  locked
                    ? "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted whitespace-normal h-auto py-2 text-xs"
                    : "bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                }`}
                onClick={() => {
                  if (locked) return;
                  step.action?.();
                }}
              >
                {done ? "Review" : locked ? "Complete previous step to unlock" : "Start Tutorial"}
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
      <DialogContent className="custom-scrollbar w-full max-w-[90vw] lg:max-w-[85vw] xl:max-w-7xl border-0 shadow-xl max-h-[90vh] overflow-y-auto">
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

interface GettingStartedGuideDialogProps extends GettingStartedGuideContentProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  userId?: string | null; 
}

export function GettingStartedGuideDialog({
  open,
  onOpenChange,
  userId,  
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
}: GettingStartedGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => onOpenChange?.(isOpen)}>
      <DialogContent className="custom-scrollbar w-full max-w-[90vw] lg:max-w-[85vw] xl:max-w-6xl border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Getting Started Guide</DialogTitle>
          <DialogDescription>
            Complete the tutorials in order to unlock the next step.
          </DialogDescription>
        </DialogHeader>

        <GettingStartedGuideContent
          userId={userId}  
          onStartBuildXIntroduction={onStartBuildXIntroduction}
          onStartWebsiteCreation={onStartWebsiteCreation}
          onStartPublishingBasics={onStartPublishingBasics}
          onStartDashboardOverview={onStartDashboardOverview}
          onStartCanvasArea={onStartCanvasArea}
          onStartPropertiesPanel={onStartPropertiesPanel}
          onStartAIAssistant={onStartAIAssistant}
          onStartCodeEditor={onStartCodeEditor}
          onStartComponentsLibrary={onStartComponentsLibrary}
          onStartSavingCollaboration={onStartSavingCollaboration}
        />
      </DialogContent>
    </Dialog>
  );
}