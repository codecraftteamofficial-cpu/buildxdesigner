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
  onMoveLayer 
}: LayerPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const getComponentName = (comp: ComponentData) => {
    return comp.props?.content || comp.props?.text || comp.props?.title || comp.type;
  };

  // FIXED: No longer reverse() — components array order now reflects PHP document
  // order (top of file = index 0 = top of layer list). This keeps the layer panel
  // in sync with the order components appear in the PHP source after a sync.
  const filteredLayers = components.filter((comp) =>
    getComponentName(comp).toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        {filteredLayers.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {searchQuery ? "No matching layers found." : "No layers yet."}
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filteredLayers.map((comp) => {
              const isSelected = selectedId === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => onSelect(comp.id)}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                    isSelected ? "bg-purple-500/10 text-purple-600 shadow-sm" : "hover:bg-accent text-muted-foreground"
                  }`}
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
                      className="p-1 hover:bg-background rounded" title="Move Up in Document"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveLayer(comp.id, 'backward'); }}
                      className="p-1 hover:bg-background rounded" title="Move Down in Document"
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