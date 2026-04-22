"use client"

import React from "react"

interface AIMentorLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  isThinking?: boolean
}

export function AIMentorLogo({ isThinking = false, className = "", ...props }: AIMentorLogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} {...props}>
      {/* Background glow effect when thinking */}
      {isThinking && (
        <div className="absolute -inset-2 bg-violet-500/20 rounded-full blur-xl animate-[pulse_2s_infinite] pointer-events-none" />
      )}
      
      {/* The main logo image */}
      <div className={`relative transition-all duration-500 ${isThinking ? 'scale-110' : 'scale-100'}`}>
        {/* Ring animation */}
        {isThinking && (
          <div className="absolute -inset-1 border-2 border-dashed border-violet-400/50 rounded-xl animate-[spin_8s_linear_infinite]" />
        )}
        
        <img 
          src="https://media.giphy.com/media/shT902UlQAd9l7lukP/giphy.gif" 
          alt="AI Mentor" 
          className={`w-8 h-8 rounded-lg object-cover shadow-md border border-violet-200/50 dark:border-violet-900/50 ${
            isThinking ? 'animate-[bounce_2s_infinite]' : ''
          }`}
        />
        
        {/* Thinking indicator dots */}
        {isThinking && (
          <div className="absolute -top-1 -right-1 flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-violet-300 rounded-full animate-bounce" />
          </div>
        )}
      </div>
    </div>
  )
}
