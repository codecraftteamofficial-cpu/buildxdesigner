export const getBackendUrl = (): string => {
  if (typeof window === "undefined") return "";

  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocal) {
    return "http://localhost:4000";
  }

  if (
    hostname === "buildxdesigner.site" ||
    hostname.endsWith(".buildxdesigner.site") ||
    hostname === "buildxdesigner-fork.vercel.app"
  ) {
    return "https://buildxdesigner.duckdns.org";
  }

  return "https://buildxdesigner.duckdns.org";
};

export const BACKEND_URL = getBackendUrl();
