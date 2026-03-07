// lib/code-generator.ts
import { ComponentData } from "../App"

// ─── Constants ────────────────────────────────────────────────────────────────
const DESIGN_WIDTH = 1920;

const BREAKPOINTS = {
  tablet: 1024,
  mobile: 768,
  small:  480,
} as const;

const SCALE = {
  tablet: BREAKPOINTS.tablet / DESIGN_WIDTH,  // ~0.533
  mobile: BREAKPOINTS.mobile / DESIGN_WIDTH,  // ~0.400
  small:  BREAKPOINTS.small  / DESIGN_WIDTH,  // ~0.250
} as const;

// ─── Utilities ────────────────────────────────────────────────────────────────
export const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "page";

const camelToKebab = (value: string): string =>
  value.replace(/([A-Z])/g, "-$1").toLowerCase();

const isUnitless = (key: string) =>
  ["opacity", "zIndex", "fontWeight", "lineHeight", "flex", "order"].includes(key);

const parsePixelValue = (value: any): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  return null;
};

const sanitizeId = (id: string): string =>
  id.replace(/[^a-zA-Z0-9_-]/g, "-");

const compIdClass = (component: ComponentData): string =>
  `comp-${sanitizeId(component.id)}`;

const compClass = (component: ComponentData): string => {
  const idClass = compIdClass(component);
  const userClass = component.props?.className;
  const isAutoClass = !userClass || /^comp-/.test(userClass.trim().split(/\s+/)[0]);
  return isAutoClass ? idClass : `${idClass} ${userClass}`;
};

const scalePx = (value: number, ratio: number): string =>
  `${Math.round(value * ratio)}px`;

// Full-width components that break out of absolute flow on small screens
const FULL_WIDTH_TYPES = new Set(["navbar", "hero", "footer", "section-heading"]);

