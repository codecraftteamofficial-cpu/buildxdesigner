"use client";

import type React from "react";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import Ably from "ably";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness.js";
import * as Y from "yjs";
import { getSupabaseSession } from "../supabase/auth/authService";
import { supabase, SupabaseSession } from "../supabase/config/supabaseClient";
import {
  saveProject,
  fetchProjectById,
  fetchProjectComponents,
} from "../supabase/data/projectService";
import type { ComponentData, EditorState } from "../types/editor";

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
};

function useCollaborationLogic({
  projectId,
  setState,
  children,
  currentProjectId,
  state,
}: UseCollaborationProps) {
  const currentUser = state.currentUser;
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<SupabaseSession | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const yComponentsRef = useRef<Y.Array<ComponentData> | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const localChangeRef = useRef(false);
  const clientIdRef = useRef<string | null>(null);
  const userColorRef = useRef<string | null>(null);
  const cursorPosRef = useRef({ x: 0, y: 0 });

  const [remoteCursors, setRemoteCursors] = useState<
    Map<string, { clientId: string; user: any; x: number; y: number }>
  >(new Map());

  const ablyKey = import.meta.env.VITE_ABLY_KEY as string | undefined;

  const encodeUpdate = (update: Uint8Array) =>
    btoa(String.fromCharCode(...Array.from(update)));

  const decodeUpdate = (data: string) =>
    Uint8Array.from(atob(data), (char) => char.charCodeAt(0));

  const getOrInitDoc = () => {
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
      yComponentsRef.current =
        ydocRef.current.getArray<ComponentData>("components");
      awarenessRef.current = new Awareness(ydocRef.current);
    }
    return {
      ydoc: ydocRef.current,
      yComponents: yComponentsRef.current!,
      awareness: awarenessRef.current!,
    };
  };

  const replaceComponents = (components: ComponentData[], markLocal = true) => {
    const { yComponents } = getOrInitDoc();
    if (markLocal) {
      localChangeRef.current = true;
    }
    yComponents.delete(0, yComponents.length);
    if (components.length > 0) {
      yComponents.push(components);
    }
  };

  useEffect(() => {
    const { yComponents } = getOrInitDoc();

    const handleYComponentsChange = () => {
      const isLocal = localChangeRef.current;
      localChangeRef.current = false;
      const nextComponents = yComponents.toArray();

      setState((prev) => ({
        ...prev,
        components: nextComponents,
        hasUnsavedChanges: isLocal ? true : prev.hasUnsavedChanges,
      }));
    };

    yComponents.observe(handleYComponentsChange);
    handleYComponentsChange();

    return () => {
      yComponents.unobserve(handleYComponentsChange);
    };
  }, [setState]);

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
    const shouldLoad =
      state.currentView === "editor" && !!state.currentProjectId;
    if (!shouldLoad) return;
    if (state.components.length > 0) return;
    (async () => {
      const { data: projectData, error: projectError } = await fetchProjectById(
        state.currentProjectId!,
      );

      if (!projectError && projectData) {
        const { data: componentsData } = await fetchProjectComponents(
          state.currentProjectId!,
        );

        const loadedComponents =
          componentsData && componentsData.length > 0
            ? componentsData
            : (projectData.project_layout as any[]) || [];

        replaceComponents(loadedComponents, false);
        setState((prev) => ({
          ...prev,
          projectName: projectData.name || prev.projectName,
        }));
      }
    })();
  }, [state.currentView, state.currentProjectId]);

  useEffect(() => {
    const { ydoc, awareness } = getOrInitDoc();
    const roomId = state.currentProjectId;

    if (!ablyKey || !roomId || state.currentView !== "editor") {
      return;
    }

    if (!clientIdRef.current) {
      clientIdRef.current = `anon-${Math.random().toString(36).slice(2, 10)}`;
    }

    const client = new Ably.Realtime({
      key: ablyKey,
      clientId: clientIdRef.current,
    });
    const channel = client.channels.get(`collab:${roomId}`);

    let updateTimeout: NodeJS.Timeout | null = null;
    let pendingUpdates: Uint8Array[] = [];

    const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      pendingUpdates.push(update);
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (pendingUpdates.length > 0) {
          const merged = Y.encodeStateAsUpdate(ydoc);
          channel.publish("yjs-update", encodeUpdate(merged));
          pendingUpdates = [];
        }
      }, 30);
    };

    const handleRemoteUpdate = (message: { data: string }) => {
      if (!message?.data) return;
      const update = decodeUpdate(String(message.data));
      Y.applyUpdate(ydoc, update, "remote");
    };

    const handleSyncRequest = () => {
      const fullUpdate = Y.encodeStateAsUpdate(ydoc);
      channel.publish("yjs-sync", encodeUpdate(fullUpdate));
    };

    let awarenessTimeout: NodeJS.Timeout | null = null;

    const handleAwarenessUpdate = ({
      added,
      updated,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      if (awarenessTimeout) clearTimeout(awarenessTimeout);
      awarenessTimeout = setTimeout(() => {
        const changed = added.concat(updated, removed);
        if (changed.length > 0) {
          const update = encodeAwarenessUpdate(awareness, changed);
          channel.publish("yjs-awareness", encodeUpdate(update));
        }
      }, 20);
    };

    const handleRemoteAwareness = (message: { data: string }) => {
      if (!message?.data) return;
      const update = decodeUpdate(String(message.data));
      applyAwarenessUpdate(awareness, update, "remote");
    };

    ydoc.on("update", handleDocUpdate);
    awareness.on("update", handleAwarenessUpdate);

    channel.subscribe("yjs-update", handleRemoteUpdate as any);
    channel.subscribe("yjs-sync", handleRemoteUpdate as any);
    channel.subscribe("yjs-request-sync", handleSyncRequest as any);
    channel.subscribe("yjs-awareness", handleRemoteAwareness as any);

    channel.publish("yjs-request-sync", { clientId: clientIdRef.current });

    return () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      if (awarenessTimeout) clearTimeout(awarenessTimeout);
      channel.unsubscribe("yjs-update", handleRemoteUpdate as any);
      channel.unsubscribe("yjs-sync", handleRemoteUpdate as any);
      channel.unsubscribe("yjs-request-sync", handleSyncRequest as any);
      channel.unsubscribe("yjs-awareness", handleRemoteAwareness as any);
      ydoc.off("update", handleDocUpdate);
      awareness.off("update", handleAwarenessUpdate);
      channel.detach();
      client.close();
    };
  }, [ablyKey, state.currentProjectId, state.currentView]);

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
    state.hasUnsavedChanges,
    state.currentView,
    state.currentProjectId,
    state.projectName,
  ]);

  const addComponent = (component: ComponentData) => {
    const { yComponents } = getOrInitDoc();
    localChangeRef.current = true;
    const newComponent = {
      ...component,
      id: component.id || Date.now().toString(),
      position: component.position || { x: 150, y: 150 },
    };
    yComponents.push([newComponent]);
  };

  const updateComponent = (id: string, updates: Partial<ComponentData>) => {
    const { yComponents } = getOrInitDoc();
    const index = yComponents.toArray().findIndex((comp) => comp.id === id);
    if (index === -1) return;
    localChangeRef.current = true;
    const existing = yComponents.get(index) as ComponentData;
    const updated = {
      ...existing,
      ...updates,
      props: updates.props
        ? { ...existing.props, ...updates.props }
        : existing.props,
      style: updates.style
        ? { ...existing.style, ...updates.style }
        : existing.style,
      position: updates.position
        ? { ...existing.position, ...updates.position }
        : existing.position,
    };
    yComponents.delete(index, 1);
    yComponents.insert(index, [updated]);
  };

  const deleteComponent = (id: string) => {
    const { yComponents } = getOrInitDoc();
    const index = yComponents.toArray().findIndex((comp) => comp.id === id);
    if (index === -1) return;
    localChangeRef.current = true;
    yComponents.delete(index, 1);
    setState((prev) => ({
      ...prev,
      selectedComponent:
        prev.selectedComponent === id ? null : prev.selectedComponent,
    }));
  };

  const selectComponent = (component: ComponentData | null) => {
    setState((prev) => ({
      ...prev,
      selectedComponent: component ? component.id : null,
      showMobileProperties: component !== null && window.innerWidth < 768,
    }));
  };

  const reorderComponent = (dragId: string, dropId: string) => {
    const { yComponents } = getOrInitDoc();
    const components = yComponents.toArray();
    const dragIndex = components.findIndex((c) => c.id === dragId);
    const dropIndex = components.findIndex((c) => c.id === dropId);

    if (dragIndex === -1 || dropIndex === -1) return;

    localChangeRef.current = true;
    const [dragged] = components.splice(dragIndex, 1);
    components.splice(dropIndex, 0, dragged);
    yComponents.delete(0, yComponents.length);
    yComponents.push(components);
  };

  const clearCanvas = () => {
    replaceComponents([]);
    setState((prev) => ({
      ...prev,
      selectedComponent: null,
    }));
  };

  return {
    children,
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
  children,
  projectId,
  setState,
  state,
  currentProjectId,
}: UseCollaborationProps & { children: React.ReactNode }) {
  const Collaboration = useCollaborationLogic({
    projectId,
    setState,
    state,
    currentProjectId,
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
