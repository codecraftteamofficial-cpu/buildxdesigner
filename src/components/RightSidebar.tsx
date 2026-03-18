"use client"

import { useState } from "react"
import type { ComponentData } from "../App"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { RangeSlider } from "./ui/range-slider"
import { ChevronDown, Bot, X, Trash2, Plus } from "lucide-react"
import { AIAssistant } from "./AIAssistant"
import { CanvasPropertiesPanel } from "./CanvasPropertiesPanel"

interface RightSidebarProps {
  selectedComponent: ComponentData | null
  onUpdateComponent: (id: string, updates: Partial<ComponentData>) => void
  propertiesPanelVisible: boolean
  onToggleProperties: () => void
  aiAssistantVisible?: boolean
  onToggleAIAssistant?: () => void
  canvasProperties?: any
  onUpdateCanvasProperties?: (updates: any) => void
  pages?: { id: string; name: string; path?: string }[]
  userProjectConfig?: any
}

export function RightSidebar({
  selectedComponent,
  onUpdateComponent,
  propertiesPanelVisible,
  onToggleProperties,
  aiAssistantVisible = true,
  onToggleAIAssistant,
  canvasProperties,
  onUpdateCanvasProperties,
  pages,
  userProjectConfig,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState("content")

  if (!propertiesPanelVisible && !aiAssistantVisible) {
    return null
  }

  const updateProps = (key: string, value: any) => {
    if (selectedComponent) {
      onUpdateComponent(selectedComponent.id, {
        props: { ...selectedComponent.props, [key]: value },
      })
    }
  }

  const updateStyle = (key: string, value: any) => {
    if (selectedComponent) {
      onUpdateComponent(selectedComponent.id, {
        style: { ...selectedComponent.style, [key]: value },
      })
    }
  }

  const renderPropertyInputs = () => {
    if (!selectedComponent) return null

    const { type, props } = selectedComponent

    switch (type) {
      case "text":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={props.content || ""}
                onChange={(e) => updateProps("content", e.target.value)}
                placeholder="Enter text content"
              />
            </div>
          </div>
        )

      case "heading":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Content</Label>
              <Input
                id="content"
                value={props.content || ""}
                onChange={(e) => updateProps("content", e.target.value)}
                placeholder="Enter heading text"
              />
            </div>
            <div>
              <Label htmlFor="level">Level</Label>
              <Select
                value={String(props.level || 1)}
                onValueChange={(value) => updateProps("level", parseInt(value))}
              >
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                  <SelectItem value="4">H4</SelectItem>
                  <SelectItem value="5">H5</SelectItem>
                  <SelectItem value="6">H6</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "button":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Button Text</Label>
              <Input
                id="text"
                value={props.text || ""}
                onChange={(e) => updateProps("text", e.target.value)}
                placeholder="Click Me"
              />
            </div>
          </div>
        )

      case "image":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="src">Image URL</Label>
              <Input
                id="src"
                value={props.src || ""}
                onChange={(e) => updateProps("src", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="alt">Alt Text</Label>
              <Input
                id="alt"
                value={props.alt || ""}
                onChange={(e) => updateProps("alt", e.target.value)}
                placeholder="Image description"
              />
            </div>
          </div>
        )

      case "input":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={props.placeholder || ""}
                onChange={(e) => updateProps("placeholder", e.target.value)}
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label htmlFor="input-type">Input Type</Label>
              <Select
                value={props.type || "text"}
                onValueChange={(value) => updateProps("type", value)}
              >
                <SelectTrigger id="input-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="tel">Telephone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "container":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="container-width">Width (px)</Label>
                <Input
                  id="container-width"
                  type="number"
                  value={selectedComponent.style?.width?.replace("px", "") || "300"}
                  onChange={(e) => updateStyle("width", `${e.target.value}px`)}
                  placeholder="300"
                  min="50"
                />
              </div>
              <div>
                <Label htmlFor="container-height">Height (px)</Label>
                <Input
                  id="container-height"
                  type="number"
                  value={selectedComponent.style?.height?.replace("px", "") || "150"}
                  onChange={(e) => updateStyle("height", `${e.target.value}px`)}
                  placeholder="150"
                  min="50"
                />
              </div>
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
          updateProps('submitButtonActions', newActions)
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
              />
            </div>

            <div>
              <Label htmlFor="submit-button-text">Submit Button Text</Label>
              <Input
                id="submit-button-text"
                value={props.submitButtonText || "Submit"}
                onChange={(e) => updateProps("submitButtonText", e.target.value)}
                placeholder="Submit"
              />
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
                    updateProps("supabaseTable", e.target.value)
                    updateSupabaseAction("supabaseTable", e.target.value)
                  }}
                  placeholder="users, orders, etc."
                />
              </div>

              <div>
                <Label htmlFor="supabase-operation">CRUD Operation</Label>
                <Select
                  value={props.supabaseOperation || supabaseAction.supabaseOperation || "insert"}
                  onValueChange={(value) => {
                    updateProps("supabaseOperation", value)
                    updateSupabaseAction("supabaseOperation", value)
                  }}
                >
                  <SelectTrigger id="supabase-operation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insert">Insert (Create)</SelectItem>
                    <SelectItem value="select">Select (Read)</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Form Fields ({fields.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addField}
                  className="h-7 px-2"
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
                      <span className="text-xs font-medium">Field {index + 1}</span>
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
                  value={selectedComponent?.style?.width?.replace("px", "") || "400"}
                  onChange={(e) => updateStyle("width", `${e.target.value}px`)}
                  placeholder="400"
                  min="200"
                />
              </div>
              <div>
                <Label htmlFor="dynamic-form-height">Height (px)</Label>
                <Input
                  id="dynamic-form-height"
                  type="number"
                  value={selectedComponent?.style?.height?.replace("px", "") || "350"}
                  onChange={(e) => updateStyle("height", `${e.target.value}px`)}
                  placeholder="350"
                  min="200"
                />
              </div>
            </div>
          </div>
        )
      }

      default:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">No specific properties available for this component type.</p>
          </div>
        )
    }
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative sidebar-right bg-card">
      {aiAssistantVisible && (
        <div className="flex flex-col h-full bg-background w-full">
          <div className="p-4 border-b">
            <h3 className="font-medium text-sm">AI Mentor</h3>
          </div>
          <div className="flex-1 w-full overflow-hidden">
            <AIAssistant selectedComponentType={selectedComponent?.type} />
          </div>
        </div>
      )}

      {propertiesPanelVisible && (
        <div
          className="absolute top-8 left-4 right-4 bottom-auto bg-card border border-border rounded-lg shadow-2xl z-10 transition-all duration-300"
          style={{
            maxHeight: aiAssistantVisible ? "calc(100% - 6rem)" : "calc(100% - 4rem)",
            minHeight: "250px",
          }}
        >
          <div className="h-full overflow-y-auto rounded-lg">
            <div className="p-4">
              {selectedComponent ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Properties</h3>
                      <Badge variant="secondary" className="text-xs">
                        {selectedComponent.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleProperties}
                      className="h-8 w-8 p-0"
                      title="Hide Properties (Ctrl+Shift+P)"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="content" className="text-xs">
                        Content
                      </TabsTrigger>
                      <TabsTrigger value="styling" className="text-xs">
                        Styling
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-4 mt-0">
                      {renderPropertyInputs()}
                    </TabsContent>

                    <TabsContent value="styling" className="space-y-4 mt-0">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="backgroundColor">Background Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="backgroundColor"
                              type="color"
                              value={selectedComponent.style?.backgroundColor || "#ffffff"}
                              onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                              className="w-12 h-10 p-1 border rounded"
                            />
                            <Input
                              value={selectedComponent.style?.backgroundColor || "#ffffff"}
                              onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                              placeholder="#ffffff"
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="color">Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="color"
                              type="color"
                              value={selectedComponent.style?.color || "#000000"}
                              onChange={(e) => updateStyle("color", e.target.value)}
                              className="w-12 h-10 p-1 border rounded"
                            />
                            <Input
                              value={selectedComponent.style?.color || "#000000"}
                              onChange={(e) => updateStyle("color", e.target.value)}
                              placeholder="#000000"
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="padding">Padding</Label>
                            <Input
                              id="padding"
                              value={selectedComponent.style?.padding || ""}
                              onChange={(e) => updateStyle("padding", e.target.value)}
                              placeholder="10px"
                            />
                          </div>
                          <div>
                            <Label htmlFor="margin">Margin</Label>
                            <Input
                              id="margin"
                              value={selectedComponent.style?.margin || ""}
                              onChange={(e) => updateStyle("margin", e.target.value)}
                              placeholder="10px"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="borderRadius">Border Radius</Label>
                          <Input
                            id="borderRadius"
                            value={selectedComponent.style?.borderRadius || ""}
                            onChange={(e) => updateStyle("borderRadius", e.target.value)}
                            placeholder="8px"
                          />
                        </div>

                        <div>
                          <Label htmlFor="opacity">Opacity</Label>
                          <div className="space-y-2">
                            <RangeSlider
                              value={Math.round(Number.parseFloat(selectedComponent.style?.opacity || "1") * 100)}
                              onValueChange={(value: number) => updateStyle("opacity", (value / 100).toString())}
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
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Canvas</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleProperties}
                      className="h-8 w-8 p-0"
                      title="Hide Properties (Ctrl+Shift+P)"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {canvasProperties && onUpdateCanvasProperties && (
                    <CanvasPropertiesPanel
                      properties={canvasProperties}
                      onUpdateProperties={onUpdateCanvasProperties}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!aiAssistantVisible && onToggleAIAssistant && (
        <div className="border-b shrink-0 p-2 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleAIAssistant}
            className="w-full justify-between"
            title="Show AI Assistant (Ctrl+Shift+A)"
          >
            <span className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Mentor
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
