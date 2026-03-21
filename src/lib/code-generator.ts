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
  const isAutoClass = !userClass
    || userClass.trim() === idClass
    || /^comp-/.test(userClass.trim().split(/\s+/)[0]);
  return isAutoClass ? idClass : `${idClass} ${userClass}`;
};

const scalePx = (value: number, ratio: number): string =>
  `${Math.round(value * ratio)}px`;

const FULL_WIDTH_TYPES = new Set(["navbar", "hero", "footer", "section-heading"]);

const buildResponsiveCss = (
  component: ComponentData,
  position: { x: number; y: number } | undefined,
): string => {
  const style = component.style ?? {};
  const cls = `.${compIdClass(component)}`;
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
    if (["left", "top", "right", "bottom", "width", "height"].includes(key)) continue;
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

    for (const pad of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const) {
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
  const props = component.props ?? {};
  const cls = compClass(component);
  const idAttr = ` id="${esc(props.elementId || compIdClass(component))}"`;
  const btnId = component.type === "button" ? ` id="btn-${compIdClass(component)}"` : "";
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
      const links: string[] = Array.isArray(props.links) && props.links.length > 0 ? props.links : ["Home", "About", "Contact"];
      const linkUrls: string[] = Array.isArray(props.linkUrls) ? props.linkUrls : [];
      const linkItems = links.map((l: string, i: number) => {
        const raw = linkUrls[i];
        const href = raw && raw.trim() !== "" && raw.trim() !== "#" ? raw.trim() : "#";
        return `${indent}    <li><a href="${esc(href)}">${esc(l)}</a></li>`;
      }).join("\n");
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
      return `${indent}<input${idAttr} class="${cls}" type="${esc(props.type) || "text"}" placeholder="${esc(props.placeholder)}" />`;
    case "textarea":
      return `${indent}<textarea${idAttr} class="${cls}" placeholder="${esc(props.placeholder)}"></textarea>`;
    case "container":
    case "group":
      return `${indent}<div${idAttr} class="${cls}" data-component-type="${component.type}">\n${childOutput || `${indent}  <!-- ${component.type} -->`}\n${indent}</div>`;
    case "grid":
      return `${indent}<div${idAttr} class="${cls}" data-component-type="grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">\n${childOutput || `${indent}  <!-- grid -->`}\n${indent}</div>`;
    case "form":
      return `${indent}<form${idAttr} class="${cls}" data-component-type="form">\n${childOutput || `${indent}  <!-- form -->`}\n${indent}</form>`;
    case "video":
      return [
        `${indent}<div${idAttr} class="${cls}">`,
        `${indent}  <video controls${props.poster ? ` poster="${esc(props.poster)}"` : ""}>`,
        props.src ? `${indent}    <source src="${esc(props.src)}" type="video/mp4" />` : "",
        `${indent}  </video>`,
        `${indent}</div>`,
      ].filter(Boolean).join("\n");
    case "custom-component": {
      const html = props.html || "";
      const php = props.php || "";
      let innerOutput = php ? `<?php\n${indent}${php}\n${indent}?>\n${indent}${html}` : html;
      return `${indent}<div${idAttr} class="${cls}" data-component-type="custom-component">\n${indent}  ${innerOutput}\n${indent}</div>`;
    }
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

  const allComponents = collectAllComponents(components);
  const customScripts = allComponents
    .filter(c => c.type === "custom-component" && c.props?.js)
    .map(c => {
      const id = compIdClass(c);
      return `// Custom JS for ${c.id}
(function() {
  const element = document.getElementById("${id}");
  if (!element) {
    console.error('Custom component element not found: ${id}');
    return;
  }
  
  try {
    (function(element) {
      const $ = (selector) => {
        let found = element.querySelector(selector);
        if (!found) found = document.querySelector(selector);
        return found;
      };
      
      const $$ = (selector) => {
        let found = element.querySelectorAll(selector);
        if (found.length === 0) found = document.querySelectorAll(selector);
        return found;
      };
      
      const querySelector = $;
      const querySelectorAll = $$;
      
      console.log('Executing JS for custom component: ${id}');
      
${c.props.js}
      
      console.log('Custom component JS execution completed: ${id}');
    })(element);
  } catch (err) {
    console.error('Error in custom component [${c.id}] JS:', err);
    const outputEl = element.querySelector('#output, .output, .error-display');
    if (outputEl) {
      outputEl.textContent = 'JavaScript Error: ' + err.message;
      outputEl.style.color = 'red';
    }
  }
})();`;
    }).join("\n\n");

  return `document.addEventListener("DOMContentLoaded", () => {
  console.log("${pageName} page loaded");
${navScript}
  ${listeners || "// No interactive components."}

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
html, body { margin: 0; padding: 0; overflow-x: hidden; }

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
const generateHTMLWrapper = (pageName: string, fileName: string, bodyContent: string, integrationsJson: string = '[]'): string =>
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
  <script>
    window.__BUILDX_INTEGRATIONS__ = ${integrationsJson};
    window.__BUILDX_BASE_URL__ = "<?php echo rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\\\'); ?>";
  </script>
  <script src="assets/js/buildx-sdk.js"></script>
  <script src="assets/js/${fileName}.js"></script>
</body>
</html>`;

// ─── Main export ──────────────────────────────────────────────────────────────
const SEMANTIC_SUFFIXES_GEN: Record<string, string[]> = {
  navbar: ["main", "top", "site", "primary"], hero: ["main", "banner", "top", "landing"],
  footer: ["main", "site", "bottom", "primary"], heading: ["title", "main", "primary", "section"],
  text: ["body", "content", "copy", "description"], paragraph: ["intro", "body", "content", "description"],
  button: ["primary", "cta", "action", "submit"], image: ["main", "hero", "cover", "featured"],
  input: ["field", "name", "email", "search"], textarea: ["message", "bio", "notes", "content"],
  select: ["field", "option", "filter", "dropdown"], checkbox: ["field", "agree", "option", "toggle"],
  "radio-group": ["options", "choice", "field", "selector"], card: ["item", "feature", "product", "profile"],
  container: ["wrapper", "section", "block", "content"], grid: ["layout", "gallery", "features", "cards"],
  form: ["contact", "signup", "login", "subscribe"], divider: ["section", "main", "content", "break"],
  accordion: ["faq", "main", "content", "details"], tabs: ["main", "content", "sections", "nav"],
  modal: ["dialog", "popup", "confirm", "info"], alert: ["info", "warning", "success", "error"],
  table: ["data", "main", "list", "records"], gallery: ["images", "portfolio", "photos", "work"],
  carousel: ["slides", "hero", "featured", "promo"], "section-heading": ["main", "about", "features", "services"],
  "sign-in": ["form", "main", "user", "auth"], "sign-up": ["form", "main", "register", "auth"],
  "paymongo-button": ["pay", "checkout", "buy", "order"], video: ["main", "hero", "promo", "embed"],
};

function pickReadableId(type: string, used: Set<string>): string {
  const suffixes = SEMANTIC_SUFFIXES_GEN[type] ?? ["main", "content", "block", "section"];
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

function migrateToReadableIds(components: ComponentData[]): ComponentData[] {
  const used = new Set(components.filter(c => isReadableId(c.id)).map(c => c.id));
  const migrate = (c: ComponentData): ComponentData => {
    const newId = isReadableId(c.id) ? c.id : pickReadableId(c.type, used);
    return { ...c, id: newId, children: c.children?.map(migrate) };
  };
  return components.map(migrate);
}

export const generateProjectFiles = (
  components: ComponentData[],
  pages: any[],
  projectName: string,
  userConfig?: {
    paymongoKey?: string
    resendApiKey?: string
    supabaseUrl?: string
    supabaseKey?: string
    supabaseAnonKey?: string
    supabaseServiceKey?: string
  },
): Record<string, string> => {
  const migratedComponents = migrateToReadableIds(components);
  const defaultPage = pages && pages.length > 0 ? slugify(pages[0].name) : "home";

  const files: Record<string, string> = {
    "public/index.php": `<?php
session_start();
$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : '';
$url = filter_var($url, FILTER_SANITIZE_URL);
if (empty($url) || $url === 'index.php') { $url = '${defaultPage}'; }
if (strpos($url, 'api/') === 0) {
    $apiFile = __DIR__ . '/../app/' . $url . '.php';
    if (file_exists($apiFile)) { require_once $apiFile; exit; }
    else { http_response_code(404); echo json_encode(['error' => 'API endpoint not found']); exit; }
}
$viewFile = __DIR__ . '/../app/views/' . $url . '.php';
if (file_exists($viewFile)) { require_once $viewFile; }
else { http_response_code(404); echo "<h1>404 Not Found</h1>"; }
?>`,
    "app/views/layout.php": `<?php // Global Layout ?>`,
    "public/assets/css/global.css": GLOBAL_RESPONSIVE_CSS,
    "public/assets/css/styles.css": `/* Styles */\n@import "global.css";`,
    "config/database.php": `<?php\nreturn [\n    "db_host" => "db.supabase.co",\n    "db_name" => "postgres",\n];`,
    "README.md": `# ${projectName}\nGenerated by PHP Builder.`,
    "config/supabase.php": `<?php
define('SUPABASE_URL', '${userConfig?.supabaseUrl || "https://your-project.supabase.co"}');
define('SUPABASE_ANON_KEY', '${userConfig?.supabaseKey || userConfig?.supabaseAnonKey || "your-anon-key"}');
define('SUPABASE_SERVICE_KEY', '${userConfig?.supabaseServiceKey || "your-service-role-key"}');
`,
    "config/paymongo.php": `<?php\ndefine('PAYMONGO_SECRET_KEY', '${userConfig?.paymongoKey || ""}');\ndefine('PAYMONGO_PUBLIC_KEY', '');\n`,
    "config/resend.php": `<?php\ndefine('RESEND_API_KEY', '${userConfig?.resendApiKey || ""}');\n`,
    "app/lib/supabase.php": `<?php
require_once __DIR__ . '/../../config/supabase.php';

class Supabase {
  private string $url;
  private string $key;

  public function __construct(bool $useServiceKey = false) {
    $this->url = rtrim(SUPABASE_URL, '/');
    $this->key = $useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  }

  private function request(string $method, string $endpoint, array $body = [], array $query = [], array $headers = []): array {
    $url = $this->url . '/rest/v1/' . ltrim($endpoint, '/');
    if (!empty($query)) $url .= '?' . http_build_query($query);
    $ch = curl_init($url);
    $defaultHeaders = ['apikey: ' . $this->key, 'Authorization: Bearer ' . $this->key, 'Content-Type: application/json', 'Prefer: return=representation'];
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_CUSTOMREQUEST => strtoupper($method), CURLOPT_HTTPHEADER => array_merge($defaultHeaders, $headers)]);
    if (!empty($body)) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($response, true);
    return ['data' => $decoded, 'status' => $status, 'error' => ($status >= 400) ? $decoded : null];
  }

  public function signUp(string $email, string $password, array $metadata = []): array {
    $ch = curl_init($this->url . '/auth/v1/signup');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode(['email' => $email, 'password' => $password, 'data' => $metadata]), CURLOPT_HTTPHEADER => ['apikey: ' . $this->key, 'Content-Type: application/json']]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $res = json_decode($response, true);
    return ['data' => $res, 'status' => $status, 'error' => $status >= 400 ? $res : null];
  }

  public function signIn(string $email, string $password): array {
    $ch = curl_init($this->url . '/auth/v1/token?grant_type=password');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode(['email' => $email, 'password' => $password]), CURLOPT_HTTPHEADER => ['apikey: ' . $this->key, 'Content-Type: application/json']]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $res = json_decode($response, true);
    return ['data' => $res, 'status' => $status, 'error' => $status >= 400 ? $res : null];
  }

  public function signOut(string $accessToken): array {
    $ch = curl_init($this->url . '/auth/v1/logout');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['apikey: ' . $this->key, 'Authorization: Bearer ' . $accessToken, 'Content-Type: application/json']]);
    curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status];
  }

  public function getUser(string $accessToken): array {
    $ch = curl_init($this->url . '/auth/v1/user');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_HTTPHEADER => ['apikey: ' . $this->key, 'Authorization: Bearer ' . $accessToken]]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $res = json_decode($response, true);
    return ['data' => $res, 'status' => $status, 'error' => $status >= 400 ? $res : null];
  }

  private function buildQuery(array $filters): array {
    $query = [];
    foreach ($filters as $col => $val) {
      if (is_array($val) && isset($val['column'], $val['operator'], $val['value'])) {
        $column = $val['column'];
        $op = $val['operator'];
        $value = $val['value'];
        if ($value === null || $value === '') continue;
        $query[$column] = $op . '.' . $value;
      } else if (!is_array($val)) {
        if ($val === null || $val === '') continue;
        if (is_string($val) && strpos($val, '.') !== false) { $query[$col] = $val; }
        else { $query[$col] = 'eq.' . $val; }
      }
    }
    return $query;
  }

  public function select(string $table, string $columns = '*', array $filters = [], ?int $limit = null, ?int $offset = null, ?string $order = null): array {
    $query = $this->buildQuery($filters);
    $query['select'] = $columns;
    if ($limit !== null) $query['limit'] = $limit;
    if ($offset !== null) $query['offset'] = $offset;
    if ($order !== null) $query['order'] = $order;
    return $this->request('GET', $table, [], $query);
  }

  public function insert(string $table, array $data): array { return $this->request('POST', $table, $data); }

  public function update(string $table, array $data, array $filters = []): array {
    $query = $this->buildQuery($filters);
    return $this->request('PATCH', $table, $data, $query);
  }

  public function delete(string $table, array $filters = []): array {
    $query = $this->buildQuery($filters);
    return $this->request('DELETE', $table, [], $query);
  }

  public function rpc(string $functionName, array $params = []): array {
    $ch = curl_init($this->url . '/rest/v1/rpc/' . $functionName);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($params), CURLOPT_HTTPHEADER => ['apikey: ' . $this->key, 'Authorization: Bearer ' . $this->key, 'Content-Type: application/json']]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $res = json_decode($response, true);
    return ['data' => $res, 'status' => $status, 'error' => $status >= 400 ? $res : null];
  }
}

class SupabaseSession {
  public static function start(): void { if (session_status() === PHP_SESSION_NONE) session_start(); }
  public static function setUser(array $authData): void { self::start(); $_SESSION['supabase_access_token'] = $authData['access_token'] ?? ''; $_SESSION['supabase_user'] = $authData['user'] ?? []; }
  public static function getUser(): ?array { self::start(); return $_SESSION['supabase_user'] ?? null; }
  public static function getAccessToken(): ?string { self::start(); return $_SESSION['supabase_access_token'] ?? null; }
  public static function isLoggedIn(): bool { self::start(); return !empty($_SESSION['supabase_access_token']); }
  public static function clear(): void { self::start(); unset($_SESSION['supabase_access_token'], $_SESSION['supabase_user']); }
  public static function requireAuth(string $redirectTo = '/login'): void { if (!self::isLoggedIn()) { header('Location: ' . $redirectTo); exit; } }
}
`,
    "app/api/auth.php": `<?php
require_once __DIR__ . '/../lib/supabase.php';
header('Content-Type: application/json');
SupabaseSession::start();
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? '';
$db = new Supabase();
$res = null;
switch ($action) {
  case 'signup': $res = $db->signUp($body['email'] ?? '', $body['password'] ?? '', $body['metadata'] ?? []); break;
  case 'signin':
    $res = $db->signIn($body['email'] ?? '', $body['password'] ?? '');
    if ($res['status'] === 200) SupabaseSession::setUser($res['data']);
    break;
  case 'signout': SupabaseSession::clear(); $res = ['status' => 200, 'data' => ['message' => 'Signed out']]; break;
  default: http_response_code(400); echo json_encode(['error' => 'Unknown action']); exit;
}
if ($res) { http_response_code($res['status'] ?? 200); echo json_encode($res); }
`,
    "app/api/data.php": `<?php
require_once __DIR__ . '/../lib/supabase.php';
header('Content-Type: application/json');
$db = new Supabase();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
  $table = $_GET['table'] ?? '';
  $columns = $_GET['select'] ?? '*';
  $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
  $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : null;
  $order = $_GET['order'] ?? null;
  $reserved = ['table','select','limit','offset','order'];
  $filters = array_diff_key($_GET, array_flip($reserved));
  $res = $db->select($table, $columns, $filters, $limit, $offset, $order);
  http_response_code($res['status'] ?? 200);
  echo json_encode($res);
  exit;
}
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$table = $body['table'] ?? '';
$action = $body['action'] ?? $method;
$data = $body['data'] ?? [];
$filters = $body['filters'] ?? [];
$res = null;
switch (strtolower($action)) {
  case 'insert': case 'post': $res = $db->insert($table, $data); break;
  case 'update': case 'patch': $res = $db->update($table, $data, $filters); break;
  case 'delete': $res = $db->delete($table, $filters); break;
  default: http_response_code(400); echo json_encode(['error' => 'Unknown action']); exit;
}
if ($res) { http_response_code($res['status'] ?? 200); echo json_encode($res); }
`,
    "app/api/resend.php": `<?php
require_once __DIR__ . '/../../config/resend.php';
header('Content-Type: application/json');
$body = json_decode(file_get_contents('php://input'), true);
$ch = curl_init('https://api.resend.com/emails');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode(['from' => 'Acme <onboarding@resend.dev>', 'to' => [$body['to']], 'subject' => $body['subject'], 'html' => $body['html']]),
  CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . RESEND_API_KEY, 'Content-Type: application/json'],
]);
echo curl_exec($ch);
curl_close($ch);
`,
    "app/api/paymongo.php": `<?php
require_once __DIR__ . '/../../config/paymongo.php';
header('Content-Type: application/json');
$body = json_decode(file_get_contents('php://input'), true);
$ch = curl_init('https://api.paymongo.com/v1/links');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode(['data' => ['attributes' => ['amount' => $body['amount'] * 100, 'description' => $body['description'], 'currency' => $body['currency']]]]),
  CURLOPT_HTTPHEADER => ['accept: application/json', 'authorization: Basic ' . base64_encode(PAYMONGO_SECRET_KEY . ':'), 'content-type: application/json'],
]);
echo curl_exec($ch);
curl_close($ch);
`,
    "public/assets/js/buildx-sdk.js": `
(function() {
  window.buildx = window.buildx || {};
  
  function renderTemplate(template, data) {
    return template.replace(/\\{\\{formData\\.([^}]+)\\}\\}/g, (match, key) => data[key] || '');
  }

  window.buildx.run = async function(integrationId) {
    const integrations = window.__BUILDX_INTEGRATIONS__ || [];
    const config = integrations.find(i => i.id === integrationId);
    
    if (!config) {
      console.error('[buildx] Integration not found:', integrationId);
      return { success: false, error: 'Integration not found' };
    }

    try {
      if (config.type === 'supabase') {
        const table = config.config.table || '';
        const operation = config.config.operation || 'select';
        
        let formData = {};
        if (config.config.data) {
          Object.entries(config.config.data).forEach(([key, val]) => {
            if (typeof val === 'string' && val.startsWith('formData.')) {
              let id = val.replace('formData.', '');
              if (!id.startsWith('#')) id = '#' + id;
              const el = document.querySelector(id);
              if (el) {
                formData[key] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? parseFloat(el.value) : el.value);
              } else { formData[key] = ''; }
            } else { formData[key] = val; }
          });
        }
        
        const resolvedFilters = (config.config.filters || []).map(f => {
          let val = f.value;
          if (typeof val === 'string' && val.startsWith('formData.')) {
            let id = val.replace('formData.', '');
            if (!id.startsWith('#')) id = '#' + id;
            const el = document.querySelector(id);
            if (el) {
              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                val = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? parseFloat(el.value) : el.value);
              } else { val = el.innerText; }
            } else { val = ''; }
          }
          return { ...f, value: val };
        });

        const baseUrl = window.__BUILDX_BASE_URL__ || '';
        if (operation === 'select') {
          const params = new URLSearchParams();
          params.append('table', table);
          params.append('select', config.config.selectColumns || '*');
          resolvedFilters.forEach(f => {
            if (f.column && f.operator && f.value !== '' && f.value !== null) {
              // Always include operator for PostgREST
              const op = f.operator + '.';
              params.append(f.column, op + f.value);
            }
          });

          const res = await fetch(baseUrl + '/api/data?' + params.toString());
          const data = await res.json();
          return { success: res.ok, data: data.data !== undefined ? data.data : data };
        } else {
          const payload = { table, action: operation, data: formData, filters: resolvedFilters };
          const res = await fetch(baseUrl + '/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          return { success: res.ok, data: data.data !== undefined ? data.data : data };
        }
      } 
      else if (config.type === 'resend') {
        let formData = {};
        if (config.config.data) {
          Object.entries(config.config.data).forEach(([key, val]) => {
            if (typeof val === 'string' && val.startsWith('formData.')) {
              let id = val.replace('formData.', '');
              if (!id.startsWith('#')) id = '#' + id;
              const el = document.querySelector(id);
              if (el) formData[key] = el.type === 'checkbox' ? el.checked : el.value;
            } else { formData[key] = val; }
          });
        }
        const emailRows = Object.entries(formData).map(([label, value]) => '<tr><td>' + label + '</td><td>' + value + '</td></tr>').join('');
        const html = '<table>' + emailRows + '</table>';
        const to = config.config.to || 'test@example.com';
        const subject = 'New Submission';
        const baseUrl = window.__BUILDX_BASE_URL__ || '';
        const res = await fetch(baseUrl + '/api/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, html })
        });
        const data = await res.json();
        return { success: res.ok, data };
      }
      else if (config.type === 'paymongo') {
        const baseUrl = window.__BUILDX_BASE_URL__ || '';
        const res = await fetch(baseUrl + '/api/paymongo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: config.config.amount || 100, currency: config.config.currency || 'PHP', description: config.config.description || 'Payment' })
        });
        const data = await res.json();
        if (res.ok && data.data && data.data.attributes && data.data.attributes.checkout_url) {
           window.location.href = data.data.attributes.checkout_url;
           return { success: true, data };
        }
        return { success: false, error: 'Checkout URL not created' };
      }
      return { success: false, error: 'Unknown integration' };
    } catch (e) {
      console.error('[buildx] Error:', e);
      return { success: false, error: e.message };
    }
  };
})();
`,
    ".env.example": `SUPABASE_URL=\nSUPABASE_ANON_KEY=\n`,
    ".htaccess": `RewriteEngine On\nRewriteRule ^$ public/index.php [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteCond %{REQUEST_URI} !/public/\nRewriteRule ^(.*)$ public/$1 [L]`,
    "public/.htaccess": `RewriteEngine On\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^(.*)$ index.php?url=$1 [QSA,L]`,
  };

  pages.forEach((page, index) => {
    const fileName = slugify(page.name);
    const pageComponents = migratedComponents.filter(c => c.page_id === page.id || c.page_id === "all" || (!c.page_id && (page.id === "home" || index === 0)));
    const bodyContent = `<div class="canvas-container">\n` + (pageComponents.length > 0 ? pageComponents.map(c => renderComponentToPHP(c, 1)).join("\n") : "  <!-- No components -->") + `\n</div>`;
    const allPageComponents = collectAllComponents(pageComponents);
    const integrationsJson = JSON.stringify(allPageComponents.flatMap(c => Array.isArray(c.props?.integrations) ? c.props.integrations : []));
    files[`app/views/${fileName}.php`] = generateHTMLWrapper(page.name, fileName, bodyContent, integrationsJson);
    const componentCssBlocks = allPageComponents.filter(c => (c.style && Object.keys(c.style).length > 0) || c.type === "navbar").map(c => buildResponsiveCss(c, (c as any).position));
    const customComponentCss = allPageComponents.filter(c => c.type === "custom-component" && c.props?.css).map(c => `/* CSS for ${c.id} */\n${c.props.css}`);
    files[`public/assets/css/${fileName}.css`] = [`/* ${page.name} styles */`, ...componentCssBlocks, ...customComponentCss].filter(Boolean).join("\n\n");
    files[`public/assets/js/${fileName}.js`] = generatePageJS(pageComponents, page.name);
  });

  return files;
};