"use client"

import type React from "react"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog"
import {
  Copy, ChevronRight, ChevronDown, File, Save, Pencil, X,
  CheckCircle2, RefreshCw, AlertCircle, Plus, Trash2, FilePlus,
  FolderPlus, FileCode, FileText, Globe, ChevronDown as CaretDown,
  RefreshCcw, AlertTriangle, Layers,
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-[420px] bg-background border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold">Create New File</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Add a new file to your project.</p>
        </div>

        <div className="px-5 pb-3 grid gap-3">
          {/* File type selector */}
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right text-xs">File Type</Label>
            <div className="col-span-3 flex gap-1.5">
              {FILE_TYPE_OPTIONS.map(opt => (
                <button key={opt.ext}
                  onClick={() => { setSelectedType(opt); setError(""); if (!useCustomFolder) setCustomFolder("") }}
                  className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-md border text-xs transition-all ${
                    selectedType.ext === opt.ext
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}>
                  {opt.icon}
                  <span className="text-[9px] leading-none">{opt.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* File name */}
          <div className="grid grid-cols-4 items-center gap-3">
            <Label htmlFor="file-name" className="text-right text-xs">File Name</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="file-name"
                ref={inputRef}
                value={fileName}
                onChange={e => { setFileName(e.target.value); setError("") }}
                onKeyDown={handleKey}
                placeholder={selectedType.ext === "php" ? "e.g. about" : selectedType.ext === "css" ? "e.g. styles" : "e.g. utils"}
                className="flex-1 font-mono h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground font-mono shrink-0">.{selectedType.ext}</span>
            </div>
          </div>

          {/* Destination folder */}
          <div className="grid grid-cols-4 items-center gap-3">
            <div className="text-right flex flex-col items-end gap-0.5">
              <Label className="text-xs">Folder</Label>
              <button
                onClick={() => { setUseCustomFolder(p => !p); setCustomFolder(selectedType.folder) }}
                className="text-[10px] text-primary hover:underline transition-colors">
                {useCustomFolder ? "Default" : "Custom"}
              </button>
            </div>
            <div className="col-span-3">
              {useCustomFolder ? (
                <Input value={customFolder} onChange={e => setCustomFolder(e.target.value)} className="font-mono h-8 text-sm" />
              ) : (
                <Input value={`${selectedType.folder}/`} readOnly className="font-mono h-8 text-sm text-muted-foreground bg-muted/40 cursor-default" />
              )}
            </div>
          </div>

          {/* Preview path */}
          {cleanName && (
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-xs text-muted-foreground">Preview</Label>
              <div className="col-span-3 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border">
                <span className="text-xs font-mono text-green-600 dark:text-green-400 truncate block">{finalPath}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="grid grid-cols-4 items-center gap-3">
              <div />
              <div className="col-span-3 flex items-center gap-1.5 text-destructive text-xs">
                <AlertCircle className="w-3 h-3 shrink-0" />{error}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={!cleanName}>Create File</Button>
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
  "__unknown__":     { props: { unknownType: "unknown" },                             style: { width: "400px", height: "80px" } },
}

const ADD_COMPONENT_TYPES = [
  { type: "heading",         label: "Heading",         icon: "H1" },
  { type: "text",            label: "Text",            icon: "T"  },
  { type: "paragraph",       label: "Paragraph",       icon: "¶"  },
  { type: "button",          label: "Button",          icon: "⬡"  },
  { type: "image",           label: "Image",           icon: "🖼" },
  { type: "input",           label: "Input",           icon: "▭"  },
  { type: "textarea",        label: "Textarea",        icon: "▣"  },
  { type: "select",          label: "Select",          icon: "▾"  },
  { type: "checkbox",        label: "Checkbox",        icon: "☑"  },
  { type: "radio-group",     label: "Radio Group",     icon: "◉"  },
  { type: "navbar",          label: "Navbar",          icon: "≡"  },
  { type: "hero",            label: "Hero",            icon: "★"  },
  { type: "footer",          label: "Footer",          icon: "▬"  },
  { type: "section-heading", label: "Section Heading", icon: "§"  },
  { type: "card",            label: "Card",            icon: "⊞"  },
  { type: "container",       label: "Container",       icon: "□"  },
  { type: "grid",            label: "Grid",            icon: "⊟"  },
  { type: "form",            label: "Form",            icon: "⊞"  },
  { type: "divider",         label: "Divider",         icon: "—"  },
  { type: "accordion",       label: "Accordion",       icon: "⊕"  },
  { type: "tabs",            label: "Tabs",            icon: "⊓"  },
  { type: "modal",           label: "Modal",           icon: "⊡"  },
  { type: "alert",           label: "Alert",           icon: "⚠"  },
  { type: "table",           label: "Table",           icon: "⊞"  },
  { type: "gallery",         label: "Gallery",         icon: "⊟"  },
  { type: "carousel",        label: "Carousel",        icon: "↻"  },
]

// ─────────────────────────────────────────────
// KNOWN COMPONENT TYPES (from RenderableComponent)
// ─────────────────────────────────────────────
const KNOWN_COMPONENT_TYPES = new Set([
  "heading", "text", "paragraph", "button", "image", "input", "textarea",
  "navbar", "hero", "footer", "container", "section-heading", "card",
  "grid", "form", "gallery", "carousel", "divider", "accordion", "tabs",
  "modal", "alert", "group", "video", "select", "checkbox", "radio-group",
  "table", "paymongo-button", "sign-in", "sign-up",
])

interface UnknownComponentWarning {
  tag: string        // original HTML tag used
  className: string  // the comp-xxx class
  sid: string        // short id
  line: number
}

function detectUnknownComponents(phpCode: string): UnknownComponentWarning[] {
  const warnings: UnknownComponentWarning[] = []
  const seen = new Set<string>()
  const lines = phpCode.split("\n")

  // Find all elements with comp- classes that were NOT parsed by any known parser
  const knownSids = new Set<string>()

  // Collect sids that WOULD be parsed by the known parsers
  const patterns: RegExp[] = [
    /<h[1-6][^>]*class="([^"]*)"/gi,
    /<p[^>]*class="([^"]*)"/gi,
    /<button[^>]*class="([^"]*)"/gi,
    /<img[^>]*class="([^"]*)"/gi,
    /<input[^>]*class="([^"]*)"/gi,
    /<textarea[^>]*class="([^"]*)"/gi,
    /<nav[^>]*class="([^"]*)"/gi,
    /<section[^>]*class="([^"]*)"/gi,
    /<footer[^>]*class="([^"]*)"/gi,
    /<div[^>]*class="([^"]*)"/gi,
    /<a[^>]*class="([^"]*)"/gi,
    /<span[^>]*class="([^"]*)"/gi,
  ]
  for (const pat of patterns) {
    for (const m of phpCode.matchAll(pat)) {
      const sid = extractShortId(m[1])
      if (sid) knownSids.add(sid)
    }
  }

  // Now find any comp- class that isn't mapped to a known component type
  // We do this by finding data-component-type or data-type attributes
  // or by scanning for comp- classes in unusual HTML elements
  const unusualTags = /<([a-z][a-z0-9-]*)[^>]*class="([^"]*comp-[^"]*)"/gi
  for (const m of phpCode.matchAll(unusualTags)) {
    const tag = m[1]
    const cls = m[2]
    const sid = extractShortId(cls)
    if (!sid || seen.has(sid)) continue

    // Find which line this is on
    const before = phpCode.slice(0, m.index ?? 0)
    const line = before.split("\n").length

    // Check if this tag+class combination maps to something unknown
    // We only warn about data-component-type attributes pointing to unknown types
    const dataTypeMatch = m[0].match(/data-component-type="([^"]+)"/)
    if (dataTypeMatch) {
      const declaredType = dataTypeMatch[1]
      if (!KNOWN_COMPONENT_TYPES.has(declaredType)) {
        seen.add(sid)
        warnings.push({ tag, className: cls.split(/\s+/)[0], sid, line })
      }
    }
  }

  return warnings
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function sanitizeId(id: string) { return id.replace(/[^a-zA-Z0-9_-]/g, "-") }

