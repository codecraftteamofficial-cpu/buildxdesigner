"use client"

import React, { useState, useRef } from "react"
import { useDrag } from "react-dnd"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { BlocksPalette } from "./BlocksPalette"
import { LayerPanel } from "./LayerPanel"
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
  Video,
  Blocks,
  Code2,
  CreditCard,
  Layers,
} from "lucide-react"
import type { ComponentData } from "../App"

interface DraggableComponentProps {
  type: string
  icon: React.ReactNode
  label: string
  props?: Record<string, any>
}

function DraggableComponent({ type, icon, label, props = {} }: DraggableComponentProps) {
  const dragRef = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: "component",
    item: { type, props },
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
  onAddComponent: (component: ComponentData) => void
  onToggle?: () => void
  components: ComponentData[]
  selectedId: string | null
  onSelect: (component: ComponentData | null) => void 
  onDelete: (id: string) => void
  onReorder: (id: string, direction: 'front' | 'back') => void
  onMoveLayer: (id: string, action: 'forward' | 'backward') => void
  activePageId: string // New prop to track the current page
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
  activePageId
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Filter layers to only show components belonging to the active page
  const filteredLayers = components.filter(c => 
    c.page_id === activePageId || 
    c.page_id === 'all' || 
    (!c.page_id && activePageId === 'home')
  );

  const basicComponents = [
    { type: "text", icon: <Type className="w-3.5 h-3.5" />, label: "Text", props: { content: "Sample Text" } },
    { type: "heading", icon: <Type className="w-3.5 h-3.5" />, label: "Heading", props: { content: "Heading", level: 1 } },
    { type: "button", icon: <MousePointer className="w-3.5 h-3.5" />, label: "Button", props: { text: "Click Me", variant: "default" } },
    { type: "image", icon: <ImageIcon className="w-3.5 h-3.5" />, label: "Image", props: { src: "", alt: "Image", width: 300, height: 200 } },
    { type: "container", icon: <Square className="w-3.5 h-3.5" />, label: "Container", props: {} },
  ]

  const layoutComponents = [
    { type: "navbar", icon: <Navigation className="w-3.5 h-3.5" />, label: "Navigation Bar", props: { brand: "Brand", links: ["Home", "About", "Contact"] } },
    { type: "hero", icon: <FileText className="w-3.5 h-3.5" />, label: "Hero Section", props: { title: "Welcome", subtitle: "Build amazing websites" } },
    { type: "footer", icon: <Menu className="w-3.5 h-3.5" />, label: "Footer", props: { copyright: "© 2024 Your Company" } },
    { type: "grid", icon: <Grid3X3 className="w-3.5 h-3.5" />, label: "Grid Layout", props: { columns: 3 } },
  ]

  const formComponents = [
    { type: "input", icon: <FileText className="w-3.5 h-3.5" />, label: "Input Field", props: { placeholder: "Enter text...", type: "text" } },
    { type: "textarea", icon: <FileText className="w-3.5 h-3.5" />, label: "Text Area", props: { placeholder: "Enter message..." } },
    { type: "form", icon: <Mail className="w-3.5 h-3.5" />, label: "Contact Form", props: { title: "Contact Us" } },
  ]

  const mediaComponents = [
    { type: "video", icon: <Video className="w-3.5 h-3.5" />, label: "Video", props: { src: "", poster: "" } },
    { type: "gallery", icon: <ImageIcon className="w-3.5 h-3.5" />, label: "Image Gallery", props: { images: [] } },
  ]

  return (
    <div id="sidebar-palette" className="w-full bg-card flex flex-col h-full overflow-hidden sidebar-compact">
      <Tabs defaultValue="blocks" className="flex flex-col h-full overflow-hidden">
        <div className="border-b p-3 shrink-0">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="blocks" className="flex items-center gap-1.5 text-xs h-7">
              <Blocks className="w-3.5 h-3.5" />
              Blocks
            </TabsTrigger>
            <TabsTrigger value="components" className="flex items-center gap-1.5 text-xs h-7">
              <Code2 className="w-3.5 h-3.5" />
              Comps
            </TabsTrigger>
            <TabsTrigger value="layers" className="flex items-center gap-1.5 text-xs h-7">
              <Layers className="w-3.5 h-3.5" />
              Layers
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="blocks" className="flex-1 mt-0 border-0 p-0 overflow-hidden">
          <BlocksPalette onSelectBlock={onAddComponent} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </TabsContent>

        <TabsContent value="components" className="flex-1 mt-0 border-0 p-3 overflow-y-auto">
          <div className="space-y-3">
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Basic Elements</h4>
              <div className="space-y-1.5">
                {basicComponents.map((component) => (
                  <DraggableComponent key={component.type} {...component} />
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Layout</h4>
              <div className="space-y-1.5">
                {layoutComponents.map((component) => (
                  <DraggableComponent key={component.type} {...component} />
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Forms</h4>
              <div className="space-y-1.5">
                {formComponents.map((component) => (
                  <DraggableComponent key={component.type} {...component} />
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Media</h4>
              <div className="space-y-1.5">
                {mediaComponents.map((component) => (
                  <DraggableComponent key={component.type} {...component} />
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Integrations</h4>
              <div className="space-y-1.5">
                <DraggableComponent
                  type="paymongo-button"
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                  label="PayMongo Button"
                  props={{
                    label: "Buy Now",
                    amount: 100,
                    description: "Product Purchase",
                    currency: "PHP"
                  }}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="layers" className="flex-1 mt-0 border-0 overflow-hidden">
          <LayerPanel 
            components={filteredLayers} // Only pass components for the active page
            selectedId={selectedId}
            onSelect={(id) => {
              const component = components.find(c => c.id === id) || null;
              onSelect(component);
            }}
            onDelete={onDelete}
            onReorder={onReorder}
            onMoveLayer={onMoveLayer}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}