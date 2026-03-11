// lib/code-generator.ts
import { ComponentData } from "../App"

// ─── Constants ────────────────────────────────────────────────────────────────
const DESIGN_WIDTH = 1920;

const BREAKPOINTS = {
  tablet: 1024,
  mobile: 768,
} as const;

const SCALE = {
  tablet: BREAKPOINTS.tablet / DESIGN_WIDTH,
  mobile: BREAKPOINTS.mobile / DESIGN_WIDTH,
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

// ── Collect all components recursively (flattens nested children) ──
const collectAllComponents = (components: ComponentData[]): ComponentData[] =>
  components.flatMap(c => [c, ...collectAllComponents(c.children ?? [])]);

// ── Readable ID detection ──────────────────────────────────────────────────────
// New IDs look like "navbar-main", "button-primary" (type-suffix, no digits run ≥5)
// Old IDs look like "code-17729832817420-4459" (has long digit sequences)
const isReadableId = (id: string): boolean => {
  if (!id) return false;
  // If it already has a comp- prefix, it's legacy
  if (id.startsWith("comp-")) return false;
  // If it contains a run of 5+ digits, it's a timestamp-based legacy ID
  if (/\d{5,}/.test(id)) return false;
  // Must be kebab-case with at least one hyphen
  return /^[a-z][a-z0-9-]+-[a-z][a-z0-9-]*$/.test(id);
};

// Return the CSS class name for a component (no comp- prefix for readable IDs)
const compIdClass = (component: ComponentData): string => {
  const id = sanitizeId(component.id);
  // Readable new-format ID → use directly as class
  if (isReadableId(component.id)) return id;
  // Legacy ID → keep comp- prefix for backward compatibility
  return `comp-${id}`;
};

const compClass = (component: ComponentData): string => {
  const idClass = compIdClass(component);
  const userClass = component.props?.className;
  // Skip userClass if it's auto-generated (matches the idClass, or starts with comp-)
  const isAutoClass = !userClass
    || userClass.trim() === idClass
    || /^comp-/.test(userClass.trim().split(/\s+/)[0]);
  return isAutoClass ? idClass : `${idClass} ${userClass}`;
};

// ─── CSS rule builder ─────────────────────────────────────────────────────────
const toCssRule = (style: Record<string, any> = {}): string =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      const unit = typeof value === "number" && !isUnitless(key) ? "px" : "";
      return `  ${camelToKebab(key)}: ${value}${unit};`;
    })
    .join("\n");

const scalePx = (value: number, ratio: number): string =>
  `${Math.round(value * ratio)}px`;

const FULL_WIDTH_TYPES = new Set(["navbar", "hero", "footer", "section-heading"]);

