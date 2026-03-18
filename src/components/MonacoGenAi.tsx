import React, { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  Send, 
  Sparkles, 
  Copy, 
  Download, 
  RefreshCw,
  Code2,
  Zap,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateUIAndCode } from '../services/geminiCodeGenerator';

interface MonacoGenAiProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  language?: string;
  theme?: 'light' | 'dark';
  height?: string;
  showAiChat?: boolean;
  showToolbar?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
  error?: string;
}

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  code?: string;
}

// Chat history management
const CHAT_HISTORY_KEY = 'monaco-ai-chat-history';

const saveChatHistory = (messages: AiMessage[]) => {
  try {
    const history = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }));
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to save chat history:', error);
  }
};

const loadChatHistory = (): AiMessage[] => {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!saved) return [];
    
    const history = JSON.parse(saved);
    return history.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error) {
    console.warn('Failed to load chat history:', error);
    return [];
  }
};

export function MonacoGenAi({ 
  value = '',
  onChange,
  onBlur,
  onFocus,
  name,
  placeholder = '// Start coding or ask AI to help you!\n// Example: "Create a function that calculates factorial"',
  disabled = false,
  readOnly = false,
  language = 'javascript',
  theme = 'dark',
  height = '500px',
  showAiChat = true,
  showToolbar = true,
  className = '',
  id,
  required = false,
  error
}: MonacoGenAiProps) {
  const [code, setCode] = useState(value || placeholder);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showChat, setShowChat] = useState(showAiChat);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const editorRef = useRef<any>(null);

  // Load chat history on component mount
  useEffect(() => {
    const savedHistory = loadChatHistory();
    setMessages(savedHistory);
  }, []);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // Sync external value with internal state
  useEffect(() => {
    if (value !== undefined) {
      setCode(value);
    }
  }, [value]);

  useEffect(() => {
    setEditorTheme(theme === 'dark' ? 'vs-dark' : 'vs-light');
  }, [theme]);

  // AI Contextual Response Logic (Simulation/Local logic)
  const generateContextualResponse = async (prompt: string, chatHistory: AiMessage[]): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    const userPrompt = prompt.trim().toLowerCase();
    
    const lastAssistantMessage = [...chatHistory]
      .reverse()
      .find(msg => msg.role === 'assistant' && msg.code);
      
    const isIterative = lastAssistantMessage && (
      userPrompt.includes('modify') || 
      userPrompt.includes('change') || 
      userPrompt.includes('update') ||
      userPrompt.includes('fix')
    );

    if (isIterative && lastAssistantMessage.code) {
      let modifiedCode = lastAssistantMessage.code;
      // Basic simulations for iterative refinement
      if (userPrompt.includes('blue')) {
        modifiedCode = modifiedCode.replace(/#007bff/g, '#0056b3');
      }
      return `// I've updated the code based on your request: "${prompt}"\n${modifiedCode}`;
    }
    
    return `// AI generated code for: "${prompt}"\nconsole.log('New component initialized');`;
  };

  const handleEditorDidMount = useCallback((editor: any) => {
    editorRef.current = editor;
    
    editor.updateOptions({
      fontSize: 14,
      wordWrap: 'on',
      minimap: { enabled: !disabled && !readOnly },
      automaticLayout: true,
      bracketPairColorization: { enabled: true },
    });

    editor.onDidFocusEditorText(() => onFocus?.());
    editor.onDidBlurEditorText(() => onBlur?.());
  }, [disabled, readOnly, onFocus, onBlur]);

  const handleCodeChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onChange?.(newCode);
  }, [onChange]);

  const handleAiGenerate = async () => {
    if (!currentPrompt.trim()) {
      toast.error('Please enter a prompt for AI');
      return;
    }

    setIsGenerating(true);
    
    const userMessage: AiMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentPrompt,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Calling your actual service
      const aiResponse = await generateUIAndCode(currentPrompt);
      const aiCode = aiResponse?.code || '// AI response could not be generated';
      
      const assistantMessage: AiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I've generated the code based on your prompt.",
        code: aiCode,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCode(aiCode);
      onChange?.(aiCode);
      
      toast.success('Code generated successfully!');
      setCurrentPrompt('');
    } catch (error) {
      toast.error('Failed to generate code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Keyboard shortcut for AI generation
  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const disposable = editor.addAction({
        id: 'ai-generate',
        label: 'Generate with AI',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: handleAiGenerate
      });
      
      return () => disposable.dispose();
    }
  }, [handleAiGenerate]);

  const clearChatHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    toast.success('Chat history cleared!');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const downloadCode = () => {
    const extensions: Record<string, string> = {
      javascript: 'js', typescript: 'ts', html: 'html', css: 'css'
    };
    const extension = extensions[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-generated-code.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Code downloaded!');
  };

  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
      toast.success('Code formatted!');
    }
  };

  const insertCode = (codeToInsert: string) => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const model = editorRef.current.getModel();
      model.pushEditOperations(
        [],
        [{ range: selection, text: codeToInsert }],
        () => null
      );
      toast.success('Code inserted!');
    }
  };

  return (
    <div className={`flex flex-col h-full space-y-4 ${className} ${error ? 'border-red-500' : ''}`}>
      {name && <input type="hidden" name={name} value={code} />}
      
      {showToolbar && (
        <div className="flex items-center justify-between p-3 border-b bg-muted/30 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Monaco AI Editor</h3>
            <Badge variant="outline" className="text-xs">{language}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={formatCode} disabled={disabled || readOnly}>
              <RefreshCw className="w-4 h-4 mr-1" /> Format
            </Button>
            {showAiChat && (
              <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)} disabled={disabled}>
                <Sparkles className="w-4 h-4 mr-1" /> AI Chat
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copyCode} disabled={disabled}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
            <Button variant="outline" size="sm" onClick={downloadCode} disabled={disabled}><Download className="w-4 h-4 mr-1" /> Download</Button>
          </div>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1">
          <Card className="h-full p-4">
            <Editor
              height={height}
              language={language}
              theme={editorTheme}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              options={{ readOnly: readOnly || disabled, automaticLayout: true }}
            />
          </Card>
        </div>

        {showAiChat && showChat && !disabled && !readOnly && (
          <div className="w-80 flex flex-col">
            <Card className="flex-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <h4 className="font-medium">AI Assistant</h4>
                </div>
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearChatHistory} className="text-xs">Clear History</Button>
                )}
              </div>
              
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Ask AI to generate or modify code</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{message.role === 'user' ? 'You' : 'AI'}</span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        {message.code && (
                          <div className="mt-2">
                            <Button variant="outline" size="sm" onClick={() => insertCode(message.code!)} className="text-xs">
                              <Code2 className="w-3 h-3 mr-1" /> Insert Code
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              <div className="space-y-2">
                <textarea
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  placeholder="Ask AI to generate..."
                  className="w-full p-2 text-sm border rounded-md h-20 resize-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiGenerate(); } }}
                />
                <Button onClick={handleAiGenerate} disabled={isGenerating || !currentPrompt.trim()} className="w-full">
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-2 border-t bg-muted/30 text-xs text-muted-foreground rounded-b-lg">
        <div className="flex items-center gap-4">
          <span>{code.split('\n').length} lines</span>
          <span>{language}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${disabled ? 'bg-gray-400' : 'bg-green-500'}`} />
          <span>{disabled ? 'Disabled' : 'Ready'}</span>
        </div>
      </div>
    </div>
  );
}