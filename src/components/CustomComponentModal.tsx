import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, Code, Save, Copy, Loader2, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { MonacoGenAi } from './MonacoGenAi';
import { getOpenRouterKey, getGeminiKey } from "../config/apiKeys"

// Gemini API function
const generateCodeWithGemini = async (
  prompt: string, 
  currentHtml: string, 
  currentCss: string, 
  currentJs: string, 
  currentPhp: string,
  history: { role: 'user' | 'assistant', content: string }[] = []
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
            PHP: ${currentPhp}
            ---

            IMPORTANT CANVAS DIMENSIONS:
            - The canvas has a FIXED width of 1920px - this will never change
            - All components should be designed for 1920px width
            - Do not use responsive breakpoints or fluid layouts that assume variable widths
            - Design for desktop-first with 1920px as the base width
            - This applies to HTML, CSS, JavaScript, and PHP code generation

            IMPORTANT MODAL JAVASCRIPT RULES:
            - For modal components, NEVER use document.addEventListener('DOMContentLoaded', function() {...})
            - Instead use immediately invoked function expressions: (function() { ... })();
            - Use the provided $ and $$ functions for DOM selection
            - Use onclick handlers instead of addEventListener for better compatibility
            - Include console.log statements for debugging modal interactions
            - Ensure modal JavaScript works in both preview mode and published sites
            - Modal code should be self-contained and not rely on external dependencies

            IMPORTANT JAVASCRIPT IMPLEMENTATION RULES:
            - ALWAYS use the enhanced DOM querying functions provided in the custom component environment
            - Use \`$('selector')\` instead of \`document.getElementById('selector')\` or \`document.querySelector('selector')\`
            - Use \`$$('selector')\` instead of \`document.querySelectorAll('selector')\`
            - Use \`onclick\` instead of \`addEventListener('click', ...)\` for better compatibility
            - ALWAYS use \`for loop\` instead of \`forEach()\` when working with NodeLists from \`$$()\`
            - If you need to use array methods, convert NodeList to Array first: \`Array.from($$('.selector'))\`
            - NEVER use \`document.body\` or \`body\` tag in custom components - it breaks the CSS and component isolation
            - Always include console.log statements for debugging
            - Check if elements exist before attaching event listeners
            - Example pattern for multiple elements:
              \`\`\`javascript
              console.log('Component loaded');
              
              const headers = $$('.accordion-header');
              console.log('Headers found:', headers.length);
              
              // Use for loop for NodeList compatibility
              for (let i = 0; i < headers.length; i++) {
                const header = headers[i];
                header.onclick = function() {
                  console.log('Header clicked:', i);
                  // Your functionality here
                };
              }
              
              // OR convert to Array first:
              const headerArray = Array.from($$('.accordion-header'));
              headerArray.forEach((header, index) => {
                header.onclick = function() {
                  console.log('Header clicked:', index);
                  // Your functionality here
                };
              });
              \`\`\`
            - Example pattern for single elements:
              \`\`\`javascript
              console.log('Component loaded');
              
              const button = $('#button-id');
              const modal = $('#modal-id');
              const closeBtn = $('.close-button');
              
              console.log('Elements found:', {
                button: !!button,
                modal: !!modal,
                closeBtn: !!closeBtn
              });
              
              if (button) {
                button.onclick = function() {
                  console.log('Button clicked!');
                  if (modal) {
                    modal.style.display = 'block';
                  }
                };
              }
              \`\`\`

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
            - Always return all 4 blocks (html, css, javascript, php) even if some are empty.
            - Use markdown code blocks for each language: \`\`\`html, \`\`\`css, \`\`\`javascript, \`\`\`php.
            - No explanations. Only code blocks.`
          },
          ...history,
          {
            role: 'user',
            content: `Task: ${prompt}. Please provide the updated HTML, CSS, JS, and PHP code blocks based on our conversation and the current code context.`
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
  onSave: (name: string, description: string, html: string, css: string, js: string, php: string) => Promise<void>;
  onUpdate?: (id: string, name: string, description: string, html: string, css: string, js: string, php: string) => Promise<void>;
  projectId: string;
  initialData?: {
    id: string;
    name: string;
    description: string;
    html: string;
    css: string;
    js: string;
    php: string;
  } | null;
}