const buildResponsiveCss = (
  component: ComponentData,
  position: { x: number; y: number } | undefined,
): string => {
  const style = component.style ?? {};
  const cls   = `.${compIdClass(component)}`;
  const isFullWidth = FULL_WIDTH_TYPES.has(component.type);

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
    if (["left","top","right","bottom","width","height"].includes(key)) continue;
    if (key === "position" && value === "absolute") continue;
    if (value === undefined || value === null || value === "") continue;
    const unit = typeof value === "number" && !isUnitless(key) ? "px" : "";
    const cssKey = key.startsWith("--") ? key : camelToKebab(key);
    desktopLines.push(`  ${cssKey}: ${value}${unit};`);
  }

  let css = `${cls} {\n${desktopLines.join("\n")}\n}`;

  if (component.type === "navbar") {
    css += `\n\n@media (max-width: ${BREAKPOINTS.tablet}px) {\n  ${cls} {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n  }\n  ${cls} .nav-toggle {\n    display: flex !important;\n  }\n  ${cls} .nav-links {\n    display: none;\n    width: 100%;\n    order: 3;\n  }\n  ${cls} .nav-links.open {\n    display: flex !important;\n  }\n}`;
    css += `\n\n@media (max-width: ${BREAKPOINTS.mobile}px) {\n  ${cls} {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n  }\n  ${cls} .nav-toggle {\n    display: flex !important;\n  }\n  ${cls} .nav-links {\n    display: none;\n    width: 100%;\n    order: 3;\n  }\n  ${cls} .nav-links.open {\n    display: flex !important;\n  }\n}`;
  }

  for (const [bpName, bpMax] of Object.entries(BREAKPOINTS) as [keyof typeof BREAKPOINTS, number][]) {
    const ratio = SCALE[bpName];
    const bpLines: string[] = [];

    if (isFullWidth) {
      bpLines.push(`  position: relative;`);
      bpLines.push(`  left: 0;`);
      bpLines.push(`  top: 0;`);
      bpLines.push(`  width: 100%;`);
      if (rawH !== null) bpLines.push(`  height: ${Math.round(rawH * ratio)}px;`);
    } else {
      if (position) {
        bpLines.push(`  left: ${((position.x / DESIGN_WIDTH) * 100).toFixed(4)}%;`);
        bpLines.push(`  top: ${Math.round(position.y * ratio)}px;`);
      }
      if (rawH !== null) bpLines.push(`  height: ${Math.round(rawH * ratio)}px;`);
      if (rawW !== null) bpLines.push(`  min-width: ${Math.max(32, Math.round(rawW * ratio))}px;`);
    }

    const rawFs = parsePixelValue(style.fontSize);
    if (rawFs !== null) bpLines.push(`  font-size: ${scalePx(rawFs, ratio)};`);

    for (const pad of ["paddingTop","paddingRight","paddingBottom","paddingLeft"] as const) {
      const v = parsePixelValue(style[pad]);
      if (v !== null) bpLines.push(`  ${camelToKebab(pad)}: ${scalePx(v, ratio)};`);
    }

    const rawBr = parsePixelValue(style.borderRadius);
    if (rawBr !== null) bpLines.push(`  border-radius: ${scalePx(rawBr, ratio)};`);

    if (bpLines.length > 0) {
      css += `\n\n@media (max-width: ${bpMax}px) {\n  ${cls} {\n${bpLines.map(l => "  " + l).join("\n")}\n  }\n}`;
    }
  }

  return css;
};

