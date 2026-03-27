/**
 * Block Transpiler — Dynamic HTML/CSS/JS generation for ALL premade block types.
 * This file is the single source of truth for converting ComponentData into pure
 * client-side code. It is consumed by code-generator.ts during export.
 *
 * STRICTLY READ-ONLY: This module never writes to localStorage or Supabase.
 */

import { ComponentData } from "../App";

// ─── Utilities ──────────────────────────────────────────────────────────────────
const esc = (s: any): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeId = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, "-");

const isReadableId = (id: string): boolean => {
  if (!id) return false;
  if (id.startsWith("comp-")) return false;
  if (/\d{5,}/.test(id)) return false;
  return /^[a-z][a-z0-9-]+-[a-z][a-z0-9-]*$/.test(id);
};

const compId = (c: ComponentData): string => {
  const id = sanitizeId(c.id);
  return isReadableId(c.id) ? id : `comp-${id}`;
};

const elId = (c: ComponentData): string => c.props?.elementId || compId(c);

const indent = (depth: number) => "  ".repeat(depth);

// ─── Types ──────────────────────────────────────────────────────────────────────
export type BlockTranspiler = {
  html: (component: ComponentData, depth?: number) => string;
  css: (component: ComponentData) => string;
  js: (component: ComponentData) => string;
};

// ─── Registry ───────────────────────────────────────────────────────────────────
const registry: Record<string, BlockTranspiler> = {};

const register = (type: string, t: BlockTranspiler) => { registry[type] = t; };

// ═══════════════════════════════════════════════════════════════════════════════
// BASIC ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

register("text", {
  html: (c, d = 0) => `${indent(d)}<p id="${elId(c)}" class="${compId(c)}">${esc(c.props?.content || "")}</p>`,
  css: (c) => `/* text ${compId(c)} — styled via code-generator responsive CSS */`,
  js: () => "",
});

register("heading", {
  html: (c, d = 0) => {
    const tag = `h${c.props?.level || 1}`;
    return `${indent(d)}<${tag} id="${elId(c)}" class="${compId(c)}">${esc(c.props?.content || "Heading")}</${tag}>`;
  },
  css: (c) => `/* heading ${compId(c)} */`,
  js: () => "",
});

register("button", {
  html: (c, d = 0) =>
    `${indent(d)}<button id="btn-${compId(c)}" class="${compId(c)}">${esc(c.props?.text || c.props?.content || "Button")}</button>`,
  css: (c) => {
    const isOutline = c.props?.variant === "outline";
    const isDestructive = c.props?.variant === "destructive";
    const isSecondary = c.props?.variant === "secondary";
    const isGhost = c.props?.variant === "ghost";
    const isLink = c.props?.variant === "link";

    let bg = "#0f172a"; let text = "#f8fafc"; let border = "none";
    if (isOutline) { bg = "transparent"; text = "#0f172a"; border = "1px solid #e2e8f0"; }
    else if (isDestructive) { bg = "#ef4444"; text = "#f8fafc"; }
    else if (isSecondary) { bg = "#f1f5f9"; text = "#0f172a"; }
    else if (isGhost) { bg = "transparent"; text = "#0f172a"; }
    else if (isLink) { bg = "transparent"; text = "#0f172a"; } // add underline on hover

    // Size logic
    let padding = "0.5rem 1rem"; let height = "2.5rem"; let fontSize = "0.875rem";
    if (c.props?.size === "sm") { padding = "0 0.75rem"; height = "2.25rem"; }
    else if (c.props?.size === "lg") { padding = "0 2rem"; height = "2.75rem"; fontSize = "1rem"; }
    else if (c.props?.size === "icon") { padding = "0"; height = "2.5rem"; /* width handled by builder but usually 2.5rem */ }

    return `.${compId(c)} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border-radius: 0.375rem;
  font-size: ${fontSize};
  font-weight: 500;
  background-color: ${bg};
  color: ${text};
  border: ${border};
  padding: ${padding};
  height: ${height};
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.${compId(c)}:hover {
  opacity: 0.9;
  ${isLink ? "text-decoration: underline;" : ""}
  ${isOutline || isGhost ? "background-color: #f1f5f9;" : ""}
}`;
  },
  js: (c) => {
    const id = `btn-${compId(c)}`;
    return `document.getElementById("${id}")?.addEventListener("click", () => { console.log("${id} clicked!"); });`;
  },
});

register("image", {
  html: (c, d = 0) =>
    `${indent(d)}<img id="${elId(c)}" class="${compId(c)}" src="${esc(c.props?.src)}" alt="${esc(c.props?.alt || "image")}" />`,
  css: (c) => `/* image ${compId(c)} */`,
  js: () => "",
});

register("divider", {
  html: (c, d = 0) => {
    const style = c.props?.styleType || "solid";
    const thickness = c.props?.thickness || "1px";
    const color = c.props?.color || "#000000";
    return `${indent(d)}<hr id="${elId(c)}" class="${compId(c)}" style="border:none;border-top:${thickness} ${style} ${color};margin:16px 0;" />`;
  },
  css: (c) => `/* divider ${compId(c)} */`,
  js: () => "",
});

register("video", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const posterAttr = p.poster ? ` poster="${esc(p.poster)}"` : "";
    const srcEl = p.src ? `\n${indent(d + 1)}<source src="${esc(p.src)}" type="video/mp4" />` : "";
    return `${indent(d)}<div id="${elId(c)}" class="${compId(c)}">\n${indent(d + 1)}<video controls${posterAttr}>${srcEl}\n${indent(d + 1)}</video>\n${indent(d)}</div>`;
  },
  css: (c) => `/* video ${compId(c)} */`,
  js: () => "",
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHAPES
// ═══════════════════════════════════════════════════════════════════════════════

