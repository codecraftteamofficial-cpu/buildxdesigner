export const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") return "";

  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocal) {
    return "https://build-x-designer-api.vercel.app";
  }

  // Handle all environment hostnames (including Vercel previews)
  if (
    hostname.endsWith(".vercel.app") ||
    hostname === "buildxdesigner.site" ||
    hostname.endsWith(".buildxdesigner.site")
  ) {
    return "https://build-x-designer-api.vercel.app";
  }

  // Fallback to production API for any external hosted domain
  return "https://build-x-designer-api.vercel.app";
};
