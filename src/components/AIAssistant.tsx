"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Send, Bot, User, Sparkles, MessageSquare, Star, X, ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  feedback?: "up" | "down"
}

export function AIAssistant({ selectedComponentType, projectId }: { selectedComponentType?: string, projectId?: string }) {
  
  const storageKey = `buildx_ai_history_${projectId || "default"}`

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const [showRatingPopup, setShowRatingPopup] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [hoveredStar, setHoveredStar] = useState<number>(0)
  const [showRatingCongrats, setShowRatingCongrats] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX_WORDS = 30
  const currentWordCount = inputValue.trim() ? inputValue.trim().split(/\s+/).length : 0
  const isOverLimit = currentWordCount > MAX_WORDS

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedChats = sessionStorage.getItem(storageKey)
      if (savedChats) {
        setMessages(JSON.parse(savedChats).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      } else {
        setMessages([{
          id: "1",
          type: "assistant",
          content: `Hello! I'm your BuildX AI Mentor. How can I help you design today?`,
          timestamp: new Date(),
        }])
      }
      setRating(0)
      setShowRatingCongrats(false)
      setShowRatingPopup(false)
    }
  }, [projectId, storageKey])

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(messages))
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, storageKey])

  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch("http://127.0.0.1:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage }),
      })
      if (!response.ok) throw new Error("Server error")
      const data = await response.json()
      return data.answer
    } catch (error) {
      return "⚠️ Connection Error: Please make sure the AI server is running."
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isOverLimit) return
    const userMsg: Message = { id: Date.now().toString(), type: "user", content: inputValue.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInputValue("")
    setIsLoading(true)
    try {
      const response = await generateResponse(userMsg.content)
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), type: "assistant", content: response, timestamp: new Date() }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRate = (value: number) => {
    setRating(value)
    setShowRatingCongrats(true)
    setTimeout(() => {
      setShowRatingCongrats(false)
      setShowRatingPopup(false)
    }, 2000)
  }

  const rateMessage = (messageId: string, feedback: "up" | "down") => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback: msg.feedback === feedback ? undefined : feedback } : msg
    ))
  }

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Card className="relative overflow-hidden flex flex-col h-full border-t border-l-0 border-r-0 border-b-0 rounded-none bg-background text-foreground shadow-none">
      
      
      {showRatingPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border shadow-xl rounded-3xl p-6 w-full max-w-[260px] text-center relative animate-in fade-in zoom-in duration-200">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setShowRatingPopup(false)}>
              <X className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Rate AI Mentor</h3>
            <p className="text-xs text-muted-foreground mb-4">How was your overall session?</p>
            <div className="flex justify-center gap-1.5 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-7 h-7 cursor-pointer transition-all hover:scale-110 ${
                    (hoveredStar || rating) >= star ? "fill-fuchsia-500 text-fuchsia-500" : "text-muted-foreground/30"
                  }`}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleRate(star)}
                />
              ))}
            </div>
            {showRatingCongrats && <p className="text-xs text-fuchsia-500 font-medium animate-pulse mt-3">Feedback saved! Thanks!</p>}
          </div>
        </div>
      )}

      
      <CardHeader className="pb-3 pt-4 px-5 border-b bg-card relative z-20 shadow-sm overflow-hidden">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-lg blur opacity-40 animate-pulse"></div>
              <div className="relative w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <span className="font-extrabold tracking-wide text-foreground">
              BuildX AI Mentor
            </span>
          </div>
          {messages.length > 1 && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase tracking-widest font-bold text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-900/50 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30 rounded-full shadow-sm transition-all" onClick={() => setShowRatingPopup(true)}>
              <Star className="w-3 h-3 mr-1" /> Rate
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      
      <CardContent className="p-0 flex flex-col flex-1 min-h-0 bg-background relative">
        
        
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}></div>

        <div className="flex-1 overflow-y-auto px-5 pt-6 relative z-10" style={{ scrollbarWidth: "thin" }}>
          <div className="space-y-6 pb-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                
                
                <div className="flex-shrink-0 mt-auto mb-1">
                  {message.type === "assistant" ? (
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-full flex items-center justify-center shadow-md border-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shadow-sm border border-border">
                      <User className="w-4 h-4 text-foreground" />
                    </div>
                  )}
                </div>

                <div className={`max-w-[85%] flex flex-col ${message.type === "user" ? "items-end" : "items-start"}`}>
                  
                  
                  <div className={`px-4 py-3 text-sm shadow-sm rounded-2xl overflow-hidden ${
                    message.type === "assistant" 
                      ? "bg-muted text-foreground border border-border rounded-bl-sm" 
                      : "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-br-sm border-0 shadow-[0_4px_15px_rgba(147,51,234,0.2)] font-medium"
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                  
                  
                  <div className={`flex items-center gap-3 mt-1.5 px-1 ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    
                    {message.type === "assistant" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => copyToClipboard(message.content, message.id)} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
                          {copiedId === message.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button onClick={() => rateMessage(message.id, "up")} className={`p-1.5 hover:bg-muted rounded-md transition-colors ${message.feedback === "up" ? "text-fuchsia-500" : "text-muted-foreground hover:text-fuchsia-500"}`}>
                          <ThumbsUp className={`w-3 h-3 ${message.feedback === "up" ? "fill-fuchsia-500" : ""}`} />
                        </button>
                        <button onClick={() => rateMessage(message.id, "down")} className={`p-1.5 hover:bg-muted rounded-md transition-colors ${message.feedback === "down" ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}>
                          <ThumbsDown className={`w-3 h-3 ${message.feedback === "down" ? "fill-red-500" : ""}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))}
            
            
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0 mt-auto mb-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-full flex items-center justify-center shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-4 shadow-sm flex items-center gap-1.5 w-fit h-[40px] mt-auto mb-5">
                  <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        
        <div className="p-4 bg-card border-t z-20 relative">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              BuildX Prompt
            </span>
            <span className={`text-[10px] font-bold ${isOverLimit ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
              {currentWordCount}/{MAX_WORDS}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Ask for design help..."
              className={`rounded-xl bg-background border-border focus-visible:ring-fuchsia-500 ${isOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading || isOverLimit} size="icon" className="rounded-xl shadow-sm bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:opacity-90 text-white transition-all disabled:opacity-50 border-0">
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}