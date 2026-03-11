"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Send, User, MessageSquare, Star, X, ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  feedback?: "up" | "down"
  animate?: boolean 
}

const TypewriterText = ({ text, animate }: { text: string, animate?: boolean }) => {
  const [displayedText, setDisplayedText] = useState(animate ? "" : text)

  useEffect(() => {
    if (!animate) {
      setDisplayedText(text)
      return
    }
    
    let currentText = ""
    let i = 0
    setDisplayedText("") 
    
    const timer = setInterval(() => {
      if (i < text.length) {
        currentText += text.charAt(i) 
        setDisplayedText(currentText)
        i++
      } else {
        clearInterval(timer)
      }
    }, 3) 

    return () => clearInterval(timer)
  }, [text, animate])

  return <div className="whitespace-pre-wrap leading-relaxed">{displayedText}</div>
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
  
  const [thinkingIndex, setThinkingIndex] = useState(0)
  const thinkingPhrases = ["AI is thinking...", "Reading BuildX docs...", "Analyzing context...", "Preparing answer..."]

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX_WORDS = 30
  const currentWordCount = inputValue.trim() ? inputValue.trim().split(/\s+/).length : 0
  const isOverLimit = currentWordCount > MAX_WORDS

  useEffect(() => {
    const pingServer = () => {
      fetch("https://pyqt-buildx-aiinterface.onrender.com/ask", { method: "OPTIONS" }).catch(() => null)
    }
    const pingInterval = setInterval(pingServer, 840000)
    return () => clearInterval(pingInterval)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isLoading) {
      interval = setInterval(() => {
        setThinkingIndex((prev) => (prev + 1) % thinkingPhrases.length)
      }, 2000)
    } else {
      setThinkingIndex(0)
    }
    return () => clearInterval(interval)
  }, [isLoading])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedChats = sessionStorage.getItem(storageKey)
      if (savedChats) {
        setMessages(JSON.parse(savedChats).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          animate: false 
        })))
      } else {
        setMessages([{
          id: "1",
          type: "assistant",
          content: `Hello! I'm your BuildX AI Mentor. How can I help you design today?`,
          timestamp: new Date(),
          animate: true 
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
      const response = await fetch("https://pyqt-buildx-aiinterface.onrender.com/ask", {
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
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), type: "assistant", content: response, timestamp: new Date(), animate: true }])
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
            <div className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Rate AI Mentor</h3>
            <p className="text-xs text-muted-foreground mb-4">How was your overall session?</p>
            <div className="flex justify-center gap-1.5 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-7 h-7 cursor-pointer transition-all hover:scale-110 ${
                    (hoveredStar || rating) >= star ? "fill-violet-500 text-violet-500" : "text-muted-foreground/30"
                  }`}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleRate(star)}
                />
              ))}
            </div>
            {showRatingCongrats && <p className="text-xs text-violet-500 font-medium animate-pulse mt-3">Feedback saved! Thanks!</p>}
          </div>
        </div>
      )}

      <CardHeader className="pb-3 pt-4 px-5 border-b bg-card relative z-20 shadow-sm overflow-hidden">
        <CardTitle className="text-sm flex items-center justify-between w-full">
          
          <div className="flex items-center gap-3 ml-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-violet-600 rounded-lg blur opacity-40 animate-pulse"></div>
              <img src="https://media.giphy.com/media/shT902UlQAd9l7lukP/giphy.gif" alt="AI Mentor Profile" className="relative w-8 h-8 rounded-lg object-cover shadow-sm" />
            </div>
            
            <span className="text-lg font-bold text-violet-700">
              BuildX AI Mentor
            </span>
          </div>
          
          {messages.length > 1 && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase tracking-widest font-bold text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-full shadow-sm transition-all" onClick={() => setShowRatingPopup(true)}>
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

        <div className="flex-1 overflow-y-auto pt-6 relative z-10" style={{ scrollbarWidth: "thin" }}>
          <div className="space-y-6 pb-6 px-6">
            {messages.map((message) => {
              const isUser = message.type === "user";
              return (
                <div key={message.id} className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className="flex gap-3 max-w-[85%]">
                    
                    {!isUser && (
                      <div className="flex-shrink-0 mt-auto mb-1">
                        <img src="https://media.giphy.com/media/0JD7et5Wyv8m0mah8z/giphy.gif" alt="AI Avatar" className="w-8 h-8 rounded-full object-cover shadow-md border-0" />
                      </div>
                    )}

                    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-3 text-sm shadow-sm rounded-2xl overflow-hidden ${
                        isUser 
                          ? "bg-muted text-foreground border border-border rounded-br-sm" 
                          : "bg-violet-600 text-white rounded-bl-sm border-0 shadow-md font-medium"
                      }`}>
                        {isUser ? (
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        ) : (
                          <TypewriterText text={message.content} animate={message.animate} />
                        )}
                      </div>
                      
                      <div className={`flex items-center gap-3 mt-1.5 px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        
                        {!isUser && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => copyToClipboard(message.content, message.id)} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
                              {copiedId === message.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button onClick={() => rateMessage(message.id, "up")} className={`p-1.5 hover:bg-muted rounded-md transition-colors ${message.feedback === "up" ? "text-violet-500" : "text-muted-foreground hover:text-violet-500"}`}>
                              <ThumbsUp className={`w-3 h-3 ${message.feedback === "up" ? "fill-violet-500" : ""}`} />
                            </button>
                            <button onClick={() => rateMessage(message.id, "down")} className={`p-1.5 hover:bg-muted rounded-md transition-colors ${message.feedback === "down" ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}>
                              <ThumbsDown className={`w-3 h-3 ${message.feedback === "down" ? "fill-red-500" : ""}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isUser && (
                      <div className="flex-shrink-0 mt-auto mb-1">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shadow-sm border border-border">
                          <User className="w-4 h-4 text-foreground" />
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )
            })}
            
            {isLoading && (
              <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="flex-shrink-0 mt-auto mb-1">
                    <img src="https://media.giphy.com/media/0JD7et5Wyv8m0mah8z/giphy.gif" alt="AI Avatar" className="w-8 h-8 rounded-full object-cover shadow-md border-0" />
                  </div>
                  <div className="flex flex-col items-start mb-5">
                    <div className="px-5 py-3.5 text-sm shadow-sm rounded-2xl overflow-hidden bg-violet-600 text-white rounded-tl-sm border-0 shadow-md font-medium flex items-center gap-2 w-[220px]">
                      <span className="font-bold">{thinkingPhrases[thinkingIndex]}</span>
                      <div className="flex gap-1 items-center mt-1 ml-auto">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  </div>
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
              placeholder="Ask AI Mentor for help..."
              className={`rounded-xl bg-background border-border focus-visible:ring-violet-500 ${isOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading || isOverLimit} size="icon" className="rounded-xl shadow-sm bg-violet-600 hover:bg-violet-700 text-white transition-all disabled:opacity-50 border-0">
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}