// ─── Responsive CSS builder ───────────────────────────────────────────────────
const buildResponsiveCss = (
  component: ComponentData,
  position: { x: number; y: number } | undefined,
): string => {
  const style = component.style ?? {};
  const cls = `.${compIdClass(component)}`;
  const isFullWidth = FULL_WIDTH_TYPES.has(component.type);

  // ── Desktop (1920px baseline) ─────────────────────────────────────────────
  const desktopLines: string[] = [`  position: absolute;`];

  if (position) {
    desktopLines.push(`  left: ${((position.x / DESIGN_WIDTH) * 100).toFixed(4)}%;`);
    desktopLines.push(`  top: ${Math.round(position.y)}px;`);
  }

  const rawW = parsePixelValue(style.width);
  const rawH = parsePixelValue(style.height);
  if (rawW !== null) desktopLines.push(`  width: ${((rawW / DESIGN_WIDTH) * 100).toFixed(4)}%;`);
  if (rawH !== null) desktopLines.push(`  height: ${rawH}px;`);

  for (const [key, value] of Object.entries(style)) {
    if (["left", "top", "right", "bottom", "width", "height"].includes(key)) continue;
    if (key === "position" && value === "absolute") continue;
    if (value === undefined || value === null || value === "") continue;
    const unit = typeof value === "number" && !isUnitless(key) ? "px" : "";
    const cssKey = key.startsWith("--") ? key : camelToKebab(key);
    desktopLines.push(`  ${cssKey}: ${value}${unit};`);
  }

  let css = `${cls} {\n${desktopLines.join("\n")}\n}`;

  // ── Navbar-specific burger styles ─────────────────────────────────────────
  if (component.type === "navbar") {
    css += `
/* Navbar: burger button hidden on desktop */
${cls} .nav-toggle { display: none; }
${cls} .nav-links { display: flex; list-style: none; margin: 0; padding: 0; gap: clamp(0.5rem, 2vw, 2rem); flex-wrap: wrap; }
${cls} .nav-links a { text-decoration: none; color: inherit; padding: 0.25rem 0.5rem; border-radius: 4px; transition: background 0.15s; }`;
  }

  // ── Card hover ────────────────────────────────────────────────────────────
  if (component.type === "card") {
    css += `\n${cls}:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); transition: transform 0.2s ease, box-shadow 0.2s ease; }`;
  }

  // ── Responsive breakpoints ────────────────────────────────────────────────
  for (const [bpName, bpMax] of Object.entries(BREAKPOINTS) as [keyof typeof BREAKPOINTS, number][]) {
    const ratio = SCALE[bpName];
    const bpLines: string[] = [];

    if (isFullWidth) {
      bpLines.push(`  position: relative !important;`);
      bpLines.push(`  left: 0 !important;`);
      bpLines.push(`  top: 0 !important;`);
      bpLines.push(`  width: 100% !important;`);
      bpLines.push(`  max-width: 100% !important;`);
      if (rawH !== null) {
        // On small screens, let height be auto for full-width sections
        if (bpName === "small") {
          bpLines.push(`  height: auto !important;`);
          bpLines.push(`  min-height: ${Math.round(rawH * ratio)}px;`);
        } else {
          bpLines.push(`  height: ${Math.round(rawH * ratio)}px;`);
        }
      }
    } else {
      if (position) {
        bpLines.push(`  left: ${((position.x / DESIGN_WIDTH) * 100).toFixed(4)}%;`);
        bpLines.push(`  top: ${Math.round(position.y * ratio)}px;`);
      }
      if (rawH !== null) bpLines.push(`  height: ${Math.round(rawH * ratio)}px;`);
      if (rawW !== null) {
        const scaledW = Math.round(rawW * ratio);
        bpLines.push(`  width: ${((rawW / DESIGN_WIDTH) * 100).toFixed(4)}%;`);
        bpLines.push(`  min-width: ${Math.max(32, scaledW)}px;`);
      }
    }

    // Scale typography
    const rawFs = parsePixelValue(style.fontSize);
    if (rawFs !== null) {
      const scaledFs = Math.max(10, Math.round(rawFs * ratio));
      bpLines.push(`  font-size: ${scaledFs}px;`);
    }

    // Scale line-height if it's a pixel value
    const rawLh = parsePixelValue(style.lineHeight);
    if (rawLh !== null && rawLh > 4) { // >4 means it's px, not a unitless ratio
      bpLines.push(`  line-height: ${scalePx(rawLh, ratio)};`);
    }

    // Scale padding
    for (const pad of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const) {
      const v = parsePixelValue(style[pad]);
      if (v !== null) bpLines.push(`  ${camelToKebab(pad)}: ${scalePx(v, ratio)};`);
    }
    // Handle shorthand padding
    const rawP = parsePixelValue(style.padding);
    if (rawP !== null) bpLines.push(`  padding: ${scalePx(rawP, ratio)};`);

    // Scale margin
    for (const mar of ["marginTop", "marginRight", "marginBottom", "marginLeft"] as const) {
      const v = parsePixelValue(style[mar]);
      if (v !== null) bpLines.push(`  ${camelToKebab(mar)}: ${scalePx(v, ratio)};`);
    }

    // Scale border-radius
    const rawBr = parsePixelValue(style.borderRadius);
    if (rawBr !== null) bpLines.push(`  border-radius: ${scalePx(rawBr, ratio)};`);

    // Scale gap (for grids/flex containers)
    const rawGap = parsePixelValue(style.gap);
    if (rawGap !== null) bpLines.push(`  gap: ${scalePx(rawGap, ratio)};`);

    // Scale border-width
    const rawBw = parsePixelValue(style.borderWidth);
    if (rawBw !== null) bpLines.push(`  border-width: ${scalePx(rawBw, ratio)};`);

    // Navbar burger at this breakpoint
    if (component.type === "navbar" && (bpName === "tablet" || bpName === "mobile" || bpName === "small")) {
      bpLines.push(`  flex-wrap: wrap;`);
      bpLines.push(`  align-items: center;`);
    }

    if (bpLines.length > 0) {
      css += `\n\n@media (max-width: ${bpMax}px) {\n  ${cls} {\n${bpLines.map(l => "  " + l).join("\n")}\n  }\n}`;
    }

    // Navbar burger toggle rules (separate selectors)
    if (component.type === "navbar" && (bpName === "tablet" || bpName === "mobile" || bpName === "small")) {
      css += `\n@media (max-width: ${bpMax}px) {
  ${cls} .nav-toggle {
    display: flex !important;
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
  ${cls} .nav-links {
    display: none;
    flex-direction: column;
    width: 100%; gap: 0;
    padding: 0.25rem 0 0.5rem;
    border-top: 1px solid rgba(0,0,0,0.08);
    margin-top: 0.25rem;
    order: 3;
  }
  ${cls} .nav-links.open {
    display: flex !important;
    animation: navSlideDown 0.2s ease;
  }
  ${cls} .nav-links li { width: 100%; }
  ${cls} .nav-links a {
    display: block;
    padding: 0.6rem 0.75rem;
    border-radius: 6px;
  }
}`;
    }

    // Image responsive override
    if (component.type === "image" && bpName === "small") {
      css += `\n@media (max-width: ${bpMax}px) {
  ${cls} img { width: 100% !important; height: auto !important; object-fit: cover; }
}`;
    }

    // Grid responsive: collapse to 1 column on mobile
    if (component.type === "grid" && bpName === "mobile") {
      css += `\n@media (max-width: ${bpMax}px) {
  ${cls} { grid-template-columns: 1fr !important; }
}`;
    }

    // Card: full width on small screens
    if (component.type === "card" && bpName === "small") {
      css += `\n@media (max-width: ${bpMax}px) {
  ${cls} { width: 100% !important; min-width: unset !important; }
}`;
    }
  }

  return css;
};

