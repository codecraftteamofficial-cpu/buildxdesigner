import React, { useState } from 'react';
import { ComponentData } from '../App';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RangeSlider } from './ui/range-slider';
import { Settings, X } from 'lucide-react';

// Safe helper: converts any style value to string before calling .replace
const styleStr = (value: any): string => String(value ?? "")

interface MobilePropertiesModalProps {
  selectedComponent: ComponentData | null;
  onUpdateComponent: (id: string, updates: Partial<ComponentData>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function MobilePropertiesModal({ 
  selectedComponent, 
  onUpdateComponent, 
  isOpen, 
  onClose 
}: MobilePropertiesModalProps) {
  const [activeTab, setActiveTab] = useState('content');

  if (!selectedComponent) return null;

  const updateProps = (key: string, value: any) => {
    onUpdateComponent(selectedComponent.id, {
      props: { ...selectedComponent.props, [key]: value }
    });
  };

  const updateStyle = (key: string, value: any) => {
    onUpdateComponent(selectedComponent.id, {
      style: { ...selectedComponent.style, [key]: value }
    });
  };

  const renderPropertyInputs = () => {
    const { type, props } = selectedComponent;

    switch (type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={props.content || ''}
                onChange={(e) => updateProps('content', e.target.value)}
                placeholder="Enter text content"
                className="resize-none"
              />
            </div>
          </div>
        );

      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Content</Label>
              <Input
                id="content"
                value={props.content || ''}
                onChange={(e) => updateProps('content', e.target.value)}
                placeholder="Heading text"
              />
            </div>
            <div>
              <Label htmlFor="level">Heading Level</Label>
              <Select value={props.level?.toString()} onValueChange={(value: string) => updateProps('level', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
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
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Button Text</Label>
              <Input
                id="text"
                value={props.text || ''}
                onChange={(e) => updateProps('text', e.target.value)}
                placeholder="Button text"
              />
            </div>
            <div>
              <Label htmlFor="variant">Variant</Label>
              <Select value={props.variant} onValueChange={(value: string) => updateProps('variant', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
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
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="src">Image URL</Label>
              <Input
                id="src"
                value={props.src || ''}
                onChange={(e) => updateProps('src', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="alt">Alt Text</Label>
              <Input
                id="alt"
                value={props.alt || ''}
                onChange={(e) => updateProps('alt', e.target.value)}
                placeholder="Image description"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={props.width || ''}
                  onChange={(e) => updateProps('width', parseInt(e.target.value) || 0)}
                  placeholder="300"
                  min="50"
                />
              </div>
              <div>
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={props.height || ''}
                  onChange={(e) => updateProps('height', parseInt(e.target.value) || 0)}
                  placeholder="200"
                  min="30"
                />
              </div>
            </div>
          </div>
        );

      case 'container':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="container-width">Width (px)</Label>
                <Input
                  id="container-width"
                  type="number"
                  value={styleStr(selectedComponent.style?.width).replace('px', '') || '300'}
                  onChange={(e) => updateStyle('width', `${e.target.value}px`)}
                  placeholder="300"
                  min="50"
                />
              </div>
              <div>
                <Label htmlFor="container-height">Height (px)</Label>
                <Input
                  id="container-height"
                  type="number"
                  value={styleStr(selectedComponent.style?.height).replace('px', '') || '150'}
                  onChange={(e) => updateStyle('height', `${e.target.value}px`)}
                  placeholder="150"
                  min="50"
                />
              </div>
            </div>
          </div>
        );

      case 'form':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-title">Form Title</Label>
              <Input
                id="form-title"
                value={props.title || ''}
                onChange={(e) => updateProps('title', e.target.value)}
                placeholder="Contact Form"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="form-width">Width (px)</Label>
                <Input
                  id="form-width"
                  type="number"
                  value={styleStr(selectedComponent.style?.width).replace('px', '') || '400'}
                  onChange={(e) => updateStyle('width', `${e.target.value}px`)}
                  placeholder="400"
                  min="200"
                />
              </div>
              <div>
                <Label htmlFor="form-height">Height (px)</Label>
                <Input
                  id="form-height"
                  type="number"
                  value={styleStr(selectedComponent.style?.height).replace('px', '') || '300'}
                  onChange={(e) => updateStyle('height', `${e.target.value}px`)}
                  placeholder="300"
                  min="200"
                />
              </div>
            </div>
          </div>
        );

      case 'navbar':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="brand">Brand Name</Label>
              <Input
                id="brand"
                value={props.brand || ''}
                onChange={(e) => updateProps('brand', e.target.value)}
                placeholder="Your Brand"
              />
            </div>
            <div>
              <Label htmlFor="links">Navigation Links (comma separated)</Label>
              <Input
                id="links"
                value={props.links?.join(', ') || ''}
                onChange={(e) => updateProps('links', e.target.value.split(',').map((s: string) => s.trim()))}
                placeholder="Home, About, Contact"
              />
            </div>
          </div>
        );

      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={props.title || ''}
                onChange={(e) => updateProps('title', e.target.value)}
                placeholder="Hero title"
              />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={props.subtitle || ''}
                onChange={(e) => updateProps('subtitle', e.target.value)}
                placeholder="Hero subtitle"
                className="resize-none"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No specific properties available for this component type.
            </p>
          </div>
        );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>Properties</span>
            <Badge variant="secondary" className="text-xs">
              {selectedComponent.type}
            </Badge>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="styling">Styling</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-4 mt-0">
              <div className="space-y-3 bg-muted/20 border border-border/60 rounded-lg p-3">
                <div className="space-y-1">
                  <Label htmlFor="mobile-element-id" className="text-xs font-medium">Element ID</Label>
                  <Input
                    id="mobile-element-id"
                    value={selectedComponent.props?.elementId || ''}
                    onChange={(e) => updateProps('elementId', e.target.value)}
                    placeholder="hero-section"
                  />
                  <p className="text-[11px] text-muted-foreground">Unique identifier for links and scripts.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mobile-element-class" className="text-xs font-medium">CSS Classes</Label>
                  <Input
                    id="mobile-element-class"
                    value={selectedComponent.props?.className || ''}
                    onChange={(e) => updateProps('className', e.target.value)}
                    placeholder="bg-gradient text-lg"
                  />
                  <p className="text-[11px] text-muted-foreground">Separate class names with spaces.</p>
                </div>
              </div>
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
                      value={selectedComponent.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={selectedComponent.style?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateStyle('backgroundColor', e.target.value)}
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
                      value={selectedComponent.style?.color || '#000000'}
                      onChange={(e) => updateStyle('color', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={selectedComponent.style?.color || '#000000'}
                      onChange={(e) => updateStyle('color', e.target.value)}
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
                      value={selectedComponent.style?.padding || ''}
                      onChange={(e) => updateStyle('padding', e.target.value)}
                      placeholder="10px"
                    />
                  </div>
                  <div>
                    <Label htmlFor="margin">Margin</Label>
                    <Input
                      id="margin"
                      value={selectedComponent.style?.margin || ''}
                      onChange={(e) => updateStyle('margin', e.target.value)}
                      placeholder="10px"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="borderRadius">Border Radius</Label>
                  <Input
                    id="borderRadius"
                    value={selectedComponent.style?.borderRadius || ''}
                    onChange={(e) => updateStyle('borderRadius', e.target.value)}
                    placeholder="8px"
                  />
                </div>
                
                <div>
                  <Label htmlFor="opacity">Opacity</Label>
                  <div className="space-y-2">
                    <RangeSlider
                      value={Math.round(parseFloat(selectedComponent.style?.opacity || '1') * 100)}
                      onValueChange={(value) => updateStyle('opacity', (value / 100).toString())}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      {Math.round(parseFloat(selectedComponent.style?.opacity || '1') * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}