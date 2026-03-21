"use client"

import React, { useState } from "react"
import type { ComponentData } from "../App"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Checkbox } from "./ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
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
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Info,
  Code2
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@supabase/supabase-js"
import { styleToCss } from "../utils/styleManager"
import { supabase } from "../supabase/config/supabaseClient"
import { CustomCssModal } from "./CustomCssModal"
import { AICustomComponentStylingModal } from "./AICustomComponentStylingModal"
import { CustomComponentIntegrationModal } from "./CustomComponentIntegrationModal"
type ActionType = "onClick" | "onHover" | "onFocus" | "onBlur"
type ActionHandlerType = "custom" | "navigate" | "scroll" | "copy" | "toggle" | "supabase" | "condition" | "showAlert"
const styleStr = (value: any): string => String(value ?? "")
const FONT_SIZES = [4, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 128];
const SPACING_VALUES = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128];
const GRID_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const AUTOPLAY_SPEEDS = [500, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000];
const LETTER_SPACING_VALUES = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10];
const LINE_HEIGHT_VALUES = [0.8, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2, 2.2, 2.5, 3];
const BORDER_RADIUS_VALUES = [0, 2, 4, 6, 8, 12, 16, 24, 32, 48, 9999];
const BORDER_WIDTHS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
const BORDER_STYLES = ["none", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"];
const DIVIDER_THICKNESS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];
const DIMENSION_VALUES = ["auto", "10%", "20%", "25%", "30%", "40%", "50%", "60%", "70%", "75%", "80%", "90%", "100%", "50px", "100px", "150px", "200px", "250px", "300px", "400px", "500px"];

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
  supabaseFilters?: { column: string; operator: string; value: string }[]
  supabaseSelectColumns?: string

  alertSelector?: string // For showAlert

  // For chaining actions
  onSuccessActionId?: string
  onErrorActionId?: string
  onSuccessUrl?: string
  onErrorUrl?: string

  // For conditional logic
  conditionCode?: string // The javascript code to evaluate
  trueActionId?: string
  falseActionId?: string
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
  pages?: { id: string; name: string; path?: string }[]
  activePageId?: string
  userProjectConfig?: any
  onUpdateUserProjectConfig?: (url: string, key: string, resendKey?: string) => void
}
// ─── Gradient-aware ColorPicker (module-level to prevent state reset) ────────
const SOLID_PRESETS = [
  "#ffffff", "#f8fafc", "#f3f4f6", "#e5e7eb", "#9ca3af", "#4b5563", "#1f2937", "#000000",
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
]
const GRADIENT_PRESETS = [
  { label: 'Purple–Pink', v: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)' },
  { label: 'Blue–Cyan', v: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' },
  { label: 'Orange–Red', v: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' },
  { label: 'Green–Teal', v: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)' },
  { label: 'Midnight', v: 'linear-gradient(135deg, #1f2937 0%, #6366f1 100%)' },
  { label: 'Sunset', v: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
  { label: 'Ocean', v: 'radial-gradient(circle, #0ea5e9 0%, #1f2937 100%)' },
  { label: 'Rose', v: 'linear-gradient(135deg, #fda4af 0%, #fb7185 100%)' },
]

function buildGradient(type: 'linear' | 'radial', angle: number, c1: string, p1: number, c2: string, p2: number) {
  return type === 'linear'
    ? `linear-gradient(${angle}deg, ${c1} ${p1}%, ${c2} ${p2}%)`
    : `radial-gradient(circle, ${c1} ${p1}%, ${c2} ${p2}%)`
}

function ColorPicker({ label, value, onChange, hideGradient }: { label: string; value: string; onChange: (val: string) => void; hideGradient?: boolean }) {
  const isGradient = value?.startsWith('linear-gradient') || value?.startsWith('radial-gradient')
  const [mode, setMode] = React.useState<'solid' | 'gradient'>(hideGradient ? 'solid' : (isGradient ? 'gradient' : 'solid'))
  const [gradientType, setGradientType] = React.useState<'linear' | 'radial'>('linear')
  const [gradientAngle, setGradientAngle] = React.useState(135)
  const [stop1Color, setStop1Color] = React.useState('#6366f1')
  const [stop1Pos, setStop1Pos] = React.useState(0)
  const [stop2Color, setStop2Color] = React.useState('#ec4899')
  const [stop2Pos, setStop2Pos] = React.useState(100)

  React.useEffect(() => {
    if (hideGradient) {
      setMode('solid');
      return;
    }
    if (value?.startsWith('linear-gradient')) {
      setMode('gradient'); setGradientType('linear')
      const m = value.match(/(\d+)deg/)
      if (m) setGradientAngle(parseInt(m[1]))
      const stops = value.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*(\d+)%/g)
      if (stops && stops.length >= 2) {
        const [c1, p1] = stops[0].trim().split(/\s+/)
        const [c2, p2] = stops[1].trim().split(/\s+/)
        setStop1Color(c1); setStop1Pos(parseInt(p1))
        setStop2Color(c2); setStop2Pos(parseInt(p2))
      }
    } else if (value?.startsWith('radial-gradient')) {
      setMode('gradient'); setGradientType('radial')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentGradient = buildGradient(gradientType, gradientAngle, stop1Color, stop1Pos, stop2Color, stop2Pos)

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>

      {/* Mode toggle */}
      {!hideGradient && (
        <div className="flex rounded-md overflow-hidden border border-input h-7 text-[11px]">
          <button className={`flex-1 font-medium transition-colors ${mode === 'solid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} onClick={() => setMode('solid')}>Solid</button>
          <button className={`flex-1 font-medium transition-colors ${mode === 'gradient' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} onClick={() => setMode('gradient')}>Gradient</button>
        </div>
      )}

      {mode === 'solid' ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded border border-input cursor-pointer shrink-0 overflow-hidden relative shadow-sm" style={{ backgroundColor: value || '#ffffff' }}>
              <input type="color" value={value?.startsWith('#') ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
            <Input type="text" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs flex-1 font-mono uppercase" placeholder="#FFFFFF" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SOLID_PRESETS.map((color) => (
              <button key={color} title={color}
                className={`w-5 h-5 rounded-full border border-border/50 hover:scale-110 transition-transform shadow-sm focus:outline-none ${value?.toLowerCase() === color.toLowerCase() ? 'ring-1 ring-ring ring-offset-1 scale-110' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onChange(color)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Preview bar */}
          <div className="h-8 w-full rounded border border-input shadow-sm" style={{ background: isGradient && mode === 'gradient' ? value : currentGradient }} />

          {/* Linear / Radial */}
          <div className="flex rounded-md overflow-hidden border border-input h-6 text-[10px]">
            <button className={`flex-1 font-medium transition-colors ${gradientType === 'linear' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => { setGradientType('linear'); onChange(buildGradient('linear', gradientAngle, stop1Color, stop1Pos, stop2Color, stop2Pos)) }}>Linear</button>
            <button className={`flex-1 font-medium transition-colors ${gradientType === 'radial' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => { setGradientType('radial'); onChange(buildGradient('radial', gradientAngle, stop1Color, stop1Pos, stop2Color, stop2Pos)) }}>Radial</button>
          </div>

          {/* Angle */}
          {gradientType === 'linear' && (
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground w-10 shrink-0">Angle</Label>
              <div className="flex-1" />
              <input type="range" min={0} max={360} step={5} value={gradientAngle}
                onChange={(e) => { const a = parseInt(e.target.value); setGradientAngle(a); onChange(buildGradient('linear', a, stop1Color, stop1Pos, stop2Color, stop2Pos)) }}
                className="w-16 h-1 accent-primary" />
              <span className="text-[10px] text-muted-foreground w-8 text-right">{gradientAngle}°</span>
            </div>
          )}

          {/* Color stops */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Color Stops</Label>
            {/* Stop 1 */}
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded border border-input cursor-pointer overflow-hidden relative shadow-sm shrink-0" style={{ backgroundColor: stop1Color }}>
                <input type="color" value={stop1Color} onChange={(e) => { setStop1Color(e.target.value); onChange(buildGradient(gradientType, gradientAngle, e.target.value, stop1Pos, stop2Color, stop2Pos)) }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
              <Input type="text" value={stop1Color} onChange={(e) => { setStop1Color(e.target.value); onChange(buildGradient(gradientType, gradientAngle, e.target.value, stop1Pos, stop2Color, stop2Pos)) }} className="h-6 text-[10px] flex-1 font-mono" />
              <input type="range" min={0} max={100} value={stop1Pos} onChange={(e) => { const p = parseInt(e.target.value); setStop1Pos(p); onChange(buildGradient(gradientType, gradientAngle, stop1Color, p, stop2Color, stop2Pos)) }} className="w-16 h-1 accent-primary" />
              <span className="text-[10px] text-muted-foreground w-6">{stop1Pos}%</span>
            </div>
            {/* Stop 2 */}
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded border border-input cursor-pointer overflow-hidden relative shadow-sm shrink-0" style={{ backgroundColor: stop2Color }}>
                <input type="color" value={stop2Color} onChange={(e) => { setStop2Color(e.target.value); onChange(buildGradient(gradientType, gradientAngle, stop1Color, stop1Pos, e.target.value, stop2Pos)) }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
              <Input type="text" value={stop2Color} onChange={(e) => { setStop2Color(e.target.value); onChange(buildGradient(gradientType, gradientAngle, stop1Color, stop1Pos, e.target.value, stop2Pos)) }} className="h-6 text-[10px] flex-1 font-mono" />
              <input type="range" min={0} max={100} value={stop2Pos} onChange={(e) => { const p = parseInt(e.target.value); setStop2Pos(p); onChange(buildGradient(gradientType, gradientAngle, stop1Color, stop1Pos, stop2Color, p)) }} className="w-16 h-1 accent-primary" />
              <span className="text-[10px] text-muted-foreground w-6">{stop2Pos}%</span>
            </div>
          </div>

          {/* Gradient presets */}
          <div className="grid grid-cols-4 gap-1">
            {GRADIENT_PRESETS.map((gp) => (
              <button key={gp.label} title={gp.label}
                className="h-6 rounded border border-border/50 hover:scale-105 transition-transform shadow-sm"
                style={{ background: gp.v }}
                onClick={() => {
                  onChange(gp.v)
                  const aMatch = gp.v.match(/(\d+)deg/)
                  if (aMatch) setGradientAngle(parseInt(aMatch[1]))
                  setGradientType(gp.v.startsWith('radial') ? 'radial' : 'linear')
                  const colors = gp.v.match(/#[0-9a-fA-F]{6}/g)
                  if (colors && colors.length >= 2) { setStop1Color(colors[0]); setStop2Color(colors[1]) }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

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
  userProjectConfig,
  onUpdateUserProjectConfig,
}: PropertiesPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState("content")
  const [showIndividualBorders, setShowIndividualBorders] = useState(false)
  const [isPickingElement, setIsPickingElement] = useState<string | null>(null) // actionId or null
  const [pickingMode, setPickingMode] = useState<{ type: "selector" | "column"; column?: string } | null>(null)
  const [isCustomCssModalOpen, setIsCustomCssModalOpen] = useState(false)
  const [isAIStylingModalOpen, setIsAIStylingModalOpen] = useState(false)
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false)
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
    const filters = action.supabaseFilters || []
    const selectColumns = action.supabaseSelectColumns || "*"

    // Check if we have chaining set up
    const hasChaining = action.onSuccessActionId || action.onErrorActionId;

    return `{
  try {
    const table = '${table.replace(/^public\./, '')}';
    const operation = '${operation}';
    const dataMapping = ${JSON.stringify(dataMapping)};
    const filters = ${JSON.stringify(filters)};
    const selectColumns = '${selectColumns.replace(/'/g, "\\'")}';
    const hasChaining = ${hasChaining ? 'true' : 'false'};

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
  // The actual execution happens via RenderableComponent.tsx's handler intercept.

  if (!hasChaining) {
    window.dispatchEvent(new CustomEvent('supabase-action', {
      detail: { table, operation, data: recordData, filters, selectColumns }
    }));
  }

  return true;
} catch (error) {
  console.error('Error in Supabase handler:', error);
  return false;
}
    }`
  }

  const generateConditionHandler = (action: Action) => {
    const code = action.conditionCode || "return window.supabaseData && window.supabaseData.length > 0;";
    return `{
  try {
    const evaluateCondition = () => {
      ${code}
    };
    const result = evaluateCondition();
    console.log('[Condition Action] Evaluated to:', result, 'using code:', \`${code}\`);
    // Direct chaining handled natively by RenderableComponent.tsx 
    return result; 
  } catch (error) {
    console.error('Error in condition handler:', error);
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
        targetSelector = `section-${componentId.slice(0, 8)}`

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
      targetSelector = element.id || `element-${Date.now()}`
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
      <div
        id="properties-panel"
        data-tour="properties-panel"
        className="p-4 space-y-4"
      >
        <div>
          <h3 className="text-sm font-semibold mb-3">Canvas Properties</h3>
          <div className="space-y-4">
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
    onUpdateStyle(selectedComponent.id, { [key]: value })
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
                <Button variant="ghost" size="sm" onClick={addAction} className="h-6 text-xs px-2 py-0">
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
                                    case "showAlert":
                                      newHandler = `{try {
                                        const selector = '${(action.alertSelector || "").replace(new RegExp("'", "g"), "\\'")}';
                                        const element = document.getElementById(selector) || document.querySelector(selector);
                                        if (element) {
                                          element.style.display = 'flex';
                                          element.style.opacity = '1';
                                          console.log('Showing alert:', selector);
                                        } else {
                                          console.error('Alert not found:', selector);
                                        }
                                      } catch (error) {
                                        console.error('Error in showAlert:', error);
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
                                  <SelectItem value="showAlert">Show Alert</SelectItem>
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

                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-xs">Operation</Label>
                                    <TooltipProvider delayDuration={300}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="w-[260px] p-3">
                                          <div className="space-y-2 text-xs">
                                            <p><span className="font-bold">Insert:</span> Creates a new row mapping the component's state payload to table columns.</p>
                                            <p><span className="font-bold">Update:</span> Modifies rows matching your Filter Conditions.</p>
                                            <p><span className="font-bold">Delete:</span> Removes rows matching your Filter Conditions.</p>
                                            <p><span className="font-bold">Select:</span> Queries data and saves it to <code>window.supabaseData</code> for conditional chaining.</p>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
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
                                  <div className="flex justify-between items-center mb-1">
                                    <Label className="text-xs">Table Name</Label>
                                    <TooltipProvider delayDuration={300}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help relative z-10" />
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="w-[260px] p-3">
                                          <p className="text-xs">
                                            The exact name of your Supabase table in the public schema. Case sensitive. (e.g. <code>profiles</code> or <code>blog_posts</code>)
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <Input
                                    value={action.supabaseTable || ""}
                                    onChange={(e) => updateAction(action.id, { supabaseTable: e.target.value })}
                                    placeholder="e.g. users"
                                    className="h-7 text-xs"
                                  />
                                </div>

                                {/* Show mapping UI for ALL operations, but labeled differently */}
                                {/* If it's a select operation, let the user define columns */}
                                {action.supabaseOperation === 'select' && (
                                  <div className="space-y-1 mt-2">
                                    <div className="flex justify-between items-center mb-1">
                                      <Label className="text-xs">Columns to Select</Label>
                                      <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help relative z-10" />
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="w-[260px] p-3">
                                            <p className="text-xs">
                                              Comma-separated list of columns to retrieve. Use <code>*</code> to get all columns. (e.g. <code>id, name, created_at</code>)
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                    <Input
                                      value={action.supabaseSelectColumns ?? "*"}
                                      onChange={(e) => updateAction(action.id, { supabaseSelectColumns: e.target.value })}
                                      placeholder="e.g. *, id, name"
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                )}

                                {/* Filter Conditions section (for Select, Update, Delete) */}
                                {action.supabaseOperation !== 'insert' && (
                                  <div className="space-y-2 mt-4 pt-2 border-t">
                                    <div className="flex justify-between items-center mb-2">
                                      <Label className="text-xs font-medium">Filter Conditions (WHERE)</Label>
                                      <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help relative z-10" />
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="w-[260px] p-3">
                                            <div className="space-y-2 text-xs">
                                              <p>Add conditions to securely limit which rows are affected by this action.</p>
                                              <p className="text-muted-foreground">You can also use javascript expressions like <code>{"`{window.userId}`"}</code> for dynamic filtering!</p>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                    <div className="space-y-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-7 text-xs border-dashed"
                                        onClick={() => {
                                          const currentFilters = action.supabaseFilters || [];
                                          updateAction(action.id, {
                                            supabaseFilters: [...currentFilters, { column: "", operator: "eq", value: "" }]
                                          });
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" /> Add Filter
                                      </Button>

                                      {(action.supabaseFilters || []).map((filter, idx) => (
                                        <div key={idx} className="flex flex-col gap-1 p-2 border rounded bg-slate-50">
                                          <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center">
                                            <Input
                                              placeholder="Col"
                                              value={filter.column}
                                              onChange={(e) => {
                                                const newFilters = [...(action.supabaseFilters || [])];
                                                newFilters[idx].column = e.target.value;
                                                updateAction(action.id, { supabaseFilters: newFilters });
                                              }}
                                              className="h-6 text-xs w-full"
                                            />

                                            <Select
                                              value={filter.operator || "eq"}
                                              onValueChange={(val: string) => {
                                                const newFilters = [...(action.supabaseFilters || [])];
                                                newFilters[idx].operator = val;
                                                updateAction(action.id, { supabaseFilters: newFilters });
                                              }}
                                            >
                                              <SelectTrigger className="h-6 text-xs w-full px-1">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="eq">Equals (=)</SelectItem>
                                                <SelectItem value="neq">Not Eq (!=)</SelectItem>
                                                <SelectItem value="gt">Greater (&gt;)</SelectItem>
                                                <SelectItem value="lt">Less (&lt;)</SelectItem>
                                                <SelectItem value="gte">Greater Eq (&gt;=)</SelectItem>
                                                <SelectItem value="lte">Less Eq (&lt;=)</SelectItem>
                                                <SelectItem value="like">Like</SelectItem>
                                                <SelectItem value="ilike">ILike</SelectItem>
                                              </SelectContent>
                                            </Select>

                                            <TooltipProvider delayDuration={300}>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div className="w-full min-w-0">
                                                    <Input
                                                      placeholder="Value or Element ID"
                                                      value={filter.value}
                                                      onChange={(e) => {
                                                        const newFilters = [...(action.supabaseFilters || [])];
                                                        newFilters[idx].value = e.target.value;
                                                        updateAction(action.id, { supabaseFilters: newFilters });
                                                      }}
                                                      className="h-6 text-xs w-full"
                                                    />
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="w-[260px] p-3">
                                                  <div className="space-y-2 text-xs">
                                                    <p>Hardcode a value (e.g. <code>admin</code>), reference an element's value (e.g. <code>#user-input</code>), or use JS globals (e.g. <code>{"`{window.userId}`"}</code>).</p>
                                                  </div>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>

                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 shrink-0"
                                              onClick={() => {
                                                const newFilters = [...(action.supabaseFilters || [])];
                                                newFilters.splice(idx, 1);
                                                updateAction(action.id, { supabaseFilters: newFilters });
                                              }}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Show data mapping payload for Insert / Update */}
                                {(action.supabaseOperation === 'insert' || action.supabaseOperation === 'update') && (
                                  <div className="space-y-3 mt-4 pt-2 border-t">
                                    <div className="flex justify-between items-center">
                                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Column and ID Mapping</Label>
                                      <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="w-[260px] p-3">
                                            <div className="space-y-2 text-xs">
                                              <p><span className="font-bold">Column:</span> The name of the database column in Supabase.</p>
                                              <p><span className="font-bold">ID / Value:</span> The ID of a canvas element (e.g. <code>#input-1</code>) to pull the value from, or a static value.</p>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                    <div className="space-y-2">
                                      {/* Helper to add a mapping row */}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-7 text-xs border-dashed"
                                        onClick={() => {
                                          const currentData = action.supabaseData || {}
                                          let newKey = "";
                                          let i = 1;
                                          // Ensure we add a new key even if "" already exists
                                          if (newKey in currentData) {
                                            while (`column_${i}` in currentData) {
                                              i++;
                                            }
                                            newKey = `column_${i}`;
                                          }
                                          updateAction(action.id, {
                                            supabaseData: { ...currentData, [newKey]: "" }
                                          })
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" /> Add Mapping Row
                                      </Button>

                                      {Object.entries(action.supabaseData || {}).map(([col, val], idx) => (
                                        <div key={idx} className="flex flex-col gap-2 p-2 border rounded bg-slate-50/50">
                                          <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Database Column</Label>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                  const newData = { ...action.supabaseData }
                                                  delete newData[col]
                                                  updateAction(action.id, { supabaseData: newData })
                                                }}
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <Input
                                              placeholder="e.g. user_id"
                                              value={col}
                                              onChange={(e) => {
                                                const newData = { ...action.supabaseData }
                                                const newCol = e.target.value
                                                delete newData[col]
                                                newData[newCol] = val
                                                updateAction(action.id, { supabaseData: newData })
                                              }}
                                              className="h-7 text-xs"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Canvas ID or Static Value</Label>
                                            <div className="flex items-center gap-2">
                                              <Input
                                                placeholder="#input-id or 'value'"
                                                value={val}
                                                onChange={(e) => {
                                                  const newData = { ...action.supabaseData }
                                                  newData[col] = e.target.value
                                                  updateAction(action.id, { supabaseData: newData })
                                                }}
                                                className="h-7 text-xs flex-1"
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className={`h-7 w-7 ${isPickingElement === action.id && pickingMode?.column === col ? "bg-yellow-100 border-yellow-300" : ""}`}
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
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          }

                          {/* Condition Action */}
                          {
                            action.handlerType === "condition" && (
                              <div className="space-y-3 pt-2 border-t border-dashed">
                                <Badge variant="outline" className="w-full justify-center bg-blue-50 text-blue-700 border-blue-200">
                                  Logic Branch (If / Else)
                                </Badge>

                                <div className="space-y-1">
                                  <Label className="text-xs">Condition (JavaScript)</Label>
                                  <Textarea
                                    value={action.conditionCode || "return window.supabaseData && window.supabaseData.length > 0;"}
                                    onChange={(e) => {
                                      const code = e.target.value;
                                      updateAction(action.id, {
                                        conditionCode: code,
                                        handler: generateConditionHandler({ ...action, conditionCode: code })
                                      });
                                    }}
                                    placeholder="return true;"
                                    className="min-h-[60px] text-xs font-mono"
                                  />
                                  <p className="text-[10px] text-muted-foreground">
                                    Must return a boolean. e.g. evaluating <code>window.supabaseData</code>
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-green-600 font-semibold">If True: Run Action</Label>
                                    <Select
                                      value={action.trueActionId || "none"}
                                      onValueChange={(val: string) => updateAction(action.id, { trueActionId: val === 'none' ? undefined : val })}
                                    >
                                      <SelectTrigger className="h-7 text-xs border-green-200">
                                        <SelectValue placeholder="Select action..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {actions.filter(a => a.id !== action.id).map(a => {
                                          const getActionLabel = (act: any) => {
                                            if (act.handlerType === 'navigate' && act.url) return `Navigate (${act.url})`;
                                            if (act.handlerType === 'supabase' && act.supabaseTable) return `Supabase ${act.supabaseOperation || 'insert'} (${act.supabaseTable})`;
                                            if (act.handlerType === 'toggle' && act.selector) return `Toggle (${act.selector})`;
                                            if (act.handlerType === 'scroll' && act.selector) return `Scroll (${act.selector})`;
                                            return `${act.handlerType} (${act.id.slice(0, 12)})`;
                                          };
                                          return (
                                            <SelectItem key={a.id} value={a.id}>{getActionLabel(a)}</SelectItem>
                                          )
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-red-600 font-semibold">If False: Run Action</Label>
                                    <Select
                                      value={action.falseActionId || "none"}
                                      onValueChange={(val: string) => updateAction(action.id, { falseActionId: val === 'none' ? undefined : val })}
                                    >
                                      <SelectTrigger className="h-7 text-xs border-red-200">
                                        <SelectValue placeholder="Select action..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {actions.filter(a => a.id !== action.id).map(a => {
                                          const getActionLabel = (act: any) => {
                                            if (act.handlerType === 'navigate' && act.url) return `Navigate (${act.url})`;
                                            if (act.handlerType === 'supabase' && act.supabaseTable) return `Supabase ${act.supabaseOperation || 'insert'} (${act.supabaseTable})`;
                                            if (act.handlerType === 'toggle' && act.selector) return `Toggle (${act.selector})`;
                                            if (act.handlerType === 'scroll' && act.selector) return `Scroll (${act.selector})`;
                                            return `${act.handlerType} (${act.id.slice(0, 12)})`;
                                          };
                                          return (
                                            <SelectItem key={a.id} value={a.id}>{getActionLabel(a)}</SelectItem>
                                          )
                                        })}
                                      </SelectContent>
                                    </Select>
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

                          {
                            action.handlerType === "showAlert" && (
                              <div className="space-y-1">
                                <Label className="text-xs">Alert Element ID</Label>
                                <Input
                                  value={action.alertSelector || ""}
                                  onChange={(e) => {
                                    let alertSelector = e.target.value;
                                    // Strip leading # if user typed it
                                    if (alertSelector.startsWith('#')) {
                                      alertSelector = alertSelector.substring(1);
                                    }
                                    updateAction(action.id, {
                                      alertSelector: alertSelector.trim(),
                                      // The handler itself is now just a fallback or for custom scripts, 
                                      // as RenderableComponent handles showAlertType specifically.
                                      handler: `// Trigger alert: ${alertSelector.trim()}`,
                                    })
                                  }}
                                  placeholder="my-alert-id"
                                  className="h-7 text-xs w-full font-mono"
                                />
                                <p className="text-[10px] text-muted-foreground">Enter the Element ID of the Alert component to show</p>
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

                      {/* Generic Action Chaining Configuration for non-conditions */}
                      {
                        action.handlerType !== 'condition' && (
                          <div className="pt-2 mt-2 border-t border-dashed space-y-2">
                            <div className="flex justify-between items-center mb-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Action Chaining</Label>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="w-[260px] p-3">
                                    <p className="text-xs">
                                      Automatically trigger another action locally after this action succeeds or fails. Very useful for navigating the user to a success page after an insert!
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1 min-w-0">
                                <Label className="text-[10px]">On Success Run:</Label>
                                <Select
                                  value={action.onSuccessActionId || (action.onSuccessUrl ? `url:${action.onSuccessUrl}` : "none")}
                                  onValueChange={(val: string) => {
                                    if (val === 'none') {
                                      updateAction(action.id, { onSuccessActionId: undefined, onSuccessUrl: undefined });
                                    } else if (val.startsWith('url:')) {
                                      updateAction(action.id, { onSuccessUrl: val.replace('url:', ''), onSuccessActionId: undefined });
                                    } else {
                                      updateAction(action.id, { onSuccessActionId: val, onSuccessUrl: undefined });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-6 text-[10px]">
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {pages && pages.length > 0 && (
                                      <SelectGroup>
                                        {pages.map(p => (
                                          <SelectItem key={p.id} value={`url:${p.path || p.id}`}>Go to {p.name}</SelectItem>
                                        ))}
                                      </SelectGroup>
                                    )}
                                    <SelectGroup>
                                      {actions.filter(a => a.id !== action.id).map(a => {
                                        const getActionLabel = (act: any) => {
                                          if (act.handlerType === 'navigate' && act.url) return `Navigate (${act.url})`;
                                          if (act.handlerType === 'supabase' && act.supabaseTable) return `Supabase ${act.supabaseOperation || 'insert'} (${act.supabaseTable})`;
                                          if (act.handlerType === 'toggle' && act.selector) return `Toggle (${act.selector})`;
                                          if (act.handlerType === 'scroll' && act.selector) return `Scroll (${act.selector})`;
                                          return `${act.handlerType} (${act.id.slice(0, 12)})`;
                                        };
                                        return (
                                          <SelectItem key={a.id} value={a.id}>{getActionLabel(a)}</SelectItem>
                                        )
                                      })}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1 min-w-0">
                                <Label className="text-[10px]">On Error Run:</Label>
                                <Select
                                  value={action.onErrorActionId || (action.onErrorUrl ? `url:${action.onErrorUrl}` : "none")}
                                  onValueChange={(val: string) => {
                                    if (val === 'none') {
                                      updateAction(action.id, { onErrorActionId: undefined, onErrorUrl: undefined });
                                    } else if (val.startsWith('url:')) {
                                      updateAction(action.id, { onErrorUrl: val.replace('url:', ''), onErrorActionId: undefined });
                                    } else {
                                      updateAction(action.id, { onErrorActionId: val, onErrorUrl: undefined });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-6 text-[10px]">
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {pages && pages.length > 0 && (
                                      <SelectGroup>
                                        {pages.map(p => (
                                          <SelectItem key={p.id} value={`url:${p.path || p.id}`}>Go to {p.name}</SelectItem>
                                        ))}
                                      </SelectGroup>
                                    )}
                                    <SelectGroup>
                                      {actions.filter(a => a.id !== action.id).map(a => {
                                        const getActionLabel = (act: any) => {
                                          if (act.handlerType === 'navigate' && act.url) return `Navigate (${act.url})`;
                                          if (act.handlerType === 'supabase' && act.supabaseTable) return `Supabase ${act.supabaseOperation || 'insert'} (${act.supabaseTable})`;
                                          if (act.handlerType === 'toggle' && act.selector) return `Toggle (${act.selector})`;
                                          if (act.handlerType === 'scroll' && act.selector) return `Scroll (${act.selector})`;
                                          return `${act.handlerType} (${act.id.slice(0, 12)})`;
                                        };
                                        return (
                                          <SelectItem key={a.id} value={a.id}>{getActionLabel(a)}</SelectItem>
                                        )
                                      })}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}

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
                      )
                      }
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
          const nextIdx = headers.length + 1;
          updateProps("headers", [...headers, `Label ${nextIdx}:column_${nextIdx}`])
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
                {headers.map((header, idx) => {
                  const parts = header.split(':');
                  const label = parts.length > 1 ? parts[0] : header;
                  const dataKey = parts.length > 1 ? parts[1] : header;

                  return (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Label"
                        value={label}
                        onChange={(e) => {
                          const newLabel = e.target.value;
                          updateHeader(idx, `${newLabel}:${dataKey}`);
                        }}
                        className="h-7 text-xs flex-1"
                      />
                      <Input
                        placeholder="Column"
                        value={dataKey}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          updateHeader(idx, `${label}:${newKey}`);
                        }}
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHeader(idx)}
                        className="h-7 w-7 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
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

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs">Columns to Select</Label>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help relative z-10" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="w-[260px] p-3">
                        <p className="text-xs">
                          Comma-separated list of columns to retrieve. Use <code>*</code> to get all columns. (e.g. <code>id, name, created_at</code>)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  value={props.supabaseSelectColumns ?? "*"}
                  onChange={(e) => updateProps("supabaseSelectColumns", e.target.value)}
                  placeholder="e.g. *, id, name"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2 pt-2 border-t mt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs font-medium">Filter Conditions (WHERE)</Label>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help relative z-10" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="w-[260px] p-3">
                        <div className="space-y-2 text-xs">
                          <p>Add conditions to securely limit which rows are fetched for this table.</p>
                          <p className="text-muted-foreground">You can also use javascript expressions like <code>{"`{window.userId}`"}</code> for dynamic filtering!</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs border-dashed"
                    onClick={() => {
                      const currentFilters = props.supabaseFilters || [];
                      updateProps("supabaseFilters", [...currentFilters, { column: "", operator: "eq", value: "" }]);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Filter
                  </Button>

                  {(props.supabaseFilters || []).map((filter: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 p-2 border rounded bg-slate-50">
                      <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center">
                        <Input
                          placeholder="Col"
                          value={filter.column}
                          onChange={(e) => {
                            const newFilters = [...(props.supabaseFilters || [])];
                            newFilters[idx] = { ...newFilters[idx], column: e.target.value };
                            updateProps("supabaseFilters", newFilters);
                          }}
                          className="h-6 text-xs w-full"
                        />

                        <Select
                          value={filter.operator || "eq"}
                          onValueChange={(val: string) => {
                            const newFilters = [...(props.supabaseFilters || [])];
                            newFilters[idx] = { ...newFilters[idx], operator: val };
                            updateProps("supabaseFilters", newFilters);
                          }}
                        >
                          <SelectTrigger className="h-6 text-xs w-full px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eq">Equals (=)</SelectItem>
                            <SelectItem value="neq">Not Eq (!=)</SelectItem>
                            <SelectItem value="gt">Greater (&gt;)</SelectItem>
                            <SelectItem value="lt">Less (&lt;)</SelectItem>
                            <SelectItem value="gte">Greater Eq (&gt;=)</SelectItem>
                            <SelectItem value="lte">Less Eq (&lt;=)</SelectItem>
                            <SelectItem value="like">Like</SelectItem>
                            <SelectItem value="ilike">ILike</SelectItem>
                          </SelectContent>
                        </Select>

                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full min-w-0">
                                <Input
                                  placeholder="Value or Element ID"
                                  value={filter.value}
                                  onChange={(e) => {
                                    const newFilters = [...(props.supabaseFilters || [])];
                                    newFilters[idx] = { ...newFilters[idx], value: e.target.value };
                                    updateProps("supabaseFilters", newFilters);
                                  }}
                                  className="h-6 text-xs w-full"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="w-[260px] p-3">
                              <div className="space-y-2 text-xs">
                                <p>Hardcode a value (e.g. <code>admin</code>), reference an element's value (e.g. <code>#user-input</code>), or use JS globals (e.g. <code>{"`{window.userId}`"}</code>).</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => {
                            const newFilters = [...(props.supabaseFilters || [])];
                            newFilters.splice(idx, 1);
                            updateProps("supabaseFilters", newFilters);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mt-4">
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
                    // Try to use the prop first, fallback to localStorage if needed
                    let config = props.userProjectConfig;
                    if (!config || !config.supabaseUrl || !config.supabaseKey) {
                      const url = localStorage.getItem('target_supabase_url');
                      const key = localStorage.getItem('target_supabase_key');
                      if (url && key) {
                        config = { supabaseUrl: url, supabaseKey: key };
                      }
                    }

                    let client = supabase;
                    if (config?.supabaseUrl && config?.supabaseKey) {
                      client = createClient(config.supabaseUrl, config.supabaseKey);
                    }

                    const tableName = props.supabaseTable.replace(/^public\./, '');
                    const { data, error } = await client
                      .from(tableName)
                      .select("*")
                      .limit(1)

                    if (error) throw error

                    if (data && data.length > 0) {
                      const detectedHeaders = Object.keys(data[0])
                      // Only update headers if the user hasn't explicitly set them to * previously, etc. We will respect * as well.
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
                value={props.label ?? ""}
                onChange={(e) => updateProps("label", e.target.value)}
                placeholder="Buy Now"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="amount" className="text-xs">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={props.amount || 100}
                onChange={(e) => updateProps("amount", Number.parseInt(e.target.value) || 0)}
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
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <p className="text-[10px] text-muted-foreground">
                💡 Payment methods are controlled by your PayMongo Dashboard. Go to Settings → Payment Methods to enable GCash, Maya, Cards, etc.
              </p>
            </div>
          </div>
        )

      case "sign-in":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-xs">Form Title</Label>
              <Input
                id="title"
                value={props.title ?? ""}
                onChange={(e) => updateProps("title", e.target.value)}
                placeholder="Sign In"
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 px-1">The main heading shown at the top of the form.</p>
            </div>
            <div>
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Input
                id="description"
                value={props.description ?? ""}
                onChange={(e) => updateProps("description", e.target.value)}
                placeholder="Enter your email and password to access your account."
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 px-1">Sub-text providing instructions or details to your users.</p>
            </div>
            <div>
              <Label htmlFor="buttonText" className="text-xs">Button Text</Label>
              <Input
                id="buttonText"
                value={props.buttonText ?? ""}
                onChange={(e) => updateProps("buttonText", e.target.value)}
                placeholder="Sign In"
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 px-1">The label displayed on the login button.</p>
            </div>
            <div>
              <Label htmlFor="redirectUrl" className="text-xs">On Success Redirect To</Label>
              <Select
                value={props.redirectUrl ?? "/"}
                onValueChange={(value: string) => updateProps("redirectUrl", value)}
              >
                <SelectTrigger id="redirectUrl" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {pages && pages.map(p => (
                    <SelectItem key={p.id} value={p.path || p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">Where users are sent after login. URL context is preserved.</p>
            </div>
            <div>
              <Label htmlFor="switchToSignUpText" className="text-xs">Switch to Sign Up Text</Label>
              <Input
                id="switchToSignUpText"
                value={props.switchToSignUpText ?? ""}
                onChange={(e) => updateProps("switchToSignUpText", e.target.value)}
                placeholder="Sign Up"
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 px-1">Label for the register link.</p>
            </div>
            <div>
              <Label htmlFor="switchToSignUpUrl" className="text-xs">Select Sign Up Page</Label>
              <Select
                value={props.switchToSignUpUrl ?? "/sign-up"}
                onValueChange={(value: string) => updateProps("switchToSignUpUrl", value)}
              >
                <SelectTrigger id="switchToSignUpUrl" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select register page" />
                </SelectTrigger>
                <SelectContent>
                  {pages && pages.map(p => (
                    <SelectItem key={p.id} value={p.path || p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">Which page contains your Sign Up form?</p>
            </div>
            <div className="mt-2 p-3 bg-blue-50/50 rounded-md border border-blue-100">
              <p className="text-[10px] text-blue-800">
                💡 <b>Usage Hint:</b> The Switch links automatically carry over URL parameters (like <code>subdomain</code>) to keep your users on the same site.
              </p>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
              <p className="text-[10px] text-blue-800">
                💡 This block automatically connects to your Project's Supabase credentials to handle authentication.
              </p>
            </div>
          </div>
        )

      case "sign-up":
        const extraFields = Array.isArray(props.extraFields) ? props.extraFields : [];

        const addExtraField = () => {
          const newField = {
            name: `field_${extraFields.length + 1}`,
            label: `New Field`,
            type: "text",
            required: false,
          };
          updateProps("extraFields", [...extraFields, newField]);
        };

        const updateExtraField = (index: number, updates: any) => {
          const newFields = [...extraFields];
          newFields[index] = { ...newFields[index], ...updates };
          updateProps("extraFields", newFields);
        };

        const removeExtraField = (index: number) => {
          const newFields = [...extraFields];
          newFields.splice(index, 1);
          updateProps("extraFields", newFields);
        };

        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-xs">Form Title</Label>
              <Input
                id="title"
                value={props.title ?? ""}
                onChange={(e) => updateProps("title", e.target.value)}
                placeholder="Sign Up"
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 px-1">The main heading shown at the top of the form.</p>
            </div>
            <div>
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Input
                id="description"
                value={props.description ?? ""}
                onChange={(e) => updateProps("description", e.target.value)}
                placeholder="Create a new account by filling out the form below."
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 px-1">Brief explanation shown below the title.</p>
            </div>
            <div>
              <Label htmlFor="buttonText" className="text-xs">Button Text</Label>
              <Input
                id="buttonText"
                value={props.buttonText ?? ""}
                onChange={(e) => updateProps("buttonText", e.target.value)}
                placeholder="Sign Up"
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 px-1">The text displayed on the registration button.</p>
            </div>
            <div>
              <Label htmlFor="redirectUrl" className="text-xs">On Success Redirect To</Label>
              <Select
                value={props.redirectUrl ?? "/"}
                onValueChange={(value: string) => updateProps("redirectUrl", value)}
              >
                <SelectTrigger id="redirectUrl" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {pages && pages.map(p => (
                    <SelectItem key={p.id} value={p.path || p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">Target URL after success. Maintains current site context.</p>
            </div>
            <div>
              <Label htmlFor="switchToSignInText" className="text-xs">Switch to Sign In Text</Label>
              <Input
                id="switchToSignInText"
                value={props.switchToSignInText ?? ""}
                onChange={(e) => updateProps("switchToSignInText", e.target.value)}
                placeholder="Sign In"
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1 px-1">Label for the login link.</p>
            </div>
            <div>
              <Label htmlFor="switchToSignInUrl" className="text-xs">Select Sign In Page</Label>
              <Select
                value={props.switchToSignInUrl ?? "/sign-in"}
                onValueChange={(value: string) => updateProps("switchToSignInUrl", value)}
              >
                <SelectTrigger id="switchToSignInUrl" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select login page" />
                </SelectTrigger>
                <SelectContent>
                  {pages && pages.map(p => (
                    <SelectItem key={p.id} value={p.path || p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">Which page contains your Sign In form?</p>
            </div>
            <div className="mt-2 p-3 bg-blue-50/50 rounded-md border border-blue-100">
              <p className="text-[10px] text-blue-800">
                💡 <b>Usage Hint:</b> The Switch links automatically carry over URL parameters (like <code>subdomain</code>) to keep your users on the same site.
              </p>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Extra Fields (User Metadata)</Label>
                <Button variant="ghost" size="sm" onClick={addExtraField} className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {extraFields.map((field: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-2 p-2 border rounded bg-slate-50 relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExtraField(idx)}
                      className="absolute right-2 top-2 h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="pr-6 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateExtraField(idx, { label: e.target.value })}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">Metadata Key</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateExtraField(idx, { name: e.target.value })}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`req-${idx}`}
                          checked={field.required}
                          onCheckedChange={(checked: boolean) => updateExtraField(idx, { required: !!checked })}
                        />
                        <Label htmlFor={`req-${idx}`} className="text-[10px]">Required field</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
              <p className="text-[10px] text-blue-800">
                💡 This block automatically connects to your Project's Supabase credentials to handle authentication.
              </p>
            </div>
          </div>
        )

      case "auth-block":
        return (
          <div className="space-y-6">
            <div className="space-y-4 border-b pb-4">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">General Settings</h4>
              <div>
                <Label htmlFor="initialMode" className="text-xs">Initial Mode</Label>
                <Select
                  value={props.initialMode || "signin"}
                  onValueChange={(value: string) => updateProps("initialMode", value)}
                >
                  <SelectTrigger id="initialMode" className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signin">Sign In</SelectItem>
                    <SelectItem value="signup">Sign Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="redirectUrl" className="text-xs">On Success Redirect To</Label>
                <Select
                  value={props.redirectUrl ?? "/"}
                  onValueChange={(value: string) => updateProps("redirectUrl", value)}
                >
                  <SelectTrigger id="redirectUrl" className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Select a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages && pages.map(p => (
                      <SelectItem key={p.id} value={p.path || p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs
              value={props.initialMode === 'signup' ? 'signup-config' : 'signin-config'}
              onValueChange={(val) => updateProps("initialMode", val === 'signup-config' ? 'signup' : 'signin')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin-config" className="text-[10px]">Sign In UI</TabsTrigger>
                <TabsTrigger value="signup-config" className="text-[10px]">Sign Up UI</TabsTrigger>
              </TabsList>

              <TabsContent value="signin-config" className="space-y-4">
                <div>
                  <Label className="text-xs">Sign In Title</Label>
                  <Input
                    value={props.signInTitle ?? ""}
                    onChange={(e) => updateProps("signInTitle", e.target.value)}
                    placeholder="Sign In"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Sign In Description</Label>
                  <Input
                    value={props.signInDescription ?? ""}
                    onChange={(e) => updateProps("signInDescription", e.target.value)}
                    placeholder="Enter your email and password to access your account."
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Sign In Button Text</Label>
                  <Input
                    value={props.signInButtonText ?? ""}
                    onChange={(e) => updateProps("signInButtonText", e.target.value)}
                    placeholder="Sign In"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </TabsContent>

              <TabsContent value="signup-config" className="space-y-4">
                <div>
                  <Label className="text-xs">Sign Up Title</Label>
                  <Input
                    value={props.signUpTitle ?? ""}
                    onChange={(e) => updateProps("signUpTitle", e.target.value)}
                    placeholder="Sign Up"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Sign Up Description</Label>
                  <Input
                    value={props.signUpDescription ?? ""}
                    onChange={(e) => updateProps("signUpDescription", e.target.value)}
                    placeholder="Create a new account by filling out the form below."
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Sign Up Button Text</Label>
                  <Input
                    value={props.signUpButtonText ?? ""}
                    onChange={(e) => updateProps("signUpButtonText", e.target.value)}
                    placeholder="Sign Up"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-medium">Extra Registration Fields</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const existingFields = Array.isArray(props.extraFields) ? props.extraFields : [];
                        const newField = {
                          name: `field_${existingFields.length + 1}`,
                          label: `New Field`,
                          type: "text",
                          required: false,
                        };
                        updateProps("extraFields", [...existingFields, newField]);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(Array.isArray(props.extraFields) ? props.extraFields : []).map((field: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-2 p-2 border rounded bg-slate-50 relative group">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentFields = Array.isArray(props.extraFields) ? props.extraFields : [];
                            const newFields = [...currentFields];
                            newFields.splice(idx, 1);
                            updateProps("extraFields", newFields);
                          }}
                          className="absolute right-2 top-2 h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="pr-6 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px]">Label</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => {
                                  const currentFields = Array.isArray(props.extraFields) ? props.extraFields : [];
                                  const newFields = [...currentFields];
                                  newFields[idx] = { ...newFields[idx], label: e.target.value };
                                  updateProps("extraFields", newFields);
                                }}
                                className="h-7 text-xs mt-0.5"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">Metadata Key</Label>
                              <Input
                                value={field.name}
                                onChange={(e) => {
                                  const currentFields = Array.isArray(props.extraFields) ? props.extraFields : [];
                                  const newFields = [...currentFields];
                                  newFields[idx] = { ...newFields[idx], name: e.target.value };
                                  updateProps("extraFields", newFields);
                                }}
                                className="h-7 text-xs mt-0.5"
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`auth-req-${idx}`}
                              checked={field.required}
                              onCheckedChange={(checked: boolean) => {
                                const currentFields = Array.isArray(props.extraFields) ? props.extraFields : [];
                                const newFields = [...currentFields];
                                newFields[idx] = { ...newFields[idx], required: !!checked };
                                updateProps("extraFields", newFields);
                              }}
                            />
                            <Label htmlFor={`auth-req-${idx}`} className="text-[10px]">Required</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
              <p className="text-[10px] text-blue-800">
                💡 This component allows users to switch between Sign In and Sign Up modes automatically.
              </p>
            </div>
          </div>
        )

      case "profile":
        const menuItems = Array.isArray(props.menuItems) ? props.menuItems : [];

        const addMenuItem = () => {
          const newItem = {
            id: Date.now().toString(),
            label: "New Page",
            path: "/",
          };
          updateProps("menuItems", [...menuItems, newItem]);
        };

        const updateMenuItem = (index: number, updates: any) => {
          const newItems = [...menuItems];
          newItems[index] = { ...newItems[index], ...updates };
          updateProps("menuItems", newItems);
        };

        const removeMenuItem = (index: number) => {
          const newItems = [...menuItems];
          newItems.splice(index, 1);
          updateProps("menuItems", newItems);
        };

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Dropdown Menu Items</Label>
              <Button variant="ghost" size="sm" onClick={addMenuItem} className="h-6 w-6 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {menuItems.map((item: any, idx: number) => (
                <div key={item.id} className="p-3 border rounded-lg bg-slate-50 relative group space-y-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMenuItem(idx)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Item Label</Label>
                      <Input
                        value={item.label}
                        onChange={(e) => updateMenuItem(idx, { label: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white"
                        placeholder="e.g. Settings"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Redirect Page</Label>
                      <Select
                        value={item.path}
                        onValueChange={(val: string) => updateMenuItem(idx, { path: val })}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1 bg-white">
                          <SelectValue placeholder="Select page" />
                        </SelectTrigger>
                        <SelectContent>
                          {pages && pages.map(p => (
                            <SelectItem key={p.id} value={p.path || p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              {menuItems.length === 0 && (
                <div className="text-center py-6 border border-dashed rounded-lg bg-white">
                  <p className="text-xs text-muted-foreground">No custom menu items</p>
                  <Button variant="link" size="sm" onClick={addMenuItem} className="text-xs h-auto p-0 mt-1">
                    Add your first item
                  </Button>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100 space-y-2">
              <p className="text-[11px] font-medium text-blue-900 leading-tight">
                💡 Logout Link
              </p>
              <p className="text-[10px] text-blue-800 leading-relaxed">
                A default "Log out" button is always included at the bottom of the dropdown. It uses your project's Supabase configuration to sign users out.
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
                  <Label className="text-xs">Autoplay Speed</Label>
                  <Select
                    value={String((props as any).autoplaySpeed || 3000)}
                    onValueChange={(value: string) => updateProps("autoplaySpeed" as any, Number.parseInt(value) || 3000)}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Select speed" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOPLAY_SPEEDS.map((speed) => (
                        <SelectItem key={speed} value={String(speed)}>
                          {speed}ms
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      case "shape":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Shape</Label>
              <Select
                value={props.shape || "rectangle"}
                onValueChange={(value: string) => {
                  updateProps("shape", value)

                  const defaults: Record<
                    string,
                    { width: number; height: number; cornerRadius?: number }
                  > = {
                    rectangle: { width: 200, height: 120, cornerRadius: 0 },
                    "rounded-rectangle": { width: 200, height: 120, cornerRadius: 12 },
                    circle: { width: 160, height: 160 },
                    ellipse: { width: 220, height: 140 },
                    triangle: { width: 180, height: 160 },
                  }

                  const d = defaults[value] || defaults.rectangle
                  updateStyle("width", `${d.width}px`)
                  updateStyle("height", `${d.height}px`)

                  if (value === "rounded-rectangle") {
                    const current = Number(props.cornerRadius)
                    if (!Number.isFinite(current) || current <= 0) {
                      updateProps("cornerRadius", d.cornerRadius ?? 12)
                    }
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rectangle">Rectangle</SelectItem>
                  <SelectItem value="rounded-rectangle">Rounded Rectangle</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="ellipse">Ellipse</SelectItem>
                  <SelectItem value="triangle">Triangle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ColorPicker
              label="Fill"
              value={props.fill || "#3b82f6"}
              onChange={(val) => updateProps("fill", val)}
              hideGradient
            />

            <ColorPicker
              label="Stroke"
              value={props.stroke || "#1f2937"}
              onChange={(val) => updateProps("stroke", val)}
              hideGradient
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Stroke Width</Label>
                <Input
                  type="number"
                  value={
                    Number.isFinite(Number(props.strokeWidth))
                      ? Number(props.strokeWidth)
                      : 2
                  }
                  onChange={(e) => updateProps("strokeWidth", Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                  min={0}
                  step={1}
                />
              </div>

              {(props.shape || "rectangle") === "rounded-rectangle" && (
                <div>
                  <Label className="text-xs">Corner Radius</Label>
                  <Input
                    type="number"
                    value={
                      Number.isFinite(Number(props.cornerRadius))
                        ? Number(props.cornerRadius)
                        : 12
                    }
                    onChange={(e) => updateProps("cornerRadius", Number(e.target.value))}
                    className="h-8 text-xs mt-1"
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
              )}
            </div>
          </div>
        )

      case "divider":
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg border border-dashed border-muted">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
            </div>
            <p className="text-xs font-medium text-foreground">Divider Component</p>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px]">All styling properties for this divider can be found in the Styling tab.</p>
          </div>
        )

      case "accordion":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Accordion Items</Label>
              {(props.items || []).map((item: any, idx: number) => (
                <div key={idx} className="mt-2 p-2 border rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Item {idx + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-500"
                      onClick={() => {
                        const newItems = [...(props.items || [])];
                        newItems.splice(idx, 1);
                        updateProps("items", newItems);
                      }}
                    >Remove</Button>
                  </div>
                  <Input
                    value={item.question || ''}
                    onChange={(e) => {
                      const newItems = [...(props.items || [])];
                      newItems[idx] = { ...newItems[idx], question: e.target.value };
                      updateProps("items", newItems);
                    }}
                    placeholder="Question"
                    className="h-7 text-xs"
                  />
                  <textarea
                    value={item.answer || ''}
                    onChange={(e) => {
                      const newItems = [...(props.items || [])];
                      newItems[idx] = { ...newItems[idx], answer: e.target.value };
                      updateProps("items", newItems);
                    }}
                    placeholder="Answer"
                    className="w-full h-16 text-xs border rounded-md p-2 resize-none"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full text-xs"
                onClick={() => {
                  const newItems = [...(props.items || []), { question: 'New Question', answer: 'New Answer' }];
                  updateProps("items", newItems);
                }}
              >+ Add Item</Button>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Allow Multiple Open</Label>
              <input
                type="checkbox"
                checked={props.allowMultiple || false}
                onChange={(e) => updateProps("allowMultiple", e.target.checked)}
              />
            </div>
          </div>
        )

      case "tabs":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Tabs</Label>
              {(props.tabs || []).map((tab: any, idx: number) => (
                <div key={idx} className="mt-2 p-2 border rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Tab {idx + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-500"
                      onClick={() => {
                        const newTabs = [...(props.tabs || [])];
                        newTabs.splice(idx, 1);
                        updateProps("tabs", newTabs);
                      }}
                    >Remove</Button>
                  </div>
                  <Input
                    value={tab.label || ''}
                    onChange={(e) => {
                      const newTabs = [...(props.tabs || [])];
                      newTabs[idx] = { ...newTabs[idx], label: e.target.value };
                      updateProps("tabs", newTabs);
                    }}
                    placeholder="Tab label"
                    className="h-7 text-xs"
                  />
                  <textarea
                    value={tab.content || ''}
                    onChange={(e) => {
                      const newTabs = [...(props.tabs || [])];
                      newTabs[idx] = { ...newTabs[idx], content: e.target.value };
                      updateProps("tabs", newTabs);
                    }}
                    placeholder="Tab content"
                    className="w-full h-16 text-xs border rounded-md p-2 resize-none"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full text-xs"
                onClick={() => {
                  const newTabs = [...(props.tabs || []), { label: `Tab ${(props.tabs || []).length + 1}`, content: 'New tab content' }];
                  updateProps("tabs", newTabs);
                }}
              >+ Add Tab</Button>
            </div>
          </div>
        )

      case "modal":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Trigger Button Text</Label>
              <Input
                value={props.triggerText || ''}
                onChange={(e) => updateProps("triggerText", e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Modal Title</Label>
              <Input
                value={props.modalTitle || ''}
                onChange={(e) => updateProps("modalTitle", e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Modal Content</Label>
              <textarea
                value={props.modalContent || ''}
                onChange={(e) => updateProps("modalContent", e.target.value)}
                className="w-full h-20 text-xs border rounded-md p-2 mt-1 resize-none"
              />
            </div>
            <div>
              <Label className="text-xs">Overlay Color</Label>
              <Input
                value={props.overlayColor || 'rgba(0,0,0,0.5)'}
                onChange={(e) => updateProps("overlayColor", e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        )

      case "select":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="select-label" className="text-xs">
                Label
              </Label>
              <Input
                id="select-label"
                value={props.label || ""}
                onChange={(e) => updateProps("label", e.target.value)}
                placeholder="Select Option"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label htmlFor="select-placeholder" className="text-xs">
                Placeholder
              </Label>
              <Input
                id="select-placeholder"
                value={props.placeholder || ""}
                onChange={(e) => updateProps("placeholder", e.target.value)}
                placeholder="Select an option..."
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Options</Label>
              {(props.options || []).map((option: any, idx: number) => (
                <div key={idx} className="mt-2 p-2 border rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Option {idx + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-500"
                      onClick={() => {
                        const newOptions = [...(props.options || [])];
                        newOptions.splice(idx, 1);
                        updateProps("options", newOptions);
                      }}
                    >Remove</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Label</Label>
                      <Input
                        value={option.label || ''}
                        onChange={(e) => {
                          const newOptions = [...(props.options || [])];
                          newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                          updateProps("options", newOptions);
                        }}
                        placeholder="Label"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Value</Label>
                      <Input
                        value={option.value || ''}
                        onChange={(e) => {
                          const newOptions = [...(props.options || [])];
                          newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                          updateProps("options", newOptions);
                        }}
                        placeholder="Value"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full text-xs"
                onClick={() => {
                  const newOptions = [...(props.options || []), { label: `Option ${(props.options || []).length + 1}`, value: `option${(props.options || []).length + 1}` }];
                  updateProps("options", newOptions);
                }}
              >+ Add Option</Button>
            </div>
          </div>
        )

      case "alert":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Variant</Label>
              <Select
                value={props.variant || 'info'}
                onValueChange={(val: string) => updateProps("variant", val)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <textarea
                value={props.message || ''}
                onChange={(e) => updateProps("message", e.target.value)}
                className="w-full h-16 text-xs border rounded-md p-2 mt-1 resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Dismissible</Label>
              <input
                type="checkbox"
                checked={props.dismissible || false}
                onChange={(e) => updateProps("dismissible", e.target.checked)}
              />
            </div>
            <div>
              <Label className="text-xs">Trigger Mode</Label>
              <Select
                value={props.triggerMode || 'visible'}
                onValueChange={(val: string) => updateProps("triggerMode", val)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">Always Visible</SelectItem>
                  <SelectItem value="action">Triggered by Button Action</SelectItem>
                </SelectContent>
              </Select>
              {props.triggerMode === 'action' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Use "Show Alert" action on a button to trigger this.
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Show Duration (seconds)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={props.showDuration || 0}
                onChange={(e) => updateProps("showDuration", parseInt(e.target.value) || 0)}
                className="h-8 text-xs mt-1"
                placeholder="0 = persistent"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Enter 0 to keep the alert visible until dismissed manually.
              </p>
            </div>
          </div>
        )

      case "checkbox":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="checkbox-label" className="text-xs">
                Label
              </Label>
              <Input
                id="checkbox-label"
                value={props.label || ""}
                onChange={(e) => updateProps("label", e.target.value)}
                placeholder="Checkbox Label"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Initially Checked</Label>
              <Switch
                checked={props.checked || false}
                onCheckedChange={(checked) => updateProps("checked", checked)}
              />
            </div>
          </div>
        )

      case "radio-group":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="radio-label" className="text-xs">
                Group Label
              </Label>
              <Input
                id="radio-label"
                value={props.label || ""}
                onChange={(e) => updateProps("label", e.target.value)}
                placeholder="Choose an option"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Options</Label>
              {(props.options || []).map((option: any, idx: number) => (
                <div key={idx} className="mt-2 p-2 border rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Option {idx + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-500"
                      onClick={() => {
                        const newOptions = [...(props.options || [])];
                        newOptions.splice(idx, 1);
                        updateProps("options", newOptions);
                      }}
                    >Remove</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Label</Label>
                      <Input
                        value={option.label || ''}
                        onChange={(e) => {
                          const newOptions = [...(props.options || [])];
                          newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                          updateProps("options", newOptions);
                        }}
                        placeholder="Label"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Value</Label>
                      <Input
                        value={option.value || ''}
                        onChange={(e) => {
                          const newOptions = [...(props.options || [])];
                          newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                          updateProps("options", newOptions);
                        }}
                        placeholder="Value"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full text-xs"
                onClick={() => {
                  const newOptions = [...(props.options || []), { label: `Option ${(props.options || []).length + 1}`, value: `option${(props.options || []).length + 1}` }];
                  updateProps("options", newOptions);
                }}
              >+ Add Option</Button>
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
            <div>
              <Label htmlFor="imageShape" className="text-xs">
                Image Shape
              </Label>
              <Select
                value={props.imageShape || "original"}
                onValueChange={(value) => updateProps("imageShape", value)}
              >
                <SelectTrigger id="imageShape" className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original (Default)</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="rounded">Rounded Corners</SelectItem>
                  <SelectItem value="pill">Pill Shape</SelectItem>
                  <SelectItem value="squircle">Squircle</SelectItem>
                  <SelectItem value="hexagon">Hexagon</SelectItem>
                  <SelectItem value="diamond">Diamond</SelectItem>
                  <SelectItem value="triangle">Triangle</SelectItem>
                  <SelectItem value="parallelogram">Parallelogram</SelectItem>
                  <SelectItem value="star">Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "navbar":
        const navLinks: string[] = Array.isArray(props.links) ? props.links : []
        const navLinkUrls: string[] = Array.isArray(props.linkUrls) ? props.linkUrls : []
        const navLinkTypes: string[] = Array.isArray(props.linkTypes) ? props.linkTypes : navLinks.map(() => "url")

        const addNavLink = () => {
          onUpdateComponent(selectedComponent.id, {
            props: {
              ...selectedComponent.props,
              links: [...navLinks, "New Link"],
              linkUrls: [...navLinkUrls, "#"],
              linkTypes: [...navLinkTypes, "url"],
            },
          })
        }

        const updateNavLink = (index: number, value: string) => {
          const updated = [...navLinks]
          updated[index] = value
          updateProps("links", updated)
        }

        const updateNavLinkUrl = (index: number, url: string) => {
          const updatedUrls = [...navLinkUrls]
          while (updatedUrls.length <= index) {
            updatedUrls.push("#")
          }
          updatedUrls[index] = url
          onUpdateComponent(selectedComponent.id, {
            props: {
              ...selectedComponent.props,
              links: navLinks,
              linkUrls: updatedUrls,
            },
          })
        }

        const updateNavLinkType = (index: number, type: string) => {
          const updatedTypes = [...navLinkTypes]
          while (updatedTypes.length <= index) {
            updatedTypes.push("url")
          }
          updatedTypes[index] = type
          updateProps("linkTypes", updatedTypes)
        }

        const removeNavLink = (index: number) => {
          onUpdateComponent(selectedComponent.id, {
            props: {
              ...selectedComponent.props,
              links: navLinks.filter((_, i) => i !== index),
              linkUrls: navLinkUrls.filter((_, i) => i !== index),
              linkTypes: navLinkTypes.filter((_, i) => i !== index),
            },
          })
        }

        const moveNavLink = (index: number, direction: "up" | "down") => {
          const updatedLinks = [...navLinks]
          const updatedUrls = [...navLinkUrls]
          const updatedTypes = [...navLinkTypes]
          const target = direction === "up" ? index - 1 : index + 1
          if (target < 0 || target >= updatedLinks.length) return

          while (updatedUrls.length <= Math.max(index, target)) updatedUrls.push("#")
          while (updatedTypes.length <= Math.max(index, target)) updatedTypes.push("url")

            ;[updatedLinks[index], updatedLinks[target]] = [updatedLinks[target], updatedLinks[index]]
            ;[updatedUrls[index], updatedUrls[target]] = [updatedUrls[target], updatedUrls[index]]
            ;[updatedTypes[index], updatedTypes[target]] = [updatedTypes[target], updatedTypes[index]]

          onUpdateComponent(selectedComponent.id, {
            props: {
              ...selectedComponent.props,
              links: updatedLinks,
              linkUrls: updatedUrls,
              linkTypes: updatedTypes,
            }
          })
        }

        const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0]
          if (!file) return

          try {
            const fileExt = file.name.split(".").pop()
            const fileName = `navbar-logos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

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

            updateProps("logoUrl", publicUrl)
          } catch (error) {
            console.error("Error handling file upload:", error)
          } finally {
            e.target.value = ""
          }
        }

        return (
          <div className="space-y-3">
            {/* Brand */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="logoUrl" className="text-xs">
                  Logo URL
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="logoUrl"
                    value={props.logoUrl || ""}
                    onChange={(e) => updateProps("logoUrl", e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="h-8 text-xs flex-1"
                  />
                  <Label className="cursor-pointer bg-muted hover:bg-muted/80 h-8 w-8 flex items-center justify-center rounded border border-input transition-colors shrink-0">
                    <Upload className="h-4 w-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </Label>
                </div>
              </div>

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
                <Label htmlFor="linkFontSize" className="text-xs">
                  Link Font Size
                </Label>
                <Select
                  value={String(props.linkFontSize || "14")}
                  onValueChange={(value) => updateProps("linkFontSize", value)}
                >
                  <SelectTrigger id="linkFontSize" className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="logoShape" className="text-xs">
                  Logo Shape
                </Label>
                <Select
                  value={props.logoShape || "original"}
                  onValueChange={(value) => updateProps("logoShape", value)}
                >
                  <SelectTrigger id="logoShape" className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nav Links */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Navigation Links</Label>
                <Button variant="ghost" size="sm" onClick={addNavLink} className="h-6 text-xs px-2">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Link
                </Button>
              </div>

              {navLinks.length === 0 ? (
                <div className="text-center py-3 border border-dashed rounded-md">
                  <p className="text-xs text-muted-foreground">No links yet</p>
                  <Button variant="ghost" size="sm" onClick={addNavLink} className="h-6 text-xs mt-1">
                    <Plus className="h-3 w-3 mr-1" />
                    Add your first link
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {navLinks.map((link, idx) => {
                    const currentUrl = navLinkUrls[idx] || "#"

                    // Add this derived value right below:
                    const isKnownUrl = pages?.some(p => p.path === currentUrl)
                    const selectValue = (!currentUrl || currentUrl === "#" || !isKnownUrl) ? "none" : currentUrl

                    return (
                      <div key={idx} className="flex gap-2 group p-2 border border-border rounded bg-muted/20">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-1 items-center justify-center -ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveNavLink(idx, "up")}
                            disabled={idx === 0}
                            className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 bg-background border"
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                              <path d="M4 1L7 6H1L4 1Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveNavLink(idx, "down")}
                            disabled={idx === navLinks.length - 1}
                            className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 bg-background border"
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                              <path d="M4 7L1 2H7L4 7Z" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex-1 space-y-2">
                          {/* Link label input */}
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] w-10 shrink-0">Label</Label>
                            <Input
                              value={link}
                              onChange={(e) => updateNavLink(idx, e.target.value)}
                              placeholder={`Link ${idx + 1}`}
                              className="h-7 text-xs flex-1"
                            />
                            {/* Remove button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeNavLink(idx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Link Type selection */}
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] w-10 shrink-0">Type</Label>
                            <Select
                              value={navLinkTypes[idx] || "url"}
                              onValueChange={(val: string) => updateNavLinkType(idx, val)}
                            >
                              <SelectTrigger className="h-7 text-xs flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="url">Link to URL</SelectItem>
                                <SelectItem value="scroll">Scroll to ID</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Link target selection */}
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] w-10 shrink-0">
                              {navLinkTypes[idx] === "scroll" ? "ID" : "Link To"}
                            </Label>
                            <div className="flex-1 flex flex-col gap-1">
                              {navLinkTypes[idx] === "scroll" ? (
                                <div className="space-y-1">
                                  <Input
                                    value={currentUrl.startsWith("#") && currentUrl !== "#" ? currentUrl.substring(1) : (currentUrl === "#" ? "" : currentUrl)}
                                    onChange={(e) => updateNavLinkUrl(idx, `#${e.target.value.replace(/^#/, "")}`)}
                                    placeholder="element-id (e.g. contact)"
                                    className="h-7 text-xs flex-1"
                                  />
                                  <p className="text-[10px] text-muted-foreground">
                                    Target an element ID to scroll smoothly to it.
                                  </p>
                                </div>
                              ) : (
                                <Select
                                  value={selectValue}
                                  onValueChange={(val: string) => {
                                    if (val === "none") {
                                      updateNavLinkUrl(idx, "#")
                                    } else {
                                      updateNavLinkUrl(idx, val)
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs w-full">
                                    <SelectValue>
                                      {selectValue === "none" ? (
                                        currentUrl && currentUrl !== "#" ? (
                                          <span className="text-foreground">{currentUrl}</span>
                                        ) : (
                                          <span className="text-muted-foreground italic">No link (—)</span>
                                        )
                                      ) : (
                                        <span>{pages?.find((p) => p.path === currentUrl)?.name ?? currentUrl}</span>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No link (—)</SelectItem>
                                    {pages && pages.length > 0 && (
                                      <>
                                        <SelectItem value="separator" disabled className="text-[10px] font-bold opacity-50 py-1">--- Internal Pages ---</SelectItem>
                                        {pages.map((p) => (
                                          <SelectItem key={p.id} value={p.path || "/"}>
                                            {p.name}
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                    <SelectItem value="separator" disabled className="text-[10px] font-bold opacity-50 py-1">--- Custom ---</SelectItem>
                                    <div className="p-2">
                                      <Input
                                        placeholder="Paste URL or ID..."
                                        className="h-7 text-xs"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateNavLinkUrl(idx, e.currentTarget.value);
                                            e.preventDefault();
                                          }
                                        }}
                                      />
                                    </div>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground mt-2">
                {navLinks.length} link{navLinks.length !== 1 ? "s" : ""}
              </p>
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
                <Select
                  value={String(props.columns || "3")}
                  onValueChange={(value: string) => updateProps("columns", Number.parseInt(value))}
                >
                  <SelectTrigger id="columns" className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Columns" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRID_COLUMNS.map((col) => (
                      <SelectItem key={col} value={String(col)}>
                        {col} Column{col > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="gap" className="text-xs">
                Gap
              </Label>
              <Select
                value={String(props.gap || "16").replace("px", "").replace("rem", "16")}
                onValueChange={(value: string) => updateProps("gap", `${value}px`)}
              >
                <SelectTrigger id="gap" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {SPACING_VALUES.map((val) => (
                    <SelectItem key={val} value={String(val)}>
                      {val}px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="padding" className="text-xs">
                Padding
              </Label>
              <Select
                value={String(props.padding || "16").replace("px", "").replace("rem", "16")}
                onValueChange={(value: string) => updateProps("padding", `${value}px`)}
              >
                <SelectTrigger id="padding" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {SPACING_VALUES.map((val) => (
                    <SelectItem key={val} value={String(val)}>
                      {val}px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        const formFields = props.fields || []

        const addFormField = () => {
          const newField = {
            id: `field-${Date.now()}`,
            label: "New Field",
            placeholder: "Enter value",
            type: "text",
            required: false,
          }
          updateProps("fields", [...formFields, newField])
        }

        const updateFormField = (id: string, updates: any) => {
          const updatedFields = formFields.map((f: any) => (f.id === id ? { ...f, ...updates } : f))
          updateProps("fields", updatedFields)
        }

        const removeFormField = (id: string) => {
          updateProps(
            "fields",
            formFields.filter((f: any) => f.id !== id),
          )
        }

        const moveFormField = (index: number, direction: "up" | "down") => {
          if (direction === "up" && index === 0) return
          if (direction === "down" && index === formFields.length - 1) return

          const newFields = [...formFields]
          const targetIndex = direction === "up" ? index - 1 : index + 1
            ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]

          updateProps("fields", newFields)
        }

        return (
          <div className="space-y-4">
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
              <Label htmlFor="recipientEmail" className="text-xs">
                Recipient Email
              </Label>
              <Input
                id="recipientEmail"
                type="email"
                value={props.recipientEmail || ""}
                onChange={(e) => updateProps("recipientEmail", e.target.value)}
                placeholder="hello@example.com"
                className="h-8 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                The email address that will receive form submissions.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Form Fields</Label>
                <Button variant="ghost" size="sm" onClick={addFormField} className="h-7 text-xs px-2">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
                </Button>
              </div>

              {formFields.length === 0 ? (
                <div className="text-center py-4 border border-dashed rounded-md">
                  <p className="text-[10px] text-muted-foreground">No fields added</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formFields.map((field: any, index: number) => (
                    <div key={field.id} className="p-3 border rounded-md space-y-2 relative group">
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-primary disabled:opacity-30"
                            onClick={() => moveFormField(index, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-primary disabled:opacity-30"
                            onClick={() => moveFormField(index, "down")}
                            disabled={index === formFields.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => removeFormField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Label</Label>
                        <Input
                          value={field.label || ""}
                          onChange={(e) => updateFormField(field.id, { label: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Type</Label>
                          <Select
                            value={field.type || "text"}
                            onValueChange={(val: any) => updateFormField(field.id, { type: val })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="tel">Phone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Required</Label>
                          <div className="flex items-center h-7">
                            <Switch
                              checked={!!field.required}
                              onCheckedChange={(checked) => updateFormField(field.id, { required: checked })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Placeholder</Label>
                        <Input
                          value={field.placeholder || ""}
                          onChange={(e) => updateFormField(field.id, { placeholder: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      case "dynamic-form": {
        const fields = props.fields || []
        const submitActions = props.submitButtonActions || []
        const supabaseAction = submitActions.find((a: any) => a.handlerType === 'supabase') || {}

        const addField = () => {
          const newField = {
            id: `field-${Date.now()}`,
            label: 'New Field',
            placeholder: 'Enter value...',
            type: 'text',
            required: false,
            fieldName: `field_${fields.length + 1}`,
            mappedColumn: ''
          }
          updateProps('fields', [...fields, newField])
        }

        const removeField = (index: number) => {
          const newFields = fields.filter((_: any, i: number) => i !== index)
          updateProps('fields', newFields)
        }

        const updateField = (index: number, key: string, value: any) => {
          const newFields = fields.map((f: any, i: number) =>
            i === index ? { ...f, [key]: value } : f
          )
          updateProps('fields', newFields)
        }

        const moveField = (index: number, direction: 'up' | 'down') => {
          if (direction === 'up' && index === 0) return
          if (direction === 'down' && index === fields.length - 1) return

          const newFields = [...fields]
          const targetIndex = direction === 'up' ? index - 1 : index + 1
            ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]

          updateProps('fields', newFields)
        }

        const updateSupabaseAction = (key: string, value: any) => {
          const actionIndex = submitActions.findIndex((a: any) => a.handlerType === 'supabase')
          let newActions = [...submitActions]

          if (actionIndex === -1) {
            newActions.push({
              id: `action-${Date.now()}`,
              type: 'onClick',
              handlerType: 'supabase',
              handler: '',
              supabaseOperation: 'insert',
              supabaseTable: '',
              supabaseData: {}
            })
          }

          const actionIdx = actionIndex === -1 ? newActions.length - 1 : actionIndex
          newActions[actionIdx] = { ...newActions[actionIdx], [key]: value }

          // Sync top-level props for backward compatibility and UI binding
          const updates: any = { submitButtonActions: newActions }
          if (key === 'supabaseOperation') updates.supabaseOperation = value
          if (key === 'supabaseTable') updates.supabaseTable = value

          onUpdateComponent(selectedComponent.id, {
            props: {
              ...selectedComponent.props,
              ...updates
            }
          })
        }

        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dynamic-form-title">Form Title</Label>
              <Input
                id="dynamic-form-title"
                value={props.title || ""}
                onChange={(e) => updateProps("title", e.target.value)}
                placeholder="Dynamic Form"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label htmlFor="submit-button-text">Submit Button Text</Label>
              <Input
                id="submit-button-text"
                value={props.submitButtonText || "Submit"}
                onChange={(e) => updateProps("submitButtonText", e.target.value)}
                placeholder="Submit"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Button Alignment</Label>
                <div className="flex items-center gap-1 border rounded-md p-0.5 bg-background">
                  <Button
                    variant={props.submitButtonAlignment === "left" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateProps("submitButtonAlignment", "left")}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={props.submitButtonAlignment === "center" || !props.submitButtonAlignment ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateProps("submitButtonAlignment", "center")}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={props.submitButtonAlignment === "right" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateProps("submitButtonAlignment", "right")}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={props.submitButtonAlignment === "full" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateProps("submitButtonAlignment", "full")}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="w-4 h-0.5 bg-current opacity-50" />
                      <div className="w-4 h-0.5 bg-current" />
                      <div className="w-4 h-0.5 bg-current opacity-50" />
                    </div>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Button Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border cursor-pointer shadow-sm"
                    style={{ backgroundColor: props.submitButtonColor || "#3b82f6" }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = props.submitButtonColor || "#3b82f6";
                      input.onchange = (e) => updateProps("submitButtonColor", (e.target as HTMLInputElement).value);
                      input.click();
                    }}
                  />
                  <Input
                    value={props.submitButtonColor || "#3b82f6"}
                    onChange={(e) => updateProps("submitButtonColor", e.target.value)}
                    className="h-7 w-24 text-[10px] font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Supabase Configuration
              </h4>

              <div>
                <Label htmlFor="supabase-table">Table Name</Label>
                <Input
                  id="supabase-table"
                  value={props.supabaseTable || supabaseAction.supabaseTable || ""}
                  onChange={(e) => {
                    updateSupabaseAction("supabaseTable", e.target.value)
                  }}
                  placeholder="users, orders, etc."
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="supabase-operation">CRUD Operation</Label>
                <select
                  id="supabase-operation"
                  value={props.supabaseOperation || supabaseAction.supabaseOperation || "insert"}
                  onChange={(e) => {
                    updateSupabaseAction("supabaseOperation", e.target.value)
                  }}
                  className="w-full h-8 text-xs px-2 border rounded bg-background"
                >
                  <option value="insert">Insert (Create)</option>
                  <option value="select">Select (Read)</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                </select>
              </div>

              {/* Filters for non-insert operations */}
              {(props.supabaseOperation || supabaseAction.supabaseOperation || "insert") !== "insert" && (
                <div className="space-y-3 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">WHERE Conditions</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFilters = [...(supabaseAction.supabaseFilters || [])]
                        newFilters.push({
                          column: '',
                          operator: 'eq',
                          value: '',
                          logicalOperator: newFilters.length > 0 ? 'and' : null
                        })
                        updateSupabaseAction('supabaseFilters', newFilters)
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Filter
                    </Button>
                  </div>

                  {(supabaseAction.supabaseFilters || []).length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">
                      No filters added. Click "Add Filter" to add WHERE conditions.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(supabaseAction.supabaseFilters || []).map((filter: any, index: number) => (
                        <div key={index} className="border rounded p-2 space-y-2 bg-background">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Filter {index + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newFilters = [...(supabaseAction.supabaseFilters || [])]
                                newFilters.splice(index, 1)
                                updateSupabaseAction('supabaseFilters', newFilters)
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          {index > 0 && (
                            <div>
                              <Label className="text-[10px]">Logical Operator</Label>
                              <Select
                                value={filter.logicalOperator || 'and'}
                                onValueChange={(value) => {
                                  const newFilters = [...(supabaseAction.supabaseFilters || [])]
                                  newFilters[index] = { ...filter, logicalOperator: value }
                                  updateSupabaseAction('supabaseFilters', newFilters)
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="and">AND</SelectItem>
                                  <SelectItem value="or">OR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px]">Column</Label>
                              <Input
                                value={filter.column || ""}
                                onChange={(e) => {
                                  const newFilters = [...(supabaseAction.supabaseFilters || [])]
                                  newFilters[index] = { ...filter, column: e.target.value }
                                  updateSupabaseAction('supabaseFilters', newFilters)
                                }}
                                placeholder="column_name"
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">Operator</Label>
                              <Select
                                value={filter.operator || 'eq'}
                                onValueChange={(value) => {
                                  const newFilters = [...(supabaseAction.supabaseFilters || [])]
                                  newFilters[index] = { ...filter, operator: value }
                                  updateSupabaseAction('supabaseFilters', newFilters)
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="eq">Equal (=)</SelectItem>
                                  <SelectItem value="neq">Not Equal (!=)</SelectItem>
                                  <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                                  <SelectItem value="gte">Greater or Equal (&gt;=)</SelectItem>
                                  <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                                  <SelectItem value="lte">Less or Equal (&lt;=)</SelectItem>
                                  <SelectItem value="like">Like (ILIKE)</SelectItem>
                                  <SelectItem value="in">In (IN)</SelectItem>
                                  <SelectItem value="is">Is (IS NULL/NOT NULL)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px]">Value</Label>
                            <Input
                              value={filter.value || ""}
                              onChange={(e) => {
                                const newFilters = [...(supabaseAction.supabaseFilters || [])]
                                newFilters[index] = { ...filter, value: e.target.value }
                                updateSupabaseAction('supabaseFilters', newFilters)
                              }}
                              placeholder="filter value"
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Form Fields ({fields.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addField}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No fields yet. Click "Add Field" to start.
                </p>
              )}

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {fields.map((field: any, index: number) => (
                  <div key={field.id} className="border rounded p-2 space-y-2 bg-background">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">Field {index + 1}</span>
                        <div className="flex items-center ml-2 border rounded overflow-hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-none border-r"
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-none"
                            onClick={() => moveField(index, 'down')}
                            disabled={index === fields.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(index)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Field Name (ID)</Label>
                        <Input
                          value={field.fieldName || ""}
                          onChange={(e) => updateField(index, "fieldName", e.target.value)}
                          placeholder="field_name"
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">DB Column</Label>
                        <Input
                          value={field.mappedColumn || ""}
                          onChange={(e) => updateField(index, "mappedColumn", e.target.value)}
                          placeholder="column_name"
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Label</Label>
                        <Input
                          value={field.label || ""}
                          onChange={(e) => updateField(index, "label", e.target.value)}
                          placeholder="Field Label"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Type</Label>
                        <Select
                          value={field.type || "text"}
                          onValueChange={(value) => updateField(index, "type", value)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="password">Password</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px]">Placeholder</Label>
                      <Input
                        value={field.placeholder || ""}
                        onChange={(e) => updateField(index, "placeholder", e.target.value)}
                        placeholder="Enter placeholder..."
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={field.required || false}
                        onChange={(e) => updateField(index, "required", e.target.checked)}
                        className="w-3 h-3"
                      />
                      <Label htmlFor={`required-${index}`} className="text-[10px] cursor-pointer">
                        Required field
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="dynamic-form-width">Width (px)</Label>
                <Input
                  id="dynamic-form-width"
                  type="number"
                  value={selectedComponent.style?.width?.replace("px", "") || "400"}
                  onChange={(e) => updateStyle("width", `${e.target.value}px`)}
                  placeholder="400"
                  min="200"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dynamic-form-height">Height (px)</Label>
                <Input
                  id="dynamic-form-height"
                  type="number"
                  value={selectedComponent.style?.height?.replace("px", "") || "350"}
                  onChange={(e) => updateStyle("height", `${e.target.value}px`)}
                  placeholder="350"
                  min="200"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>
        )
      }

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
    <div
      id="properties-panel"
      data-tour="properties-panel"
      className="w-72 border-l bg-background flex flex-col h-full"
    >
      {/* Component Header */}
      <div className="p-3 border-b shrink-0 bg-background hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Selected</span>
            <Button variant="outline" size="sm" className="h-6 text-xs bg-transparent" onClick={testScrollToElement}>
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
            disabled={selectedComponent.props?.enableCustomCss && selectedComponent.type !== 'custom-component'}
            className="text-xs h-7 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onChange={(e) => {
                      const val = e.target.value.trim().startsWith('#')
                        ? e.target.value.trim().substring(1)
                        : e.target.value.trim();
                      updateProps("elementId", val);
                    }}
                    placeholder="hero-section"
                    className="h-7 text-xs bg-accent/20 border-accent/40 focus:bg-accent/30 focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Used for anchor links and triggering alerts. Must be unique.
                    Do not use dots (.) or hashes (#); the system handles those automatically.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Custom CSS</Label>
                    {selectedComponent.props?.enableCustomCss && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1 bg-primary/10 text-primary border-primary/20">Enabled</Badge>
                    )}
                  </div>

                  {['text', 'heading', 'button'].includes(selectedComponent.type) ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 bg-accent/20 border-accent/40 hover:bg-accent/40 transition-colors"
                        onClick={() => setIsCustomCssModalOpen(true)}
                      >
                        <Sparkles className="w-3 h-3 mr-2 text-primary" />
                        Write Custom CSS
                      </Button>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Add custom CSS rules targeting this specific component. This overrides default styling if enabled and disables Styling tab.
                      </p>
                    </>
                  ) : selectedComponent.type === 'custom-component' ? (
                    <div className="space-y-3">
                      <div className="bg-primary/5 border border-primary/20 rounded-md p-2 space-y-1.5">
                        <div className="flex items-center gap-2 text-primary">
                          <Info className="w-3 h-3" />
                          <span className="text-[10px] font-medium uppercase tracking-wider">Custom Component</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          This is a custom component you created. You can manage its appearance directly in the <b>Styling</b> tab.
                        </p>
                        <p className="text-[10px] text-primary/80 font-medium italic leading-tight">
                          Switch to the Styling tab to edit CSS or use the sidebar pencil icon for core logic.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-accent/10 p-2 rounded-md border border-accent/20">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-medium">Integrations</Label>
                            <p className="text-[10px] text-muted-foreground">Connect external services</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsIntegrationModalOpen(true)}
                            className="h-7 text-xs bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary transition-colors"
                          >
                            <Code2 className="w-3 h-3 mr-2" />
                            Add Integration
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-500">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Note</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        This component cannot be edited with custom CSS because it contains complex nested structures.
                        To maintain stability and ensure cross-browser compatibility, direct CSS overrides are disabled for advanced components.
                        <b> But you can use the styling tab to style this component</b>
                      </p>
                      <p className="text-[10px] text-amber-600/80 font-medium italic leading-tight">
                        Full CSS customization is available for basic elements like Text, Heading, and Buttons.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between bg-accent/10 p-2 rounded-md border border-accent/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="element-visibility" className="text-xs font-medium">
                      Initial Visibility
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Is the component visible on load?</p>
                  </div>
                  <Switch
                    id="element-visibility"
                    checked={selectedComponent.props?.isVisible !== false}
                    onCheckedChange={(checked: boolean) => updateProps("isVisible", checked)}
                  />
                </div>
                {pages && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Page Assignment</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs w-full justify-between bg-accent/20 border-accent/40 font-normal"
                        >
                          <span className="truncate">
                            {selectedComponent.page_ids?.includes("all")
                              ? "Global (All Pages)"
                              : selectedComponent.page_ids && selectedComponent.page_ids.length > 0
                                ? `${selectedComponent.page_ids.length} Page${selectedComponent.page_ids.length > 1 ? 's' : ''} Selected`
                                : "Select Pages..."}
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-2" align="start">
                        <div className="space-y-2">
                          <div
                            className="flex items-center space-x-2 p-1 hover:bg-accent rounded cursor-pointer"
                            onClick={() => {
                              const originId = selectedComponent.page_id || activePageId || "home";
                              const currentIds = selectedComponent.page_ids || [];
                              const newIds = currentIds.includes("all")
                                ? [originId]
                                : ["all"];
                              onUpdateComponent(selectedComponent.id, {
                                page_ids: newIds,
                                page_id: selectedComponent.page_id || originId
                              });
                            }}
                          >
                            <Checkbox
                              id="page-all"
                              checked={selectedComponent.page_ids?.includes("all")}
                              onCheckedChange={(checked: boolean) => {
                                const originId = selectedComponent.page_id || activePageId || "home";
                                const newIds = checked
                                  ? ["all"]
                                  : [originId];
                                onUpdateComponent(selectedComponent.id, {
                                  page_ids: newIds,
                                  page_id: selectedComponent.page_id || originId
                                });
                              }}
                            />
                            <Label htmlFor="page-all" className="text-xs cursor-pointer flex-1">Global (All Pages)</Label>
                          </div>

                          <Separator className="my-1" />

                          <div className="max-h-[200px] overflow-y-auto space-y-1 pt-1">
                            {pages.map(p => {
                              const isSelected = selectedComponent.page_ids?.includes(p.id) || selectedComponent.page_ids?.includes("all");
                              const isDisabled = selectedComponent.page_ids?.includes("all");

                              return (
                                <div
                                  key={p.id}
                                  className={`flex items-center space-x-2 p-1 hover:bg-accent rounded cursor-pointer ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={() => {
                                    if (isDisabled) return;
                                    const originId = selectedComponent.page_id || activePageId || "home";
                                    const currentIds = selectedComponent.page_ids || [];
                                    let newIds = currentIds.includes(p.id)
                                      ? currentIds.filter(id => id !== p.id)
                                      : [...currentIds, p.id];

                                    if (newIds.length === 0) {
                                      newIds = [originId];
                                    }

                                    onUpdateComponent(selectedComponent.id, {
                                      page_ids: newIds,
                                      page_id: selectedComponent.page_id || originId
                                    });
                                  }}
                                >
                                  <Checkbox
                                    id={`page-${p.id}`}
                                    checked={isSelected}
                                    disabled={isDisabled}
                                    onCheckedChange={(checked: boolean) => {
                                      if (isDisabled) return;
                                      const originId = selectedComponent.page_id || activePageId || "home";
                                      const currentIds = selectedComponent.page_ids || [];
                                      let newIds = checked
                                        ? [...currentIds, p.id]
                                        : currentIds.filter(id => id !== p.id);

                                      if (newIds.length === 0) {
                                        newIds = [originId];
                                      }

                                      onUpdateComponent(selectedComponent.id, {
                                        page_ids: newIds,
                                        page_id: selectedComponent.page_id || originId
                                      });
                                    }}
                                  />
                                  <div className="flex-1 flex items-center justify-between">
                                    <Label htmlFor={`page-${p.id}`} className="text-xs cursor-pointer">{p.name}</Label>
                                    {(selectedComponent.page_id === p.id || (!selectedComponent.page_id && (p.id === activePageId || p.id === 'home'))) && (
                                      <Badge variant="outline" className="text-xs py-0 ml-2 h-6 bg-primary/5 text-primary border-primary/20">
                                        Origin
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </PopoverContent>
                      <p className="text-[10px] text-muted-foreground">Make your component visible on multiple pages.</p>
                    </Popover>
                  </div>
                )}
              </div>
              {renderPropertyInputs()}
            </div>
          </TabsContent>

          <TabsContent value="styling" className="p-3 space-y-3 mt-0 h-full">
            {selectedComponent.type === 'custom-component' ? (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">AI Styling Assistant</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Use AI to modify the styling of this component with natural language prompts and live preview.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8 bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary transition-colors"
                    onClick={() => setIsAIStylingModalOpen(true)}
                  >
                    <Sparkles className="w-3 h-3 mr-2" />
                    AI Styling Assistant
                  </Button>
                </div>
                <Separator className="opacity-50" />

              </div>
            ) : (
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
                      <div className="grid grid-cols-2 gap-3">
                        <ColorPicker
                          label="Background"
                          value={selectedComponent.style?.background || selectedComponent.style?.backgroundColor || "#ffffff"}
                          onChange={(val) => {
                            const isGrad = val.includes('gradient');
                            onUpdateComponent(selectedComponent.id, {
                              ...selectedComponent,
                              style: {
                                ...selectedComponent.style,
                                backgroundColor: isGrad ? undefined : val,
                                background: isGrad ? val : "",
                              },
                            });
                          }}
                        />
                        <ColorPicker
                          label="Text Color"
                          value={selectedComponent.style?.color || "#000000"}
                          onChange={(val) => updateStyle("color", val)}
                        />
                        <ColorPicker
                          label="Hover Color"
                          value={selectedComponent.style?.["--nav-hover"] || "#f3f4f6"}
                          onChange={(val) => updateStyle("--nav-hover", val)}
                        />
                        <ColorPicker
                          label="Active Color"
                          value={selectedComponent.style?.["--nav-active"] || "#e5e7eb"}
                          onChange={(val) => updateStyle("--nav-active", val)}
                        />
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
                                styleStr(selectedComponent.style?.padding).replace("rem", "") || "1",
                              ).toFixed(1)}
                              onChange={(e) => updateStyle("padding", `${e.target.value}rem`)}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-xs w-8">
                              {Number.parseFloat(styleStr(selectedComponent.style?.padding).replace("rem", "") || "1").toFixed(1)}
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
                              value={Number.parseInt(styleStr(selectedComponent.style?.borderRadius).replace("px", "") || "0")}
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

                  {/* Divider Styling Section */}
                  {selectedComponent.type === "divider" && (
                    <div className="bg-muted/30 rounded-lg p-2.5 space-y-3">
                      <Label className="text-xs font-semibold">Divider Styling</Label>

                      <div>
                        <Label className="text-xs text-muted-foreground">Line Style</Label>
                        <Select
                          value={selectedComponent.props.styleType || 'solid'}
                          onValueChange={(val: string) => updateProps("styleType", val)}
                        >
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solid">Solid</SelectItem>
                            <SelectItem value="dashed">Dashed</SelectItem>
                            <SelectItem value="dotted">Dotted</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Thickness</Label>
                        <Select
                          value={String(selectedComponent.props.thickness || '1px').replace("px", "")}
                          onValueChange={(val: string) => updateProps("thickness", `${val}px`)}
                        >
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIVIDER_THICKNESS.map((t) => (
                              <SelectItem key={t} value={String(t)}>
                                {t}px
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <ColorPicker
                        label="Color"
                        value={selectedComponent.props.color || '#e5e7eb'}
                        onChange={(val) => updateProps("color", val)}
                      />
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

                      {/* Font Size */}
                      {(selectedComponent.type === "text" || selectedComponent.type === "heading") && (
                        <div>
                          <div className="flex justify-between items-center">
                            <Label className="text-xs text-muted-foreground">Font Size</Label>
                            <span className="text-xs text-muted-foreground">
                              {selectedComponent.style?.fontSize || (selectedComponent.type === "heading" ? "24px" : "16px")}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Select
                              value={String(selectedComponent.style?.fontSize ?? "").replace("px", "") || (selectedComponent.type === "heading" ? "24" : "16")}
                              onValueChange={(value: string) => updateStyle("fontSize", `${value}px`)}
                            >
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Size" />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_SIZES.map((size) => (
                                  <SelectItem key={size} value={String(size)}>
                                    {size}px
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                          <Select
                            value={styleStr(selectedComponent.style?.letterSpacing).replace("px", "") || "0"}
                            onValueChange={(value: string) => updateStyle("letterSpacing", `${value}px`)}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Spacing" />
                            </SelectTrigger>
                            <SelectContent>
                              {LETTER_SPACING_VALUES.map((val) => (
                                <SelectItem key={val} value={String(val)}>
                                  {val}px
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Select
                            value={String(selectedComponent.style?.lineHeight || "1.5")}
                            onValueChange={(value: string) => updateStyle("lineHeight", value)}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Line Height" />
                            </SelectTrigger>
                            <SelectContent>
                              {LINE_HEIGHT_VALUES.map((val) => (
                                <SelectItem key={val} value={String(val)}>
                                  {val}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Text Decoration */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Text Decoration</Label>
                        <div className="flex gap-1 mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 flex-1 text-xs ${selectedComponent.style?.textDecoration?.includes("underline") ? "bg-accent" : ""}`}
                            onClick={() => {
                              const currentDecoration = selectedComponent.style?.textDecoration || ""
                              const newDecoration = currentDecoration.includes("underline")
                                ? currentDecoration.replace("underline", "").trim()
                                : `${currentDecoration} underline`.trim()
                              updateStyle("textDecoration", newDecoration || "none")
                            }}
                          >
                            <Underline className="h-3.5 w-3.5 mr-1" />
                            Underline
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 flex-1 text-xs ${selectedComponent.style?.fontStyle === "italic" ? "bg-accent" : ""}`}
                            onClick={() =>
                              updateStyle("fontStyle", selectedComponent.style?.fontStyle === "italic" ? "normal" : "italic")
                            }
                          >
                            <Italic className="h-3.5 w-3.5 mr-1" />
                            Italic
                          </Button>
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
                        <Select
                          value={selectedComponent.style?.width || "auto"}
                          onValueChange={(value: string) => updateStyle("width", value)}
                        >
                          <SelectTrigger id="width" className="h-8 text-xs mt-1 px-2">
                            <SelectValue placeholder="auto" />
                          </SelectTrigger>
                          <SelectContent>
                            {DIMENSION_VALUES.map((val) => (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-xs text-muted-foreground">
                          Height
                        </Label>
                        <Select
                          value={selectedComponent.style?.height || "auto"}
                          onValueChange={(value: string) => updateStyle("height", value)}
                        >
                          <SelectTrigger id="height" className="h-8 text-xs mt-1 px-2">
                            <SelectValue placeholder="auto" />
                          </SelectTrigger>
                          <SelectContent>
                            {DIMENSION_VALUES.map((val) => (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      💡 Hover over component to see resize handles
                    </p>
                  </div>

                  {selectedComponent.type !== "navbar" && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <ColorPicker
                          label="Background"
                          value={selectedComponent.style?.background || selectedComponent.style?.backgroundColor || "#ffffff"}
                          onChange={(val) => {
                            const isGrad = val.includes('gradient');
                            onUpdateComponent(selectedComponent.id, {
                              ...selectedComponent,
                              style: {
                                ...selectedComponent.style,
                                backgroundColor: isGrad ? undefined : val,
                                background: isGrad ? val : "",
                              },
                            });
                          }}
                        />
                        <ColorPicker
                          label="Text Color"
                          value={selectedComponent.style?.color || "#000000"}
                          onChange={(val) => updateStyle("color", val)}
                        />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="padding" className="text-xs">
                        Padding
                      </Label>
                      <Select
                        value={String(selectedComponent.style?.padding || "0").replace("px", "")}
                        onValueChange={(value: string) => updateStyle("padding", `${value}px`)}
                      >
                        <SelectTrigger id="padding" className="h-8 text-xs mt-1">
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                          {SPACING_VALUES.map((val) => (
                            <SelectItem key={val} value={String(val)}>
                              {val}px
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="margin" className="text-xs">
                        Margin
                      </Label>
                      <Select
                        value={String(selectedComponent.style?.margin || "0").replace("px", "")}
                        onValueChange={(value: string) => updateStyle("margin", `${value}px`)}
                      >
                        <SelectTrigger id="margin" className="h-8 text-xs mt-1">
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                          {SPACING_VALUES.map((val) => (
                            <SelectItem key={val} value={String(val)}>
                              {val}px
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!(selectedComponent.type === 'image' && selectedComponent.props.imageShape && selectedComponent.props.imageShape !== 'original') && (
                    <>
                      {/* Border Section */}
                      <div className="bg-muted/30 rounded-lg p-2.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-semibold">Border</Label>
                            <div className="flex items-center gap-1.5 ml-2">
                              <Label htmlFor="individual-border-toggle" className="text-[10px] text-muted-foreground">Individual</Label>
                              <Switch
                                id="individual-border-toggle"
                                checked={showIndividualBorders}
                                onCheckedChange={(val) => {
                                  setShowIndividualBorders(val)

                                  const individualKeys = [
                                    "borderTopWidth", "borderTopStyle", "borderTopColor",
                                    "borderRightWidth", "borderRightStyle", "borderRightColor",
                                    "borderBottomWidth", "borderBottomStyle", "borderBottomColor",
                                    "borderLeftWidth", "borderLeftStyle", "borderLeftColor"
                                  ];
                                  const globalKeys = ["borderWidth", "borderStyle", "borderColor"];

                                  const newStyle = { ...selectedComponent.style };
                                  if (val) {
                                    // If switching to individual, clear global
                                    globalKeys.forEach(k => delete newStyle[k]);
                                  } else {
                                    // If switching back to global, clear individual
                                    individualKeys.forEach(k => delete newStyle[k]);
                                  }

                                  onUpdateComponent(selectedComponent.id, {
                                    ...selectedComponent,
                                    style: newStyle
                                  });
                                }}
                                className="scale-75 origin-left"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => {
                              const styleKeys = [
                                "border", "borderWidth", "borderStyle", "borderColor",
                                "borderTop", "borderTopWidth", "borderTopStyle", "borderTopColor",
                                "borderRight", "borderRightWidth", "borderRightStyle", "borderRightColor",
                                "borderBottom", "borderBottomWidth", "borderBottomStyle", "borderBottomColor",
                                "borderLeft", "borderLeftWidth", "borderLeftStyle", "borderLeftColor"
                              ];
                              const newStyle = { ...selectedComponent.style };
                              styleKeys.forEach(key => delete newStyle[key]);
                              onUpdateComponent(selectedComponent.id, {
                                ...selectedComponent,
                                style: newStyle
                              });
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>

                        {!showIndividualBorders ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Width</Label>
                                <Select
                                  value={styleStr(selectedComponent.style?.borderWidth).replace("px", "") || "0"}
                                  onValueChange={(value: string) => updateStyle("borderWidth", `${value}px`)}
                                >
                                  <SelectTrigger className="h-8 text-xs mt-1">
                                    <SelectValue placeholder="0px" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BORDER_WIDTHS.map((w) => (
                                      <SelectItem key={w} value={String(w)}>
                                        {w}px
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Style</Label>
                                <Select
                                  value={selectedComponent.style?.borderStyle || "none"}
                                  onValueChange={(value: string) => updateStyle("borderStyle", value)}
                                >
                                  <SelectTrigger className="h-8 text-xs mt-1">
                                    <SelectValue placeholder="none" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BORDER_STYLES.map((s) => (
                                      <SelectItem key={s} value={s} className="capitalize">
                                        {s}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <ColorPicker
                              label="Border Color"
                              value={selectedComponent.style?.borderColor || "#000000"}
                              onChange={(val) => updateStyle("borderColor", val)}
                              hideGradient={true}
                            />
                          </>
                        ) : (
                          <div className="space-y-4">
                            {["Top", "Right", "Bottom", "Left"].map((side) => {
                              const sideKey = side === "All" ? "" : side;
                              const widthKey = `border${sideKey}Width`;
                              const styleKey = `border${sideKey}Style`;
                              const colorKey = `border${sideKey}Color`;

                              return (
                                <div key={side} className="space-y-2 p-2 bg-muted/20 rounded-md border border-border/10">
                                  <Label className="text-[11px] font-medium text-primary/80">{side}</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Select
                                        value={styleStr(selectedComponent.style?.[widthKey]).replace("px", "") || "0"}
                                        onValueChange={(value: string) => updateStyle(widthKey, `${value}px`)}
                                      >
                                        <SelectTrigger className="h-7 text-[11px]">
                                          <SelectValue placeholder="Width" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BORDER_WIDTHS.map((w) => (
                                            <SelectItem key={w} value={String(w)} className="text-[11px]">
                                              {w}px
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Select
                                        value={selectedComponent.style?.[styleKey] || "none"}
                                        onValueChange={(value: string) => updateStyle(styleKey, value)}
                                      >
                                        <SelectTrigger className="h-7 text-[11px]">
                                          <SelectValue placeholder="Style" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BORDER_STYLES.map((s) => (
                                            <SelectItem key={s} value={s} className="capitalize text-[11px]">
                                              {s}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <ColorPicker
                                    label={`${side} Color`}
                                    value={selectedComponent.style?.[colorKey] || "#000000"}
                                    onChange={(val) => updateStyle(colorKey, val)}
                                    hideGradient={true}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
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
                          <div className="flex justify-between items-center px-1">
                            <Label htmlFor="borderRadius-all" className="text-xs text-muted-foreground">
                              All Corners
                            </Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={styleStr(selectedComponent.style?.borderRadius).replace("px", "") || "0"}
                                onValueChange={(value: string) => {
                                  const newRadius = `${value}px`;
                                  onUpdateStyle(selectedComponent.id, {
                                    borderRadius: newRadius,
                                    borderTopLeftRadius: undefined,
                                    borderTopRightRadius: undefined,
                                    borderBottomLeftRadius: undefined,
                                    borderBottomRightRadius: undefined
                                  });
                                }}
                              >
                                <SelectTrigger id="borderRadius-all" className="h-6 w-20 text-xs px-1">
                                  <SelectValue placeholder="Radius" />
                                </SelectTrigger>
                                <SelectContent>
                                  {BORDER_RADIUS_VALUES.map((val) => (
                                    <SelectItem key={val} value={String(val)}>
                                      {val === 9999 ? 'Pill' : `${val}px`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Separator className="my-2" />

                          {/* Individual Corners */}
                          <div className="space-y-3">
                            {/* Top Row */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground px-1">Top Left</Label>
                                <Select
                                  value={styleStr(selectedComponent.style?.borderTopLeftRadius).replace("px", "") || "0"}
                                  onValueChange={(value) => updateStyle("borderTopLeftRadius", `${value}px`)}
                                >
                                  <SelectTrigger className="h-7 text-xs px-2">
                                    <SelectValue placeholder="0px" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BORDER_RADIUS_VALUES.map((val) => (
                                      <SelectItem key={val} value={String(val)}>
                                        {val === 9999 ? 'Pill' : `${val}px`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground px-1">Top Right</Label>
                                <Select
                                  value={styleStr(selectedComponent.style?.borderTopRightRadius).replace("px", "") || "0"}
                                  onValueChange={(value) => updateStyle("borderTopRightRadius", `${value}px`)}
                                >
                                  <SelectTrigger className="h-7 text-xs px-2">
                                    <SelectValue placeholder="0px" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BORDER_RADIUS_VALUES.map((val) => (
                                      <SelectItem key={val} value={String(val)}>
                                        {val === 9999 ? 'Pill' : `${val}px`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Bottom Row */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground px-1">Bottom Left</Label>
                                <Select
                                  value={styleStr(selectedComponent.style?.borderBottomLeftRadius).replace("px", "") || "0"}
                                  onValueChange={(value) => updateStyle("borderBottomLeftRadius", `${value}px`)}
                                >
                                  <SelectTrigger className="h-7 text-xs px-2">
                                    <SelectValue placeholder="0px" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BORDER_RADIUS_VALUES.map((val) => (
                                      <SelectItem key={val} value={String(val)}>
                                        {val === 9999 ? 'Pill' : `${val}px`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground px-1">Bottom Right</Label>
                                <Select
                                  value={styleStr(selectedComponent.style?.borderBottomRightRadius).replace("px", "") || "0"}
                                  onValueChange={(value) => updateStyle("borderBottomRightRadius", `${value}px`)}
                                >
                                  <SelectTrigger className="h-7 text-xs px-2">
                                    <SelectValue placeholder="0px" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BORDER_RADIUS_VALUES.map((val) => (
                                      <SelectItem key={val} value={String(val)}>
                                        {val === 9999 ? 'Pill' : `${val}px`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

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
            )}
          </TabsContent>
        </div>
      </Tabs>
      {isCustomCssModalOpen && (
        <CustomCssModal
          isOpen={isCustomCssModalOpen}
          initialCss={
            selectedComponent.type === 'custom-component'
              ? selectedComponent.props?.css || ''
              : selectedComponent.props?.customCss || styleToCss(selectedComponent.style || {}, selectedComponent.props?.elementId ? `#${selectedComponent.props.elementId}` : `[data-component-id="${selectedComponent.id}"]`, selectedComponent.type)
          }
          isInitiallyEnabled={selectedComponent.type === 'custom-component' ? true : (selectedComponent.props?.enableCustomCss || false)}
          componentId={selectedComponent.id}
          elementId={selectedComponent.props?.elementId}
          onClose={() => setIsCustomCssModalOpen(false)}
          onSave={(css, isEnabled) => {
            if (selectedComponent.type === 'custom-component') {
              onUpdateComponent(selectedComponent.id, {
                props: {
                  ...selectedComponent.props,
                  css: css
                }
              });
            } else {
              onUpdateComponent(selectedComponent.id, {
                props: {
                  ...selectedComponent.props,
                  customCss: css,
                  enableCustomCss: isEnabled
                }
              });
            }
          }}
        />
      )}
      {isAIStylingModalOpen && (
        <AICustomComponentStylingModal
          isOpen={isAIStylingModalOpen}
          onClose={() => setIsAIStylingModalOpen(false)}
          component={selectedComponent}
          onUpdateComponent={onUpdateComponent}
        />
      )}
      {isIntegrationModalOpen && (
        <CustomComponentIntegrationModal
          isOpen={isIntegrationModalOpen}
          onClose={() => setIsIntegrationModalOpen(false)}
          componentCode={selectedComponent.props?.html || ''}
          componentJs={selectedComponent.props?.js || ''}
          componentIntegrations={selectedComponent.props?.integrations || []}
          onUpdateJavascript={(newJs) => {
            onUpdateComponent(selectedComponent.id, {
              props: {
                ...selectedComponent.props,
                js: newJs
              }
            });
          }}
          onSaveIntegrations={(integrations) => {
            onUpdateComponent(selectedComponent.id, {
              props: {
                ...selectedComponent.props,
                integrations
              }
            });
          }}
        />
      )}
    </div>
  )
}