// ── Readable ID system ─────────────────────────────────────────────────────
// Generates VSCode-style readable IDs like "navbar-main", "button-primary"
const SEMANTIC_SUFFIXES: Record<string, string[]> = {
  navbar:          ["main", "top", "site", "primary"],
  hero:            ["main", "banner", "top", "landing"],
  footer:          ["main", "site", "bottom", "primary"],
  heading:         ["title", "main", "primary", "section"],
  text:            ["body", "content", "copy", "description"],
  paragraph:       ["intro", "body", "content", "description"],
  button:          ["primary", "cta", "action", "submit"],
  image:           ["main", "hero", "cover", "featured"],
  input:           ["field", "name", "email", "search"],
  textarea:        ["message", "bio", "notes", "content"],
  select:          ["field", "option", "filter", "dropdown"],
  checkbox:        ["field", "agree", "option", "toggle"],
  "radio-group":   ["options", "choice", "field", "selector"],
  card:            ["item", "feature", "product", "profile"],
  container:       ["wrapper", "section", "block", "content"],
  grid:            ["layout", "gallery", "features", "cards"],
  form:            ["contact", "signup", "login", "subscribe"],
  divider:         ["section", "main", "content", "break"],
  accordion:       ["faq", "main", "content", "details"],
  tabs:            ["main", "content", "sections", "nav"],
  modal:           ["dialog", "popup", "confirm", "info"],
  alert:           ["info", "warning", "success", "error"],
  table:           ["data", "main", "list", "records"],
  gallery:         ["images", "portfolio", "photos", "work"],
  carousel:        ["slides", "hero", "featured", "promo"],
  "section-heading": ["main", "about", "features", "services"],
  "sign-in":       ["form", "main", "user", "auth"],
  "sign-up":       ["form", "main", "register", "auth"],
  "paymongo-button": ["pay", "checkout", "buy", "order"],
  video:           ["main", "hero", "promo", "embed"],
}

