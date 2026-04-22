/**
 * AI Mentor Configuration
 * URL for the AI Mentor backend service
 */

export const getAiMentorUrl = (): string => {
  if (typeof window === "undefined") return "";

  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  // Local development - use localhost
  if (isLocal) {
    return "https://aimentor.patricklmbn.online";
  }

  // Production - use the configured AI Mentor domain
  return "https://aimentor.patricklmbn.online";
};

export const AI_MENTOR_URL = getAiMentorUrl();
export const AI_MENTOR_ENDPOINT = `${AI_MENTOR_URL}/ask`;
