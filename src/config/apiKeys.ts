// src/config/apiKeys.ts


export function getGeminiKey(): string {
  // Read from environment variable first
  // Handle various naming conventions used in the project
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.VITE_GEMINI_2_5_FLASH || 
                 import.meta.env.VITE_GEMINI_25_FLASH ||
                 import.meta.env.GEMINI_2_5_FLASH || 
                 import.meta.env.GEMINI_25_FLASH ||
                 import.meta.env.GEMINI_API_KEY
  const storedKey = localStorage.getItem("gemini_api_key")
  const finalKey = (storedKey || envKey || "").trim()
  
  // Diagnostic log for debugging - remove in production
  if (!finalKey) {
    console.group('🔍 AI Key Diagnostic');
    console.log('VITE_GEMINI_2_5_FLASH exists:', !!import.meta.env.VITE_GEMINI_2_5_FLASH);
    console.log('VITE_GEMINI_API_KEY exists:', !!import.meta.env.VITE_GEMINI_API_KEY);
    console.log('localStorage gemini_api_key exists:', !!storedKey);
    console.groupEnd();
  }
  
  return finalKey
}

export function getOpenAIKey(): string {
  // Read from environment variable first
  const envKey = import.meta.env.VITE_OPENAI_API_KEY
  const storedKey = localStorage.getItem("openai_api_key")
  return storedKey || envKey || ""
}

export function getOpenRouterKey(): string {
  // Read from environment variable first
  const envKey = import.meta.env.VITE_OPENROUTER_API_KEY || 
                 import.meta.env.VITE_OPENROUTER_KEY
  const storedKey = localStorage.getItem("openrouter_api_key")
  return (storedKey || envKey || "").trim()
}

export function setGeminiKey(key: string): void {
  localStorage.setItem("gemini_api_key", key)
}

export function setOpenAIKey(key: string): void {
  localStorage.setItem("openai_api_key", key)
}

export function setOpenRouterKey(key: string): void {
  localStorage.setItem("openrouter_api_key", key)
}

export function hasValidGeminiKey(): boolean {
  const key = getGeminiKey()
  return key !== ""
}

export function hasValidOpenAIKey(): boolean {
  const key = getOpenAIKey()
  return key !== ""
}

export function hasValidOpenRouterKey(): boolean {
  const key = getOpenRouterKey()
  return key !== ""
}
