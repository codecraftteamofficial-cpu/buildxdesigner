// lib/code-generator.ts
import { ComponentData } from "../App";
import { transpileHTML as _transpileHTML, transpileCSS, transpileJS, hasTranspiler } from "./block-transpiler";
import indexCss from "../index.css?raw";

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
// Enhanced typo correction function for column names
export const slugify = (value: string | undefined) =>
  (value || "page")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "page";

const scrubPHP = (content: string): string => {
  if (!content) return "";
  // Remove PHP tags and common PHP injection patterns
  return content
    .replace(/<\?php[\s\S]*?\?>/gi, "/* [PHP-BLOCKED] */")
    .replace(/<\?php/gi, "/* [PHP-BLOCKED] */")
    .replace(/\?>/gi, "/* [PHP-BLOCKED] */");
};

const correctColumnTypos = (columnString: string): string => {
  const commonCorrections: Record<string, string> = {
    'uername': 'username',
    'usrname': 'username',
    'usernm': 'username',
    'user_name': 'username',
    'user-id': 'user_id',
    'userid': 'user_id',
    'emailadress': 'email',
    'email_address': 'email',
    'fristname': 'firstname',
    'firstname': 'first_name',
    'lastname': 'last_name',
    'createdat': 'created_at',
    'updatedat': 'updated_at',
    'phonenumber': 'phone_number',
    'phno': 'phone_number'
  };

  // Handle comma-separated column lists
  return columnString
    .split(',')
    .map(col => {
      const trimmedCol = col.trim();
      const corrected = commonCorrections[trimmedCol.toLowerCase()];
      if (corrected) {
        console.log(`[buildx] 🔧 Auto-corrected column "${trimmedCol}" to "${corrected}"`);
        return corrected;
      }
      return trimmedCol;
    })
    .join(',');
};

const camelToKebab = (value: string): string =>
  value.replace(/([A-Z])/g, "-$1").toLowerCase();

const isUnitless = (key: string) =>
  ["opacity", "zIndex", "fontWeight", "lineHeight", "flex", "order"].includes(
    key,
  );

const parsePixelValue = (value: any): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  return null;
};

const sanitizeId = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, "-");

// ── Collect all components recursively (flattens nested children) ──
const collectAllComponents = (components: ComponentData[]): ComponentData[] =>
  components.flatMap((c) => [c, ...collectAllComponents(c.children ?? [])]);

const isReadableId = (id: string): boolean => {
  if (!id) return false;
  if (id.startsWith("comp-")) return false;
  if (/\d{5,}/.test(id)) return false;
  return /^[a-z][a-z0-9-]+-[a-z][a-z0-9-]*$/.test(id);
};

const compIdClass = (component: ComponentData): string => {
  const id = sanitizeId(component.id);
  if (isReadableId(component.id)) return id;
  return `comp-${id}`;
};

const compClass = (component: ComponentData): string => {
  const idClass = compIdClass(component);
  const userClass = component.props?.className;
  const isAutoClass =
    !userClass ||
    userClass.trim() === idClass ||
    /^comp-/.test(userClass.trim().split(/\s+/)[0]);
  return isAutoClass ? idClass : `${idClass} ${userClass}`;
};

const scalePx = (value: number, ratio: number): string =>
  `${Math.round(value * ratio)}px`;

const FULL_WIDTH_TYPES = new Set([
  "navbar",
  "hero",
  "footer",
  "section-heading",
]);

const buildResponsiveCss = (
  component: ComponentData,
  position: { x: number; y: number } | undefined,
): string => {
  const style = component.style ?? {};
  const cls = `.${compIdClass(component)}`;
  const isFullWidth = FULL_WIDTH_TYPES.has(component.type);

  const desktopLines: string[] = [`  position: absolute !important;`];

  if (position) {
    desktopLines.push(`  left: ${Math.round(position.x)}px !important;`);
    desktopLines.push(`  top: ${Math.round(position.y)}px !important;`);
  }

  const rawW = parsePixelValue(style.width);
  const rawH = parsePixelValue(style.height);
  if (rawW !== null)
    desktopLines.push(`  width: ${Math.round(rawW)}px !important;`);
  if (rawH !== null) desktopLines.push(`  height: ${Math.round(rawH)}px !important;`);

  for (const [key, value] of Object.entries(style)) {
    if (["left", "top", "right", "bottom", "width", "height"].includes(key))
      continue;
    if (key === "position" && value === "absolute") continue;
    if (value === undefined || value === null || value === "") continue;
    const unit = typeof value === "number" && !isUnitless(key) ? "px" : "";
    const cssKey = key.startsWith("--") ? key : camelToKebab(key);
    desktopLines.push(`  ${cssKey}: ${value}${unit};`);
  }

  let css = `${cls} {\n${desktopLines.join("\n")}\n}`;

  if (component.type === "navbar") {
    // Media queries now handled by Scoped Tailwind classes in block-transpiler.ts
  }

  for (const [bpName, bpMax] of Object.entries(BREAKPOINTS) as [
    keyof typeof BREAKPOINTS,
    number,
  ][]) {
    const ratio = SCALE[bpName];
    const bpLines: string[] = [];

    if (isFullWidth) {
      bpLines.push(`  position: relative !important;`);
      bpLines.push(`  left: 0 !important;`);
      bpLines.push(`  top: 0 !important;`);
      bpLines.push(`  width: 100% !important;`);
      if (rawH !== null)
        bpLines.push(`  height: ${Math.round(rawH * ratio)}px !important;`);
    } else {
      if (position) {
        bpLines.push(
          `  left: ${((position.x / DESIGN_WIDTH) * 100).toFixed(4)}% !important;`,
        );
        bpLines.push(`  top: ${Math.round(position.y * ratio)}px !important;`);
      }
      if (rawH !== null)
        bpLines.push(`  height: ${Math.round(rawH * ratio)}px !important;`);
      if (rawW !== null)
        bpLines.push(
          `  min-width: ${Math.max(32, Math.round(rawW * ratio))}px !important;`,
        );
    }

    const rawFs = parsePixelValue(style.fontSize);
    if (rawFs !== null) bpLines.push(`  font-size: ${scalePx(rawFs, ratio)};`);

    for (const pad of [
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
    ] as const) {
      const v = parsePixelValue(style[pad]);
      if (v !== null)
        bpLines.push(`  ${camelToKebab(pad)}: ${scalePx(v, ratio)};`);
    }

    const rawBr = parsePixelValue(style.borderRadius);
    if (rawBr !== null)
      bpLines.push(`  border-radius: ${scalePx(rawBr, ratio)};`);

    if (bpLines.length > 0) {
      css += `\n\n@media (max-width: ${bpMax}px) {\n  ${cls} {\n${bpLines.map((l) => "  " + l).join("\n")}\n  }\n}`;
    }
  }

  return css;
};

