import React, { useState, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface CustomCssModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCss: string;
  onSave: (css: string, isEnabled: boolean) => void;
  isInitiallyEnabled: boolean;
  componentId: string;
  elementId?: string;
}

export function CustomCssModal({ isOpen, onClose, initialCss, onSave, isInitiallyEnabled, componentId, elementId }: CustomCssModalProps) {
  const [cssCode, setCssCode] = useState(initialCss || '');
  const [isEnabled, setIsEnabled] = useState(isInitiallyEnabled);
  const monaco = useMonaco();

  useEffect(() => {
    if (isOpen) {
      setCssCode(initialCss || '');
      setIsEnabled(isInitiallyEnabled);
    }
  }, [isOpen, initialCss, isInitiallyEnabled]);

  useEffect(() => {
      if (monaco) {
          const cssLang: any = monaco.languages.css;
          if (cssLang && cssLang.cssDefaults) {
             cssLang.cssDefaults.setOptions({
                validate: true,
                lint: {
                    compatibleVendorPrefixes: 'ignore',
                    vendorPrefix: 'warning',
                    duplicateProperties: 'warning',
                    emptyRules: 'ignore',
                    importStatement: 'ignore',
                    boxModel: 'ignore',
                    universalSelector: 'ignore',
                    zeroUnits: 'ignore',
                    fontFaceProperties: 'warning',
                    hexColorLength: 'warning',
                    argumentsInColorFunction: 'warning',
                    unknownProperties: 'warning',
                    ieHack: 'ignore',
                    unknownVendorSpecificProperties: 'ignore',
                    propertyIgnoredDueToDisplay: 'warning',
                    important: 'ignore',
                    float: 'ignore',
                    idSelector: 'ignore'
                }
             });
          }
      }
  }, [monaco]);

  const handleSave = () => {
    onSave(cssCode, isEnabled);
    onClose();
  };


  const selector = elementId ? `#${elementId}` : `[data-component-id="${componentId}"]`;
  
  const defaultBoilerplate = `/* \n * Edit custom CSS for this component. \n * Targeted selector: ${selector} \n * Tip: Use !important if the builder styles are still overriding your rules.\n */\n\n${selector} {\n  \n}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[calc(100vw-2rem)] w-full h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Custom CSS Editor</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-[400px]">
          <Editor
            height="100%"
            defaultLanguage="css"
            theme="vs-dark"
            value={cssCode || defaultBoilerplate}
            onChange={(value) => setCssCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              formatOnPaste: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        <DialogFooter className="p-4 border-t flex justify-between items-center bg-muted/20 sm:justify-between">
          <div className="flex items-center space-x-2">
             <Switch id="enable-custom-css" checked={isEnabled} onCheckedChange={setIsEnabled} />
             <Label htmlFor="enable-custom-css">Enable Custom CSS</Label>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Apply & Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