// Track used IDs per session to avoid collisions
const _usedIds = new Set<string>()

function generateReadableId(type: string, existingIds: string[] = []): string {
  const all = new Set([...existingIds, ..._usedIds])
  const suffixes = SEMANTIC_SUFFIXES[type] ?? ["main", "content", "block", "section"]

  // First pass: try type-suffix combos
  for (const suffix of suffixes) {
    const candidate = `${type}-${suffix}`
    if (!all.has(candidate)) { _usedIds.add(candidate); return candidate }
  }
  // Second pass: type-suffix-N
  for (const suffix of suffixes) {
    for (let n = 2; n <= 9; n++) {
      const candidate = `${type}-${suffix}-${n}`
      if (!all.has(candidate)) { _usedIds.add(candidate); return candidate }
    }
  }
  // Fallback: timestamp suffix
  const fallback = `${type}-${Date.now().toString(36).slice(-4)}`
  _usedIds.add(fallback)
  return fallback
}

// Extract the component ID from a class string.
// Supports both old "comp-xxx" format AND new "navbar-main" readable format.
function extractShortId(cls: string): string | null {
  const first = cls.trim().split(/\s+/)[0]
  if (!first) return null
  // Legacy: comp-xxx
  const legacy = first.match(/^comp-(.+)$/)
  if (legacy) return legacy[1]
  // New readable format: type-suffix (e.g. navbar-main, button-primary)
  // Must contain a hyphen and match a known type prefix
  if (first.includes("-")) {
    const typePart = first.split("-")[0]
    const knownTypes = [
      "navbar","hero","footer","heading","text","paragraph","button","image",
      "input","textarea","select","checkbox","card","container","grid","form",
      "divider","accordion","tabs","modal","alert","table","gallery","carousel",
      "section","sign","paymongo","video","radio",
    ]
    if (knownTypes.some(t => typePart === t || first.startsWith(t + "-"))) {
      return first
    }
  }
  return null
}

function extractClassName(cls: string) { return cls.trim().split(/\s+/)[0] || cls.trim() }
function stripTags(html: string)       { return html.replace(/<[^>]+>/g, "") }

