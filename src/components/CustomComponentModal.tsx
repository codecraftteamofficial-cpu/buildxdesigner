import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, Code, Save, Copy, Loader2, Sparkles, ZoomIn, ZoomOut, X, Database, Mail, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { MonacoGenAi } from './MonacoGenAi';
import { Progress } from './ui/progress';
import { getOpenRouterKey, getGeminiKey } from "../config/apiKeys"
import { AI_JAVASCRIPT_RULES, AI_COMMON_RULES, DEFAULT_CUSTOM_COMPONENT_JS } from "../constants/aiRules";

// Gemini API function
const generateCodeWithGemini = async (
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
    
    // Debug logging - remove after fixing
    console.log('🔑 Custom Component API Key Debug:', {
      'hasOpenRouterKey': !!openRouterKey,
      'hasGeminiKey': !!geminiKey,
      'hasFinalApiKey': !!apiKey
    });
    
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
        'X-Title': 'BuildXdesigner',
      },
      signal,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert web development AI for "BuildXdesigner". 
            Your goal is to generate or modify code based on the user's request.
            
            CURRENT CODE CONTEXT:
            ---
            HTML: ${currentHtml}
            CSS: ${currentCss}
            JS: ${currentJs}
            ---

            ${AI_COMMON_RULES}

            ${AI_JAVASCRIPT_RULES}

            IMPORTANT CSS IMPLEMENTATION RULES:
            - NEVER use \`body\` tag styles in custom components - it breaks component isolation
            - Use component-scoped classes and IDs instead
            - Avoid global CSS that affects the entire page
            - Use specific selectors within the component container
            - Example pattern:
              \`\`\`css
              /* Component-specific styles - avoid body */
              .component-container {
                padding: 20px;
                background: #f0f0f0;
                border-radius: 8px;
              }
              
              .component-button {
                padding: 10px 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
              }
              
              /* Use component-scoped selectors */
              .component-container .error-message {
                color: #dc3545;
                font-size: 14px;
              }
              \`\`\`

            RULES:
            - If the user asks for a change (e.g., "make it blue"), modify the existing code provided in the context.
            - If the user asks for something new, generate complete code.
            - Use ONLY standard CSS for styling. No Tailwind.
            - Always return all 3 blocks (html, css, javascript) even if some are empty.
            - MANDATORY: The JavaScript block MUST be wrapped in: (function() { ... })();
            - Use markdown code blocks for each language: \`\`\`html, \`\`\`css, \`\`\`javascript.
            - STRICTLY NO PHP CODE. ONLY HTML, CSS, AND JAVASCRIPT.
            - No explanations. Only code blocks.`
          },
          ...history,
          {
            role: 'user',
            content: `Task: ${prompt}. Please provide the updated HTML, CSS, and JS code blocks based on our conversation and the current code context.`
          }
        ],
        max_tokens: 2500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) throw new Error('API Request Failed');

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Gemini API error:', error);
    return '';
  }
};
interface CustomComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, html: string, css: string, js: string) => Promise<void>;
  onUpdate?: (id: string, name: string, description: string, html: string, css: string, js: string) => Promise<void>;
  projectId: string;
  initialData?: {
    id: string;
    name: string;
    description: string;
    html: string;
    css: string;
    js: string;
  } | null;
}