// ─── PHP renderer ─────────────────────────────────────────────────────────────
const esc = (s: any): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderComponentToPHP = (component: ComponentData, depth = 0): string => {
  const indent = "  ".repeat(depth);
  const props = component.props ?? {};
  const cls = compClass(component);
  const idAttr = props.elementId ? ` id="${esc(props.elementId)}"` : "";
  const btnId = component.type === "button" ? ` id="btn-${sanitizeId(component.id)}"` : "";
  const childOutput = (component.children ?? [])
    .map((child) => renderComponentToPHP(child, depth + 1))
    .join("\n");

  switch (component.type) {

    case "heading": {
      const tag = `h${props.level || 1}`;
      return `${indent}<${tag}${idAttr} class="${cls}">${esc(props.content) || "Heading"}</${tag}>`;
    }

    case "text":
      return `${indent}<p${idAttr} class="${cls}">${esc(props.content) || "Text"}</p>`;

    case "paragraph":
      return `${indent}<p${idAttr} class="${cls}">${esc(props.content) || ""}</p>`;

    case "button":
      return `${indent}<button${btnId}${idAttr} class="${cls}">${esc(props.text || props.content) || "Button"}</button>`;

    case "image":
      return `${indent}<img${idAttr} src="${esc(props.src)}" alt="${esc(props.alt) || "image"}" class="${cls}" loading="lazy" />`;

    case "navbar": {
      const brand = esc(props.brand || "");
      const links: string[] = Array.isArray(props.links) && props.links.length > 0
        ? props.links
        : ["Home", "About", "Contact"];
      const toHref = (label: string) => {
        const slug = label.toLowerCase().replace(/\s+/g, "-");
        return slug === "home" ? "/" : `/${slug}`;
      };
      const linkItems = links
        .map((l: string) => `${indent}      <li><a href="${toHref(l)}">${esc(l)}</a></li>`)
        .join("\n");

      return [
        `${indent}<nav${idAttr} class="${cls} full-width-block" role="navigation" aria-label="Main navigation">`,
        `${indent}  <div class="nav-brand">${brand}</div>`,
        `${indent}  <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="nav-links-${sanitizeId(component.id)}">`,
        `${indent}    <span class="burger-bar"></span>`,
        `${indent}    <span class="burger-bar"></span>`,
        `${indent}    <span class="burger-bar"></span>`,
        `${indent}  </button>`,
        `${indent}  <ul class="nav-links" id="nav-links-${sanitizeId(component.id)}" role="list">`,
        linkItems,
        `${indent}  </ul>`,
        `${indent}</nav>`,
      ].join("\n");
    }

    case "hero": {
      const title = esc(props.title || "Welcome");
      const subtitle = esc(props.subtitle || "");
      const btnText = esc(props.buttonText || "Get Started");
      const btnHref = esc(props.buttonHref || "#");
      return [
        `${indent}<section${idAttr} class="${cls} full-width-block" aria-label="Hero">`,
        `${indent}  <div class="hero-content">`,
        `${indent}    <h1>${title}</h1>`,
        subtitle ? `${indent}    <p class="hero-subtitle">${subtitle}</p>` : "",
        `${indent}    <a href="${btnHref}" class="hero-btn">${btnText}</a>`,
        `${indent}  </div>`,
        `${indent}</section>`,
      ].filter(Boolean).join("\n");
    }

    case "footer": {
      const copyright = esc(props.copyright || "");
      const links: string[] = Array.isArray(props.links) ? props.links : [];
      const linkHtml = links.length > 0
        ? `\n${indent}  <nav class="footer-links" aria-label="Footer navigation">\n` +
          links.map((l: string) => `${indent}    <a href="#">${esc(l)}</a>`).join("\n") +
          `\n${indent}  </nav>`
        : "";
      return [
        `${indent}<footer${idAttr} class="${cls} full-width-block" role="contentinfo">`,
        linkHtml,
        `${indent}  <p class="footer-copyright">${copyright}</p>`,
        `${indent}</footer>`,
      ].filter(Boolean).join("\n");
    }

    case "section-heading":
      return [
        `${indent}<div${idAttr} class="${cls} full-width-block">`,
        `${indent}  <h2>${esc(props.title) || "Section"}</h2>`,
        props.subtitle ? `${indent}  <p class="section-subtitle">${esc(props.subtitle)}</p>` : "",
        `${indent}</div>`,
      ].filter(Boolean).join("\n");

    case "card":
      return [
        `${indent}<article${idAttr} class="${cls}">`,
        props.image ? `${indent}  <div class="card-img-wrap"><img src="${esc(props.image)}" alt="${esc(props.title) || "card image"}" loading="lazy" /></div>` : "",
        `${indent}  <div class="card-body">`,
        `${indent}    <h3 class="card-title">${esc(props.title) || ""}</h3>`,
        props.description ? `${indent}    <p class="card-desc">${esc(props.description)}</p>` : "",
        props.buttonText ? `${indent}    <a href="${esc(props.buttonHref || "#")}" class="card-btn">${esc(props.buttonText)}</a>` : "",
        `${indent}  </div>`,
        `${indent}</article>`,
      ].filter(Boolean).join("\n");

    case "input":
      return [
        `${indent}<div class="field-wrap">`,
        props.label ? `${indent}  <label for="${sanitizeId(component.id)}">${esc(props.label)}</label>` : "",
        `${indent}  <input${idAttr || ` id="${sanitizeId(component.id)}"`} type="${esc(props.type) || "text"}" placeholder="${esc(props.placeholder)}" class="${cls}" />`,
        `${indent}</div>`,
      ].filter(Boolean).join("\n");

    case "textarea":
      return [
        `${indent}<div class="field-wrap">`,
        props.label ? `${indent}  <label for="${sanitizeId(component.id)}">${esc(props.label)}</label>` : "",
        `${indent}  <textarea${idAttr || ` id="${sanitizeId(component.id)}"`} placeholder="${esc(props.placeholder)}" class="${cls}"></textarea>`,
        `${indent}</div>`,
      ].filter(Boolean).join("\n");

    case "container":
    case "group":
      return `${indent}<div${idAttr} class="${cls}">\n${childOutput || `${indent}  <!-- ${component.type} -->`}\n${indent}</div>`;

    case "grid":
      return `${indent}<div${idAttr} class="${cls} comp-grid">\n${childOutput || `${indent}  <!-- grid -->`}\n${indent}</div>`;

    case "form":
      return [
        `${indent}<form${idAttr} class="${cls}" method="post" novalidate>`,
        props.title ? `${indent}  <h3 class="form-title">${esc(props.title)}</h3>` : "",
        childOutput || `${indent}  <!-- form fields -->`,
        props.submitText ? `${indent}  <button type="submit" class="form-submit">${esc(props.submitText) || "Submit"}</button>` : "",
        `${indent}</form>`,
      ].filter(Boolean).join("\n");

    case "video":
      return [
        `${indent}<div${idAttr} class="${cls} video-wrap">`,
        `${indent}  <video controls playsinline${props.poster ? ` poster="${esc(props.poster)}"` : ""} preload="metadata">`,
        props.src ? `${indent}    <source src="${esc(props.src)}" type="video/mp4" />` : "",
        `${indent}    Your browser does not support the video tag.`,
        `${indent}  </video>`,
        `${indent}</div>`,
      ].filter(Boolean).join("\n");

    case "gallery":
      return [
        `${indent}<div${idAttr} class="${cls} comp-gallery" role="list" aria-label="Image gallery">`,
        ...(Array.isArray(props.images) ? props.images.map((src: string, i: number) =>
          `${indent}  <figure role="listitem"><img src="${esc(src)}" alt="Gallery image ${i + 1}" loading="lazy" /></figure>`
        ) : [`${indent}  <!-- no images -->`]),
        `${indent}</div>`,
      ].join("\n");

    default:
      return `${indent}<div${idAttr} class="${cls}">\n${childOutput || ""}\n${indent}</div>`;
  }
};

