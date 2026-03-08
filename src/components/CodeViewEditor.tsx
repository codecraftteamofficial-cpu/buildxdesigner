"use client"

import type React from "react"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Button } from "./ui/button"
import {
  Copy, ChevronRight, ChevronDown, File, Save, Pencil, X,
  CheckCircle2, RefreshCw, AlertCircle, Plus, Trash2, FilePlus,
  FolderPlus, FileCode, FileText, Globe, ChevronDown as CaretDown,
} from "lucide-react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism"
import { generateProjectFiles, slugify } from "../lib/code-generator"

// --- VS CODE DARK MODERN THEME ---
const customSyntaxTheme = {
  ...okaidia,
  comment:     { color: "#6a9955", fontStyle: "italic" },
  punctuation: { color: "#d4d4d4" },
  property:    { color: "#9cdcfe" },
  tag:         { color: "#569cd6" },
  string:      { color: "#ce9178" },
  function:    { color: "#dcdcaa" },
  keyword:     { color: "#c586c0" },
}

// --- TYPES ---
export interface ComponentData {
  id: string
  type: string
  props: Record<string, any>
  style?: Record<string, any>
  position?: { x: number; y: number }
  children?: ComponentData[]
  page_id?: string
}

interface CodeViewEditorProps {
  components: ComponentData[]
  projectName?: string
  pages: { id: string; name: string; path: string }[]
  activePageId: string
  onCodeChange?: (newComponents: ComponentData[]) => void
  onPageCreate?: (name: string, path: string) => void
}

interface FileNode {
  name: string
  type: "file" | "folder"
  path: string
  children?: FileNode[]
}

type FileOverrides = Record<string, string>

// ─────────────────────────────────────────────
// FILE TEMPLATES
// ─────────────────────────────────────────────
const FILE_TEMPLATES: Record<string, (name: string) => string> = {
  php: (name) => `<?php
// ${name}
// Created: ${new Date().toLocaleDateString()}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= htmlspecialchars($pageTitle ?? '${name}') ?></title>
  <link rel="stylesheet" href="/public/assets/css/${name}.css" />
</head>
<body>
  <main class="page-${name}">
    <!-- ${name} content here -->
  </main>
  <script src="/public/assets/js/main.js"></script>
</body>
</html>`,

  css: (name) => `/* ${name}.css */

.page-${name} {
  min-height: 100vh;
  padding: 2rem;
}
`,

  js: (name) => `// ${name}.js
// Created: ${new Date().toLocaleDateString()}

(function () {
  'use strict';

  // ${name} logic
  document.addEventListener('DOMContentLoaded', function () {
    console.log('${name} loaded');
  });
})();
`,

  json: (name) => `{
  "name": "${name}",
  "created": "${new Date().toISOString()}"
}
`,

  md: (name) => `# ${name}

> Created ${new Date().toLocaleDateString()}

## Overview

Add your documentation here.
`,

  txt: (name) => `${name}\n`,
}

// ─────────────────────────────────────────────
// FILE CREATOR MODAL
// ─────────────────────────────────────────────
type FileTypeOption = { ext: string; label: string; icon: React.ReactNode; color: string; folder: string }

const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  { ext: "php",  label: "PHP View",    icon: <span className="text-[10px] font-bold text-[#8892bf]">PHP</span>,  color: "text-[#8892bf]", folder: "app/views" },
  { ext: "css",  label: "Stylesheet",  icon: <span className="text-[10px] font-bold text-[#3fa9f5]">CSS</span>,  color: "text-[#3fa9f5]", folder: "public/assets/css" },
  { ext: "js",   label: "JavaScript",  icon: <span className="text-[10px] font-bold text-[#f7df1e]">JS</span>,   color: "text-[#f7df1e]", folder: "public/assets/js" },
  { ext: "json", label: "JSON Config", icon: <span className="text-[10px] font-bold text-[#f5a623]">JSON</span>, color: "text-[#f5a623]", folder: "app/config" },
  { ext: "md",   label: "Markdown",    icon: <span className="text-[10px] font-bold text-[#aaa]">MD</span>,      color: "text-[#aaa]",     folder: "docs" },
]

interface FileCreatorModalProps {
  onClose: () => void
  existingPaths: string[]
  onCreateFile: (path: string, content: string) => void
}

