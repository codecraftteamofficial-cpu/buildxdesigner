"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDrop } from "react-dnd";
import type { ComponentData } from "../App";
import { RenderableComponent } from "./RenderableComponent";
import { getSupabaseSession } from "../supabase/auth/authService";
import {
  syncProjectComponents,
  saveProjectMetadata,
} from "../supabase/data/projectService";
import { setLocalProjectCache } from "../supabase/data/projectService";
import { MinimalComponentPanel } from "./MinimalComponentPanel";
import { CanvasContextMenu } from "./CanvasContextMenu";

// Constants

// Local storage key for saving components
const LOCAL_STORAGE_KEY = "canvas_components";

interface CanvasProps {
  components: ComponentData[];
  selectedComponent: ComponentData | null;
  onSelectComponent: (component: ComponentData | null) => void;
  onUpdateComponent: (id: string, updates: Partial<ComponentData>) => void;
  onDeleteComponent: (id: string) => void;
  onReorderComponent: (dragId: string, dropId: string) => void;
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
}: CanvasProps) {

  const [draggingComponent, setDraggingComponent] = useState<string | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [clipboard, setClipboard] = useState<ComponentData | null>(null);
  const [commandHistory, setCommandHistory] = useState<Command[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(
    new Set(),
  );
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const previousZoom = useRef(canvasZoom);
  const saveTimerRef = useRef<number | null>(null);
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

  useEffect(() => {
    setCanvasProperties((prev) => ({
      ...prev,
      backgroundColor: backgroundColor,
      showGrid: showGrid,
    }));
  }, [backgroundColor, showGrid]);

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
        id: Date.now().toString(),
        position: {
          x: (clipboard.position?.x || 0) + 20, // Offset slightly from original
          y: (clipboard.position?.y || 0) + 20,
        },
      };

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
  }, [clipboard, addToHistory, onSelectComponent]);

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
      };
      // Use addComponent event
      const event = new CustomEvent("addComponent", { detail: newChild });
      window.dispatchEvent(event);
    });

    // Delete the group
    onDeleteComponent(group.id);
    setSelectedComponents(new Set());
    onSelectComponent(null);
  }, [selectedComponent, onDeleteComponent, onSelectComponent]);

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

        onUpdateComponent(selectedComponent.id, { position: newPos });
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
        onUpdateComponent(component.id, component);
        onSelectComponent(component);
      };

      addToHistory({ execute, undo });
      execute();
    },
    [addToHistory, onDeleteComponent, onUpdateComponent, onSelectComponent],
  );

  // Save components to localStorage and debounce-persist to Supabase whenever they change
  // Save components to localStorage and debounce-persist to Supabase whenever they change
  useEffect(() => {
    // DO NOT save to local storage or DB if in readOnly mode (e.g. published site view)
    if (readOnly) return;

    try {
      if (projectId) {
        setLocalProjectCache(projectId, {
          id: projectId,
          name: projectName,
          project_layout: components,
        });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(components));
      }
    } catch (error) {
      console.error("Error saving components to localStorage:", error);
    }

    // Debounced cloud save
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const {
          data: { session },
        } = await getSupabaseSession();
        const user_id = session?.user?.id;
        if (!user_id) return; // if hindi logged in
        if (!projectId) return; // para di magcreate ng new project

        // Sync components to the new relational table
        const { error: syncError } = await syncProjectComponents(
          components,
          projectId,
        );

        if (syncError) {
          console.error("Autosave components failed:", syncError);
        } else {
          // Also save metadata (name, etc) AND the JSON layout for fetchProjectById compatibility
          await saveProjectMetadata({
            id: projectId,
            name: projectName,
            user_id,
            project_layout: components, // Pass the layout to be saved to the JSON column
          });
        }
      } catch (e) {
        console.error("Unexpected error during autosave:", e);
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [components, projectId, projectName, readOnly]);

  // Load components from localStorage on initial render
  useEffect(() => {
    try {
      const savedComponents = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedComponents) {
        const parsedComponents = JSON.parse(savedComponents);
        console.log("Loaded components from localStorage:", parsedComponents);
      }
    } catch (error) {
      console.error("Error loading components from localStorage:", error);
    }
  }, []);

  const [{ isOver }, drop] = useDrop({
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
        const contentRect = contentRef.current.getBoundingClientRect();

        // Calculate position relative to the content area, accounting for zoom and scroll
        const scale = canvasZoom / 100;
        const scrollLeft = canvasRef.current.scrollLeft;
        const scrollTop = canvasRef.current.scrollTop;

        // Calculate the actual position in the canvas coordinate system
        const x = (offset.x - canvasRect.left + scrollLeft) / scale;
        const y = (offset.y - canvasRect.top + scrollTop) / scale;

        const newComponent: ComponentData = {
          id: Date.now().toString(),
          type: item.type,
          props: item.props,
          style: item.style || {},
          position: { x, y },
        };

        const event = new CustomEvent("addComponent", { detail: newComponent });
        window.dispatchEvent(event);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Auto-center canvas when components are first loaded
  React.useEffect(() => {
    if (
      components.length > 0 &&
      !hasAutoScrolled.current &&
      canvasRef.current &&
      contentRef.current
    ) {
      // Wait for components to be rendered and positioned
      const timeoutId = setTimeout(() => {
        if (canvasRef.current && contentRef.current) {
          const canvas = canvasRef.current;

          // Calculate the bounds of all components to find the center
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

          // Calculate center point of all components
          const contentCenterX = (minX + maxX) / 2;
          const contentCenterY = (minY + maxY) / 2;

          // Get canvas dimensions
          const canvasWidth = canvas.clientWidth;
          const canvasHeight = canvas.clientHeight;
          const scale = canvasZoom / 100;

          // Calculate scroll position to center the content
          const scrollLeft = contentCenterX * scale - canvasWidth / 2;
          const scrollTop = contentCenterY * scale - canvasHeight / 2;

          canvas.scrollTo({
            left: Math.max(0, scrollLeft),
            top: Math.max(0, scrollTop),
            behavior: "smooth",
          });

          hasAutoScrolled.current = true;
        }
      }, 150); // Wait for layout

      return () => clearTimeout(timeoutId);
    }

    // Reset auto-scroll flag when all components are removed
    if (components.length === 0) {
      hasAutoScrolled.current = false;
    }
  }, [components.length, canvasZoom]);

  // Keep content centered when zooming
  React.useEffect(() => {
    if (canvasRef.current && previousZoom.current !== canvasZoom) {
      const canvas = canvasRef.current;
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;

      // Get the center point of the viewport in canvas coordinates before zoom
      const viewportCenterX =
        (canvas.scrollLeft + canvasWidth / 2) / (previousZoom.current / 100);
      const viewportCenterY =
        (canvas.scrollTop + canvasHeight / 2) / (previousZoom.current / 100);

      // Calculate new scroll position to keep the same center point after zoom
      const newScale = canvasZoom / 100;
      const newScrollLeft = viewportCenterX * newScale - canvasWidth / 2;
      const newScrollTop = viewportCenterY * newScale - canvasHeight / 2;

      // Apply new scroll position immediately
      canvas.scrollLeft = Math.max(0, newScrollLeft);
      canvas.scrollTop = Math.max(0, newScrollTop);

      // Update previous zoom
      previousZoom.current = canvasZoom;
    }
  }, [canvasZoom]);

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
      const scale = canvasZoom / 100;
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      const mouseCanvasX = (e.clientX - canvasRect.left + scrollLeft) / scale;
      const mouseCanvasY = (e.clientY - canvasRect.top + scrollTop) / scale;

      const x = mouseCanvasX - (component.position?.x || 0);
      const y = mouseCanvasY - (component.position?.y || 0);
      setDragOffset({ x, y });
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
      const scale = canvasZoom / 100;
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      const touchCanvasX =
        (touch.clientX - canvasRect.left + scrollLeft) / scale;
      const touchCanvasY = (touch.clientY - canvasRect.top + scrollTop) / scale;

      const x = touchCanvasX - (component.position?.x || 0);
      const y = touchCanvasY - (component.position?.y || 0);
      setDragOffset({ x, y });
    }
  };

  // Update component with history tracking
  const updateComponentWithHistory = useCallback(
    (id: string, updates: Partial<ComponentData>) => {
      const component = componentsRef.current.find((c) => c.id === id);
      if (!component) return;

      // Save the previous state for undo
      const previousState = { ...component };

      // Create the update command
      const execute = () => {
        onUpdateComponent(id, updates);
      };

      const undo = () => {
        onUpdateComponent(id, previousState);
      };

      // Only add to history if this is a position update (to avoid cluttering history with intermediate states)
      if (updates.position) {
        addToHistory({ execute, undo });
      }

      execute();
    },
    [addToHistory, onUpdateComponent],
  );

  const handleTouchMove = (e: TouchEvent) => {
    if (draggingComponent && canvasRef.current) {
      e.preventDefault();
      const touch = e.touches[0];
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const scale = canvasZoom / 100;
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      const x =
        (touch.clientX - canvasRect.left + scrollLeft) / scale - dragOffset.x;
      const y =
        (touch.clientY - canvasRect.top + scrollTop) / scale - dragOffset.y;

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
      const scale = canvasZoom / 100;
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;

      const x =
        (e.clientX - canvasRect.left + scrollLeft) / scale - dragOffset.x;
      const y = (e.clientY - canvasRect.top + scrollTop) / scale - dragOffset.y;

      updateComponentWithHistory(draggingComponent, {
        position: { x, y },
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingComponent(null);
  };

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
  }, [draggingComponent, dragOffset, canvasZoom]);

  // Handle wheel zoom with Ctrl/Cmd key
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      if (onZoomChange) {
        const delta = -e.deltaY;
        const zoomChange = delta > 0 ? 10 : -10;
        const newZoom = Math.max(50, Math.min(200, canvasZoom + zoomChange));
        onZoomChange(newZoom);
      }
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

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Canvas area */}
      <div
        ref={(node) => {
          drop(node);
          if (node) {
            canvasRef.current = node;
          }
        }}
        id="canvas-area"
        className={`w-full h-full figma-canvas-infinite overflow-auto ${isOver ? "bg-primary/5" : ""}`}
        style={{
          backgroundColor: canvasProperties.backgroundColor,
          backgroundImage: gridPattern,
          backgroundSize: `${canvasProperties.gridSize}px ${canvasProperties.gridSize}px`,
          backgroundPosition: "0 0",
        }}
        onWheel={handleWheel}
        onContextMenu={handleCanvasContextMenu}
        onClick={(e) => {
          if (e.target === e.currentTarget || e.target === contentRef.current) {
            onSelectComponent(null);
            setSelectedComponents(new Set());
            setEditingTextId(null);
          }
        }}
      >
        {/* Minimal Component Panel - Hide in Read Only */}
        {!readOnly && (
          <MinimalComponentPanel
            onAddComponent={(component) => {
              const event = new CustomEvent("addComponent", {
                detail: component,
              });
              window.dispatchEvent(event);
            }}
          />
        )}


        {/* Zoom Controls - Hide in Read Only */}
        {!readOnly && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg px-2 py-1.5 z-50">
            <button
              onClick={() =>
                onZoomChange && onZoomChange(Math.max(50, canvasZoom - 10))
              }
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
            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">
              {canvasZoom}%
            </span>
            <button
              onClick={() =>
                onZoomChange && onZoomChange(Math.min(200, canvasZoom + 10))
              }
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
              onClick={() => onZoomChange && onZoomChange(100)}
              className="px-1.5 py-0.5 hover:bg-accent rounded transition-colors text-xs"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        )}


        {/* Infinite Canvas Content */}
        <div
          ref={contentRef}
          className="relative"
          style={{
            transform: `scale(${canvasZoom / 100})`,
            transformOrigin: "top left",
            minWidth: "300vw",
            minHeight: "300vh",
            width: "300vw",
            height: "300vh",
            ...canvasStyle,
          }}
        >
          {components.length === 0 ? (
            <div
              className="absolute flex items-center justify-center text-muted-foreground text-center px-4"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "400px",
              }}
            >
              <div>
                <p className="mb-2">Drop components here to start building</p>
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
          ) : (
            <>
              {components.map((component) => {
                const position = component.position || { x: 100, y: 100 };
                const isSelected = selectedComponents.has(component.id);
                const isDragging = draggingComponent === component.id;

                return (
                  <div
                    key={component.id}
                    data-component-id={component.id}
                    className={`absolute transition-shadow duration-200 ${isSelected
                      ? "ring-2 ring-primary ring-offset-4 rounded component-selected shadow-2xl z-20"
                      : readOnly ? "z-10" : "hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 rounded hover:shadow-lg z-10"
                      } ${isDragging ? "cursor-grabbing" : readOnly ? "cursor-default" : "cursor-grab"}`}

                    style={{
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      width: "fit-content",
                      height: "fit-content",
                      pointerEvents: "auto",
                    }}
                    onMouseDown={!readOnly ? (e) => handleComponentMouseDown(e, component) : undefined}
                    onTouchStart={!readOnly ? (e) => handleComponentTouchStart(e, component) : undefined}
                    onClick={!readOnly ? (e) => {
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
                    } : undefined}
                    onContextMenu={!readOnly ? (e) => {
                      handleComponentContextMenu(e, component);
                    } : undefined}
                    onDoubleClick={!readOnly ? (e) => handleComponentDoubleClick(component, e) : undefined}
                  >
                    <RenderableComponent
                      component={component}
                      isSelected={readOnly ? false : isSelected}
                      onUpdate={!readOnly ? (updates) => onUpdateComponent(component.id, updates) : () => { }}
                      onDelete={!readOnly ? () => onDeleteComponent(component.id) : () => { }}

                      editingComponentId={readOnly ? null : editingTextId}
                      onEditComponent={setEditingTextId}
                      userProjectConfig={userProjectConfig}
                      isPreview={readOnly}
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
            </>
          )}
        </div>
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
          onCopy={() => copyToClipboard()}
          canGroup={selectedComponents.size > 1}
          canUngroup={selectedComponent?.type === "group"}
        />
      )}

    </div>
  );
}