// ─── JS generator ─────────────────────────────────────────────────────────────
const generatePageJS = (components: ComponentData[], pageName: string): string => {
  const hasNavbar = components.some(c => c.type === "navbar");
  const hasForms = components.some(c => c.type === "form");
  const buttons = components.filter(c => c.type === "button");

  const listeners = buttons.map(btn => {
    const id = `btn-${sanitizeId(btn.id)}`;
    const label = btn.props?.text || btn.props?.content || "Button";
    return `  // "${label}" button\n  document.getElementById("${id}")?.addEventListener("click", (e) => {\n    e.preventDefault();\n    console.log("${id} clicked!");\n  });`;
  }).join("\n\n");

  const navScript = hasNavbar ? `
  // ── Hamburger nav toggle ──────────────────────────────────────
  document.querySelectorAll(".nav-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const nav = btn.closest("nav");
      const links = nav ? nav.querySelector(".nav-links") : null;
      if (!links) return;
      const isOpen = links.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
    });
  });
  // Close nav on link click (SPA behaviour)
  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      const ul = link.closest(".nav-links");
      const btn = ul?.closest("nav")?.querySelector(".nav-toggle");
      ul?.classList.remove("open");
      btn?.setAttribute("aria-expanded", "false");
    });
  });
  // Close nav on outside click
  document.addEventListener("click", (e) => {
    document.querySelectorAll("nav").forEach(nav => {
      if (!nav.contains(e.target as Node)) {
        nav.querySelector(".nav-links")?.classList.remove("open");
        nav.querySelector(".nav-toggle")?.setAttribute("aria-expanded", "false");
      }
    });
  });` : "";

  const formScript = hasForms ? `
  // ── Basic form validation ─────────────────────────────────────
  document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll("input[required], textarea[required]");
      let valid = true;
      inputs.forEach((input: any) => {
        if (!input.value.trim()) {
          valid = false;
          input.classList.add("error");
        } else {
          input.classList.remove("error");
        }
      });
      if (valid) {
        console.log("Form submitted:", Object.fromEntries(new FormData(form)));
      }
    });
  });` : "";

  return `"use strict";
document.addEventListener("DOMContentLoaded", () => {
  console.log("[BuildX] ${pageName} loaded");
${navScript}${formScript}
${listeners || "  // No interactive button components."}

  // ── Scroll-reveal animation ───────────────────────────────────
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
  }
});`;
};

