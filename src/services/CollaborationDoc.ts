import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { ComponentData, EditorState } from "../types/editor";
import type React from "react";
import { useRef, useEffect, useMemo, useCallback } from "react";

export function useCollaborationDoc(
  setState: React.Dispatch<React.SetStateAction<EditorState>>,
) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const yComponentsRef = useRef<Y.Array<ComponentData> | null>(null);
  const yPagesRef = useRef<Y.Array<any> | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const localChangeRef = useRef(false);
  const yMetaRef = useRef<Y.Map<any> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  const activePageIdRef = useRef<string>("home");

  const getOrInitDoc = useCallback(() => {
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
      yComponentsRef.current =
        ydocRef.current.getArray<ComponentData>("components");
      yPagesRef.current = ydocRef.current.getArray<any>("pages");
      awarenessRef.current = new Awareness(ydocRef.current);
      yMetaRef.current = ydocRef.current.getMap<any>("meta");
      undoManagerRef.current = new Y.UndoManager(
        [yComponentsRef.current!, yPagesRef.current!],
        {
          trackedOrigins: new Set([null, undefined]), // Track local changes (including default transact origin)
        },
      );

      // Attach activePageId to the undo stack item metadata
      undoManagerRef.current.on("stack-item-added", (event: any) => {
        event.stackItem.meta.set("pageId", activePageIdRef.current);
      });

      // Switch page when undoing/redoing if the change happened on a different page
      undoManagerRef.current.on("stack-item-popped", (event: any) => {
        const pageId = event.stackItem.meta.get("pageId");
        if (pageId && pageId !== activePageIdRef.current) {
          setState((prev) => {
            // Defensive: ensure the pageId actually exists in the current pages list
            if (!prev.pages.some((p) => p.id === pageId)) return prev;
            return {
              ...prev,
              activePageId: pageId,
              selectedComponent: null,
            };
          });
        }
      });
    }
    return {
      ydoc: ydocRef.current,
      yComponents: yComponentsRef.current!,
      yPages: yPagesRef.current!,
      yMeta: yMetaRef.current!,
      awareness: awarenessRef.current!,
      undoManager: undoManagerRef.current!,
    };
  }, [setState]);

  const setActivePageId = useCallback((pageId: string) => {
    activePageIdRef.current = pageId;
  }, []);

  const replaceProjectName = useCallback(
    (name: string, markLocal = true, origin?: string) => {
      const { ydoc, yMeta } = getOrInitDoc();
      if (markLocal) localChangeRef.current = true;
      ydoc.transact(() => {
        yMeta.set("projectName", name);
      }, origin);
    },
    [getOrInitDoc],
  );

  const replaceComponents = useCallback(
    (components: ComponentData[], markLocal = true, origin?: string) => {
      const { ydoc, yComponents } = getOrInitDoc();
      if (markLocal) {
        localChangeRef.current = true;
      }
      ydoc.transact(() => {
        yComponents.delete(0, yComponents.length);
        if (components.length > 0) {
          yComponents.push(components);
        }
      }, origin);
    },
    [getOrInitDoc],
  );

  const replacePages = useCallback(
    (pages: any[], markLocal = true, origin?: string) => {
      const { ydoc, yPages } = getOrInitDoc();
      if (markLocal) {
        localChangeRef.current = true;
      }
      ydoc.transact(() => {
        yPages.delete(0, yPages.length);
        if (pages.length > 0) {
          yPages.push(pages);
        }
      }, origin);
    },
    [getOrInitDoc],
  );

  const addComponent = useCallback(
    (component: ComponentData) => {
      const { ydoc, yComponents } = getOrInitDoc();
      localChangeRef.current = true;
      const newComponent = {
        ...component,
        id: component.id || Date.now().toString(),
        position: component.position ?? { x: 150, y: 150 },
      };
      ydoc.transact(() => {
        yComponents.push([newComponent]);
      });
    },
    [getOrInitDoc],
  );

  const updateComponent = useCallback(
    (id: string, updates: Partial<ComponentData>) => {
      const { ydoc, yComponents } = getOrInitDoc();
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
      ydoc.transact(() => {
        yComponents.delete(index, 1);
        yComponents.insert(index, [updated]);
      });
    },
    [getOrInitDoc],
  );

  const deleteComponent = useCallback(
    (id: string) => {
      const { ydoc, yComponents } = getOrInitDoc();
      const index = yComponents.toArray().findIndex((comp) => comp.id === id);
      if (index === -1) return;
      localChangeRef.current = true;
      ydoc.transact(() => {
        yComponents.delete(index, 1);
      });
      setState((prev) => ({
        ...prev,
        selectedComponent:
          prev.selectedComponent === id ? null : prev.selectedComponent,
      }));
    },
    [getOrInitDoc, setState],
  );

  const selectComponent = useCallback(
    (component: ComponentData | null) => {
      setState((prev) => ({
        ...prev,
        selectedComponent: component ? component.id : null,
        showMobileProperties: component !== null && window.innerWidth < 768,
      }));
    },
    [setState],
  );

  const reorderComponent = useCallback(
    (dragId: string, dropId: string) => {
      const { ydoc, yComponents } = getOrInitDoc();
      const components = yComponents.toArray();
      const dragIndex = components.findIndex((c) => c.id === dragId);
      const dropIndex = components.findIndex((c) => c.id === dropId);

      if (dragIndex === -1 || dropIndex === -1) return;

      localChangeRef.current = true;
      const [dragged] = components.splice(dragIndex, 1);
      components.splice(dropIndex, 0, dragged);
      // FIX: Same transact() fix — delete+push must be atomic
      ydoc.transact(() => {
        yComponents.delete(0, yComponents.length);
        yComponents.push(components);
      });
    },
    [getOrInitDoc],
  );

  const clearCanvas = useCallback(() => {
    replaceComponents([]);
    setState((prev) => ({
      ...prev,
      selectedComponent: null,
    }));
  }, [replaceComponents, setState]);

  const consumeLocalChangeFlag = useCallback(() => {
    const localChange = localChangeRef.current;
    localChangeRef.current = false;
    return localChange;
  }, []);

  const undo = useCallback(() => {
    const { undoManager } = getOrInitDoc();
    const item = undoManager.undo();
    if (item) {
      localChangeRef.current = true;
    }
  }, [getOrInitDoc]);

  const redo = useCallback(() => {
    const { undoManager } = getOrInitDoc();
    const item = undoManager.redo();
    if (item) {
      localChangeRef.current = true;
    }
  }, [getOrInitDoc]);

  return useMemo(
    () => ({
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
      replaceProjectName,
      setActivePageId,
      undo,
      redo,
    }),
    [
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
      replaceProjectName,
      setActivePageId,
      undo,
      redo,
    ],
  );
}
