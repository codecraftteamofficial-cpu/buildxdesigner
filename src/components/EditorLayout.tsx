"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  PanelRight,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Laptop,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Canvas } from "./Canvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { MobilePropertiesModal } from "./MobilePropertiesModal";
import { PreviewModal } from "./PreviewModal";
import { GettingStartedGuideDialog } from "./GettingStartedModal";

import { TemplateModal } from "./TemplateModal";
import { PublishModal } from "./PublishModal";
import { ShareModal } from "./ShareModal";
import { RightSidebar } from "./RightSidebar";
import { EditorFooter } from "./EditorFooter";
import { EditorTopBar } from "./EditorTopBar";
import { TooltipProvider } from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Toaster } from "./ui/sonner";
import { CodeViewEditor } from "./CodeViewEditor";
import { CodeExportModal } from "./CodeExportModal";
import type { useEditorState } from "../hooks/useEditorState";
import type { ComponentData } from "../types/editor";
import { GetOut } from "./UnexpectedEntry/UnexpectedEntry";
import { BlocksPaletteTour } from "./Guides/BlocksPaletteTour";
import { LayersPanelTour } from "./Guides/LayersPanelTour";
import { MultiPageTour } from "./Guides/MultiPageTour";
import { PublishTemplateTour } from "./Guides/PublishTemplateTour";
import { PreviewModeTour } from "./Guides/PreviewModeTour";
import { CustomComponentsTour } from "./Guides/CustomComponentsTour";
import { ExportFilesTour } from "./Guides/ExportFilesTour";
import { markStepComplete } from "../supabase/data/tutorialProgressService";
import { PublishingBasics } from "./Guides/PublishingBasics";
import { PropertiesPanel as PropertiesPanelTour } from "./Guides/PropertiesPanel";
import { AIAssistant as AIAssistantTour } from "./Guides/AIAssistant";
import { CodeEditorTour } from "./Guides/CodeEditorTour";
import { SavingCollaboration } from "./Guides/SavingCollaboration";
import { ComponentsLibrary } from "./Guides/ComponentsLibrary";
import { CanvasArea as CanvasAreaTour } from "./Guides/CanvasArea";


interface EditorLayoutProps {
  editor: ReturnType<typeof useEditorState>;
  onStartTour?: () => void;
  onStartPublishingBasics?: () => void;
  onStartCanvasArea?: () => void;
  onStartPropertiesPanel?: () => void;
  onStartAIAssistant?: () => void;
  onStartCodeEditor?: () => void;
  onStartSavingCollaboration?: () => void;
  onStartBlocksPalette?: () => void;
  onStartLayersPanel?: () => void;
  onStartMultiPageManagement?: () => void;
  onStartPublishTemplate?: () => void;
  onStartPreviewMode?: () => void;
  onStartCustomComponents?: () => void;
  onStartExportFiles?: () => void;
}