// ─── Global responsive CSS ────────────────────────────────────────────────────
const GLOBAL_RESPONSIVE_CSS = `/* ══════════════════════════════════════════════
   BuildX Generated CSS — DO NOT EDIT MANUALLY
   Design baseline : ${DESIGN_WIDTH}px
   Breakpoints     : tablet ≤${BREAKPOINTS.tablet}px | mobile ≤${BREAKPOINTS.mobile}px | small ≤${BREAKPOINTS.small}px
   ══════════════════════════════════════════════ */

/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; }
html { font-size: 16px; scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { margin: 0; padding: 0; overflow-x: hidden; line-height: 1.5; }
img, video { max-width: 100%; height: auto; display: block; }
a { color: inherit; }
button { cursor: pointer; font-family: inherit; }

/* ── Canvas ── */
.canvas-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── Navbar base ── */
.canvas-container nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  box-sizing: border-box;
}
.canvas-container nav .nav-brand { font-weight: 700; white-space: nowrap; }
.canvas-container nav .nav-links {
  display: flex;
  list-style: none;
  margin: 0; padding: 0;
  gap: clamp(0.5rem, 2vw, 2rem);
  flex-wrap: wrap;
}
.canvas-container nav .nav-links a {
  text-decoration: none; color: inherit;
  padding: 0.25rem 0.5rem; border-radius: 4px;
  transition: background 0.15s;
}
.canvas-container nav .nav-links a:hover,
.canvas-container nav .nav-links a:focus-visible {
  background: var(--nav-hover, rgba(0,0,0,0.07));
  outline: none;
}

/* ── Burger button (hidden on desktop) ── */
.canvas-container .nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 40px; height: 40px;
  padding: 8px;
  background: none; border: none;
  cursor: pointer; border-radius: 6px;
  color: inherit; flex-shrink: 0;
  transition: background 0.15s;
}
.canvas-container .nav-toggle:hover,
.canvas-container .nav-toggle:focus-visible {
  background: var(--nav-hover, rgba(0,0,0,0.07));
  outline: none;
}
.burger-bar {
  display: block;
  width: 22px; height: 2px;
  background: currentColor;
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.2s ease;
  transform-origin: center;
  pointer-events: none;
}
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* ── Hero ── */
.canvas-container .hero-content {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; gap: 1rem;
  width: 100%; height: 100%;
  padding: 2rem;
  box-sizing: border-box;
}
.hero-btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.hero-btn:hover { opacity: 0.85; transform: translateY(-2px); }

/* ── Cards ── */
.card-img-wrap { overflow: hidden; }
.card-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
.card-img-wrap img:hover { transform: scale(1.04); }
.card-body { padding: 1rem; }
.card-btn {
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.5rem 1.25rem;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s ease;
}
.card-btn:hover { opacity: 0.8; }

/* ── Gallery ── */
.comp-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.comp-gallery figure { margin: 0; overflow: hidden; border-radius: 8px; }
.comp-gallery img { width: 100%; height: 200px; object-fit: cover; transition: transform 0.3s ease; }
.comp-gallery img:hover { transform: scale(1.05); }

/* ── Grid ── */
.comp-grid {
  display: grid;
  gap: 1rem;
}

/* ── Video ── */
.video-wrap video { width: 100%; border-radius: 8px; }

/* ── Forms ── */
.field-wrap { display: flex; flex-direction: column; gap: 0.4rem; }
.field-wrap label { font-size: 0.875rem; font-weight: 500; }
.field-wrap input,
.field-wrap textarea {
  width: 100%; padding: 0.6rem 0.75rem;
  border: 1px solid rgba(0,0,0,0.2); border-radius: 6px;
  font-family: inherit; font-size: 1rem;
  transition: border-color 0.2s;
}
.field-wrap input:focus,
.field-wrap textarea:focus { border-color: #3b82f6; outline: none; }
.field-wrap input.error,
.field-wrap textarea.error { border-color: #ef4444; }
.form-submit {
  padding: 0.65rem 1.5rem;
  border: none; border-radius: 6px;
  font-weight: 600; font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.form-submit:hover { opacity: 0.85; }

/* ── Scroll reveal ── */
.reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
.reveal.is-visible { opacity: 1; transform: none; }

/* ── Footer ── */
.footer-links { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-bottom: 0.75rem; }
.footer-links a { text-decoration: none; opacity: 0.8; transition: opacity 0.2s; }
.footer-links a:hover { opacity: 1; }
.footer-copyright { margin: 0; opacity: 0.7; font-size: 0.875rem; }

/* ── Section heading ── */
.section-subtitle { opacity: 0.7; margin-top: 0.5rem; }

/* ══ TABLET (≤${BREAKPOINTS.tablet}px) ════════════════════════════════ */
@media (max-width: ${BREAKPOINTS.tablet}px) {
  .canvas-container {
    position: static !important;
    display: block !important;
    min-height: 100svh;
  }
  .canvas-container nav,
  .canvas-container .full-width-block {
    position: relative !important;
    left: 0 !important; top: 0 !important;
    width: 100% !important;
  }
  .canvas-container .nav-toggle { display: flex !important; }
  .canvas-container nav .nav-links {
    display: none;
    flex-direction: column;
    width: 100%; gap: 0;
    padding: 0.25rem 0 0.5rem;
    border-top: 1px solid rgba(0,0,0,0.08);
    margin-top: 0.25rem;
    order: 3;
  }
  .canvas-container nav .nav-links.open {
    display: flex;
    animation: navSlideDown 0.2s ease;
  }
  .canvas-container nav .nav-links li { width: 100%; }
  .canvas-container nav .nav-links a {
    display: block;
    padding: 0.7rem 0.75rem;
    border-radius: 6px;
  }
  .comp-gallery { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
}

/* ══ MOBILE (≤${BREAKPOINTS.mobile}px) ════════════════════════════════ */
@media (max-width: ${BREAKPOINTS.mobile}px) {
  .canvas-container {
    position: static !important;
    display: block !important;
  }
  .canvas-container nav,
  .canvas-container .full-width-block {
    position: relative !important;
    left: 0 !important; top: 0 !important;
    width: 100% !important;
  }
  .canvas-container .nav-toggle { display: flex !important; }
  .comp-grid { grid-template-columns: 1fr !important; }
  .comp-gallery { grid-template-columns: 1fr 1fr; }
  .footer-links { flex-direction: column; align-items: center; }
}

/* ══ SMALL (≤${BREAKPOINTS.small}px) ══════════════════════════════════ */
@media (max-width: ${BREAKPOINTS.small}px) {
  html { font-size: 14px; }
  .comp-gallery { grid-template-columns: 1fr; }
  .hero-btn { width: 100%; text-align: center; }
}

/* ── Keyframes ── */
@keyframes navSlideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; } to { opacity: 1; }
}
`;