const validateJsCode = (js: string): { isValid: boolean; error?: string } => {
  const trimmed = js.trim();
  if (!trimmed) return { isValid: true };
  
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

export function CustomComponentModal({ isOpen, onClose, onSave, onUpdate, projectId, initialData }: CustomComponentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [htmlCode, setHtmlCode] = useState('<div class="container">\n  <h1>Hello World</h1>\n  <p>This is a custom component.</p>\n</div>');
  const [cssCode, setCssCode] = useState('.container {\n  padding: 20px;\n  background: #f0f0f0;\n  border-radius: 8px;\n}\n\nh1 {\n  color: #333;\n  font-size: 24px;\n}\n\np {\n  color: #666;\n  font-size: 16px;\n}');
  const [jsCode, setJsCode] = useState(DEFAULT_CUSTOM_COMPONENT_JS);
  const [aiCode, setAiCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Debounced preview state
  const [debouncedPreviewContent, setDebouncedPreviewContent] = useState('');
  const [isPreviewUpdating, setIsPreviewUpdating] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setHtmlCode(initialData.html);
      setCssCode(initialData.css);
      setJsCode(initialData.js || DEFAULT_CUSTOM_COMPONENT_JS);
      setAiCode('');
      setChatHistory([]);
    } else if (isOpen && !initialData) {
      setName('');
      setDescription('');
      setHtmlCode('<div class="container">\n  <h1>Hello World</h1>\n  <p>This is a custom component.</p>\n</div>');
      setCssCode('.container {\n  padding: 20px;\n  background: #f0f0f0;\n  border-radius: 8px;\n}\n\nh1 {\n  color: #333;\n  font-size: 24px;\n}\n\np {\n  color: #666;\n  font-size: 16px;\n}');
      setJsCode(DEFAULT_CUSTOM_COMPONENT_JS);
      setAiCode('');
      setChatHistory([]);
    }
  }, [isOpen, initialData]);

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

  // Trigger preview update function
  const triggerPreviewUpdate = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setIsPreviewUpdating(true);
    debounceTimeoutRef.current = setTimeout(() => {
      const content = `
        <html>
          <head>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh;
                background: transparent;
              }
              ${cssCode}
            </style>
          </head>
          <body>
            <div id="component-root" style="width: 100%; display: flex; justify-content: center;">
              ${htmlCode}
            </div>
            <script>
              (function(element) {
                try {
                  // Enhanced DOM querying functions for Monaco sandbox
                  const $ = (selector) => {
                    // First try within component root
                    let found = element.querySelector(selector);
                    // If not found, try globally within iframe
                    if (!found) found = document.querySelector(selector);
                    return found;
                  };
                  
                  const $$ = (selector) => {
                    // First try within component root
                    let found = element.querySelectorAll(selector);
                    // If none found, try globally within iframe
                    if (found.length === 0) found = document.querySelectorAll(selector);
                    return found;
                  };
                  
                  // Make these functions available to user's JS
                  const querySelector = $;
                  const querySelectorAll = $$;
                  
                  console.log('Monaco sandbox: Enhanced DOM functions loaded');
                  
                  ${jsCode}
                } catch (err) {
                  console.error('Error in custom component preview:', err);
                }
              })(document.getElementById('component-root'));
            </script>
          </body>
        </html>
      `;
      setDebouncedPreviewContent(content);
      setIsPreviewUpdating(false);
    }, 500);
  };

  // Debounced preview effect
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Show that preview is updating
    setIsPreviewUpdating(true);

    // Set new timeout to update preview after delay
    debounceTimeoutRef.current = setTimeout(() => {
      const content = `
        <html>
          <head>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh;
                background: transparent;
              }
              ${cssCode}
            </style>
          </head>
          <body>
            <div id="component-root" style="width: 100%; display: flex; justify-content: center;">
              ${htmlCode}
            </div>
            <script>
              (function(element) {
                try {
                  // Enhanced DOM querying functions for Monaco sandbox
                  const $ = (selector) => {
                    // First try within the component root
                    let found = element.querySelector(selector);
                    // If not found, try globally within the iframe
                    if (!found) found = document.querySelector(selector);
                    return found;
                  };
                  
                  const $$ = (selector) => {
                    // First try within the component root
                    let found = element.querySelectorAll(selector);
                    // If none found, try globally within the iframe
                    if (found.length === 0) found = document.querySelectorAll(selector);
                    return found;
                  };
                  
                  // Make these functions available to the user's JS
                  const querySelector = $;
                  const querySelectorAll = $$;
                  
                  console.log('Monaco sandbox: Enhanced DOM functions loaded');
                  
                  ${jsCode}
                } catch (err) {
                  console.error('Error in custom component preview:', err);
                }
              })(document.getElementById('component-root'));
            </script>
          </body>
        </html>
      `;
      setDebouncedPreviewContent(content);
      setIsPreviewUpdating(false);
    }, 500); // 500ms delay

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [htmlCode, cssCode, jsCode]);

  // Set initial preview content when modal opens
  useEffect(() => {
    if (isOpen) {
      const content = `
        <html>
          <head>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh;
                background: transparent;
              }
              ${cssCode}
            </style>
          </head>
          <body>
            <div id="component-root" style="width: 100%; display: flex; justify-content: center;">
              ${htmlCode}
            </div>
            <script>
              (function(element) {
                try {
                  // Enhanced DOM querying functions for Monaco sandbox
                  const $ = (selector) => {
                    // First try within the component root
                    let found = element.querySelector(selector);
                    // If not found, try globally within the iframe
                    if (!found) found = document.querySelector(selector);
                    return found;
                  };
                  
                  const $$ = (selector) => {
                    // First try within the component root
                    let found = element.querySelectorAll(selector);
                    // If none found, try globally within the iframe
                    if (found.length === 0) found = document.querySelectorAll(selector);
                    return found;
                  };
                  
                  // Make these functions available to the user's JS
                  const querySelector = $;
                  const querySelectorAll = $$;
                  
                  console.log('Monaco sandbox: Enhanced DOM functions loaded');
                  
                  ${jsCode}
                } catch (err) {
                  console.error('Error in custom component preview:', err);
                }
              })(document.getElementById('component-root'));
            </script>
          </body>
        </html>
      `;
      setDebouncedPreviewContent(content);
    }
  }, [isOpen, htmlCode, cssCode, jsCode]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a component name');
      return;
    }

    const validation = validateJsCode(jsCode);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }
    
    setIsSaving(true);
    try {
      if (initialData && onUpdate) {
        await onUpdate(initialData.id, name, description, htmlCode, cssCode, jsCode);
        toast.success('Component updated successfully');
      } else {
        await onSave(name, description, htmlCode, cssCode, jsCode);
        toast.success('Component saved successfully');
      }
      onClose();
    } catch (error) {
      toast.error(initialData ? 'Failed to update component' : 'Failed to save component');
    } finally {
      setIsSaving(false);
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

  const handleDuplicate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a component name');
      return;
    }

    const validation = validateJsCode(jsCode);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }
    
    setIsSaving(true);
    try {
      // Use " (Copy)" suffix for the name as requested
      const duplicatedName = `${name} (Copy)`;
      await onSave(duplicatedName, description, htmlCode, cssCode, jsCode);
      toast.success('Component duplicated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to duplicate component');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[85vh] sm:max-w-[95vw] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-xl">
        <DialogHeader className="p-4 border-b shrink-0 bg-muted/30">
          <div className="space-y-3">
            <DialogTitle className="text-xl font-bold">{initialData ? 'Edit Custom Component' : 'Create Custom Component'}</DialogTitle>
            <DialogDescription className="text-xs">Design your own component with AI assistance.</DialogDescription>
            <div className="flex gap-2 items-center">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase text-muted-foreground ml-1 font-mono">Component Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Hero Section" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-sm bg-background border-muted-foreground/20 focus:border-primary transition-all"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="description" className="text-[10px] font-bold uppercase text-muted-foreground ml-1 font-mono">Description (Optional)</Label>
                <Input 
                  id="description" 
                  placeholder="What does this component do?" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-sm bg-background border-muted-foreground/20 focus:border-primary transition-all"
                />
              </div>
            </div>
            
            {/* Integration Status */}
            {(initialData as any)?.integrations && (initialData as any).integrations.length > 0 && (
              <div className="bg-muted/10 rounded-lg p-2 border border-border/60">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Active Integrations</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(initialData as any)?.integrations?.map((integration: any) => (
                    <Badge 
                      key={integration.id} 
                      variant="outline" 
                      className={`text-[9px] h-5 px-2 ${
                        integration.type === 'supabase' ? 'bg-green-50 text-green-700 border-green-200' :
                        integration.type === 'resend' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {integration.type === 'supabase' && <Database className="w-3 h-3" />}
                        {integration.type === 'resend' && <Mail className="w-3 h-3" />}
                        {integration.type === 'paymongo' && <CreditCard className="w-3 h-3" />}
                        {integration.name}
                      </div>
                    </Badge>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Configure integrations via Properties panel → Content tab → Add Integration
                </p>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          {/* Left Side: Editor */}
          <div className="flex flex-col border-r bg-background overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0">
                <Tabs defaultValue="html" className="flex-1 flex flex-col min-h-0">
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
                  
                  <TabsContent value="html" className="flex-1 mt-0 relative min-h-0 overflow-hidden flex flex-col">
                    <div className="flex-1 min-h-0">
                      <Editor
                        height="100%"
                        defaultLanguage="html"
                        theme="vs-dark"
                        value={htmlCode}
                        onChange={(value) => {
                        setHtmlCode(value || '');
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
                  <TabsContent value="css" className="flex-1 mt-0 relative min-h-0 overflow-hidden flex flex-col">
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
                  <TabsContent value="javascript" className="flex-1 mt-0 relative min-h-0 overflow-hidden flex flex-col">
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
                
                {/* AI Input Field and Button - Fixed position at bottom */}
                <div className="border-t bg-muted/30 p-3 shrink-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask AI to generate code... (e.g., 'Create a responsive card component')"
                      value={aiCode}
                      onChange={(e) => setAiCode(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Button 
                      size="sm" 
                      onClick={async () => {
                        if (!aiCode.trim()) return;
                        
                        const currentPrompt = aiCode;
                        setIsGenerating(true);
                        
                        // Create new AbortController
                        const controller = new AbortController();
                        abortControllerRef.current = controller;
                        
                        try {
                          // Pass the current state values to the AI for context
                          const generatedCode = await generateCodeWithGemini(
                            currentPrompt, 
                            htmlCode, 
                            cssCode, 
                            jsCode, 
                            chatHistory,
                            controller.signal
                          );
                          
                          const htmlMatch = generatedCode.match(/```html\n([\s\S]*?)\n```/);
                          const cssMatch = generatedCode.match(/```css\n([\s\S]*?)\n```/);
                          const jsMatch = generatedCode.match(/```javascript\n([\s\S]*?)\n```/);
                          
                          if (htmlMatch) setHtmlCode(htmlMatch[1].trim());
                          if (cssMatch) setCssCode(cssMatch[1].trim());
                          if (jsMatch) setJsCode(jsMatch[1].trim());
                          
                          // Update history
                          setChatHistory(prev => [
                            ...prev, 
                            { role: 'user', content: currentPrompt },
                            { role: 'assistant', content: generatedCode }
                          ]);

                          setAiCode('');
                          toast.success('Code updated by AI!');
                        } catch (error) {
                          toast.error('Failed to generate code.');
                        } finally {
                          setIsGenerating(false);
                          abortControllerRef.current = null;
                        }
                      }}
                      disabled={!aiCode.trim() || isGenerating}
                    >
                      {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      Generate
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
                {isPreviewUpdating && (
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
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden relative">
              <iframe
                title="component-preview"
                srcDoc={debouncedPreviewContent}
                className={`w-full h-full border-none flex-1 ${isGenerating ? 'pointer-events-none opacity-50' : ''}`}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
                sandbox="allow-scripts allow-modals allow-popups allow-forms allow-downloads allow-same-origin"
              />
              
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
                          AI is Crafting Your Code
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">
                          {progress < 30 ? 'Analyzing requirements...' : 
                           progress < 70 ? 'Generating components...' : 
                           progress < 95 ? 'Writing logic...' : 'Almost there...'}
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
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          
          {initialData && (
            <Button 
              variant="secondary" 
              onClick={handleDuplicate} 
              disabled={isSaving}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              {isSaving ? 'Duplicating...' : 'Duplicate'}
            </Button>
          )}

          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : initialData ? 'Update Component' : 'Save Component'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
