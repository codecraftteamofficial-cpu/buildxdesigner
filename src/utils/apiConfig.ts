export const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") return "";

  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocal) {
    return "https://build-x-designer-api.vercel.app";
  }

  // Explicitly handle production backend URL (including subdomains)
  if (
    hostname === "buildxdesigner.site" ||
    hostname.endsWith(".buildxdesigner.site")
  ) {
    return "https://build-x-designer-api.vercel.app";
  }

  return "";
};