register("shape", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const fill = p.fill || "#3b82f6";
    const stroke = p.stroke || "#1f2937";
    const sw = p.strokeWidth ?? 2;
    const shape = p.shape || "rectangle";
    const w = parseInt(String(c.style?.width || 200));
    const h = parseInt(String(c.style?.height || 120));
    let inner = "";
    switch (shape) {
      case "circle": inner = `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2 - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`; break;
      case "ellipse": inner = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - sw}" ry="${h / 2 - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`; break;
      case "triangle":
        const pts = `${w / 2},${sw} ${w - sw},${h - sw} ${sw},${h - sw}`;
        inner = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        break;
      default: inner = `<rect x="${sw}" y="${sw}" width="${w - sw * 2}" height="${h - sw * 2}" rx="${p.cornerRadius || 0}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    return `${indent(d)}<svg id="${elId(c)}" class="${compId(c)}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  },
  css: (c) => `/* shape ${compId(c)} */`,
  js: () => "",
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

register("container", {
  html: (c, d = 0) => {
    const ch = (c.children ?? []).map(child => transpileHTML(child, d + 1)).join("\n");
    return `${indent(d)}<div id="${elId(c)}" class="${compId(c)}" data-component-type="container">\n${ch || `${indent(d + 1)}<!-- container -->`}\n${indent(d)}</div>`;
  },
  css: (c) => `/* container ${compId(c)} */`,
  js: () => "",
});

register("grid", {
  html: (c, d = 0) => {
    const ch = (c.children ?? []).map(child => transpileHTML(child, d + 1)).join("\n");
    return `${indent(d)}<div id="${elId(c)}" class="${compId(c)}" data-component-type="grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">\n${ch || `${indent(d + 1)}<!-- grid -->`}\n${indent(d)}</div>`;
  },
  css: (c) => `/* grid ${compId(c)} */`,
  js: () => "",
});

register("card", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const lines = [`${indent(d)}<div id="${elId(c)}" class="${compId(c)} buildx-premade-block flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full h-full">`];
    if (p.image) lines.push(`${indent(d + 1)}<img src="${esc(p.image)}" alt="${esc(p.title)}" class="${compId(c)} buildx-premade-block w-full aspect-video object-cover" />`);
    lines.push(`${indent(d + 1)}<div class="p-6 flex flex-col flex-1">`);
    lines.push(`${indent(d + 2)}<h3 class="m-0 text-2xl font-semibold tracking-tight text-slate-900 line-height-1">${esc(p.title || "Card Title")}</h3>`);
    lines.push(`${indent(d + 2)}<p class="m-0 mt-2 text-sm text-slate-500">${esc(p.description || "Card description goes here.")}</p>`);
    if (p.buttonText) lines.push(`${indent(d + 2)}<div class="mt-auto pt-6"><button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 bg-slate-900 text-slate-50 hover:bg-slate-900/90 px-4 py-2 w-full cursor-pointer">${esc(p.buttonText)}</button></div>`);
    lines.push(`${indent(d + 1)}</div>`);
    lines.push(`${indent(d)}</div>`);
    return lines.join("\n");
  },
  css: (c) => `/* Styled via Scoped Tailwind */`,
  js: () => "",
});

register("section-heading", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const lines = [`${indent(d)}<div id="${elId(c)}" class="${compId(c)}">`];
    lines.push(`${indent(d + 1)}<h2>${esc(p.title || "Section")}</h2>`);
    if (p.subtitle) lines.push(`${indent(d + 1)}<p>${esc(p.subtitle)}</p>`);
    lines.push(`${indent(d)}</div>`);
    return lines.filter(Boolean).join("\n");
  },
  css: (c) => `/* section-heading ${compId(c)} */`,
  js: () => "",
});

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

register("navbar", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const brand = esc(p.brand || "Brand");
    const links: string[] = Array.isArray(p.links) && p.links.length > 0 ? p.links : ["Home", "About", "Contact"];
    const urls: string[] = Array.isArray(p.linkUrls) ? p.linkUrls : [];
    const linkItems = links.map((l: string, i: number) => {
      const href = urls[i] && urls[i].trim() !== "" && urls[i].trim() !== "#" ? urls[i].trim() : "#";
      return `${indent(d + 4)}<a href="${esc(href)}" class="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">${esc(l)}</a>`;
    }).join("\n");
    return [
      `${indent(d)}<nav id="${elId(c)}" class="${compId(c)} buildx-premade-block flex w-full items-center justify-between px-6 py-4 bg-white border-b border-slate-200">`,
      `${indent(d + 1)}<div class="flex items-center gap-8">`,
      `${indent(d + 2)}<div class="text-xl font-bold tracking-tight text-slate-900">${brand}</div>`,
      `${indent(d + 2)}<div class="hidden md:flex items-center gap-6">`,
      linkItems,
      `${indent(d + 2)}</div>`,
      `${indent(d + 1)}</div>`,
      `${indent(d + 1)}<button class="nav-toggle flex md:hidden flex-col gap-1 bg-transparent border-none cursor-pointer" aria-label="Toggle navigation">`,
      `${indent(d + 2)}<span class="w-6 h-0.5 bg-slate-900"></span>`,
      `${indent(d + 2)}<span class="w-6 h-0.5 bg-slate-900"></span>`,
      `${indent(d + 2)}<span class="w-6 h-0.5 bg-slate-900"></span>`,
      `${indent(d + 1)}</button>`,
      `${indent(d)}</nav>`,
    ].join("\n");
  },
  css: (c) => `/* Styled via Scoped Tailwind */`,
  js: () => "",
});

register("hero", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    return [
      `${indent(d)}<section id="${elId(c)}" class="${compId(c)} buildx-premade-block flex flex-col items-center justify-center text-center py-20 px-6 bg-slate-50">`,
      `${indent(d + 1)}<h1 class="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900 mb-4">${esc(p.title || "Build Your Next Idea")}</h1>`,
      `${indent(d + 1)}<p class="text-lg text-slate-600 max-w-2xl mx-auto mb-8">${esc(p.subtitle || "The fastest way to design and export stunning web applications.")}</p>`,
      `${indent(d + 1)}<button class="inline-flex items-center justify-center rounded-md px-8 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer">${esc(p.buttonText || "Get Started")}</button>`,
      `${indent(d)}</section>`,
    ].join("\n");
  },
  css: (c) => `/* Styled via Scoped Tailwind */`,
  js: () => "",
});