// ─── PHP renderer ─────────────────────────────────────────────────────────────
const esc = (s: any): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderComponentToPHP = (component: ComponentData, depth = 0): string => {
  const indent = "  ".repeat(depth);
  const props  = component.props ?? {};
  const cls    = compClass(component);
  const idAttr = props.elementId ? ` id="${esc(props.elementId)}"` : "";
  // Button JS ID uses the same class name (readable or legacy)
  const btnId  = component.type === "button" ? ` id="btn-${compIdClass(component)}"` : "";
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
      return `${indent}<img${idAttr} src="${esc(props.src)}" alt="${esc(props.alt) || "image"}" class="${cls}" />`;

    case "navbar": {
      const brand = esc(props.brand || "");
      const links: string[] = Array.isArray(props.links) && props.links.length > 0
        ? props.links
        : ["Home", "About", "Contact"];
      const linkUrls: string[] = Array.isArray(props.linkUrls) ? props.linkUrls : [];

const linkItems = links
  .map((l: string, i: number) => {
    const raw = linkUrls[i];
    const href = raw && raw.trim() !== "" && raw.trim() !== "#"
      ? raw.trim()
      : "#";
    return `${indent}    <li><a href="${esc(href)}">${esc(l)}</a></li>`;
  })
  .join("\n");

      return [
        `${indent}<nav${idAttr} class="${cls} full-width-block">`,
        `${indent}  <div class="nav-brand">${brand}</div>`,
        `${indent}  <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">`,
        `${indent}    <span class="burger-bar"></span>`,
        `${indent}    <span class="burger-bar"></span>`,
        `${indent}    <span class="burger-bar"></span>`,
        `${indent}  </button>`,
        `${indent}  <ul class="nav-links">`,
        linkItems,
        `${indent}  </ul>`,
        `${indent}</nav>`,
      ].join("\n");
    }

    case "hero": {
      const title    = esc(props.title    || "Welcome");
      const subtitle = esc(props.subtitle || "");
      const btnText  = esc(props.buttonText || "Get Started");
      return [
        `${indent}<section${idAttr} class="${cls} full-width-block">`,
        `${indent}  <h1>${title}</h1>`,
        subtitle ? `${indent}  <p>${subtitle}</p>` : "",
        `${indent}  <a href="#" class="hero-btn">${btnText}</a>`,
        `${indent}</section>`,
      ].filter(Boolean).join("\n");
    }

    case "footer":
      return [
        `${indent}<footer${idAttr} class="${cls} full-width-block">`,
        `${indent}  <p>${esc(props.copyright) || ""}</p>`,
        `${indent}</footer>`,
      ].join("\n");

    case "section-heading":
      return [
        `${indent}<div${idAttr} class="${cls}">`,
        `${indent}  <h2>${esc(props.title) || "Section"}</h2>`,
        props.subtitle ? `${indent}  <p>${esc(props.subtitle)}</p>` : "",
        `${indent}</div>`,
      ].filter(Boolean).join("\n");

    case "card":
      return [
        `${indent}<div${idAttr} class="${cls}">`,
        props.image ? `${indent}  <img src="${esc(props.image)}" alt="${esc(props.title)}" />` : "",
        `${indent}  <h3>${esc(props.title) || ""}</h3>`,
        `${indent}  <p>${esc(props.description) || ""}</p>`,
        props.buttonText ? `${indent}  <a href="#" class="card-btn">${esc(props.buttonText)}</a>` : "",
        `${indent}</div>`,
      ].filter(Boolean).join("\n");

    case "input":
      return `${indent}<input${idAttr} type="${esc(props.type) || "text"}" placeholder="${esc(props.placeholder)}" class="${cls}" />`;

    case "textarea":
      return `${indent}<textarea${idAttr} placeholder="${esc(props.placeholder)}" class="${cls}"></textarea>`;

    case "container":
    case "group":
    case "grid":
    case "form":
      return `${indent}<div${idAttr} class="${cls}">\n${childOutput || `${indent}  <!-- ${component.type} -->`}\n${indent}</div>`;

    case "video":
      return [
        `${indent}<div${idAttr} class="${cls}">`,
        `${indent}  <video controls${props.poster ? ` poster="${esc(props.poster)}"` : ""}>`,
        props.src ? `${indent}    <source src="${esc(props.src)}" type="video/mp4" />` : "",
        `${indent}  </video>`,
        `${indent}</div>`,
      ].filter(Boolean).join("\n");

    default:
      return `${indent}<div${idAttr} class="${cls}">\n${childOutput || ""}\n${indent}</div>`;
  }
};

// ─── JS generator ─────────────────────────────────────────────────────────────
const generatePageJS = (components: ComponentData[], pageName: string): string => {
  const hasNavbar = components.some(c => c.type === "navbar");
  const buttons = components.filter(c => c.type === "button");
  const listeners = buttons.map(btn => {
    const id = `btn-${compIdClass(btn)}`;
    return `// Event listener for ${btn.props?.content || "Button"}\n  document.getElementById("${id}")?.addEventListener("click", () => {\n    console.log("${id} clicked!");\n  });`;
  }).join("\n\n  ");

  const navScript = hasNavbar ? `
  // Hamburger nav toggle (tablet + mobile)
  document.querySelectorAll(".nav-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const nav = btn.closest("nav");
      const links = nav ? nav.querySelector(".nav-links") : null;
      if (!links) return;
      const isOpen = links.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });
  // Close nav when a link is clicked (SPA-style)
  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      const links = link.closest(".nav-links");
      const btn = links?.closest("nav")?.querySelector(".nav-toggle");
      if (links) links.classList.remove("open");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  });` : "";

  return `document.addEventListener("DOMContentLoaded", () => {
  console.log("${pageName} page loaded");
${navScript}
  ${listeners || "// No interactive components."}
});`;
};

