"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  fetchTutorialProgress,
  readLocalProgress,
  writeLocalProgress,
  migrateLocalProgressToDB,
} from "../supabase/data/tutorialProgressService";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GuideCategory = "beginner" | "intermediate" | "advanced";

interface GuideStep {
  id: string;
  category: GuideCategory;
  title: string;
  desc: string;
  comingSoon?: boolean;
  actionKey?: string;
}

// ─── Step Definitions ────────────────────────────────────────────────────────

const ALL_GUIDE_STEPS: GuideStep[] = [
  // ─── Beginner ───
  {
    id: "dashboard",
    category: "beginner",
    title: "Dashboard Overview",
    desc: "Get familiar with the sidebar, project sections, and theme switcher.",
    actionKey: "onStartDashboardOverview",
  },
  {
    id: "nav-projects",
    category: "beginner",
    title: "Navigating Projects",
    desc: "Learn to navigate Recents, Drafts, All Projects, and Trash.",
    actionKey: "onStartNavigatingProjects",
  },

  {
    id: "template-interact",
    category: "beginner",
    title: "Template Interaction",
    desc: "Like, comment on, and report templates.",
    actionKey: "onStartTemplateInteraction",
  },
  {
    id: "website",
    category: "beginner",
    title: "Create New Project",
    desc: "Start a blank project, use a template, and enter project details.",
    actionKey: "onStartWebsiteCreation",
  },

  // ─── Intermediate ───
  {
    id: "canvas",
    category: "intermediate",
    title: "Canvas Overview",
    desc: "Navigate the workspace, select, move, and resize components.",
    actionKey: "onStartCanvasArea",
  },
  {
    id: "blocks-palette",
    category: "intermediate",
    title: "Blocks Palette",
    desc: "Drag and drop components from the blocks palette onto your canvas.",
    actionKey: "onStartBlocksPalette",
  },
  {
    id: "properties",
    category: "intermediate",
    title: "Properties Panel",
    desc: "Edit colors, text, spacing, typography, borders, and shadows.",
    actionKey: "onStartPropertiesPanel",
  },
  {
    id: "layers-panel",
    category: "intermediate",
    title: "Layers Panel",
    desc: "Manage your component structure and stacking order.",
    actionKey: "onStartLayersPanel",
  },
  {
    id: "multi-page",
    category: "intermediate",
    title: "Multi-Page Management",
    desc: "Add and manage multiple pages in your project.",
    actionKey: "onStartMultiPageManagement",
  },
  {
    id: "ai",
    category: "intermediate",
    title: "AI Mentor",
    desc: "Get guided assistance, design suggestions, and content generation.",
    actionKey: "onStartAIAssistant",
  },
  {
    id: "collab",
    category: "intermediate",
    title: "Collaboration Features",
    desc: "Invite teammates, share access, and manage editor/viewer roles.",
    actionKey: "onStartSavingCollaboration",
  },
  {
    id: "preview-mode",
    category: "intermediate",
    title: "Preview Mode",
    desc: "Preview your website at different screen sizes before publishing.",
    actionKey: "onStartPreviewMode",
  },
  {
    id: "publish-template",
    category: "intermediate",
    title: "Publish Template",
    desc: "Share your project as a template for others to use.",
    actionKey: "onStartPublishTemplate",
  },

  // ─── Advanced ───
  {
    id: "code",
    category: "advanced",
    title: "Code Editor",
    desc: "Edit source code in Code View for backend customization.",
    actionKey: "onStartCodeEditor",
  },
  {
    id: "custom-components",
    category: "advanced",
    title: "Custom Components Creation",
    desc: "Create, code, and upload your own custom components.",
    actionKey: "onStartCustomComponents",
  },
  {
    id: "library",
    category: "advanced",
    title: "Component Library",
    desc: "Browse, import, and reuse community-built components.",
    actionKey: "onStartComponentsLibrary",
  },
  {
    id: "db-integration",
    category: "advanced",
    title: "Database Integration",
    desc: "Connect Supabase for reading and writing data from your site.",
    comingSoon: true,
  },
  {
    id: "third-party",
    category: "advanced",
    title: "Third-Party Integrations",
    desc: "Set up PayMongo payments, email services, and more.",
    comingSoon: true,
  },
  {
    id: "publishing",
    category: "advanced",
    title: "Deployment",
    desc: "Publish your website live and manage hosting.",
    actionKey: "onStartPublishingBasics",
  },
  {
    id: "export-files",
    category: "advanced",
    title: "Export Project Files",
    desc: "Download your project files for external use.",
    actionKey: "onStartExportFiles",
  },
];