register("footer", {
  html: (c, d = 0) => [
    `${indent(d)}<footer id="${elId(c)}" class="${compId(c)} full-width-block">`,
    `${indent(d + 1)}<p>${esc(c.props?.copyright || "")}</p>`,
    `${indent(d)}</footer>`,
  ].join("\n"),
  css: (c) => `/* footer ${compId(c)} */`,
  js: () => "",
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

register("input", {
  html: (c, d = 0) =>
    `${indent(d)}<input id="${elId(c)}" class="${compId(c)}" type="${esc(c.props?.type || "text")}" placeholder="${esc(c.props?.placeholder)}" />`,
  css: (c) => `/* input ${compId(c)} */`,
  js: () => "",
});

register("textarea", {
  html: (c, d = 0) =>
    `${indent(d)}<textarea id="${elId(c)}" class="${compId(c)}" placeholder="${esc(c.props?.placeholder)}"></textarea>`,
  css: (c) => `/* textarea ${compId(c)} */`,
  js: () => "",
});

register("select", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const opts = Array.isArray(p.options) ? p.options : [];
    const optionsHtml = opts.map((o: any) =>
      `${indent(d + 1)}<option value="${esc(o.value)}">${esc(o.label)}</option>`
    ).join("\n");
    return [
      `${indent(d)}<div id="${elId(c)}" class="${compId(c)}">`,
      p.label ? `${indent(d + 1)}<label>${esc(p.label)}</label>` : "",
      `${indent(d + 1)}<select>`,
      p.placeholder ? `${indent(d + 2)}<option value="" disabled selected>${esc(p.placeholder)}</option>` : "",
      optionsHtml,
      `${indent(d + 1)}</select>`,
      `${indent(d)}</div>`,
    ].filter(Boolean).join("\n");
  },
  css: (c) => `.${compId(c)} select { padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; width: 100%; font-family: inherit; }
.${compId(c)} label { display: block; margin-bottom: 4px; font-size: 0.875rem; font-weight: 500; color: #374151; }`,
  js: () => "",
});

register("checkbox", {
  html: (c, d = 0) => {
    const id = elId(c);
    return [
      `${indent(d)}<div id="${id}" class="${compId(c)}" style="display:flex;align-items:center;gap:8px;">`,
      `${indent(d + 1)}<input type="checkbox" id="${id}-input"${c.props?.checked ? " checked" : ""} />`,
      `${indent(d + 1)}<label for="${id}-input">${esc(c.props?.label || "Checkbox")}</label>`,
      `${indent(d)}</div>`,
    ].join("\n");
  },
  css: (c) => `.${compId(c)} input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
.${compId(c)} label { font-size: 0.875rem; color: #374151; cursor: pointer; }`,
  js: () => "",
});

register("radio-group", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const name = elId(c);
    const opts = Array.isArray(p.options) ? p.options : [];
    const radios = opts.map((o: any, i: number) => [
      `${indent(d + 1)}<div style="display:flex;align-items:center;gap:8px;">`,
      `${indent(d + 2)}<input type="radio" id="${name}-${i}" name="${name}" value="${esc(o.value)}"${o.value === p.defaultValue ? " checked" : ""} />`,
      `${indent(d + 2)}<label for="${name}-${i}">${esc(o.label)}</label>`,
      `${indent(d + 1)}</div>`,
    ].join("\n")).join("\n");
    return [
      `${indent(d)}<fieldset id="${name}" class="${compId(c)}" style="border:none;padding:0;margin:0;">`,
      p.label ? `${indent(d + 1)}<legend style="font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:8px;">${esc(p.label)}</legend>` : "",
      radios,
      `${indent(d)}</fieldset>`,
    ].filter(Boolean).join("\n");
  },
  css: (c) => `.${compId(c)} input[type="radio"] { width: 16px; height: 16px; cursor: pointer; }
.${compId(c)} label { font-size: 0.875rem; color: #374151; cursor: pointer; }`,
  js: () => "",
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORMS (Contact + Dynamic)
// ═══════════════════════════════════════════════════════════════════════════════

register("form", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const title = esc(p.title || "Get In Touch");
    const submitText = esc(p.submitText || "Submit");
    const fields = Array.isArray(p.fields) ? p.fields : [];
    const fieldsHtml = fields.map((f: any) => {
      const type = esc(f.type || "text");
      const name = esc((f.label || "").toLowerCase().replace(/\s+/g, "_") || f.id);
      const req = f.required ? " required" : "";
      const ph = esc(f.placeholder || "");
      if (type === "textarea") {
        return `${indent(d + 1)}<div class="form-group"><label>${esc(f.label)}</label><textarea name="${name}" placeholder="${ph}"${req}></textarea></div>`;
      }
      return `${indent(d + 1)}<div class="form-group"><label>${esc(f.label)}</label><input type="${type}" name="${name}" placeholder="${ph}"${req}></div>`;
    }).join("\n");
    return [
      `${indent(d)}<form class="contact-form" id="${elId(c)}" data-action="contact">`,
      `${indent(d + 1)}<h3>${title}</h3>`,
      `${indent(d + 1)}<p class="contact-msg" style="display:none;"></p>`,
      fieldsHtml,
      `${indent(d + 1)}<button type="submit">${submitText}</button>`,
      `${indent(d)}</form>`,
    ].join("\n");
  },
  css: (c) => c.props?.css || `.contact-form { display:flex; flex-direction:column; gap:1rem; max-width:400px; padding:20px; background:#fff; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1); font-family:system-ui,sans-serif; }
.contact-form h3 { margin-top:0; color:#111827; }
.contact-msg { padding:10px; background:#e0f2fe; color:#1e40af; border-radius:4px; font-size:0.875rem; }
.contact-form .form-group { display:flex; flex-direction:column; gap:0.5rem; }
.contact-form .form-group label { font-size:0.875rem; font-weight:500; color:#374151; }
.contact-form input, .contact-form textarea { padding:8px; border:1px solid #d1d5db; border-radius:4px; outline:none; font-family:inherit; }
.contact-form input:focus, .contact-form textarea:focus { border-color:#3b82f6; }
.contact-form button { padding:10px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:500; }
.contact-form button:hover { background:#2563eb; }`,
  js: (c) => {
    if (!c.props?.js_handler) return "";
    const p = c.props ?? {};
    return c.props.js_handler
      .replace(/\$elementId/g, elId(c))
      .replace(/\{\{RESEND_INTEGRATION_ID\}\}/g, p.resendIntegrationId || '')
      .replace(/\{\{RECIPIENT_EMAIL\}\}/g, p.recipientEmail || '');
  },
});