// ─── Global responsive CSS reset ──────────────────────────────────────────────
const GLOBAL_RESPONSIVE_CSS = `/* ── Responsive reset ── */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; overflow-x: hidden; }

/* ── Desktop: absolute canvas (matches 1920px design) ── */
.canvas-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Fluid images */
img { max-width: 100%; height: auto; }

/* ── Navbar always flex, always full-width ── */
.canvas-container nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  box-sizing: border-box;
}
.canvas-container nav .nav-brand {
  font-weight: 700;
  white-space: nowrap;
}
.canvas-container nav .nav-links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: var(--nav-spacing, clamp(0.5rem, 2vw, 2rem));
  flex-wrap: wrap;
}
.canvas-container nav .nav-links a {
  text-decoration: none;
  color: inherit;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.15s;
}
.canvas-container nav .nav-links a:hover {
  background-color: var(--nav-hover, rgba(0,0,0,0.07));
}

/* ── Burger button — hidden on desktop ── */
.canvas-container .nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  color: inherit;
  transition: background 0.15s;
  flex-shrink: 0;
}
.nav-toggle:hover { background: var(--nav-hover, rgba(0,0,0,0.07)); }
.burger-bar {
  display: block;
  width: 22px;
  height: 2px;
  background: currentColor;
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.2s ease;
  transform-origin: center;
}
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

@media (max-width: ${BREAKPOINTS.tablet}px) {
  .canvas-container {
    position: static;
    display: block;
    min-height: 100svh;
  }
  .canvas-container nav,
  .canvas-container .full-width-block {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
  }
  .canvas-container .nav-toggle { display: flex !important; }
  .canvas-container nav .nav-links {
    display: none;
    flex-direction: column;
    width: 100%;
    gap: 0;
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
    padding: 0.6rem 0.75rem;
    border-radius: 6px;
  }
}

@media (max-width: ${BREAKPOINTS.mobile}px) {
  .canvas-container .nav-toggle { display: flex !important; } 
  .canvas-container {
    position: static;
    display: block;
    min-height: 100svh;
  }
  .canvas-container nav,
  .canvas-container .full-width-block {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
  }
}

@keyframes navSlideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// ─── HTML page wrapper ────────────────────────────────────────────────────────
const generateHTMLWrapper = (pageName: string, fileName: string, bodyContent: string): string =>
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?php echo htmlspecialchars($pageTitle ?? "${pageName}"); ?></title>
  <link rel="stylesheet" href="assets/css/global.css" />
  <link rel="stylesheet" href="assets/css/${fileName}.css" />
</head>
<body>
${bodyContent}
  <script src="assets/js/${fileName}.js"></script>
</body>
</html>`;

// ─── Main export ──────────────────────────────────────────────────────────────
// ─── ID migration ────────────────────────────────────────────────────────────
// Maps component types to readable suffixes (mirrors CodeViewEditor's SEMANTIC_SUFFIXES)
const SEMANTIC_SUFFIXES_GEN: Record<string, string[]> = {
  navbar: ["main","top","site","primary"], hero: ["main","banner","top","landing"],
  footer: ["main","site","bottom","primary"], heading: ["title","main","primary","section"],
  text: ["body","content","copy","description"], paragraph: ["intro","body","content","description"],
  button: ["primary","cta","action","submit"], image: ["main","hero","cover","featured"],
  input: ["field","name","email","search"], textarea: ["message","bio","notes","content"],
  select: ["field","option","filter","dropdown"], checkbox: ["field","agree","option","toggle"],
  "radio-group": ["options","choice","field","selector"], card: ["item","feature","product","profile"],
  container: ["wrapper","section","block","content"], grid: ["layout","gallery","features","cards"],
  form: ["contact","signup","login","subscribe"], divider: ["section","main","content","break"],
  accordion: ["faq","main","content","details"], tabs: ["main","content","sections","nav"],
  modal: ["dialog","popup","confirm","info"], alert: ["info","warning","success","error"],
  table: ["data","main","list","records"], gallery: ["images","portfolio","photos","work"],
  carousel: ["slides","hero","featured","promo"], "section-heading": ["main","about","features","services"],
  "sign-in": ["form","main","user","auth"], "sign-up": ["form","main","register","auth"],
  "paymongo-button": ["pay","checkout","buy","order"], video: ["main","hero","promo","embed"],
};