// ─── Derived Constants (exported for Dashboard cards) ────────────────────────

export const VISIBLE_GUIDE_STEPS = ALL_GUIDE_STEPS.filter(
  (s) => !s.comingSoon,
);

const stepsForCategory = (cat: GuideCategory) =>
  VISIBLE_GUIDE_STEPS.filter((s) => s.category === cat);

export const BEGINNER_KEYS = stepsForCategory("beginner").map((s) => s.id);
export const INTERMEDIATE_KEYS = stepsForCategory("intermediate").map(
  (s) => s.id,
);
export const ADVANCED_KEYS = stepsForCategory("advanced").map((s) => s.id);
export const ALL_VISIBLE_KEYS = VISIBLE_GUIDE_STEPS.map((s) => s.id);

const CATEGORY_ORDER: GuideCategory[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export const CATEGORY_META: Record<
  GuideCategory,
  {
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    colors: {
      border: string;
      badge: string;
      btn: string;
      gradient: string;
      progressBar: string;
    };
    stepKeys: string[];
  }
> = {
  beginner: {
    title: "Beginner",
    subtitle: "Getting Started Guide",
    description: "Basic navigation and simple project creation",
    icon: "🟢",
    colors: {
      border: "border-emerald-500",
      badge: "text-emerald-600 dark:text-emerald-400",
      btn: "from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700",
      gradient: "from-emerald-500/10 to-emerald-600/5",
      progressBar: "bg-emerald-500",
    },
    stepKeys: BEGINNER_KEYS,
  },
  intermediate: {
    title: "Intermediate",
    subtitle: "Core Building Features",
    description: "Actual website building and feature usage",
    icon: "🟡",
    colors: {
      border: "border-amber-500",
      badge: "text-amber-600 dark:text-amber-400",
      btn: "from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700",
      gradient: "from-amber-500/10 to-amber-600/5",
      progressBar: "bg-amber-500",
    },
    stepKeys: INTERMEDIATE_KEYS,
  },
  advanced: {
    title: "Advanced",
    subtitle: "Customization & Production",
    description: "Customization, optimization, and production-ready output",
    icon: "🔴",
    colors: {
      border: "border-red-500",
      badge: "text-red-600 dark:text-red-400",
      btn: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
      gradient: "from-red-500/10 to-red-600/5",
      progressBar: "bg-red-500",
    },
    stepKeys: ADVANCED_KEYS,
  },
};

// ─── Utility Functions (exported) ────────────────────────────────────────────

export const isCategoryLocked = (
  category: GuideCategory,
  completed: Record<string, boolean>,
): boolean => {
  const categoryIndex = CATEGORY_ORDER.indexOf(category);
  if (categoryIndex <= 0) return false;

  for (let i = 0; i < categoryIndex; i++) {
    const prevCategory = CATEGORY_ORDER[i];
    const meta = CATEGORY_META[prevCategory];
    if (!meta.stepKeys.every((key) => completed[key])) return true;
  }
  return false;
};

export const getCategoryProgress = (
  category: GuideCategory,
  completed: Record<string, boolean>,
) => {
  const meta = CATEGORY_META[category];
  const done = meta.stepKeys.filter((key) => completed[key]).length;
  const total = meta.stepKeys.length;
  return { done, total };
};

// ─── Main Content Component ──────────────────────────────────────────────────

interface GettingStartedGuideContentProps {
  userId?: string | null;
  refreshKey?: number;
  category?: GuideCategory;
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
  onStartNavigatingProjects?: () => void;
  onStartTemplateInteraction?: () => void;
  onStartPublishTemplate?: () => void;
  onStartBlocksPalette?: () => void;
  onStartLayersPanel?: () => void;
  onStartMultiPageManagement?: () => void;
  onStartPreviewMode?: () => void;
  onStartCustomComponents?: () => void;
  onStartExportFiles?: () => void;
}

export function GettingStartedGuideContent({
  userId,
  refreshKey,
  category: propCategory,
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
  onStartNavigatingProjects,
  onStartTemplateInteraction,
  onStartPublishTemplate,
  onStartBlocksPalette,
  onStartLayersPanel,
  onStartMultiPageManagement,
  onStartPreviewMode,
  onStartCustomComponents,
  onStartExportFiles,
}: GettingStartedGuideContentProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [progressLoading, setProgressLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<GuideCategory | null>(null);

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
            rows.map((r) => [r.step_key, r.completed]),
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

  // Map action keys → callbacks
  const actionMap: Record<string, (() => void) | undefined> = {
    onStartDashboardOverview,
    onStartBuildXIntroduction,
    onStartWebsiteCreation,
    onStartCanvasArea,
    onStartPropertiesPanel,
    onStartAIAssistant,
    onStartCodeEditor,
    onStartComponentsLibrary,
    onStartSavingCollaboration,
    onStartPublishingBasics,
    onStartNavigatingProjects,
    onStartTemplateInteraction,
    onStartPublishTemplate,
    onStartBlocksPalette,
    onStartLayersPanel,
    onStartMultiPageManagement,
    onStartPreviewMode,
    onStartCustomComponents,
    onStartExportFiles,
  };

  // Overall progress statistics
  const overallDone = ALL_VISIBLE_KEYS.filter((k) => completed[k]).length;
  const overallTotal = ALL_VISIBLE_KEYS.length;

  // Logic to determine what to show
  const currentCategory = propCategory || activeTab;

  // If we have a category (either from prop or from click), show the list of steps
  if (currentCategory) {
    const steps = VISIBLE_GUIDE_STEPS.filter((s) => s.category === currentCategory);
    const categoryMeta = CATEGORY_META[currentCategory];
    const categoryLocked = isCategoryLocked(currentCategory, completed);
    const { done: doneCount, total: totalCount } = getCategoryProgress(currentCategory, completed);
    const progressPercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Navigation & Header */}
        {!propCategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(null)}
            className="w-fit mb-2 -ml-1 text-muted-foreground hover:text-foreground font-bold flex items-center gap-2"
          >
            ← Back to Overview
          </Button>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 rounded-2xl bg-muted/20 border border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{categoryMeta.icon}</span>
              <h2 className="text-2xl font-bold text-foreground">
                {categoryMeta.title} Tutorials
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg font-medium">
              {categoryMeta.description}
            </p>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-foreground tabular-nums">
                {Math.round(progressPercent)}%
              </span>
              <span className="text-[10px] font-black text-muted-foreground tracking-widest bg-muted px-2 py-0.5 rounded-md">COMPLETE</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">
              {doneCount} / {totalCount} tutorials finished
            </p>
          </div>
        </div>

        {/* Individual Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, idx) => {
            const done = completed[step.id];
            const categorySteps = VISIBLE_GUIDE_STEPS.filter((s) => s.category === step.category);
            const stepIndexInCategory = categorySteps.findIndex((s) => s.id === step.id);
            const prevStepId = stepIndexInCategory > 0 ? categorySteps[stepIndexInCategory - 1]?.id : undefined;
            const locked = !done && stepIndexInCategory > 0 ? !completed[prevStepId ?? ""] : false;
            const colors = categoryMeta.colors;

            return (
              <div
                key={step.id}
                className={`group flex flex-col border-2 rounded-2xl p-6 gap-4 transition-all duration-300 ${locked
                  ? "opacity-60 bg-muted/5 border-dashed border-border"
                  : done
                    ? `bg-muted/10 ${colors.border}/30`
                    : "bg-card border-border hover:border-muted-foreground hover:shadow-md"
                  }`}
              >

                <div className="space-y-1.5 min-h-[80px]">
                  <h4 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-auto pt-4 relative">
                  <Button
                    size="default"
                    disabled={locked}
                    className={`text-white w-full rounded-xl h-11 font-bold transition-all ${locked
                      ? "bg-muted text-muted-foreground/30 shadow-none border-transparent"
                      : done
                        ? `bg-muted hover:bg-muted/80 text-foreground border-2 border-border shadow-none`
                        : `bg-gradient-to-r ${colors.btn} shadow-lg shadow-primary/10`
                      }`}
                    onClick={() => {
                      if (locked || !step.actionKey) return;
                      actionMap[step.actionKey]?.();
                    }}
                  >
                    {done ? "Review Step" : locked ? "Locked" : "Start Step"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Progress Sticky Footer Mini */}
        {!propCategory && (
          <div className="mt-8 p-6 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Global Designer Mastery</span>
              <span className="text-sm font-bold">{overallDone} of {overallTotal} Skills Unlocked</span>
            </div>
            <div className="flex-1 max-w-[200px] h-2 bg-muted rounded-full overflow-hidden border border-border">
              <div className="h-full bg-primary transition-all duration-700" style={{ width: `${(overallDone / overallTotal) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Home View: Show 3 Large Category Cards (Mirrors Dashboard UI)
  return (
    <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Getting Started Guide</h2>
        <p className="text-muted-foreground max-w-2xl font-medium">
          Master BuildX Designer step by step — from basic navigation to advanced custom components and database integration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["beginner", "intermediate", "advanced"] as GuideCategory[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const { done, total } = getCategoryProgress(cat, completed);
          const locked = isCategoryLocked(cat, completed);
          const progressPercent = total > 0 ? (done / total) * 100 : 0;
          const isComplete = done === total && total > 0;

          return (
            <button
              key={cat}
              onClick={() => !locked && setActiveTab(cat)}
              disabled={locked}
              className={`group relative flex flex-col rounded-2xl border-2 p-7 text-left transition-all duration-300 bg-card hover:shadow-xl hover:scale-[1.02] ${locked
                ? "border-border opacity-70 cursor-not-allowed grayscale-[0.5]"
                : isComplete
                  ? `${meta.colors.border} shadow-md border-opacity-50`
                  : "border-border hover:border-muted-foreground"
                }`}
            >
              {/* Category icon + lock */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{meta.icon}</span>
                {locked ? (
                  <span className="text-xl opacity-40">🔒</span>
                ) : isComplete ? (
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${meta.colors.border} ${meta.colors.badge} bg-background`}>
                    ✓ COMPLETE
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-muted-foreground opacity-40">Lv. {CATEGORY_ORDER.indexOf(cat) + 1}</span>
                )}
              </div>

              {/* Title + subtitle */}
              <h3 className="text-xl font-black text-foreground mb-1 tracking-tight">
                {meta.title}
              </h3>
              <p className={`text-[11px] font-black mb-3 uppercase tracking-widest ${meta.colors.badge}`}>
                {meta.subtitle}
              </p>
              <p className="text-sm text-muted-foreground font-medium mb-6 flex-1 opacity-80 group-hover:opacity-100 transition-opacity">
                {meta.description}
              </p>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground uppercase opacity-60">Progress</span>
                  <span className="text-foreground">{done}/{total}</span>
                </div>
                <div className="bg-muted rounded-full h-2.5 overflow-hidden border border-border/50">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${meta.colors.progressBar}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-8 rounded-2xl bg-muted/20 border border-border border-dashed flex flex-col items-center text-center gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">Complete and Master Everything</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Unlock all {overallTotal} designer skills to become a certified BuildX expert.
            All your progress is automatically saved to your profile.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted rounded-full w-48 h-2">
            <div className="bg-primary h-full rounded-full" style={{ width: `${(overallDone / overallTotal) * 100}%` }} />
          </div>
          <span className="text-xs font-black">{Math.round((overallDone / overallTotal) * 100)}% Overall</span>
        </div>
      </div>
    </div>
  );
}

// ─── Category Dialog (NEW — one category at a time) ──────────────────────────

interface GettingStartedCategoryDialogProps
  extends GettingStartedGuideContentProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  category: GuideCategory;
}

export function GettingStartedCategoryDialog({
  open,
  onOpenChange,
  category,
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
  onStartNavigatingProjects,
  onStartTemplateInteraction,
  onStartPublishTemplate,
  onStartBlocksPalette,
  onStartLayersPanel,
  onStartMultiPageManagement,
  onStartPreviewMode,
  onStartCustomComponents,
  onStartExportFiles,
}: GettingStartedCategoryDialogProps) {
  const meta = CATEGORY_META[category];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => onOpenChange?.(isOpen)}>
      <DialogContent className="custom-scrollbar w-full max-w-[90vw] lg:max-w-[85vw] xl:max-w-6xl border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {meta.icon} {meta.title} — {meta.subtitle}
          </DialogTitle>
          <DialogDescription>
            {meta.description}. Complete the tutorials in order to unlock the
            next step.
          </DialogDescription>
        </DialogHeader>

        <GettingStartedGuideContent
          userId={userId}
          refreshKey={refreshKey}
          category={category}
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
          onStartNavigatingProjects={onStartNavigatingProjects}
          onStartTemplateInteraction={onStartTemplateInteraction}
          onStartPublishTemplate={onStartPublishTemplate}
          onStartBlocksPalette={onStartBlocksPalette}
          onStartLayersPanel={onStartLayersPanel}
          onStartMultiPageManagement={onStartMultiPageManagement}
          onStartPreviewMode={onStartPreviewMode}
          onStartCustomComponents={onStartCustomComponents}
          onStartExportFiles={onStartExportFiles}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Legacy Exports (backward compatibility) ─────────────────────────────────

interface GettingStartedModalProps extends GettingStartedGuideContentProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GettingStartedModal({
  isOpen,
  onClose,
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
  onStartNavigatingProjects,
  onStartTemplateInteraction,
  onStartPublishTemplate,
  onStartBlocksPalette,
  onStartLayersPanel,
  onStartMultiPageManagement,
  onStartPreviewMode,
  onStartCustomComponents,
  onStartExportFiles,
}: GettingStartedModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="custom-scrollbar w-full max-w-[90vw] lg:max-w-[85vw] xl:max-w-7xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            🎓 Getting Started Guide
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Complete tutorials in order to unlock the next level. Your progress is saved automatically.
          </DialogDescription>
        </DialogHeader>

        <GettingStartedGuideContent
          userId={userId}
          onStartBuildXIntroduction={() => {
            onClose();
            onStartBuildXIntroduction?.();
          }}
          onStartWebsiteCreation={() => {
            onClose();
            onStartWebsiteCreation?.();
          }}
          onStartPublishingBasics={() => {
            onClose();
            onStartPublishingBasics?.();
          }}
          onStartDashboardOverview={() => {
            onClose();
            onStartDashboardOverview?.();
          }}
          onStartCanvasArea={() => {
            onClose();
            onStartCanvasArea?.();
          }}
          onStartPropertiesPanel={() => {
            onClose();
            onStartPropertiesPanel?.();
          }}
          onStartAIAssistant={() => {
            onClose();
            onStartAIAssistant?.();
          }}
          onStartCodeEditor={() => {
            onClose();
            onStartCodeEditor?.();
          }}
          onStartComponentsLibrary={() => {
            onClose();
            onStartComponentsLibrary?.();
          }}
          onStartSavingCollaboration={() => {
            onClose();
            onStartSavingCollaboration?.();
          }}
          onStartNavigatingProjects={() => {
            onClose();
            onStartNavigatingProjects?.();
          }}
          onStartTemplateInteraction={() => {
            onClose();
            onStartTemplateInteraction?.();
          }}
          onStartPublishTemplate={() => {
            onClose();
            onStartPublishTemplate?.();
          }}
          onStartBlocksPalette={() => {
            onClose();
            onStartBlocksPalette?.();
          }}
          onStartLayersPanel={() => {
            onClose();
            onStartLayersPanel?.();
          }}
          onStartMultiPageManagement={() => {
            onClose();
            onStartMultiPageManagement?.();
          }}
          onStartPreviewMode={() => {
            onClose();
            onStartPreviewMode?.();
          }}
          onStartCustomComponents={() => {
            onClose();
            onStartCustomComponents?.();
          }}
          onStartExportFiles={() => {
            onClose();
            onStartExportFiles?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Guide Dialog (used in Editor) ──────────────────────────────────────

interface GettingStartedGuideDialogProps
  extends GettingStartedGuideContentProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GettingStartedGuideDialog({
  open,
  onOpenChange,
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
  onStartNavigatingProjects,
  onStartTemplateInteraction,
  onStartPublishTemplate,
  onStartBlocksPalette,
  onStartLayersPanel,
  onStartMultiPageManagement,
  onStartPreviewMode,
  onStartCustomComponents,
  onStartExportFiles,
}: GettingStartedGuideDialogProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) { setCompleted(readLocalProgress()); return; }
      try {
        const rows = await fetchTutorialProgress(userId);
        if (rows.length > 0) {
          setCompleted(Object.fromEntries(rows.map((r) => [r.step_key, r.completed])));
        } else {
          setCompleted(readLocalProgress());
        }
      } catch { setCompleted(readLocalProgress()); }
    };
    if (open) load();
  }, [userId, refreshKey, open]);

  // Reset to overview when dialog closes
  useEffect(() => {
    if (!open) setSelectedCategory(null);
  }, [open]);

  const actionMap: Record<string, (() => void) | undefined> = {
    onStartDashboardOverview, onStartBuildXIntroduction, onStartWebsiteCreation,
    onStartCanvasArea, onStartPropertiesPanel, onStartAIAssistant, onStartCodeEditor,
    onStartComponentsLibrary, onStartSavingCollaboration, onStartPublishingBasics,
    onStartNavigatingProjects, onStartTemplateInteraction, onStartPublishTemplate,
    onStartBlocksPalette, onStartLayersPanel, onStartMultiPageManagement,
    onStartPreviewMode, onStartCustomComponents, onStartExportFiles,
  };

  const levelLabels = ["Level 1", "Level 2", "Level 3"];
  const accentColors: Record<string, { bar: string; badge: string; num: string }> = {
    beginner: { bar: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", num: "text-emerald-400" },
    intermediate: { bar: "bg-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", num: "text-amber-400" },
    advanced: { bar: "bg-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/20", num: "text-red-400" },
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => onOpenChange?.(isOpen)}>
      <DialogContent className="custom-scrollbar w-full max-w-3xl border border-border shadow-2xl max-h-[85vh] overflow-y-auto bg-card">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            🎓 Getting Started Guide
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Complete tutorials in order to unlock the next level.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!selectedCategory ? (
            // Compact category cards — matches dashboard style
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["beginner", "intermediate", "advanced"] as GuideCategory[]).map((cat, catIdx) => {
                const meta = CATEGORY_META[cat];
                const { done, total } = getCategoryProgress(cat, completed);
                const locked = isCategoryLocked(cat, completed);
                const progressPercent = total > 0 ? (done / total) * 100 : 0;
                const isComplete = done === total && total > 0;
                const accent = accentColors[cat];

                return (
                  <button
                    key={cat}
                    onClick={() => !locked && setSelectedCategory(cat)}
                    disabled={locked}
                    style={{ minHeight: "180px" }}
                    className={`group relative flex flex-col rounded-xl border text-left transition-all duration-200 ${locked
                      ? "border-border/40 opacity-50 cursor-not-allowed bg-card"
                      : "border-border bg-card hover:border-border/80 hover:shadow-md"
                      }`}
                  >
                    <div style={{ height: "3px", flexShrink: 0 }}
                      className={`w-full rounded-t-xl ${locked ? "bg-border/30" : accent.bar}`} />
                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 self-start text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md border ${locked ? "bg-muted/30 text-muted-foreground/50 border-border/30" : accent.badge}`}>
                            {locked ? "🔒 Locked" : levelLabels[catIdx]}
                          </span>
                          <h3 className="text-sm font-semibold text-foreground mt-0.5">{meta.title}</h3>
                          <p className={`text-[10px] font-medium ${locked ? "text-muted-foreground/40" : "text-muted-foreground"}`}>{meta.subtitle}</p>
                        </div>
                        <div className="shrink-0">
                          {isComplete ? (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${accent.bar} text-white`}>✓</div>
                          ) : (
                            <span className={`text-lg font-black tabular-nums ${locked ? "text-muted-foreground/30" : accent.num}`}>
                              {done}<span className="text-xs font-medium text-muted-foreground/50">/{total}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{meta.description}</p>
                      <div style={{ flex: 1 }} />
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${locked ? "bg-muted-foreground/20" : accent.bar}`}
                          style={{ width: `${progressPercent}%` }} />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground">{total} tutorial{total !== 1 ? "s" : ""}</span>
                        {!locked && (
                          <span className={`text-[10px] font-semibold ${isComplete ? "text-muted-foreground" : accent.num}`}>
                            {isComplete ? "Review →" : done > 0 ? "Continue →" : "Start →"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            // Step list for selected category
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className="w-fit text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1"
              >
                ← Back
              </button>
              {(() => {
                const meta = CATEGORY_META[selectedCategory];
                const { done: doneCount, total: totalCount } = getCategoryProgress(selectedCategory, completed);
                const steps = VISIBLE_GUIDE_STEPS.filter((s) => s.category === selectedCategory);
                const accent = accentColors[selectedCategory];
                return (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.icon}</span>
                        <div>
                          <h2 className="text-base font-bold text-foreground">{meta.title} Tutorials</h2>
                          <p className="text-xs text-muted-foreground">{meta.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-2xl font-black tabular-nums ${accent.num}`}>{doneCount}</span>
                        <span className="text-xs text-muted-foreground">/{totalCount}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {steps.map((step) => {
                        const done = completed[step.id];
                        const categorySteps = VISIBLE_GUIDE_STEPS.filter((s) => s.category === step.category);
                        const stepIdx = categorySteps.findIndex((s) => s.id === step.id);
                        const prevId = stepIdx > 0 ? categorySteps[stepIdx - 1]?.id : undefined;
                        const locked = !done && stepIdx > 0 ? !completed[prevId ?? ""] : false;
                        return (
                          <div key={step.id}
                            className={`flex flex-col border rounded-xl p-4 gap-3 transition-all ${locked ? "opacity-60 bg-muted/5 border-dashed border-border"
                              : done ? "bg-muted/10 border-border"
                                : "bg-card border-border hover:border-muted-foreground hover:shadow-sm"
                              }`}>
                            <div>
                              <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                            </div>
                            <button
                              disabled={locked}
                              className={`w-full rounded-lg py-2 text-xs font-bold transition-all ${locked ? "bg-muted text-muted-foreground/30 cursor-not-allowed"
                                : done ? "bg-muted text-foreground border border-border"
                                  : `bg-gradient-to-r ${meta.colors.btn} text-white shadow-sm`
                                }`}
                              onClick={() => { if (!locked && step.actionKey) actionMap[step.actionKey]?.(); }}
                            >
                              {done ? "Review Step" : locked ? "Locked" : "Start Step"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}