function FileCreatorModal({ onClose, existingPaths, onCreateFile }: FileCreatorModalProps) {
  const [selectedType, setSelectedType] = useState<FileTypeOption>(FILE_TYPE_OPTIONS[0])
  const [fileName, setFileName]         = useState("")
  const [customFolder, setCustomFolder] = useState("")
  const [useCustomFolder, setUseCustomFolder] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  const folder     = useCustomFolder ? customFolder : selectedType.folder
  const cleanName  = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()
  const finalPath  = cleanName ? `${folder}/${cleanName}.${selectedType.ext}` : ""

  const validate = () => {
    if (!cleanName) return "File name is required."
    if (existingPaths.includes(finalPath)) return `File already exists: ${finalPath}`
    return ""
  }

  const handleCreate = () => {
    const err = validate()
    if (err) { setError(err); return }
    const template = FILE_TEMPLATES[selectedType.ext] ?? (() => "")
    onCreateFile(finalPath, template(cleanName))
    toast.success(`Created ${finalPath}`)
    onClose()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate()
    if (e.key === "Escape") onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[420px] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2b2b2b]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <FilePlus className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-sm font-semibold text-white">New File</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded hover:bg-[#333] flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* File type selector */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">File Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {FILE_TYPE_OPTIONS.map(opt => (
                <button key={opt.ext}
                  onClick={() => { setSelectedType(opt); setError(""); if (!useCustomFolder) setCustomFolder("") }}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all ${
                    selectedType.ext === opt.ext
                      ? "border-purple-500/60 bg-purple-500/10 text-white"
                      : "border-[#2b2b2b] bg-[#222] hover:border-[#444] text-muted-foreground hover:text-white"
                  }`}>
                  {opt.icon}
                  <span className="text-[9px] leading-none">{opt.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* File name */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">File Name</label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={fileName}
                onChange={e => { setFileName(e.target.value); setError("") }}
                onKeyDown={handleKey}
                placeholder={`e.g. ${selectedType.ext === "php" ? "about" : selectedType.ext === "css" ? "styles" : "utils"}`}
                className="flex-1 h-9 bg-[#111] border border-[#333] rounded-lg px-3 text-sm text-white placeholder:text-muted-foreground/40 outline-none focus:border-purple-500/50 transition-colors font-mono"
              />
              <span className="text-[12px] text-muted-foreground/60 font-mono shrink-0">.{selectedType.ext}</span>
            </div>
          </div>

          {/* Destination folder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Destination</label>
              <button
                onClick={() => { setUseCustomFolder(p => !p); setCustomFolder(selectedType.folder) }}
                className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
                {useCustomFolder ? "Use default" : "Custom folder"}
              </button>
            </div>
            {useCustomFolder ? (
              <input
                value={customFolder}
                onChange={e => setCustomFolder(e.target.value)}
                className="w-full h-9 bg-[#111] border border-[#333] rounded-lg px-3 text-sm text-white placeholder:text-muted-foreground/40 outline-none focus:border-purple-500/50 transition-colors font-mono"
              />
            ) : (
              <div className="flex items-center gap-2 h-9 px-3 bg-[#111] border border-[#2b2b2b] rounded-lg">
                <span className="text-xs font-mono text-muted-foreground/60">{selectedType.folder}/</span>
              </div>
            )}
          </div>

          {/* Preview path */}
          {cleanName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#111] rounded-lg border border-[#2b2b2b]">
              <span className="text-[10px] text-muted-foreground/40 shrink-0">Will create:</span>
              <span className="text-[11px] font-mono text-green-400 truncate">{finalPath}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-[11px] text-red-400">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#2b2b2b] bg-[#161616]">
          <span className="text-[10px] text-muted-foreground/40">Enter to create · Esc to cancel</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-8 px-3 text-xs rounded-lg bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] text-muted-foreground hover:text-white transition-all">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={!cleanName}
              className="h-8 px-4 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-1.5">
              <FilePlus className="w-3.5 h-3.5" />Create File
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DEFAULT PROPS PER COMPONENT TYPE
// ─────────────────────────────────────────────
const DEFAULT_COMPONENT_DEFS: Record<string, { props: Record<string, any>; style: Record<string, any> }> = {
  heading:           { props: { content: "New Heading", level: 1 },                  style: { fontSize: "32px", fontWeight: "700", width: "400px", height: "60px" } },
  text:              { props: { content: "New text block." },                         style: { fontSize: "16px", width: "300px", height: "50px" } },
  paragraph:         { props: { content: "New paragraph text." },                     style: { fontSize: "16px", width: "600px", height: "100px" } },
  button:            { props: { text: "Click Me", content: "Click Me" },              style: { width: "140px", height: "44px", backgroundColor: "#6d28d9", color: "#fff", borderRadius: "6px" } },
  image:             { props: { src: "", alt: "Image" },                              style: { width: "300px", height: "200px" } },
  navbar:            { props: { brand: "Brand", links: ["Home","About","Contact"] },  style: { width: "1200px", height: "64px", backgroundColor: "#1f2937", color: "#fff", padding: "1rem" } },
  hero:              { props: { title: "Welcome", subtitle: "Hero subtitle", buttonText: "Get Started" }, style: { width: "1200px", height: "400px", backgroundColor: "#f3f4f6", padding: "4rem 2rem" } },
  footer:            { props: { copyright: "© 2024 Your Company" },                  style: { width: "1200px", height: "100px", backgroundColor: "#374151", color: "#fff", padding: "2rem" } },
  input:             { props: { type: "text", placeholder: "Enter text..." },         style: { width: "300px", height: "40px" } },
  textarea:          { props: { placeholder: "Enter message..." },                    style: { width: "400px", height: "120px" } },
  card:              { props: { title: "Card Title", description: "Card description.", buttonText: "Learn More" }, style: { width: "300px", height: "350px" } },
  container:         { props: { content: "" },                                        style: { width: "400px", height: "200px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" } },
  "section-heading": { props: { title: "Section Title", subtitle: "Section subtitle" }, style: { width: "600px", height: "120px" } },
  grid:              { props: { columns: 3, gap: "1rem" },                            style: { width: "700px", height: "300px" } },
  video:             { props: { src: "", poster: "" },                                style: { width: "640px", height: "360px" } },
}

const ADD_COMPONENT_TYPES = [
  { type: "heading",         label: "Heading",        icon: "H1" },
  { type: "text",            label: "Text",           icon: "T"  },
  { type: "paragraph",       label: "Paragraph",      icon: "¶"  },
  { type: "button",          label: "Button",         icon: "⬡"  },
  { type: "image",           label: "Image",          icon: "🖼" },
  { type: "input",           label: "Input",          icon: "▭"  },
  { type: "textarea",        label: "Textarea",       icon: "▣"  },
  { type: "navbar",          label: "Navbar",         icon: "≡"  },
  { type: "hero",            label: "Hero",           icon: "★"  },
  { type: "footer",          label: "Footer",         icon: "▬"  },
  { type: "section-heading", label: "Section Heading",icon: "§"  },
  { type: "card",            label: "Card",           icon: "⊞"  },
]

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function sanitizeId(id: string) { return id.replace(/[^a-zA-Z0-9_-]/g, "-") }
function extractShortId(cls: string): string | null {
  const m = cls.trim().split(/\s+/)[0].match(/^comp-(.+)$/)
  return m ? m[1] : null
}
function extractClassName(cls: string) { return cls.trim().split(/\s+/)[0] || cls.trim() }
function stripTags(html: string)       { return html.replace(/<[^>]+>/g, "") }

const UNITLESS_PROPS = new Set(["opacity","zIndex","fontWeight","lineHeight","flex","order","flexGrow","flexShrink","columnCount"])
function normalizeStyleValues(style: Record<string, any> = {}): Record<string, any> {
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(style)) r[k] = typeof v === "number" && !UNITLESS_PROPS.has(k) ? `${v}px` : v
  return r
}
function countDiffLines(a: string, b: string) {
  const la = a.split("\n"), lb = b.split("\n"), max = Math.max(la.length, lb.length)
  let d = 0; for (let i = 0; i < max; i++) if (la[i] !== lb[i]) d++
  return d
}
function autoPosition(index: number): { x: number; y: number } { return { x: 60, y: 60 + index * 130 } }

// ─────────────────────────────────────────────
// PHP SNIPPET GENERATOR
// ─────────────────────────────────────────────
function generateComponentSnippet(type: string): string {
  const id  = `code-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const sid = sanitizeId(id)
  const cls = `comp-${sid}`

  const map: Record<string, string> = {
    heading:   `<h1 class="${cls}">New Heading</h1>`,
    text:      `<p class="${cls}">New text block.</p>`,
    paragraph: `<p class="${cls}">New paragraph text.</p>`,
    button:    `<button id="btn-${sid}" class="${cls}">Click Me</button>`,
    image:     `<img src="" alt="image" class="${cls}" />`,
    input:     `<input type="text" placeholder="Enter text..." class="${cls}" />`,
    textarea:  `<textarea placeholder="Enter message..." class="${cls}"></textarea>`,
    navbar: [
      `<nav class="${cls} full-width-block">`,
      `  <div class="nav-brand">Brand</div>`,
      `  <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">`,
      `    <span class="burger-bar"></span><span class="burger-bar"></span><span class="burger-bar"></span>`,
      `  </button>`,
      `  <ul class="nav-links">`,
      `    <li><a href="/">Home</a></li>`,
      `    <li><a href="/about">About</a></li>`,
      `    <li><a href="/contact">Contact</a></li>`,
      `  </ul>`,
      `</nav>`,
    ].join("\n"),
    hero: [
      `<section class="${cls} full-width-block">`,
      `  <h1>Welcome</h1>`,
      `  <p>Hero subtitle text.</p>`,
      `  <a href="#" class="hero-btn">Get Started</a>`,
      `</section>`,
    ].join("\n"),
    footer: [
      `<footer class="${cls} full-width-block">`,
      `  <p>© 2024 Your Company</p>`,
      `</footer>`,
    ].join("\n"),
    "section-heading": [
      `<div class="${cls}">`,
      `  <h2>Section Title</h2>`,
      `  <p>Section subtitle text.</p>`,
      `</div>`,
    ].join("\n"),
    card: [
      `<div class="${cls}">`,
      `  <h3>Card Title</h3>`,
      `  <p>Card description text.</p>`,
      `  <a href="#" class="card-btn">Learn More</a>`,
      `</div>`,
    ].join("\n"),
  }
  return map[type] ?? `<div class="${cls}"><!-- ${type} --></div>`
}

// ─────────────────────────────────────────────
// FULL PHP → COMPONENT LIST PARSER
// ─────────────────────────────────────────────
function parsePHPToFullComponentList(
  phpCode: string,
  pageId: string,
  existingComponents: ComponentData[]
): ComponentData[] {
  const byId = new Map<string, ComponentData>()
  for (const c of existingComponents) byId.set(sanitizeId(c.id), c)

  const result: ComponentData[] = []
  const seen   = new Set<string>()

  const add = (sid: string, type: string, parsedProps: Record<string, any>) => {
    if (seen.has(sid)) return
    seen.add(sid)
    const existing = byId.get(sid)
    const defs     = DEFAULT_COMPONENT_DEFS[type] ?? { props: {}, style: {} }

    const preservedStyle = existing?.style
      ? normalizeStyleValues(existing.style)
      : normalizeStyleValues({ ...defs.style })

    result.push({
      id:       existing?.id ?? sid,
      type,
      props:    { ...defs.props, ...(existing?.props ?? {}), ...parsedProps },
      style:    preservedStyle,
      position: existing?.position ?? autoPosition(result.length),
      page_id:  pageId,
      children: existing?.children,
    })
  }

  for (const m of phpCode.matchAll(/<h([1-6])[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/h[1-6]>/gi)) {
    const sid = extractShortId(m[2]); if (!sid) continue
    add(sid, "heading", { content: stripTags(m[3].trim()), level: parseInt(m[1]), className: extractClassName(m[2]) })
  }
  for (const m of phpCode.matchAll(/<p[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "text", { content: stripTags(m[2].trim()), className: extractClassName(m[1]) })
  }
  for (const m of phpCode.matchAll(/<button[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "button", { text: stripTags(m[2].trim()), content: stripTags(m[2].trim()), className: extractClassName(m[1]) })
  }
  for (const m of phpCode.matchAll(/<img[^>]*src="([^"]*)"[^>]*class="([^"]*)"[^>]*\/?>/gi)) {
    const sid = extractShortId(m[2]); if (!sid) continue
    add(sid, "image", { src: m[1], className: extractClassName(m[2]) })
  }
  for (const m of phpCode.matchAll(/<img[^>]*class="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "image", { src: m[2], className: extractClassName(m[1]) })
  }
  for (const m of phpCode.matchAll(/<input[^>]*class="([^"]*)"[^>]*placeholder="([^"]*)"[^>]*\/?>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "input", { placeholder: m[2], className: extractClassName(m[1]) })
  }
  for (const m of phpCode.matchAll(/<textarea[^>]*class="([^"]*)"[^>]*placeholder="([^"]*)"[^>]*>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "textarea", { placeholder: m[2], className: extractClassName(m[1]) })
  }
  for (const m of phpCode.matchAll(/<nav[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/nav>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    const brand = (m[2].match(/<div class="nav-brand">([\s\S]*?)<\/div>/i)?.[1]) ?? "Brand"
    const links = [...m[2].matchAll(/<li><a[^>]*>([\s\S]*?)<\/a><\/li>/gi)].map(l => stripTags(l[1].trim())).filter(Boolean)
    add(sid, "navbar", { brand: stripTags(brand.trim()), links: links.length ? links : ["Home","About","Contact"] })
  }
  for (const m of phpCode.matchAll(/<section[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/section>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "hero", {
      title:      stripTags((m[2].match(/<h1>([\s\S]*?)<\/h1>/i)?.[1] ?? "Welcome").trim()),
      subtitle:   stripTags((m[2].match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "").trim()),
      buttonText: stripTags((m[2].match(/<a[^>]*class="hero-btn"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "Get Started").trim()),
    })
  }
  for (const m of phpCode.matchAll(/<footer[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/footer>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "footer", { copyright: stripTags((m[2].match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "").trim()) })
  }
  for (const m of phpCode.matchAll(/<div[^>]*class="([^"]*)"[^>]*>\s*<h2>([\s\S]*?)<\/h2>([\s\S]*?)<\/div>/gi)) {
    const sid = extractShortId(m[1]); if (!sid || seen.has(sid)) continue
    add(sid, "section-heading", {
      title:    stripTags(m[2].trim()),
      subtitle: stripTags((m[3].match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "").trim()),
    })
  }

  return result
}

// ─────────────────────────────────────────────
// CSS PARSER
// ─────────────────────────────────────────────
function parseCSSToStyleUpdates(css: string): Map<string, Record<string, any>> {
  const map = new Map<string, Record<string, any>>()
  for (const m of css.matchAll(/\.(comp-[a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g)) {
    const sid = m[1].replace(/^comp-/, "")
    const style: Record<string, any> = {}
    for (const line of m[2].split(";")) {
      const t = line.trim(); if (!t) continue
      const ci = t.indexOf(":"); if (ci === -1) continue
      const prop = t.slice(0, ci).trim(), value = t.slice(ci + 1).trim()
      if (!prop || !value) continue
      style[prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value
    }
    if (Object.keys(style).length) map.set(sid, style)
  }
  return map
}

// ─────────────────────────────────────────────
// FULL SYNC: PHP + CSS → Canvas
// ─────────────────────────────────────────────
function syncPHPToCanvas(
  phpCode: string,
  cssCode: string | null,
  allComponents: ComponentData[],
  pageId: string,
): { components: ComponentData[]; added: number; deleted: number; updated: number } {
  const isThisPage = (c: ComponentData) =>
    c.page_id === pageId || (!c.page_id) || c.page_id === undefined

  const thisPage  = allComponents.filter(isThisPage)
  const globals   = allComponents.filter(c => c.page_id === "all")
  const otherPage = allComponents.filter(c => !isThisPage(c) && c.page_id !== "all")

  const existingSids = new Set(thisPage.map(c => sanitizeId(c.id)))
  const parsedList   = parsePHPToFullComponentList(phpCode, pageId, thisPage)
  const parsedSids   = new Set(parsedList.map(c => sanitizeId(c.id)))
  const unrecognised = thisPage.filter(c => !parsedSids.has(sanitizeId(c.id)))

  if (cssCode) {
    const cssUpdates = parseCSSToStyleUpdates(cssCode)
    for (const comp of parsedList) {
      const sid = sanitizeId(comp.id)
      if (!existingSids.has(sid)) {
        const cu = cssUpdates.get(sid)
        if (cu) comp.style = normalizeStyleValues({ ...(comp.style ?? {}), ...cu })
      }
    }
  }

  const added   = [...parsedSids].filter(s => !existingSids.has(s)).length
  const deleted = [...existingSids].filter(s => !parsedSids.has(s) && !unrecognised.find(c => sanitizeId(c.id) === s)).length
  const updated = parsedList.length - added

  const globalsSet = new Set(globals.map(c => c.id))
  return {
    components: [
      ...globals,
      ...otherPage.filter(c => !globalsSet.has(c.id)),
      ...unrecognised,
      ...parsedList,
    ],
    added, deleted, updated,
  }
}

// ─────────────────────────────────────────────
// SMALL FILE TYPE ICONS
// ─────────────────────────────────────────────
const PHPIcon  = () => <span className="text-[10px] font-bold text-[#8892bf] shrink-0 mr-1">PHP</span>
const CSSIcon  = () => <span className="text-[10px] font-bold text-[#3fa9f5] shrink-0 mr-1">CSS</span>
const JSIcon   = () => <span className="text-[10px] font-bold text-[#f7df1e] shrink-0 mr-1">JS</span>
const MDIcon   = () => <span className="text-[10px] font-bold text-[#aaa]    shrink-0 mr-1">MD</span>
const JSONIcon = () => <span className="text-[10px] font-bold text-[#f5a623] shrink-0 mr-1">JSON</span>

// ─────────────────────────────────────────────
// FILE TREE BUILDER
// ─────────────────────────────────────────────
const buildTreeFromPaths = (paths: string[]): FileNode[] => {
  const root: FileNode = { name: "root", type: "folder", path: "", children: [] }
  for (const path of paths) {
    const segs = path.split("/")
    let cur = root
    segs.forEach((seg, i) => {
      const curPath = segs.slice(0, i + 1).join("/")
      const isFile  = i === segs.length - 1 && seg.includes(".")
      cur.children ??= []
      let node = cur.children.find(n => n.path === curPath)
      if (!node) {
        node = { name: seg, type: isFile ? "file" : "folder", path: curPath, children: isFile ? undefined : [] }
        cur.children.push(node)
      }
      cur = node
    })
  }
  const sort = (nodes: FileNode[]): FileNode[] =>
    nodes.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1)
      .map(n => ({ ...n, children: n.children ? sort(n.children) : undefined }))
  return sort(root.children ?? [])
}

// ═════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════
export function CodeViewEditor({
  components,
  projectName = "php-builder",
  pages,
  activePageId,
  onCodeChange,
  onPageCreate,
}: CodeViewEditorProps) {
  const [selectedFile,    setSelectedFile]    = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["app","app/views","public","public/assets","public/assets/css","public/assets/js"])
  )
  const [isEditing,       setIsEditing]       = useState(false)
  const [draftContent,    setDraftContent]    = useState("")
  const [savedIndicator,  setSavedIndicator]  = useState(false)
  const [fileOverrides,   setFileOverrides]   = useState<FileOverrides>({})
  const [customFiles,     setCustomFiles]     = useState<FileOverrides>({})
  const [showAddPanel,    setShowAddPanel]    = useState(false)
  const [showFileCreator, setShowFileCreator] = useState(false)
  const [pendingDiff,     setPendingDiff]     = useState<{ added: number; deleted: number; updated: number } | null>(null)
  const [deleteConfirm,   setDeleteConfirm]   = useState<string | null>(null)

  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const componentsRef = useRef(components)
  useEffect(() => { componentsRef.current = components }, [components])

  // ── Generated + effective files ──────────────
  const generatedFiles = useMemo(
    () => generateProjectFiles(components, pages, projectName),
    [components, pages, projectName]
  )
  const effectiveFiles = useMemo<Record<string, string>>(
    () => ({ ...generatedFiles, ...fileOverrides, ...customFiles }),
    [generatedFiles, fileOverrides, customFiles]
  )

  // ── Derive page_id from the selected PHP file ──
  const activePHPPageId = useMemo(() => {
    if (!selectedFile.startsWith("app/views/") || !selectedFile.endsWith(".php")) return activePageId
    const base = selectedFile.replace("app/views/", "").replace(".php", "")
    return pages.find(p => slugify(p.name) === base)?.id ?? activePageId
  }, [selectedFile, pages, activePageId])

  // ── Auto-select first file ──
  useEffect(() => {
    const page = pages.find(p => p.id === activePageId) ?? pages[0]
    setSelectedFile(prev => prev || `app/views/${slugify(page.name)}.php`)
  }, [activePageId, pages])

  // ── Live diff preview while editing PHP ──
  useEffect(() => {
    if (!isEditing || !selectedFile.startsWith("app/views/") || !selectedFile.endsWith(".php")) {
      setPendingDiff(null); return
    }
    try {
      const cssFile = selectedFile.replace("app/views/", "public/assets/css/").replace(".php", ".css")
      const { added, deleted, updated } = syncPHPToCanvas(
        draftContent, effectiveFiles[cssFile] ?? null, componentsRef.current, activePHPPageId
      )
      setPendingDiff({ added, deleted, updated })
    } catch { setPendingDiff(null) }
  }, [draftContent, isEditing, selectedFile, activePHPPageId, effectiveFiles])

  const readOnlyContent = effectiveFiles[selectedFile] ?? ""
  const hasOverride     = !!fileOverrides[selectedFile]
  const isCustomFile    = !!customFiles[selectedFile]
  const diffCount       = hasOverride ? countDiffLines(generatedFiles[selectedFile] ?? "", fileOverrides[selectedFile] ?? "") : 0

  const isViewPHP = selectedFile.startsWith("app/views/") && selectedFile.endsWith(".php")
  const isCSSFile = selectedFile.endsWith(".css")
  const isJSFile  = selectedFile.endsWith(".js")
  const isMDFile  = selectedFile.endsWith(".md")
  const isJSONFile = selectedFile.endsWith(".json")

  const syntaxLang = isCSSFile ? "css" : isJSFile ? "javascript" : isMDFile ? "markdown" : isJSONFile ? "json" : "php"

  const handleSelectFile = (path: string) => {
    if (path === selectedFile) return
    setIsEditing(false); setDraftContent(""); setShowAddPanel(false); setSelectedFile(path)
  }
  const handleStartEdit = () => {
    setDraftContent(readOnlyContent); setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }
  const handleCancelEdit = () => { setIsEditing(false); setDraftContent(""); setPendingDiff(null) }
  const handleResetOverride = useCallback(() => {
    setFileOverrides(p => { const n = { ...p }; delete n[selectedFile]; return n })
    toast.info("Reset to canvas-generated version.")
  }, [selectedFile])

  // ── Create new file ──
  const handleCreateFile = useCallback((path: string, content: string) => {
    setCustomFiles(prev => ({ ...prev, [path]: content }))
    setSelectedFile(path)

    // If it's a new PHP view, register it as a page in the editor
    if (path.startsWith("app/views/") && path.endsWith(".php") && onPageCreate) {
      const slug = path.replace("app/views/", "").replace(".php", "")
      // Convert slug to a human-readable name: "about-us" → "About Us"
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      const pagePath = `/${slug}`
      // Only register if not already in pages list
      const alreadyExists = pages.some(p => slugify(p.name) === slug || p.path === pagePath)
      if (!alreadyExists) {
        onPageCreate(name, pagePath)
      }
    }

    // Auto-expand the parent folder
    const parts = path.split("/")
    setExpandedFolders(prev => {
      const next = new Set(prev)
      for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join("/"))
      return next
    })
  }, [onPageCreate, pages])

  // ── Delete custom file ──
  const handleDeleteCustomFile = useCallback((path: string) => {
    setCustomFiles(prev => { const n = { ...prev }; delete n[path]; return n })
    setDeleteConfirm(null)
    if (selectedFile === path) setSelectedFile("")
    toast.success("File deleted.")
  }, [selectedFile])

  // ── Insert snippet into PHP ──
  const handleInsertSnippet = (type: string) => {
    const snippet = generateComponentSnippet(type)
    const current = isEditing ? draftContent : readOnlyContent
    const insertAt = current.lastIndexOf("</div>")
    const newContent = insertAt !== -1
      ? current.slice(0, insertAt) + `  ${snippet}\n` + current.slice(insertAt)
      : current + "\n" + snippet

    setDraftContent(newContent)
    if (!isEditing) { setIsEditing(true); setTimeout(() => textareaRef.current?.focus(), 0) }
    setShowAddPanel(false)
    toast.success(`${type} snippet added — Save & Sync to apply to canvas.`)
  }

  // ── Delete component directly from canvas ──
  const handleDeleteComponent = useCallback((compId: string) => {
    if (!onCodeChange) return
    const sid = sanitizeId(compId)
    onCodeChange(componentsRef.current.filter(c => sanitizeId(c.id) !== sid))

    setFileOverrides(prev => {
      const next = { ...prev }
      for (const [path, content] of Object.entries(next)) {
        if (path.endsWith(".php"))
          next[path] = content.replace(new RegExp(`[ \\t]*<[^>]+class="comp-${sid}[^"]*"[\\s\\S]*?(?:<\\/[a-zA-Z]+>|\\/>)\\n?`, "gi"), "")
        if (path.endsWith(".css"))
          next[path] = content.replace(new RegExp(`\\.comp-${sid}[a-zA-Z0-9_-]*\\s*\\{[^}]*\\}\\n?`, "gi"), "")
      }
      return next
    })
    toast.success("Component deleted from canvas.")
  }, [onCodeChange])

  // ── SAVE ──
  const handleSave = useCallback(() => {
    if (!selectedFile) return

    // If editing a custom file, update customFiles; otherwise fileOverrides
    if (isCustomFile) {
      setCustomFiles(prev => ({ ...prev, [selectedFile]: draftContent }))
    } else {
      setFileOverrides(prev => ({ ...prev, [selectedFile]: draftContent }))
    }

    if (isViewPHP && onCodeChange) {
      const cssFile = selectedFile.replace("app/views/", "public/assets/css/").replace(".php", ".css")
      const cssCode = effectiveFiles[cssFile] ?? null
      try {
        const { components: synced, added, deleted, updated } = syncPHPToCanvas(
          draftContent, cssCode, componentsRef.current, activePHPPageId
        )
        onCodeChange(synced)
        const parts = [
          added   > 0 ? `+${added} added`   : "",
          deleted > 0 ? `-${deleted} deleted` : "",
          updated > 0 ? `${updated} updated`  : "",
        ].filter(Boolean)
        toast.success(`Canvas synced! ${parts.join("  ") || "No structural changes."}`)
      } catch (err: any) {
        toast.error("Sync failed: " + err.message)
      }
    } else if (isCSSFile && onCodeChange) {
      const cssUpdates = parseCSSToStyleUpdates(draftContent)
      if (cssUpdates.size > 0) {
        const updated = componentsRef.current.map(c => {
          const cu = cssUpdates.get(sanitizeId(c.id))
          return cu ? { ...c, style: normalizeStyleValues({ ...(c.style ?? {}), ...cu }) } : c
        })
        onCodeChange(updated)
        toast.success(`CSS synced — ${cssUpdates.size} component(s) styled.`)
      } else {
        toast.success("CSS file saved.")
      }
    } else if (isJSFile) {
      toast.success("JS file saved. Changes apply to exported project.")
    } else {
      toast.success("File saved.")
    }

    setIsEditing(false); setDraftContent(""); setPendingDiff(null)
    setSavedIndicator(true); setTimeout(() => setSavedIndicator(false), 2500)
  }, [selectedFile, draftContent, isViewPHP, isCSSFile, isJSFile, isCustomFile, onCodeChange, activePHPPageId, effectiveFiles])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isEditing) return
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave() }
      if (e.key === "Escape") handleCancelEdit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isEditing, handleSave])

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return
    e.preventDefault()
    const ta = e.currentTarget, start = ta.selectionStart, sp = "  "
    setDraftContent(ta.value.slice(0, start) + sp + ta.value.slice(ta.selectionEnd))
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + sp.length })
  }

  // ── File tree ──
  const fileStructure = useMemo(() => buildTreeFromPaths(Object.keys(effectiveFiles)), [effectiveFiles])

  const renderFileIcon = (node: FileNode) => {
    if (node.path.endsWith(".php"))  return <PHPIcon />
    if (node.path.endsWith(".css"))  return <CSSIcon />
    if (node.path.endsWith(".js"))   return <JSIcon />
    if (node.path.endsWith(".md"))   return <MDIcon />
    if (node.path.endsWith(".json")) return <JSONIcon />
    return <File className="w-3 h-3" />
  }

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map(node => {
      const overridden = node.type === "file" && !!fileOverrides[node.path]
      const isNew      = node.type === "file" && !!customFiles[node.path]
      return (
        <div key={node.path}>
          <div
            className={`group/tree flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-muted/40 transition-colors ${
              selectedFile === node.path ? "bg-muted text-white" : "text-muted-foreground"
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => node.type === "folder"
              ? setExpandedFolders(p => { const n = new Set(p); n.has(node.path) ? n.delete(node.path) : n.add(node.path); return n })
              : handleSelectFile(node.path)
            }
          >
            {node.type === "folder"
              ? expandedFolders.has(node.path) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
              : renderFileIcon(node)
            }
            <span className={`text-sm truncate flex-1 ${overridden ? "text-amber-400" : ""} ${isNew ? "text-green-400" : ""}`}>{node.name}</span>
            <div className="flex items-center gap-1">
              {overridden && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Manually edited" />}
              {isNew      && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Custom file" />}
              {/* Delete button for custom files */}
              {isNew && node.type === "file" && (
                <button
                  className="opacity-0 group-hover/tree:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 text-muted-foreground/50 hover:text-red-400 transition-all"
                  title="Delete custom file"
                  onClick={e => { e.stopPropagation(); setDeleteConfirm(node.path) }}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
          {node.type === "folder" && expandedFolders.has(node.path) && node.children && renderTree(node.children, depth + 1)}
        </div>
      )
    })

  // ── Page components for sidebar ──
  const pageComponents = useMemo(() =>
    components.filter(c => c.page_id === activePHPPageId || !c.page_id || c.page_id === undefined),
    [components, activePHPPageId]
  )

  const totalCustomFiles = Object.keys(customFiles).length

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════
  return (
    <div className="w-full h-full flex gap-3 p-4 bg-background">

      {/* ── File Creator Modal ── */}
      {showFileCreator && (
        <FileCreatorModal
          existingPaths={Object.keys(effectiveFiles)}
          onClose={() => setShowFileCreator(false)}
          onCreateFile={handleCreateFile}
        />
      )}

      {/* ── Delete Confirm Overlay ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[#1a1a1a] border border-[#333] rounded-xl p-5 w-80 shadow-2xl">
            <p className="text-sm text-white mb-1 font-semibold">Delete file?</p>
            <p className="text-xs text-muted-foreground mb-4 font-mono truncate">{deleteConfirm}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="h-8 px-3 text-xs rounded-lg bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] text-muted-foreground hover:text-white transition-all">Cancel</button>
              <button onClick={() => handleDeleteCustomFile(deleteConfirm)} className="h-8 px-3 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── File Explorer ── */}
      <div className="w-52 border rounded-md flex flex-col bg-[#181818] h-full overflow-hidden shrink-0">
        <div className="px-3 py-2.5 border-b border-[#2b2b2b] flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Explorer</span>
          <div className="flex items-center gap-1.5">
            {Object.keys(fileOverrides).length > 0 &&
              <span className="text-[10px] text-amber-400">{Object.keys(fileOverrides).length} edited</span>
            }
            {/* ── New File Button ── */}
            <button
              onClick={() => setShowFileCreator(true)}
              title="New File"
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#2b2b2b] text-muted-foreground/60 hover:text-white transition-colors"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">{renderTree(fileStructure)}</div>
        <div className="px-3 py-2 border-t border-[#2b2b2b] text-[10px] text-muted-foreground/40 space-y-1">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> manually edited</div>
          {totalCustomFiles > 0 && (
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> custom file</div>
          )}
        </div>
      </div>

      {/* ── Editor Pane ── */}
      <div className="flex-1 border rounded-md overflow-hidden flex flex-col bg-[#1f1f1f] h-full min-w-0">

        {/* ── Top bar ── */}
        <div className="px-4 py-2 border-b border-[#2b2b2b] bg-[#181818] flex items-center justify-between gap-2 shrink-0 flex-wrap">
          {/* Left: badges */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{selectedFile}</span>

            {isCustomFile && !isEditing && (
              <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded shrink-0">
                custom
              </span>
            )}
            {isJSFile && (
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.5 rounded shrink-0">
                JS — export only
              </span>
            )}
            {hasOverride && !isEditing && (
              <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                <AlertCircle className="w-3 h-3" />{diffCount} lines changed
              </span>
            )}
            {isEditing && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">Editing</span>
            )}
            {isEditing && pendingDiff && isViewPHP && (
              <span className="flex items-center gap-1.5 text-[10px] bg-[#252525] border border-[#3a3a3a] px-2 py-0.5 rounded shrink-0">
                {pendingDiff.added   > 0 && <span className="text-green-400">+{pendingDiff.added} add</span>}
                {pendingDiff.deleted > 0 && <span className="text-red-400">-{pendingDiff.deleted} del</span>}
                {pendingDiff.updated > 0 && <span className="text-blue-400">~{pendingDiff.updated} upd</span>}
                <span className="text-muted-foreground/50">on save</span>
              </span>
            )}
            {savedIndicator && !isEditing && (
              <span className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded shrink-0">
                <CheckCircle2 className="w-3 h-3" />Synced
              </span>
            )}
          </div>

          {/* Right: buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing ? (
              <>
                {hasOverride && (
                  <Button size="sm" variant="ghost"
                    className="h-7 px-2 gap-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    onClick={handleResetOverride} title="Reset to generated">
                    <RefreshCw className="h-3 w-3" />Reset
                  </Button>
                )}
                {isViewPHP && onCodeChange && (
                  <Button size="sm" variant="outline"
                    className={`h-7 px-2.5 gap-1 text-xs border-[#3a3a3a] transition-colors ${
                      showAddPanel ? "bg-green-700/80 text-white border-green-600" : "bg-[#2a2a2a] hover:bg-[#333] text-muted-foreground hover:text-white"
                    }`}
                    onClick={() => setShowAddPanel(p => !p)}>
                    <Plus className="h-3 w-3" />Add
                  </Button>
                )}
                {/* New File button in top bar too */}
                <Button size="sm" variant="outline"
                  className="h-7 px-2.5 gap-1 text-xs border-[#3a3a3a] bg-[#2a2a2a] hover:bg-[#333] text-muted-foreground hover:text-green-400 hover:border-green-700/40"
                  onClick={() => setShowFileCreator(true)}
                  title="Create new file">
                  <FilePlus className="h-3 w-3" />New
                </Button>
                <Button size="sm" variant="outline"
                  className="h-7 px-2.5 gap-1 text-xs border-[#3a3a3a] bg-[#2a2a2a] hover:bg-[#333] text-muted-foreground hover:text-white"
                  onClick={handleStartEdit}>
                  <Pencil className="h-3 w-3" />Edit
                </Button>
                <Button size="sm" variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                  onClick={() => { navigator.clipboard.writeText(readOnlyContent); toast.success("Copied!") }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm"
                  className={`h-7 px-3 gap-1.5 text-xs text-white border-0 ${
                    isViewPHP ? "bg-purple-600 hover:bg-purple-700"
                    : isJSFile  ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={handleSave}
                  title={isViewPHP ? "Sync adds/edits/deletes to canvas (Ctrl+S)" : "Save (Ctrl+S)"}>
                  <Save className="h-3.5 w-3.5" />{isViewPHP ? "Save & Sync" : "Save"}
                </Button>
                <Button size="sm" variant="ghost"
                  className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-white"
                  onClick={handleCancelEdit} title="Discard (Esc)">
                  <X className="h-3.5 w-3.5" />Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Add Component Panel ── */}
        {showAddPanel && !isEditing && (
          <div className="shrink-0 border-b border-[#2b2b2b] bg-[#161616] px-4 py-3 animate-in slide-in-from-top-1 duration-150">
            <p className="text-[11px] text-muted-foreground mb-2.5 font-semibold uppercase tracking-wider">
              Insert Component into PHP
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ADD_COMPONENT_TYPES.map(({ type, label, icon }) => (
                <button key={type}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#3a3a3a] hover:border-green-700/50 text-muted-foreground hover:text-white text-xs transition-all"
                  onClick={() => handleInsertSnippet(type)}>
                  <span className="font-mono text-[11px] text-muted-foreground/60">{icon}</span>{label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-2">
              Snippet is inserted into the PHP. Hit <strong>Save &amp; Sync</strong> to create it on the canvas.
            </p>
          </div>
        )}

        {/* ── Info bars ── */}
        {!isEditing && isJSFile && (
          <div className="shrink-0 px-4 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-[11px] text-yellow-400/80 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 shrink-0" />
            JS edits are saved as overrides and exported — they don't modify canvas components.
          </div>
        )}
        {!isEditing && isViewPHP && (
          <div className="shrink-0 px-4 py-1.5 bg-purple-500/10 border-b border-purple-500/20 text-[11px] text-purple-300/80 flex items-center justify-between gap-2">
            <span>PHP edits sync <strong>adds · deletes · updates</strong> back to the canvas when you Save &amp; Sync.</span>
            <span className="text-muted-foreground/40 shrink-0">{pageComponents.length} component{pageComponents.length !== 1 ? "s" : ""}</span>
          </div>
        )}
        {!isEditing && isCustomFile && (
          <div className="shrink-0 px-4 py-1.5 bg-green-500/10 border-b border-green-500/20 text-[11px] text-green-400/80 flex items-center gap-2">
            <FilePlus className="w-3 h-3 shrink-0" />
            Custom file — included in project export.
          </div>
        )}

        {/* ── Code area + component sidebar ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* Code / Textarea */}
          <div className="flex-1 overflow-hidden relative">
            {/* Empty state */}
            {!selectedFile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2a2a2a] flex items-center justify-center">
                  <FileCode className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">No file selected</p>
                  <p className="text-xs text-muted-foreground/40">Select a file from the explorer or create a new one</p>
                </div>
                <button
                  onClick={() => setShowFileCreator(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] hover:border-green-700/40 text-sm text-muted-foreground hover:text-white transition-all">
                  <FilePlus className="w-4 h-4" />Create new file
                </button>
              </div>
            )}

            {selectedFile && (isEditing ? (
              <div className="absolute inset-0 flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={draftContent}
                  onChange={e => setDraftContent(e.target.value)}
                  onKeyDown={handleTabKey}
                  spellCheck={false}
                  className="flex-1 w-full resize-none bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] leading-[1.6] p-6 outline-none border-0 overflow-auto"
                  style={{ tabSize: 2 }}
                />
                <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-[#181818] border-t border-[#2b2b2b]">
                  <span className="text-[10px] text-muted-foreground/60 select-none">
                    Ctrl+S — save{isViewPHP ? " & sync" : ""} · Esc — cancel · Tab — indent
                  </span>
                  <div className="flex items-center gap-3">
                    {draftContent !== (generatedFiles[selectedFile] ?? "") && (
                      <span className="text-[10px] text-amber-400/70 select-none">
                        {countDiffLines(generatedFiles[selectedFile] ?? "", draftContent)} lines modified
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/40 select-none">
                      {draftContent.split("\n").length} lines
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 overflow-auto">
                <SyntaxHighlighter
                  language={syntaxLang}
                  style={customSyntaxTheme}
                  showLineNumbers
                  customStyle={{ margin: 0, padding: "24px", backgroundColor: "#1f1f1f", fontSize: "13px", lineHeight: "1.6", minHeight: "100%" }}
                >
                  {readOnlyContent || "// No content"}
                </SyntaxHighlighter>
              </div>
            ))}
          </div>

          {/* ── Component Sidebar ── */}
          {isViewPHP && !isEditing && (
            <div className="w-52 border-l border-[#2b2b2b] bg-[#181818] flex flex-col shrink-0">
              <div className="px-3 py-2 border-b border-[#2b2b2b] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Components</span>
                <span className="text-[10px] text-muted-foreground/40">{pageComponents.length}</span>
              </div>

              <div className="flex-1 overflow-auto">
                {pageComponents.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[11px] text-muted-foreground/40">
                    No components on this page
                  </div>
                ) : pageComponents.map(comp => (
                  <div key={comp.id}
                    className="group/item flex items-center gap-2 px-3 py-2 hover:bg-[#222] border-b border-[#242424] transition-colors">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-[#2a2a2a] shrink-0">
                      <span className="text-[9px] font-bold text-muted-foreground/70 uppercase leading-none">
                        {comp.type.slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-muted-foreground font-medium leading-none mb-0.5">{comp.type}</div>
                      <div className="text-[10px] text-muted-foreground/40 truncate">
                        {comp.props?.content || comp.props?.text || comp.props?.title || comp.props?.brand || comp.id.slice(0, 10) + "…"}
                      </div>
                    </div>
                    {onCodeChange && (
                      <button
                        className="opacity-0 group-hover/item:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-muted-foreground/50 hover:text-red-400 transition-all shrink-0"
                        title={`Delete ${comp.type} from canvas`}
                        onClick={() => handleDeleteComponent(comp.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {onCodeChange && (
                <div className="p-2 border-t border-[#2b2b2b]">
                  <button
                    className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] hover:border-green-700/50 text-xs text-muted-foreground hover:text-white transition-all"
                    onClick={() => setShowAddPanel(p => !p)}>
                    <Plus className="w-3 h-3" />Add Component
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}