"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDrop } from "react-dnd";
import type { ComponentData } from "../App";
import { RenderableComponent } from "./RenderableComponent";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { Plus, Loader2 } from "lucide-react";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 20000;
const RULER_SIZE = 20;
const BASE_CANVAS_ZOOM = 100;
const MAX_CANVAS_ZOOM = 200;

interface CanvasProps {
  components: ComponentData[];
  selectedComponent: ComponentData | null;
  onSelectComponent: (component: ComponentData | null) => void;
  onAddComponent: (component: ComponentData) => void;
  onUpdateComponent: (id: string, updates: Partial<ComponentData>) => void;
  onDeleteComponent: (id: string) => void;
  onReorderComponent: (id: string, direction: "front" | "back") => void;
  canvasZoom: number;
  onZoomChange: (zoom: number) => void;
  projectId: string | null;
  projectName: string;
  backgroundColor?: string;
  showGrid?: boolean;
  userProjectConfig?: {
    supabaseUrl: string;
    supabaseKey: string;
  };
  readOnly?: boolean;
  activePageId?: string;
  pages?: { id: string; name: string; path: string }[];
  onMoveLayer: (id: string, action: "forward" | "backward") => void;
  currentUser?: any;
  remoteCursors?: Map<
    string,
    { clientId: string; user: any; x: number; y: number }
  >;
}

// Command interface for undo/redo
interface Command {
  execute: () => void;
  undo: () => void;
}

interface CanvasProperties {
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
}

