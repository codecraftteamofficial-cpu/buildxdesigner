import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { ComponentData, EditorState } from "../types/editor";
import type React from "react";
import { useRef, useEffect } from "react";

export function initializeCollaborationDoc(
  setState: React.Dispatch<React.SetStateAction<EditorState>>,
) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const yComponentsRef = useRef<Y.Array<ComponentData> | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const localChangeRef = { current: false };

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

  const consumeLocalChangeFlag = () => {
    const localChange = localChangeRef.current;
    localChangeRef.current = false;
    return localChange;
  };

  return {
    getOrInitDoc,
    replaceComponents,
    addComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    reorderComponent,
    clearCanvas,
    consumeLocalChangeFlag,
  };
}