// ─── HTML renderer ─────────────────────────────────────────────────────────────
const esc = (s: any): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderComponentToHTML = (component: ComponentData, depth = 0): string => {
  const indent = "  ".repeat(depth);
  const props = component.props ?? {};
  const cls = compClass(component);
  const idAttr = ` id="${esc(props.elementId || compIdClass(component))}"`;
  const btnId =
    component.type === "button" ? ` id="btn-${compIdClass(component)}"` : "";
  const childOutput = (component.children ?? [])
    .map((child) => renderComponentToHTML(child, depth + 1))
    .join("\n");

  // Auth block types have props.html from the palette template, but they should
  // be handled by the block-transpiler (which generates the correct single-wrapper).
  // Letting them fall through here would double-wrap them in an extra <div>.
  // Form/table types also have props.html templates with {{PLACEHOLDERS}} that
  // must NOT be used directly — their block-transpiler generates clean HTML from props.
  const AUTH_TYPES = ['sign-in', 'sign-up', 'auth-block', 'profile'];
  const TRANSPILER_ONLY_TYPES = ['form', 'dynamic-form', 'table'];
  if (props.html !== undefined && !AUTH_TYPES.includes(component.type) && !TRANSPILER_ONLY_TYPES.includes(component.type)) {
    let htmlRaw = (props.html || "").replace(
      /\$elementId/g,
      compIdClass(component),
    );

    // Auth-related replacements
    if (props.redirectUrl || (component.type === 'sign-in' || component.type === 'sign-up' || component.type === 'auth-block')) {
      const redirect = props.redirectUrl || '/';
      htmlRaw = htmlRaw.replace(/\{\{REDIRECT_URL\}\}/g, redirect);
    }

    return `${indent}<div${idAttr} class="${cls}" data-component-type="${component.type}">\n${indent}  ${htmlRaw}\n${childOutput ? childOutput + "\n" : ""}${indent}</div>`;
  }

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
      const links: string[] =
        Array.isArray(props.links) && props.links.length > 0
          ? props.links
          : ["Home", "About", "Contact"];
      const linkUrls: string[] = Array.isArray(props.linkUrls)
        ? props.linkUrls
        : [];
      const linkItems = links
        .map((l: string, i: number) => {
          const raw = linkUrls[i];
          const href =
            raw && raw.trim() !== "" && raw.trim() !== "#" ? raw.trim() : "#";
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
      const title = esc(props.title || "Welcome");
      const subtitle = esc(props.subtitle || "");
      const btnText = esc(props.buttonText || "Get Started");
      return [
        `${indent}<section${idAttr} class="${cls} full-width-block">`,
        `${indent}  <h1>${title}</h1>`,
        subtitle ? `${indent}  <p>${subtitle}</p>` : "",
        `${indent}  <a href="#" class="hero-btn">${btnText}</a>`,
        `${indent}</section>`,
      ]
        .filter(Boolean)
        .join("\n");
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
      ]
        .filter(Boolean)
        .join("\n");
    case "card":
      return [
        `${indent}<div${idAttr} class="${cls} card">`,
        props.image
          ? `${indent}  <img src="${esc(props.image)}" alt="${esc(props.title)}" />`
          : "",
        `${indent}  <h3>${esc(props.title) || ""}</h3>`,
        `${indent}  <p>${esc(props.description) || ""}</p>`,
        props.buttonText
          ? `${indent}  <a href="#" class="card-btn">${esc(props.buttonText)}</a>`
          : "",
        `${indent}</div>`,
      ]
        .filter(Boolean)
        .join("\n");
    case "input":
      return `${indent}<input${idAttr} class="${cls}" type="${esc(props.type) || "text"}" placeholder="${esc(props.placeholder)}" />`;
    case "textarea":
      return `${indent}<textarea${idAttr} class="${cls}" placeholder="${esc(props.placeholder)}"></textarea>`;
    case "container":
    case "group":
      return `${indent}<div${idAttr} class="${cls}" data-component-type="${component.type}">\n${childOutput || `${indent}  <!-- ${component.type} -->`}\n${indent}</div>`;
    case "grid":
      return `${indent}<div${idAttr} class="${cls}" data-component-type="grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">\n${childOutput || `${indent}  <!-- grid -->`}\n${indent}</div>`;
    case "video":
      return [
        `${indent}<div${idAttr} class="${cls}">`,
        `${indent}  <video controls${props.poster ? ` poster="${esc(props.poster)}"` : ""}>`,
        props.src
          ? `${indent}    <source src="${esc(props.src)}" type="video/mp4" />`
          : "",
        `${indent}  </video>`,
        `${indent}</div>`,
      ]
        .filter(Boolean)
        .join("\n");
    case "custom-component": {
      const html = props.html || "";
      return `${indent}<div${idAttr} class="${cls}" data-component-type="custom-component">\n${indent}  ${html}\n${indent}</div>`;
    }
    default:
      // Delegate to block-transpiler for blocks with dedicated transpilers
      if (hasTranspiler(component.type)) {
        return _transpileHTML(component, depth);
      }
      return `${indent}<div${idAttr} class="${cls}">\n${childOutput || ""}\n${indent}</div>`;
  }
};

// ─── JS generator ─────────────────────────────────────────────────────────────

const processJsHandler = (component: ComponentData): string => {
  let handler = component.props?.js_handler || "";
  const id = component.props?.elementId || compIdClass(component);
  handler = handler.replace(/\$elementId/g, id);

  if (component.props?.redirectUrl || ['sign-in', 'sign-up', 'auth-block'].includes(component.type)) {
    handler = handler.replace(/\{\{REDIRECT_URL\}\}/g, component.props?.redirectUrl || '/');
  }

  if (component.type === "form") {
    const integrations = component.props?.integrations || [];
    const resend = integrations.find((i: any) => i.type === 'resend');
    handler = handler.replace(/\{\{RESEND_INTEGRATION_ID\}\}/g, resend?.id || '');
    handler = handler.replace(/\{\{RECIPIENT_EMAIL\}\}/g, component.props?.recipientEmail || '');
  }

  if (component.type === "table") {
    handler = handler.replace(/\{\{SUPABASE_TABLE\}\}/g, component.props?.supabaseTable || '');

    let selectColumns = '*';
    let headerConfigStr = '';

    if (component.props?.integrations && Array.isArray(component.props.integrations) && component.props.integrations.length > 0) {
      const config = component.props.integrations[0].config;
      selectColumns = config?.selectColumns || '*';
      if (config?.headerConfig && Array.isArray(config.headerConfig)) {
        headerConfigStr = config.headerConfig.map((h: any) => `'${h.column}': '${h.label}'`).join(', ');
      }
    }

    handler = handler.replace(/\{\{SUPABASE_SELECT_COLUMNS\}\}/g, selectColumns);
    handler = handler.replace(/\{\{TABLE_HEADERS_CONFIG\}\}/g, headerConfigStr);
  }

  return handler;
};