register("dynamic-form", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const title = esc(p.title || "Dynamic Form");
    const submitText = esc(p.submitButtonText || "Submit");
    const operation = esc(p.supabaseOperation || "insert");
    const table = esc(p.supabaseTable || "your_table_name");
    const fields = Array.isArray(p.fields) ? p.fields : [];
    const fieldsHtml = fields.map((f: any) => {
      const type = esc(f.type || "text");
      const name = esc(f.fieldName || f.label);
      const req = f.required ? " required" : "";
      const ph = esc(f.placeholder || "");
      return `${indent(d + 1)}<div class="form-group">\n${indent(d + 2)}<label>${esc(f.label)}</label>\n${indent(d + 2)}<input type="${type}" name="${name}" placeholder="${ph}"${req} />\n${indent(d + 1)}</div>`;
    }).join("\n");
    return [
      `${indent(d)}<form class="dynamic-form" id="${elId(c)}" data-action="${operation}" data-table="${table}">`,
      `${indent(d + 1)}<h3>${title}</h3>`,
      `${indent(d + 1)}<p class="form-msg" style="display:none;"></p>`,
      fieldsHtml,
      `${indent(d + 1)}<button type="submit" class="dynamic-submit">${submitText}</button>`,
      `${indent(d)}</form>`,
    ].join("\n");
  },
  css: (c) => c.props?.css || `.dynamic-form { display:flex; flex-direction:column; gap:1rem; max-width:400px; padding:20px; background:#fff; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1); font-family:system-ui,sans-serif; }
.dynamic-form h3 { margin-top:0; color:#111827; }
.form-msg { padding:10px; background:#e0f2fe; color:#1e40af; border-radius:4px; font-size:0.875rem; }
.dynamic-form .form-group { display:flex; flex-direction:column; gap:0.5rem; }
.dynamic-form .form-group label { font-size:0.875rem; font-weight:500; color:#374151; }
.dynamic-form input { padding:8px; border:1px solid #d1d5db; border-radius:4px; outline:none; }
.dynamic-form input:focus { border-color:#3b82f6; }
.dynamic-form .dynamic-submit { padding:10px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:500; }
.dynamic-form .dynamic-submit:hover { background:#2563eb; }`,
  js: (c) => c.props?.js_handler ? c.props.js_handler.replace(/\$elementId/g, elId(c)) : "",
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTIVE — Accordion, Tabs, Modal, Alert
// ═══════════════════════════════════════════════════════════════════════════════

register("accordion", {
  html: (c, d = 0) => {
    const items = Array.isArray(c.props?.items) ? c.props.items : [];
    const id = elId(c);
    const itemsHtml = items.map((item: any, i: number) => [
      `${indent(d + 1)}<div class="border border-slate-200 rounded-lg mb-2 overflow-hidden">`,
      `${indent(d + 2)}<button class="accordion-trigger flex w-full items-center justify-between p-4 text-sm font-medium bg-slate-50 hover:bg-slate-100 transition-all" data-index="${i}">${esc(item.question)}</button>`,
      `${indent(d + 2)}<div class="accordion-content p-4 text-sm text-slate-500 bg-white" data-index="${i}" style="display:none;">`,
      `${indent(d + 3)}<p class="m-0">${esc(item.answer)}</p>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 1)}</div>`,
    ].join("\n")).join("\n");
    return `${indent(d)}<div id="${id}" class="${compId(c)} buildx-premade-block w-full">\n${itemsHtml}\n${indent(d)}</div>`;
  },
  css: (c) => `/* Styled via Scoped Tailwind */`,
  js: (c) => {
    const id = elId(c);
    const multi = c.props?.allowMultiple ? "true" : "false";
    return `(function() {
  var el = document.getElementById("${id}");
  if (!el) return;
  var allowMultiple = ${multi};
  el.querySelectorAll(".accordion-trigger").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var idx = btn.getAttribute("data-index");
      var content = el.querySelector('.accordion-content[data-index="' + idx + '"]');
      if (!content) return;
      var isOpen = content.style.display !== "none";
      if (!allowMultiple) {
        el.querySelectorAll(".accordion-content").forEach(function(c) { c.style.display = "none"; });
      }
      content.style.display = isOpen ? "none" : "block";
    });
  });
})();`;
  },
});

register("tabs", {
  html: (c, d = 0) => {
    const tabs = Array.isArray(c.props?.tabs) ? c.props.tabs : [];
    const id = elId(c);
    const btns = tabs.map((t: any, i: number) =>
      `${indent(d + 2)}<button class="tab-btn inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${i === 0 ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}" data-index="${i}">${esc(t.label)}</button>`
    ).join("\n");
    const panels = tabs.map((t: any, i: number) =>
      `${indent(d + 2)}<div class="tab-panel mt-2 ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2" data-index="${i}" style="${i !== 0 ? "display:none;" : ""}">${esc(t.content)}</div>`
    ).join("\n");
    return [
      `${indent(d)}<div id="${id}" class="${compId(c)} buildx-premade-block w-full">`,
      `${indent(d + 1)}<div class="tab-buttons inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500">`,
      btns,
      `${indent(d + 1)}</div>`,
      `${indent(d + 1)}<div class="tab-panels">`,
      panels,
      `${indent(d + 1)}</div>`,
      `${indent(d)}</div>`,
    ].join("\n");
  },
  css: (c) => `/* Styled via Scoped Tailwind */`,
  js: (c) => {
    const id = elId(c);
    return `(function() {
  var el = document.getElementById("${id}");
  if (!el) return;
  el.querySelectorAll(".tab-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var idx = btn.getAttribute("data-index");
      el.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
      el.querySelectorAll(".tab-panel").forEach(function(p) { p.style.display = "none"; });
      btn.classList.add("active");
      var panel = el.querySelector('.tab-panel[data-index="' + idx + '"]');
      if (panel) panel.style.display = "block";
    });
  });
})();`;
  },
});