// ── CSS template per component type ───────────────────────────────────────
function generateCSSForComponent(id: string, type: string): string {
  const sel = `.${id}`
  const base: Record<string, string> = {
    navbar: `${sel} {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem 2rem;\n  background: #1f2937;\n  color: #fff;\n  width: 100%;\n}\n${sel} .nav-brand { font-weight: 700; font-size: 1.25rem; }\n${sel} .nav-links { display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0; }\n${sel} .nav-links a { color: #d1d5db; text-decoration: none; }\n${sel} .nav-links a:hover { color: #fff; }\n${sel} .nav-toggle { display: none; background: none; border: none; cursor: pointer; }\n`,
    hero: `${sel} {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  padding: 5rem 2rem;\n  background: #f9fafb;\n  width: 100%;\n}\n${sel} h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; color: #111827; }\n${sel} p { font-size: 1.25rem; color: #6b7280; margin-bottom: 2rem; }\n${sel} .hero-btn { padding: 0.75rem 2rem; background: #6d28d9; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }\n`,
    footer: `${sel} {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 2rem;\n  background: #374151;\n  color: #9ca3af;\n  width: 100%;\n}\n${sel} p { margin: 0; font-size: 0.875rem; }\n`,
    heading: `${sel} {\n  font-size: 2rem;\n  font-weight: 700;\n  color: #111827;\n  margin: 0 0 0.5rem;\n  line-height: 1.2;\n}\n`,
    text: `${sel} {\n  font-size: 1rem;\n  color: #374151;\n  line-height: 1.6;\n  margin: 0;\n}\n`,
    paragraph: `${sel} {\n  font-size: 1rem;\n  color: #4b5563;\n  line-height: 1.8;\n  margin: 0 0 1rem;\n}\n`,
    button: `${sel} {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.625rem 1.25rem;\n  background: #6d28d9;\n  color: #fff;\n  border: none;\n  border-radius: 6px;\n  font-size: 0.875rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n${sel}:hover { background: #5b21b6; }\n`,
    image: `${sel} {\n  display: block;\n  max-width: 100%;\n  height: auto;\n  border-radius: 8px;\n  object-fit: cover;\n}\n`,
    input: `${sel} {\n  display: block;\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  border: 1px solid #d1d5db;\n  border-radius: 6px;\n  font-size: 0.875rem;\n  color: #111827;\n  background: #fff;\n  outline: none;\n  transition: border-color 0.2s;\n}\n${sel}:focus { border-color: #6d28d9; box-shadow: 0 0 0 2px rgba(109,40,217,0.15); }\n`,
    textarea: `${sel} {\n  display: block;\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  border: 1px solid #d1d5db;\n  border-radius: 6px;\n  font-size: 0.875rem;\n  color: #111827;\n  background: #fff;\n  resize: vertical;\n  outline: none;\n  transition: border-color 0.2s;\n}\n${sel}:focus { border-color: #6d28d9; }\n`,
    select: `${sel} {\n  display: block;\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  border: 1px solid #d1d5db;\n  border-radius: 6px;\n  font-size: 0.875rem;\n  background: #fff;\n  cursor: pointer;\n}\n`,
    card: `${sel} {\n  background: #fff;\n  border: 1px solid #e5e7eb;\n  border-radius: 12px;\n  padding: 1.5rem;\n  box-shadow: 0 1px 3px rgba(0,0,0,0.1);\n  transition: box-shadow 0.2s;\n}\n${sel}:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }\n${sel} h3 { font-size: 1.125rem; font-weight: 700; margin: 0 0 0.5rem; color: #111827; }\n${sel} p { font-size: 0.875rem; color: #6b7280; margin: 0 0 1rem; }\n${sel} .card-btn { display: inline-block; padding: 0.5rem 1rem; background: #6d28d9; color: #fff; border-radius: 6px; text-decoration: none; font-size: 0.875rem; }\n`,
    container: `${sel} {\n  padding: 1.5rem;\n  border: 1px solid #e5e7eb;\n  border-radius: 8px;\n  background: #f9fafb;\n}\n`,
    grid: `${sel} {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 1.5rem;\n  padding: 1rem 0;\n}\n@media (max-width: 768px) { ${sel} { grid-template-columns: 1fr; } }\n`,
    form: `${sel} {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n  padding: 2rem;\n  background: #fff;\n  border: 1px solid #e5e7eb;\n  border-radius: 12px;\n  max-width: 480px;\n}\n`,
    divider: `${sel} {\n  border: none;\n  border-top: 1px solid #e5e7eb;\n  margin: 1.5rem 0;\n  width: 100%;\n}\n`,
    "section-heading": `${sel} {\n  text-align: center;\n  padding: 2rem 0;\n}\n${sel} h2 { font-size: 2rem; font-weight: 700; color: #111827; margin: 0 0 0.5rem; }\n${sel} p { font-size: 1.125rem; color: #6b7280; margin: 0; }\n`,
    accordion: `${sel} .accordion-item { border-bottom: 1px solid #e5e7eb; }\n${sel} .accordion-item h3 { padding: 1rem; font-size: 1rem; font-weight: 600; cursor: pointer; margin: 0; }\n${sel} .accordion-item p { padding: 0 1rem 1rem; color: #6b7280; font-size: 0.875rem; }\n`,
    tabs: `${sel} .tab-nav { display: flex; border-bottom: 2px solid #e5e7eb; }\n${sel} .tab-btn { padding: 0.75rem 1.25rem; border: none; background: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; }\n${sel} .tab-btn.active { color: #6d28d9; border-bottom-color: #6d28d9; }\n${sel} .tab-content { padding: 1.5rem 0; font-size: 0.875rem; color: #374151; }\n`,
    modal: `${sel} {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.625rem 1.25rem;\n  background: #3b82f6;\n  color: #fff;\n  border: none;\n  border-radius: 6px;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; }\n.modal-box { background: #fff; border-radius: 12px; padding: 2rem; min-width: 320px; max-width: 500px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); }\n`,
    alert: `${sel} {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.875rem 1rem;\n  border-radius: 8px;\n  border: 1px solid #93c5fd;\n  background: #eff6ff;\n  color: #1d4ed8;\n  font-size: 0.875rem;\n}\n`,
    table: `${sel} {\n  width: 100%;\n  border-collapse: collapse;\n  font-size: 0.875rem;\n}\n${sel} th { padding: 0.75rem 1rem; text-align: left; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; }\n${sel} td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; color: #4b5563; }\n${sel} tr:hover td { background: #f9fafb; }\n`,
    gallery: `${sel} {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));\n  gap: 1rem;\n}\n${sel} img { width: 100%; height: 160px; object-fit: cover; border-radius: 8px; }\n`,
    carousel: `${sel} {\n  position: relative;\n  overflow: hidden;\n  border-radius: 12px;\n}\n${sel} .slide { display: none; }\n${sel} .slide.active { display: block; }\n${sel} img { width: 100%; height: auto; display: block; }\n${sel} .carousel-controls { display: flex; justify-content: center; gap: 0.5rem; padding: 0.75rem; }\n${sel} .carousel-dot { width: 8px; height: 8px; border-radius: 50%; background: #d1d5db; border: none; cursor: pointer; }\n${sel} .carousel-dot.active { background: #6d28d9; }\n`,
  }
  return base[type] ?? `${sel} {\n  /* ${type} styles */\n  display: block;\n}\n`
}

// ── JS template per interactive component type ─────────────────────────────
const INTERACTIVE_TYPES = new Set(["navbar","accordion","tabs","modal","carousel"])