export function Canvas({
  components,
  selectedComponent,
  onAddComponent,
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent,
  onReorderComponent,
  canvasZoom = 100,
  onZoomChange,
  projectId,
  projectName,
  backgroundColor = "#ffffff",
  showGrid = false,
  userProjectConfig,
  readOnly = false,
  activePageId = "home",
  pages = [{ id: "home", name: "Home", path: "/" }],
  onMoveLayer,
  currentUser,
  remoteCursors = new Map(),
}: CanvasProps) {
  const clampedCanvasZoom = Math.min(
    MAX_CANVAS_ZOOM,
    Math.max(BASE_CANVAS_ZOOM, canvasZoom),
  );
  const displayZoom = clampedCanvasZoom - BASE_CANVAS_ZOOM;

  const [draggingComponent, setDraggingComponent] = useState<string | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [clipboard, setClipboard] = useState<ComponentData | null>(null);
  const [commandHistory, setCommandHistory] = useState<Command[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(
    new Set(),
  );
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const previousScaleRef = useRef(clampedCanvasZoom / 100);
  const [viewportWidth, setViewportWidth] = useState(DESIGN_WIDTH);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editTextPosition, setEditTextPosition] = useState({ x: 0, y: 0 });
  const [editTextValue, setEditTextValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [canvasProperties, setCanvasProperties] = useState<CanvasProperties>({
    backgroundColor: backgroundColor,
    showGrid: false,
    gridSize: 20,
    gridColor: "#e5e5e5",
  });
  const dragSnapConfigRef = useRef({ snapToGrid: false, gridSize: 20 });
  const canvasPanRef = useRef({
    startClientX: 0,
    startClientY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
    hasMoved: false,
  });
  const getSnapConfig = useCallback(() => {
    const prefs =
      typeof window !== "undefined"
        ? localStorage.getItem("codecraft-preferences")
        : null;
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        return {
          snapToGrid: !!parsed.snapToGrid,
          gridSize: parsed.gridSize || 20,
        };
      } catch (e) {}
    }
    return { snapToGrid: false, gridSize: 20 };
  }, []);

  const [showRulers, setShowRulers] = useState(() => {
    try {
      const prefs = localStorage.getItem("codecraft-preferences");
      return prefs ? !!JSON.parse(prefs).showRulers : false;
    } catch {
      return false;
    }
  });
  const [rulerScroll, setRulerScroll] = useState({ x: 0, y: 0 });

  const handleCanvasScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setRulerScroll({ x: el.scrollLeft, y: el.scrollTop });
  }, []);

  useEffect(() => {
    const onPrefsUpdated = () => {
      try {
        const prefs = localStorage.getItem("codecraft-preferences");
        if (prefs) setShowRulers(!!JSON.parse(prefs).showRulers);
      } catch {}
    };
    window.addEventListener("preferencesUpdated", onPrefsUpdated);
    return () =>
      window.removeEventListener("preferencesUpdated", onPrefsUpdated);
  }, []);

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getComponentWidth = useCallback(
    (component?: Partial<ComponentData>) => {
      const rawWidth = component?.style?.width;
      const parsedWidth =
        typeof rawWidth === "number"
          ? rawWidth
          : Number.parseFloat(String(rawWidth ?? ""));

      return Number.isFinite(parsedWidth) && parsedWidth > 0
        ? parsedWidth
        : 200;
    },
    [],
  );

  const clampPositionToCanvasWidth = useCallback(
    (
      position: { x: number; y: number },
      component?: Partial<ComponentData>,
    ) => {
      const componentWidth = getComponentWidth(component);
      const maxX = Math.max(0, DESIGN_WIDTH - componentWidth);

      return {
        ...position,
        x: Math.min(maxX, Math.max(0, position.x)),
      };
    },
    [getComponentWidth],
  );

  const constrainUpdatesToCanvasWidth = useCallback(
    (component: ComponentData, updates: Partial<ComponentData>) => {
      const nextUpdates: Partial<ComponentData> = { ...updates };
      const nextStyle = {
        ...(component.style || {}),
        ...(updates.style || {}),
      };

      const currentPosition = updates.position ||
        component.position || { x: 0, y: 0 };
      const componentWidth = getComponentWidth({ style: nextStyle });
      const maxX = Math.max(0, DESIGN_WIDTH - componentWidth);
      const clampedX = Math.min(maxX, Math.max(0, currentPosition.x));

      if (updates.position) {
        nextUpdates.position = {
          ...updates.position,
          x: clampedX,
        };
      }

      if (updates.style?.width !== undefined) {
        const maxWidth = Math.max(0, DESIGN_WIDTH - clampedX);
        const clampedWidth = Math.min(componentWidth, maxWidth);

        nextUpdates.style = {
          ...(updates.style || {}),
          width:
            typeof updates.style.width === "number"
              ? clampedWidth
              : `${clampedWidth}px`,
        };

        if (!updates.position && clampedX !== currentPosition.x) {
          nextUpdates.position = {
            ...(component.position || { x: 0, y: 0 }),
            x: clampedX,
          };
        }
      }

      return nextUpdates;
    },
    [getComponentWidth],
  );

  const getFitScale = useCallback(() => {
    const canvasWidth = canvasRef.current?.clientWidth ?? viewportWidth;
    const rulerOffset = showRulers && !readOnly ? RULER_SIZE : 0;
    const visibleWidth = Math.max(1, canvasWidth - rulerOffset);
    return visibleWidth / DESIGN_WIDTH;
  }, [viewportWidth, showRulers, readOnly]);

  const getEffectiveScale = useCallback(() => {
    return (clampedCanvasZoom / 100) * getFitScale();
  }, [clampedCanvasZoom, getFitScale]);

  const getCanvasScrollBounds = useCallback(() => {
    if (!canvasRef.current) {
      return { maxLeft: 0, maxTop: 0 };
    }

    const canvas = canvasRef.current;
    const rulerOffset = showRulers && !readOnly ? RULER_SIZE : 0;
    const viewportWidth = Math.max(1, canvas.clientWidth - rulerOffset);
    const viewportHeight = Math.max(1, canvas.clientHeight - rulerOffset);
    const scale = getEffectiveScale();
    const scaledWidth = DESIGN_WIDTH * scale;
    const scaledHeight = DESIGN_HEIGHT * scale;

    return {
      maxLeft: Math.max(0, scaledWidth - viewportWidth),
      maxTop: Math.max(0, scaledHeight - viewportHeight),
    };
  }, [getEffectiveScale, readOnly, showRulers]);

  const clampCanvasScroll = useCallback(
    (left: number, top: number) => {
      const { maxLeft, maxTop } = getCanvasScrollBounds();

      return {
        left: Math.min(maxLeft, Math.max(0, left)),
        top: Math.min(maxTop, Math.max(0, top)),
      };
    },
    [getCanvasScrollBounds],
  );

  useEffect(() => {
    previousScaleRef.current = (clampedCanvasZoom / 100) * getFitScale();
  }, [getFitScale]);

  const setDisplayZoom = useCallback(
    (nextDisplayZoom: number) => {
      if (!onZoomChange) return;

      const maxDisplayZoom = MAX_CANVAS_ZOOM - BASE_CANVAS_ZOOM;
      const clampedDisplayZoom = Math.min(
        maxDisplayZoom,
        Math.max(0, nextDisplayZoom),
      );

      onZoomChange(BASE_CANVAS_ZOOM + clampedDisplayZoom);
    },
    [onZoomChange],
  );

  useEffect(() => {
    setCanvasProperties((prev) => ({
      ...prev,
      backgroundColor: backgroundColor,
      showGrid: showGrid,
    }));
  }, [backgroundColor, showGrid]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? DESIGN_WIDTH;
      setViewportWidth(width);
    });

    resizeObserver.observe(canvasRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Clear selection when changing pages
  useEffect(() => {
    setSelectedComponents(new Set());
  }, [activePageId]);

  // Add command to history
  const addToHistory = useCallback(
    (command: Command) => {
      setCommandHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, command];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  // Undo last command
  const undo = useCallback(() => {
    if (historyIndex < 0) return; // Nothing to undo

    // Execute the undo for the current command
    commandHistory[historyIndex].undo();
    // Update the history index
    setHistoryIndex((prev) => Math.max(-1, prev - 1));
  }, [commandHistory, historyIndex]);

  // Redo last undone command
  const redo = useCallback(() => {
    if (historyIndex >= commandHistory.length - 1) return; // Nothing to redo

    // Execute the next command in history
    commandHistory[historyIndex + 1].execute();
    // Update the history index
    setHistoryIndex((prev) => prev + 1);
  }, [commandHistory, historyIndex]);

  // Copy selected component to clipboard
  const copyToClipboard = useCallback(
    (cut = false) => {
      if (!selectedComponent) return;

      const componentCopy = JSON.parse(JSON.stringify(selectedComponent));
      setClipboard(componentCopy);

      if (cut) {
        const componentToRemove = { ...selectedComponent };

        const execute = () => {
          // Remove the component
          onDeleteComponent(componentToRemove.id);
          // Clear selection if the selected component was cut
          if (selectedComponent?.id === componentToRemove.id) {
            onSelectComponent(null);
          }
        };

        const undo = () => {
          // Restore the component
          onUpdateComponent(componentToRemove.id, componentToRemove);
          onSelectComponent(componentToRemove);
        };

        addToHistory({ execute, undo });
        execute();
      }
    },
    [
      selectedComponent,
      onSelectComponent,
      addToHistory,
      onDeleteComponent,
      onUpdateComponent,
    ],
  );

  // Paste component from clipboard
  const pasteFromClipboard = useCallback(() => {
    if (clipboard) {
      const newComponent = {
        ...clipboard,
        id: generateId(),
        position: {
          x: (clipboard.position?.x || 0) + 20, // Offset slightly from original
          y: (clipboard.position?.y || 0) + 20,
        },
        page_id: activePageId,
      };

      newComponent.position = clampPositionToCanvasWidth(
        newComponent.position,
        newComponent,
      );

      const execute = () => {
        const event = new CustomEvent("addComponent", { detail: newComponent });
        window.dispatchEvent(event);
        onSelectComponent(newComponent);
      };

      const undo = () => {
        const event = new CustomEvent("deleteComponent", {
          detail: newComponent.id,
        });
        window.dispatchEvent(event);
      };

      const command = { execute, undo };
      addToHistory(command);
      execute();
    }
  }, [
    clipboard,
    addToHistory,
    onSelectComponent,
    activePageId,
    clampPositionToCanvasWidth,
  ]);

  // Group selected components
  const groupSelectedComponents = useCallback(() => {
    if (selectedComponents.size < 2) return;

    const selectedIds = Array.from(selectedComponents);
    const selectedComps = components.filter((c) => selectedIds.includes(c.id));

    if (selectedComps.length < 2) return;

    // Calculate group bounds
    let minX = Number.POSITIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY;

    selectedComps.forEach((comp) => {
      const pos = comp.position || { x: 0, y: 0 };
      const width = comp.style?.width
        ? Number.parseInt(String(comp.style.width).replace("px", ""))
        : 200;
      const height = comp.style?.height
        ? Number.parseInt(String(comp.style.height).replace("px", ""))
        : 100;

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + width);
      maxY = Math.max(maxY, pos.y + height);
    });

    // Create group component
    const groupId = `group-${Date.now()}`;
    const groupComponent: ComponentData = {
      id: groupId,
      type: "group",
      props: {},
      position: { x: minX, y: minY },
      style: {
        width: `${maxX - minX}px`,
        height: `${maxY - minY}px`,
      },
      children: selectedComps.map((comp) => ({
        ...comp,
        position: {
          x: (comp.position?.x || 0) - minX,
          y: (comp.position?.y || 0) - minY,
        },
      })),
      page_id: activePageId,
    };

    // Create a command for grouping
    const execute = () => {
      selectedIds.forEach((id) => onDeleteComponent(id));

      const event = new CustomEvent("addComponent", { detail: groupComponent });
      window.dispatchEvent(event);

      setTimeout(() => {
        setSelectedComponents(new Set([groupId]));
        onSelectComponent(groupComponent);
      }, 50);
    };

    const undo = () => {
      onDeleteComponent(groupId);
      selectedComps.forEach((comp) => {
        const event = new CustomEvent("addComponent", { detail: comp });
        window.dispatchEvent(event);
      });
      setTimeout(() => {
        setSelectedComponents(new Set(selectedIds));
        if (selectedComps.length > 0) {
          onSelectComponent(selectedComps[0]);
        }
      }, 50);
    };

    // Add to history and execute
    addToHistory({ execute, undo });
    execute();
  }, [
    selectedComponents,
    components,
    onDeleteComponent,
    onUpdateComponent,
    onSelectComponent,
    addToHistory,
    activePageId,
  ]);

  // Ungroup selected group
  const ungroupSelected = useCallback(() => {
    if (
      !selectedComponent ||
      selectedComponent.type !== "group" ||
      !selectedComponent.children
    )
      return;

    const group = selectedComponent;
    const groupPos = group.position || { x: 0, y: 0 };

    // Add all children back to the main canvas
    group.children?.forEach((child: ComponentData) => {
      const newChild = {
        ...child,
        position: {
          x: (child.position?.x || 0) + groupPos.x,
          y: (child.position?.y || 0) + groupPos.y,
        },
        page_id: activePageId,
      };
      // Use addComponent event
      const event = new CustomEvent("addComponent", { detail: newChild });
      window.dispatchEvent(event);
    });

    // Delete the group
    onDeleteComponent(group.id);
    setSelectedComponents(new Set());
    onSelectComponent(null);
  }, [selectedComponent, onDeleteComponent, onSelectComponent, activePageId]);

  // Bring to Front
  const bringToFront = useCallback(() => {
    if (!selectedComponent || !onReorderComponent) return;

    const execute = () => {
      onReorderComponent(selectedComponent.id, "front");
    };

    const undo = () => {
      // Undo not implemented for Z-index yet
    };

    addToHistory({ execute, undo });
    execute();
  }, [selectedComponent, onReorderComponent, addToHistory]);

  // Send to Back
  const sendToBack = useCallback(() => {
    if (!selectedComponent || !onReorderComponent) return;

    const execute = () => {
      onReorderComponent(selectedComponent.id, "back");
    };

    const undo = () => {
      // Undo not implemented for Z-index yet
    };

    addToHistory({ execute, undo });
    execute();
  }, [selectedComponent, onReorderComponent, addToHistory]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isArrowKey = [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(e.key.toLowerCase());

      if (!isCtrl && !isArrowKey) return;

      // Handle Arrow Keys for movement
      if (isArrowKey && selectedComponent) {
        e.preventDefault();
        e.stopPropagation();

        const step = e.shiftKey ? 10 : 1;
        const currentPos = selectedComponent.position || { x: 0, y: 0 };
        let newPos = { ...currentPos };

        switch (e.key.toLowerCase()) {
          case "arrowup":
            newPos.y -= step;
            break;
          case "arrowdown":
            newPos.y += step;
            break;
          case "arrowleft":
            newPos.x -= step;
            break;
          case "arrowright":
            newPos.x += step;
            break;
        }

        const clampedPosition = clampPositionToCanvasWidth(
          newPos,
          selectedComponent,
        );

        onUpdateComponent(selectedComponent.id, { position: clampedPosition });
        return;
      }

      if (!isCtrl) return;

      e.preventDefault();

      switch (e.key.toLowerCase()) {
        case "x": // Cut
          if (selectedComponent) {
            copyToClipboard(true);
          }
          break;
        case "c": // Copy
          if (selectedComponent) {
            copyToClipboard(false);
          }
          break;
        case "v": // Paste
          if (clipboard) {
            pasteFromClipboard();
          }
          break;
        case "z": // Undo/Redo
          if (e.shiftKey) {
            redo(); // Shift+Z for redo
          } else {
            undo(); // Ctrl+Z for undo
          }
          break;
        case "y": // Alternative redo (Ctrl+Y)
          redo();
          break;
        case "g": // Group selected components (Ctrl+G)
          if (!e.shiftKey) {
            groupSelectedComponents();
          }
          break;
        case "G": // Ungroup selected group (Ctrl+Shift+G)
          if (e.shiftKey) {
            ungroupSelected();
          }
          break;
      }
    },
    [
      selectedComponent,
      clipboard,
      copyToClipboard,
      pasteFromClipboard,
      undo,
      redo,
      groupSelectedComponents,
      ungroupSelected,
      clampPositionToCanvasWidth,
    ],
  );

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle component additions and deletions for undo/redo
  const componentsRef = useRef(components);
  const selectedComponentRef = useRef(selectedComponent);

  // Update refs when components or selectedComponent changes
  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  // Handle component deletion with history
  const handleDeleteWithHistory = useCallback(
    (id: string) => {
      const component = componentsRef.current.find((c) => c.id === id);
      if (!component) return;

      const execute = () => {
        onDeleteComponent(id);
      };

      const undo = () => {
        onAddComponent(component);
        onSelectComponent(component);
      };

      addToHistory({ execute, undo });
      execute();
    },
    [addToHistory, onDeleteComponent, onUpdateComponent, onSelectComponent],
  );

  // Load components from localStorage on initial render

  const [{ isOver }, drop] = useDrop(
    {
      accept: "component",
      drop: (
        item: {
          type: string;
          props: Record<string, any>;
          style?: Record<string, any>;
        },
        monitor,
      ) => {
        const offset = monitor.getClientOffset();
        if (offset && canvasRef.current && contentRef.current) {
          const canvasRect = canvasRef.current.getBoundingClientRect();

          // Calculate position relative to the content area, accounting for zoom and scroll
          const scale = getEffectiveScale();
          const scrollLeft = canvasRef.current.scrollLeft;
          const scrollTop = canvasRef.current.scrollTop;

          // Calculate the actual position in the canvas coordinate system
          let x = (offset.x - canvasRect.left + scrollLeft) / scale;
          let y = (offset.y - canvasRect.top + scrollTop) / scale;

          const snapConfig = getSnapConfig();
          if (snapConfig.snapToGrid) {
            x = Math.round(x / snapConfig.gridSize) * snapConfig.gridSize;
            y = Math.round(y / snapConfig.gridSize) * snapConfig.gridSize;
          }

          const newComponent: ComponentData = {
            id: generateId(),
            type: item.type,
            props: item.props,
            style: item.style || {},
            position: clampPositionToCanvasWidth(
              { x, y },
              { style: item.style },
            ),
            page_id: activePageId,
          };

          const event = new CustomEvent("addComponent", {
            detail: newComponent,
          });
          window.dispatchEvent(event);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    },
    [activePageId, clampPositionToCanvasWidth, getEffectiveScale],
  );

  React.useEffect(() => {
    if (
      components.length > 0 &&
      !hasAutoScrolled.current &&
      canvasRef.current &&
      contentRef.current
    ) {
      const timeoutId = setTimeout(() => {
        if (canvasRef.current && contentRef.current) {
          const canvas = canvasRef.current;

          let minX = Number.POSITIVE_INFINITY,
            minY = Number.POSITIVE_INFINITY,
            maxX = Number.NEGATIVE_INFINITY,
            maxY = Number.NEGATIVE_INFINITY;

          components.forEach((comp) => {
            const pos = comp.position || { x: 150, y: 150 };
            const width =
              Number.parseFloat(
                String(comp.style?.width || "200").replace("px", ""),
              ) || 200;
            const height =
              Number.parseFloat(
                String(comp.style?.height || "100").replace("px", ""),
              ) || 100;

            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + width);
            maxY = Math.max(maxY, pos.y + height);
          });

          const contentCenterX = (minX + maxX) / 2;
          const contentCenterY = (minY + maxY) / 2;

          const canvasWidth = canvas.clientWidth;
          const canvasHeight = canvas.clientHeight;
          const scale = getEffectiveScale();

          const scrollLeft = contentCenterX * scale - canvasWidth / 2;
          const scrollTop = contentCenterY * scale - canvasHeight / 2;
          const clamped = clampCanvasScroll(scrollLeft, scrollTop);

          canvas.scrollTo({
            left: clamped.left,
            top: clamped.top,
            behavior: "smooth",
          });

          hasAutoScrolled.current = true;
        }
      }, 150);

      return () => clearTimeout(timeoutId);
    }

    if (components.length === 0) {
      hasAutoScrolled.current = false;
    }
  }, [components, clampCanvasScroll, getEffectiveScale]);

  React.useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const rulerOffset = showRulers && !readOnly ? RULER_SIZE : 0;
      const visibleWidth = Math.max(1, canvas.clientWidth - rulerOffset);
      const visibleHeight = Math.max(1, canvas.clientHeight - rulerOffset);
      const previousScale = previousScaleRef.current;
      const newScale = getEffectiveScale();

      if (Math.abs(newScale - previousScale) < 0.0001) {
        return;
      }

      const viewportCenterX =
        (canvas.scrollLeft + visibleWidth / 2) / previousScale;
      const viewportCenterY =
        (canvas.scrollTop + visibleHeight / 2) / previousScale;

      const newScrollLeft = viewportCenterX * newScale - visibleWidth / 2;
      const newScrollTop = viewportCenterY * newScale - visibleHeight / 2;
      const clamped = clampCanvasScroll(newScrollLeft, newScrollTop);

      canvas.scrollLeft = clamped.left;
      canvas.scrollTop = clamped.top;

      previousScaleRef.current = newScale;
    }
  }, [
    clampedCanvasZoom,
    clampCanvasScroll,
    getEffectiveScale,
    readOnly,
    showRulers,
  ]);

  // Handle component dragging
  const handleComponentMouseDown = (
    e: React.MouseEvent,
    component: ComponentData,
  ) => {
    // Don't start drag if readOnly or clicking on resize handles or editable content
    const target = e.target as HTMLElement;
    if (
      readOnly ||
      target.closest(".resize-handle") ||
      target.closest('[contenteditable="true"]') ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea")
    ) {
      return;
    }

    e.stopPropagation();
    setDraggingComponent(component.id);

    if (canvasRef.current && contentRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const scale = getEffectiveScale();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      const mouseCanvasX = (e.clientX - canvasRect.left + scrollLeft) / scale;
      const mouseCanvasY = (e.clientY - canvasRect.top + scrollTop) / scale;

      const x = mouseCanvasX - (component.position?.x || 0);
      const y = mouseCanvasY - (component.position?.y || 0);
      setDragOffset({ x, y });
      dragSnapConfigRef.current = getSnapConfig();
    }
  };

  // Touch support for mobile
  const handleComponentTouchStart = (
    e: React.TouchEvent,
    component: ComponentData,
  ) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".resize-handle") ||
      target.closest('[contenteditable="true"]') ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea")
    ) {
      return;
    }

    const touch = e.touches[0];
    setDraggingComponent(component.id);

    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const scale = getEffectiveScale();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      const touchCanvasX =
        (touch.clientX - canvasRect.left + scrollLeft) / scale;
      const touchCanvasY = (touch.clientY - canvasRect.top + scrollTop) / scale;

      const x = touchCanvasX - (component.position?.x || 0);
      const y = touchCanvasY - (component.position?.y || 0);
      setDragOffset({ x, y });
      dragSnapConfigRef.current = getSnapConfig();
    }
  };

  // Update component with history tracking
  const updateComponentWithHistory = useCallback(
    (id: string, updates: Partial<ComponentData>) => {
      const component = componentsRef.current.find((c) => c.id === id);
      if (!component) return;

      const nextUpdates = constrainUpdatesToCanvasWidth(component, updates);

      // Save the previous state for undo
      const previousState = { ...component };

      // Create the update command
      const execute = () => {
        onUpdateComponent(id, nextUpdates);
      };

      const undo = () => {
        onAddComponent(component);
        onSelectComponent(component);
      };

      // Only add to history if this is a position update (to avoid cluttering history with intermediate states)
      if (nextUpdates.position) {
        addToHistory({ execute, undo });
      }

      execute();
    },
    [addToHistory, constrainUpdatesToCanvasWidth, onUpdateComponent],
  );

  const handleTouchMove = (e: TouchEvent) => {
    if (draggingComponent && canvasRef.current) {
      e.preventDefault();
      const touch = e.touches[0];
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const scale = getEffectiveScale();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      let x =
        (touch.clientX - canvasRect.left + scrollLeft) / scale - dragOffset.x;
      let y =
        (touch.clientY - canvasRect.top + scrollTop) / scale - dragOffset.y;

      if (dragSnapConfigRef.current.snapToGrid) {
        const size = dragSnapConfigRef.current.gridSize;
        x = Math.round(x / size) * size;
        y = Math.round(y / size) * size;
      }

      updateComponentWithHistory(draggingComponent, {
        position: { x, y },
      });
    }
  };

  const handleTouchEnd = () => {
    setDraggingComponent(null);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingComponent && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const scale = getEffectiveScale();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      let x = (e.clientX - canvasRect.left + scrollLeft) / scale - dragOffset.x;
      let y = (e.clientY - canvasRect.top + scrollTop) / scale - dragOffset.y;

      if (dragSnapConfigRef.current.snapToGrid) {
        const size = dragSnapConfigRef.current.gridSize;
        x = Math.round(x / size) * size;
        y = Math.round(y / size) * size;
      }

      updateComponentWithHistory(draggingComponent, {
        position: { x, y },
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingComponent(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (e.button !== 0) return;
    if (draggingComponent) return;
    if (!canvasRef.current) return;

    if (e.target !== e.currentTarget && e.target !== contentRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    canvasPanRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startScrollLeft: canvas.scrollLeft,
      startScrollTop: canvas.scrollTop,
      hasMoved: false,
    };

    setIsPanningCanvas(true);
  };

  const handleCanvasPanMove = useCallback(
    (e: MouseEvent) => {
      if (!canvasRef.current) return;

      const pan = canvasPanRef.current;
      const deltaX = e.clientX - pan.startClientX;
      const deltaY = e.clientY - pan.startClientY;

      if (!pan.hasMoved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        pan.hasMoved = true;
      }

      const nextLeft = pan.startScrollLeft - deltaX;
      const nextTop = pan.startScrollTop - deltaY;
      const clamped = clampCanvasScroll(nextLeft, nextTop);

      canvasRef.current.scrollLeft = clamped.left;
      canvasRef.current.scrollTop = clamped.top;
    },
    [clampCanvasScroll],
  );

  const handleCanvasPanEnd = useCallback(() => {
    setIsPanningCanvas(false);
  }, []);

  React.useEffect(() => {
    if (draggingComponent) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [draggingComponent, dragOffset, getEffectiveScale]);

  React.useEffect(() => {
    if (!isPanningCanvas) return;

    document.addEventListener("mousemove", handleCanvasPanMove);
    document.addEventListener("mouseup", handleCanvasPanEnd);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleCanvasPanMove);
      document.removeEventListener("mouseup", handleCanvasPanEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isPanningCanvas, handleCanvasPanMove, handleCanvasPanEnd]);

  // Handle wheel zoom with Ctrl/Cmd key
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      const delta = -e.deltaY;
      const zoomChange = delta > 0 ? 10 : -10;
      setDisplayZoom(displayZoom + zoomChange);
    }
  };

  // Handle right-click context menu for desktop
  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Don't show context menu when right-clicking empty canvas
    console.log("[v0] Right-clicked canvas, not showing context menu");
  }, []);

  const handleComponentContextMenu = useCallback(
    (e: React.MouseEvent, component: ComponentData) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[v0] Right-clicked component:", component.type);
      setContextMenu({ x: e.clientX, y: e.clientY });
      onSelectComponent(component);
    },
    [onSelectComponent],
  );

  const handleDuplicate = useCallback(() => {
    if (!selectedComponent) return;
    copyToClipboard();
    setTimeout(() => pasteFromClipboard(), 100);
  }, [selectedComponent, copyToClipboard, pasteFromClipboard]);

  const handleBringToFront = useCallback(() => {
    if (selectedComponent && onReorderComponent) {
      onReorderComponent(selectedComponent.id, "front");
    }
  }, [selectedComponent, onReorderComponent]);

  const handleSendToBack = useCallback(() => {
    if (selectedComponent && onReorderComponent) {
      onReorderComponent(selectedComponent.id, "back");
    }
  }, [selectedComponent, onReorderComponent]);

  const handleDelete = useCallback(() => {
    if (selectedComponent) {
      onDeleteComponent(selectedComponent.id);
      onSelectComponent(null);
    }
  }, [selectedComponent, onDeleteComponent, onSelectComponent]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Grid pattern SVG for canvas background
  const gridPattern = canvasProperties.showGrid
    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${canvasProperties.gridSize}' height='${canvasProperties.gridSize}'%3E%3Cpath d='M ${canvasProperties.gridSize} 0 L 0 0 0 ${canvasProperties.gridSize}' fill='none' stroke='%23e5e5e5' strokeWidth='0.5'/%3E%3C/svg%3E")`
    : "none";

  const canvasStyle = {
    backgroundImage: gridPattern,
    backgroundSize: `${canvasProperties.gridSize}px ${canvasProperties.gridSize}px`,
    backgroundPosition: "0 0",
  };

  const handleComponentDoubleClick = useCallback(
    (component: ComponentData, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTextId(component.id);
    },
    [],
  );

  const buildHRulerTicks = () => {
    if (!canvasRef.current) return [];
    const scale = clampedCanvasZoom / 100;
    const viewW = canvasRef.current.clientWidth;

    const rawStep = 100;
    const step = rawStep * scale;
    const firstCanvasPx = Math.floor(rulerScroll.x / step) * rawStep;
    const ticks: { label: string; x: number }[] = [];
    for (
      let cx = firstCanvasPx;
      cx * scale - rulerScroll.x < viewW + step;
      cx += rawStep
    ) {
      const screenX = cx * scale - rulerScroll.x + RULER_SIZE;
      ticks.push({ label: String(cx), x: screenX });
    }
    return ticks;
  };

  const buildVRulerTicks = () => {
    if (!canvasRef.current) return [];
    const scale = clampedCanvasZoom / 100;
    const viewH = canvasRef.current.clientHeight;
    const rawStep = 100;
    const step = rawStep * scale;
    const firstCanvasPx = Math.floor(rulerScroll.y / step) * rawStep;
    const ticks: { label: string; y: number }[] = [];
    for (
      let cy = firstCanvasPx;
      cy * scale - rulerScroll.y < viewH + step;
      cy += rawStep
    ) {
      const screenY = cy * scale - rulerScroll.y + RULER_SIZE;
      ticks.push({ label: String(cy), y: screenY });
    }
    return ticks;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 relative overflow-hidden">
      {/* ── Rulers ──*/}
      {showRulers && !readOnly && (
        <>
          {/* Top horizontal ruler */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: RULER_SIZE,
              right: 0,
              height: RULER_SIZE,
              zIndex: 10,
              background: "var(--card, #1e1e2e)",
              borderBottom: "1px solid var(--border, #333)",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <svg width="100%" height={RULER_SIZE} style={{ display: "block" }}>
              {buildHRulerTicks().map(({ label, x }) => (
                <g key={label}>
                  <line
                    x1={x}
                    y1={RULER_SIZE}
                    x2={x}
                    y2={RULER_SIZE - 8}
                    stroke="var(--muted-foreground,#888)"
                    strokeWidth={1}
                  />
                  <text
                    x={x + 2}
                    y={RULER_SIZE - 10}
                    fontSize={8}
                    fill="var(--muted-foreground,#888)"
                    fontFamily="monospace"
                  >
                    {label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Left vertical ruler */}
          <div
            style={{
              position: "absolute",
              top: RULER_SIZE,
              left: 0,
              bottom: 0,
              width: RULER_SIZE,
              zIndex: 10,
              background: "var(--card, #1e1e2e)",
              borderRight: "1px solid var(--border, #333)",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <svg width={RULER_SIZE} height="100%" style={{ display: "block" }}>
              {buildVRulerTicks().map(({ label, y }) => (
                <g key={label}>
                  <line
                    x1={RULER_SIZE}
                    y1={y}
                    x2={RULER_SIZE - 8}
                    y2={y}
                    stroke="var(--muted-foreground,#888)"
                    strokeWidth={1}
                  />
                  <text
                    x={RULER_SIZE - 10}
                    y={y - 2}
                    fontSize={8}
                    fill="var(--muted-foreground,#888)"
                    fontFamily="monospace"
                    transform={`rotate(-90, ${RULER_SIZE - 10}, ${y - 2})`}
                  >
                    {label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Corner square */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: RULER_SIZE,
              height: RULER_SIZE,
              zIndex: 11,
              background: "var(--card, #1e1e2e)",
              borderRight: "1px solid var(--border, #333)",
              borderBottom: "1px solid var(--border, #333)",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Canvas area */}
      <div
        ref={(node) => {
          drop(node);
          if (node) {
            canvasRef.current = node;
          }
        }}
        id="canvas-area"
        className={`w-full h-full figma-canvas-infinite overflow-y-auto overflow-x-hidden ${isOver ? "bg-primary/5" : ""}`}
        style={{
          backgroundColor: canvasProperties.backgroundColor,
          backgroundImage: "none",
          overflowY: "auto",
          overflowX: "hidden",
          cursor: isPanningCanvas
            ? "grabbing"
            : clampedCanvasZoom > BASE_CANVAS_ZOOM
              ? "grab"
              : "default",
          ...(showRulers && !readOnly
            ? { paddingTop: RULER_SIZE, paddingLeft: RULER_SIZE }
            : {}),
        }}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onScroll={handleCanvasScroll}
        onContextMenu={handleCanvasContextMenu}
        onClick={(e) => {
          if (canvasPanRef.current.hasMoved) {
            canvasPanRef.current.hasMoved = false;
            return;
          }

          if (e.target === e.currentTarget || e.target === contentRef.current) {
            onSelectComponent(null);
            setSelectedComponents(new Set());
            setEditingTextId(null);
          }
        }}
      >
        {/* Zoom Controls - Hide in Read Only */}
        {!readOnly && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg px-2 py-1.5 z-50">
            <button
              onClick={() => setDisplayZoom(displayZoom - 10)}
              className="p-1 hover:bg-accent rounded transition-colors"
              title="Zoom Out"
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
                  d="M20 12H4"
                />
              </svg>
            </button>
            <span className="text-xs font-medium text-muted-foreground min-w-12 text-center">
              {displayZoom}%
            </span>
            <button
              onClick={() => setDisplayZoom(displayZoom + 10)}
              className="p-1 hover:bg-accent rounded transition-colors"
              title="Zoom In"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onClick={() => setDisplayZoom(0)}
              className="px-1.5 py-0.5 hover:bg-accent rounded transition-colors text-xs"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        )}

        {/* Infinite Canvas Content */}
        {(() => {
          const activeColor = "#a855f7"; // Reusing the purple primary color
          const filteredComponents = components.filter((c) => {
            if (c.page_id === "all") return true;
            const compId = c.page_id || "home";
            const activeId = activePageId || "home";
            return compId === activeId;
          });

          return (
            <div
              ref={contentRef}
              className="relative border border-border"
              style={{
                transform: `scale(${getEffectiveScale()})`,
                transformOrigin: "top left",
                minWidth: `${DESIGN_WIDTH}px`,
                width: `${DESIGN_WIDTH}px`,
                minHeight: "1080px",
                height: `${DESIGN_HEIGHT}px`,
                marginInline: "0",
                boxSizing: "border-box",
                ...canvasStyle,
              }}
            >
              {filteredComponents.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                  <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div
                      className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${activeColor}20, ${activeColor}10)`,
                      }}
                    >
                      <Plus
                        className="w-10 h-10"
                        style={{ color: activeColor }}
                      />
                    </div>
                    <div>
                      <p className="mb-2">
                        Drop components here to start building
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desktop: Drag & drop components, then drag to move them
                        anywhere
                      </p>
                      <div className="hidden lg:block mt-4 text-xs">
                        <p>Keyboard shortcuts:</p>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          <span className="bg-muted px-2 py-1 rounded">
                            Ctrl+Wheel - Zoom
                          </span>
                          <span className="bg-muted px-2 py-1 rounded">
                            Del - Delete
                          </span>
                          <span className="bg-muted px-2 py-1 rounded">
                            Esc - Deselect
                          </span>
                          <span className="bg-muted px-2 py-1 rounded">
                            Drag - Move
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {Array.from(remoteCursors.values()).map((cursor) => (
                <div
                  key={cursor.clientId}
                  className="absolute pointer-events-none z-[9999]"
                  style={{
                    left: `${cursor.x}px`,
                    top: `${cursor.y}px`,
                    transform: "translate(-2px, -2px)",
                    overflow: "visible",
                  }}
                >
                  <svg
                    width="22"
                    height="30"
                    viewBox="0 0 18 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      display: "block",
                      overflow: "visible",
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.28))",
                    }}
                  >
                    <path
                      d="M2 2L2 18L6.5 14.5L9.5 21L12 20L9 13.5L15.5 13L2 2Z"
                      fill={cursor.user?.color || "#3b82f6"}
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      left: 12,
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: "white",
                      background: cursor.user?.color || "#3b82f6",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cursor.user?.name || "Guest"}
                  </div>
                </div>
              ))}

              {filteredComponents.map((component) => {
                const position = component.position || { x: 100, y: 100 };
                const isSelected = selectedComponents.has(component.id);
                const isDragging = draggingComponent === component.id;

                return (
                  <div
                    key={component.id}
                    data-component-id={component.id}
                    className={`absolute transition-shadow duration-200 ${
                      isSelected
                        ? "z-50 ring-2 ring-primary shadow-2xl"
                        : isDragging
                          ? "z-40"
                          : "z-auto"
                    } ${isDragging ? "cursor-grabbing" : readOnly ? "cursor-default" : "cursor-grab"}`}
                    style={{
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      width: "fit-content",
                      height: "fit-content",
                      pointerEvents: "auto",
                    }}
                    onMouseDown={
                      !readOnly
                        ? (e) => handleComponentMouseDown(e, component)
                        : undefined
                    }
                    onTouchStart={
                      !readOnly
                        ? (e) => handleComponentTouchStart(e, component)
                        : undefined
                    }
                    onClick={
                      !readOnly
                        ? (e) => {
                            e.stopPropagation();

                            if (e.ctrlKey || e.metaKey) {
                              // Multi-select with Ctrl/Cmd key
                              const newSelection = new Set(selectedComponents);
                              if (newSelection.has(component.id)) {
                                newSelection.delete(component.id);
                              } else {
                                newSelection.add(component.id);
                              }
                              setSelectedComponents(newSelection);
                            } else {
                              // Single select
                              setSelectedComponents(new Set([component.id]));
                            }
                            onSelectComponent(component);
                          }
                        : undefined
                    }
                    onContextMenu={
                      !readOnly
                        ? (e) => {
                            handleComponentContextMenu(e, component);
                          }
                        : undefined
                    }
                    onDoubleClick={
                      !readOnly
                        ? (e) => handleComponentDoubleClick(component, e)
                        : undefined
                    }
                  >
                    <RenderableComponent
                      component={component}
                      isSelected={readOnly ? false : isSelected}
                      onUpdate={
                        !readOnly
                          ? (updates) => {
                              if (
                                !updates.position &&
                                updates.style?.width === undefined
                              ) {
                                onUpdateComponent(component.id, updates);
                                return;
                              }

                              const constrainedUpdates =
                                constrainUpdatesToCanvasWidth(
                                  component,
                                  updates,
                                );

                              onUpdateComponent(
                                component.id,
                                constrainedUpdates,
                              );
                            }
                          : () => {}
                      }
                      onDelete={
                        !readOnly
                          ? () => onDeleteComponent(component.id)
                          : () => {}
                      }
                      editingComponentId={readOnly ? null : editingTextId}
                      onEditComponent={setEditingTextId}
                      userProjectConfig={userProjectConfig}
                      isPreview={readOnly}
                      activePageId={activePageId}
                      currentUser={currentUser}
                      selectedComponents={selectedComponents}
                      onSelect={
                        !readOnly
                          ? (childComp, e) => {
                              e.stopPropagation();
                              if (e.ctrlKey || e.metaKey) {
                                const newSelection = new Set(
                                  selectedComponents,
                                );
                                if (newSelection.has(childComp.id)) {
                                  newSelection.delete(childComp.id);
                                } else {
                                  newSelection.add(childComp.id);
                                }
                                setSelectedComponents(newSelection);
                              } else {
                                setSelectedComponents(new Set([childComp.id]));
                              }
                              onSelectComponent(childComp);
                            }
                          : undefined
                      }
                    />

                    {/* Desktop Selection Indicator - Hide in Read Only */}
                    {!readOnly && isSelected && (
                      <div className="hidden lg:block absolute -top-8 left-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full shadow-lg font-medium z-30 pointer-events-none">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                          {component.type.charAt(0).toUpperCase() +
                            component.type.slice(1)}
                        </span>
                      </div>
                    )}

                    {/* Position Indicator - Hide in Read Only */}
                    {!readOnly && isSelected && (
                      <div className="hidden lg:block absolute -bottom-8 left-0 bg-muted text-muted-foreground text-xs px-2 py-1 rounded shadow-md font-mono z-30 pointer-events-none">
                        x: {Math.round(position.x)} y: {Math.round(position.y)}
                      </div>
                    )}

                    {/* Mobile Selection Indicator - Hide in Read Only */}
                    {!readOnly && isSelected && (
                      <div className="lg:hidden absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full shadow-md font-medium z-30 pointer-events-none">
                        {component.type}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Canvas Context Menu - Hide in Read Only */}
      {!readOnly && (
        <CanvasContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onGroup={groupSelectedComponents}
          onUngroup={ungroupSelected}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onMoveForward={() =>
            selectedComponent && onMoveLayer(selectedComponent.id, "forward")
          }
          onMoveBackward={() =>
            selectedComponent && onMoveLayer(selectedComponent.id, "backward")
          }
          onCopy={() => copyToClipboard()}
          canGroup={selectedComponents.size > 1}
          canUngroup={selectedComponent?.type === "group"}
        />
      )}
    </div>
  );
}
