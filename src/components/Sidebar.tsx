"use client";

import React, { useState, useRef } from "react";
import { useDrag } from "react-dnd";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BlocksPalette } from "./BlocksPalette";
import { LayerPanel } from "./LayerPanel";
import {
  Type,
  Square,
  ImageIcon,
  Navigation,
  MousePointer,
  FileText,
  Mail,
  Menu,
  Grid3X3,
  Blocks,
  Code2,
  CreditCard,
  Layers,
  ChevronDown,
  Users,
  BoxSelect,
  Plus,
  Trash2,
  Pencil,
  Upload,
  Download,
} from "lucide-react";
import type { ComponentData } from "../App";
import { CustomComponentModal } from "./CustomComponentModal";
import { ImportComponentModal } from "./ImportComponentModal";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface DraggableComponentProps {
  type: string;
  icon: React.ReactNode;
  label: string;
  props?: Record<string, any>;
  componentId?: string;
  style?: Record<string, any>
}

function DraggableComponent({
  type,
  icon,
  label,
  props = {}, style = {},
  componentId,
}: DraggableComponentProps) {
  const dragRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "component",
    item: () => ({
      type,
      props, style,
      id: `${componentId ?? "cc"}-drop-${Math.random().toString(36).slice(2, 8)}`,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drag(dragRef);

  return (
    <div
      ref={dragRef}
      className={`p-2 border rounded-md cursor-move hover:bg-accent transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
    </div>
  );
}

interface SidebarProps {
  onAddComponent: (component: ComponentData) => void;
  onToggle?: () => void;
  components: ComponentData[];
  selectedId: string | null;
  onSelect: (component: ComponentData | null) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: "front" | "back") => void;
  onMoveLayer: (id: string, action: "forward" | "backward") => void;
  activePageId: string; // New prop to track the current page
  customComponents?: any[];
  onSaveCustomComponent?: (
    name: string,
    description: string,
    html: string,
    css: string,
    js: string, php: string) => Promise<void>;
  onUpdateCustomComponent?: (
    id: string,
    name: string,
    description: string,
    html: string,
    css: string,
    js: string,
    php: string
  ) => Promise<void>;
  onDeleteCustomComponent?: (id: string) => void;
  onExportComponent?: (component: any) => Promise<void>;
  onImportedComponent?: () => void;
  projectId?: string;
}

export function Sidebar({
  onAddComponent,
  onToggle,
  components,
  selectedId,
  onSelect,
  onDelete,
  onReorder,
  onMoveLayer,
  activePageId,
  customComponents = [],
  onSaveCustomComponent,
  onUpdateCustomComponent,
  onDeleteCustomComponent,
  onExportComponent,
  onImportedComponent,
  projectId = "",
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any | null>(null);

  // Component deletion confirmation state
  const [showDeleteComponentDialog, setShowDeleteComponentDialog] =
    useState(false);
  const [pendingDeleteComponent, setPendingDeleteComponent] =
    useState<any>(null);

  const openDeleteComponentDialog = (component: any) => {
    setPendingDeleteComponent(component);
    setShowDeleteComponentDialog(true);
  };

  const handleDeleteComponent = () => {
    if (pendingDeleteComponent) {
      onDeleteCustomComponent?.(
        pendingDeleteComponent.cc_id || pendingDeleteComponent.id,
      );
      toast.success(`"${pendingDeleteComponent.name}" has been deleted.`);
      setShowDeleteComponentDialog(false);
      setPendingDeleteComponent(null);
    }
  };

  // Filter layers to only show components belonging to the active page
  const filteredLayers = components.filter((c) => {
    if (c.page_ids && c.page_ids.length > 0) {
      if (c.page_ids.includes("all")) return true;
      return c.page_ids.includes(activePageId || "home");
    }

    return (
      c.page_id === activePageId ||
      c.page_id === "all" ||
      (!c.page_id && activePageId === "home")
    );
  });

  return (
    <div
      id="sidebar-palette"
      data-tour="sidebar-palette"
      className="w-full bg-card flex flex-col h-full overflow-hidden sidebar-compact"
    >
      <Tabs
        defaultValue="blocks"
        className="flex flex-col h-full overflow-hidden"
      >
        <div className="border-b p-3 shrink-0">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger
              value="blocks"
              className="flex items-center gap-1.5 text-xs h-7"
            >
              <Blocks className="w-3.5 h-3.5" />
              Blocks
            </TabsTrigger>
            <TabsTrigger
              value="components"
              className="flex items-center gap-1.5 text-xs h-7 shrink-0"
            >
              <Code2 className="w-3.5 h-3.5" />
              Custom
            </TabsTrigger>
            <TabsTrigger
              value="layers"
              className="flex items-center gap-1.5 text-xs h-7"
            >
              <Layers className="w-3.5 h-3.5" />
              Layers
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="blocks"
          className="flex-1 mt-0 border-0 p-0 overflow-hidden"
        >
          <BlocksPalette
            onSelectBlock={onAddComponent}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </TabsContent>

        <TabsContent
          value="components"
          className="flex-1 mt-0 border-0 p-3 overflow-y-auto"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                className="flex-1 justify-start gap-2"
                variant="outline"
                onClick={() => {
                  setEditingComponent(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Create
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Download className="w-4 h-4" />
                Import
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Custom Components
                </h4>
                <div className="space-y-2">
                  {customComponents.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground text-center py-4 border border-dashed rounded-md">
                      No custom components yet.
                    </div>
                  ) : (
                    customComponents.map((cc) => (
                      <div key={cc.id} className="group relative">
                        <DraggableComponent
                          type="custom-component"
                          icon={<Code2 className="w-3.5 h-3.5" />}
                          label={cc.name}
                          props={{
                            ...cc.component_json.props,
                          }}
                          componentId={cc.id}
                           style={cc.component_json.style || {
                             width: "100%",
                             minHeight: "200px"
                           }}
                        />
                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingComponent({
                                id: cc.id,
                                name: cc.name,
                                description:
                                  cc.component_json.props.description || "",
                                html: cc.component_json.props.html || "",
                                css: cc.component_json.props.css || "",
                                js: cc.component_json.props.js || '',
                                php: cc.component_json.props.php || '',
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-1 hover:bg-primary/10 hover:text-primary rounded"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExportComponent?.(cc);
                            }}
                            className="p-1 hover:bg-green-500/10 hover:text-green-600 rounded"
                            title="Publish to community"
                          >
                            <Upload className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteComponentDialog(cc);
                            }}
                            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <CustomComponentModal
          isOpen={isModalOpen}
          initialData={editingComponent}
          onClose={() => {
            setIsModalOpen(false);
            setEditingComponent(null);
          }}
          onSave={onSaveCustomComponent || (async (_n, _d, _h, _c, _j, _p) => {})}
          onUpdate={onUpdateCustomComponent}
          projectId={projectId}
        />

        <ImportComponentModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          projectId={projectId}
          onImported={() => {
            onImportedComponent?.();
            setIsImportModalOpen(false);
          }}
        />

        <TabsContent
          value="layers"
          className="flex-1 mt-0 border-0 overflow-hidden"
        >
          <LayerPanel
            components={filteredLayers} // Only pass components for the active page
            selectedId={selectedId}
            onSelect={(id) => {
              const component = components.find((c) => c.id === id) || null;
              onSelect(component);
            }}
            onDelete={onDelete}
            onReorder={onReorder}
            onMoveLayer={onMoveLayer}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Component Confirmation Dialog */}
      <Dialog
        open={showDeleteComponentDialog}
        onOpenChange={(open) => {
          setShowDeleteComponentDialog(open);
          if (!open) setPendingDeleteComponent(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete component?</DialogTitle>
            <DialogDescription>
              This will delete "
              {pendingDeleteComponent?.name || "this component"}". This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteComponentDialog(false);
                setPendingDeleteComponent(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteComponent}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