function generateJSForComponent(id: string, type: string): string {
  const sel = `.${id}`
  const js: Record<string, string> = {
    navbar: `// ${id} — responsive nav toggle\n(function() {\n  var nav = document.querySelector('${sel}');\n  if (!nav) return;\n  var toggle = nav.querySelector('.nav-toggle');\n  var links = nav.querySelector('.nav-links');\n  if (toggle && links) {\n    toggle.addEventListener('click', function() {\n      var expanded = toggle.getAttribute('aria-expanded') === 'true';\n      toggle.setAttribute('aria-expanded', !expanded);\n      links.style.display = expanded ? '' : 'flex';\n      links.style.flexDirection = 'column';\n    });\n  }\n})();\n`,
    accordion: `// ${id} — accordion toggle\n(function() {\n  var acc = document.querySelector('${sel}');\n  if (!acc) return;\n  acc.querySelectorAll('.accordion-item h3').forEach(function(hd) {\n    hd.addEventListener('click', function() {\n      var item = hd.parentElement;\n      var body = item.querySelector('p');\n      var isOpen = item.classList.contains('open');\n      acc.querySelectorAll('.accordion-item').forEach(function(i) {\n        i.classList.remove('open');\n        var b = i.querySelector('p');\n        if (b) b.style.display = 'none';\n      });\n      if (!isOpen && body) { item.classList.add('open'); body.style.display = 'block'; }\n    });\n    var body = hd.parentElement.querySelector('p');\n    if (body) body.style.display = 'none';\n  });\n})();\n`,
    tabs: `// ${id} — tabs\n(function() {\n  var tabs = document.querySelector('${sel}');\n  if (!tabs) return;\n  var btns = tabs.querySelectorAll('.tab-btn');\n  var contents = tabs.querySelectorAll('.tab-content');\n  btns.forEach(function(btn, i) {\n    btn.addEventListener('click', function() {\n      btns.forEach(function(b) { b.classList.remove('active'); });\n      contents.forEach(function(c) { c.style.display = 'none'; });\n      btn.classList.add('active');\n      if (contents[i]) contents[i].style.display = 'block';\n    });\n  });\n  if (btns[0]) btns[0].click();\n})();\n`,
    modal: `// ${id} — modal\n(function() {\n  var btn = document.querySelector('${sel}');\n  if (!btn) return;\n  btn.addEventListener('click', function() {\n    var overlay = document.createElement('div');\n    overlay.className = 'modal-overlay';\n    overlay.innerHTML = '<div class=\"modal-box\"><button class=\"modal-close\" style=\"float:right;background:none;border:none;font-size:1.25rem;cursor:pointer;\">✕</button><h3 style=\"margin:0 0 1rem\">Modal Title</h3><p>Modal content here.</p></div>';\n    document.body.appendChild(overlay);\n    overlay.querySelector('.modal-close').addEventListener('click', function() { overlay.remove(); });\n    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });\n  });\n})();\n`,
    carousel: `// ${id} — carousel\n(function() {\n  var car = document.querySelector('${sel}');\n  if (!car) return;\n  var slides = car.querySelectorAll('.slide');\n  var dots = car.querySelectorAll('.carousel-dot');\n  var current = 0;\n  function show(n) {\n    slides.forEach(function(s) { s.classList.remove('active'); });\n    dots.forEach(function(d) { d.classList.remove('active'); });\n    current = (n + slides.length) % slides.length;\n    if (slides[current]) slides[current].classList.add('active');\n    if (dots[current]) dots[current].classList.add('active');\n  }\n  dots.forEach(function(dot, i) { dot.addEventListener('click', function() { show(i); }); });\n  show(0);\n  setInterval(function() { show(current + 1); }, 5000);\n})();\n`,
  }
  return js[type] ?? `// ${id}\n`
}

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
function generateComponentSnippet(type: string, existingIds: string[] = []): string {
  const id  = generateReadableId(type, existingIds)
  const cls = id  // class IS the id now

  const map: Record<string, string> = {
    heading:   `<h1 class="${cls}">New Heading</h1>`,
    text:      `<p class="${cls}">New text block.</p>`,
    paragraph: `<p class="${cls}">New paragraph text.</p>`,
    button:    `<button class="${cls}">Click Me</button>`,
    image:     `<img src="" alt="image" class="${cls}" />`,
    input:     `<input type="text" placeholder="Enter text..." class="${cls}" />`,
    textarea:  `<textarea placeholder="Enter message..." class="${cls}"></textarea>`,
    select:    `<select class="${cls}" data-component-type="select"><option value="">Select...</option></select>`,
    checkbox:  `<input type="checkbox" class="${cls}" data-component-type="checkbox" />`,
    "radio-group": [
      `<div class="${cls}" data-component-type="radio-group">`,
      `  <input type="radio" name="${cls}-group" value="option1" /> Option 1`,
      `  <input type="radio" name="${cls}-group" value="option2" /> Option 2`,
      `</div>`,
    ].join("\n"),
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
    container: `<div class="${cls}"><!-- Container content --></div>`,
    grid: [
      `<div class="${cls}" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">`,
      `  <div>Column 1</div>`,
      `  <div>Column 2</div>`,
      `  <div>Column 3</div>`,
      `</div>`,
    ].join("\n"),
    form: [
      `<form class="${cls}">`,
      `  <input type="text" placeholder="Name" />`,
      `  <input type="email" placeholder="Email" />`,
      `  <textarea placeholder="Message"></textarea>`,
      `  <button type="submit">Submit</button>`,
      `</form>`,
    ].join("\n"),
    divider: `<hr class="${cls}" />`,
    accordion: [
      `<div class="${cls}" data-component-type="accordion">`,
      `  <div class="accordion-item">`,
      `    <h3>Question 1</h3>`,
      `    <p>Answer 1</p>`,
      `  </div>`,
      `</div>`,
    ].join("\n"),
    tabs: [
      `<div class="${cls}" data-component-type="tabs">`,
      `  <div class="tab" data-label="Tab 1">Tab 1 content</div>`,
      `  <div class="tab" data-label="Tab 2">Tab 2 content</div>`,
      `</div>`,
    ].join("\n"),
    modal: `<button class="${cls}" data-component-type="modal">Open Modal</button>`,
    alert: `<div class="${cls}" data-component-type="alert">This is an alert message.</div>`,
    table: [
      `<table class="${cls}" data-component-type="table">`,
      `  <thead><tr><th>Name</th><th>Value</th></tr></thead>`,
      `  <tbody><tr><td>Row 1</td><td>Data</td></tr></tbody>`,
      `</table>`,
    ].join("\n"),
    gallery: [
      `<div class="${cls}" data-component-type="gallery">`,
      `  <img src="" alt="Image 1" />`,
      `  <img src="" alt="Image 2" />`,
      `</div>`,
    ].join("\n"),
    carousel: [
      `<div class="${cls}" data-component-type="carousel">`,
      `  <div class="slide"><img src="" alt="Slide 1" /></div>`,
      `  <div class="slide"><img src="" alt="Slide 2" /></div>`,
      `</div>`,
    ].join("\n"),
  }
  return map[type] ?? `<div class="${cls}" data-component-type="${type}"><!-- ${type} --></div>`
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

  // ── data-component-type="xxx" — explicit type declarations ──
  for (const m of phpCode.matchAll(/<([a-z][a-z0-9-]*)[^>]*class="([^"]*)"[^>]*data-component-type="([^"]+)"[^>]*>/gi)) {
    const sid = extractShortId(m[2]); if (!sid || seen.has(sid)) continue
    const declaredType = m[3].toLowerCase().trim()
    if (KNOWN_COMPONENT_TYPES.has(declaredType)) {
      const defs = DEFAULT_COMPONENT_DEFS[declaredType] ?? { props: {}, style: {} }
      add(sid, declaredType, { ...defs.props, className: extractClassName(m[2]) })
    } else {
      add(sid, "__unknown__", { unknownType: declaredType, className: extractClassName(m[2]), htmlTag: m[1] })
    }
  }
  for (const m of phpCode.matchAll(/<([a-z][a-z0-9-]*)[^>]*data-component-type="([^"]+)"[^>]*class="([^"]*)"[^>]*>/gi)) {
    const sid = extractShortId(m[3]); if (!sid || seen.has(sid)) continue
    const declaredType = m[2].toLowerCase().trim()
    if (KNOWN_COMPONENT_TYPES.has(declaredType)) {
      const defs = DEFAULT_COMPONENT_DEFS[declaredType] ?? { props: {}, style: {} }
      add(sid, declaredType, { ...defs.props, className: extractClassName(m[3]) })
    } else {
      add(sid, "__unknown__", { unknownType: declaredType, className: extractClassName(m[3]), htmlTag: m[1] })
    }
  }

  return result
}

