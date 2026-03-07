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
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Canvas } from "./Canvas";
import { RemoteCursors } from "./RemoteCursors";
import { PropertiesPanel } from "./PropertiesPanel";
import { MobilePropertiesModal } from "./MobilePropertiesModal";
import { PreviewModal } from "./PreviewModal";
import { CodeExportModal } from "./CodeExportModal";
import { TemplateModal } from "./TemplateModal";
import { PublishModal } from "./PublishModal";
import { ShareModal } from "./ShareModal";
import { RightSidebar } from "./RightSidebar";
import { EditorFooter } from "./EditorFooter";
import { EditorTopBar } from "./EditorTopBar";
import { TooltipProvider } from "./ui/tooltip";
import { ResizeTooltip } from "./ResizeTooltip";
import { EditTooltip } from "./EditTooltip";
import { Toaster } from "./ui/sonner";
import { CodeViewEditor } from "./CodeViewEditor";
import type { useEditorState } from "../hooks/useEditorState";
import type { ComponentData } from "../types/editor";
import { GetOut } from "./UnexpectedEntry/UnexpectedEntry";

interface EditorLayoutProps {
  editor: ReturnType<typeof useEditorState>;
}

export function EditorLayout({ editor }: EditorLayoutProps) {
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
    toggleCodeExport,
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
  } = editor;

  const [accessCheckTimedOut, setAccessCheckTimedOut] = useState(false);

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

  // ── Layer reorder handler ─────────────────────────────────────────────────
  // Called by LayerPanel when user drags a layer to a new position.
  // Rebuilds the components array in the new order and persists it.
  const handleReorderLayers = (orderedIds: string[]) => {
    if (!canEditProject) return;
    const idToComp = new Map(state.components.map((c: ComponentData) => [c.id, c]));
    const reordered = orderedIds
      .map((id) => idToComp.get(id))
      .filter(Boolean) as ComponentData[];
    // Include any components not in orderedIds (safety net)
    const seen = new Set(orderedIds);
    const extras = state.components.filter((c: ComponentData) => !seen.has(c.id));
    const newComponents = [...reordered, ...extras];
    replaceComponents(newComponents);
    setState((prev: any) => ({
      ...prev,
      components: newComponents,
      hasUnsavedChanges: true,
    }));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <TooltipProvider>
        <div className="editor-gradient-surface h-screen flex flex-col overflow-hidden">
          {/* Editor Top Bar */}
          <EditorTopBar
            currentUser={state.currentUser}
            isSupabaseConnected={state.isSupabaseConnected}
            viewMode={state.viewMode}
            onViewModeChange={handleViewModeChange}
            onPublish={handlePublish}
            onShare={handleShare}
            onPreview={togglePreview}
            onExport={toggleCodeExport}
            onGoToDashboard={goToDashboard}
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
              setState((prev: any) => ({
                ...prev,
                projectIsPublic: isPublic,
              }));
            }}
            onTemplatePublishedChange={(published: boolean) => {
              setState((prev: any) => ({
                ...prev,
                projectTemplatePublished: published,
              }));
            }}
            pages={state.pages}
            activePageId={state.activePageId}
            onSwitchPage={editor.switchPage}
            onAddPage={canEditProject ? editor.addPage : undefined}
            onDeletePage={canEditProject ? editor.deletePage : undefined}
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
            onPublishSuccess={(subdomain: string) => {
              setState((prev: any) => ({
                ...prev,
                projectSubdomain: subdomain,
                projectIsPublished: true,
                projectLastPublishedAt: new Date().toISOString(),
              }));
            }}
          />

          <div className="flex-1 overflow-hidden flex min-h-0 relative">
            {/* Left Sidebar Toggle Button */}
            {!state.isLeftSidebarVisible && (
              <button
                onClick={() =>
                  setState((prev: any) => ({ ...prev, isLeftSidebarVisible: true }))
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-card border border-l-0 border-border p-1 rounded-r-md shadow-sm hover:bg-accent transition-colors"
                title="Show Left Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Left Sidebar */}
            <div
              className={`shrink-0 bg-card border-r border-border overflow-hidden relative transition-all duration-300 ease-in-out ${
                state.isLeftSidebarVisible ? "" : "w-0 border-r-0"
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
                      setState((prev: any) => ({
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
                      onAddComponent={canEditProject ? addComponent : () => {}}
                      components={state.components}
                      selectedId={state.selectedComponent}
                      onSelect={selectComponent}
                      onDelete={canEditProject ? deleteComponent : () => {}}
                      onReorder={canEditProject ? reorderComponent : () => {}}
                      onMoveLayer={canEditProject ? editor.moveLayer : () => {}}
                      activePageId={state.activePageId}
                      // ↓ Wire up drag-to-reorder in the layer panel
                      onReorderLayers={canEditProject ? handleReorderLayers : undefined}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Left Splitter */}
            {state.isLeftSidebarVisible && (
              <div
                className="relative shrink-0 group"
                onMouseDown={handleLeftSplitterMouseDown}
                style={{ width: "8px" }}
              >
                <div className="absolute inset-0 cursor-col-resize">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:w-1 group-hover:bg-purple-500 transition-all" />
                </div>
              </div>
            )}

            {/* Main Canvas / Code Area */}
            <div
              className={`flex-1 flex flex-col overflow-hidden bg-muted/20 ${state.isFullscreen ? "fullscreen-canvas" : ""}`}
            >
              <div className="flex-1 flex overflow-hidden justify-center items-start p-6 custom-scrollbar bg-muted/10">
                <div
                  className="bg-card shadow-2xl transition-all duration-300 ease-in-out h-full overflow-hidden border border-border rounded-lg relative"
                  style={{
                    width: state.viewMode === "design" ? "1920px" : "100%",
                    maxWidth: state.viewMode === "design" ? "1920px" : "none",
                  }}
                >
                  {state.viewMode === "design" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <Canvas
                        components={state.components}
                        selectedComponent={selectedComponentObject}
                        onSelectComponent={selectComponent}
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
                        activePageId={state.activePageId}
                        pages={state.pages}
                        userProjectConfig={state.userProjectConfig}
                        readOnly={!canEditProject}
                      />
                      <RemoteCursors
                        cursors={Array.from(remoteCursors.values())}
                        zoom={state.canvasZoom}
                      />
                    </div>
                  )}

                  {state.viewMode === "code" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-card">
                      <CodeViewEditor
                        components={state.components}
                        projectName={state.projectName}
                        pages={state.pages}
                        activePageId={state.activePageId}
                        onCodeChange={(newComponents) => {
                          if (!canEditProject) return;
                          replaceComponents(newComponents);
                          setState((prev: any) => ({
                            ...prev,
                            components: newComponents,
                            hasUnsavedChanges: true,
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Splitter */}
            {state.isRightSidebarVisible && (
              <div
                className="relative shrink-0 group"
                onMouseDown={handleRightSplitterMouseDown}
                style={{ width: "8px" }}
              >
                <div className="absolute inset-0 cursor-col-resize">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:w-1 group-hover:bg-purple-500 transition-all" />
                </div>
              </div>
            )}

            {/* Right Sidebar Toggle Button */}
            {!state.isRightSidebarVisible && (
              <button
                onClick={() =>
                  setState((prev: any) => ({ ...prev, isRightSidebarVisible: true }))
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 z-50 bg-card border border-r-0 border-border p-1 rounded-l-md shadow-sm hover:bg-accent transition-colors"
                title="Show Right Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Right Sidebar */}
            <div
              className={`shrink-0 bg-card border-l border-border overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
                state.isRightSidebarVisible ? "" : "w-0 border-l-0"
              }`}
              style={{
                width: state.isRightSidebarVisible
                  ? `${state.rightSidebarWidth}px`
                  : "0px",
              }}
            >
              {state.isRightSidebarVisible && (
                <>
                  <button
                    onClick={() =>
                      setState((prev: any) => ({
                        ...prev,
                        isRightSidebarVisible: false,
                      }))
                    }
                    className="absolute left-2 top-2 z-10 p-1 rounded-md hover:bg-accent text-muted-foreground"
                    title="Hide Sidebar"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {/* Tab Navigation */}
                  <div className="border-b p-3 shrink-0">
                    <div className="grid grid-cols-2 gap-1 bg-muted/30 p-1 rounded-lg">
                      <button
                        onClick={() =>
                          setState((prev: any) => ({
                            ...prev,
                            rightSidebarTab: "properties",
                          }))
                        }
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all ${
                          state.rightSidebarTab === "properties"
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <PanelRight className="w-3.5 h-3.5" />
                        Properties
                      </button>
                      <button
                        onClick={() =>
                          setState((prev: any) => ({
                            ...prev,
                            rightSidebarTab: "ai-assistant",
                          }))
                        }
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all ${
                          state.rightSidebarTab === "ai-assistant"
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        AI Assistant
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-hidden w-full max-w-full">
                    {state.rightSidebarTab === "properties" && (
                      <PropertiesPanel
                        pages={state.pages}
                        activePageId={state.activePageId}
                        selectedComponent={selectedComponentObject}
                        onUpdateComponent={
                          canEditProject ? updateComponent : () => {}
                        }
                        onUpdateStyle={(id, style) => {
                          if (!canEditProject) return;
                          const component = state.components.find(
                            (c: ComponentData) => c.id === id,
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
                            (c: ComponentData) => c.id === id,
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
                      />
                    )}

                    {state.rightSidebarTab === "ai-assistant" && (
                      <RightSidebar
                        selectedComponent={selectedComponentObject}
                        onUpdateComponent={
                          canEditProject ? updateComponent : () => {}
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
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Editor Footer */}
          <EditorFooter
            componentsCount={state.components.length}
            editorMode={state.editorMode}
            lastSaved={state.lastSaved}
            canvasZoom={state.canvasZoom}
          />

          {/* Modals */}
          {state.showPreview && (
            <PreviewModal
              components={state.components}
              onClose={togglePreview}
              activePageId={state.activePageId}
              pages={state.pages}
              userProjectConfig={state.userProjectConfig}
            />
          )}

          {state.showCodeExport && (
            <CodeExportModal
              components={state.exportSnapshot}
              pages={state.pages}
              projectName={state.projectName}
              activePageId={state.activePageId}
              onClose={toggleCodeExport}
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
            onUpdateComponent={canEditProject ? updateComponent : () => {}}
            isOpen={state.showMobileProperties}
            onClose={() =>
              setState((prev: any) => ({ ...prev, showMobileProperties: false }))
            }
          />

          {state.showShareModal && (
            <ShareModal
              components={state.components}
              isOpen={state.showShareModal}
              onClose={toggleShareModal}
            />
          )}

          {state.components.length > 0 && <ResizeTooltip />}
          {state.components.length > 0 && <EditTooltip />}

          {state.showAIAssistantModal && (
            <RightSidebar
              selectedComponent={selectedComponentObject}
              onUpdateComponent={canEditProject ? updateComponent : () => {}}
              propertiesPanelVisible={false}
              onToggleProperties={() => {}}
              aiAssistantVisible={true}
              onToggleAIAssistant={toggleAIAssistant}
            />
          )}

          <Toaster />
        </div>
      </TooltipProvider>
    </DndProvider>
  );
}