const generatePageJS = (
  components: ComponentData[],
  pageName: string,
): string => {
  const hasNavbar = components.some((c) => c.type === "navbar");
  const buttons = components.filter((c) => c.type === "button");
  const allComponents = collectAllComponents(components);

  const listeners = buttons
    .map((btn) => {
      const id = `btn-${compIdClass(btn)}`;
      return `// Event listener for ${btn.props?.content || "Button"}\n  document.getElementById("${id}")?.addEventListener("click", () => {\n    console.log("${id} clicked!");\n  });`;
    })
    .join("\n\n  ");

  const navScript = hasNavbar
    ? `
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
  });`
    : "";

  const componentHandlers = allComponents
    .filter((c) => c.props?.js_handler)
    .map((c) => {
      const id = compIdClass(c);
      let handler = processJsHandler(c);

      // Scrub PHP logic if present
      if (handler.includes("<?php") || handler.includes("?>")) {
        handler = scrubPHP(handler);
        return `/* [CANVAS-INJECTION]: ${id} had PHP logic which was scrubbed. */\n${handler}`;
      }

      return `/* [CANVAS-INJECTION]: ${id} */\n(function(element, $, $$){ \n  ${handler}\n})(document.getElementById("${id}"), (s)=>document.querySelector("#${id} "+s), (s)=>document.querySelectorAll("#${id} "+s));`;
    })
    .join("\n\n");

  const customScripts = allComponents
    .filter((c) => c.type === "custom-component" && c.props?.js)
    .map((c) => {
      const id = c.props?.elementId || compIdClass(c);
      let cjs = c.props.js;
      if (cjs.includes("<?php") || cjs.includes("?>")) {
        cjs = scrubPHP(cjs);
      }
      const innerContent = `(function() {\n  const element = document.getElementById("${id}");\n  if (!element) return;\n  const $ = (s) => element.querySelector(s);\n  const $$ = (s) => element.querySelectorAll(s);\n  try {\n    (function(element, $, $$) {\n${cjs}\n    })(element, $, $$);\n  } catch (err) {\n    console.error('Error in custom component [${c.id}] JS:', err);\n  }\n})();`;
      const contentHash = Array.from(innerContent).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString(16);
      return `/* [CANVAS-INJECTION]: ${id} | hash:${contentHash} */\n${innerContent}\n/* [END-CANVAS-INJECTION]: ${id} */`;
    })
    .join("\n\n");

  return `document.addEventListener("DOMContentLoaded", () => {
  console.log("${pageName} page loaded");
${navScript}
  ${listeners || "// No basic listeners."}

  ${componentHandlers || "// No component-specific logic."}

  // Execute custom component scripts with delay to ensure DOM is ready
  setTimeout(() => {
    try {
${customScripts ? `// Custom Component Scripts\n${customScripts}` : "// No custom component scripts."}
    } catch (error) {
      console.error('Error executing custom component scripts:', error);
    }
  }, 100);
});`;
};

// ─── Global responsive CSS reset ──────────────────────────────────────────────
const GLOBAL_RESPONSIVE_CSS = `/* ── Responsive reset ── */
*, *::before, *::after { box-sizing: border-box; }
html, body { 
  margin: 0; 
  padding: 0; 
  overflow-x: hidden; 
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #020817; /* shadcn foreground */
  background-color: #ffffff; /* shadcn background */
}

/* Base element resets */
h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.25; margin: 0; }
h1 { font-size: 2.25rem; letter-spacing: -0.02em; }
h2 { font-size: 1.875rem; letter-spacing: -0.01em; }
h3 { font-size: 1.5rem; letter-spacing: -0.01em; }
p { margin: 0; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; }

