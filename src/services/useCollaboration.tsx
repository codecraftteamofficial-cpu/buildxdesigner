"use client";

import type React from "react";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { getSupabaseSession } from "../supabase/auth/authService";
import {
  saveProject,
  fetchProjectById,
  fetchProjectComponents,
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
  const isHydratingRef = useRef(false);

  useEffect(() => {
    const { yComponents } = getOrInitDoc();
    const handleYComponentsChange = () => {
      const components = yComponents.toArray();
      const isLocalChanges = consumeLocalChangeFlag();
      if (isHydratingRef.current) return;
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

    (async () => {
      const { data: projectData, error: projectError } =
        await fetchProjectById(activeProjectId);

      if (projectError || !projectData) {
        isHydratingRef.current = false;
        return;
      }
      const { data: componentsData } =
        await fetchProjectComponents(activeProjectId);

      const loadedProject =
        componentsData && componentsData.length > 0
          ? componentsData
          : ((projectData.project_layout as any[]) ?? []);

      replaceComponents(loadedProject, false);
      hydratedProjectRef.current = activeProjectId;

      setState((prev) => ({
        ...prev,
        projectName:
          (projectData as any).project_name ??
          (projectData as any).name ??
          prev.projectName,
        components: loadedProject,
      }));

      isHydratingRef.current = false;
    })();
  }, [state.currentView, activeProjectId, replaceComponents, setState]);

  useEffect(() => {
    if (state.currentView !== "editor" || !ablyKey) return;
    if (!state.currentProjectId) return;
    if (!ablyKey) return;

    const { ydoc, awareness } = getOrInitDoc();
    const cleanup = initializeCollaborationTransport(
      ydoc,
      awareness,
      state.currentProjectId,
      ablyKey,
    );

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [state.currentView, state.currentProjectId, ablyKey, getOrInitDoc]);

  useEffect(() => {
    if (!state.hasUnsavedChanges || state.currentView !== "editor") {
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

        if (user_id) {
          const { yComponents } = getOrInitDoc();
          const currentComponents = yComponents.toArray();

          await saveProject({
            id: state.currentProjectId,
            name: state.projectName || "Untitled Project",
            user_id,
            project_layout: currentComponents,
          });
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