// ─── HTML page wrapper ────────────────────────────────────────────────────────
const generateHTMLWrapper = (pageName: string, fileName: string, bodyContent: string, metaDescription = "", ogImage = ""): string =>
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${metaDescription || pageName}" />
  ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ""}
  <meta property="og:title" content="<?php echo htmlspecialchars($pageTitle ?? '${pageName}'); ?>" />
  <title><?php echo htmlspecialchars($pageTitle ?? "${pageName}"); ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="/assets/css/global.css" />
  <link rel="stylesheet" href="/assets/css/${fileName}.css" />
</head>
<body>
${bodyContent}
  <script src="/assets/js/${fileName}.js" defer></script>
</body>
</html>`;

// ─── Main export ──────────────────────────────────────────────────────────────
export const generateProjectFiles = (
  components: ComponentData[],
  pages: any[],
  projectName: string,
): Record<string, string> => {
  const files: Record<string, string> = {
    "public/index.php": `<?php
// Entry point — route to the correct view
$requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$slug = trim($requestPath, '/') ?: 'home';
$viewFile = __DIR__ . "/../app/views/{$slug}.php";
if (file_exists($viewFile)) {
    require $viewFile;
} else {
    http_response_code(404);
    require __DIR__ . "/../app/views/404.php";
}
?>`,
    "app/views/layout.php": `<?php // Shared layout for ${projectName} ?>`,
    "app/views/404.php": `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>404 Not Found</title>
<style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}h1{font-size:4rem;margin:0;}p{color:#6b7280;}</style>
</head><body><h1>404</h1><p>Page not found.</p><a href="/">← Go home</a></body></html>`,
    "public/assets/css/global.css": GLOBAL_RESPONSIVE_CSS,
    "public/assets/css/styles.css": `/* Deprecated — use global.css */\n@import "global.css";`,
    "config/database.php": `<?php\nreturn [\n    "db_host" => getenv("DB_HOST") ?: "db.supabase.co",\n    "db_name" => getenv("DB_NAME") ?: "postgres",\n    "db_user" => getenv("DB_USER") ?: "",\n    "db_pass" => getenv("DB_PASS") ?: "",\n];`,
    ".htaccess": `Options -Indexes
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.php [QSA,L]`,
    "README.md": `# ${projectName}

Generated by **BuildX Designer**.

## Responsive Breakpoints
| Breakpoint | Width        |
|------------|-------------|
| Desktop    | > ${BREAKPOINTS.tablet}px   |
| Tablet     | ≤ ${BREAKPOINTS.tablet}px   |
| Mobile     | ≤ ${BREAKPOINTS.mobile}px    |
| Small      | ≤ ${BREAKPOINTS.small}px    |

## Structure
\`\`\`
public/
  index.php          ← entry point + router
  assets/
    css/global.css   ← shared responsive styles
    css/<page>.css   ← per-page styles
    js/<page>.js     ← per-page scripts
app/views/
  <page>.php         ← page views
config/
  database.php       ← DB config (use env vars in production)
\`\`\`
`,
  };

  pages.forEach((page, index) => {
    const fileName = slugify(page.name);

    const pageComponents = components.filter(c => {
      const isExplicitMatch = c.page_id === page.id;
      const isGlobal = c.page_id === "all";
      const isDefaultHome = !c.page_id && (page.id === "home" || index === 0);
      return isExplicitMatch || isGlobal || isDefaultHome;
    });

    // ── PHP view ──────────────────────────────────────────────────────────────
    const bodyContent = [
      `<div class="canvas-container" id="page-${fileName}">`,
      pageComponents.length > 0
        ? pageComponents.map(c => renderComponentToPHP(c, 1)).join("\n")
        : "  <!-- No components on this page -->",
      `</div>`,
    ].join("\n");

    files[`app/views/${fileName}.php`] = generateHTMLWrapper(
      page.name,
      fileName,
      bodyContent,
      page.metaDescription || "",
      page.ogImage || "",
    );

    // ── Per-page responsive CSS ───────────────────────────────────────────────
    const componentCssBlocks = pageComponents
      .filter(c => (c.style && Object.keys(c.style).length > 0) || c.type === "navbar")
      .map(c => buildResponsiveCss(c, c.position));

    files[`public/assets/css/${fileName}.css`] = [
      `/* ══════════════════════════════════════════════`,
      `   Page  : ${page.name}`,
      `   Baseline: ${DESIGN_WIDTH}px canvas`,
      `   ══════════════════════════════════════════════ */`,
      "",
      ...componentCssBlocks,
    ].join("\n\n");

    // ── Per-page JS ───────────────────────────────────────────────────────────
    files[`public/assets/js/${fileName}.js`] = generatePageJS(pageComponents, page.name);
  });

  return files;
};