import { useState, useEffect } from "react";
import { PublishedSite } from "./PublishedSite";

interface SubdomainRouterProps {
    children: React.ReactNode;
}

export function SubdomainRouter({ children }: SubdomainRouterProps) {
    const [subdomain, setSubdomain] = useState<string | null>(null);

    useEffect(() => {
        const hostname = window.location.hostname;
        const parts = hostname.split(".");
        let sub = "";

        // Handle localhost with query param override for testing
        if (
            process.env.NODE_ENV === "development" &&
            hostname.includes("localhost")
        ) {
            const params = new URLSearchParams(window.location.search);
            const override = params.get("subdomain");
            if (override) {
                sub = override;
            }
        } else if (parts.length > 2) {
            // e.g. "mysite.buildxdesigner.site" -> parts=["mysite", "buildxdesigner", "site"]
            sub = parts[0];
        }

        if (sub && sub !== "www" && sub !== "app") {
            setSubdomain(sub);
        }
    }, []);

    if (subdomain) {
        return <PublishedSite />;
    }

    return <>{children}</>;
}
