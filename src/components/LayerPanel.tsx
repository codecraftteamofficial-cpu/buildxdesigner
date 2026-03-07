"use client";

import React, { useState, useMemo } from "react";
import { 
  Type, Square, ImageIcon, Navigation, MousePointer, 
  FileText, Mail, Menu, Grid3X3, Video, CreditCard,
  Trash2, ChevronUp, ChevronDown, Search, X, ChevronRight, GripVertical
} from "lucide-react";
import type { ComponentData } from "../App";
import { nestComponents } from "../lib/nestComponents";

interface LayerPanelProps {
  components: ComponentData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'front' | 'back') => void;
  onMoveLayer: (id: string, action: 'forward' | 'backward') => void;
  onReorderLayers?: (orderedIds: string[]) => void;
}

const getLayerIcon = (type: string) => {
  switch (type) {
    case 'text': case 'heading': return <Type className="w-3.5 h-3.5" />;
    case 'button': return <MousePointer className="w-3.5 h-3.5" />;
    case 'image': return <ImageIcon className="w-3.5 h-3.5" />;
    case 'navbar': return <Navigation className="w-3.5 h-3.5" />;
    case 'hero': return <FileText className="w-3.5 h-3.5" />;
    case 'footer': return <Menu className="w-3.5 h-3.5" />;
    case 'grid': return <Grid3X3 className="w-3.5 h-3.5" />;
    case 'video': return <Video className="w-3.5 h-3.5" />;
    case 'paymongo-button': return <CreditCard className="w-3.5 h-3.5" />;
    default: return <Square className="w-3.5 h-3.5" />;
  }
};

const getComponentName = (comp: ComponentData) =>
  comp.props?.content || comp.props?.text || comp.props?.title ||
  comp.props?.brand || comp.props?.elementId || comp.type;

interface LayerRowProps {
  comp: ComponentData;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveLayer: (id: string, action: 'forward' | 'backward') => void;
  searchQuery: string;
  draggingId: string | null;
  dragOverId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function LayerRow({
  comp, depth, selectedId, onSelect, onDelete, onMoveLayer, searchQuery,
  draggingId, dragOverId, onDragStart, onDragOver, onDrop, onDragEnd
}: LayerRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = comp.children && comp.children.length > 0;
  const isSelected = selectedId === comp.id;
  const isDragging = draggingId === comp.id;
  const isDragOver = dragOverId === comp.id && draggingId !== comp.id;
  const name = getComponentName(comp);

  const hasMatchingDescendant = (c: ComponentData): boolean => {
    if (getComponentName(c).toLowerCase().includes(searchQuery.toLowerCase())) return true;
    return (c.children ?? []).some(hasMatchingDescendant);
  };

  if (searchQuery && !hasMatchingDescendant(comp)) return null;

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(comp.id); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(e, comp.id); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(e, comp.id); }}
        onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
        onClick={() => onSelect(comp.id)}
        className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all
          ${isSelected ? "bg-purple-500/10 text-purple-600 shadow-sm" : "hover:bg-accent text-muted-foreground"}
          ${isDragging ? "opacity-40 scale-95" : ""}
          ${isDragOver ? "border-t-2 border-purple-400" : "border-t-2 border-transparent"}
        `}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          <span className="shrink-0 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3 h-3" />
          </span>

          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
              className="shrink-0 p-0.5 rounded hover:bg-muted"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <span className="shrink-0 opacity-70">{getLayerIcon(comp.type)}</span>
          <span className="text-xs truncate font-medium">{name}</span>

          {hasChildren && (
            <span className="shrink-0 text-[9px] text-muted-foreground/50 ml-1">
              {comp.children!.length}
            </span>
          )}
        </div>

        <div className={`flex items-center gap-0.5 shrink-0 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <button onClick={(e) => { e.stopPropagation(); onMoveLayer(comp.id, 'forward'); }} className="p-1 hover:bg-background rounded" title="Bring Forward">
            <ChevronUp className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveLayer(comp.id, 'backward'); }} className="p-1 hover:bg-background rounded" title="Send Backward">
            <ChevronDown className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(comp.id); }} className="p-1 hover:bg-red-100 text-red-500 rounded" title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="border-l border-border/40 ml-4">
          {comp.children!.map(child => (
            <LayerRow
              key={child.id}
              comp={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onMoveLayer={onMoveLayer}
              searchQuery={searchQuery}
              draggingId={draggingId}
              dragOverId={dragOverId}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LayerPanel({ 
  components, selectedId, onSelect, onDelete, onReorder, onMoveLayer, onReorderLayers,
}: LayerPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // No .reverse() — components render top-to-bottom matching canvas order
  const nestedLayers = useMemo(() => nestComponents(components), [components]);

  const flattenTree = (nodes: ComponentData[]): string[] => {
    const ids: string[] = [];
    for (const n of nodes) {
      ids.push(n.id);
      if (n.children?.length) ids.push(...flattenTree(n.children));
    }
    return ids;
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId || !onReorderLayers) return;

    const displayOrder = flattenTree(nestedLayers);
    const fromIdx = displayOrder.indexOf(draggingId);
    const toIdx = displayOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...displayOrder];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, draggingId);

    const idToComp = new Map(components.map(c => [c.id, c]));
    const newOrder = reordered.map(id => idToComp.get(id)).filter(Boolean) as ComponentData[];
    const seen = new Set(reordered);
    const extras = components.filter(c => !seen.has(c.id));
    onReorderLayers([...newOrder, ...extras].map(c => c.id));
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b bg-muted/10">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-purple-500 transition-colors" />
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-md py-1.5 pl-8 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {components.length > 0 && (
        <div className="px-3 py-1.5 border-b bg-muted/5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {components.length} layer{components.length !== 1 ? "s" : ""}
          </span>
          {draggingId && (
            <span className="text-[10px] text-purple-500 font-medium animate-pulse">Dragging...</span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {nestedLayers.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {searchQuery ? "No matching layers found." : "No layers yet."}
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {nestedLayers.map(comp => (
              <LayerRow
                key={comp.id}
                comp={comp}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
                onMoveLayer={onMoveLayer}
                searchQuery={searchQuery}
                draggingId={draggingId}
                dragOverId={dragOverId}
                onDragStart={(id) => setDraggingId(id)}
                onDragOver={(e, id) => { e.preventDefault(); if (id !== draggingId) setDragOverId(id); }}
                onDrop={handleDrop}
                onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}