register("modal", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const id = elId(c);
    return [
      `${indent(d)}<div id="${id}" class="${compId(c)}">`,
      `${indent(d + 1)}<button class="modal-trigger">${esc(p.triggerText || "Open Modal")}</button>`,
      `${indent(d + 1)}<div class="modal-overlay" style="display:none;">`,
      `${indent(d + 2)}<div class="modal-box">`,
      `${indent(d + 3)}<div class="modal-header">`,
      `${indent(d + 4)}<h3>${esc(p.modalTitle || "Modal Title")}</h3>`,
      `${indent(d + 4)}<button class="modal-close">&times;</button>`,
      `${indent(d + 3)}</div>`,
      `${indent(d + 3)}<div class="modal-body"><p>${esc(p.modalContent || "")}</p></div>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 1)}</div>`,
      `${indent(d)}</div>`,
    ].join("\n");
  },
  css: (c) => `.${compId(c)} .modal-trigger { padding: 10px 20px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
.${compId(c)} .modal-trigger:hover { background: #2563eb; }
.${compId(c)} .modal-overlay { position: fixed; inset: 0; background: ${c.props?.overlayColor || "rgba(0,0,0,0.5)"}; display: flex; align-items: center; justify-content: center; z-index: 9999; }
.${compId(c)} .modal-box { background: #fff; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.${compId(c)} .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.${compId(c)} .modal-header h3 { margin: 0; }
.${compId(c)} .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
.${compId(c)} .modal-body p { color: #4b5563; line-height: 1.6; margin: 0; }`,
  js: (c) => {
    const id = elId(c);
    return `(function() {
  var el = document.getElementById("${id}");
  if (!el) return;
  var overlay = el.querySelector(".modal-overlay");
  el.querySelector(".modal-trigger")?.addEventListener("click", function() { overlay.style.display = "flex"; });
  el.querySelector(".modal-close")?.addEventListener("click", function() { overlay.style.display = "none"; });
  overlay?.addEventListener("click", function(e) { if (e.target === overlay) overlay.style.display = "none"; });
})();`;
  },
});