export function EditorLayout({
  editor,
  onStartTour,
  onStartPublishingBasics,
  onStartCanvasArea,
  onStartPropertiesPanel,
  onStartAIAssistant,
  onStartCodeEditor,
  onStartSavingCollaboration,
  onStartBlocksPalette,
  onStartLayersPanel,
  onStartMultiPageManagement,
  onStartPublishTemplate,
  onStartPreviewMode,
  onStartCustomComponents,
  onStartExportFiles,
}: EditorLayoutProps) {
  console.log("[EditorLayout] Render state.userProjectConfig:", editor?.state?.userProjectConfig);
  const {
    state,
    setState,
    addComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    reorderComponent,
    moveLayer,
    togglePreview,

    toggleTemplates,
    togglePublishModal,
    toggleShareModal,
    togglePropertiesPanel,
    toggleAIAssistant,
    toggleFullscreen,
    toggleCanvasGrid,
    goToDashboard,
    loadTemplate,
    updateProjectName,
    handleThemeChange,
    handleViewModeChange,
    setCanvasZoom,
    updateCanvasBackground,
    handleManualSave,
    handlePublishTemplate,
    handlePublish,
    handleShare,
    handleLeftSplitterMouseDown,
    handleRightSplitterMouseDown,
    remoteCursors,
    replaceComponents,
    setLocalCursor,
    clearLocalCursor,
    saveCustomComponent,
    updateCustomComponent,
    deleteCustomComponent,
    exportComponent,
    refreshCustomComponents,
  } = editor;

  const [accessCheckTimedOut, setAccessCheckTimedOut] = useState(false);

  const [showExportConfirmDialog, setShowExportConfirmDialog] = useState(false);
  const [pendingExportComponent, setPendingExportComponent] = useState<any>(null);
  const [showCodeExportModal, setShowCodeExportModal] = useState(false);
  const [showGettingStartedGuideDialog, setShowGettingStartedGuideDialog] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [showPublishingBasicsTour, setShowPublishingBasicsTour] = useState(false);
  const [showCanvasAreaTour, setShowCanvasAreaTour] = useState(false);
  const [showPropertiesPanelTour, setShowPropertiesPanelTour] = useState(false);
  const [showAIAssistantTour, setShowAIAssistantTour] = useState(false);
  const [showCodeEditorTour, setShowCodeEditorTour] = useState(false);
  const [showSavingCollaborationTour, setShowSavingCollaborationTour] = useState(false);
  const [showBlocksPaletteTour, setShowBlocksPaletteTour] = useState(false);
  const [showLayersPanelTour, setShowLayersPanelTour] = useState(false);
  const [showMultiPageTour, setShowMultiPageTour] = useState(false);
  const [showPublishTemplateTour, setShowPublishTemplateTour] = useState(false);
  const [showPreviewModeTour, setShowPreviewModeTour] = useState(false);
  const [showCustomComponentsTour, setShowCustomComponentsTour] = useState(false);
  const [showExportFilesTour, setShowExportFilesTour] = useState(false);
  const [guideRefreshKey, setGuideRefreshKey] = useState(0);

  const ALL_STEP_KEYS = [
    "dashboard", "nav-projects", "palette", "template-interact", "website", "publish-template",
    "canvas", "blocks-palette", "properties", "layers-panel", "multi-page", "ai", "collab", "preview-mode",
    "code", "custom-components", "library", "publishing", "export-files"
  ];

  const checkAllStepsComplete = async () => {
    if (!state.currentUser?.id) return;
    try {
      const { fetchTutorialProgress } = await import("../supabase/data/tutorialProgressService");
      const rows = await fetchTutorialProgress(state.currentUser.id);
      const completedKeys = new Set(rows.filter(r => r.completed).map(r => r.step_key));
      const allDone = ALL_STEP_KEYS.every(key => completedKeys.has(key));
      if (allDone) {
        window.dispatchEvent(new Event("buildx-tutorial-completed"));
      }
    } catch (err) {
      console.error("Error checking tutorial completion:", err);
    }
  };

  // Auto-show guide dialog when tutorial steps complete
  useEffect(() => {
    const handleTutorialComplete = () => {
      setTimeout(() => {
        setShowCongratsModal(true);
      }, 400);
    };
    window.addEventListener("buildx-tutorial-completed", handleTutorialComplete);
    return () => window.removeEventListener("buildx-tutorial-completed", handleTutorialComplete);
  }, []);

  useEffect(() => {
    const handleStepCompleted = () => {
      setGuideRefreshKey(prev => prev + 1); // ← ADD THIS
      setTimeout(() => {
        setShowGettingStartedGuideDialog(true);
      }, 400);
    };
    window.addEventListener("buildx-tutorial-step-completed", handleStepCompleted);
    return () => window.removeEventListener("buildx-tutorial-step-completed", handleStepCompleted);
  }, []);

  // Add alongside the existing buildx-tutorial-completed listener
  useEffect(() => {
    const checkPendingTours = () => {
      if (localStorage.getItem("buildx-pending-publishing-basics-tour")) {
        localStorage.removeItem("buildx-pending-publishing-basics-tour");
        onStartPublishingBasics?.();
      }
      if (localStorage.getItem("buildx-pending-canvas-tour")) {
        localStorage.removeItem("buildx-pending-canvas-tour");
        onStartCanvasArea?.();
      }
      if (localStorage.getItem("buildx-pending-properties-tour")) {
        localStorage.removeItem("buildx-pending-properties-tour");
        onStartPropertiesPanel?.();
      }
      if (localStorage.getItem("buildx-pending-ai-tour")) {
        localStorage.removeItem("buildx-pending-ai-tour");
        onStartAIAssistant?.();
      }
      if (localStorage.getItem("buildx-pending-code-tour")) {
        localStorage.removeItem("buildx-pending-code-tour");
        onStartCodeEditor?.();
      }
      if (localStorage.getItem("buildx-pending-collab-tour")) {
        localStorage.removeItem("buildx-pending-collab-tour");
        onStartSavingCollaboration?.();
      }
      if (localStorage.getItem("buildx-pending-publish-template-tour")) {
        localStorage.removeItem("buildx-pending-publish-template-tour");
        onStartPublishTemplate?.();
      }
      if (localStorage.getItem("buildx-pending-blocks-palette-tour")) {
        localStorage.removeItem("buildx-pending-blocks-palette-tour");
        onStartBlocksPalette?.();
      }
      if (localStorage.getItem("buildx-pending-layers-panel-tour")) {
        localStorage.removeItem("buildx-pending-layers-panel-tour");
        onStartLayersPanel?.();
      }
      if (localStorage.getItem("buildx-pending-multi-page-tour")) {
        localStorage.removeItem("buildx-pending-multi-page-tour");
        onStartMultiPageManagement?.();
      }
      if (localStorage.getItem("buildx-pending-preview-mode-tour")) {
        localStorage.removeItem("buildx-pending-preview-mode-tour");
        onStartPreviewMode?.();
      }
      if (localStorage.getItem("buildx-pending-custom-components-tour")) {
        localStorage.removeItem("buildx-pending-custom-components-tour");
        onStartCustomComponents?.();
      }
      if (localStorage.getItem("buildx-pending-export-files-tour")) {
        localStorage.removeItem("buildx-pending-export-files-tour");
        onStartExportFiles?.();
      }
    };

    // Tiny delay to ensure editor is seated
    const timer = setTimeout(checkPendingTours, 800);
    return () => clearTimeout(timer);
  }, [
    onStartPublishingBasics, onStartCanvasArea, onStartPropertiesPanel,
    onStartAIAssistant, onStartCodeEditor, onStartSavingCollaboration,
    onStartPublishTemplate, onStartBlocksPalette, onStartLayersPanel,
    onStartMultiPageManagement, onStartPreviewMode, onStartCustomComponents,
    onStartExportFiles
  ]);

  const openExportConfirmDialog = async (component: any) => {
    setPendingExportComponent(component);
    setShowExportConfirmDialog(true);
  };

  const handleExportComponent = async () => {
    if (pendingExportComponent) {
      try {
        await exportComponent(pendingExportComponent);
        const { toast } = await import('sonner');
        toast.success(`"${pendingExportComponent.name}" published to community!`);
        setShowExportConfirmDialog(false);
        setPendingExportComponent(null);
      } catch (err) {
        const { toast } = await import('sonner');
        toast.error('Failed to publish component');
        setShowExportConfirmDialog(false);
        setPendingExportComponent(null);
      }
    }
  };

  useEffect(() => {
    const isChecking =
      state.currentProjectId &&
      (state.projectIsPublic === null || state.projectCanView === null);
    if (!isChecking) {
      setAccessCheckTimedOut(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setAccessCheckTimedOut(true);
    }, 2500);

    return () => window.clearTimeout(timerId);
  }, [state.currentProjectId, state.projectIsPublic, state.projectCanView]);

  if (
    state.currentProjectId &&
    (state.projectIsPublic === null || state.projectCanView === null) &&
    !accessCheckTimedOut
  ) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-muted-foreground">
        Checking project access...
      </div>
    );
  }

  if (state.projectCanView === false) {
    return <GetOut />;
  }

  const canEditProject = state.projectCanEdit === true;

  const selectedComponentObject: ComponentData | null = state.selectedComponent
    ? state.components.find((c) => c.id === state.selectedComponent) || null
    : null;

  return (
    <DndProvider backend={HTML5Backend}>
      <TooltipProvider>
        <div className="editor-gradient-surface h-screen flex flex-col overflow-hidden">
          <EditorTopBar
            currentUser={state.currentUser}
            isSupabaseConnected={state.isSupabaseConnected}
            viewMode={state.viewMode}
            onViewModeChange={handleViewModeChange}
            onPublish={handlePublish}
            onShare={handleShare}
            onPreview={togglePreview}
            onGoToDashboard={goToDashboard}
            onExport={() => setShowCodeExportModal(true)}
            isSaving={state.isSaving}
            lastSaved={state.lastSaved}
            hasUnsavedChanges={state.hasUnsavedChanges}
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={state.isFullscreen}
            projectName={state.projectName}
            onProjectNameChange={canEditProject ? updateProjectName : undefined}
            theme={state.theme}
            onThemeChange={handleThemeChange}
            onManualSave={canEditProject ? handleManualSave : undefined}
            onPublishTemplate={handlePublishTemplate}
            onProjectVisibilityChange={(isPublic: boolean) => {
              setState((prev) => ({
                ...prev,
                projectIsPublic: isPublic,
              }));
            }}
            onTemplatePublishedChange={(published: boolean) => {
              setState((prev) => ({
                ...prev,
                projectTemplatePublished: published,
              }));
            }}
            pages={state.pages}
            activePageId={state.activePageId}
            onSwitchPage={editor.switchPage}
            onAddPage={canEditProject ? editor.addPage : undefined}
            onDeletePage={canEditProject ? editor.deletePage : undefined}
            onDuplicatePage={canEditProject ? editor.duplicatePage : undefined}
            onUpdatePage={canEditProject ? editor.updatePage : undefined}
            onStartTour={onStartTour}
            onStartPublishingBasics={onStartPublishingBasics}
            currentProject={{
              id: state.currentProjectId!,
              name: state.projectName,
              subdomain: state.projectSubdomain,
              isPublished: state.projectIsPublished,
              lastPublishedAt: state.projectLastPublishedAt,
              published_template: state.projectTemplatePublished,
              project_layout: state.components,
              pages: state.pages,
              siteTitle: state.siteTitle,
              siteLogoUrl: state.siteLogoUrl,
            }}
            onPublishSuccess={(subdomain: string, title?: string, logoUrl?: string) => {
              setState((prev) => ({
                ...prev,
                projectSubdomain: subdomain,
                projectIsPublished: true,
                projectLastPublishedAt: new Date().toISOString(),
                siteTitle: title || prev.siteTitle,
                siteLogoUrl: logoUrl || prev.siteLogoUrl,
              }));
            }}
          />

          <div data-tour="canvas-area-dnd" className="flex-1 overflow-hidden flex min-h-0 relative">
            {!state.isLeftSidebarVisible && (
              <button
                onClick={() =>
                  setState((prev) => ({ ...prev, isLeftSidebarVisible: true }))
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-card border border-l-0 border-border p-1 rounded-r-md shadow-sm hover:bg-accent transition-colors"
                title="Show Left Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div
              className={`shrink-0 bg-card border-r border-border overflow-hidden relative ${state.isLeftSidebarVisible ? "" : "w-0 border-r-0"
                }`}
              style={{
                width: state.isLeftSidebarVisible
                  ? `${state.leftSidebarWidth}px`
                  : "0px",
              }}
            >
              {state.isLeftSidebarVisible && (
                <>
                  <button
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        isLeftSidebarVisible: false,
                      }))
                    }
                    className="absolute right-2 top-2 z-20 p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                    title="Hide Sidebar"
                  >
                    <ChevronLeft className="w-10 h-4" />
                  </button>

                  <div className="flex-1 overflow-auto h-full pt-0">
                    <Sidebar
                      onAddComponent={canEditProject ? addComponent : () => { }}
                      components={state.components}
                      selectedId={state.selectedComponent}
                      onSelect={selectComponent}
                      onDelete={canEditProject ? deleteComponent : () => { }}
                      onReorder={canEditProject ? reorderComponent : () => { }}
                      onMoveLayer={canEditProject ? editor.moveLayer : () => { }}
                      activePageId={state.activePageId}
                      customComponents={state.customComponents}
                      onSaveCustomComponent={saveCustomComponent}
                      onUpdateCustomComponent={updateCustomComponent}
                      onDeleteCustomComponent={deleteCustomComponent}
                      onExportComponent={openExportConfirmDialog}
                      onImportedComponent={refreshCustomComponents}
                      projectId={state.currentProjectId || ''}
                    />
                  </div>
                </>
              )}
            </div>

            {state.isLeftSidebarVisible && (
              <div
                className="relative shrink-0 group cursor-col-resize z-40"
                onMouseDown={handleLeftSplitterMouseDown}
                style={{ width: "8px" }}
              >
                <div className="absolute inset-0">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:w-1 group-hover:bg-purple-500 transition-colors" />
                </div>
              </div>
            )}

            <div
              className={`flex-1 flex flex-col overflow-hidden ${state.viewMode === "code" ? "bg-[#111111]" : "bg-muted/20"} ${state.isFullscreen ? "fullscreen-canvas" : ""}`}
            >
              <div className={`flex-1 flex overflow-hidden justify-center items-start custom-scrollbar ${state.viewMode === "code" ? "p-0 bg-[#111111]" : "p-6 bg-muted/10"}`}>
                <div
                  className="shadow-2xl transition-all duration-300 ease-in-out h-full overflow-hidden rounded-lg relative"
                  style={{
                    width: state.viewMode === "design" ? "1920px" : "100%",
                    maxWidth: state.viewMode === "design" ? "1920px" : "none",
                    backgroundColor: state.viewMode === "code" ? "#111111" : undefined,
                    border: state.viewMode === "code" ? "none" : "1px solid var(--border)",
                  }}
                >
                  {state.viewMode === "design" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <Canvas
                        components={state.components}
                        selectedComponent={selectedComponentObject}
                        onSelectComponent={selectComponent}
                        onAddComponent={addComponent}
                        onUpdateComponent={updateComponent}
                        onDeleteComponent={deleteComponent}
                        onReorderComponent={reorderComponent}
                        onMoveLayer={moveLayer}
                        canvasZoom={state.canvasZoom}
                        onZoomChange={setCanvasZoom}
                        projectId={state.currentProjectId}
                        projectName={state.projectName}
                        backgroundColor={state.canvasBackgroundColor}
                        showGrid={state.showCanvasGrid}
                        pages={state.pages}
                        userProjectConfig={state.userProjectConfig}
                        currentUser={state.currentUser}
                        readOnly={!canEditProject}
                        activePageId={state.activePageId}
                        remoteCursors={remoteCursors}
                        onCursorMove={setLocalCursor}
                        onCursorLeave={clearLocalCursor}
                      />
                    </div>
                  )}

                  {state.viewMode === "code" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
                      <CodeViewEditor
                        components={state.components}
                        customComponents={state.customComponents || []}
                        projectName={state.projectName}
                        pages={state.pages}
                        userConfig={{
                          paymongoKey: state.userProjectConfig?.paymongoKey,
                          resendApiKey: state.userProjectConfig?.resendApiKey,
                          supabaseUrl: state.userProjectConfig?.supabaseUrl || undefined,
                          supabaseKey: state.userProjectConfig?.supabaseKey || undefined,
                          supabaseServiceKey: state.userProjectConfig?.supabaseServiceKey || undefined,
                        }}
                        activePageId={state.activePageId}
                        onCodeChange={(newComponents) => {
                          if (!canEditProject) return;
                          replaceComponents(newComponents);
                        }}
                        onPageCreate={
                          canEditProject
                            ? (name, path) => {
                              editor.addPage(name, path);
                            }
                            : undefined
                        }
                        fileOverrides={state.fileOverrides || {}}
                        onFileOverrideUpdate={(path, content) => {
                          if (content === null) {
                            setState((prev) => {
                              const newOverrides = { ...(prev.fileOverrides || {}) };
                              delete newOverrides[path];
                              return { ...prev, fileOverrides: newOverrides, hasUnsavedChanges: true };
                            });
                            return;
                          }
                          console.log("File override update:", path, content.substring(0, 100));
                          setState((prev) => ({
                            ...prev,
                            fileOverrides: { ...(prev.fileOverrides || {}), [path]: content },
                            hasUnsavedChanges: true,
                          }));
                        }}
                        customFiles={state.customFiles || {}}
                        onCustomFileUpdate={(path, content) => {
                          setState((prev) => ({
                            ...prev,
                            customFiles: { ...(prev.customFiles || {}), [path]: content },
                            hasUnsavedChanges: true,
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {state.isRightSidebarVisible && (
              <div
                className="relative shrink-0 group cursor-col-resize z-40"
                onMouseDown={handleRightSplitterMouseDown}
                style={{ width: "8px" }}
              >
                <div className="absolute inset-0">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:w-1 group-hover:bg-purple-500 transition-colors" />
                </div>
              </div>
            )}

            {!state.isRightSidebarVisible && (
              <button
                onClick={() =>
                  setState((prev) => ({ ...prev, isRightSidebarVisible: true }))
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 z-50 bg-card border border-r-0 border-border p-1 rounded-l-md shadow-sm hover:bg-accent transition-colors"
                title="Show Right Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              className={`shrink-0 bg-card border-l border-border overflow-hidden flex flex-col ${state.isRightSidebarVisible ? "" : "w-0 border-l-0"
                }`}
              style={{
                width: state.isRightSidebarVisible
                  ? `${state.rightSidebarWidth}px`
                  : "0px",
                minWidth: state.isRightSidebarVisible ? "350px" : "0px",
              }}
            >
              {state.isRightSidebarVisible && (
                <>
                  <button
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        isRightSidebarVisible: false,
                      }))
                    }
                    className="absolute left-2 top-2 z-10 p-1 rounded-md hover:bg-accent text-muted-foreground"
                    title="Hide Sidebar"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="border-b p-3 shrink-0">
                    <div className="grid grid-cols-2 gap-1 bg-muted/30 p-1 rounded-lg">
                      <button
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            rightSidebarTab: "properties",
                          }))
                        }
                        data-tour="properties-toolbar"
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all ${state.rightSidebarTab === "properties"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <PanelRight className="w-3.5 h-3.5" />
                        Properties
                      </button>
                      <button
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            rightSidebarTab: "ai-assistant",
                          }))
                        }
                        data-tour="ai-mentor-toolbar"
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all ${state.rightSidebarTab === "ai-assistant"
                          ? "bg-linear-to-r from-violet-600 to-fuchsia-500 text-violet-600 shadow-md font-bold"
                          : "bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 font-semibold"
                          }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Mentor
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden w-full max-w-full">
                    {state.rightSidebarTab === "properties" && (
                      <PropertiesPanel
                        pages={state.pages}
                        activePageId={state.activePageId}
                        selectedComponent={selectedComponentObject}
                        onUpdateComponent={
                          canEditProject ? updateComponent : () => { }
                        }
                        onUpdateStyle={(id, style) => {
                          if (!canEditProject) return;
                          const component = state.components.find(
                            (c) => c.id === id,
                          );
                          if (component) {
                            updateComponent(id, {
                              style: { ...component.style, ...style },
                            });
                          }
                        }}
                        onUpdateLayout={(id, layout) => {
                          if (!canEditProject) return;
                          const component = state.components.find(
                            (c) => c.id === id,
                          );
                          if (component) {
                            const newStyle: Record<string, any> = {
                              ...component.style,
                            };
                            if (layout.width)
                              newStyle.width = `${layout.width}px`;
                            if (layout.height)
                              newStyle.height = `${layout.height}px`;

                            const newPosition = { ...component.position };
                            if (layout.x !== undefined)
                              newPosition.x = layout.x;
                            if (layout.y !== undefined)
                              newPosition.y = layout.y;

                            updateComponent(id, {
                              style: newStyle,
                              position: newPosition as { x: number; y: number },
                            });
                          }
                        }}
                        canvasBackgroundColor={state.canvasBackgroundColor}
                        showCanvasGrid={state.showCanvasGrid}
                        onUpdateCanvasBackground={
                          canEditProject ? updateCanvasBackground : undefined
                        }
                        onToggleCanvasGrid={
                          canEditProject ? toggleCanvasGrid : undefined
                        }
                        userProjectConfig={state.userProjectConfig}
                        onUpdateUserProjectConfig={
                          canEditProject
                            ? editor.updateUserProjectConfig
                            : undefined
                        }
                      />
                    )}

                    {state.rightSidebarTab === "ai-assistant" && (
                      <RightSidebar
                        selectedComponent={selectedComponentObject}
                        onUpdateComponent={
                          canEditProject ? updateComponent : () => { }
                        }
                        propertiesPanelVisible={false}
                        onToggleProperties={togglePropertiesPanel}
                        aiAssistantVisible={true}
                        onToggleAIAssistant={toggleAIAssistant}
                        canvasProperties={{
                          backgroundColor: state.canvasBackgroundColor,
                          showGrid: state.showCanvasGrid,
                        }}
                        onUpdateCanvasProperties={(updates) => {
                          if (!canEditProject) return;
                          if (updates.backgroundColor)
                            updateCanvasBackground(updates.backgroundColor);
                          if (updates.showGrid !== undefined)
                            toggleCanvasGrid(updates.showGrid);
                        }}
                        pages={state.pages}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <EditorFooter
            componentsCount={state.components.length}
            editorMode={state.editorMode}
            lastSaved={state.lastSaved}
            canvasZoom={state.canvasZoom}
          />

          {state.showPreview && (
            <PreviewModal
              components={state.components}
              onClose={togglePreview}
              activePageId={state.activePageId}
              pages={state.pages}
              userProjectConfig={state.userProjectConfig}
              currentUser={state.currentUser}
            />
          )}

          {state.showTemplates && (
            <TemplateModal
              onSelectTemplate={loadTemplate}
              onClose={toggleTemplates}
            />
          )}

          <MobilePropertiesModal
            selectedComponent={selectedComponentObject}
            onUpdateComponent={canEditProject ? updateComponent : () => { }}
            isOpen={state.showMobileProperties}
            onClose={() =>
              setState((prev) => ({ ...prev, showMobileProperties: false }))
            }
          />

          {state.showShareModal && (
            <ShareModal
              components={state.components}
              isOpen={state.showShareModal}
              onClose={toggleShareModal}
            />
          )}



          {state.showAIAssistantModal && (
            <RightSidebar
              selectedComponent={selectedComponentObject}
              onUpdateComponent={canEditProject ? updateComponent : () => { }}
              propertiesPanelVisible={false}
              onToggleProperties={() => { }}
              aiAssistantVisible={true}
              onToggleAIAssistant={toggleAIAssistant}
              pages={state.pages}
            />
          )}

          {/* Export Confirmation Dialog */}
          <Dialog
            open={showExportConfirmDialog}
            onOpenChange={(open) => {
              setShowExportConfirmDialog(open)
              if (!open) setPendingExportComponent(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish to Community?</DialogTitle>
                <DialogDescription>
                  Share "{pendingExportComponent?.name || 'this component'}" with the community? Other users will be able to import and use it.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowExportConfirmDialog(false)
                    setPendingExportComponent(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExportComponent}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Publish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {showCodeExportModal && (
            <CodeExportModal
              components={state.components}
              customComponents={state.customComponents || []}
              projectName={state.projectName}
              pages={state.pages}
              activePageId={state.activePageId}
              userConfig={{
                paymongoKey: state.userProjectConfig?.paymongoKey,
                resendApiKey: state.userProjectConfig?.resendApiKey,
                supabaseUrl: state.userProjectConfig?.supabaseUrl || undefined,
                supabaseKey: state.userProjectConfig?.supabaseKey || undefined,
                supabaseServiceKey: state.userProjectConfig?.supabaseServiceKey || undefined,
              }}
              fileOverrides={state.fileOverrides || {}}
              customFiles={state.customFiles || {}}
              onClose={() => setShowCodeExportModal(false)}
            />
          )}

          <GettingStartedGuideDialog
            open={showGettingStartedGuideDialog}
            onOpenChange={setShowGettingStartedGuideDialog}
            userId={state.currentUser?.id}
            refreshKey={guideRefreshKey}
            onStartBuildXIntroduction={() => {
              setShowGettingStartedGuideDialog(false);
              localStorage.setItem("buildx-pending-buildx-introduction-tour", "1");
              editor.goToDashboard();
            }}
            onStartWebsiteCreation={() => {
              setShowGettingStartedGuideDialog(false);
              onStartTour?.();
            }}
            onStartPublishingBasics={() => {
              setShowGettingStartedGuideDialog(false);
              setShowPublishingBasicsTour(true);
            }}
            onStartDashboardOverview={() => {
              setShowGettingStartedGuideDialog(false);
              localStorage.setItem("buildx-pending-dashboard-overview-tour", "1");
              editor.goToDashboard();
            }}
            onStartCanvasArea={() => {
              setShowGettingStartedGuideDialog(false);
              setShowCanvasAreaTour(true);
            }}
            onStartPropertiesPanel={() => {
              setShowGettingStartedGuideDialog(false);
              setShowPropertiesPanelTour(true);
            }}
            onStartAIAssistant={() => {
              setShowGettingStartedGuideDialog(false);
              setShowAIAssistantTour(true);
            }}
            onStartCodeEditor={() => {
              setShowGettingStartedGuideDialog(false);
              setShowCodeEditorTour(true);
            }}
            onStartSavingCollaboration={() => {
              setShowGettingStartedGuideDialog(false);
              setShowSavingCollaborationTour(true);
            }}
            onStartNavigatingProjects={() => {
              setShowGettingStartedGuideDialog(false);
              localStorage.setItem("buildx-pending-navigating-projects-tour", "1");
              editor.goToDashboard();
            }}
            onStartTemplateInteraction={() => {
              setShowGettingStartedGuideDialog(false);
              localStorage.setItem("buildx-pending-template-interaction-tour", "1");
              editor.goToDashboard();
            }}
            onStartComponentsLibrary={() => {
              setShowGettingStartedGuideDialog(false);
              localStorage.setItem("buildx-pending-components-library-tour", "1");
              editor.goToDashboard();
            }}
            onStartBlocksPalette={() => {
              setShowGettingStartedGuideDialog(false);
              setShowBlocksPaletteTour(true);
            }}
            onStartLayersPanel={() => {
              setShowGettingStartedGuideDialog(false);
              setShowLayersPanelTour(true);
            }}
            onStartMultiPageManagement={() => {
              setShowGettingStartedGuideDialog(false);
              setShowMultiPageTour(true);
            }}
            onStartPublishTemplate={() => {
              setShowGettingStartedGuideDialog(false);
              setShowPublishTemplateTour(true);
            }}
            onStartPreviewMode={() => {
              setShowGettingStartedGuideDialog(false);
              setShowPreviewModeTour(true);
            }}
            onStartCustomComponents={() => {
              setShowGettingStartedGuideDialog(false);
              setShowCustomComponentsTour(true);
            }}
            onStartExportFiles={() => {
              setShowGettingStartedGuideDialog(false);
              setShowExportFilesTour(true);
            }}
          />

          {showCongratsModal && (
            <Dialog open={showCongratsModal} onOpenChange={setShowCongratsModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>🎉 Congratulations!</DialogTitle>
                  <DialogDescription>
                    You've completed all 19 tutorial steps. You're now a BuildX master!
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    className="w-full bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                    onClick={() => setShowCongratsModal(false)}
                  >
                    Start Building
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {showBlocksPaletteTour && (
            <BlocksPaletteTour
              showOnMount={true}
              onComplete={() => {
                setShowBlocksPaletteTour(false);
                markStepComplete(state.currentUser?.id || "", "blocks-palette").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showLayersPanelTour && (
            <LayersPanelTour
              showOnMount={true}
              onComplete={() => {
                setShowLayersPanelTour(false);
                markStepComplete(state.currentUser?.id || "", "layers-panel").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showMultiPageTour && (
            <MultiPageTour
              showOnMount={true}
              onComplete={() => {
                setShowMultiPageTour(false);
                markStepComplete(state.currentUser?.id || "", "multi-page").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showPublishTemplateTour && (
            <PublishTemplateTour
              showOnMount={true}
              onComplete={() => {
                setShowPublishTemplateTour(false);
                markStepComplete(state.currentUser?.id || "", "publish-template").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showPreviewModeTour && (
            <PreviewModeTour
              showOnMount={true}
              onComplete={() => {
                setShowPreviewModeTour(false);
                markStepComplete(state.currentUser?.id || "", "preview-mode").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showCustomComponentsTour && (
            <CustomComponentsTour
              showOnMount={true}
              onComplete={() => {
                setShowCustomComponentsTour(false);
                markStepComplete(state.currentUser?.id || "", "custom-components").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showExportFilesTour && (
            <ExportFilesTour
              showOnMount={true}
              onComplete={() => {
                setShowExportFilesTour(false);
                markStepComplete(state.currentUser?.id || "", "export-files").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}


          {showPublishingBasicsTour && (
            <PublishingBasics
              showOnMount={true}
              onComplete={() => {
                setShowPublishingBasicsTour(false);
                markStepComplete(state.currentUser?.id || "", "publishing").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showCanvasAreaTour && (
            <CanvasAreaTour
              showOnMount={true}
              onComplete={() => {
                setShowCanvasAreaTour(false);
                markStepComplete(state.currentUser?.id || "", "canvas").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showPropertiesPanelTour && (
            <PropertiesPanelTour
              showOnMount={true}
              onComplete={() => {
                setShowPropertiesPanelTour(false);
                markStepComplete(state.currentUser?.id || "", "properties").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showAIAssistantTour && (
            <AIAssistantTour
              showOnMount={true}
              onComplete={() => {
                setShowAIAssistantTour(false);
                markStepComplete(state.currentUser?.id || "", "ai").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showCodeEditorTour && (
            <CodeEditorTour
              showOnMount={true}
              onComplete={() => {
                setShowCodeEditorTour(false);
                markStepComplete(state.currentUser?.id || "", "code").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}

          {showSavingCollaborationTour && (
            <SavingCollaboration
              showOnMount={true}
              onComplete={() => {
                setShowSavingCollaborationTour(false);
                markStepComplete(state.currentUser?.id || "", "collab").then(() => {
                  window.dispatchEvent(new Event("buildx-tutorial-step-completed"));
                  checkAllStepsComplete();
                });
              }}
            />
          )}


          <Toaster />
        </div>
      </TooltipProvider>
    </DndProvider>
  );
}