// ─────────────────────────────────────────────
// CSS PARSER
// ─────────────────────────────────────────────
function parseCSSToStyleUpdates(css: string): Map<string, Record<string, any>> {
  const map = new Map<string, Record<string, any>>()
  // Match both: .comp-xxx { } and .navbar-main { } (readable IDs)
  for (const m of css.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    const rawId = m[1]
    // Derive the sid: strip comp- prefix for legacy, use as-is for readable IDs
    const sid = rawId.startsWith("comp-") ? rawId.slice(5) : rawId
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
  const [missingCSS,      setMissingCSS]      = useState<{ id: string; type: string }[]>([])
  const [missingJS,       setMissingJS]       = useState<{ id: string; type: string }[]>([])
  const [generatingCSS,   setGeneratingCSS]   = useState(false)
  const [generatingJS,    setGeneratingJS]    = useState(false)

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
  const handleCancelEdit = () => {
    setIsEditing(false); setDraftContent(""); setPendingDiff(null); 
  }
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

  // ── Detect warnings in current PHP content ──
  const detectWarningsInContent = useCallback((phpContent: string) => {
    const warnings: { type: string; sid: string; line?: number }[] = []
    // Scan for data-component-type pointing to unknown types
    const pat1 = /<[a-z][^>]*data-component-type="([^"]+)"[^>]*class="([^"]*)"/gi
    const pat2 = /<[a-z][^>]*class="([^"]*)"[^>]*data-component-type="([^"]+)"/gi
    for (const m of phpContent.matchAll(pat1)) {
      const type = m[1].toLowerCase()
      const sid = extractShortId(m[2])
      if (sid && !KNOWN_COMPONENT_TYPES.has(type)) {
        const before = phpContent.slice(0, m.index ?? 0)
        warnings.push({ type, sid, line: before.split("\n").length })
      }
    }
    for (const m of phpContent.matchAll(pat2)) {
      const type = m[2].toLowerCase()
      const sid = extractShortId(m[1])
      if (sid && !KNOWN_COMPONENT_TYPES.has(type)) {
        const before = phpContent.slice(0, m.index ?? 0)
        warnings.push({ type, sid, line: before.split("\n").length })
      }
    }
  }, [])

  // ── Detect missing CSS/JS after a sync ──
  const detectMissingStyles = useCallback((synced: ComponentData[], cssFile: string, jsFile: string) => {
    const cssContent = effectiveFiles[cssFile] ?? ""
    const jsContent  = effectiveFiles[jsFile]  ?? ""

    const missCss: { id: string; type: string }[] = []
    const missJs:  { id: string; type: string }[] = []

    for (const comp of synced) {
      if (comp.type === "__unknown__" || comp.page_id === "all") continue
      const id = sanitizeId(comp.id)
      // Check if CSS has any rule for this ID (either .id or .comp-id)
      const hasCss = cssContent.includes(`.${id}`) || cssContent.includes(`.comp-${id}`)
      if (!hasCss) missCss.push({ id, type: comp.type })
      // Check JS only for interactive types
      if (INTERACTIVE_TYPES.has(comp.type)) {
        const hasJs = jsContent.includes(id) || jsContent.includes(`comp-${id}`)
        if (!hasJs) missJs.push({ id, type: comp.type })
      }
    }
    setMissingCSS(missCss)
    setMissingJS(missJs)
  }, [effectiveFiles])

  // ── Migrate all component IDs to readable format ──
  const migrateComponentIds = useCallback((comps: ComponentData[]): { migrated: ComponentData[]; changed: number } => {
    const usedNew = new Set(comps.map(c => c.id))
    let changed = 0
    const migrated = comps.map(c => {
      // Already readable (no timestamp, no random chars)
      if (/^[a-z][a-z0-9-]*-[a-z][a-z0-9-]*$/.test(c.id) && !c.id.match(/[0-9]{5,}/)) return c
      // Generate new readable ID
      usedNew.delete(c.id)
      const newId = generateReadableId(c.type, [...usedNew])
      usedNew.add(newId)
      changed++
      return { ...c, id: newId }
    })
    return { migrated, changed }
  }, [])

  // ── Manual Sync to Canvas ──
  const handleManualSync = useCallback(() => {
    if (!selectedFile || !isViewPHP || !onCodeChange) return
    const content = isEditing ? draftContent : readOnlyContent
    const cssFile = selectedFile.replace("app/views/", "public/assets/css/").replace(".php", ".css")
    const jsFile  = selectedFile.replace("app/views/", "public/assets/js/").replace(".php", ".js")
    const cssCode = effectiveFiles[cssFile] ?? null
    try {
      const { components: synced, added, deleted, updated } = syncPHPToCanvas(
        content, cssCode, componentsRef.current, activePHPPageId
      )
      // Migrate all IDs to readable format
      const { migrated, changed: idsMigrated } = migrateComponentIds(synced)

      // Also save the current content as override
      if (isEditing) {
        if (isCustomFile) setCustomFiles(prev => ({ ...prev, [selectedFile]: draftContent }))
        else setFileOverrides(prev => ({ ...prev, [selectedFile]: draftContent }))
        setIsEditing(false); setDraftContent(""); setPendingDiff(null)
      }
      onCodeChange(migrated)
      detectWarningsInContent(content)
      detectMissingStyles(migrated, cssFile, jsFile)
      const parts = [
        added      > 0 ? `+${added} added`       : "",
        deleted    > 0 ? `-${deleted} deleted`    : "",
        updated    > 0 ? `${updated} updated`     : "",
        idsMigrated > 0 ? `${idsMigrated} IDs renamed` : "",
      ].filter(Boolean)
      const unknowns = migrated.filter(c => c.type === "__unknown__")
      if (unknowns.length > 0) {
        toast.warning(`Synced with ${unknowns.length} unknown component${unknowns.length > 1 ? "s" : ""} — see warnings panel.`)
      } else {
        toast.success(`Canvas synced! ${parts.join("  ") || "No structural changes."}`)
      }
      setSavedIndicator(true); setTimeout(() => setSavedIndicator(false), 2500)
    } catch (err: any) {
      toast.error("Sync failed: " + err.message)
    }
  }, [selectedFile, isViewPHP, onCodeChange, isEditing, draftContent, readOnlyContent,
      effectiveFiles, activePHPPageId, isCustomFile, detectWarningsInContent,
      detectMissingStyles, migrateComponentIds])

  // ── Generate CSS for missing components ──
  const handleGenerateCSS = useCallback(() => {
    if (!selectedFile || !isViewPHP) return
    const cssFile = selectedFile.replace("app/views/", "public/assets/css/").replace(".php", ".css")
    setGeneratingCSS(true)
    const existing = effectiveFiles[cssFile] ?? ""
    const newRules = missingCSS
      .map(({ id, type }) => generateCSSForComponent(id, type))
      .join("\n")
    const updated = existing.trimEnd() + (existing ? "\n\n" : "") + `/* Auto-generated styles */\n` + newRules
    setFileOverrides(prev => ({ ...prev, [cssFile]: updated }))
    setMissingCSS([])
    setGeneratingCSS(false)
    toast.success(`Generated CSS for ${missingCSS.length} component${missingCSS.length !== 1 ? "s" : ""}.`)
  }, [selectedFile, isViewPHP, effectiveFiles, missingCSS])

  // ── Generate JS for missing interactive components ──
  const handleGenerateJS = useCallback(() => {
    if (!selectedFile || !isViewPHP) return
    const jsFile = selectedFile.replace("app/views/", "public/assets/js/").replace(".php", ".js")
    setGeneratingJS(true)
    const existing = effectiveFiles[jsFile] ?? ""
    const newCode  = missingJS
      .map(({ id, type }) => generateJSForComponent(id, type))
      .join("\n")
    const updated = existing.trimEnd() + (existing ? "\n\n" : "") + `// Auto-generated interactivity\n` + newCode
    setCustomFiles(prev => ({ ...prev, [jsFile]: updated }))
    setMissingJS([])
    setGeneratingJS(false)
    toast.success(`Generated JS for ${missingJS.length} interactive component${missingJS.length !== 1 ? "s" : ""}.`)
  }, [selectedFile, isViewPHP, effectiveFiles, missingJS])

  // ── Insert snippet into PHP ──
  const handleInsertSnippet = (type: string) => {
    const existingIds = componentsRef.current.map(c => c.id)
    const snippet = generateComponentSnippet(type, existingIds)
    const current = isEditing ? draftContent : readOnlyContent
    const insertAt = current.lastIndexOf("</div>")
    const newContent = insertAt !== -1
      ? current.slice(0, insertAt) + `  ${snippet}\n` + current.slice(insertAt)
      : current + "\n" + snippet

    setDraftContent(newContent)
    if (!isEditing) { setIsEditing(true); setTimeout(() => textareaRef.current?.focus(), 0) }
    setShowAddPanel(false)
    toast.success(`${type} snippet added — Sync to canvas to apply.`)

  }

  // ── Delete component directly from canvas ──
  const handleDeleteComponent = useCallback((compId: string) => {
    if (!onCodeChange) return
    const sid = sanitizeId(compId)
    onCodeChange(componentsRef.current.filter(c => sanitizeId(c.id) !== sid))

    setFileOverrides(prev => {
      const next = { ...prev }
      for (const [path, content] of Object.entries(next)) {
        if (path.endsWith(".php")) {
          // Remove elements with class="sid" or class="comp-sid ..."
          next[path] = content
            .replace(new RegExp(`[ \\t]*<[^>]+class="${sid}[^"]*"[\\s\\S]*?(?:<\\/[a-zA-Z]+>|\\/>)\\n?`, "gi"), "")
            .replace(new RegExp(`[ \\t]*<[^>]+class="comp-${sid}[^"]*"[\\s\\S]*?(?:<\\/[a-zA-Z]+>|\\/>)\\n?`, "gi"), "")
        }
        if (path.endsWith(".css")) {
          // Remove .sid { } and .comp-sid { }
          next[path] = content
            .replace(new RegExp(`\\.${sid}[^{]*\\{[^}]*\\}\\n?`, "gi"), "")
            .replace(new RegExp(`\\.comp-${sid}[a-zA-Z0-9_-]*\\s*\\{[^}]*\\}\\n?`, "gi"), "")
        }
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
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (isViewPHP && onCodeChange) handleManualSync()
        else handleSave()
      }
      if (e.key === "Escape") handleCancelEdit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isEditing, handleSave, handleManualSync, isViewPHP, onCodeChange])

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
              {/* Delete button for all files */}
              {node.type === "file" && (
                <button
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 text-muted-foreground/30 hover:text-red-400 transition-all"
                  title="Delete file"
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
                {/* ── Save + Sync in editing mode ── */}
                {isViewPHP && onCodeChange && (
                  <Button size="sm"
                    className="h-7 px-3 gap-1.5 text-xs text-white border-0 bg-purple-600 hover:bg-purple-700"
                    onClick={handleManualSync}
                    title="Save and sync to canvas (Ctrl+S)">
                    <RefreshCcw className="h-3.5 w-3.5" />Save & Sync
                  </Button>
                )}
                <Button size="sm"
                  className={`h-7 px-3 gap-1.5 text-xs text-white border-0 ${
                    isJSFile  ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={handleSave}
                  title="Save (Ctrl+S)"
                  style={{ display: isViewPHP ? "none" : undefined }}>
                  <Save className="h-3.5 w-3.5" />Save
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

        </div>
      </div>
    </div>
  )
}