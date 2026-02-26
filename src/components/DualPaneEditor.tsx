// src/components/DualPaneEditor.tsx

import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Eye, 
  Split, 
  Code2,
  Copy,
  RefreshCw
} from 'lucide-react';
import { ComponentData } from '../App';
import { Canvas } from './Canvas';
import { FileExplorer } from './FileExplorer';
import { CodeEditorPane } from './CodeEditorPane';
import { toast } from 'sonner';

interface DualPaneEditorProps {
  components: ComponentData[];
  selectedComponent: ComponentData | null;
  onSelectComponent: (component: ComponentData | null) => void;
  onUpdateComponent: (id: string, updates: Partial<ComponentData>) => void;
  onDeleteComponent: (id: string) => void;
  // ADD THESE NEW PROPS TO THE INTERFACE:
  onReorderComponent: (id: string, direction: 'front' | 'back') => void;
  onMoveLayer: (id: string, action: 'forward' | 'backward') => void;
  onZoomChange: (zoom: number) => void;
  projectId: string | null;
  projectName: string;
  canvasZoom?: number;
}

export function DualPaneEditor({
  components,
  selectedComponent,
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent,
  // DESTRUCTURE THE NEW PROPS HERE:
  onReorderComponent,
  onMoveLayer,
  onZoomChange,
  projectId,
  projectName,
  canvasZoom = 100
}: DualPaneEditorProps) {
  const [viewMode, setViewMode] = useState<'design' | 'split' | 'code'>('design');
  const [isCodeSyncing, setIsCodeSyncing] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string>('/index.html');

  const handleComponentChange = () => {
    if (isCodeSyncing) {
      setIsCodeSyncing(false);
      setTimeout(() => setIsCodeSyncing(true), 100);
    }
  };

  const copyCode = async () => {
    try {
      const codeContent = document.querySelector('.code-editor-content')?.textContent || '';
      await navigator.clipboard.writeText(codeContent);
      toast.success('Code copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const renderViewControls = () => (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card shrink-0">
      <div className="flex items-center gap-1">
        <Button
          variant={viewMode === 'design' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('design')}
          title="Design View"
          className="h-9 w-9 p-0"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === 'split' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('split')}
          title="Split View"
          className="h-9 w-9 p-0"
        >
          <Split className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === 'code' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('code')}
          title="Code View"
          className="h-9 w-9 p-0"
        >
          <Code2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={isCodeSyncing ? 'default' : 'secondary'} className="text-xs">
          {isCodeSyncing ? 'Live Sync' : 'Manual'}
        </Badge>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsCodeSyncing(!isCodeSyncing)}
          title={isCodeSyncing ? 'Disable Auto Sync' : 'Enable Auto Sync'}
          className="h-9 w-9 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${isCodeSyncing ? 'animate-spin' : ''}`} />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyCode}
          title="Copy Code"
          className="h-9 w-9 p-0"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderDesignPane = () => (
    <div className="flex flex-col h-full">
      <div className="border-b p-3 bg-card shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Visual Designer</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {components.length} component{components.length !== 1 ? 's' : ''}
            </Badge>
            {selectedComponent && (
              <Badge variant="secondary" className="text-xs">
                {selectedComponent.type}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Canvas
          components={components}
          selectedComponent={selectedComponent}
          onSelectComponent={onSelectComponent}
          onUpdateComponent={(id, updates) => {
            onUpdateComponent(id, updates);
            handleComponentChange();
          }}
          onDeleteComponent={(id) => {
            onDeleteComponent(id);
            handleComponentChange();
          }}
          // PASS THE NEW PROPS TO THE CANVAS HERE:
          onReorderComponent={onReorderComponent}
          onMoveLayer={onMoveLayer}
          onZoomChange={onZoomChange}
          projectId={projectId}
          projectName={projectName}
          canvasZoom={canvasZoom}
        />
      </div>
    </div>
  );

  const renderCodePane = () => (
    <div className="flex h-full">
      <div className="w-64 shrink-0 border-r">
        <FileExplorer
          onFileSelect={(file) => {
            setSelectedFile(file.path);
          }}
          selectedFile={selectedFile}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <CodeEditorPane
          components={components}
          fileName={selectedFile.split('/').pop() || 'index.html'}
          fileType={selectedFile.split('.').pop() || 'html'}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {renderViewControls()}
      
      <div className="flex-1 overflow-hidden">
        {viewMode === 'design' && renderDesignPane()}
        
        {viewMode === 'split' && (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              {renderDesignPane()}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              {renderCodePane()}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        
        {viewMode === 'code' && (
          <div className="h-full">
            {renderCodePane()}
          </div>
        )}
      </div>
    </div>
  );
}