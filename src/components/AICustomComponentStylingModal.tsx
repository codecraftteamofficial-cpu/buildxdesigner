import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, Code, Save, Loader2, Sparkles, Send, RefreshCw, X, ZoomIn, ZoomOut, Database, Mail, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { Progress } from './ui/progress';
import { getOpenRouterKey, getGeminiKey } from "../config/apiKeys"
import type { ComponentData } from "../App";
import { AI_JAVASCRIPT_RULES, AI_COMMON_RULES } from "../constants/aiRules";

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
  history: { role: 'user' | 'assistant', content: string }[] = [],
  signal?: AbortSignal
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
      signal,
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

            ${AI_COMMON_RULES}

            ${AI_JAVASCRIPT_RULES}

            IMPORTANT STYLING RULES:
            - Focus ONLY on CSS and JavaScript modifications
            - Do not change the HTML structure unless specifically requested for styling purposes
            - Use ONLY standard CSS for styling. No Tailwind.
            - Always return all 3 blocks (html, css, javascript) even if some are empty.
            - MANDATORY: The JavaScript block MUST be wrapped in: (function() { ... })();
            - Use markdown code blocks for each language: \`\`\`html, \`\`\`css, \`\`\`javascript.
            - No explanations. Only code blocks.
            - Use the existing CSS classes and selectors from the current code
            - Add new CSS rules as needed, but preserve existing styles
            - For JavaScript, focus on event handlers, animations, and interactive styling
            - Use component-scoped styles that won't affect other elements
            - Include comments explaining major changes
            - Ensure responsive design considerations
            - Use modern CSS features when appropriate
            - STRICTLY NO PHP CODE. ONLY HTML, CSS, AND JAVASCRIPT.`
          },
          ...history.map(({ role, content }) => ({ role, content })),
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.2,
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

const validateJsCode = (js: string): { isValid: boolean; error?: string } => {
  const trimmed = js.trim();
  if (!trimmed || trimmed === 'No changes') return { isValid: true };
  
  // Check for IIFE wrapper
  const startsWithIIFE = trimmed.startsWith('(function() {') || trimmed.startsWith('(function () {');
  const endsWithIIFE = trimmed.endsWith('})();');
  
  if (!startsWithIIFE || !endsWithIIFE) {
    return { 
      isValid: false, 
      error: 'MANDATORY: JavaScript must be wrapped exactly in: (function() { ... })();' 
    };
  }
  
  return { isValid: true };
};

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
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [isPreviewUpdating, setIsPreviewUpdating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const abortControllerRef = useRef<AbortController | null>(null);
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

  // Simulated progress logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 30) return prev + 2; // Fast at first
          if (prev < 70) return prev + 0.8; // Moderate
          if (prev < 95) return prev + 0.2; // Slow down
          return prev; // Stay at 95 until done
        });
      }, 100);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);


  const handleGenerateStyling = async () => {
    if (!currentPrompt.trim() || !component) {
      toast.error("Please enter a styling request");
      return;
    }

    setIsGenerating(true);

    // Create new AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const currentPromptText = currentPrompt;
      const currentHtml = component.props?.html || '';
      const response = await generateStylingWithGemini(
        currentPromptText,
        currentHtml,
        cssCode,
        jsCode,
        messages.slice(-10), // Include last 10 messages for context
        controller.signal
      );

      // Parse the response using markdown code blocks
      const htmlMatch = response.match(/```html\n([\s\S]*?)\n```/);
      const cssMatch = response.match(/```css\n([\s\S]*?)\n```/);
      const jsMatch = response.match(/```javascript\n([\s\S]*?)\n```/);

      if (cssMatch) {
        const newCss = cssMatch[1].trim();
        setCssCode(newCss);
      }

      if (jsMatch) {
        const newJs = jsMatch[1].trim();
        if (newJs !== 'No changes') {
          setJsCode(newJs);
        }
      }

      // Add to message history
      const userMessage: AiMessage = {
        id: Date.now().toString() + '-user',
        role: 'user',
        content: currentPromptText,
        timestamp: new Date()
      };

      const assistantMessage: AiMessage = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      toast.success("Styling generated successfully!");

    } catch (error) {
      console.error('Error generating styling:', error);
      toast.error("Failed to generate styling. Please try again.");
    } finally {
      setIsGenerating(false);
      setCurrentPrompt('');
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setProgress(0);
      toast.info("AI generation stopped.");
    }
  };

  const handleApplyChanges = () => {
    if (!component) return;

    const validation = validateJsCode(jsCode);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

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
            
            {/* Integration Status */}
            {component?.props?.integrations && component.props.integrations.length > 0 && (
              <div className="bg-muted/10 rounded-lg p-2 border border-border/60 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Code className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-medium uppercase text-muted-foreground">Active Integrations</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {component.props.integrations.map((integration: any) => (
                    <Badge 
                      key={integration.id} 
                      variant="outline" 
                      className={`text-[8px] h-4 px-1 ${
                        integration.type === 'supabase' ? 'bg-green-50 text-green-700 border-green-200' :
                        integration.type === 'resend' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {integration.type === 'supabase' && <Database className="w-2.5 h-2.5" />}
                        {integration.type === 'resend' && <Mail className="w-2.5 h-2.5" />}
                        {integration.type === 'paymongo' && <CreditCard className="w-2.5 h-2.5" />}
                        {integration.name}
                      </div>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPrompt("Add smooth transitions and hover effects")}
                    className="text-xs h-7"
                  >
                    Smooth Transitions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPrompt("Fit the component to the canvas size")}
                    className="text-xs h-7"
                  >
                    Fit to Canvas Size
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPrompt("use self-invoking function (IIFE) for javascript")}
                    className="text-xs h-7"
                  >
                    Self-Invoking Function (IIFE)
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
                <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50">
                  <div className="bg-background/95 border border-border rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6 w-80 animate-in fade-in zoom-in duration-300">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                      <Loader2 className="w-16 h-16 animate-spin text-primary" />
                      <span className="absolute text-sm font-black text-primary drop-shadow-sm font-mono">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] items-center px-1 font-bold uppercase tracking-widest text-muted-foreground/80">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2.5 bg-muted/50 border border-primary/10" />
                      </div>
                      <div className="text-center space-y-1.5 border-t border-border pt-4">
                        <p className="text-sm font-bold text-foreground flex items-center justify-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                          AI is Refining Your Style
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">
                          {progress < 30 ? 'Analyzing request...' :
                            progress < 70 ? 'Generating modern CSS...' :
                              progress < 95 ? 'Optimizing layouts...' : 'Almost there...'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStopGenerating}
                        className="w-full mt-2 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors gap-2 font-bold text-[10px] uppercase tracking-widest"
                      >
                        <X className="w-3 h-3" />
                        Stop Generating
                      </Button>
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
