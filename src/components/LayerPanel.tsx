"use client";

import React, { useState } from "react";
import { 
  Type, Square, ImageIcon, Navigation, MousePointer, 
  FileText, Mail, Menu, Grid3X3, Video, CreditCard,
  Trash2, ChevronUp, ChevronDown, Search, X
} from "lucide-react";
import type { ComponentData } from "../App";

interface LayerPanelProps {
  components: ComponentData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'front' | 'back') => void;
  onMoveLayer: (id: string, action: 'forward' | 'backward') => void;
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

export function LayerPanel({ 
  components, 
  selectedId, 
  onSelect, 
  onDelete, 
   onReorder,
  onMoveLayer 
}: LayerPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
    const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const getComponentName = (comp: ComponentData) => {
    return comp.props?.content || comp.props?.text || comp.props?.title || comp.type;
  };

 
  const filteredLayers = components.filter((comp) =>
    getComponentName(comp).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayLayers = [...filteredLayers].reverse();

  const componentIndexMap = new Map(
    components.map((component, index) => [component.id, index]),
  );

  const moveLayerToDisplayIndex = (layerId: string, displayIndex: number) => {
    const currentIndex = components.findIndex((c) => c.id === layerId);
    if (currentIndex === -1) return;

    const desiredUnderlyingIndex = components.length - 1 - displayIndex;
    const clampedIndex = Math.max(
      0,
      Math.min(desiredUnderlyingIndex, components.length - 1),
    );

    if (currentIndex === clampedIndex) return;

    const remaining = components.filter((c) => c.id !== layerId);
    if (clampedIndex <= 0) {
      onReorder(layerId, "back");
      return;
    }
    if (clampedIndex >= remaining.length) {
      onReorder(layerId, "front");
      return;
    }

    const target = remaining[clampedIndex];
    if (target) onReorder(layerId, target.id as any);
  };


  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Bar Area */}
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
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Layer List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         {displayLayers.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {searchQuery ? "No matching layers found." : "No layers yet."}
          </div>
        ) : (
        <div data-tour="layers-tree" className="p-2 space-y-0.5">
          {displayLayers.map((comp, displayIndex) => {
            const isSelected = selectedId === comp.id;
            const underlyingIndex = componentIndexMap.get(comp.id) ?? -1;
            const canMoveUp = underlyingIndex >= 0 && underlyingIndex < components.length - 1;
            const canMoveDown = underlyingIndex > 0;
            return (
              <div
                key={comp.id}
                data-tour="layer-item"
                draggable={!searchQuery}
                  onDragStart={() => setDraggedLayerId(comp.id)}
                  onDragOver={(e) => {
                    if (!draggedLayerId || searchQuery) return;
                    e.preventDefault();
                    setDragOverLayerId(comp.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!draggedLayerId || searchQuery) return;
                    moveLayerToDisplayIndex(draggedLayerId, displayIndex);
                    setDraggedLayerId(null);
                    setDragOverLayerId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedLayerId(null);
                    setDragOverLayerId(null);
                  }}
                  onClick={() => onSelect(comp.id)}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                    isSelected ? "bg-purple-500/10 text-purple-600 shadow-sm" : "hover:bg-accent text-muted-foreground"
                  } ${dragOverLayerId === comp.id ? "ring-1 ring-purple-400 bg-purple-500/10" : ""}`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="shrink-0 opacity-70">{getLayerIcon(comp.type)}</span>
                    <span className="text-xs truncate font-medium">
                      {getComponentName(comp)}
                    </span>
                  </div>

                  <div className={`flex items-center gap-0.5 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveLayer(comp.id, 'forward'); }}
                       disabled={!canMoveUp}
                      className="p-1 hover:bg-background rounded disabled:opacity-40 disabled:cursor-not-allowed" title="Move Up (towards front)"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveLayer(comp.id, 'backward'); }}
                      disabled={!canMoveDown}
                      className="p-1 hover:bg-background rounded disabled:opacity-40 disabled:cursor-not-allowed" title="Move Down (towards back)"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(comp.id); }}
                      className="p-1 hover:bg-red-100 text-red-500 rounded" title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}