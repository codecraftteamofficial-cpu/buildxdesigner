import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, Code, Save, Loader2, Sparkles, Send, RefreshCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { getOpenRouterKey, getGeminiKey } from "../config/apiKeys"
import type { ComponentData } from "../App";

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Gemini API function for styling
const generateStylingWithGemini = async (
  prompt: string, 
  currentHtml: string, 
  currentCss: string, 
  currentJs: string,
  history: { role: 'user' | 'assistant', content: string }[] = []
): Promise<string> => {
  try {
    const openRouterKey = getOpenRouterKey();
    const geminiKey = getGeminiKey();
    const apiKey = openRouterKey || geminiKey;
    
    if (!apiKey) {
      toast.error("API key not configured. Please set your OpenRouter or Gemini API key.")
      return "Error: API key not configured"
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'BuildXdesigner Styling Assistant',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert CSS and JavaScript styling assistant for "BuildXdesigner". 
            Your goal is to modify the CSS and JavaScript of a custom component based on the user's styling request.
            
            CURRENT COMPONENT CODE:
            ---
            HTML: ${currentHtml}
            CSS: ${currentCss}
            JS: ${currentJs}
            ---

            IMPORTANT STYLING RULES:
            - Focus ONLY on CSS and JavaScript modifications
            - Do not change the HTML structure unless specifically requested for styling purposes
            - Use the existing CSS classes and selectors from the current code
            - Add new CSS rules as needed, but preserve existing styles
            - For JavaScript, focus on event handlers, animations, and interactive styling
            - Use component-scoped styles that won't affect other elements
            - Include comments explaining major changes
            - Ensure responsive design considerations
            - Use modern CSS features when appropriate

            RESPONSE FORMAT:
            Return the complete updated CSS and JavaScript code in the following format:

            === CSS ===
            [Your updated CSS code here]

            === JAVASCRIPT ===
            [Your updated JavaScript code here, or "No changes" if no JS modifications needed]

            If only CSS changes are needed, return "No changes" for the JavaScript section.
            `
          },
          ...history,
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No response received";
    
  } catch (error) {
    console.error('Error generating styling:', error);
    toast.error("Failed to generate styling. Please try again.");
    return "Error: Failed to generate styling";
  }
};

interface AICustomComponentStylingModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: ComponentData | null;
  onUpdateComponent: (id: string, updates: Partial<ComponentData>) => void;
}

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AICustomComponentStylingModal({ 
  isOpen, 
  onClose, 
  component, 
  onUpdateComponent 
}: AICustomComponentStylingModalProps) {
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [isPreviewUpdating, setIsPreviewUpdating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Debounced preview update function
  const debouncedUpdatePreview = useMemo(
    () => debounce(() => {
      setPreviewKey(prev => prev + 1);
      setIsPreviewUpdating(false);
    }, 2000),
    []
  );

  // Trigger preview update with debounce
  const triggerPreviewUpdate = useCallback(() => {
    setIsPreviewUpdating(true);
    debouncedUpdatePreview();
  }, [debouncedUpdatePreview]);

  // Reset and load component data when modal opens
  useEffect(() => {
    if (isOpen && component) {
      const css = component.props?.css || '';
      const js = component.props?.js || '';
      setCssCode(css);
      setJsCode(js);
      setCurrentPrompt('');
      setMessages([]);
      setPreviewKey(prev => prev + 1); // Force preview refresh
      setIsPreviewUpdating(false);
    }
  }, [isOpen, component]);

  
  const handleGenerateStyling = async () => {
    if (!currentPrompt.trim() || !component) {
      toast.error("Please enter a styling request");
      return;
    }

    setIsGenerating(true);
    
    try {
      const currentHtml = component.props?.html || '';
      const response = await generateStylingWithGemini(
        currentPrompt,
        currentHtml,
        cssCode,
        jsCode,
        messages.slice(-10) // Include last 10 messages for context
      );

      // Parse the response
      const cssMatch = response.match(/=== CSS ===\s*([\s\S]*?)(?=\n=== |\n$|$)/);
      const jsMatch = response.match(/=== JAVASCRIPT ===\s*([\s\S]*?)(?=\n=== |\n$|$)/);

      if (cssMatch) {
        const newCss = cssMatch[1].trim();
        setCssCode(newCss);
      }

      if (jsMatch && jsMatch[1].trim() !== 'No changes') {
        const newJs = jsMatch[1].trim();
        setJsCode(newJs);
      }

      // Add to message history
      const newMessage: AiMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      toast.success("Styling generated successfully!");
      
    } catch (error) {
      console.error('Error generating styling:', error);
      toast.error("Failed to generate styling. Please try again.");
    } finally {
      setIsGenerating(false);
      setCurrentPrompt('');
    }
  };

  const handleApplyChanges = () => {
    if (!component) return;

    onUpdateComponent(component.id, {
      props: {
        ...component.props,
        css: cssCode,
        js: jsCode
      }
    });

    toast.success("Styling applied to component!");
    onClose();
  };

  const handleReset = () => {
    if (!component) return;
    
    const originalCss = component.props?.css || '';
    const originalJs = component.props?.js || '';
    setCssCode(originalCss);
    setJsCode(originalJs);
    setMessages([]);
    toast.success("Reset to original styling");
  };

  // Generate preview HTML with current styles
  const generatePreviewHtml = () => {
    if (!component) return '';

    const html = component.props?.html || '';
    const css = cssCode || '';
    const js = jsCode || '';
    const php = component.props?.php || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            margin: 0; 
            padding: 20px; 
            font-family: system-ui, -apple-system, sans-serif;
            background: #f8f9fa;
          }
          ${css}
        </style>
      </head>
      <body>
        ${html}
        ${php ? `<script>
          // Simulate PHP output for preview
          try {
            ${php.replace(/<\?php|\?>/g, '').replace(/echo\s+['"]([^'"]*)['"];?/gi, 'console.log("PHP Output: $1");')}
          } catch (error) {
            console.error('Error in PHP preview:', error);
          }
        </script>` : ''}
        <script>
          // Provide DOM helpers for custom components
          function $(selector) {
            return document.querySelector(selector);
          }
          
          function $$(selector) {
            return document.querySelectorAll(selector);
          }
          
          // Execute component JavaScript
          try {
            ${js}
          } catch (error) {
            console.error('Error in component JavaScript:', error);
          }
        </script>
      </body>
      </html>
    `;
  };

  if (!component) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[85vh] sm:max-w-[95vw] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-xl">
        <DialogHeader className="p-4 border-b shrink-0 bg-muted/30">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Styling Assistant
            </DialogTitle>
            <DialogDescription className="text-xs">Describe the styling changes you want to make to this component using AI.</DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          {/* Left Side: Editor */}
          <div className="flex flex-col border-r bg-background overflow-hidden">
            {/* Code Editor Tabs */}
            <div className="flex-1 flex flex-col min-h-0">
              <Tabs defaultValue="css" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 border-b shrink-0 bg-muted/5">
                  <TabsList className="bg-transparent h-10 p-0 gap-4">
                    <TabsTrigger 
                      value="html" 
                      className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-0 border-b-2 border-transparent rounded-none px-0 h-10 text-xs font-bold uppercase tracking-tight focus-visible:ring-0"
                    >
                      <Code className="w-3.5 h-3.5 mr-2" /> HTML
                    </TabsTrigger>
                    <TabsTrigger 
                      value="css" 
                      className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-0 border-b-2 border-transparent rounded-none px-0 h-10 text-xs font-bold uppercase tracking-tight focus-visible:ring-0"
                    >
                      <Code className="w-3.5 h-3.5 mr-2" /> CSS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="javascript" 
                      className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-0 border-b-2 border-transparent rounded-none px-0 h-10 text-xs font-bold uppercase tracking-tight focus-visible:ring-0"
                    >
                      <Code className="w-3.5 h-3.5 mr-2" /> JavaScript
                    </TabsTrigger>
                    <TabsTrigger 
                      value="php" 
                      className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-0 border-b-2 border-transparent rounded-none px-0 h-10 text-xs font-bold uppercase tracking-tight focus-visible:ring-0"
                    >
                      <Code className="w-3.5 h-3.5 mr-2" /> PHP
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="html" className="flex-1 mt-0 relative min-h-0 overflow-hidden flex flex-col pt-4">
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      defaultLanguage="html"
                      theme="vs-dark"
                      value={component.props?.html || ''}
                      onChange={(value) => {
                        if (component) {
                          onUpdateComponent(component.id, {
                            props: {
                              ...component.props,
                              html: value || ''
                            }
                          });
                          triggerPreviewUpdate();
                        }
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        lineNumbers: 'on',
                        padding: { top: 10 }
                      }}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="css" className="flex-1 mt-0 relative min-h-0 overflow-hidden flex flex-col pt-4">
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      defaultLanguage="css"
                      theme="vs-dark"
                      value={cssCode}
                      onChange={(value) => {
                        setCssCode(value || '');
                        triggerPreviewUpdate();
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        lineNumbers: 'on',
                        padding: { top: 10 }
                      }}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="javascript" className="flex-1 mt-0 relative min-h-0 overflow-hidden flex flex-col pt-4">
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      theme="vs-dark"
                      value={jsCode}
                      onChange={(value) => {
                        setJsCode(value || '');
                        triggerPreviewUpdate();
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        lineNumbers: 'on',
                        padding: { top: 10 }
                      }}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="php" className="flex-1 mt-0 relative min-h-0 overflow-hidden flex flex-col pt-4">
                  <div className="flex-1 min-h-0">
                    <Editor
                      height="100%"
                      defaultLanguage="php"
                      theme="vs-dark"
                      value={component.props?.php || ''}
                      onChange={(value) => {
                        if (component) {
                          onUpdateComponent(component.id, {
                            props: {
                              ...component.props,
                              php: value || ''
                            }
                          });
                          triggerPreviewUpdate();
                        }
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        lineNumbers: 'on',
                        padding: { top: 10 }
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* AI Prompt Section */}
            <div className="p-4 border-t bg-muted/10 shrink-0">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Describe the styling changes you want to make..."
                    value={currentPrompt}
                    onChange={(e) => setCurrentPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateStyling()}
                    className="flex-1 text-sm"
                  />
                  <Button
                    onClick={handleGenerateStyling}
                    disabled={isGenerating || !currentPrompt.trim()}
                    size="sm"
                    className="shrink-0"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles />
                    )}
                    Generate
                  </Button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPrompt("Make this component more modern with better spacing and typography")}
                    className="text-xs h-7"
                  >
                    Modern Style
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPrompt("Add smooth hover animations and transitions")}
                    className="text-xs h-7"
                  >
                    Add Animations
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPrompt("Improve the color scheme with better contrast")}
                    className="text-xs h-7"
                  >
                    Better Colors
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Preview */}
          <div className="flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
            <div className="px-4 py-2 border-b bg-muted/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Live Preview</span>
                {isGenerating && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    <span className="text-[8px] text-muted-foreground">Updating...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(prev => Math.max(25, prev - 25))}
                  className="text-xs h-6 px-2"
                  disabled={zoomLevel <= 25}
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-12 text-center">{zoomLevel}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                  className="text-xs h-6 px-2"
                  disabled={zoomLevel >= 200}
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewKey(prev => prev + 1)}
                  className="text-xs h-6 px-2"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden relative">
              {isPreviewUpdating ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <iframe
                  key={previewKey}
                  srcDoc={generatePreviewHtml()}
                  className={`w-full h-full border-none flex-1 ${isGenerating ? 'pointer-events-none opacity-50' : ''}`}
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
                  sandbox="allow-scripts allow-modals allow-popups allow-forms allow-downloads allow-same-origin"
                  title="component-preview"
                />
              )}
              
              {/* AI Generation Loading Overlay */}
              {isGenerating && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-lg flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">AI is Generating</p>
                      <p className="text-xs text-muted-foreground">Please wait while we update your styling...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/30 shrink-0 gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isGenerating}
          >
            Reset to Original
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleApplyChanges} disabled={isGenerating} className="gap-2">
            <Save className="w-4 h-4" />
            {isGenerating ? 'Applying...' : 'Apply to Component'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
