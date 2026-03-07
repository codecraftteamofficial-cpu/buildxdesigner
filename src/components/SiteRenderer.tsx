import React, { useEffect, useState } from "react";
import type { ComponentData } from "../App";
import { RenderableComponent } from "./RenderableComponent";

interface SiteRendererProps {
    components: ComponentData[];
    projectId?: string;
    userProjectConfig?: { supabaseUrl: string; supabaseKey: string };
    backgroundColor?: string;
    showGrid?: boolean;
    activePageId?: string;
    navigate?: (path: string) => void;
    siteTitle?: string;
    siteLogoUrl?: string;
}

const DESIGN_WIDTH = 1920;
const TABLET_BP = 1024;
const MOBILE_BP = 768;
const FULL_WIDTH_TYPES = new Set(["navbar", "hero", "footer", "section-heading"]);

const STYLE_VERSION = "sr-styles-v5";

export function SiteRenderer({
    components,
    projectId,
    userProjectConfig,
    backgroundColor = "#ffffff",
    activePageId = "home",
    navigate,
    siteTitle,
    siteLogoUrl,
}: SiteRendererProps) {
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
    const [canvasScale, setCanvasScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            const vw = window.innerWidth;
            setViewportWidth(vw);
            const scale = vw > TABLET_BP ? vw / DESIGN_WIDTH : 1;
            setCanvasScale(scale);
        };
        updateScale();
        window.addEventListener("resize", updateScale);
        return () => window.removeEventListener("resize", updateScale);
    }, []);

    useEffect(() => {
        if (siteTitle) document.title = siteTitle;
        if (siteLogoUrl) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
            if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.head.appendChild(link);
            }
            link.href = siteLogoUrl;
        }
    }, [siteTitle, siteLogoUrl]);

    useEffect(() => {
        // Always remove old versions and re-inject
        document.querySelectorAll("[id^='sr-styles-']").forEach(el => el.remove());

        const style = document.createElement("style");
        style.id = STYLE_VERSION;
        style.textContent = `
            *, *::before, *::after { box-sizing: border-box; }

            .sr-canvas-outer {
                width: 100%;
                overflow-x: hidden;
            }

            /* Desktop: fixed 1920px canvas, scaled down via CSS transform */
            .sr-canvas {
                position: relative;
                width: ${DESIGN_WIDTH}px;
                transform-origin: top left;
            }

            /* Navbar wrapper forces full width regardless of component style.width */
            .sr-navbar-wrapper,
            .sr-navbar-wrapper > *,
            .sr-navbar-wrapper nav {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
            }

            .sr-navbar {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                flex-wrap: wrap !important;
                gap: 1rem !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .sr-navbar .nav-brand { font-weight: 700; white-space: nowrap; }
            .sr-navbar .nav-links {
                display: flex;
                list-style: none;
                margin: 0; padding: 0;
                gap: clamp(0.5rem, 2vw, 2rem);
                flex-wrap: wrap;
            }
            .sr-navbar .nav-links a {
                text-decoration: none; color: inherit;
                padding: 0.25rem 0.5rem; border-radius: 4px;
            }
            .sr-navbar .nav-toggle {
                display: none;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 5px;
                width: 36px; height: 36px;
                padding: 6px;
                background: none; border: none;
                cursor: pointer; border-radius: 6px;
                color: inherit; flex-shrink: 0;
            }
            .sr-navbar .burger-bar {
                display: block;
                width: 22px; height: 2px;
                background: currentColor;
                border-radius: 2px;
                transition: transform 0.25s ease, opacity 0.2s ease;
                transform-origin: center;
            }
            .sr-navbar .nav-toggle[aria-expanded="true"] .burger-bar:nth-child(1) { transform: translateY(7px) rotate(45deg); }
            .sr-navbar .nav-toggle[aria-expanded="true"] .burger-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
            .sr-navbar .nav-toggle[aria-expanded="true"] .burger-bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

            @media (max-width: ${TABLET_BP}px) {
                .sr-canvas {
                    width: 100% !important;
                    transform: none !important;
                    position: static !important;
                    display: block !important;
                    min-height: 100svh;
                }
                .sr-full-width {
                    position: relative !important;
                    left: 0 !important; top: 0 !important;
                    width: 100% !important;
                }
                /* On mobile, absolutely-positioned leaf components are hidden —
                   they live visually inside the hero which handles its own layout */
                .sr-leaf-abs {
                    display: none !important;
                }
                .sr-navbar .nav-toggle { display: flex !important; }
                .sr-navbar .nav-links {
                    display: none;
                    flex-direction: column;
                    width: 100%; gap: 0;
                    padding: 0.25rem 0 0.5rem;
                    border-top: 1px solid rgba(0,0,0,0.08);
                    margin-top: 0.25rem;
                    order: 3;
                }
                .sr-navbar .nav-links.open { display: flex !important; animation: navSlideDown 0.2s ease; }
                .sr-navbar .nav-links li { width: 100%; }
                .sr-navbar .nav-links a { display: block; padding: 0.6rem 0.75rem; border-radius: 6px; }
            }

            @media (max-width: ${MOBILE_BP}px) {
                .sr-canvas {
                    width: 100% !important;
                    transform: none !important;
                    position: static !important;
                    display: block !important;
                }
                .sr-full-width {
                    position: relative !important;
                    left: 0 !important; top: 0 !important;
                    width: 100% !important;
                }
                .sr-navbar .nav-toggle { display: flex !important; }
            }

            @keyframes navSlideDown {
                from { opacity: 0; transform: translateY(-6px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, []);

    const filteredComponents = components.filter((c) => {
        if (c.page_id === "all") return true;
        return (c.page_id || "home") === (activePageId || "home");
    });

    const isResponsive = viewportWidth <= TABLET_BP;

    const canvasHeight = filteredComponents.reduce((maxY, comp) => {
        const y = comp.position?.y ?? 0;
        const h = parseFloat(String(comp.style?.height || "100")) || 100;
        return Math.max(maxY, y + h);
    }, 0);

    const containerHeight = Math.max(canvasHeight + 80, window.innerHeight / (isResponsive ? 1 : canvasScale));
    const outerHeight = isResponsive ? undefined : Math.round(containerHeight * canvasScale);

    return (
        <div
            className="sr-canvas-outer"
            style={{
                backgroundColor,
                minHeight: "100vh",
                height: outerHeight ? `${outerHeight}px` : undefined,
            }}
        >
            <div
                className="sr-canvas"
                style={
                    !isResponsive
                        ? { transform: `scale(${canvasScale})`, height: `${containerHeight}px` }
                        : { backgroundColor }
                }
            >
                {filteredComponents.map((component) => {
                    const position = component.position || { x: 0, y: 0 };
                    // Also treat any component with width >= 1800px as full-width
                    // (catches container, section, etc. that span the full canvas)
                    const compWidth = parseFloat(String(component.style?.width || "0")) || 0;
                    const isFullWidth = FULL_WIDTH_TYPES.has(component.type) || compWidth >= 1800;
                    const isNavbar = component.type === "navbar";

                    // ── Navbar: custom renderer, always 100% wide ──────────
                    if (isNavbar) {
                        return (
                            <div
                                key={component.id}
                                className="sr-navbar-wrapper"
                                style={{
                                    position: "absolute",
                                    top: `${position.y}px`,
                                    left: 0,
                                    width: "100%",
                                    zIndex: 100,
                                }}
                            >
                                <NavbarRenderer component={component} navigate={navigate} />
                            </div>
                        );
                    }

                    // ── Full-width blocks: hero / footer / section-heading / wide containers ──
                    if (isFullWidth) {
                        const rawH = parseFloat(String(component.style?.height || "0")) || undefined;
                        const hasChildren = component.children && component.children.length > 0;
                        const isContainerType = ["container", "section", "group"].includes(component.type);

                        // For wide containers with children: render shell directly
                        // to avoid ResizeHandle mangling width/height
                        if (isContainerType && hasChildren) {
                            const skipKeys = new Set(["width","height","position","left","top","right","bottom"]);
                            const passthroughStyle = Object.fromEntries(
                                Object.entries(component.style || {}).filter(([k]) => !skipKeys.has(k))
                            );
                            const shellStyle: React.CSSProperties = {
                                width: "100%",
                                height: rawH ? `${rawH}px` : undefined,
                                position: isResponsive ? "relative" : "absolute",
                                top: isResponsive ? undefined : `${position.y}px`,
                                left: 0,
                                zIndex: 0,
                                boxSizing: "border-box",
                                ...passthroughStyle,
                            };
                            return (
                                <div key={component.id} style={shellStyle}>
                                    {component.children!.map((child) => (
                                        <div
                                            key={child.id}
                                            style={{
                                                position: "absolute",
                                                left: `${child.position?.x ?? 0}px`,
                                                top: `${child.position?.y ?? 0}px`,
                                                width: child.style?.width,
                                                height: child.style?.height,
                                                zIndex: 2,
                                            }}
                                        >
                                            <RenderableComponent
                                                component={child}
                                                projectId={projectId}
                                                isSelected={false}
                                                onUpdate={() => {}}
                                                onDelete={() => {}}
                                                disabled={false}
                                                isPreview={true}
                                                userProjectConfig={userProjectConfig}
                                                onEditComponent={() => {}}
                                                navigate={navigate}
                                            />
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        // For hero/footer/section-heading and childless containers
                        const patched: ComponentData = {
                            ...component,
                            style: { ...component.style, width: "100%" },
                        };

                        if (isResponsive) {
                            return (
                                <div key={component.id} className="sr-full-width" style={{ width: "100%" }}>
                                    <RenderableComponent
                                        component={patched}
                                        projectId={projectId}
                                        isSelected={false}
                                        onUpdate={() => {}}
                                        onDelete={() => {}}
                                        disabled={false}
                                        isPreview={true}
                                        userProjectConfig={userProjectConfig}
                                        onEditComponent={() => {}}
                                        navigate={navigate}
                                    />
                                </div>
                            );
                        }

                        return (
                            <div
                                key={component.id}
                                style={{
                                    position: "absolute",
                                    top: `${position.y}px`,
                                    left: 0,
                                    width: "100%",
                                    zIndex: 0,
                                }}
                            >
                                <RenderableComponent
                                    component={patched}
                                    projectId={projectId}
                                    isSelected={false}
                                    onUpdate={() => {}}
                                    onDelete={() => {}}
                                    disabled={false}
                                    isPreview={true}
                                    userProjectConfig={userProjectConfig}
                                    onEditComponent={() => {}}
                                    navigate={navigate}
                                />
                            </div>
                        );
                    }

                    // ── All other components: absolute positioned ───────────
                    const ratio = viewportWidth / DESIGN_WIDTH;
                    const scaledLeft = isResponsive
                        ? (position.x / DESIGN_WIDTH) * viewportWidth
                        : position.x;
                    const scaledTop = isResponsive ? Math.round(position.y * ratio) : position.y;

                    return (
                        <div
                            key={component.id}
                            id={component.id}
                            data-component-id={component.id}
                            // sr-leaf-abs is hidden on mobile via CSS (they are overlaid on hero)
                            className="sr-leaf-abs"
                            style={{
                                position: "absolute",
                                left: `${scaledLeft}px`,
                                top: `${scaledTop}px`,
                                width: "fit-content",
                                height: "fit-content",
                                zIndex: 2, // above full-width blocks
                            }}
                        >
                            <RenderableComponent
                                component={component}
                                projectId={projectId}
                                isSelected={false}
                                onUpdate={() => {}}
                                onDelete={() => {}}
                                disabled={false}
                                isPreview={true}
                                userProjectConfig={userProjectConfig}
                                onEditComponent={() => {}}
                                navigate={navigate}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── NavbarRenderer ────────────────────────────────────────────────────────────
function NavbarRenderer({
    component,
    navigate,
}: {
    component: ComponentData;
    navigate?: (path: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const props = component.props ?? {};
    const style = component.style ?? {};
    const brand = props.brand || "";
    const links: string[] =
        Array.isArray(props.links) && props.links.length > 0
            ? props.links
            : ["Home", "About", "Contact"];

    const toHref = (label: string) => {
        const slug = label.toLowerCase().replace(/\s+/g, "-");
        return slug === "home" ? "/" : `/${slug}`;
    };

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (navigate) { e.preventDefault(); navigate(href); setOpen(false); }
    };

    return (
        <nav
            className="sr-navbar"
            style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: style.backgroundColor as string,
                color: style.color as string,
                padding: (style.padding as string) ?? "0.75rem 1.5rem",
                height: style.height as string,
                fontSize: style.fontSize as string,
                fontWeight: style.fontWeight as string,
                fontFamily: style.fontFamily as string,
            }}
        >
            <div className="nav-brand">{brand}</div>
            <button
                className="nav-toggle"
                aria-label="Toggle navigation"
                aria-expanded={open ? "true" : "false"}
                onClick={() => setOpen(o => !o)}
            >
                <span className="burger-bar" />
                <span className="burger-bar" />
                <span className="burger-bar" />
            </button>
            <ul className={`nav-links${open ? " open" : ""}`}>
                {links.map((link: string) => {
                    const href = toHref(link);
                    return (
                        <li key={link}>
                            <a href={href} onClick={e => handleLinkClick(e, href)}>{link}</a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}