function pickReadableId(type: string, used: Set<string>): string {
  const suffixes = SEMANTIC_SUFFIXES_GEN[type] ?? ["main","content","block","section"];
  for (const suffix of suffixes) {
    const c = `${type}-${suffix}`; if (!used.has(c)) { used.add(c); return c; }
  }
  for (const suffix of suffixes) {
    for (let n = 2; n <= 20; n++) {
      const c = `${type}-${suffix}-${n}`; if (!used.has(c)) { used.add(c); return c; }
    }
  }
  const c = `${type}-${Date.now().toString(36).slice(-4)}`; used.add(c); return c;
}

/**
 * Returns a copy of components with all legacy IDs replaced by readable ones.
 * Pure function — does NOT mutate the input array.
 */
function migrateToReadableIds(components: ComponentData[]): ComponentData[] {
  const used = new Set(components.filter(c => isReadableId(c.id)).map(c => c.id));
  
  const migrate = (c: ComponentData): ComponentData => {
    const newId = isReadableId(c.id) ? c.id : pickReadableId(c.type, used);
    return {
      ...c,
      id: newId,
      children: c.children?.map(migrate),  // ← recurse into children
    };
  };
  
  return components.map(migrate);
}

export const generateProjectFiles = (
  components: ComponentData[],
  pages: any[],
  projectName: string,
): Record<string, string> => {
  // Migrate all legacy timestamp IDs to readable names before generating any files
  const migratedComponents = migrateToReadableIds(components);

  const files: Record<string, string> = {
    "public/index.php": `<?php require_once __DIR__ . "/../app/views/layout.php"; ?>`,
    "app/views/layout.php": `<?php // Global Layout for ${projectName} ?>`,
    "public/assets/css/global.css": GLOBAL_RESPONSIVE_CSS,
    "public/assets/css/styles.css": `/* Deprecated: use global.css */\n@import "global.css";`,
    "config/database.php": `<?php\nreturn [\n    "db_host" => "db.supabase.co",\n    "db_name" => "postgres",\n];`,
    "README.md": `# ${projectName}\nGenerated PHP Project.\n\n## Responsive Design\n- Desktop: 1920px baseline\n- Tablet: ≤${BREAKPOINTS.tablet}px\n- Mobile: ≤${BREAKPOINTS.mobile}px`,
  };

  pages.forEach((page, index) => {
    const fileName = slugify(page.name);

    const pageComponents = migratedComponents.filter(c => {
      const isExplicitMatch = c.page_id === page.id;
      const isGlobal = c.page_id === "all";
      const isDefaultHome = !c.page_id && (page.id === "home" || index === 0);
      return isExplicitMatch || isGlobal || isDefaultHome;
    });

    const bodyContent = [
      `<div class="canvas-container">`,
      pageComponents.length > 0
        ? pageComponents.map(c => renderComponentToPHP(c, 1)).join("\n")
        : "  <!-- No components on this page -->",
      `</div>`,
    ].join("\n");

    files[`app/views/${fileName}.php`] = generateHTMLWrapper(page.name, fileName, bodyContent);

    const allPageComponents = collectAllComponents(pageComponents);
    const componentCssBlocks = allPageComponents
      .filter(c => (c.style && Object.keys(c.style).length > 0) || c.type === "navbar")
      .map(c => buildResponsiveCss(c, (c as any).position as { x: number; y: number } | undefined));

    files[`public/assets/css/${fileName}.css`] = [
      `/* Page: ${page.name} — auto-generated responsive styles */`,
      `/* Design baseline: ${DESIGN_WIDTH}px | Tablet: ≤${BREAKPOINTS.tablet}px | Mobile: ≤${BREAKPOINTS.mobile}px */`,
      "",
      ...componentCssBlocks,
    ].join("\n\n");

    files[`public/assets/js/${fileName}.js`] = generatePageJS(pageComponents, page.name);
  });

  return files;
};