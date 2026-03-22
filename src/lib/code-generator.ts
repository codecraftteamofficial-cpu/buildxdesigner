// lib/code-generator.ts
import { ComponentData } from "../App";

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
export const slugify = (value: string | undefined) =>
  (value || "page")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "page";

// Enhanced typo correction function for column names
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

  const desktopLines: string[] = [`  position: absolute;`];

  if (position) {
    desktopLines.push(
      `  left: ${((position.x / DESIGN_WIDTH) * 100).toFixed(4)}%;`,
    );
    desktopLines.push(`  top: ${Math.round(position.y)}px;`);
  }

  const rawW = parsePixelValue(style.width);
  const rawH = parsePixelValue(style.height);
  if (rawW !== null)
    desktopLines.push(`  width: ${((rawW / DESIGN_WIDTH) * 100).toFixed(4)}%;`);
  if (rawH !== null) desktopLines.push(`  height: ${rawH}px;`);

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
    css += `\n\n@media (max-width: ${BREAKPOINTS.tablet}px) {\n  ${cls} {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n  }\n  ${cls} .nav-toggle {\n    display: flex !important;\n  }\n  ${cls} .nav-links {\n    display: none;\n    width: 100%;\n    order: 3;\n  }\n  ${cls} .nav-links.open {\n    display: flex !important;\n  }\n}`;
    css += `\n\n@media (max-width: ${BREAKPOINTS.mobile}px) {\n  ${cls} {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n  }\n  ${cls} .nav-toggle {\n    display: flex !important;\n  }\n  ${cls} .nav-links {\n    display: none;\n    width: 100%;\n    order: 3;\n  }\n  ${cls} .nav-links.open {\n    display: flex !important;\n  }\n}`;
  }

  for (const [bpName, bpMax] of Object.entries(BREAKPOINTS) as [
    keyof typeof BREAKPOINTS,
    number,
  ][]) {
    const ratio = SCALE[bpName];
    const bpLines: string[] = [];

    if (isFullWidth) {
      bpLines.push(`  position: relative;`);
      bpLines.push(`  left: 0;`);
      bpLines.push(`  top: 0;`);
      bpLines.push(`  width: 100%;`);
      if (rawH !== null)
        bpLines.push(`  height: ${Math.round(rawH * ratio)}px;`);
    } else {
      if (position) {
        bpLines.push(
          `  left: ${((position.x / DESIGN_WIDTH) * 100).toFixed(4)}%;`,
        );
        bpLines.push(`  top: ${Math.round(position.y * ratio)}px;`);
      }
      if (rawH !== null)
        bpLines.push(`  height: ${Math.round(rawH * ratio)}px;`);
      if (rawW !== null)
        bpLines.push(
          `  min-width: ${Math.max(32, Math.round(rawW * ratio))}px;`,
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

  if (props.html !== undefined) {
    let htmlRaw = (props.html || "").replace(
      /\$elementId/g,
      compIdClass(component),
    );
    
    // Auth-related replacements
    if (props.redirectUrl || (component.type === 'sign-in' || component.type === 'sign-up' || component.type === 'auth-block')) {
      const redirect = props.redirectUrl || '/';
      htmlRaw = htmlRaw.replace(/\{\{REDIRECT_URL\}\}/g, redirect);
    }

    if (component.type === "dynamic-form") {
      const title = esc(props.title || "Dynamic Form");
      const submitText = esc(props.submitButtonText || "Submit");
      const operation = esc(props.supabaseOperation || "insert");
      const table = esc(props.supabaseTable || "your_table_name");
      const fields = Array.isArray(props.fields) ? props.fields : [];
      const fieldsHtml = fields
        .map((f: any) => {
          const type = esc(f.type || "text");
          const name = esc(f.fieldName || f.label);
          const req = f.required ? " required" : "";
          const ph = esc(f.placeholder || "");
          return `  <div class="form-group">\n    <label>${esc(f.label)}</label>\n    <input type="${type}" name="${name}" placeholder="${ph}"${req} />\n  </div>`;
        })
        .join("\n");
      htmlRaw = `<form class="dynamic-form" id="${esc(props.elementId || compIdClass(component))}" data-action="${operation}" data-table="${table}">
  <h3>${title}</h3>
  <p class="form-msg" style="display:none;"></p>
${fieldsHtml}
  <button type="submit" class="dynamic-submit">${submitText}</button>
</form>`;
    } else if (component.type === "form") {
      const title = esc(props.title || "Get In Touch");
      const submitText = esc(props.submitText || "Submit");
      const fields = Array.isArray(props.fields) ? props.fields : [];
      const fieldsHtml = fields
        .map((f: any) => {
          const type = esc(f.type || "text");
          const name = esc(
            (f.label || "").toLowerCase().replace(/\s+/g, "_") || f.id,
          );
          const req = f.required ? " required" : "";
          const ph = esc(f.placeholder || "");
          if (type === "textarea") {
            return `  <div class="form-group"><label>${esc(f.label)}</label><textarea name="${name}" placeholder="${ph}"${req}></textarea></div>`;
          }
          return `  <div class="form-group"><label>${esc(f.label)}</label><input type="${type}" name="${name}" placeholder="${ph}"${req}></div>`;
        })
        .join("\n");
      htmlRaw = `<form class="contact-form" id="${esc(props.elementId || compIdClass(component))}" data-action="contact">
  <h3>${title}</h3>
  <p class="contact-msg" style="display:none;"></p>
${fieldsHtml}
  <button type="submit">${submitText}</button>
</form>`;
    } else if (component.type === "table") {
      htmlRaw = htmlRaw.replace(
        /\{\{TABLE_TITLE\}\}/g,
        esc(props.tableName || "Data Table"),
      );
      // For vanilla JS, we'll use a placeholder tbody that JS will fill
      htmlRaw = htmlRaw.replace(/<tbody>[\s\S]*?<\/tbody>/, '<tbody class="data-table-body"></tbody>');
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
        `${indent}<div${idAttr} class="${cls}">`,
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
    case "form":
      return `${indent}<form${idAttr} class="${cls}" data-component-type="form">\n${childOutput || `${indent}  <!-- form -->`}\n${indent}</form>`;
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
      return `${indent}<div${idAttr} class="${cls}">\n${childOutput || ""}\n${indent}</div>`;
  }
};

// ─── JS generator ─────────────────────────────────────────────────────────────
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
    .filter((c) => c.props?.js_handler || (c as any).php_backend)
    .map((c) => {
      const id = compIdClass(c);
      const handler = c.props?.js_handler || (c as any).php_backend || "";
      if (handler.includes("<?php")) {
        return `/* [CANVAS-INJECTION]: ${id} had PHP logic which cannot be injected into JS. */`;
      }
      const redirect = c.props?.redirectUrl || '/';
      let processedHandler = handler
        .replace(/\$elementId/g, id)
        .replace(/\{\{REDIRECT_URL\}\}/g, redirect);
      
      if (c.type === 'table') {
        const table = c.props?.supabaseTable || '';
        const columns = c.props?.supabaseSelectColumns || c.props?.columnsToSelect || '*';
        const headers = Array.isArray(c.props?.headers) ? c.props.headers : [];
        const headerConfig = headers.map((h: any) => {
          if (typeof h === 'string') {
            const [label, key] = h.split(':');
            const finalKey = key || label;
            return `"${finalKey}": "${label}"`;
          }
          return `"${h.key}": "${h.label}"`;
        }).join(', ');

        processedHandler = processedHandler
          .replace(/\{\{SUPABASE_TABLE\}\}/g, table)
          .replace(/\{\{SUPABASE_SELECT_COLUMNS\}\}/g, columns)
          .replace(/\{\{TABLE_HEADERS_CONFIG\}\}/g, headerConfig)
          .replace(/\{\{TABLE_TITLE\}\}/g, c.props?.tableName || 'Data Table');
      }

      const innerContent = `(function(elementId) {\n  const $elementId = elementId; \n${processedHandler}\n})("${id}");`;
      const contentHash = Array.from(innerContent).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString(16);
      return `/* [CANVAS-INJECTION]: ${id} | hash:${contentHash} */\n${innerContent}\n/* [END-CANVAS-INJECTION]: ${id} */`;
    })
    .join("\n\n  ");

  const customScripts = allComponents
    .filter((c) => c.type === "custom-component" && c.props?.js)
    .map((c) => {
      const id = compIdClass(c);
      const innerContent = `(function() {\n  const element = document.getElementById("${id}");\n  if (!element) return;\n  try {\n    (function(element) {\n${c.props.js}\n    })(element);\n  } catch (err) {\n    console.error('Error in custom component [${c.id}] JS:', err);\n  }\n})();`;
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
const generateHTMLWrapper = (
  pageName: string,
  fileName: string,
  bodyContent: string,
  integrationsJson: string = "[]",
): string =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageName}</title>
  <link rel="stylesheet" href="assets/css/global.css" />
  <link rel="stylesheet" href="assets/css/${fileName}.css" />
</head>
<body>
${bodyContent}
  <script>
    window.__BUILDX_INTEGRATIONS__ = ${integrationsJson};
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
  const defaultPage =
    pages && pages.length > 0 ? slugify(pages[0].name) : "home";

  const files: Record<string, string> = {
    "public/index.html": `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=${defaultPage}.html"></head>\n<body>Redirecting to <a href="${defaultPage}.html">${defaultPage}</a></body>\n</html>`,
    "public/assets/css/global.css": GLOBAL_RESPONSIVE_CSS,
    "public/assets/css/styles.css": `/* Styles */\n@import "global.css";`,
    "README.md": `# ${projectName}\n\nGenerated by BuildX Vanilla JS Builder.\n\n## How to Run Locally\n\nThis project includes a bundled Node.js server (\`server.js\`) that handles static files and backend integrations (Supabase, Resend, PayMongo).\n\n### Prerequisites\n- **Node.js** (Version 18 or higher is recommended)\n\n### Installation & Running\n1.  **Check Configuration**: Open \`config.json\` and ensure your API keys and Supabase credentials are correct.\n2.  **Start the Server**: Run the following command in your terminal:\n    \`\`\`bash\n    node server.js\n    \`\`\`\n3.  **Open in Browser**: Navigate to \`http://localhost:3000\`.\n\n## Project Structure\n- \`public/\`: Frontend assets (HTML, CSS, JS).\n- \`config.json\`: Project credentials and configuration.\n- \`server.js\`: Local development server and API proxy.\n`,
    "config.json": JSON.stringify({
      supabaseUrl: userConfig?.supabaseUrl || "",
      supabaseAnonKey: userConfig?.supabaseKey || userConfig?.supabaseAnonKey || "",
      paymongoSecretKey: userConfig?.paymongoKey || "",
      resendApiKey: userConfig?.resendApiKey || ""
    }, null, 2),
    "server.js": `const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CONFIG = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const server = http.createServer(async (req, res) => {
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
      const data = JSON.parse(body);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + CONFIG.resendApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Acme <onboarding@resend.dev>', to: [data.to], subject: data.subject, html: data.html })
      });
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(await response.text());
    });
    return;
  }

  if (req.url.startsWith('/api/paymongo') && req.method === 'POST') {
     let body = '';
     req.on('data', chunk => body += chunk);
     req.on('end', async () => {
       const data = JSON.parse(body);
       const response = await fetch('https://api.paymongo.com/v1/links', {
         method: 'POST',
         headers: { 'accept': 'application/json', 'authorization': 'Basic ' + Buffer.from(CONFIG.paymongoSecretKey + ':').toString('base64'), 'content-type': 'application/json' },
         body: JSON.stringify({ data: { attributes: { amount: data.amount * 100, description: data.description, currency: data.currency } } })
       });
       res.writeHead(response.status, { 'Content-Type': 'application/json' });
       res.end(await response.text());
     });
     return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));`,
    "public/assets/js/buildx-sdk.js": `
(function() {
  window.buildx = window.buildx || {};
  
  let config = null;
  async function getConfig() {
    if (config) return config;
    try {
      const res = await fetch('/config.json');
      config = await res.json();
      return config;
    } catch (e) {
      console.error('[buildx] Failed to load config.json');
      return {};
    }
  }

  window.buildx.auth = {
    async signUp(email, password, metadata = {}) {
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        const res = await fetch(\`\${supabaseUrl}/auth/v1/signup\`, {
          method: 'POST',
          headers: { 'apikey': supabaseAnonKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, data: metadata })
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    async signIn(email, password) {
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        const res = await fetch(\`\${supabaseUrl}/auth/v1/token?grant_type=password\`, {
          method: 'POST',
          headers: { 'apikey': supabaseAnonKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        
        if (data.access_token) {
          localStorage.setItem('supabase.auth.token', data.access_token);
          localStorage.setItem('supabase.auth.user', JSON.stringify(data.user));
        }
        return { data, error: null };
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

  window.buildx.data = {
    async select(table, columns = '*', filters = {}) {
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        const params = new URLSearchParams({ select: columns });
        Object.entries(filters).forEach(([col, val]) => {
          if (val !== undefined && val !== null) params.append(col, 'eq.' + val);
        });
        const res = await fetch(\`\${supabaseUrl}/rest/v1/\${table}?\${params.toString()}\`, {
          headers: { 'apikey': supabaseAnonKey, 'Authorization': 'Bearer ' + (localStorage.getItem('supabase.auth.token') || supabaseAnonKey) }
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    async insert(table, data) {
      try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();
        if (!supabaseUrl) throw new Error('Supabase URL is not configured');
        const res = await fetch(\`\${supabaseUrl}/rest/v1/\${table}\`, {
          method: 'POST',
          headers: { 'apikey': supabaseAnonKey, 'Authorization': 'Bearer ' + (localStorage.getItem('supabase.auth.token') || supabaseAnonKey), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) return { data: null, error: result };
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    }
  };

  window.buildx.run = async function(id, data = {}) {
    try {
      const integrations = window.__BUILDX_INTEGRATIONS__ || [];
      const integration = integrations.find(i => i.id === id);
      if (!integration) throw new Error('Integration not found');

      const baseUrl = window.__BUILDX_BASE_URL__ || '';
      const endpoint = baseUrl + (integration.type === 'resend' ? '/api/resend' : '/api/paymongo');
      
      const res = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data) 
      });
      const result = await res.json();
      if (!res.ok) return { success: false, data: null, error: result };
      return { success: true, data: result, error: null };
    } catch (err) {
      return { success: false, data: null, error: err };
    }
  };

  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (form.classList.contains('auth-form') || form.classList.contains('dynamic-form') || form.dataset.action) {
      e.preventDefault();
      const action = form.dataset.action;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      const msgEl = form.querySelector('.form-msg, .contact-msg, .auth-error, .auth-success');

      try {
        if (action === 'insert' || action === 'update') {
          const table = form.dataset.table;
          const { error } = await window.buildx.data.insert(table, data);
          if (!error) {
            if (msgEl) { msgEl.textContent = 'Success!'; msgEl.style.display = 'block'; }
          } else if (msgEl) {
            msgEl.textContent = 'Error: ' + (error.message || 'Submission failed');
            msgEl.style.display = 'block';
          }
        } else if (action === 'signin') {
          const { data: authData, error } = await window.buildx.auth.signIn(data.email, data.password);
          if (authData && authData.access_token) window.location.href = form.dataset.redirect || 'index.html';
          else if (msgEl) { 
            msgEl.textContent = (error && (error.message || error.error_description)) || 'Auth failed'; 
            msgEl.style.display = 'block'; 
          }
        } else if (action === 'signup') {
          const { error } = await window.buildx.auth.signUp(data.email, data.password);
          if (!error) { 
            if (msgEl) { msgEl.textContent = 'Sign up successful! check your email.'; msgEl.style.display = 'block'; }
          } else if (msgEl) {
            msgEl.textContent = error.message || error.error_description || 'Sign up failed';
            msgEl.style.display = 'block';
          }
        } else if (action === 'contact') {
          const integrations = window.__BUILDX_INTEGRATIONS__ || [];
          const resend = integrations.find(i => i.type === 'resend');
          if (resend) {
            const result = await window.buildx.run(resend.id, { to: 'you@example.com', subject: 'Contact Form', html: JSON.stringify(data) });
            if (result.success) {
              if (msgEl) { msgEl.textContent = 'Message sent!'; msgEl.style.display = 'block'; }
            } else if (msgEl) {
              msgEl.textContent = 'Error: ' + (result.error?.message || 'Failed to send');
              msgEl.style.display = 'block';
            }
          }
        }
      } catch (err) {
        if (msgEl) { msgEl.textContent = 'Error: ' + err.message; msgEl.style.display = 'block'; }
      }
    }
  });
})();
`,
    ".env.example": `SUPABASE_URL=\nSUPABASE_ANON_KEY=\n`,
  };

  pages.forEach((page, index) => {
    const fileName = slugify(page.name);
    const pageComponents = migratedComponents.filter(
      (c) =>
        c.page_id === page.id ||
        c.page_id === "all" ||
        (!c.page_id && (page.id === "home" || index === 0)),
    );
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
    );

    const componentCssBlocks = allPageComponents
      .filter(
        (c) =>
          (c.style && Object.keys(c.style).length > 0) || c.type === "navbar",
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

    const cssPath = `public/assets/css/${fileName}.css`;
    files[cssPath] = fileOverrides[cssPath] || [
      `/* ${page.name} styles */`,
      ...componentCssBlocks,
      ...customComponentCss,
      ...propsCss,
    ]
      .filter(Boolean)
      .join("\n\n");

    const jsPath = `public/assets/js/${fileName}.js`;
    let jsContent = fileOverrides[jsPath] || generatePageJS(pageComponents, page.name);

    if (fileOverrides[jsPath]) {
      allPageComponents.forEach((c) => {
        const compId = compIdClass(c);
        const openingMarker = `/* [CANVAS-INJECTION]: ${compId}`;
        const closingMarker = `/* [END-CANVAS-INJECTION]: ${compId} */`;
        
        const handler = c.props?.js_handler || (c as any).php_backend || "";
        const cjs = c.type === "custom-component" ? c.props?.js : "";
        
        if (!(handler || cjs)) return;
        if (handler && handler.includes("<?php")) return;

        let newInnerContent = "";
        if (c.type === "custom-component" && cjs) {
          newInnerContent = `(function() {\n  const element = document.getElementById("${compId}");\n  if (!element) return;\n  try {\n    (function(element) {\n${cjs}\n    })(element);\n  } catch (err) {\n    console.error('Error in custom component [${c.id}] JS:', err);\n  }\n})();`;
        } else {
          newInnerContent = `(function(elementId) {\n  const $elementId = elementId;\n${handler.replace(/\$elementId/g, compId)}\n})("${compId}");`;
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
            
            // Extract inner content to check if user changed it
            const innerStart = jsContent.indexOf("*/", startIdx) + 2;
            const currentInner = jsContent.substring(innerStart, endIdx).trim();
            
            // Check if "dirty"
            // If we don't have a recorded hash, or if the current inner content matches the logic for the PREVIOUS hash...
            // Actually, the simplest check: if currentInner doesn't match newInnerContent AND it doesn't match the "default" for its CURRENT hash, it's dirty.
            // But we don't know the default for its current hash because that would require re-generating with OLD props.
            
            // "Assertive" logic: if the recorded hash matches the current inner content's hash, it's NOT dirty.
            const actualHash = Array.from(currentInner).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0).toString(16);
            
            if (currentHash === actualHash) {
              // Not dirty! Can safely update to new version.
              if (currentHash !== contentHash) {
                jsContent = jsContent.replace(blockContent, newInjection.trim());
              }
            } else {
              // User edited manually! Do nothing.
            }
          }
        } else {
          // Missing - Assertive Insert
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
