import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(2);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [showRulers, setShowRulers] = useState(false);
  const [defaultZoom, setDefaultZoom] = useState(100);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("codecraft-preferences");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.autoSave !== undefined) setAutoSave(parsed.autoSave);
          if (parsed.autoSaveInterval !== undefined)
            setAutoSaveInterval(parsed.autoSaveInterval);
          if (parsed.showGrid !== undefined) setShowGrid(parsed.showGrid);
          if (parsed.snapToGrid !== undefined) setSnapToGrid(parsed.snapToGrid);
          if (parsed.gridSize !== undefined) setGridSize(parsed.gridSize);
          if (parsed.showRulers !== undefined) setShowRulers(parsed.showRulers);
          if (parsed.defaultZoom !== undefined)
            setDefaultZoom(parsed.defaultZoom);
          if (parsed.enableAnimations !== undefined)
            setEnableAnimations(parsed.enableAnimations);
          if (parsed.compactMode !== undefined)
            setCompactMode(parsed.compactMode);
          if (parsed.showLineNumbers !== undefined)
            setShowLineNumbers(parsed.showLineNumbers);
          if (parsed.wordWrap !== undefined) setWordWrap(parsed.wordWrap);
          if (parsed.fontSize !== undefined) setFontSize(parsed.fontSize);
          if (parsed.tabSize !== undefined) setTabSize(parsed.tabSize);
        } catch (e) {
          console.error("Failed to parse preferences", e);
        }
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    window.location.reload();
  };

  const handleSave = () => {
    // Persist preferences before the reload so they survive.
    const preferences = {
      autoSave,
      autoSaveInterval,
      showGrid,
      snapToGrid,
      gridSize,
      showRulers,
      defaultZoom,
      enableAnimations,
      compactMode,
      showLineNumbers,
      wordWrap,
      fontSize,
      tabSize,
    };
    localStorage.setItem("codecraft-preferences", JSON.stringify(preferences));
    window.dispatchEvent(new CustomEvent("preferencesUpdated"));

    handleClose();
  };

  const handleReset = () => {
    // Reset to defaults
    setAutoSave(true);
    setAutoSaveInterval(2);
    setShowGrid(true);
    setSnapToGrid(false);
    setGridSize(20);
    setShowRulers(false);
    setDefaultZoom(100);
    setEnableAnimations(true);
    setCompactMode(false);
    setShowLineNumbers(true);
    setWordWrap(true);
    setFontSize(14);
    setTabSize(2);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>
            Customize your CodeCraft editor experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* General Section */}
          <div>
            <h3 className="text-sm font-medium mb-4">General</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-save</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically save your work while editing
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>

              {autoSave && (
                <div className="space-y-2 ml-4">
                  <Label htmlFor="auto-save-interval">
                    Auto-save interval (seconds): {autoSaveInterval}
                  </Label>
                  <Slider
                    id="auto-save-interval"
                    min={1}
                    max={10}
                    step={1}
                    value={[autoSaveInterval]}
                    onValueChange={(value) => setAutoSaveInterval(value[0])}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="animations">Enable animations</Label>
                  <p className="text-xs text-muted-foreground">
                    Show smooth transitions and animations
                  </p>
                </div>
                <Switch
                  id="animations"
                  checked={enableAnimations}
                  onCheckedChange={setEnableAnimations}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-mode">Compact mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Use smaller spacing and compact UI elements
                  </p>
                </div>
                <Switch
                  id="compact-mode"
                  checked={compactMode}
                  onCheckedChange={setCompactMode}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Canvas Section */}
          <div>
            <h3 className="text-sm font-medium mb-4">Canvas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-grid">Show grid</Label>
                  <p className="text-xs text-muted-foreground">
                    Display background grid on canvas
                  </p>
                </div>
                <Switch
                  id="show-grid"
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="snap-to-grid">Snap to grid</Label>
                  <p className="text-xs text-muted-foreground">
                    Align components to grid when dragging
                  </p>
                </div>
                <Switch
                  id="snap-to-grid"
                  checked={snapToGrid}
                  onCheckedChange={setSnapToGrid}
                />
              </div>

              {snapToGrid && (
                <div className="space-y-2 ml-4">
                  <Label htmlFor="grid-size">Grid size (px): {gridSize}</Label>
                  <Slider
                    id="grid-size"
                    min={10}
                    max={50}
                    step={5}
                    value={[gridSize]}
                    onValueChange={(value) => setGridSize(value[0])}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-rulers">Show rulers</Label>
                  <p className="text-xs text-muted-foreground">
                    Display measurement rulers on canvas edges
                  </p>
                </div>
                <Switch
                  id="show-rulers"
                  checked={showRulers}
                  onCheckedChange={setShowRulers}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-zoom">
                  Default zoom: {defaultZoom}%
                </Label>
                <Slider
                  id="default-zoom"
                  min={50}
                  max={200}
                  step={10}
                  value={[defaultZoom]}
                  onValueChange={(value) => setDefaultZoom(value[0])}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Code Editor Section */}
          <div>
            <h3 className="text-sm font-medium mb-4">Code Editor</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="line-numbers">Show line numbers</Label>
                  <p className="text-xs text-muted-foreground">
                    Display line numbers in code editor
                  </p>
                </div>
                <Switch
                  id="line-numbers"
                  checked={showLineNumbers}
                  onCheckedChange={setShowLineNumbers}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="word-wrap">Word wrap</Label>
                  <p className="text-xs text-muted-foreground">
                    Wrap long lines in code editor
                  </p>
                </div>
                <Switch
                  id="word-wrap"
                  checked={wordWrap}
                  onCheckedChange={setWordWrap}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-size">Font size (px): {fontSize}</Label>
                <Slider
                  id="font-size"
                  min={10}
                  max={24}
                  step={1}
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tab-size">Tab size (spaces): {tabSize}</Label>
                <Slider
                  id="tab-size"
                  min={2}
                  max={8}
                  step={2}
                  value={[tabSize]}
                  onValueChange={(value) => setTabSize(value[0])}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
