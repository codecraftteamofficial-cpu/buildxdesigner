import React, { useEffect, useState } from "react";
import type { ComponentData } from "../App";
import { RenderableComponent } from "./RenderableComponent";
import { scrollToTarget } from "../utils/scrollUtils";
import { labelToPath } from "../utils/urlUtils";
import { Toaster } from "./ui/sonner";

interface SiteRendererProps {
    components: ComponentData[];
    projectId?: string;
    userProjectConfig?: { supabaseUrl: string; supabaseKey: string; resendApiKey?: string };
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

    useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
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
        const styleId = "site-renderer-responsive-css";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                *, *::before, *::after { box-sizing: border-box; }
                .sr-canvas { position: relative; width: 100%; overflow-x: hidden; }
                .sr-navbar {
                    display: flex !important;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 1rem;
                    width: 100%;
                    box-sizing: border-box;
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
                .sr-navbar .nav-toggle[aria-expanded="true"] .burger-bar:nth-child(1) {
                    transform: translateY(7px) rotate(45deg);
                }
                .sr-navbar .nav-toggle[aria-expanded="true"] .burger-bar:nth-child(2) {
                    opacity: 0; transform: scaleX(0);
                }
                .sr-navbar .nav-toggle[aria-expanded="true"] .burger-bar:nth-child(3) {
                    transform: translateY(-7px) rotate(-45deg);
                }
                @media (max-width: ${TABLET_BP}px) {
                    .sr-canvas { position: static !important; display: block !important; }
                    .sr-full-width {
                        position: relative !important;
                        left: 0 !important; top: 0 !important;
                        width: 100% !important;
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
                    .sr-navbar .nav-links.open { display: flex !important; }
                    .sr-navbar .nav-links li { width: 100%; }
                    .sr-navbar .nav-links a {
                        display: block;
                        padding: 0.6rem 0.75rem;
                        border-radius: 6px;
                    }
                }
                @media (max-width: ${MOBILE_BP}px) {
                    .sr-canvas { position: static !important; display: block !important; }
                    .sr-full-width {
                        position: relative !important;
                        left: 0 !important; top: 0 !important;
                        width: 100% !important;
                    }
                    .sr-navbar .nav-toggle { display: flex !important; }
                }
                @keyframes navSlideDown {
                    from { opacity: 0; transform: translateY(-6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    React.useEffect(() => {
        const handleScrollEvent = (event: Event) => {
            const customEvent = event as CustomEvent<{ elementId: string }>;
            if (customEvent.detail?.elementId) {
                console.log('Received scrollToElement event:', customEvent.detail.elementId);
                scrollToTarget(customEvent.detail.elementId, 2000, document);
            }
        };

        window.addEventListener('scrollToElement', handleScrollEvent as EventListener);

        return () => {
            window.removeEventListener('scrollToElement', handleScrollEvent as EventListener);
        };
    }, []);

    const filteredComponents = components.filter((c) => {
        if (c.page_ids && c.page_ids.length > 0) {
            if (c.page_ids.includes("all")) return true;
            return c.page_ids.includes(activePageId || "home");
        }
        
        if (c.page_id === "all") return true;
        return (c.page_id || "home") === (activePageId || "home");
    });

    const isResponsive = viewportWidth <= TABLET_BP;
    const ratio = viewportWidth / DESIGN_WIDTH;

    const canvasHeight = filteredComponents.reduce((maxY, comp) => {
        const y = comp.position?.y ?? 0;
        const h = parseFloat(String(comp.style?.height || "100")) || 100;
        return Math.max(maxY, y + h);
    }, 0);
    const containerHeight = Math.max(canvasHeight + 80, window.innerHeight);

    return (
        <div
            className="sr-canvas"
            style={
                !isResponsive
                    ? { backgroundColor, minHeight: `${containerHeight}px`, height: `${containerHeight}px` }
                    : { backgroundColor }
            }
        >
            <Toaster position="top-right" richColors />
            {filteredComponents.map((component) => {
                const position = component.position || { x: 0, y: 0 };
                const isFullWidth = FULL_WIDTH_TYPES.has(component.type);
                const isNavbar = component.type === "navbar";

                if (isResponsive && isFullWidth) {
                    return (
                        <div
                            key={component.id}
                            className={`sr-full-width${isNavbar ? " sr-navbar" : ""}`}
                            style={{ width: "100%" }}
                        >
                            {isNavbar ? (
                                <NavbarRenderer component={component} navigate={navigate} />
                            ) : (
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
                            )}
                        </div>
                    );
                }

                const scaledLeft = isResponsive ? (position.x / DESIGN_WIDTH) * viewportWidth : position.x;
                const scaledTop = isResponsive ? Math.round(position.y * ratio) : position.y;

                return (
                    <div
                        key={component.id}
                        id={component.id}
                        data-component-id={component.id}
                        style={{
                            position: "absolute",
                            left: `${scaledLeft}px`,
                            top: `${scaledTop}px`,
                            width: "fit-content",
                            height: "fit-content",
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
    );
}

function NavbarRenderer({
    component,
    navigate,
}: {
    component: ComponentData;
    navigate?: (path: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const props = component.props ?? {};
    const brand = props.brand || "";
    const links: string[] =
        Array.isArray(props.links) && props.links.length > 0
            ? props.links
            : ["Home", "About", "Contact"];


    const style = component.style ?? {};
    
    // Handle gradient borders
    

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (navigate) {
            e.preventDefault();
            navigate(href);
            setOpen(false);
        }
    };

    const renderLinks = () => {
        const urlArray: string[] = Array.isArray(props.linkUrls) ? props.linkUrls : [];
        const typeArray: string[] = Array.isArray(props.linkTypes) ? props.linkTypes : [];

        return links.map((link: string, index: number) => {
            const rawUrl = urlArray[index] || "";
            const url = (rawUrl !== "#" && rawUrl !== "") ? rawUrl : labelToPath(link);
            const type = typeArray[index] || "url";

            const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                if (type === "scroll" && url.startsWith("#")) {
                    e.preventDefault();
                    scrollToTarget(url);
                    setOpen(false);
                } else if (navigate) {
                    e.preventDefault();
                    navigate(url);
                    setOpen(false);
                }
            };

            return React.createElement(
                "li",
                { key: index },
                React.createElement(
                    "a",
                    { 
                        href: url, 
                        onClick: handleClick,
                        style: { fontSize: props.linkFontSize ? `${props.linkFontSize}px` : undefined }
                    },
                    link
                )
            );
        });
    };

    return (
        <nav
            className="sr-navbar"
            style={{
                // Background handling: prioritize backgroundColor if background is falsy or 'none'
                ...(style.background && style.background !== 'none' 
                    ? { background: style.background as string } 
                    : (style.backgroundColor ? { backgroundColor: style.backgroundColor as string } : {})),
                color: style.color as string,
                padding: style.padding as string || "0.75rem 1.5rem",
                fontSize: style.fontSize as string,
                fontFamily: style.fontFamily as string,
                borderWidth: style.borderWidth as string,
                borderStyle: style.borderStyle as string,
                borderColor: style.borderColor as string,
                borderTopWidth: style.borderTopWidth as string,
                borderTopStyle: style.borderTopStyle as any,
                borderTopColor: style.borderTopColor as string,
                borderRightWidth: style.borderRightWidth as string,
                borderRightStyle: style.borderRightStyle as any,
                borderRightColor: style.borderRightColor as string,
                borderBottomWidth: style.borderBottomWidth as string,
                borderBottomStyle: style.borderBottomStyle as any,
                borderBottomColor: style.borderBottomColor as string,
                borderLeftWidth: style.borderLeftWidth as string,
                borderLeftStyle: style.borderLeftStyle as any,
                borderLeftColor: style.borderLeftColor as string,
                borderRadius: style.borderRadius as string,
                boxShadow: style.boxShadow as string,
                position: style.position as any,
                top: style.top as string,
                left: style.left as string,
                right: style.right as string,
                bottom: style.bottom as string,
                zIndex: style.zIndex as any,
            }}
        >
            <div className="flex items-center gap-3">
                {props.logoUrl && (
                    <img 
                        src={props.logoUrl} 
                        alt="Logo" 
                        style={{ 
                            height: '2rem', 
                            width: props.logoShape === 'circle' || props.logoShape === 'square' ? '2rem' : 'auto',
                            aspectRatio: props.logoShape === 'circle' || props.logoShape === 'square' ? '1/1' : 'auto',
                            objectFit: props.logoShape === 'original' ? 'contain' : 'cover',
                            borderRadius: props.logoShape === 'circle' ? '50%' : props.logoShape === 'rounded' ? '8px' : '0',
                        }} 
                    />
                )}
                <div className="nav-brand">{brand}</div>
            </div>
            <button
                className="nav-toggle"
                aria-label="Toggle navigation"
                aria-expanded={open ? "true" : "false"}
                onClick={() => setOpen(!open)}
            >
                <span className="burger-bar" />
                <span className="burger-bar" />
                <span className="burger-bar" />
            </button>
            <ul className={`nav-links${open ? " open" : ""}`}>
                {renderLinks()}
            </ul>
        </nav>
    );
}