/* ── Premade Block Base Styles ── */
.hero-btn, .card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.15s, opacity 0.15s;
  cursor: pointer;
  border: none;
  text-decoration: none;
}
.hero-btn {
  background-color: #2563eb;
  color: #ffffff;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}
.hero-btn:hover { background-color: #1d4ed8; }

.card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
.card h3 { padding: 1.5rem 1.5rem 0.5rem; margin: 0; }
.card p { padding: 0 1.5rem 1.5rem; color: #64748b; font-size: 0.875rem; }
.card-btn {
  background-color: #0f172a;
  color: #ffffff;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  margin: 0 1.5rem 1.5rem;
}
.card-btn:hover { opacity: 0.9; }

.canvas-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}

img { max-width: 100%; height: auto; }

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
.burger-bar {
  display: block;
  width: 22px;
  height: 2px;
  background: currentColor;
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.2s ease;
  transform-origin: center;
}
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
.nav-toggle[aria-expanded="true"] .burger-bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

@media (max-width: ${BREAKPOINTS.tablet}px) {
  .canvas-container { position: static; display: block; min-height: 100svh; }
  .canvas-container nav, .canvas-container .full-width-block { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; }
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
  .canvas-container nav .nav-links.open { display: flex; animation: navSlideDown 0.2s ease; }
  .canvas-container nav .nav-links li { width: 100%; }
  .canvas-container nav .nav-links a { display: block; padding: 0.6rem 0.75rem; border-radius: 6px; }
}

@media (max-width: ${BREAKPOINTS.mobile}px) {
  .canvas-container .nav-toggle { display: flex !important; } 
  .canvas-container { position: static; display: block; min-height: 100svh; }
  .canvas-container nav, .canvas-container .full-width-block { position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; }
}

@keyframes navSlideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// ─── HTML page wrapper ────────────────────────────────────────────────────────
const generateHTMLWrapper = (
  pageName: string,
  fileName: string,
  bodyContent: string,
  integrationsJson: string = "[]",
  projectName: string = "",
): string =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageName}</title>
  <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
  <link rel="stylesheet" href="assets/css/global.css" />
  <link rel="stylesheet" href="assets/css/${fileName}.css" />
</head>
<body>
${bodyContent}
  <script>
    window.__BUILDX_INTEGRATIONS__ = ${integrationsJson};
    window.__BUILDX_PROJECT_NAME__ = ${JSON.stringify(projectName)};
    window.__BUILDX_BASE_URL__ = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
  </script>
  <script src="assets/js/buildx-sdk.js"></script>
  <script src="assets/js/${fileName}.js"></script>
</body>
</html>`;

// ─── Main export ──────────────────────────────────────────────────────────────
const SEMANTIC_SUFFIXES_GEN: Record<string, string[]> = {
  navbar: ["main", "top", "site", "primary"],
  hero: ["main", "banner", "top", "landing"],
  footer: ["main", "site", "bottom", "primary"],
  heading: ["title", "main", "primary", "section"],
  text: ["body", "content", "copy", "description"],
  paragraph: ["intro", "body", "content", "description"],
  button: ["primary", "cta", "action", "submit"],
  image: ["main", "hero", "cover", "featured"],
  input: ["field", "name", "email", "search"],
  textarea: ["message", "bio", "notes", "content"],
  select: ["field", "option", "filter", "dropdown"],
  checkbox: ["field", "agree", "option", "toggle"],
  "radio-group": ["options", "choice", "field", "selector"],
  card: ["item", "feature", "product", "profile"],
  container: ["wrapper", "section", "block", "content"],
  grid: ["layout", "gallery", "features", "cards"],
  form: ["contact", "signup", "login", "subscribe"],
  divider: ["section", "main", "content", "break"],
  accordion: ["faq", "main", "content", "details"],
  tabs: ["main", "content", "sections", "nav"],
  modal: ["dialog", "popup", "confirm", "info"],
  alert: ["info", "warning", "success", "error"],
  table: ["data", "main", "list", "records"],
  gallery: ["images", "portfolio", "photos", "work"],
  carousel: ["slides", "hero", "featured", "promo"],
  "section-heading": ["main", "about", "features", "services"],
  "sign-in": ["form", "main", "user", "auth"],
  "sign-up": ["form", "main", "register", "auth"],
  "paymongo-button": ["pay", "checkout", "buy", "order"],
  video: ["main", "hero", "promo", "embed"],
};

function pickReadableId(type: string, used: Set<string>): string {
  const suffixes = SEMANTIC_SUFFIXES_GEN[type] ?? [
    "main",
    "content",
    "block",
    "section",
  ];
  for (const suffix of suffixes) {
    const c = `${type}-${suffix}`;
    if (!used.has(c)) {
      used.add(c);
      return c;
    }
  }
  for (const suffix of suffixes) {
    for (let n = 2; n <= 20; n++) {
      const c = `${type}-${suffix}-${n}`;
      if (!used.has(c)) {
        used.add(c);
        return c;
      }
    }
  }
  const c = `${type}-${Date.now().toString(36).slice(-4)}`;
  used.add(c);
  return c;
}

function migrateToReadableIds(components: ComponentData[]): ComponentData[] {
  const used = new Set(
    components.filter((c) => isReadableId(c.id)).map((c) => c.id),
  );
  const migrate = (c: ComponentData): ComponentData => {
    const newId = isReadableId(c.id) ? c.id : pickReadableId(c.type, used);
    return { ...c, id: newId, children: c.children?.map(migrate) };
  };
  return components.map(migrate);
}

function sortComponentsByPosition(components: ComponentData[]): ComponentData[] {
  return [...components]
    .sort((a, b) => {
      const yA = (a as any).position?.y || 0;
      const yB = (b as any).position?.y || 0;
      return yA - yB;
    })
    .map((c) => ({
      ...c,
      children: c.children ? sortComponentsByPosition(c.children) : undefined,
    }));
}

// ─── buildx-sdk.js ────────────────────────────────────────────────────────────
// FIX SUMMARY:
// 1. INSERT: Added `collectFieldValues(config.fieldMap)` to read live input/select/textarea
//    values from the DOM at click-time using the integration's fieldMap config.
// 2. DELETE: Added `window.buildx.data.delete(table, id)` method and wired it in `buildx.run`.
// 3. UPDATE: Added `window.buildx.data.update(table, id, payload)` method and wired it in `buildx.run`.
// 4. PAYMONGO: After a successful link creation, the SDK now auto-redirects to the
//    checkout_url from the PayMongo response instead of silently returning.
const BUILDX_SDK = `(function() {
  'use strict';
  window.buildx = window.buildx || {};

  // ── Config loader ──────────────────────────────────────────────────────────
  let _config = null;
  async function getConfig() {
    if (_config) return _config;
    try {
      const res = await fetch('/config.json');
      _config = await res.json();
      return _config;
    } catch (e) {
      console.error('[buildx] Failed to load config.json');
      return {};
    }
  }

  // ── FIELD VALUE RESOLVER ───────────────────────────────────────────────────
  // Resolves live DOM values at click-time from an integration config.
  //
  // Pattern A — cfg.data with "formData.X" values (generated by BuildX UI):
  //   { "email": "formData.email", "username": "formData.name" }
  //   Resolves by finding the nearest input/select/textarea with [name="X"] or #X
  //
  // Pattern B — cfg.fieldMap with CSS selectors (explicit override):
  //   { "email": "#email-input" }
  //   Bare strings without # are treated as IDs automatically.
  //
  // fieldMap always overrides cfg.data for the same key.
  function collectFieldValues(dataConfig, fieldMap) {
    var result = {};

    // Pattern A: cfg.data "formData.X" references
    if (dataConfig && typeof dataConfig === 'object') {
      var keys = Object.keys(dataConfig);
      for (var i = 0; i < keys.length; i++) {
        var col = keys[i];
        var ref = String(dataConfig[col] || '');
        if (ref.indexOf('formData.') === 0) {
          var nameOrSel = ref.slice('formData.'.length);
          var el = null;
          if (nameOrSel.charAt(0) === '#' || nameOrSel.charAt(0) === '.') {
            el = document.querySelector(nameOrSel);
          } else {
            el = document.querySelector('[name="' + nameOrSel + '"]')
              || document.getElementById(nameOrSel);
          }
          if (el && el.value !== undefined && el.value !== '') {
            result[col] = el.value;
          }
        }
      }
    }

    // Pattern B: cfg.fieldMap CSS selectors (overrides Pattern A for same key)
    if (fieldMap && typeof fieldMap === 'object') {
      var fKeys = Object.keys(fieldMap);
      for (var j = 0; j < fKeys.length; j++) {
        var fCol = fKeys[j];
        var selector = String(fieldMap[fCol] || '');
        if (!selector) continue;
        var sel = (selector.charAt(0) === '#' || selector.charAt(0) === '.')
          ? selector : '#' + selector;
        var fEl = document.querySelector(sel);
        if (fEl && fEl.value !== undefined) {
          result[fCol] = fEl.value;
        }
      }
    }

    return result;
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  window.buildx.auth = {
    async signUp(email, password, metadata) {
      metadata = metadata || {};
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        const res = await fetch(supabaseUrl + '/auth/v1/signup', {
          method: 'POST',
          headers: { 'apikey': supabaseAnonKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password, data: metadata })
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data: data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    async signIn(email, password) {
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        const res = await fetch(supabaseUrl + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: { 'apikey': supabaseAnonKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password })
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        if (data.access_token) {
          localStorage.setItem('supabase.auth.token', data.access_token);
          localStorage.setItem('supabase.auth.user', JSON.stringify(data.user));
        }
        return { data: data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    signOut() {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.user');
      window.location.reload();
    },
    getUser() {
      const user = localStorage.getItem('supabase.auth.user');
      return user ? JSON.parse(user) : null;
    },
    isLoggedIn() {
      return !!localStorage.getItem('supabase.auth.token');
    }
  };

  // ── Data (Supabase REST) ───────────────────────────────────────────────────
  window.buildx.data = {
    async select(table, columns, filters) {
      columns = columns || '*';
      filters = filters || {};
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        const params = new URLSearchParams({ select: columns });
        Object.entries(filters).forEach(function(entry) {
          var col = entry[0]; var val = entry[1];
          if (val !== undefined && val !== null && val !== '') {
            params.append(col, 'eq.' + val);
          }
        });
        const token = localStorage.getItem('supabase.auth.token') || supabaseAnonKey;
        let res = await fetch(supabaseUrl + '/rest/v1/' + table + '?' + params.toString(), {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': 'Bearer ' + token
          }
        });
        let data = await res.json();
        if (!res.ok && data.code === 'PGRST303') {
           localStorage.removeItem('supabase.auth.token');
           localStorage.removeItem('supabase.auth.user');
           res = await fetch(supabaseUrl + '/rest/v1/' + table + '?' + params.toString(), {
             headers: {
               'apikey': supabaseAnonKey,
               'Authorization': 'Bearer ' + supabaseAnonKey
             }
           });
           data = await res.json();
        }
        if (!res.ok) return { data: null, error: data };
        return { data: data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },

    async insert(table, data) {
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        const token = localStorage.getItem('supabase.auth.token') || supabaseAnonKey;
        let res = await fetch(supabaseUrl + '/rest/v1/' + table, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(data)
        });
        let result = await res.json();
        if (!res.ok && result.code === 'PGRST303') {
           localStorage.removeItem('supabase.auth.token');
           localStorage.removeItem('supabase.auth.user');
           res = await fetch(supabaseUrl + '/rest/v1/' + table, {
             method: 'POST',
             headers: {
               'apikey': supabaseAnonKey,
               'Authorization': 'Bearer ' + supabaseAnonKey,
               'Content-Type': 'application/json',
               'Prefer': 'return=representation'
             },
             body: JSON.stringify(data)
           });
           result = await res.json();
        }
        if (!res.ok) return { data: null, error: result };
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },

    // ── FIX 2: DELETE ────────────────────────────────────────────────────────
    // Requires a valid non-empty id. Supabase returns 400 when id is blank.
    async delete(table, id) {
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        if (id === undefined || id === null || id === '') {
          throw new Error('delete() requires a valid id — received empty value. Check that your fieldMap or filter correctly points to the id input.');
        }
        const token = localStorage.getItem('supabase.auth.token') || supabaseAnonKey;
        let res = await fetch(supabaseUrl + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
          method: 'DELETE',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': 'Bearer ' + token,
            'Prefer': 'return=representation'
          }
        });
        
        let result = {};
        if (res.status !== 204) { result = await res.json(); }
        
        if (!res.ok && result.code === 'PGRST303') {
           localStorage.removeItem('supabase.auth.token');
           localStorage.removeItem('supabase.auth.user');
           res = await fetch(supabaseUrl + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
             method: 'DELETE',
             headers: {
               'apikey': supabaseAnonKey,
               'Authorization': 'Bearer ' + supabaseAnonKey,
               'Prefer': 'return=representation'
             }
           });
           if (res.status !== 204) { result = await res.json(); }
        }

        // 204 No Content is a valid success for DELETE
        if (res.status === 204) return { data: [], error: null };
        if (!res.ok) return { data: null, error: result };
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },

    // ── FIX 3: UPDATE ────────────────────────────────────────────────────────
    // Requires a valid non-empty id. Merges payload into the matched row.
    async update(table, id, data) {
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        if (id === undefined || id === null || id === '') {
          throw new Error('update() requires a valid id — received empty value. Check that your fieldMap or filter correctly points to the id input.');
        }
        const token = localStorage.getItem('supabase.auth.token') || supabaseAnonKey;
        let res = await fetch(supabaseUrl + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(data)
        });
        
        let result = {};
        if (res.status !== 204) { result = await res.json(); }
        
        if (!res.ok && result.code === 'PGRST303') {
           localStorage.removeItem('supabase.auth.token');
           localStorage.removeItem('supabase.auth.user');
           res = await fetch(supabaseUrl + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
             method: 'PATCH',
             headers: {
               'apikey': supabaseAnonKey,
               'Authorization': 'Bearer ' + supabaseAnonKey,
               'Content-Type': 'application/json',
               'Prefer': 'return=representation'
             },
             body: JSON.stringify(data)
           });
           if (res.status !== 204) { result = await res.json(); }
        }
        
        // 204 No Content can also occur
        if (res.status === 204) return { data: [], error: null };
        if (!res.ok) return { data: null, error: result };
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    }
  };

  // ── Integration runner ─────────────────────────────────────────────────────
  window.buildx.run = async function(id, data) {
    data = data || {};
    try {
      const integrations = window.__BUILDX_INTEGRATIONS__ || [];
      const integration = integrations.find(function(i) { return i.id === id; });
      if (!integration) throw new Error('[buildx] Integration not found: ' + id);

      // Ignore accidental DOM element passed as data
      if (typeof HTMLElement !== 'undefined' && data instanceof HTMLElement) {
        data = {};
      }

      const cfg = integration.config || {};
      const operation = cfg.operation || 'select';

      // ── Supabase integrations ────────────────────────────────────────────
      if (integration.type === 'supabase') {
        // FIX 1: Collect live field values from DOM using fieldMap, then merge
        // with any data passed in programmatically. fieldMap wins for typed values.
        var fieldValues = collectFieldValues(cfg.data, cfg.fieldMap);
        var mergedPayload = Object.assign({}, data, fieldValues);

        console.log('[buildx] 🖱️ Button clicked. Starting integration...');

        if (operation === 'select') {
          // Build filters: support both cfg.filters object and cfg.filterField/cfg.filterValue
          var filters = {};
          if (cfg.filters && typeof cfg.filters === 'object') {
            filters = cfg.filters;
          }
          if (cfg.filterField && cfg.filterValue !== undefined) {
            filters[cfg.filterField] = cfg.filterValue;
          }
          // Also allow dynamic filter from fieldMap (e.g. filter by id from an input)
          if (cfg.filterField && fieldValues[cfg.filterField] !== undefined) {
            filters[cfg.filterField] = fieldValues[cfg.filterField];
          }
          var selectResult = await window.buildx.data.select(cfg.table, cfg.selectColumns || '*', filters);
          if (selectResult.error) {
            console.error('[buildx] ❌ Integration failed:', selectResult.error);
            return { success: false, data: null, error: selectResult.error };
          }
          console.log('[buildx] ✅ Integration successful! Result:', selectResult.data);
          return { success: true, data: selectResult.data, error: null };

        } else if (operation === 'insert') {
          if (Object.keys(mergedPayload).length === 0) {
            console.warn('[buildx] ⚠️ Insert called with no field values. Make sure your integration config has a "data" map with "formData.fieldName" values pointing to your input names.');
          }
          var insertResult = await window.buildx.data.insert(cfg.table, mergedPayload);
          if (insertResult.error) {
            console.error('[buildx] ❌ Integration failed:', insertResult.error);
            return { success: false, data: null, error: insertResult.error };
          }
          console.log('[buildx] ✅ Integration successful! Result:', insertResult.data);
          return { success: true, data: insertResult.data, error: null };

        } else if (operation === 'delete') {
          var idField = cfg.idField || 'id';
          var deleteId = mergedPayload[idField] || cfg.deleteId || '';
          // Resolve id from cfg.filterField string (legacy)
          if (!deleteId && cfg.filterField) {
            deleteId = fieldValues[cfg.filterField] || mergedPayload[cfg.filterField] || '';
          }
          // Resolve id from cfg.filters array — format used by BuildX UI
          if (!deleteId && Array.isArray(cfg.filters)) {
            for (var dfi = 0; dfi < cfg.filters.length; dfi++) {
              var dFilterEntry = cfg.filters[dfi];
              var dFilterVal = String(dFilterEntry.value || '');
              var dResolvedVal = '';
              if (dFilterVal.indexOf('formData.') === 0) {
                var dFilterName = dFilterVal.slice('formData.'.length);
                var dFilterEl = (dFilterName.charAt(0) === '#' || dFilterName.charAt(0) === '.')
                  ? document.querySelector(dFilterName)
                  : document.querySelector('[name="' + dFilterName + '"]') || document.getElementById(dFilterName);
                dResolvedVal = dFilterEl ? (dFilterEl.value || '') : '';
              } else {
                dResolvedVal = dFilterVal;
              }
              if (dResolvedVal && (dFilterEntry.column === idField || dFilterEntry.column === 'id')) {
                deleteId = dResolvedVal;
                break;
              }
            }
          }
          var deleteResult = await window.buildx.data.delete(cfg.table, deleteId);
          if (deleteResult.error) {
            console.error('[buildx] ❌ Integration failed:', deleteResult.error);
            return { success: false, data: null, error: deleteResult.error };
          }
          console.log('[buildx] ✅ Integration successful! Result:', deleteResult.data);
          return { success: true, data: deleteResult.data, error: null };

        } else if (operation === 'update') {
          var updIdField = cfg.idField || 'id';
          var updateId = mergedPayload[updIdField] || cfg.updateId || '';
          // Resolve id from cfg.filterField string (legacy)
          if (!updateId && cfg.filterField) {
            updateId = fieldValues[cfg.filterField] || mergedPayload[cfg.filterField] || '';
          }
          // Resolve id from cfg.filters array — format used by BuildX UI:
          // [{ column: "id", operator: "eq", value: "formData.updateid" }]
          if (!updateId && Array.isArray(cfg.filters)) {
            for (var fi = 0; fi < cfg.filters.length; fi++) {
              var filterEntry = cfg.filters[fi];
              var filterVal = String(filterEntry.value || '');
              var resolvedFilterVal = '';
              if (filterVal.indexOf('formData.') === 0) {
                var filterNameOrSel = filterVal.slice('formData.'.length);
                var filterEl = (filterNameOrSel.charAt(0) === '#' || filterNameOrSel.charAt(0) === '.')
                  ? document.querySelector(filterNameOrSel)
                  : document.querySelector('[name="' + filterNameOrSel + '"]') || document.getElementById(filterNameOrSel);
                resolvedFilterVal = filterEl ? (filterEl.value || '') : '';
              } else {
                resolvedFilterVal = filterVal;
              }
              if (resolvedFilterVal && (filterEntry.column === updIdField || filterEntry.column === 'id')) {
                updateId = resolvedFilterVal;
                break;
              }
            }
          }
          var updateBody = Object.assign({}, mergedPayload);
          delete updateBody[updIdField];
          if (Object.keys(updateBody).length === 0) {
            console.warn('[buildx] ⚠️ Update called with no fields to update. Make sure your integration config has a "data" map with "formData.fieldName" values.');
          }
          var updateResult = await window.buildx.data.update(cfg.table, updateId, updateBody);
          if (updateResult.error) {
            console.error('[buildx] ❌ Integration failed:', updateResult.error);
            return { success: false, data: null, error: updateResult.error };
          }
          console.log('[buildx] ✅ Integration successful! Result:', updateResult.data);
          return { success: true, data: updateResult.data, error: null };
        }
      }

      // ── Resend / PayMongo (server-proxied) ───────────────────────────────
      var baseUrl = window.__BUILDX_BASE_URL__ || '';
      var isFileProtocol = window.location.protocol === 'file:';
      var isLocalDev = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port !== '5001';
      var isNullOrigin = baseUrl.startsWith('null/');

      if ((!baseUrl || isNullOrigin) && (isFileProtocol || isLocalDev)) {
        baseUrl = 'http://localhost:5001';
      }

      var endpoint = baseUrl + (integration.type === 'resend' ? '/api/resend' : '/api/paymongo');

      // For PayMongo: collect amount/description from fieldMap if configured
      // Resolve all cfg.data formData references + cfg.fieldMap selectors into the payload
      var resolvedFields = collectFieldValues(cfg.data, cfg.fieldMap);
      var requestPayload = Object.assign({}, data, resolvedFields);
      // Ensure amount is a number (user may have typed it into an input)
      if (requestPayload.amount !== undefined && requestPayload.amount !== '') {
        var parsedAmount = parseFloat(String(requestPayload.amount).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedAmount)) requestPayload.amount = parsedAmount;
      }
      // For PayMongo: if amount still not in payload, use cfg.amount (static value set in UI)
      // Also forward cfg.description and cfg.currency so server uses them
      if (integration.type === 'paymongo') {
        if (!requestPayload.amount && cfg.amount) requestPayload.amount = cfg.amount;
        if (!requestPayload.description && cfg.description) requestPayload.description = cfg.description;
        if (!requestPayload.currency && cfg.currency) requestPayload.currency = cfg.currency;
        // Send current page as the redirect base so server can build success/cancel URLs
        // cfg.successUrl and cfg.cancelUrl can override if set in integration config
        requestPayload.successUrl = cfg.successUrl || window.location.href;
        requestPayload.cancelUrl = cfg.cancelUrl || window.location.href;
      }
      // For Resend: build the email payload from cfg fields + resolved formData values
      if (integration.type === 'resend') {
        var emailBody = {};
        // cfg.to is the recipient (static or dynamic)
        emailBody.to = cfg.to || requestPayload.to || 'delivered@resend.dev';
        emailBody.subject = cfg.subject || requestPayload.subject || 'New Message';
        // Build HTML from all resolved cfg.data fields
        var resolvedDataFields = collectFieldValues(cfg.data, cfg.fieldMap);
        var dataKeys = Object.keys(resolvedDataFields);
        var rowsHtml = '';
        for (var rk = 0; rk < dataKeys.length; rk++) {
          var labelText = dataKeys[rk].replace(/^(resend|form)/i, '').replace(/([A-Z])/g, ' $1').trim();
          labelText = labelText.charAt(0).toUpperCase() + labelText.slice(1);
          rowsHtml += '<tr><td style="padding:10px 16px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #e5e7eb;width:35%;vertical-align:top;">' + labelText + '</td><td style="padding:10px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">' + resolvedDataFields[dataKeys[rk]] + '</td></tr>';
        }
        var projectName = window.__BUILDX_PROJECT_NAME__ || document.title || 'BuildX';
        emailBody.html = dataKeys.length > 0
          ? '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:ui-sans-serif,system-ui,sans-serif;">'
            + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">'
            + '<tr><td align="center">'
            + '<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
            + '<tr><td style="background:#2563eb;padding:28px 32px;">'
            + '<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">' + emailBody.subject + '</h1>'
            + '<p style="margin:6px 0 0;color:#bfdbfe;font-size:13px;">Sent via ' + projectName + '</p>'
            + '</td></tr>'
            + '<tr><td style="padding:8px 0;">'
            + '<table width="100%" cellpadding="0" cellspacing="0">' + rowsHtml + '</table>'
            + '</td></tr>'
            + '<tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">'
            + '<p style="margin:0;color:#9ca3af;font-size:12px;">This message was submitted through ' + projectName + '</p>'
            + '</td></tr>'
            + '</table>'
            + '</td></tr></table>'
            + '</body></html>'
          : (requestPayload.html || '<p>No content</p>');
        // Pass project name to server for the from field
        emailBody.projectName = window.__BUILDX_PROJECT_NAME__ || document.title || 'BuildX';
        requestPayload = emailBody;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      }).catch(function(err) {
        console.error('[buildx] Network Error: Failed to reach ' + endpoint + '. Make sure node server.js is running.');
        throw err;
      });

      const result = await res.json();
      if (!res.ok) {
        console.error('[buildx] ❌ Integration failed:', result);
        return { success: false, data: null, error: result };
      }

      // FIX 4: PayMongo — auto-redirect to the generated checkout link
      if (integration.type === 'paymongo') {
        var checkoutUrl = (result.data && result.data.attributes && result.data.attributes.checkout_url)
          || (result.data && result.data.attributes && result.data.attributes.url)
          || (result.data && result.data.checkout_url)
          || (result.checkout_url);
        if (checkoutUrl) {
          console.log('[buildx] 💳 PayMongo link created. Redirecting to:', checkoutUrl);
          window.location.href = checkoutUrl;
          return { success: true, data: result, error: null };
        } else {
          console.warn('[buildx] ⚠️ PayMongo response did not contain a checkout_url. Full response:', result);
        }
      }

      console.log('[buildx] ✅ Integration successful! Result:', result);
      return { success: true, data: result, error: null };

    } catch (err) {
      console.error('[buildx] ❌ Integration runner error:', err);
      return { success: false, data: null, error: err };
    }
  };

  // ── Form submit handler ────────────────────────────────────────────────────
  document.addEventListener('submit', async function(e) {
    var form = e.target;
    if (!form.classList.contains('auth-form') && !form.classList.contains('dynamic-form') && !form.dataset.action) return;
    e.preventDefault();
    var action = form.dataset.action;
    var formData = new FormData(form);
    var data = Object.fromEntries(formData.entries());
    var msgEl = form.querySelector('.form-msg, .contact-msg, .auth-error, .auth-success');

    try {
      if (action === 'insert' || action === 'update') {
        var table = form.dataset.table;
        var res = await window.buildx.data.insert(table, data);
        if (!res.error) {
          if (msgEl) { msgEl.textContent = 'Success!'; msgEl.style.display = 'block'; }
        } else if (msgEl) {
          msgEl.textContent = 'Error: ' + (res.error.message || 'Submission failed');
          msgEl.style.display = 'block';
        }
      } else if (action === 'signin') {
        var authRes = await window.buildx.auth.signIn(data.email, data.password);
        if (authRes.data && authRes.data.access_token) {
          window.location.href = form.dataset.redirect || 'index.html';
        } else if (msgEl) {
          msgEl.textContent = (authRes.error && (authRes.error.message || authRes.error.error_description)) || 'Auth failed';
          msgEl.style.display = 'block';
        }
      } else if (action === 'signup') {
        var signupRes = await window.buildx.auth.signUp(data.email, data.password);
        if (!signupRes.error) {
          if (msgEl) { msgEl.textContent = 'Sign up successful! Check your email.'; msgEl.style.display = 'block'; }
        } else if (msgEl) {
          msgEl.textContent = signupRes.error.message || signupRes.error.error_description || 'Sign up failed';
          msgEl.style.display = 'block';
        }
      } else if (action === 'contact') {
        var integrations = window.__BUILDX_INTEGRATIONS__ || [];
        var resend = integrations.find(function(i) { return i.type === 'resend'; });
        if (resend) {
          var mailResult = await window.buildx.run(resend.id, { to: 'you@example.com', subject: 'Contact Form', html: JSON.stringify(data) });
          if (mailResult.success) {
            if (msgEl) { msgEl.textContent = 'Message sent!'; msgEl.style.display = 'block'; }
          } else if (msgEl) {
            msgEl.textContent = 'Error: ' + (mailResult.error && mailResult.error.message || 'Failed to send');
            msgEl.style.display = 'block';
          }
        }
      }
    } catch (err) {
      if (msgEl) { msgEl.textContent = 'Error: ' + err.message; msgEl.style.display = 'block'; }
    }
  });
})();
`;

export const generateProjectFiles = (
  components: ComponentData[],
  pages: any[],
  projectName: string,
  userConfig?: {
    paymongoKey?: string;
    resendApiKey?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    supabaseAnonKey?: string;
    supabaseServiceKey?: string;
  },
  fileOverrides: Record<string, string> = {},
): Record<string, string> => {
  const migratedComponents = migrateToReadableIds(components);
  const sortedComponents = sortComponentsByPosition(migratedComponents);
  const defaultPage =
    pages && pages.length > 0 ? slugify(pages[0].name) : "home";

  const files: Record<string, string> = {
    "public/index.html": `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=${defaultPage}.html"></head>\n<body>Redirecting to <a href="${defaultPage}.html">${defaultPage}</a></body>\n</html>`,
    "public/assets/css/global.css": indexCss + "\n\n" + GLOBAL_RESPONSIVE_CSS,
    "public/assets/css/styles.css": `/* Styles */\n@import "global.css";`,
    "README.md": `# ${projectName}\n\nGenerated by BuildX Vanilla JS Builder.\n\n## How to Run Locally\n\nThis project includes a bundled Node.js server (\`server.js\`) that handles static files and backend integrations (Supabase, Resend, PayMongo).\n\n### Prerequisites\n- **Node.js** (Version 18 or higher is recommended)\n\n### Installation & Running\n1.  **Check Configuration**: Open \`config.json\` and ensure your API keys and Supabase credentials are correct.\n2.  **Start the Server**: Run the following command in your terminal:\n    \`\`\`bash\n    node server.js\n    \`\`\`\n3.  **Open in Browser**: Navigate to \`http://localhost:5001\`.\n\n## Project Structure\n- \`public/\`: Frontend assets (HTML, CSS, JS).\n- \`config.json\`: Project credentials and configuration.\n- \`server.js\`: Local development server and API proxy.\n`,
    "config.json": JSON.stringify({
      supabaseUrl: userConfig?.supabaseUrl || "",
      supabaseAnonKey: userConfig?.supabaseKey || userConfig?.supabaseAnonKey || "",
      paymongoSecretKey: userConfig?.paymongoKey || "",
      resendApiKey: userConfig?.resendApiKey || ""
    }, null, 2),
    "server.js": `const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5001;
const CONFIG = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const server = http.createServer(async (req, res) => {
  // Add permissive CORS for local development across different ports
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];
  
  if (url === '/config.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      supabaseUrl: CONFIG.supabaseUrl,
      supabaseAnonKey: CONFIG.supabaseAnonKey
    }));
    return;
  }

  // Static file server
  let filePath = path.join(__dirname, 'public', url === '/' ? 'index.html' : url);
  if (!path.extname(filePath)) filePath += '.html';

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpg', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    return fs.createReadStream(filePath).pipe(res);
  }

  // API Endpoints
  if (req.url.startsWith('/api/resend') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body) || {};
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + CONFIG.resendApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: data.from || (data.projectName ? data.projectName + ' <onboarding@resend.dev>' : 'Acme <onboarding@resend.dev>'),
            to: Array.isArray(data.to) ? data.to : [data.to || 'delivered@resend.dev'],
            subject: data.subject || 'New Message',
            html: data.html || '<p>No content</p>'
          })
        });
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(await response.text());
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url.startsWith('/api/paymongo') && req.method === 'POST') {
     let body = '';
     req.on('data', chunk => body += chunk);
     req.on('end', async () => {
       try {
         const data = JSON.parse(body) || {};
         const amountInCentavos = Math.round((parseFloat(data.amount) || 100) * 100);
         const lineItems = [{
           amount: amountInCentavos,
           currency: data.currency || 'PHP',
           description: data.description || 'Payment',
           name: data.description || 'Payment',
           quantity: 1
         }];
         const sessionBody = {
           data: {
             attributes: {
               billing: { name: '', email: '' },
               line_items: lineItems,
               payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay', 'billease', 'dob', 'brankas_bdo', 'brankas_landbank', 'brankas_metrobank'],
               success_url: data.successUrl || 'http://localhost:5001',
               cancel_url: data.cancelUrl || 'http://localhost:5001',
               description: data.description || 'Payment'
             }
           }
         };
         const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
           method: 'POST',
           headers: { 'accept': 'application/json', 'authorization': 'Basic ' + Buffer.from(CONFIG.paymongoSecretKey + ':').toString('base64'), 'content-type': 'application/json' },
           body: JSON.stringify(sessionBody)
         });
         res.writeHead(response.status, { 'Content-Type': 'application/json' });
         res.end(await response.text());
       } catch (err) {
         res.writeHead(400, { 'Content-Type': 'application/json' });
         res.end(JSON.stringify({ error: err.message }));
       }
     });
     return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));`,
    // Use the fixed BUILDX_SDK constant
    "public/assets/js/buildx-sdk.js": BUILDX_SDK,
    ".env.example": `SUPABASE_URL=\nSUPABASE_ANON_KEY=\n`,
  };

  pages.forEach((page, index) => {
    const fileName = slugify(page.name);
    // Filter for components that belong to this page, are global, or fallback to home for unassigned components
    const pageComponents = sortedComponents.filter((c) => {
      // If component uses the new array format (e.g. from PropertiesPanel)
      if (c.page_ids && Array.isArray(c.page_ids) && c.page_ids.length > 0) {
        if (c.page_ids.includes("all")) return true;
        return c.page_ids.includes(page.id) || (!page.id && c.page_ids.includes("home"));
      }
      // Fallback for older components using the string format
      return (
        c.page_id === page.id ||
        c.page_id === "all" ||
        (!c.page_id && (page.id === "home" || index === 0))
      );
    });
    const bodyContent =
      `<div class="canvas-container">\n` +
      (pageComponents.length > 0
        ? pageComponents.map((c) => renderComponentToHTML(c, 1)).join("\n")
        : "  <!-- No components -->") +
      `\n</div>`;
    const allPageComponents = collectAllComponents(pageComponents);
    const integrationsJson = JSON.stringify(
      allPageComponents.flatMap((c) =>
        (Array.isArray(c.props?.integrations) ? c.props.integrations : []).map(i => ({
          ...i,
          config: {
            ...i.config,
            // Enhanced typo correction for select columns
            selectColumns: i.config?.selectColumns ? correctColumnTypos(i.config.selectColumns.replace(/\s+/g, '')) : '*'
          }
        }))
      ),
    );
    const htmlPath = `public/${fileName}.html`;
    files[htmlPath] = fileOverrides[htmlPath] || generateHTMLWrapper(
      page.name,
      fileName,
      bodyContent,
      integrationsJson,
      projectName,
    );

    const componentCssBlocks = allPageComponents
      .filter(
        (c) =>
          (c.style && Object.keys(c.style).length > 0) ||
          (c as any).position != null ||
          FULL_WIDTH_TYPES.has(c.type),
      )
      .map((c) => buildResponsiveCss(c, (c as any).position));
    const customComponentCss = allPageComponents
      .filter((c) => c.type === "custom-component" && c.props?.css)
      .map((c) => `/* CSS for ${c.id} */\n${c.props.css}`);
    const propsCss = allPageComponents
      .filter((c) => c.props?.css && c.type !== "custom-component")
      .map(
        (c) =>
          `/* CSS from props for ${compIdClass(c)} */\n${c.props.css.replace(/\$elementId/g, c.props.elementId || compIdClass(c))}`,
      );

    // Collect CSS from block-transpiler for blocks that have dedicated transpilers
    const transpilerCss = allPageComponents
      .filter((c) => hasTranspiler(c.type) && !c.props?.css && c.type !== "custom-component")
      .map((c) => transpileCSS(c))
      .filter((css) => css && !css.startsWith("/*"));

    // Collect JS from block-transpiler for interactive blocks (accordion, tabs, modal, etc.)
    // Explicitly exclude custom-component — their JS runs inside the IIFE wrapper in generatePageJS
    // and must NOT be re-emitted here without $/$$ context, which causes ReferenceError crashes.
    const transpilerJs = allPageComponents
      .filter((c) => hasTranspiler(c.type) && !c.props?.js_handler && c.type !== "custom-component")
      .map((c) => {
        let handler = transpileJS(c);
        if (handler && (handler.includes("<?php") || handler.includes("?>"))) {
          handler = scrubPHP(handler);
        }
        return handler;
      })
      .filter(Boolean);

    const cssPath = `public/assets/css/${fileName}.css`;
    files[cssPath] = fileOverrides[cssPath] || [
      `/* ${page.name} styles */`,
      ...transpilerCss,
      ...propsCss,
      ...componentCssBlocks,
      ...customComponentCss,
    ]
      .filter(Boolean)
      .join("\n\n");

    const jsPath = `public/assets/js/${fileName}.js`;
    let jsContent = fileOverrides[jsPath] || generatePageJS(pageComponents, page.name);

    // Inject transpiler JS for interactive blocks (accordion, tabs, modal, alert, carousel, etc.)
    if (!fileOverrides[jsPath] && transpilerJs.length > 0) {
      // Append transpiler JS inside the DOMContentLoaded wrapper
      const closingTag = "});";
      const lastIdx = jsContent.lastIndexOf(closingTag);
      if (lastIdx !== -1) {
        jsContent = jsContent.substring(0, lastIdx) + "\n\n  // Block transpiler scripts\n  " + transpilerJs.join("\n\n  ") + "\n" + closingTag;
      } else {
        jsContent += "\n\n" + transpilerJs.join("\n\n");
      }
    }


    if (fileOverrides[jsPath]) {
      allPageComponents.forEach((c) => {
        const compId = compIdClass(c);
        const openingMarker = `/* [CANVAS-INJECTION]: ${compId}`;
        const closingMarker = `/* [END-CANVAS-INJECTION]: ${compId} */`;

        let handler = c.props?.js_handler ? processJsHandler(c) : "";
        let cjs = c.type === "custom-component" ? c.props?.js : "";

        if (!(handler || cjs)) return;

        // Scrub PHP from handler and cjs if present
        if (handler.includes("<?php") || handler.includes("?>")) {
          handler = scrubPHP(handler);
        }
        if (cjs && (cjs.includes("<?php") || cjs.includes("?>"))) {
          cjs = scrubPHP(cjs);
        }

        let newInnerContent = "";
        const targetElementId = c.props?.elementId || compId;
        if (c.type === "custom-component" && cjs) {
          newInnerContent = `(function() {\n  const element = document.getElementById("${targetElementId}");\n  if (!element) return;\n  const $ = (s) => element.querySelector(s);\n  const $$ = (s) => element.querySelectorAll(s);\n  try {\n    (function(element, $, $$) {\n${cjs}\n    })(element, $, $$);\n  } catch (err) {\n    console.error('Error in custom component [${c.id}] JS:', err);\n  }\n})();`;
        } else {
          newInnerContent = `(function(elementId) {\n  const $elementId = elementId;\n${handler.replace(/\$elementId/g, targetElementId)}\n})("${targetElementId}");`;
        }

        // Simple hash for the content
        const contentHash = Array.from(newInnerContent).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString(16);
        const fullOpeningMarker = `${openingMarker} | hash:${contentHash} */`;
        const newInjection = `\n${fullOpeningMarker}\n${newInnerContent}\n${closingMarker}\n`;

        const startIdx = jsContent.indexOf(openingMarker);
        if (startIdx !== -1) {
          const endIdx = jsContent.indexOf(closingMarker, startIdx);
          if (endIdx !== -1) {
            const blockContent = jsContent.substring(startIdx, endIdx + closingMarker.length);
            const currentHashMatch = blockContent.match(/hash:([a-f0-9-]+)/);
            const currentHash = currentHashMatch ? currentHashMatch[1] : null;

            const innerStart = jsContent.indexOf("*/", startIdx) + 2;
            const currentInner = jsContent.substring(innerStart, endIdx).trim();

            const actualHash = Array.from(currentInner).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString(16);

            if (currentHash === actualHash) {
              if (currentHash !== contentHash) {
                jsContent = jsContent.replace(blockContent, newInjection.trim());
              }
            }
            // else: user edited manually, don't overwrite
          }
        } else {
          // Missing — assertive insert
          if (jsContent.includes("});")) {
            const parts = jsContent.split("});");
            const lastPart = parts.pop();
            jsContent = parts.join("});") + newInjection + "});" + lastPart;
          } else {
            jsContent += newInjection;
          }
        }
      });
    }
    files[jsPath] = jsContent;
  });

  return files;
};