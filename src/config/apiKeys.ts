// src/config/apiKeys.ts


export function getGeminiKey(): string {
  // Read from environment variable first
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  const storedKey = localStorage.getItem("gemini_api_key")
  return storedKey || envKey || ""
}

export function getOpenAIKey(): string {
  // Read from environment variable first
  const envKey = import.meta.env.VITE_OPENAI_API_KEY
  const storedKey = localStorage.getItem("openai_api_key")
  return storedKey || envKey || ""
}

export function setGeminiKey(key: string): void {
  localStorage.setItem("gemini_api_key", key)
}

export function setOpenAIKey(key: string): void {
  localStorage.setItem("openai_api_key", key)
}

export function hasValidGeminiKey(): boolean {
  const key = getGeminiKey()
  return key !== ""
}

export function hasValidOpenAIKey(): boolean {
  const key = getOpenAIKey()
  return key !== ""
}
