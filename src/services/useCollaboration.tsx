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
import { initializeCollaborationDoc } from "./CollaborationDoc";
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

  const initCollaborationDoc = useRef(
    initializeCollaborationDoc(setState),
  ).current;

  const {
    getOrInitDoc,
    replaceComponents,
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
    const { yComponents } = getOrInitDoc();
    const handleYComponentsChange = () => {
      const components = yComponents.toArray();
      const isLocalChanges = consumeLocalChangeFlag();
      if (isHydratingRef.current && components.length === 0) return;
      setState((prev) => ({
        ...prev,
        components: components,
        hasUnsavedChanges: isLocalChanges ? true : prev.hasUnsavedChanges,
      }));
    };
    yComponents.observe(handleYComponentsChange);
    handleYComponentsChange();

    return () => {
      yComponents.unobserve(handleYComponentsChange);
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
        const { yComponents } = getOrInitDoc();

        if (yComponents.length > 0) {
          hydratedProjectRef.current = activeProjectId;
          setState((prev) => ({
            ...prev,
            components: yComponents.toArray(),
            hasUnsavedChanges: false,
          }));
          return;
        }

        const [
          { data: projectData, error: projectError },
          { data: componentsData },
        ] = await Promise.all([
          fetchProjectById(activeProjectId),
          fetchProjectComponents(activeProjectId),
        ]);

        if (cancelled) return;
        const loadedProject =
          componentsData && componentsData.length > 0
            ? componentsData
            : ((projectData?.project_layout as any[]) ?? []);

        const canHydrateFromDatabase =
          loadedProject.length > 0 || !projectError;
        if (!canHydrateFromDatabase) {
          return;
        }

        const hasRemoteOrLocalData = yComponents.length > 0;
        if (!hasRemoteOrLocalData) {
          replaceComponents(loadedProject, false);
        }

        const finalComponents = yComponents.toArray();
        hydratedProjectRef.current = activeProjectId;

        setState((prev) => ({
          ...prev,
          projectName:
            (projectData as any)?.project_name ??
            (projectData as any)?.name ??
            prev.projectName,
          components: finalComponents,
          hasUnsavedChanges: false,
        }));
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
    state.hasUnsavedChanges,
    state.isSaving,
  ]);

  return {
    getOrInitDoc,
    replaceComponents,
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