export function CustomComponentModal({ isOpen, onClose, onSave, onUpdate, projectId, initialData }: CustomComponentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [htmlCode, setHtmlCode] = useState('<div class="container">\n  <h1>Hello World</h1>\n  <p>This is a custom component.</p>\n</div>');
  const [cssCode, setCssCode] = useState('.container {\n  padding: 20px;\n  background: #f0f0f0;\n  border-radius: 8px;\n}\n\nh1 {\n  color: #333;\n  font-size: 24px;\n}\n\np {\n  color: #666;\n  font-size: 16px;\n}');
  const [jsCode, setJsCode] = useState('document.addEventListener(\'DOMContentLoaded\', function() {\n  console.log(\'Component loaded\');\n  \n  // Add your JavaScript here\n});');
  const [phpCode, setPhpCode] = useState('<?php\n// Add your PHP code here\n\necho "Hello from PHP!";\n?>');
  const [aiCode, setAiCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  
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
      setJsCode(initialData.js || 'document.addEventListener(\'DOMContentLoaded\', function() {\n  console.log(\'Component loaded\');\n  \n  // Add your JavaScript here\n});');
      setPhpCode(initialData.php || '<?php\n// Add your PHP code here\n\necho "Hello from PHP!";\n?>');
      setAiCode('');
      setChatHistory([]);
    } else if (isOpen && !initialData) {
      setName('');
      setDescription('');
      setHtmlCode('<div class="container">\n  <h1>Hello World</h1>\n  <p>This is a custom component.</p>\n</div>');
      setCssCode('.container {\n  padding: 20px;\n  background: #f0f0f0;\n  border-radius: 8px;\n}\n\nh1 {\n  color: #333;\n  font-size: 24px;\n}\n\np {\n  color: #666;\n  font-size: 16px;\n}');
      setJsCode('document.addEventListener(\'DOMContentLoaded\', function() {\n  console.log(\'Component loaded\');\n  \n  // Add your JavaScript here\n});');
      setPhpCode('<?php\n// Add your PHP code here\n\necho "Hello from PHP!";\n?>');
      setAiCode('');
      setChatHistory([]);
    }
  }, [isOpen, initialData]);

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
    
    setIsSaving(true);
    try {
      if (initialData && onUpdate) {
        await onUpdate(initialData.id, name, description, htmlCode, cssCode, jsCode, phpCode);
        toast.success('Component updated successfully');
      } else {
        await onSave(name, description, htmlCode, cssCode, jsCode, phpCode);
        toast.success('Component saved successfully');
      }
      onClose();
    } catch (error) {
      toast.error(initialData ? 'Failed to update component' : 'Failed to save component');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a component name');
      return;
    }
    
    setIsSaving(true);
    try {
      // Use " (Copy)" suffix for the name as requested
      const duplicatedName = `${name} (Copy)`;
      await onSave(duplicatedName, description, htmlCode, cssCode, jsCode, phpCode);
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
                      <TabsTrigger 
                        value="php" 
                        className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary border-0 border-b-2 border-transparent rounded-none px-0 h-10 text-xs font-bold uppercase tracking-tight focus-visible:ring-0"
                      >
                        <Code className="w-3.5 h-3.5 mr-2" /> PHP
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
                  <TabsContent value="php" className="flex-1 mt-0 relative min-h-0 overflow-hidden flex flex-col">
                    <div className="flex-1 min-h-0">
                      <Editor
                        height="100%"
                        defaultLanguage="php"
                        theme="vs-dark"
                        value={phpCode}
                        onChange={(value) => {
                        setPhpCode(value || '');
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
                        try {
                          // Pass the current state values to the AI for context
                          const generatedCode = await generateCodeWithGemini(
                            currentPrompt, 
                            htmlCode, 
                            cssCode, 
                            jsCode, 
                            phpCode,
                            chatHistory
                          );
                          
                          const htmlMatch = generatedCode.match(/```html\n([\s\S]*?)\n```/);
                          const cssMatch = generatedCode.match(/```css\n([\s\S]*?)\n```/);
                          const jsMatch = generatedCode.match(/```javascript\n([\s\S]*?)\n```/);
                          const phpMatch = generatedCode.match(/```php\n([\s\S]*?)\n```/);
                          
                          if (htmlMatch) setHtmlCode(htmlMatch[1].trim());
                          if (cssMatch) setCssCode(cssMatch[1].trim());
                          if (jsMatch) setJsCode(jsMatch[1].trim());
                          if (phpMatch) setPhpCode(phpMatch[1].trim());
                          
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
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-lg flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">AI is Generating</p>
                      <p className="text-xs text-muted-foreground">Please wait while we create your code...</p>
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
