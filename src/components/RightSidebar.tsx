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
import { ChevronDown, Bot, X } from "lucide-react"
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
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState("content")

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
                placeholder="Heading text"
              />
            </div>
            <div>
              <Label htmlFor="level">Level</Label>
              <Select
                value={props.level?.toString() || "1"}
                onValueChange={(value: string) => updateProps("level", Number.parseInt(value))}
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
                placeholder="Click me"
              />
            </div>
            <div>
              <Label htmlFor="variant">Variant</Label>
              <Select value={props.variant || "primary"} onValueChange={(value: string) => updateProps("variant", value)}>
                <SelectTrigger id="variant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="image-width">Width (px)</Label>
                <Input
                  id="image-width"
                  type="number"
                  value={selectedComponent.style?.width?.replace("px", "") || "300"}
                  onChange={(e) => updateStyle("width", `${e.target.value}px`)}
                  placeholder="300"
                  min="50"
                />
              </div>
              <div>
                <Label htmlFor="image-height">Height (px)</Label>
                <Input
                  id="image-height"
                  type="number"
                  value={selectedComponent.style?.height?.replace("px", "") || "200"}
                  onChange={(e) => updateStyle("height", `${e.target.value}px`)}
                  placeholder="200"
                  min="50"
                />
              </div>
            </div>
          </div>
        )

      case "navbar":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="brand">Brand Name</Label>
              <Input
                id="brand"
                value={props.brand || ""}
                onChange={(e) => updateProps("brand", e.target.value)}
                placeholder="Brand"
              />
            </div>
            <div>
              <Label htmlFor="links">Navigation Links (comma-separated)</Label>
              <Textarea
                id="links"
                value={props.links?.join(", ") || ""}
                onChange={(e) =>
                  updateProps(
                    "links",
                    e.target.value.split(",").map((s: string) => s.trim()),
                  )
                }
                placeholder="Home, About, Contact"
              />
            </div>
          </div>
        )

      case "hero":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="hero-title">Title</Label>
              <Input
                id="hero-title"
                value={props.title || ""}
                onChange={(e) => updateProps("title", e.target.value)}
                placeholder="Welcome"
              />
            </div>
            <div>
              <Label htmlFor="hero-subtitle">Subtitle</Label>
              <Textarea
                id="hero-subtitle"
                value={props.subtitle || ""}
                onChange={(e) => updateProps("subtitle", e.target.value)}
                placeholder="Build amazing websites"
              />
            </div>
          </div>
        )

      case "footer":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="copyright">Copyright Text</Label>
              <Input
                id="copyright"
                value={props.copyright || ""}
                onChange={(e) => updateProps("copyright", e.target.value)}
                placeholder="© 2024 Your Company"
              />
            </div>
          </div>
        )

      case "card":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={props.title || ""}
                onChange={(e) => updateProps("title", e.target.value)}
                placeholder="Card Title"
              />
            </div>
            <div>
              <Label htmlFor="card-content">Content</Label>
              <Textarea
                id="card-content"
                value={props.content || ""}
                onChange={(e) => updateProps("content", e.target.value)}
                placeholder="Card content"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="card-width">Width (px)</Label>
                <Input
                  id="card-width"
                  type="number"
                  value={selectedComponent.style?.width?.replace("px", "") || "300"}
                  onChange={(e) => updateStyle("width", `${e.target.value}px`)}
                  placeholder="300"
                  min="200"
                />
              </div>
              <div>
                <Label htmlFor="card-height">Height (px)</Label>
                <Input
                  id="card-height"
                  type="number"
                  value={selectedComponent.style?.height?.replace("px", "") || "200"}
                  onChange={(e) => updateStyle("height", `${e.target.value}px`)}
                  placeholder="200"
                  min="100"
                />
              </div>
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

      case "form":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-title">Form Title</Label>
              <Input
                id="form-title"
                value={props.title || ""}
                onChange={(e) => updateProps("title", e.target.value)}
                placeholder="Contact Form"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="form-width">Width (px)</Label>
                <Input
                  id="form-width"
                  type="number"
                  value={selectedComponent.style?.width?.replace("px", "") || "400"}
                  onChange={(e) => updateStyle("width", `${e.target.value}px`)}
                  placeholder="400"
                  min="200"
                />
              </div>
              <div>
                <Label htmlFor="form-height">Height (px)</Label>
                <Input
                  id="form-height"
                  type="number"
                  value={selectedComponent.style?.height?.replace("px", "") || "300"}
                  onChange={(e) => updateStyle("height", `${e.target.value}px`)}
                  placeholder="300"
                  min="200"
                />
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">No specific properties available for this component type.</p>
          </div>
        )
    }
  }

  // If both properties and AI assistant are hidden, don't render the sidebar
  if (!propertiesPanelVisible && !aiAssistantVisible) {
    return null
  }

  return (
    <div className="w-80 h-full flex flex-col overflow-hidden relative sidebar-right border-l border-border bg-card">
      {aiAssistantVisible && (
        <div className="flex flex-col h-full bg-background">
          <div className="p-4 border-b">
            <h3 className="font-medium text-sm">AI Design Assistant</h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <AIAssistant selectedComponentType={selectedComponent?.type} />
          </div>
        </div>
      )}

      {/* Properties Section - Floating overlay in the middle, not at top */}
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

      {/* Show AI Assistant Button when collapsed */}
      {!aiAssistantVisible && onToggleAIAssistant && (
        <div className="border-b flex-shrink-0 p-2 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleAIAssistant}
            className="w-full justify-between"
            title="Show AI Assistant (Ctrl+Shift+A)"
          >
            <span className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Assistant
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
