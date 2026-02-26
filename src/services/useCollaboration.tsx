"use client";

import type React from "react";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { getSupabaseSession } from "../supabase/auth/authService";
import {
  saveProject,
  fetchProjectById,
  fetchProjectComponents,
  syncProjectComponents,
} from "../supabase/data/projectService";
import type { ComponentData, EditorState } from "../types/editor";
import { useCollaborationDoc } from "./CollaborationDoc";
import { initializeCollaborationTransport } from "./CollaborationTransport";

type CollaborationContextType = ReturnType<typeof useCollaborationLogic>;
const CollaborationContext = createContext<CollaborationContextType | null>(
  null,
);

type UseCollaborationProps = {
  projectId: string;
  children?: React.ReactNode;
  setState: React.Dispatch<React.SetStateAction<EditorState>>;
  state: EditorState;
  currentProjectId: string | null;
  projectSubdomain: string | undefined;
  projectIsPublished: boolean | undefined;
  projectLastPublishedAt: string | undefined;
};

function useCollaborationLogic({
  setState,
  children,
  state,
  currentProjectId,
  projectId,
}: UseCollaborationProps) {
  const currentUser = state.currentUser;
  const clientIdRef = useRef<string | null>(null);
  const userColorRef = useRef<string | null>(null);
  const cursorPosRef = useRef({ x: 0, y: 0 });

  const initCollaborationDoc = useCollaborationDoc(setState);

  const {
    getOrInitDoc,
    replaceComponents,
    replacePages,
    addComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    reorderComponent,
    clearCanvas,
    consumeLocalChangeFlag,
  } = initCollaborationDoc;

  const [remoteCursors, setRemoteCursors] = useState<
    Map<string, { clientId: string; user: any; x: number; y: number }>
  >(new Map());

  const ablyKey = import.meta.env.VITE_ABLY_KEY as string | undefined;
  const activeProjectId = currentProjectId ?? state.currentProjectId ?? null;
  const hydratedProjectRef = useRef<string | null>(null);
  const docProjectIdRef = useRef<string | null>(null);
  const isHydratingRef = useRef(false);

  useEffect(() => {
    if (state.currentView !== "editor") {
      hydratedProjectRef.current = null;
    }
  }, [state.currentView]);

  useEffect(() => {
    if (state.currentView !== "editor") return;
    if (!activeProjectId) return;

    if (
      docProjectIdRef.current &&
      docProjectIdRef.current !== activeProjectId
    ) {
      replaceComponents([], false);
      hydratedProjectRef.current = null;
    }

    docProjectIdRef.current = activeProjectId;
  }, [state.currentView, activeProjectId, replaceComponents]);

  useEffect(() => {
    const { yComponents, yPages } = getOrInitDoc();

    const handleYComponentsChange = () => {
      const allComponents = yComponents.toArray();
      const uniqueComponents: ComponentData[] = [];
      const seenIds = new Set<string>();
      const duplicateIndices: number[] = [];

      for (let i = 0; i < allComponents.length; i++) {
        const comp = allComponents[i];
        if (!seenIds.has(comp.id)) {
          uniqueComponents.push(comp);
          seenIds.add(comp.id);
        } else {
          duplicateIndices.push(i);
        }
      }

      if (duplicateIndices.length > 0) {
        console.warn(`Detected ${duplicateIndices.length} duplicate components in Yjs. Cleaning up...`);
        yComponents.doc?.transact(() => {
          for (let i = duplicateIndices.length - 1; i >= 0; i--) {
            yComponents.delete(duplicateIndices[i], 1);
          }
        });
        return;
      }

      const isLocalChanges = consumeLocalChangeFlag();
      if (isHydratingRef.current && uniqueComponents.length === 0) return;
      setState((prev) => ({
        ...prev,
        components: uniqueComponents,
        hasUnsavedChanges: isLocalChanges ? true : prev.hasUnsavedChanges,
      }));
    };

    const handleYPagesChange = () => {
      const allPages = yPages.toArray();
      const uniquePages: any[] = [];
      const seenIds = new Set<string>();
      const duplicateIndices: number[] = [];

      for (let i = 0; i < allPages.length; i++) {
        const p = allPages[i];
        if (!seenIds.has(p.id)) {
          uniquePages.push(p);
          seenIds.add(p.id);
        } else {
          duplicateIndices.push(i);
        }
      }

      if (duplicateIndices.length > 0) {
        console.warn(`Detected ${duplicateIndices.length} duplicate pages in Yjs. Cleaning up...`);
        yPages.doc?.transact(() => {
          for (let i = duplicateIndices.length - 1; i >= 0; i--) {
            yPages.delete(duplicateIndices[i], 1);
          }
        });
        return;
      }

      if (isHydratingRef.current && uniquePages.length === 0) return;
      setState((prev) => ({
        ...prev,
        pages: uniquePages.length > 0 ? uniquePages : prev.pages,
      }));
    };

    yComponents.observe(handleYComponentsChange);
    yPages.observe(handleYPagesChange);

    handleYComponentsChange();
    handleYPagesChange();

    return () => {
      yComponents.unobserve(handleYComponentsChange);
      yPages.unobserve(handleYPagesChange);
    };
  }, [getOrInitDoc, setState]);

  useEffect(() => {
    const { awareness } = getOrInitDoc();

    if (!clientIdRef.current) {
      clientIdRef.current = `anon-${Math.random().toString(36).slice(2, 10)}`;
    }

    if (!userColorRef.current) {
      const colors = [
        "#ef4444",
        "#f59e0b",
        "#10b981",
        "#3b82f6",
        "#6366f1",
        "#ec4899",
      ];
      userColorRef.current = colors[Math.floor(Math.random() * colors.length)];
    }

    awareness.setLocalStateField("user", {
      id: currentUser?.id ?? clientIdRef.current,
      name: currentUser?.name ?? currentUser?.email ?? "Guest",
      color: userColorRef.current,
    });
  }, [currentUser]);

  const handleCanvasMouseMove = (e: MouseEvent) => {
    const { awareness } = getOrInitDoc();
    awareness.setLocalStateField("cursor", {
      x: e.clientX,
      y: e.clientY,
    });
  };

  useEffect(() => {
    const { awareness } = getOrInitDoc();

    const handleAwarenessChange = () => {
      const newCursors = new Map<string, any>();

      awareness.getStates().forEach((state: any, clientId: number) => {
        if (clientId === awareness.clientID) return;
        if (state.user && state.cursor) {
          newCursors.set(String(clientId), {
            clientId: String(clientId),
            user: state.user,
            x: state.cursor.x,
            y: state.cursor.y,
          });
        }
      });

      setRemoteCursors(newCursors);
    };

    awareness.on("change", handleAwarenessChange);
    document.addEventListener("mousemove", handleCanvasMouseMove);

    return () => {
      awareness.off("change", handleAwarenessChange);
      document.removeEventListener("mousemove", handleCanvasMouseMove);
    };
  }, []);

  useEffect(() => {
    if (state.currentView !== "editor") return;
    if (!activeProjectId) return;
    if (hydratedProjectRef.current === activeProjectId) return;

    let cancelled = false;
    isHydratingRef.current = true;

    (async () => {
      try {
        const { yComponents, yPages } = getOrInitDoc();

        const [
          { data: projectData, error: projectError },
          { data: componentsData },
        ] = await Promise.all([
          fetchProjectById(activeProjectId),
          fetchProjectComponents(activeProjectId),
        ]);

        if (cancelled) return;

        // Always set basic metadata regardless of Yjs state
        if (projectData) {
          setState((prev) => ({
            ...prev,
            projectName: projectData.name || prev.projectName,
            siteTitle: projectData.siteTitle || prev.siteTitle,
            siteLogoUrl: projectData.siteLogoUrl || prev.siteLogoUrl,
            projectSubdomain: projectData.subdomain || prev.projectSubdomain,
            projectIsPublished: projectData.isPublished || prev.projectIsPublished,
            projectLastPublishedAt: projectData.lastPublishedAt || prev.projectLastPublishedAt,
          }));
        }

        const loadedProject =
          componentsData && componentsData.length > 0
            ? componentsData
            : ((projectData?.project_layout as any[]) ?? []);

        const canHydrateFromDatabase =
          loadedProject.length > 0 || !projectError;

        if (canHydrateFromDatabase) {
          // Hydrate components if Yjs is empty
          if (yComponents.length === 0) {
            replaceComponents(loadedProject, false);
          }

          // Hydrate pages if Yjs is empty
          if (yPages.length === 0 && projectData?.pages) {
            replacePages(projectData.pages, false);
          }
        }

        hydratedProjectRef.current = activeProjectId;

        setState((prev) => {
          const allComponents = yComponents.toArray();
          const uniqueComponents: ComponentData[] = [];
          const seenCompIds = new Set<string>();
          allComponents.forEach(c => {
            if (!seenCompIds.has(c.id)) {
              uniqueComponents.push(c);
              seenCompIds.add(c.id);
            }
          });

          const allPages = yPages.toArray();
          const uniquePages: any[] = [];
          const seenPageIds = new Set<string>();
          // Combine yPages with projectData.pages if yPages is still getting synced
          const combinedPages = allPages.length > 0 ? allPages : (projectData?.pages || prev.pages);
          combinedPages.forEach((p: any) => {
            if (!seenPageIds.has(p.id)) {
              uniquePages.push(p);
              seenPageIds.add(p.id);
            }
          });

          return {
            ...prev,
            components: uniqueComponents,
            pages: uniquePages,
            hasUnsavedChanges: false,
          };
        });
      } finally {
        if (!cancelled) {
          const { yComponents } = getOrInitDoc();
          setState((prev) => ({
            ...prev,
            components: yComponents.toArray(),
          }));
          isHydratingRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
      isHydratingRef.current = false;
    };
  }, [
    state.currentView,
    state.currentUser?.id,
    activeProjectId,
    replaceComponents,
    setState,
  ]);

  useEffect(() => {
    if (state.currentView !== "editor" || !ablyKey) return;
    if (!activeProjectId) return;

    const { ydoc, awareness } = getOrInitDoc();
    const cleanup = initializeCollaborationTransport(
      ydoc,
      awareness,
      activeProjectId,
      ablyKey,
    );

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [state.currentView, activeProjectId, ablyKey, getOrInitDoc]);

  useEffect(() => {
    if (
      !state.hasUnsavedChanges ||
      state.currentView !== "editor" ||
      state.isSaving
    ) {
      return;
    }

    const autoSaveTimer = setTimeout(async () => {
      if (!state.currentProjectId) return;

      setState((prev) => ({ ...prev, isSaving: true }));

      try {
        const {
          data: { session },
        } = await getSupabaseSession();
        const user_id = session?.user?.id;
        let persisted = false;

        const { yComponents } = getOrInitDoc();
        const currentComponents = yComponents.toArray();

        if (user_id) {
          const { error: saveError } = await saveProject({
            id: state.currentProjectId,
            name: state.projectName || "Untitled Project",
            user_id,
            project_layout: currentComponents,
            pages: state.pages,
            siteTitle: state.siteTitle,
            siteLogoUrl: state.siteLogoUrl,
          });

          persisted = !saveError;
          if (saveError) {
            console.warn(
              "Project save failed, trying component sync:",
              saveError,
            );
          }
        }

        if (persisted) {
          const { error: syncAfterSaveError } = await syncProjectComponents(
            currentComponents,
            state.currentProjectId,
          );

          if (syncAfterSaveError) {
            console.warn(
              "Component sync after project save failed:",
              syncAfterSaveError,
            );
          }
        }

        if (!persisted) {
          const { error: syncError } = await syncProjectComponents(
            currentComponents,
            state.currentProjectId,
          );

          persisted = !syncError;
          if (syncError) {
            throw syncError;
          }
        }

        if (!persisted) {
          setState((prev) => ({ ...prev, isSaving: false }));
          return;
        }

        setState((prev) => ({
          ...prev,
          isSaving: false,
          hasUnsavedChanges: false,
          lastSaved: new Date(),
        }));
      } catch (error) {
        console.error("Auto-save error:", error);
        setState((prev) => ({ ...prev, isSaving: false }));
      }
    }, 2000);

    return () => clearTimeout(autoSaveTimer);
  }, [
    state.components,
    state.currentView,
    state.currentProjectId,
    state.projectName,
    state.pages,
    state.siteTitle,
    state.siteLogoUrl,
    state.hasUnsavedChanges,
    state.isSaving,
  ]);

  return {
    getOrInitDoc,
    replaceComponents,
    replacePages,
    addComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    reorderComponent,
    clearCanvas,
    remoteCursors,
  };
}

export function CollaborationServiceProvider({
  projectId,
  children,
  setState,
  state,
  currentProjectId,
}: UseCollaborationProps & { children: React.ReactNode }) {
  const Collaboration = useCollaborationLogic({
    projectId,
    setState,
    state,
    currentProjectId,
    projectSubdomain: undefined,
    projectIsPublished: undefined,
    projectLastPublishedAt: undefined,
  });
  return (
    <CollaborationContext.Provider value={Collaboration}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function CollaborationServiceContext() {
  const context = useContext(CollaborationContext);
  if (!context)
    throw new Error(
      "CollaborationServiceContext must be used within a CollaborationServiceProvider",
    );
  return context;
}

export default useCollaborationLogic;
