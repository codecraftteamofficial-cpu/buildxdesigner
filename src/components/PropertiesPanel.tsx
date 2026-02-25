"use client"

import React, { useState } from "react"
import type { ComponentData } from "../App"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Checkbox } from "./ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { RangeSlider } from "./ui/range-slider"
import {
  X,
  Upload,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Underline,
  Italic,
  Plus,
  Trash2,
  MousePointer,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "../supabase/config/supabaseClient"
type ActionType = "onClick" | "onHover" | "onFocus" | "onBlur"
type ActionHandlerType = "custom" | "navigate" | "scroll" | "copy" | "toggle" | "supabase"

interface Action {
  id: string
  type: ActionType
  handlerType: ActionHandlerType
  handler: string
  // Additional fields for specific handler types
  url?: string // For navigate
  target?: "_blank" | "_self" | "_parent" | "_top"
  selector?: string
  textToCopy?: string // For copy
  toggleState?: boolean // For toggle
  supabaseOperation?: "insert" | "update" | "delete" | "select"
  supabaseTable?: string
  supabaseUrl?: string
  supabaseKey?: string
  supabaseData?: Record<string, string>
}

interface PropertiesPanelProps {
  selectedComponent: ComponentData | null
  onUpdateComponent: (id: string, updates: Partial<ComponentData>) => void
  onUpdateStyle: (id: string, style: Record<string, any>) => void
  onUpdateLayout: (id: string, layout: { width?: number; height?: number; x?: number; y?: number }) => void
  onReorderComponent?: (id: string, direction: "front" | "back") => void
  canvasBackgroundColor?: string
  showCanvasGrid?: boolean
  onUpdateCanvasBackground?: (color: string) => void
  onToggleCanvasGrid?: (show: boolean) => void
  pages?: { id: string; name: string }[]
  activePageId?: string
}

export function PropertiesPanel({
  selectedComponent,
  onUpdateComponent,
  onUpdateStyle,
  onUpdateLayout,
  onReorderComponent,
  canvasBackgroundColor = "#ffffff",
  showCanvasGrid = true,
  onUpdateCanvasBackground,
  onToggleCanvasGrid,
  pages,
  activePageId,
}: PropertiesPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("content")
  const [isPickingElement, setIsPickingElement] = useState<string | null>(null) // actionId or null
  const [pickingMode, setPickingMode] = useState<{ type: "selector" | "column"; column?: string } | null>(null)
  const [boxShadowValues, setBoxShadowValues] = useState({
    hOffset: 0,
    vOffset: 2,
    blur: 4,
    spread: 0,
    color: "rgba(0,0,0,0.1)",
    inset: false,
  })

  // Helper functions for generating handlers
  const generateScrollHandler = (selector: string) => {
    const cleanSelector = selector.replace(/'/g, "\\'")
    return `{
      try {
        const selector = '${cleanSelector}';
        const cleanId = selector.startsWith('#') ? selector.substring(1) : selector;
        
        const element = document.getElementById(cleanId) || 
                       document.querySelector(selector) ||
                       (!selector.startsWith('#') && !selector.startsWith('.') ? document.querySelector('#' + selector) : null) ||
                       document.querySelector('[data-component-id="' + cleanId + '"]');
        
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
          return true;
        } else {
          console.warn('Scroll target not found:', selector);
          return false;
        }
      } catch (error) {
        console.error('Error in scroll handler:', error);
        return false;
      }
    }`
  }

  const generateToggleHandler = (selector: string) => {
    const cleanSelector = selector.replace(/'/g, "\\'")
    return `{
      try {
        const selector = '${cleanSelector}';
        const cleanId = selector.startsWith('#') ? selector.substring(1) : selector;
        
        let elements = document.querySelectorAll(selector);
        
        if (elements.length === 0) {
           // Try by ID and data-component-id
           elements = document.querySelectorAll('[id="' + cleanId + '"], [data-component-id="' + cleanId + '"]');
           if (elements.length === 0 && !selector.startsWith('#') && !selector.startsWith('.')) {
              elements = document.querySelectorAll('#' + selector);
           }
        }
        
        if (elements.length > 0) {
          elements.forEach(el => {
            const currentDisplay = window.getComputedStyle(el).display;
            (el as HTMLElement).style.display = currentDisplay === 'none' ? 'block' : 'none';
          });
          return true;
        } else {
          console.warn('Toggle target not found:', selector);
          return false;
        }
      } catch (error) {
        console.error('Error in toggle handler:', error);
        return false;
      }
    }`
  }

  const generateSupabaseHandler = (action: Action) => {
    const table = action.supabaseTable || "table_name"
    const operation = action.supabaseOperation || "insert"
    const dataMapping = action.supabaseData || {}

    return `{
  try {
    const table = '${table.replace(/^public\./, '')}';
    const operation = '${operation}';
    const dataMapping = ${JSON.stringify(dataMapping)
      };

  const recordData = {};

  Object.entries(dataMapping).forEach(([col, valOrId]) => {
    const cleanId = (typeof valOrId === 'string' && valOrId.startsWith('#')) ? valOrId.substring(1) : valOrId;
    let element = document.getElementById(cleanId);

    if (!element && typeof valOrId === 'string') {
      element = document.querySelector(valOrId);
    }

    if (element && 'value' in element) {
      recordData[col] = element.value;
    } else if (element) {
      recordData[col] = element.innerText;
    } else {
      recordData[col] = valOrId;
    }
  });

  console.log('[Supabase Action] Executing ' + operation + ' on ' + table, recordData);

  // This is a placeholder for the actual execution which happens in the preview/production environment
  // via the window.dispatchEvent('supabase-action', ...) or direct client call.

  window.dispatchEvent(new CustomEvent('supabase-action', {
    detail: { table, operation, data: recordData }
  }));

  return true;
} catch (error) {
  console.error('Error in Supabase handler:', error);
  return false;
}
    }`
  }

  // Handle element picked from the preview
  const handleElementPicked = (element: HTMLElement) => {
    if (!isPickingElement || !selectedComponent) return

    const actionId = isPickingElement
    const actions = [...(selectedComponent.props?.actions || [])]
    const actionIndex = actions.findIndex((a) => a.id === actionId)

    if (actionIndex === -1) return

    const action = actions[actionIndex]

    // Find the component ID from the picked element or its parents
    const componentWrapper = element.closest("[data-component-id]")
    const componentId = componentWrapper?.getAttribute("data-component-id")

    let targetSelector = ""

    if (componentId) {
      // If we found a component, we want to use a stable ID
      // Check if the clicked element already has an ID
      if (element.id && !element.id.startsWith("radix-")) {
        targetSelector = element.id
      } else {
        // If no ID, generate one and assign it to the component
        targetSelector = `section - ${componentId.slice(0, 8)} `

        // Update the target component to have this ID
        // This ensures the ID persists and is rendered by RenderableComponent
        onUpdateComponent(componentId, {
          props: {
            elementId: targetSelector,
          },
        })
      }
    } else {
      // Fallback for non-component elements (e.g. static elements)
      targetSelector = element.id || `element - ${Date.now()} `
      if (!element.id) {
        element.id = targetSelector
      }
    }

    // Generate the handler based on the action type
    let handler = ""
    if (action.handlerType === "scroll") {
      handler = generateScrollHandler(targetSelector)
    } else if (action.handlerType === "toggle") {
      handler = generateToggleHandler(targetSelector)
    }

    // Update the action with the element's ID and generated handler
    let updatedAction: Action = { ...action }

    if (pickingMode?.type === "column" && pickingMode.column) {

      updatedAction = {
        ...action,
        supabaseData: {
          ...(action.supabaseData || {}),
          [pickingMode.column]: targetSelector,
        },
      }
    } else {
      updatedAction = {
        ...action,
        selector: targetSelector,
        handler: handler || action.handler,
      }
    }

    const updatedActions = [...actions]
    updatedActions[actionIndex] = updatedAction

    onUpdateComponent(selectedComponent.id, {
      props: {
        ...selectedComponent.props,
        actions: updatedActions,
      },
    })

    setIsPickingElement(null)
    setPickingMode(null)
  }

  // Expose the picker handler to the window for the preview to call
  React.useEffect(() => {
    ; (window as any).handleElementPicked = handleElementPicked
    return () => {
      delete (window as any).handleElementPicked
    }
  }, [isPickingElement, selectedComponent])

  const startElementPicking = (actionId: string) => {
    setIsPickingElement(actionId)
    // Notify the preview to start element selection
    window.postMessage({ type: "START_ELEMENT_PICKING" }, "*")

    // Auto-cancel after 30 seconds if no element is selected
    setTimeout(() => {
      if (isPickingElement === actionId) {
        setIsPickingElement(null)
        setPickingMode(null)
      }
    }, 30000)
  }

  if (!selectedComponent) {
    return (
      <div id="properties-panel" className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3">Canvas Properties</h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="canvasBackground" className="text-xs">
                Canvas Background
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="canvasBackground"
                  type="color"
                  value={canvasBackgroundColor}
                  onChange={(e) => onUpdateCanvasBackground?.(e.target.value)}
                  className="w-10 h-8 p-1 border rounded"
                />
                <Input
                  value={canvasBackgroundColor}
                  onChange={(e) => onUpdateCanvasBackground?.(e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showGrid" className="text-xs">
                Show Grid
              </Label>
              <input
                id="showGrid"
                type="checkbox"
                checked={showCanvasGrid}
                onChange={(e) => onToggleCanvasGrid?.(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">Select a component to edit its properties</p>
        </div>
      </div>
    )
  }

  const updateProps = <K extends keyof ComponentData["props"]>(key: K, value: any) => {
    if (!selectedComponent) return

    console.log("[v0] Updating prop:", key, "with value:", value)

    // Standard handling for components with direct props
    onUpdateComponent(selectedComponent.id, {
      props: {
        ...selectedComponent.props,
        [key]: value,
      },
    })
  }

  const updateStyle = (key: string, value: any) => {
    if (!selectedComponent) return

    const updatedComponent = {
      ...selectedComponent,
      style: {
        ...selectedComponent.style,
        [key]: value,
      },
    }

    onUpdateComponent(selectedComponent.id, updatedComponent)
  }

  const renderPropertyInputs = () => {
    const { type, props } = selectedComponent

    switch (type) {
      case "text":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="content" className="text-xs">
                Content
              </Label>
              <Textarea
                id="content"
                value={props.content || ""}
                onChange={(e) => updateProps("content", e.target.value)}
                placeholder="Enter text content"
                className="min-h-[60px] text-xs mt-1"
              />
            </div>
          </div>
        )

      case "heading":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="content" className="text-xs">
                Content
              </Label>
              <Input
                id="content"
                value={props.content || ""}
                onChange={(e) => updateProps("content", e.target.value)}
                placeholder="Heading text"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fontSize" className="text-xs">
                Font Size (px)
              </Label>
              <Input
                id="fontSize"
                type="number"
                min="10"
                max="72"
                value={
                  selectedComponent.style?.fontSize
                    ? Number.parseInt(String(selectedComponent.style.fontSize).replace("px", ""))
                    : "24"
                }
                onChange={(e) => updateStyle("fontSize", `${e.target.value} px`)}
                className="h-8 text-xs mt-1"
              />
            </div>

            {/* Text Styling */}
            <div className="pt-2 border-t border-border">
              <Label className="text-xs font-medium">Text Style</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label htmlFor="textColor" className="text-xs">
                    Text Color
                  </Label>
                  <Input
                    id="textColor"
                    type="color"
                    value={selectedComponent.style?.color || "#000000"}
                    onChange={(e) => updateStyle("color", e.target.value)}
                    className="h-8 w-full p-1 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bgColor" className="text-xs">
                    Background
                  </Label>
                  <Input
                    id="bgColor"
                    type="color"
                    value={selectedComponent.style?.backgroundColor || "transparent"}
                    onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                    className="h-8 w-full p-1 mt-1"
                  />
                </div>
              </div>

              <div className="mt-3">
                <Label className="text-xs block mb-1">Text Alignment</Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h - 8 text - xs ${selectedComponent.style?.textAlign === "left" ? "bg-accent" : ""} `}
                    onClick={() => updateStyle("textAlign", "left")}
                  >
                    <AlignLeft className="h-3.5 w-3.5 mr-1" />
                    Left
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h - 8 text - xs ${selectedComponent.style?.textAlign === "center" ? "bg-accent" : ""} `}
                    onClick={() => updateStyle("textAlign", "center")}
                  >
                    <AlignCenter className="h-3.5 w-3.5 mr-1" />
                    Center
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h - 8 text - xs ${selectedComponent.style?.textAlign === "right" ? "bg-accent" : ""} `}
                    onClick={() => updateStyle("textAlign", "right")}
                  >
                    <AlignRight className="h-3.5 w-3.5 mr-1" />
                    Right
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <Label htmlFor="fontSize" className="text-xs">
                    Font Size (px)
                  </Label>
                  <Input
                    id="fontSize"
                    type="number"
                    min="10"
                    max="72"
                    value={
                      selectedComponent.style?.fontSize
                        ? Number.parseInt(String(selectedComponent.style.fontSize).replace("px", ""))
                        : ""
                    }
                    onChange={(e) => updateStyle("fontSize", `${e.target.value} px`)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fontWeight" className="text-xs">
                    Font Weight
                  </Label>
                  <Select
                    value={selectedComponent.style?.fontWeight || "normal"}
                    onValueChange={(value: string) => updateStyle("fontWeight", value)}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="lighter">Light</SelectItem>
                      <SelectItem value="bolder">Bolder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3">
                <Label className="text-xs block mb-1">Text Decoration</Label>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h - 8 text - xs ${selectedComponent.style?.textDecoration?.includes("underline") ? "bg-accent" : ""} `}
                    onClick={() => {
                      const currentDecoration = selectedComponent.style?.textDecoration || ""
                      const newDecoration = currentDecoration.includes("underline")
                        ? currentDecoration.replace("underline", "").trim()
                        : `${currentDecoration} underline`.trim()
                      updateStyle("textDecoration", newDecoration || "none")
                    }}
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h - 8 text - xs ${selectedComponent.style?.fontStyle === "italic" ? "bg-accent" : ""} `}
                    onClick={() =>
                      updateStyle("fontStyle", selectedComponent.style?.fontStyle === "italic" ? "normal" : "italic")
                    }
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div className="pt-2 border-t border-border">
              <Label className="text-xs font-medium">Spacing</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label htmlFor="padding" className="text-xs">
                    Padding (px)
                  </Label>
                  <Input
                    id="padding"
                    type="number"
                    min="0"
                    max="50"
                    value={
                      selectedComponent.style?.padding
                        ? Number.parseInt(String(selectedComponent.style.padding).replace("px", ""))
                        : 8
                    }
                    onChange={(e) => updateStyle("padding", `${e.target.value} px`)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="margin" className="text-xs">
                    Margin (px)
                  </Label>
                  <Input
                    id="margin"
                    type="number"
                    min="0"
                    max="50"
                    value={
                      selectedComponent.style?.margin
                        ? Number.parseInt(String(selectedComponent.style.margin).replace("px", ""))
                        : 0
                    }
                    onChange={(e) => updateStyle("margin", `${e.target.value} px`)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case "button":
        const actions: Action[] = (props.actions as Action[]) || []

        const addAction = () => {
          const newAction: Action = {
            id: `action - ${Date.now()} `,
            type: "onClick",
            handlerType: "custom",
            handler: "console.log('Button action triggered!');",
          }
          updateProps("actions", [...actions, newAction])
        }

        const updateAction = (id: string, updates: Partial<Action>) => {
          const updatedActions = actions.map((action: Action) =>
            action.id === id ? { ...action, ...updates } : action,
          )
          updateProps("actions", updatedActions)
        }

        const removeAction = (id: string) => {
          updateProps(
            "actions",
            actions.filter((action: Action) => action.id !== id),
          )
        }

        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="text" className="text-xs">
                Button Text
              </Label>
              <Input
                id="text"
                value={props.text || ""}
                onChange={(e) => updateProps("text", e.target.value)}
                placeholder="Click Me"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="variant" className="text-xs">
                Variant
              </Label>
              <Select
                value={props.variant || "default"}
                onValueChange={(value: string) => updateProps("variant", value)}
              >
                <SelectTrigger id="variant" className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="destructive">Destructive</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Actions</Label>
                <Button variant="ghost" size="xs" onClick={addAction} className="h-6 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Action
                </Button>
              </div>

              {actions.length === 0 ? (
                <div className="text-center py-4 border border-dashed rounded-md">
                  <p className="text-xs text-muted-foreground">No actions added</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((action: Action) => (
                    <div key={action.id} className="border rounded-md p-2 relative group">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                        <div className="flex-1 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1 min-w-0">
                              <Label className="text-xs">Event Type</Label>
                              <Select
                                value={action.type || "onClick"}
                                onValueChange={(value: ActionType) => updateAction(action.id, { type: value })}
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="onClick">On Click</SelectItem>
                                  <SelectItem value="onHover">On Hover</SelectItem>
                                  <SelectItem value="onFocus">On Focus</SelectItem>
                                  <SelectItem value="onBlur">On Blur</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 min-w-0">
                              <Label className="text-xs">Action Type</Label>
                              <Select
                                value={action.handlerType || "custom"}
                                onValueChange={(value: ActionHandlerType) => {
                                  let newHandler: string

                                  switch (value) {
                                    case "navigate":
                                      newHandler = `{
  try {
    window.open('${(action.url || "https://example.com").replace(new RegExp("'", "g"), "\\'")}', '${action.target || "_blank"}');
  return true;
} catch (error) {
  console.error('Error in navigation handler:', error);
  return false;
}
                                      }`
                                      break
                                    case "scroll":
                                      newHandler = `{
  try {
    const selector = '${(action.selector || "").replace(new RegExp("'", "g"), "\\'")}';
  // Try multiple selection methods
  let element = document.getElementById(selector) ||
    document.querySelector('#' + selector) ||
    document.querySelector(selector);

  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    console.log('Scrolled to element with selector:', selector);
    return true;
  } else {
    console.error('Element not found with selector:', selector);
    return false;
  }
} catch (error) {
  console.error('Error in scroll handler:', error);
  return false;
}
                                      }`
                                      break
                                    case "copy":
                                      newHandler = `navigator.clipboard.writeText('${(action.textToCopy || "Text to copy").replace(new RegExp("'", "g"), "\\'")}');`
                                      break
                                    case "toggle":
                                      newHandler = `{try {
                                        const selector = '${(action.selector || "").replace(new RegExp("'", "g"), "\\'")}';
                                        const element = document.getElementById(selector) || document.querySelector(selector);
                                        if (element) {
                                          element.style.display = element.style.display === 'none' ? '' : 'none';
                                          console.log('Toggled element with selector:', selector);
                                        } else {
                                          console.error('Element not found with selector:', selector);
                                        }
                                      } catch (error) {
                                        console.error('Error in toggle handler:', error);
                                      }
                                      }`
                                      break
                                    case "custom":
                                    default:
                                      newHandler = action.handler || "console.log('Action triggered!');"
                                  }

                                  updateAction(action.id, {
                                    ...action,
                                    handlerType: value,
                                    handler: newHandler,
                                  })
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="custom">Custom JavaScript</SelectItem>
                                  <SelectItem value="navigate">Navigate to URL</SelectItem>
                                  <SelectItem value="scroll">Scroll to Element</SelectItem>
                                  <SelectItem value="copy">Copy to Clipboard</SelectItem>
                                  <SelectItem value="toggle">Toggle Element</SelectItem>
                                  <SelectItem value="supabase">Supabase DB</SelectItem>
                                </SelectContent>
                              </Select >
                            </div >
                          </div >

                          {/* Action-specific inputs */}
                          {/* Scroll Action */}
                          {
                            action.handlerType === "scroll" && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">Element to Scroll To</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs bg-transparent"
                                    onClick={() => startElementPicking(action.id)}
                                  >
                                    <MousePointer className="h-3 w-3 mr-1" />
                                    Pick Element
                                  </Button>
                                </div>
                                <Input
                                  type="text"
                                  value={action.selector || ""}
                                  onChange={(e) => {
                                    const selector = e.target.value
                                    updateAction(action.id, {
                                      selector,
                                      handler: generateScrollHandler(selector),
                                    })
                                  }}
                                  placeholder="#element-id or .class-name"
                                  className="h-7 text-xs"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {action.selector
                                    ? `Selected: ${action.selector.startsWith("#") ? "#" : ""}${action.selector.replace(/^#/, "")}`
                                    : "Enter an element ID or CSS selector"}
                                </p>
                                {isPickingElement === action.id && (
                                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 mt-2">
                                    Click on an element in the preview to select it
                                  </div>
                                )}
                              </div>
                            )
                          }

                          {/* Navigate Action */}
                          {
                            action.handlerType === "navigate" && (
                              <div className="space-y-1">
                                <Label className="text-xs">URL</Label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <Input
                                    type="url"
                                    value={action.url || ""}
                                    onChange={(e) => {
                                      const url = e.target.value
                                      updateAction(action.id, {
                                        url,
                                        handler: `window.open('${url.replace(/'/g, "\\'")}', '${action.target || "_blank"}');`,
                                      })
                                    }}
                                    placeholder="https://example.com"
                                    className="h-7 text-xs w-full sm:flex-1"
                                  />
                                  <Select
                                    value={action.target || "_blank"}
                                    onValueChange={(value: "_blank" | "_self") => {
                                      const escapedUrl = (action.url || "https://example.com").replace(/'/g, "\\'")
                                      updateAction(action.id, {
                                        target: value,
                                        handler: `{
                                        try {
                                          window.open('${escapedUrl}', '${value}');
                                          return true;
                                        } catch (error) {
                                          console.error('Error in navigation handler:', error);
                                          return false;
                                        }
                                      }`,
                                      })
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-full sm:w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="_blank">New Tab</SelectItem>
                                      <SelectItem value="_self">Same Tab</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {action.selector
                                    ? `Selected: #${action.selector.replace(/^#/, "")}`
                                    : 'Click "Pick Element" to select a target'}
                                </p>
                                {isPickingElement === action.id && (
                                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 mt-2">
                                    Click on an element in the preview to select it
                                  </div>
                                )}
                              </div>
                            )
                          }

                          {
                            action.handlerType === "copy" && (
                              <div className="space-y-1">
                                <Label className="text-xs">Text to Copy</Label>
                                <Input
                                  value={action.textToCopy || ""}
                                  onChange={(e) => {
                                    const text = e.target.value
                                    updateAction(action.id, {
                                      textToCopy: text,
                                      handler: `navigator.clipboard.writeText('${text.replace(/'/g, "\\'")}');`,
                                    })
                                  }}
                                  placeholder="Text to copy to clipboard"
                                  className="h-7 text-xs w-full"
                                />
                              </div>
                            )
                          }

                          {/* Supabase Action */}
                          {
                            action.handlerType === "supabase" && (
                              <div className="space-y-3 pt-2 border-t border-dashed">
                                <Badge variant="outline" className="w-full justify-center bg-green-50 text-green-700 border-green-200">
                                  Supabase Integration
                                </Badge>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs h-7 bg-green-50/50 hover:bg-green-100 border-green-200"
                                  onClick={() => {
                                    const handler = generateSupabaseHandler(action)
                                    updateAction(action.id, { handler })
                                    toast.success("Supabase function updated")
                                  }}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" /> Update Function
                                </Button>

                                <div className="space-y-1">
                                  <Label className="text-xs">Operation</Label>
                                  <Select
                                    value={action.supabaseOperation || "insert"}
                                    onValueChange={(value: any) => updateAction(action.id, { supabaseOperation: value })}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="insert">Insert Row</SelectItem>
                                      <SelectItem value="update">Update Row</SelectItem>
                                      <SelectItem value="delete">Delete Row</SelectItem>
                                      <SelectItem value="select">Select Data</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs">Table Name</Label>
                                  <Input
                                    value={action.supabaseTable || ""}
                                    onChange={(e) => updateAction(action.id, { supabaseTable: e.target.value })}
                                    placeholder="e.g. users"
                                    className="h-7 text-xs"
                                  />
                                </div>

                                {/* Show mapping UI for ALL operations, but labeled differently */}
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium">
                                    {action.supabaseOperation === 'select'
                                      ? "Filter Conditions (WHERE)"
                                      : action.supabaseOperation === 'delete'
                                        ? "Record Identifier (e.g. id)"
                                        : "Column Mapping"}
                                  </Label>
                                  <div className="space-y-2">
                                    {/* Helper to add a mapping row */}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-7 text-xs"
                                      onClick={() => {
                                        const currentData = action.supabaseData || {}
                                        updateAction(action.id, {
                                          supabaseData: { ...currentData, "": "" }
                                        })
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Add Column
                                    </Button>

                                    {Object.entries(action.supabaseData || {}).map(([col, val], idx) => (
                                      <div key={idx} className="flex flex-col gap-1 p-2 border rounded bg-slate-50">
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder="Column"
                                            value={col}
                                            onChange={(e) => {
                                              const newData = { ...action.supabaseData }
                                              const newCol = e.target.value
                                              delete newData[col]
                                              newData[newCol] = val
                                              updateAction(action.id, { supabaseData: newData })
                                            }}
                                            className="h-6 text-xs flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => {
                                              const newData = { ...action.supabaseData }
                                              delete newData[col]
                                              updateAction(action.id, { supabaseData: newData })
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            placeholder="Value or Element ID"
                                            value={val}
                                            onChange={(e) => {
                                              const newData = { ...action.supabaseData }
                                              newData[col] = e.target.value
                                              updateAction(action.id, { supabaseData: newData })
                                            }}
                                            className="h-6 text-xs flex-1"
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className={`h-6 w-6 ${isPickingElement === action.id && pickingMode?.column === col ? "bg-yellow-100 border-yellow-300" : ""}`}
                                            onClick={() => {
                                              setPickingMode({ type: "column", column: col })
                                              startElementPicking(action.id)
                                            }}
                                            title="Pick Input Element"
                                          >
                                            <MousePointer className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          {
                            action.handlerType === "toggle" && (
                              <div className="space-y-1">
                                <Label className="text-xs">CSS Selector</Label>
                                <Input
                                  value={action.selector || ""}
                                  onChange={(e) => {
                                    const selector = e.target.value
                                    updateAction(action.id, {
                                      selector,
                                      handler: generateToggleHandler(selector),
                                    })
                                  }}
                                  placeholder="element-id or .element"
                                  className="h-7 text-xs w-full font-mono"
                                />
                              </div>
                            )
                          }
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive self-end sm:self-auto"
                          onClick={() => removeAction(action.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {action.handlerType === "custom" && (
                        <div className="space-y-1 mt-2">
                          <Label className="text-xs">Action Handler</Label>
                          <Textarea
                            value={action.handler}
                            onChange={(e) => updateAction(action.id, { handler: e.target.value })}
                            placeholder="Enter JavaScript code..."
                            className="min-h-20 text-xs font-mono w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Enter JavaScript code to run on {action.type}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div >
          </div >
        )

      case "table":
        const headers = Array.isArray(props.headers) ? (props.headers as string[]) : []

        const addHeader = () => {
          updateProps("headers", [...headers, `Column ${headers.length + 1}`])
        }

        const updateHeader = (index: number, value: string) => {
          const newHeaders = [...headers]
          newHeaders[index] = value
          updateProps("headers", newHeaders)
        }

        const removeHeader = (index: number) => {
          const newHeaders = headers.filter((_, i) => i !== index)
          updateProps("headers", newHeaders)
        }

        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Table Name</Label>
              <Input
                value={props.tableName || ''}
                onChange={(e) => updateProps("tableName", e.target.value)}
                placeholder="Table Title"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Table Headers</Label>
                <Button variant="ghost" size="sm" onClick={addHeader} className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {headers.map((header, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={header}
                      onChange={(e) => updateHeader(idx, e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeader(idx)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {headers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No headers defined</p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Show Action Column</Label>
                <Switch
                  checked={props.showActions || false}
                  onCheckedChange={(checked: boolean) => updateProps("showActions", checked)}
                />
              </div>

              {props.showActions && (
                <div className="space-y-2 pl-2 border-l-2 border-muted ml-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showUpdate"
                      checked={props.showUpdateAction || false}
                      onCheckedChange={(checked: boolean) => updateProps("showUpdateAction", checked)}
                    />
                    <Label htmlFor="showUpdate" className="text-xs cursor-pointer">
                      Show Update Button
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showDelete"
                      checked={props.showDeleteAction || false}
                      onCheckedChange={(checked: boolean) => updateProps("showDeleteAction", checked)}
                    />
                    <Label htmlFor="showDelete" className="text-xs cursor-pointer">
                      Show Delete Button
                    </Label>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t space-y-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Supabase Source</Label>
                <Input
                  value={props.supabaseTable || ''}
                  onChange={(e) => updateProps("supabaseTable", e.target.value)}
                  placeholder="Supabase Table Name"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Sort Order</Label>
                <Select
                  value={props.fetchOrder || "desc"}
                  onValueChange={(value: "asc" | "desc") => updateProps("fetchOrder", value)}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Connect to a Supabase table to automatically populate headers and data.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={async () => {
                  if (!props.supabaseTable) {
                    toast.error("Please enter a Supabase table name")
                    return
                  }

                  try {
                    const tableName = props.supabaseTable.replace(/^public\./, '');
                    const { data, error } = await supabase
                      .from(tableName)
                      .select("*")
                      .limit(1)

                    if (error) throw error

                    if (data && data.length > 0) {
                      const detectedHeaders = Object.keys(data[0])
                      updateProps("headers", detectedHeaders)
                      toast.success(`Detected ${detectedHeaders.length} columns from ${props.supabaseTable}`)
                    } else {
                      toast.warning("Table is empty. Could not detect headers.")
                    }
                  } catch (err: any) {
                    toast.error("Failed to connect to Supabase: " + err.message)
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Sync Schema & Headers
              </Button>
            </div>
          </div>
        )

      case "paymongo-button":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="label" className="text-xs">Button Label</Label>
              <Input
                id="label"
                value={props.label || "Buy Now"}
                onChange={(e) => updateProps("label", e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="amount" className="text-xs">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={props.amount || 100}
                onChange={(e) => updateProps("amount", Number(e.target.value))}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="currency" className="text-xs">Currency</Label>
              <Input
                id="currency"
                value={props.currency || "PHP"}
                onChange={(e) => updateProps("currency", e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Input
                id="description"
                value={props.description || "Product Purchase"}
                onChange={(e) => updateProps("description", e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <p className="text-[10px] text-muted-foreground">
                💡 Payment methods are controlled by your PayMongo Dashboard. Go to Settings → Payment Methods to enable GCash, Maya, Cards, etc.
              </p>
            </div>
          </div>
        )

      case "carousel":
        const handleAddSlide = () => {
          const slides = Array.isArray(props.slides) ? props.slides : []
          const newSlide = {
            id: `slide-${Date.now()}`,
            src: "",
            alt: `Slide ${slides.length + 1}`,
            caption: `Slide ${slides.length + 1}`,
          }
          updateProps("slides", [...slides, newSlide])
        }

        const handleRemoveSlide = (index: number) => {
          const slides = Array.isArray(props.slides) ? props.slides : []
          const newSlides = [...slides]
          newSlides.splice(index, 1)
          updateProps("slides", newSlides)
        }

        const updateSlide = (index: number, field: string, value: string) => {
          const slides = Array.isArray(props.slides) ? props.slides : []
          const newSlides = [...slides]
          if (newSlides[index]) {
            newSlides[index] = { ...newSlides[index], [field]: value }
            updateProps("slides", newSlides)
          }
        }

        const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
          const file = e.target.files?.[0]
          if (!file) return

          try {
            const fileExt = file.name.split(".").pop()
            const fileName = `carousel/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

            const { data, error } = await supabase.storage.from("project-assets").upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            })

            if (error) {
              console.error("Error uploading file:", error)
              return
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from("project-assets").getPublicUrl(data.path)

            updateSlide(index, "src", publicUrl)
          } catch (error) {
            console.error("Error handling file upload:", error)
          } finally {
            e.target.value = ""
          }
        }

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Carousel Settings</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Autoplay</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoplay"
                      checked={(props as any).autoplay || false}
                      onCheckedChange={(val: boolean) => updateProps("autoplay" as any, val)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Show Arrows</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showArrows"
                      checked={(props as any).showArrows !== false}
                      onCheckedChange={(val: boolean) => updateProps("showArrows" as any, val)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Show Dots</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showDots"
                      checked={(props as any).showDots !== false}
                      onCheckedChange={(val: boolean) => updateProps("showDots" as any, val)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Infinite Loop</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="infinite"
                      checked={(props as any).infinite || false}
                      onCheckedChange={(val: boolean) => updateProps("infinite" as any, val)}
                    />
                  </div>
                </div>
              </div>
              {(props as any).autoplay && (
                <div>
                  <Label className="text-xs">Autoplay Speed (ms)</Label>
                  <Input
                    type="number"
                    value={(props as any).autoplaySpeed || 3000}
                    onChange={(e) => updateProps("autoplaySpeed" as any, Number.parseInt(e.target.value) || 3000)}
                    className="h-8 text-xs mt-1"
                    min="1000"
                    step="500"
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Slides</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs bg-transparent"
                  onClick={handleAddSlide}
                >
                  Add Slide
                </Button>
              </div>

              <div className="space-y-3">
                {((props as any).slides || []).map((slide: any, index: number) => (
                  <div key={slide.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium">Slide {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveSlide(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div>
                      <Label className="text-xs">Image URL</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={slide.src || ""}
                          onChange={(e) => updateSlide(index, "src", e.target.value)}
                          placeholder="Image URL or upload below"
                          className="h-8 text-xs flex-1"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <Label className="text-xs block mb-1">Or upload an image</Label>
                      <label className="flex items-center justify-center w-full h-8 px-3 py-1.5 text-xs border border-dashed rounded-md cursor-pointer hover:bg-accent/50 transition-colors">
                        <Upload className="w-3.5 h-3.5 mr-2" />
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, index)}
                        />
                      </label>
                    </div>

                    <div>
                      <Label className="text-xs">Alt Text</Label>
                      <Input
                        value={slide.alt || ""}
                        onChange={(e) => updateSlide(index, "alt", e.target.value)}
                        placeholder="Alt text for accessibility"
                        className="h-8 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Caption</Label>
                      <Input
                        value={slide.caption || ""}
                        onChange={(e) => updateSlide(index, "caption", e.target.value)}
                        placeholder="Caption text (optional)"
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "image":
        const handleSingleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0]
          if (!file) return

          try {
            const fileExt = file.name.split(".").pop()
            const fileName = `images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

            const { data, error } = await supabase.storage.from("project-assets").upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            })

            if (error) {
              console.error("Error uploading file:", error)
              return
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from("project-assets").getPublicUrl(data.path)

            updateProps("src", publicUrl)
          } catch (error) {
            console.error("Error handling file upload:", error)
          } finally {
            e.target.value = ""
          }
        }

        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="src" className="text-xs">
                Image URL
              </Label>
              <div className="flex gap-2">
                <Input
                  id="src"
                  value={props.src || ""}
                  onChange={(e) => updateProps("src", e.target.value)}
                  placeholder="https://example.com/image.jpg or upload below"
                  className="h-8 text-xs mt-1 flex-1"
                />
              </div>
            </div>
            <div className="relative">
              <Label className="text-xs block mb-1">Or upload an image</Label>
              <label className="flex items-center justify-center w-full h-8 px-3 py-1.5 text-xs border border-dashed rounded-md cursor-pointer hover:bg-accent/50 transition-colors">
                <Upload className="w-3.5 h-3.5 mr-2" />
                Choose File
                <input type="file" accept="image/*" className="hidden" onChange={handleSingleImageUpload} />
              </label>
              {props.src && props.src.startsWith("data:image/") && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Using uploaded image ({Math.round(props.src.length / 1024)} KB)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="alt" className="text-xs">
                Alt Text
              </Label>
              <Input
                id="alt"
                value={props.alt || ""}
                onChange={(e) => updateProps("alt", e.target.value)}
                placeholder="Image description"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="width" className="text-xs">
                  Width
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={props.width || ""}
                  onChange={(e) => updateProps("width", e.target.value)}
                  placeholder="300"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-xs">
                  Height
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={props.height || ""}
                  onChange={(e) => updateProps("height", e.target.value)}
                  placeholder="200"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>
        )

      case "navbar":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="brand" className="text-xs">
                Brand Name
              </Label>
              <Input
                id="brand"
                value={props.brand || ""}
                onChange={(e) => updateProps("brand", e.target.value)}
                placeholder="Your Brand"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="links" className="text-xs">
                Navigation Links (comma separated)
              </Label>
              <Input
                id="links"
                value={Array.isArray(props.links) ? props.links.join(", ") : ""}
                onChange={(e) =>
                  updateProps(
                    "links",
                    e.target.value.split(",").map((s) => s.trim()),
                  )
                }
                placeholder="Home, About, Contact"
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        )

      case "hero":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="title" className="text-xs">
                Title
              </Label>
              <Input
                id="title"
                value={props.title || ""}
                onChange={(e) => updateProps("title", e.target.value)}
                placeholder="Hero title"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subtitle" className="text-xs">
                Subtitle
              </Label>
              <Textarea
                id="subtitle"
                value={props.subtitle || ""}
                onChange={(e) => updateProps("subtitle", e.target.value)}
                placeholder="Hero subtitle"
                className="min-h-[60px] text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="buttonText" className="text-xs">
                Button Text
              </Label>
              <Input
                id="buttonText"
                value={props.buttonText || ""}
                onChange={(e) => updateProps("buttonText", e.target.value)}
                placeholder="Get Started"
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        )

      case "input":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="placeholder" className="text-xs">
                Placeholder
              </Label>
              <Input
                id="placeholder"
                value={props.placeholder || ""}
                onChange={(e) => updateProps("placeholder", e.target.value)}
                placeholder="Placeholder text"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="type" className="text-xs">
                Input Type
              </Label>
              <Select value={props.type || "text"} onValueChange={(value: string) => updateProps("type", value)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="tel">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "grid":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="orientation" className="text-xs">
                Orientation
              </Label>
              <Select
                value={props.orientation || "horizontal"}
                onValueChange={(value: string) => updateProps("orientation", value)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">Horizontal (Grid)</SelectItem>
                  <SelectItem value="vertical">Vertical (Stack)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(!props.orientation || props.orientation === 'horizontal') && (
              <div>
                <Label htmlFor="columns" className="text-xs">
                  Number of Columns
                </Label>
                <Input
                  id="columns"
                  type="number"
                  min="1"
                  max="12"
                  value={props.columns || "3"}
                  onChange={(e) => updateProps("columns", Number.parseInt(e.target.value))}
                  placeholder="3"
                  className="h-8 text-xs mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="gap" className="text-xs">
                Gap
              </Label>
              <Input
                id="gap"
                value={props.gap || "1rem"}
                onChange={(e) => updateProps("gap", e.target.value)}
                placeholder="1rem"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label htmlFor="padding" className="text-xs">
                Padding
              </Label>
              <Input
                id="padding"
                value={props.padding || "1rem"}
                onChange={(e) => updateProps("padding", e.target.value)}
                placeholder="1rem"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label htmlFor="justifyContent" className="text-xs">
                Justify Content
              </Label>
              <Select
                value={props.justifyContent || "start"}
                onValueChange={(value: string) => updateProps("justifyContent", value)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                  <SelectItem value="space-between">Space Between</SelectItem>
                  <SelectItem value="space-around">Space Around</SelectItem>
                  <SelectItem value="space-evenly">Space Evenly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alignItems" className="text-xs">
                Align Items
              </Label>
              <Select
                value={props.alignItems || "stretch"}
                onValueChange={(value: string) => updateProps("alignItems", value)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "container":
        return (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="container-id" className="text-xs">
                  Element ID
                </Label>
                <span className="text-xs text-muted-foreground">(for scroll-to targeting)</span>
              </div>
              <Input
                id="container-id"
                value={props.elementId || ""}
                onChange={(e) => updateProps("elementId", e.target.value)}
                placeholder="e.g., section1"
                className="h-8 text-xs font-mono mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use this ID in the scroll-to action of buttons or links
              </p>
            </div>
            <div>
              <Label htmlFor="container-content" className="text-xs">
                Container Text
              </Label>
              <Textarea
                id="container-content"
                value={props.content || ""}
                onChange={(e) => updateProps("content", e.target.value)}
                placeholder="Container - Drop components here"
                className="min-h-[60px] text-xs mt-1"
              />
            </div>
          </div>
        )

      case "form":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="form-title" className="text-xs">
                Form Title
              </Label>
              <Input
                id="form-title"
                value={props.title || ""}
                onChange={(e) => updateProps("title", e.target.value)}
                placeholder="Contact Form"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="submitText" className="text-xs">
                Submit Button Text
              </Label>
              <Input
                id="submitText"
                value={props.submitText || ""}
                onChange={(e) => updateProps("submitText", e.target.value)}
                placeholder="Submit"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="namePlaceholder" className="text-xs">
                Name Placeholder
              </Label>
              <Input
                id="namePlaceholder"
                value={props.namePlaceholder || ""}
                onChange={(e) => updateProps("namePlaceholder", e.target.value)}
                placeholder="Name"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="emailPlaceholder" className="text-xs">
                Email Placeholder
              </Label>
              <Input
                id="emailPlaceholder"
                value={props.emailPlaceholder || ""}
                onChange={(e) => updateProps("emailPlaceholder", e.target.value)}
                placeholder="Email"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="messagePlaceholder" className="text-xs">
                Message Placeholder
              </Label>
              <Input
                id="messagePlaceholder"
                value={props.messagePlaceholder || ""}
                onChange={(e) => updateProps("messagePlaceholder", e.target.value)}
                placeholder="Message"
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        )

      case "footer":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="copyright" className="text-xs">
                Copyright Text
              </Label>
              <Input
                id="copyright"
                value={props.copyright || ""}
                onChange={(e) => updateProps("copyright", e.target.value)}
                placeholder="© 2024 Your Company"
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        )

      case "textarea":
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="placeholder" className="text-xs">
                Placeholder
              </Label>
              <Input
                id="placeholder"
                value={props.placeholder || ""}
                onChange={(e) => updateProps("placeholder", e.target.value)}
                placeholder="Enter message..."
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">No specific properties available for this component type.</p>
          </div>
        )
    }
  }

  // Function to test scroll to element
  const testScrollToElement = () => {
    const element = document.getElementById("about-tab")
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      console.log("Scrolling to element:", element)
    } else {
      console.error('Element with ID "about-tab" not found')
      console.log(
        "Available elements with IDs:",
        Array.from(document.querySelectorAll("*[id]")).map((el) => el.id),
      )
    }
  }

  return (
    <div id="properties-panel" className="w-72 border-l bg-background flex flex-col h-full">
      {/* Component Header */}
      <div className="p-3 border-b shrink-0 bg-background hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Selected</span>
            <Button variant="outline" size="xs" className="h-6 text-xs bg-transparent" onClick={testScrollToElement}>
              Test Scroll
            </Button>
          </div>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {selectedComponent.type}
          </Badge>
        </div>
      </div>

      {/* Layering Controls */}
      {/* <div className="p-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium">Layer Order</Label>
        </div>  
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs bg-transparent"
            onClick={() => onReorderComponent?.(selectedComponent.id, "front")}
            title="Bring to Front"
          >
            Bring to Front
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs bg-transparent"
            onClick={() => onReorderComponent?.(selectedComponent.id, "back")}
            title="Send to Back"
          >
            Send to Back
          </Button>
        </div>
      </div> */}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 h-8 m-0 rounded-none border-b bg-background shrink-0">
          <TabsTrigger
            value="content"
            className="text-xs h-7 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Content
          </TabsTrigger>
          <TabsTrigger
            value="styling"
            className="text-xs h-7 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Styling
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="content" className="p-3 space-y-3 mt-0 h-full">
            <div className="space-y-4 pb-4">
              <div className="bg-muted/20 rounded-lg p-3 space-y-3 border border-border/60">
                <div className="space-y-1">
                  <Label htmlFor="element-id" className="text-xs font-medium">
                    Element ID
                  </Label>
                  <Input
                    id="element-id"
                    value={selectedComponent.props?.elementId || ""}
                    onChange={(e) => updateProps("elementId", e.target.value)}
                    placeholder="hero-section"
                    className="h-7 text-xs bg-accent/20 border-accent/40 focus:bg-accent/30 focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Used for anchor links and custom scripting. Must be unique on the page.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="element-class" className="text-xs font-medium">
                    CSS Classes
                  </Label>
                  <Input
                    id="element-class"
                    value={selectedComponent.props?.className || ""}
                    onChange={(e) => updateProps("className", e.target.value)}
                    placeholder="bg-gradient text-lg"
                    className="h-7 text-xs bg-accent/20 border-accent/40 focus:bg-accent/30 focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Separate multiple classes with spaces.</p>
                </div>
                {pages && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Page Assignment</Label>
                    <Select
                      value={selectedComponent.page_id || activePageId || "home"}
                      onValueChange={(val: string) => onUpdateComponent(selectedComponent.id, { page_id: val })}
                    >
                      <SelectTrigger className="h-7 text-xs w-full bg-accent/20 border-accent/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Global (All Pages)</SelectItem>
                        {pages.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {renderPropertyInputs()}
            </div>
          </TabsContent>

          <TabsContent value="styling" className="p-3 space-y-3 mt-0 h-full">
            <div className="pb-4">
              <div className="space-y-3">
                {/* Button Styling Section */}
                {selectedComponent.type === "button" && (
                  <div className="bg-muted/30 rounded-lg p-2.5 space-y-3">
                    <Label className="text-xs font-semibold">Button Styling</Label>

                    {/* Size Presets */}
                    <div>
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-muted-foreground">Size Preset</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={() => {
                            updateStyle("padding", "")
                            updateStyle("width", "")
                            updateStyle("height", "")
                          }}
                        >
                          Reset
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {[
                          { value: "sm", label: "Small", padding: "0.25rem 0.75rem", height: "1.5rem" },
                          { value: "default", label: "Medium", padding: "0.5rem 1rem", height: "2.25rem" },
                          { value: "lg", label: "Large", padding: "0.75rem 1.5rem", height: "2.75rem" },
                        ].map(({ value, label, padding, height }) => (
                          <Button
                            key={value}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-transparent"
                            onClick={() => {
                              updateStyle("padding", padding)
                              updateStyle("height", height)
                            }}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Width and Height */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Width</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="text"
                            value={selectedComponent.style?.width || ""}
                            onChange={(e) => updateStyle("width", e.target.value)}
                            placeholder="auto"
                            className="h-8 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateStyle("width", "")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Height</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="text"
                            value={selectedComponent.style?.height || ""}
                            onChange={(e) => updateStyle("height", e.target.value)}
                            placeholder="auto"
                            className="h-8 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateStyle("height", "")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Padding */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Padding</Label>
                      <div className="grid grid-cols-4 gap-1 mt-1">
                        {["Top", "Right", "Bottom", "Left"].map((side, i) => {
                          const prop = `padding${side}` as keyof React.CSSProperties
                          const value = selectedComponent.style?.[prop] || ""
                          return (
                            <div key={side} className="space-y-1">
                              <div className="text-[10px] text-center text-muted-foreground">{side[0]}</div>
                              <Input
                                value={value}
                                onChange={(e) => updateStyle(prop, e.target.value)}
                                placeholder="0"
                                className="h-8 text-xs text-center"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Styling Section - Only for text and heading components */}
                {/* Navbar Styling Section */}
                {selectedComponent.type === "navbar" && (
                  <div className="bg-muted/30 rounded-lg p-2.5 space-y-3">
                    <Label className="text-xs font-semibold">Navbar Styling</Label>

                    {/* Layout */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Layout</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <Label className="text-xs text-muted-foreground">Justify Content</Label>
                          <Select
                            value={selectedComponent.style?.justifyContent || "space-between"}
                            onValueChange={(value: string) => updateStyle("justifyContent", value)}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flex-start">Start</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="flex-end">End</SelectItem>
                              <SelectItem value="space-between">Space Between</SelectItem>
                              <SelectItem value="space-around">Space Around</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Align Items</Label>
                          <Select
                            value={selectedComponent.style?.alignItems || "center"}
                            onValueChange={(value: string) => updateStyle("alignItems", value)}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flex-start">Start</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="flex-end">End</SelectItem>
                              <SelectItem value="stretch">Stretch</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Background</Label>
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="color"
                            value={selectedComponent.style?.backgroundColor || "#ffffff"}
                            onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                            className="h-8 w-8 p-0 border rounded"
                          />
                          <Input
                            value={selectedComponent.style?.backgroundColor || "#ffffff"}
                            onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Text Color</Label>
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="color"
                            value={selectedComponent.style?.color || "#000000"}
                            onChange={(e) => updateStyle("color", e.target.value)}
                            className="h-8 w-8 p-0 border rounded"
                          />
                          <Input
                            value={selectedComponent.style?.color || "#000000"}
                            onChange={(e) => updateStyle("color", e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Hover Color</Label>
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="color"
                            value={selectedComponent.style?.["--nav-hover"] || "#f3f4f6"}
                            onChange={(e) => updateStyle("--nav-hover", e.target.value)}
                            className="h-8 w-8 p-0 border rounded"
                          />
                          <Input
                            value={selectedComponent.style?.["--nav-hover"] || "#f3f4f6"}
                            onChange={(e) => updateStyle("--nav-hover", e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Active Color</Label>
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="color"
                            value={selectedComponent.style?.["--nav-active"] || "#e5e7eb"}
                            onChange={(e) => updateStyle("--nav-active", e.target.value)}
                            className="h-8 w-8 p-0 border rounded"
                          />
                          <Input
                            value={selectedComponent.style?.["--nav-active"] || "#e5e7eb"}
                            onChange={(e) => updateStyle("--nav-active", e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Spacing */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Link Spacing</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={Number.parseFloat(selectedComponent.style?.["--nav-spacing"] || "1").toFixed(1)}
                            onChange={(e) => updateStyle("--nav-spacing", `${e.target.value}rem`)}
                            className="h-1.5 flex-1"
                          />
                          <span className="text-xs w-8">
                            {Number.parseFloat(selectedComponent.style?.["--nav-spacing"] || "1").toFixed(1)}rem
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Padding</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={Number.parseFloat(
                              selectedComponent.style?.padding?.replace("rem", "") || "1",
                            ).toFixed(1)}
                            onChange={(e) => updateStyle("padding", `${e.target.value}rem`)}
                            className="h-1.5 flex-1"
                          />
                          <span className="text-xs w-8">
                            {Number.parseFloat(selectedComponent.style?.padding?.replace("rem", "") || "1").toFixed(1)}
                            rem
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Border & Shadow */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Border Radius</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="range"
                            min="0"
                            max="20"
                            value={Number.parseInt(selectedComponent.style?.borderRadius?.replace("px", "") || "0")}
                            onChange={(e) => updateStyle("borderRadius", `${e.target.value}px`)}
                            className="h-1.5 flex-1"
                          />
                          <span className="text-xs w-8">{selectedComponent.style?.borderRadius || "0px"}</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Shadow</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Select
                            value={selectedComponent.style?.boxShadow || "none"}
                            onValueChange={(value: string) => updateStyle("boxShadow", value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="0 1px 3px rgba(0,0,0,0.1)">Small</SelectItem>
                              <SelectItem value="0 4px 6px -1px rgba(0,0,0,0.1)">Medium</SelectItem>
                              <SelectItem value="0 10px 15px -3px rgba(0,0,0,0.1)">Large</SelectItem>
                              <SelectItem value="0 20px 25px -5px rgba(0,0,0,0.1)">Extra Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Position */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Position</Label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {["sticky", "static", "fixed"].map((pos) => (
                          <Button
                            key={pos}
                            variant={selectedComponent.style?.position === pos ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs capitalize"
                            onClick={() => updateStyle("position", pos)}
                          >
                            {pos}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Styling Section - Only for text and heading components */}
                {(selectedComponent.type === "text" || selectedComponent.type === "heading") && (
                  <div className="bg-muted/30 rounded-lg p-2.5 space-y-3">
                    <Label className="text-xs font-semibold">Text Styling</Label>

                    {/* Font Family */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Font Family</Label>
                      <Select
                        value={selectedComponent.style?.fontFamily || "sans-serif"}
                        onValueChange={(value: string) => updateStyle("fontFamily", value)}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sans-serif">Sans-serif</SelectItem>
                          <SelectItem value="serif">Serif</SelectItem>
                          <SelectItem value="monospace">Monospace</SelectItem>
                          <SelectItem value="cursive">Cursive</SelectItem>
                          <SelectItem value="fantasy">Fantasy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Font Size - Only for text component */}
                    {selectedComponent.type === "text" && (
                      <div>
                        <div className="flex justify-between items-center">
                          <Label className="text-xs text-muted-foreground">Font Size</Label>
                          <span className="text-xs text-muted-foreground">
                            {selectedComponent.style?.fontSize || "16px"}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            min="8"
                            max="72"
                            value={selectedComponent.style?.fontSize?.replace("px", "") || "16"}
                            onChange={(e) => updateStyle("fontSize", `${e.target.value}px`)}
                            className="h-8 text-xs"
                          />
                          <span className="text-xs text-muted-foreground flex items-center">px</span>
                        </div>
                      </div>
                    )}

                    {/* Font Weight */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Font Weight</Label>
                      <Select
                        value={selectedComponent.style?.fontWeight || "400"}
                        onValueChange={(value: string) => updateStyle("fontWeight", value)}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">Thin (100)</SelectItem>
                          <SelectItem value="300">Light (300)</SelectItem>
                          <SelectItem value="400">Regular (400)</SelectItem>
                          <SelectItem value="500">Medium (500)</SelectItem>
                          <SelectItem value="600">Semi-bold (600)</SelectItem>
                          <SelectItem value="700">Bold (700)</SelectItem>
                          <SelectItem value="900">Black (900)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Text Align */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Text Align</Label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <Button
                          variant={selectedComponent.style?.textAlign === "left" ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => updateStyle("textAlign", "left")}
                        >
                          Left
                        </Button>
                        <Button
                          variant={selectedComponent.style?.textAlign === "center" ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => updateStyle("textAlign", "center")}
                        >
                          Center
                        </Button>
                        <Button
                          variant={selectedComponent.style?.textAlign === "right" ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => updateStyle("textAlign", "right")}
                        >
                          Right
                        </Button>
                      </div>
                    </div>

                    {/* Letter Spacing */}
                    <div>
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-muted-foreground">Letter Spacing</Label>
                        <span className="text-xs text-muted-foreground">
                          {selectedComponent.style?.letterSpacing || "0px"}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          min="-5"
                          max="20"
                          step="0.1"
                          value={selectedComponent.style?.letterSpacing?.replace("px", "") || "0"}
                          onChange={(e) => updateStyle("letterSpacing", `${e.target.value}px`)}
                          className="h-8 text-xs"
                        />
                        <span className="text-xs text-muted-foreground flex items-center">px</span>
                      </div>
                    </div>

                    {/* Line Height */}
                    <div>
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-muted-foreground">Line Height</Label>
                        <span className="text-xs text-muted-foreground">
                          {selectedComponent.style?.lineHeight || "1.5"}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          min="0.8"
                          max="3"
                          step="0.1"
                          value={selectedComponent.style?.lineHeight || "1.5"}
                          onChange={(e) => updateStyle("lineHeight", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Dimensions Section */}
                <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Dimensions</Label>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      Resizable
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="width" className="text-xs text-muted-foreground">
                        Width
                      </Label>
                      <Input
                        id="width"
                        type="text"
                        value={selectedComponent.style?.width || "auto"}
                        onChange={(e) => updateStyle("width", e.target.value)}
                        placeholder="auto"
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="height" className="text-xs text-muted-foreground">
                        Height
                      </Label>
                      <Input
                        id="height"
                        type="text"
                        value={selectedComponent.style?.height || "auto"}
                        onChange={(e) => updateStyle("height", e.target.value)}
                        placeholder="auto"
                        className="h-7 text-xs mt-0.5"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    💡 Hover over component to see resize handles
                  </p>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="backgroundColor" className="text-xs">
                    Background
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={selectedComponent.style?.backgroundColor || "#ffffff"}
                      onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                      className="w-10 h-8 p-1 border rounded"
                    />
                    <Input
                      value={selectedComponent.style?.backgroundColor || "#ffffff"}
                      onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="color" className="text-xs">
                    Text Color
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="color"
                      type="color"
                      value={selectedComponent.style?.color || "#000000"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      className="w-10 h-8 p-1 border rounded"
                    />
                    <Input
                      value={selectedComponent.style?.color || "#000000"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      placeholder="#000000"
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="padding" className="text-xs">
                      Padding
                    </Label>
                    <Input
                      id="padding"
                      value={selectedComponent.style?.padding || ""}
                      onChange={(e) => updateStyle("padding", e.target.value)}
                      placeholder="10px"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="margin" className="text-xs">
                      Margin
                    </Label>
                    <Input
                      id="margin"
                      value={selectedComponent.style?.margin || ""}
                      onChange={(e) => updateStyle("margin", e.target.value)}
                      placeholder="10px"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-medium">Border Radius</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedComponent.style?.borderRadius || "0"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          updateStyle("borderRadius", "0")
                          updateStyle("borderTopLeftRadius", "0")
                          updateStyle("borderTopRightRadius", "0")
                          updateStyle("borderBottomLeftRadius", "0")
                          updateStyle("borderBottomRightRadius", "0")
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 p-2 bg-muted/20 rounded-md">
                    {/* All Corners */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <Label htmlFor="borderRadius-all" className="text-xs text-muted-foreground">
                          All Corners
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={selectedComponent.style?.borderRadius?.toString().replace("px", "") || "0"}
                            onChange={(e) => {
                              const value = e.target.value + "px"
                              updateStyle("borderRadius", value)
                            }}
                            className="h-6 w-12 text-xs text-right px-1"
                          />
                          <span className="text-xs">px</span>
                        </div>
                      </div>
                      <Input
                        id="borderRadius-all"
                        type="range"
                        min="0"
                        max="200"
                        step="1"
                        value={Number.parseInt(
                          selectedComponent.style?.borderRadius?.toString().replace("px", "") || "0",
                        )}
                        onChange={(e) => {
                          const value = e.target.value + "px"
                          updateStyle("borderRadius", value)
                        }}
                        className="h-1.5 w-full"
                      />
                    </div>

                    <Separator className="my-2" />

                    {/* Individual Corners */}
                    <div className="space-y-3">
                      {/* Top Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                            <Label className="text-xs text-muted-foreground">Top Left</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={
                                  selectedComponent.style?.borderTopLeftRadius?.toString().replace("px", "") || "0"
                                }
                                onChange={(e) => {
                                  const value = e.target.value + "px"
                                  updateStyle("borderTopLeftRadius", value)
                                }}
                                className="h-6 w-10 text-xs text-right px-1"
                              />
                              <span className="text-xs">px</span>
                            </div>
                          </div>
                          <Input
                            type="range"
                            min="0"
                            max="200"
                            step="1"
                            value={Number.parseInt(
                              selectedComponent.style?.borderTopLeftRadius?.toString().replace("px", "") || "0",
                            )}
                            onChange={(e) => {
                              const value = e.target.value + "px"
                              updateStyle("borderTopLeftRadius", value)
                            }}
                            className="h-1.5 w-full"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                            <Label className="text-xs text-muted-foreground">Top Right</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={
                                  selectedComponent.style?.borderTopRightRadius?.toString().replace("px", "") || "0"
                                }
                                onChange={(e) => {
                                  const value = e.target.value + "px"
                                  updateStyle("borderTopRightRadius", value)
                                }}
                                className="h-6 w-10 text-xs text-right px-1"
                              />
                              <span className="text-xs">px</span>
                            </div>
                          </div>
                          <Input
                            type="range"
                            min="0"
                            max="200"
                            step="1"
                            value={Number.parseInt(
                              selectedComponent.style?.borderTopRightRadius?.toString().replace("px", "") || "0",
                            )}
                            onChange={(e) => {
                              const value = e.target.value + "px"
                              updateStyle("borderTopRightRadius", value)
                            }}
                            className="h-1.5 w-full"
                          />
                        </div>
                      </div>

                      {/* Bottom Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                            <Label className="text-xs text-muted-foreground">Bottom Left</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={
                                  selectedComponent.style?.borderBottomLeftRadius?.toString().replace("px", "") || "0"
                                }
                                onChange={(e) => {
                                  const value = e.target.value + "px"
                                  updateStyle("borderBottomLeftRadius", value)
                                }}
                                className="h-6 w-10 text-xs text-right px-1"
                              />
                              <span className="text-xs">px</span>
                            </div>
                          </div>
                          <Input
                            type="range"
                            min="0"
                            max="200"
                            step="1"
                            value={Number.parseInt(
                              selectedComponent.style?.borderBottomLeftRadius?.toString().replace("px", "") || "0",
                            )}
                            onChange={(e) => {
                              const value = e.target.value + "px"
                              updateStyle("borderBottomLeftRadius", value)
                            }}
                            className="h-1.5 w-full"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                            <Label className="text-xs text-muted-foreground">Bottom Right</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={
                                  selectedComponent.style?.borderBottomRightRadius?.toString().replace("px", "") || "0"
                                }
                                onChange={(e) => {
                                  const value = e.target.value + "px"
                                  updateStyle("borderBottomRightRadius", value)
                                }}
                                className="h-6 w-10 text-xs text-right px-1"
                              />
                              <span className="text-xs">px</span>
                            </div>
                          </div>
                          <Input
                            type="range"
                            min="0"
                            max="200"
                            step="1"
                            value={Number.parseInt(
                              selectedComponent.style?.borderBottomRightRadius?.toString().replace("px", "") || "0",
                            )}
                            onChange={(e) => {
                              const value = e.target.value + "px"
                              updateStyle("borderBottomRightRadius", value)
                            }}
                            className="h-1.5 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="opacity" className="text-xs">
                    Opacity
                  </Label>
                  <div className="space-y-2 mt-1">
                    <RangeSlider
                      value={Math.round(Number.parseFloat(selectedComponent.style?.opacity || "1") * 100)}
                      onValueChange={(value) => updateStyle("opacity", (value / 100).toString())}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      {Math.round(Number.parseFloat(selectedComponent.style?.opacity || "1") * 100)}%
                    </div>
                  </div>
                </div>

                {/* Box Shadow Section */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                  <Label className="text-xs font-semibold">Box Shadow</Label>

                  {/* Horizontal Offset */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Horizontal</Label>
                      <span className="text-xs text-muted-foreground">{boxShadowValues.hOffset}px</span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={boxShadowValues.hOffset}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value)
                        setBoxShadowValues((prev) => ({
                          ...prev,
                          hOffset: value,
                        }))
                        updateStyle(
                          "boxShadow",
                          `${value}px ${boxShadowValues.vOffset}px ${boxShadowValues.blur}px ${boxShadowValues.spread}px ${boxShadowValues.color} ${boxShadowValues.inset ? "inset" : ""}`.trim(),
                        )
                      }}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Vertical Offset */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Vertical</Label>
                      <span className="text-xs text-muted-foreground">{boxShadowValues.vOffset}px</span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={boxShadowValues.vOffset}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value)
                        setBoxShadowValues((prev) => ({
                          ...prev,
                          vOffset: value,
                        }))
                        updateStyle(
                          "boxShadow",
                          `${boxShadowValues.hOffset}px ${value}px ${boxShadowValues.blur}px ${boxShadowValues.spread}px ${boxShadowValues.color} ${boxShadowValues.inset ? "inset" : ""}`.trim(),
                        )
                      }}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Blur Radius */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Blur</Label>
                      <span className="text-xs text-muted-foreground">{boxShadowValues.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={boxShadowValues.blur}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value)
                        setBoxShadowValues((prev) => ({
                          ...prev,
                          blur: value,
                        }))
                        updateStyle(
                          "boxShadow",
                          `${boxShadowValues.hOffset}px ${boxShadowValues.vOffset}px ${value}px ${boxShadowValues.spread}px ${boxShadowValues.color} ${boxShadowValues.inset ? "inset" : ""}`.trim(),
                        )
                      }}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Spread Radius */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Spread</Label>
                      <span className="text-xs text-muted-foreground">{boxShadowValues.spread}px</span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={boxShadowValues.spread}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value)
                        setBoxShadowValues((prev) => ({
                          ...prev,
                          spread: value,
                        }))
                        updateStyle(
                          "boxShadow",
                          `${boxShadowValues.hOffset}px ${boxShadowValues.vOffset}px ${boxShadowValues.blur}px ${value}px ${boxShadowValues.color} ${boxShadowValues.inset ? "inset" : ""}`.trim(),
                        )
                      }}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Color and Inset Toggle */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <Label className="text-xs">Color</Label>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="color"
                          value={boxShadowValues.color}
                          onChange={(e) => {
                            const value = e.target.value
                            setBoxShadowValues((prev) => ({
                              ...prev,
                              color: value,
                            }))
                            updateStyle(
                              "boxShadow",
                              `${boxShadowValues.hOffset}px ${boxShadowValues.vOffset}px ${boxShadowValues.blur}px ${boxShadowValues.spread}px ${value} ${boxShadowValues.inset ? "inset" : ""}`.trim(),
                            )
                          }}
                          className="w-8 h-8 p-0.5 border rounded cursor-pointer"
                        />
                        <Input
                          value={boxShadowValues.color}
                          onChange={(e) => {
                            const value = e.target.value
                            setBoxShadowValues((prev) => ({
                              ...prev,
                              color: value,
                            }))
                            updateStyle(
                              "boxShadow",
                              `${boxShadowValues.hOffset}px ${boxShadowValues.vOffset}px ${boxShadowValues.blur}px ${boxShadowValues.spread}px ${value} ${boxShadowValues.inset ? "inset" : ""}`.trim(),
                            )
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center space-x-2 h-8">
                        <Switch
                          id="shadow-inset"
                          checked={boxShadowValues.inset}
                          onCheckedChange={(checked: boolean) => {
                            setBoxShadowValues((prev) => ({
                              ...prev,
                              inset: checked,
                            }))
                            updateStyle(
                              "boxShadow",
                              `${boxShadowValues.hOffset}px ${boxShadowValues.vOffset}px ${boxShadowValues.blur}px ${boxShadowValues.spread}px ${boxShadowValues.color} ${checked ? "inset" : ""}`.trim(),
                            )
                          }}
                        />
                        <Label htmlFor="shadow-inset" className="text-xs">
                          Inset
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