register("alert", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const variant = p.variant || "info";
    const id = elId(c);
    return [
      `${indent(d)}<div id="${id}" class="${compId(c)} alert-${variant}">`,
      `${indent(d + 1)}<span class="alert-message">${esc(p.message || "Alert message.")}</span>`,
      p.dismissible ? `${indent(d + 1)}<button class="alert-dismiss">&times;</button>` : "",
      `${indent(d)}</div>`,
    ].filter(Boolean).join("\n");
  },
  css: (c) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      info: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
      success: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
      warning: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
      error: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
    };
    const v = c.props?.variant || "info";
    const col = colors[v] || colors.info;
    return `.${compId(c)} { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:6px; background:${col.bg}; color:${col.text}; border:1px solid ${col.border}; font-size:0.875rem; }
.${compId(c)} .alert-dismiss { background:none; border:none; font-size:1.25rem; cursor:pointer; color:${col.text}; margin-left:12px; }`;
  },
  js: (c) => {
    if (!c.props?.dismissible) return "";
    const id = elId(c);
    return `(function() {
  var el = document.getElementById("${id}");
  if (!el) return;
  el.querySelector(".alert-dismiss")?.addEventListener("click", function() { el.style.display = "none"; });
})();`;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA — Carousel
// ═══════════════════════════════════════════════════════════════════════════════

register("carousel", {
  html: (c, d = 0) => {
    const slides = Array.isArray(c.props?.slides) ? c.props.slides : [];
    const id = elId(c);
    const slidesHtml = slides.map((s: any, i: number) =>
      `${indent(d + 2)}<div class="carousel-slide" data-index="${i}" style="${i !== 0 ? "display:none;" : ""}"><img src="${esc(s.src)}" alt="${esc(s.alt || "")}" style="width:100%;height:100%;object-fit:cover;" />${s.caption ? `<p class="carousel-caption">${esc(s.caption)}</p>` : ""}</div>`
    ).join("\n");
    return [
      `${indent(d)}<div id="${id}" class="${compId(c)} carousel-container">`,
      `${indent(d + 1)}<div class="carousel-track">`,
      slidesHtml,
      `${indent(d + 1)}</div>`,
      c.props?.showArrows !== false ? `${indent(d + 1)}<button class="carousel-prev">&lsaquo;</button>\n${indent(d + 1)}<button class="carousel-next">&rsaquo;</button>` : "",
      c.props?.showDots !== false ? `${indent(d + 1)}<div class="carousel-dots">${slides.map((_: any, i: number) => `<span class="dot${i === 0 ? " active" : ""}" data-index="${i}"></span>`).join("")}</div>` : "",
      `${indent(d)}</div>`,
    ].filter(Boolean).join("\n");
  },
  css: (c) => `.${compId(c)} { position:relative; overflow:hidden; border-radius:0.5rem; }
.${compId(c)} .carousel-track { position:relative; width:100%; height:100%; }
.${compId(c)} .carousel-slide { position:absolute; inset:0; }
.${compId(c)} .carousel-prev, .${compId(c)} .carousel-next { position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.4); color:#fff; border:none; font-size:2rem; padding:8px 12px; cursor:pointer; z-index:2; border-radius:4px; }
.${compId(c)} .carousel-prev { left:8px; }
.${compId(c)} .carousel-next { right:8px; }
.${compId(c)} .carousel-dots { position:absolute; bottom:12px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:2; }
.${compId(c)} .dot { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,0.5); cursor:pointer; }
.${compId(c)} .dot.active { background:#fff; }
.${compId(c)} .carousel-caption { position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.5); color:#fff; padding:8px 12px; font-size:0.875rem; }`,
  js: (c) => {
    const id = elId(c);
    const auto = c.props?.autoplay ? "true" : "false";
    const speed = c.props?.autoplaySpeed || 3000;
    return `(function() {
  var el = document.getElementById("${id}");
  if (!el) return;
  var slides = el.querySelectorAll(".carousel-slide");
  var dots = el.querySelectorAll(".dot");
  var current = 0;
  function showSlide(idx) {
    slides.forEach(function(s) { s.style.display = "none"; });
    dots.forEach(function(d) { d.classList.remove("active"); });
    current = (idx + slides.length) % slides.length;
    if (slides[current]) slides[current].style.display = "block";
    if (dots[current]) dots[current].classList.add("active");
  }
  var prev = el.querySelector(".carousel-prev");
  var next = el.querySelector(".carousel-next");
  if (prev) prev.addEventListener("click", function() { showSlide(current - 1); });
  if (next) next.addEventListener("click", function() { showSlide(current + 1); });
  dots.forEach(function(d) { d.addEventListener("click", function() { showSlide(parseInt(d.getAttribute("data-index"))); }); });
  if (${auto}) { setInterval(function() { showSlide(current + 1); }, ${speed}); }
})();`;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATA — Table
// ═══════════════════════════════════════════════════════════════════════════════

register("table", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const title = esc(p.tableName || "Data Table");
    const id = elId(c);
    return [
      `${indent(d)}<div id="${id}" class="${compId(c)} data-table-container">`,
      `${indent(d + 1)}<h3>${title}</h3>`,
      `${indent(d + 1)}<table class="data-table">`,
      `${indent(d + 2)}<thead><tr class="header-row"><!-- JS fills headers --></tr></thead>`,
      `${indent(d + 2)}<tbody class="body-rows"><tr><td colspan="100%">Loading data...</td></tr></tbody>`,
      `${indent(d + 1)}</table>`,
      `${indent(d)}</div>`,
    ].join("\n");
  },
  css: (c) => c.props?.css || `#${elId(c)} { width:100%; overflow-x:auto; background:#fff; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); font-family:system-ui,sans-serif; }
#${elId(c)} h3 { padding:1rem; margin:0; border-bottom:1px solid #e5e7eb; color:#111827; }
#${elId(c)} .data-table { width:100%; border-collapse:collapse; text-align:left; }
#${elId(c)} .data-table th, #${elId(c)} .data-table td { padding:0.75rem 1rem; border-bottom:1px solid #e5e7eb; }
#${elId(c)} .data-table th { background:#f9fafb; font-weight:500; color:#374151; font-size:0.875rem; text-transform:uppercase; letter-spacing:0.05em; }
#${elId(c)} .data-table td { color:#4b5563; font-size:0.875rem; }
#${elId(c)} .data-table tr:hover { background:#f9fafb; }`,
  js: (c) => {
    const p = c.props ?? {};
    const id = elId(c);
    const supabaseTable = p.supabaseTable || '';
    // Build header config from the headers prop
    const headers: string[] = Array.isArray(p.headers) ? p.headers : [];
    const headerConfigEntries = headers.map((h: string) => `"${h}": "${h}"`).join(', ');
    const columns = headers.length > 0 ? headers.join(',') : '*';

    if (!supabaseTable) {
      // No supabase table configured — omit the load logic
      return `(function() {
  var container = document.getElementById('${id}');
  if (!container) return;
  var tbody = container.querySelector('.body-rows');
  if (tbody) tbody.innerHTML = '<tr><td colspan="100%">No data source configured.</td></tr>';
})();`;
    }

    return `(function() {
  var container = document.getElementById('${id}');
  if (container) {
    var table = '${supabaseTable}';
    var columns = '${columns}';
    var headerConfig = { ${headerConfigEntries} };

    var loadData = async function() {
      if (!table) return;
      var result = await window.buildx.data.select(table, columns);
      var data = result.data;
      var error = result.error;
      if (error) { console.error('Table load error:', error); return; }

      var tbody = container.querySelector('.body-rows');
      var theadRow = container.querySelector('.header-row');

      if (data && data.length > 0) {
        var configKeys = Object.keys(headerConfig);
        var keys = configKeys.length > 0 ? configKeys : Object.keys(data[0]);
        theadRow.innerHTML = keys.map(function(k) { return '<th>' + (headerConfig[k] || k) + '</th>'; }).join('');
        tbody.innerHTML = data.map(function(row) {
          return '<tr>' + keys.map(function(k) { return '<td>' + (row[k] || '') + '</td>'; }).join('') + '</tr>';
        }).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="100%">No data found.</td></tr>';
      }
    };
    loadData();
  }
})();`;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION — Sign In, Sign Up, Auth Block, Profile
// ═══════════════════════════════════════════════════════════════════════════════

register("sign-in", {
  html: (c, d = 0) => {
    if (c.props?.html) {
      let rawHtml = c.props.html.replace(/\$elementId/g, elId(c));
      const classStr = `class="`;
      const targetClass = `${compId(c)} `;
      if (rawHtml.includes(classStr) && !rawHtml.includes(`class="${targetClass}`) && !rawHtml.includes(` ${compId(c)} `)) {
        rawHtml = rawHtml.replace(classStr, `${classStr}${targetClass}`);
      }
      return `${indent(d)}${rawHtml}`;
    }
    const p = c.props ?? {};
    const id = elId(c);
    return [
      `${indent(d)}<div class="flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden w-full h-full ${compId(c)} buildx-premade-block" id="${id}" data-component-type="sign-in">`,
      `${indent(d + 1)}<div class="p-6 flex flex-col gap-1.5 shrink-0">`,
      `${indent(d + 2)}<h2 class="m-0 text-2xl font-semibold tracking-tight text-slate-900 line-height-1">${esc(p.title || "Sign In")}</h2>`,
      `${indent(d + 2)}<p class="m-0 text-slate-500 text-sm">${esc(p.description || "Enter your email and password.")}</p>`,
      `${indent(d + 1)}</div>`,
      `${indent(d + 1)}<p class="auth-error mx-6 mb-6 text-red-600 bg-red-50 p-3 rounded-md text-sm shrink-0" style="display:none;"></p>`,
      `${indent(d + 1)}<form class="auth-form flex-1 flex flex-col overflow-hidden" data-action="signin" data-redirect="${esc(p.redirectUrl || "/")}">`,
      `${indent(d + 2)}<div class="px-6 flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">`,
      `${indent(d + 3)}<div class="flex flex-col gap-2">`,
      `${indent(d + 4)}<label class="text-sm font-medium text-slate-950 line-height-1">Email</label>`,
      `${indent(d + 4)}<input type="email" name="email" required placeholder="you@example.com" class="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950">`,
      `${indent(d + 3)}</div>`,
      `${indent(d + 3)}<div class="flex flex-col gap-2">`,
      `${indent(d + 4)}<label class="text-sm font-medium text-slate-950 line-height-1">Password</label>`,
      `${indent(d + 4)}<input type="password" name="password" required placeholder="your password" class="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950">`,
      `${indent(d + 3)}</div>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 2)}<div class="p-6 flex flex-col gap-4 shrink-0">`,
      `${indent(d + 3)}<button type="submit" class="auth-button inline-flex items-center justify-center rounded-md text-sm font-medium h-10 bg-blue-600 text-white hover:bg-blue-700 transition-colors w-full cursor-pointer">${esc(p.buttonText || "Sign In")}</button>`,
      `${indent(d + 3)}<div class="text-center"><p class="m-0 text-sm text-slate-500">Don't have an account? <a href="${esc(p.switchToSignUpUrl || "sign-up.html")}" class="text-blue-600 hover:underline font-medium">${esc(p.switchToSignUpText || "Sign Up")}</a></p></div>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 1)}</form>`,
      `${indent(d)}</div>`,
    ].join("\n");
  },
  css: (c) => c.props?.css || "/* Styled via Scoped Tailwind */",
  js: (c) => c.props?.js_handler ? c.props.js_handler.replace(/\$elementId/g, elId(c)) : "",
});

register("sign-up", {
  html: (c, d = 0) => {
    if (c.props?.html) {
      let rawHtml = c.props.html.replace(/\$elementId/g, elId(c));
      const classStr = `class="`;
      const targetClass = `${compId(c)} `;
      if (rawHtml.includes(classStr) && !rawHtml.includes(`class="${targetClass}`) && !rawHtml.includes(` ${compId(c)} `)) {
        rawHtml = rawHtml.replace(classStr, `${classStr}${targetClass}`);
      }
      return `${indent(d)}${rawHtml}`;
    }
    const p = c.props ?? {};
    const id = elId(c);
    return [
      `${indent(d)}<div class="flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden w-full h-full ${compId(c)} buildx-premade-block" id="${id}">`,
      `${indent(d + 1)}<div class="p-6 flex flex-col gap-1.5 shrink-0">`,
      `${indent(d + 2)}<h2 class="m-0 text-2xl font-semibold tracking-tight text-slate-900 line-height-1">${esc(p.title || "Sign Up")}</h2>`,
      `${indent(d + 2)}<p class="m-0 text-slate-500 text-sm">${esc(p.description || "Create a new account.")}</p>`,
      `${indent(d + 1)}</div>`,
      `${indent(d + 1)}<p class="auth-error mx-6 mb-6 text-red-600 bg-red-50 p-3 rounded-md text-sm shrink-0" style="display:none;"></p>`,
      `${indent(d + 1)}<p class="auth-success mx-6 mb-6 text-green-600 bg-green-50 p-3 rounded-md text-sm shrink-0" style="display:none;">Sign up successful!</p>`,
      `${indent(d + 1)}<form class="auth-form flex-1 flex flex-col overflow-hidden" data-action="signup" data-redirect="${esc(p.redirectUrl || "/")}">`,
      `${indent(d + 2)}<div class="px-6 flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">`,
      `${indent(d + 3)}<div class="flex flex-col gap-2">`,
      `${indent(d + 4)}<label class="text-sm font-medium text-slate-950 line-height-1">Email</label>`,
      `${indent(d + 4)}<input type="email" name="email" required placeholder="you@example.com" class="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950">`,
      `${indent(d + 3)}</div>`,
      `${indent(d + 3)}<div class="flex flex-col gap-2">`,
      `${indent(d + 4)}<label class="text-sm font-medium text-slate-950 line-height-1">Password</label>`,
      `${indent(d + 4)}<input type="password" name="password" required placeholder="your password" class="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950">`,
      `${indent(d + 3)}</div>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 2)}<div class="p-6 flex flex-col gap-4 shrink-0">`,
      `${indent(d + 3)}<button type="submit" class="auth-button inline-flex items-center justify-center rounded-md text-sm font-medium h-10 bg-blue-600 text-white hover:bg-blue-700 transition-colors w-full cursor-pointer">${esc(p.buttonText || "Sign Up")}</button>`,
      `${indent(d + 3)}<div class="text-center"><p class="m-0 text-sm text-slate-500">Already have an account? <a href="${esc(p.switchToSignInUrl || "sign-in.html")}" class="text-blue-600 hover:underline font-medium">${esc(p.switchToSignInText || "Sign In")}</a></p></div>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 1)}</form>`,
      `${indent(d)}</div>`,
    ].join("\n");
  },
  css: (c) => c.props?.css || "/* Styled via Scoped Tailwind */",
  js: (c) => c.props?.js_handler ? c.props.js_handler.replace(/\$elementId/g, elId(c)) : "",
});

register("auth-block", {
  html: (c, d = 0) => {
    if (c.props?.html) {
      let rawHtml = c.props.html.replace(/\$elementId/g, elId(c));
      const classStr = `class="`;
      const targetClass = `${compId(c)} `;
      if (rawHtml.includes(classStr) && !rawHtml.includes(`class="${targetClass}`) && !rawHtml.includes(` ${compId(c)} `)) {
        rawHtml = rawHtml.replace(classStr, `${classStr}${targetClass}`);
      }
      return `${indent(d)}${rawHtml}`;
    }
    const p = c.props ?? {};
    const id = elId(c);
    const mode = p.initialMode || "signin";
    return [
      `${indent(d)}<div class="flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden w-full h-full ${compId(c)} buildx-premade-block" id="${id}">`,
      `${indent(d + 1)}<div class="p-6 flex flex-col gap-1.5 shrink-0">`,
      `${indent(d + 2)}<h2 class="auth-title m-0 text-2xl font-semibold tracking-tight text-slate-900 line-height-1">${esc(mode === "signin" ? (p.signInTitle || "Sign In") : (p.signUpTitle || "Sign Up"))}</h2>`,
      `${indent(d + 2)}<p class="auth-description m-0 text-slate-500 text-sm">${esc(mode === "signin" ? (p.signInDescription || "Please authenticate to continue.") : (p.signUpDescription || ""))}</p>`,
      `${indent(d + 1)}</div>`,
      `${indent(d + 1)}<p class="auth-error mx-6 mb-6 text-red-600 bg-red-50 p-3 rounded-md text-sm shrink-0" style="display:none;"></p>`,
      `${indent(d + 1)}<form class="auth-form flex-1 flex flex-col overflow-hidden" data-action="${mode}" data-redirect="{{REDIRECT_URL}}">`,
      `${indent(d + 2)}<div class="px-6 flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">`,
      `${indent(d + 3)}<div class="flex flex-col gap-2">`,
      `${indent(d + 4)}<label class="text-sm font-medium text-slate-950 line-height-1">Email</label>`,
      `${indent(d + 4)}<input type="email" name="email" required placeholder="you@example.com" class="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950">`,
      `${indent(d + 3)}</div>`,
      `${indent(d + 3)}<div class="flex flex-col gap-2">`,
      `${indent(d + 4)}<label class="text-sm font-medium text-slate-950 line-height-1">Password</label>`,
      `${indent(d + 4)}<input type="password" name="password" required placeholder="your password" class="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950">`,
      `${indent(d + 3)}</div>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 2)}<div class="p-6 flex flex-col gap-4 shrink-0">`,
      `${indent(d + 3)}<button type="submit" class="auth-button inline-flex items-center justify-center rounded-md text-sm font-medium h-10 bg-blue-600 text-white hover:bg-blue-700 transition-colors w-full cursor-pointer">Continue</button>`,
      `${indent(d + 3)}<div class="text-center"><p class="m-0 text-sm text-slate-500"><span class="auth-switch-text">${mode === 'signin' ? "Don't have an account?" : "Already have an account?"}</span> <button type="button" class="auth-switch-btn text-blue-600 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer">${mode === 'signin' ? 'Sign Up' : 'Sign In'}</button></p></div>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 1)}</form>`,
      `${indent(d)}</div>`,
    ].join("\n");
  },
  css: (c) => c.props?.css || "/* Styled via Scoped Tailwind */",
  js: (c) => c.props?.js_handler ? c.props.js_handler.replace(/\$elementId/g, elId(c)) : "",
});

register("profile", {
  html: (c, d = 0) => {
    if (c.props?.html) {
      let rawHtml = c.props.html.replace(/\$elementId/g, elId(c));
      const classStr = `class="`;
      const targetClass = `${compId(c)} `;
      if (rawHtml.includes(classStr) && !rawHtml.includes(`class="${targetClass}`) && !rawHtml.includes(` ${compId(c)} `)) {
        rawHtml = rawHtml.replace(classStr, `${classStr}${targetClass}`);
      }
      return `${indent(d)}${rawHtml}`;
    }
    const id = elId(c);
    return [
      `${indent(d)}<div class="profile-dropdown relative inline-block ${compId(c)} buildx-premade-block" id="${id}">`,
      `${indent(d + 1)}<button class="profile-btn flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border-none cursor-pointer">`,
      `${indent(d + 2)}<i data-lucide="user" class="w-5 h-5"></i>`,
      `${indent(d + 1)}</button>`,
      `${indent(d + 1)}<div class="dropdown-menu hidden absolute right-0 mt-2 w-48 bg-white rounded-md border border-slate-200 shadow-lg z-50 py-1">`,
      `${indent(d + 2)}<div id="profile-links">`,
      `${indent(d + 3)}<a href="sign-in.html" class="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 text-decoration-none">`,
      `${indent(d + 4)}<i data-lucide="log-in" class="w-4 h-4 mr-2"></i>Sign In`,
      `${indent(d + 3)}</a>`,
      `${indent(d + 2)}</div>`,
      `${indent(d + 1)}</div>`,
      `${indent(d)}</div>`,
    ].join("\n");
  },
  css: (c) => `.profile-dropdown:hover .dropdown-menu { display: block !important; }`,
  js: (c) => c.props?.js_handler ? c.props.js_handler.replace(/\$elementId/g, elId(c)) : "",
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT
// ═══════════════════════════════════════════════════════════════════════════════

register("paymongo-button", {
  html: (c, d = 0) => {
    const p = c.props ?? {};
    const amount = p.amount || 100;
    const label = esc(p.label || "Buy Now");
    const id = elId(c);
    return `${indent(d)}<button type="button" class="paymongo-btn ${compId(c)}" id="${id}" data-action="paymongo" data-amount="${amount}">${label} (${esc(p.currency || "PHP")} ${amount})</button>`;
  },
  css: (c) => c.props?.css || `.paymongo-btn { background-color:#3b82f6; color:#fff; font-weight:500; padding:0.625rem 1.25rem; border-radius:0.375rem; border:none; cursor:pointer; font-family:system-ui,sans-serif; }
.paymongo-btn:hover { background-color:#2563eb; }`,
  js: () => "",  // handled by global submit listener in buildx-sdk
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

register("custom-component", {
  html: (c, d = 0) => {
    const html = (c.props?.html || "").replace(/\$elementId/g, elId(c));
    return `${indent(d)}<div id="${elId(c)}" class="${compId(c)}" data-component-type="custom-component">\n${indent(d + 1)}${html}\n${indent(d)}</div>`;
  },
  css: (c) => c.props?.css || "",
  js: (c) => c.props?.js || "",
});

// ─── Shared CSS ─────────────────────────────────────────────────────────────────
const AUTH_CSS = `/* Styled via Scoped Tailwind */`;

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate HTML for any component. Falls back to a wrapper div if no
 * transpiler is registered for the component type.
 */
export function transpileHTML(component: ComponentData, depth = 0): string {
  const t = registry[component.type];
  if (t) return t.html(component, depth);
  // Fallback: wrap children in a generic div
  const ch = (component.children ?? []).map(c => transpileHTML(c, depth + 1)).join("\n");
  return `${indent(depth)}<div id="${elId(component)}" class="${compId(component)}">\n${ch}\n${indent(depth)}</div>`;
}

/**
 * Generate CSS for a component. Returns empty string if no transpiler exists.
 */
export function transpileCSS(component: ComponentData): string {
  const t = registry[component.type];
  return t ? t.css(component) : "";
}

/**
 * Generate JS for a component. Returns empty string if no transpiler exists.
 */
export function transpileJS(component: ComponentData): string {
  const t = registry[component.type];
  return t ? t.js(component) : "";
}

/**
 * Check if a specific block type has a dedicated transpiler registered.
 */
export function hasTranspiler(type: string): boolean {
  return type in registry;
}

/**
 * Get all registered block type names.
 */
export function getRegisteredTypes(): string[] {
  return Object.keys(registry);
}
