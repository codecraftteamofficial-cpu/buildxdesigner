"use client"

import type React from "react"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Button } from "./ui/button"
import {
  Copy, ChevronRight, ChevronDown, File, Save, Pencil, X,
  CheckCircle2, RefreshCw, AlertCircle, Plus, Trash2,
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
}

interface FileNode {
  name: string
  type: "file" | "folder"
  path: string
  children?: FileNode[]
}

type FileOverrides = Record<string, string>

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
// Parses every recognisable element and returns the
// complete desired component list for the page.
//
// STYLE PRESERVATION RULES:
//   - Existing component  → keep canvas style as-is (NEVER overwrite from CSS/defaults)
//   - New component (not on canvas) → use type defaults only
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

    // CRITICAL: if this component already exists on canvas, preserve its style
    // exactly as-is. Only use defaults for brand-new components.
    const preservedStyle = existing?.style
      ? normalizeStyleValues(existing.style)           // existing → keep as-is
      : normalizeStyleValues({ ...defs.style })        // new → type defaults only

    result.push({
      id:       existing?.id ?? sid,
      type,
      // Props: defaults < canvas props < code-parsed props (text content wins from code)
      props:    { ...defs.props, ...(existing?.props ?? {}), ...parsedProps },
      style:    preservedStyle,
      position: existing?.position ?? autoPosition(result.length),
      page_id:  pageId,
      children: existing?.children,
    })
  }

  // headings h1–h6
  for (const m of phpCode.matchAll(/<h([1-6])[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/h[1-6]>/gi)) {
    const sid = extractShortId(m[2]); if (!sid) continue
    add(sid, "heading", { content: stripTags(m[3].trim()), level: parseInt(m[1]), className: extractClassName(m[2]) })
  }
  // paragraphs
  for (const m of phpCode.matchAll(/<p[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "text", { content: stripTags(m[2].trim()), className: extractClassName(m[1]) })
  }
  // buttons
  for (const m of phpCode.matchAll(/<button[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "button", { text: stripTags(m[2].trim()), content: stripTags(m[2].trim()), className: extractClassName(m[1]) })
  }
  // images (src before class)
  for (const m of phpCode.matchAll(/<img[^>]*src="([^"]*)"[^>]*class="([^"]*)"[^>]*\/?>/gi)) {
    const sid = extractShortId(m[2]); if (!sid) continue
    add(sid, "image", { src: m[1], className: extractClassName(m[2]) })
  }
  // images (class before src)
  for (const m of phpCode.matchAll(/<img[^>]*class="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "image", { src: m[2], className: extractClassName(m[1]) })
  }
  // inputs
  for (const m of phpCode.matchAll(/<input[^>]*class="([^"]*)"[^>]*placeholder="([^"]*)"[^>]*\/?>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "input", { placeholder: m[2], className: extractClassName(m[1]) })
  }
  // textareas
  for (const m of phpCode.matchAll(/<textarea[^>]*class="([^"]*)"[^>]*placeholder="([^"]*)"[^>]*>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "textarea", { placeholder: m[2], className: extractClassName(m[1]) })
  }
  // navbars
  for (const m of phpCode.matchAll(/<nav[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/nav>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    const brand = (m[2].match(/<div class="nav-brand">([\s\S]*?)<\/div>/i)?.[1]) ?? "Brand"
    const links = [...m[2].matchAll(/<li><a[^>]*>([\s\S]*?)<\/a><\/li>/gi)].map(l => stripTags(l[1].trim())).filter(Boolean)
    add(sid, "navbar", { brand: stripTags(brand.trim()), links: links.length ? links : ["Home","About","Contact"] })
  }
  // hero
  for (const m of phpCode.matchAll(/<section[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/section>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "hero", {
      title:      stripTags((m[2].match(/<h1>([\s\S]*?)<\/h1>/i)?.[1] ?? "Welcome").trim()),
      subtitle:   stripTags((m[2].match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "").trim()),
      buttonText: stripTags((m[2].match(/<a[^>]*class="hero-btn"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "Get Started").trim()),
    })
  }
  // footer
  for (const m of phpCode.matchAll(/<footer[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/footer>/gi)) {
    const sid = extractShortId(m[1]); if (!sid) continue
    add(sid, "footer", { copyright: stripTags((m[2].match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "").trim()) })
  }
  // section-heading (div containing h2)
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
  // Split components into this-page vs other-page
  const isThisPage = (c: ComponentData) =>
    c.page_id === pageId || (!c.page_id) || c.page_id === undefined

  const thisPage  = allComponents.filter(isThisPage)
  const globals   = allComponents.filter(c => c.page_id === "all")
  const otherPage = allComponents.filter(c => !isThisPage(c) && c.page_id !== "all")

  // Snapshot existing IDs BEFORE parsing so we can identify truly new components
  const existingSids = new Set(thisPage.map(c => sanitizeId(c.id)))

  const parsedList = parsePHPToFullComponentList(phpCode, pageId, thisPage)

  // CRITICAL: The parser only recognises certain HTML patterns (headings, p, button,
  // nav, section, footer, etc.). Components like `container`, `card`, `grid`, `video`,
  // `carousel`, etc. are generated INTO the PHP file but cannot be reliably parsed back.
  // If we drop them from the output, they vanish from canvas on every save.
  //
  // Fix: any existing canvas component whose ID does NOT appear in parsedList is
  // "unrecognised by parser" — keep it as-is rather than deleting it.
  const parsedSids = new Set(parsedList.map(c => sanitizeId(c.id)))
  const unrecognised = thisPage.filter(c => !parsedSids.has(sanitizeId(c.id)))

  // Apply CSS style overrides ONLY to brand-new components (not on canvas yet).
  // Existing components already have styles preserved from canvas in parsePHPToFullComponentList.
  // Applying CSS on top of existing ones would overwrite Properties Panel changes
  // and destroy all canvas styling every time a new component is added.
  if (cssCode) {
    const cssUpdates = parseCSSToStyleUpdates(cssCode)
    for (const comp of parsedList) {
      const sid = sanitizeId(comp.id)
      if (!existingSids.has(sid)) {
        // Brand-new component: apply CSS defaults to give it proper initial styles
        const cu = cssUpdates.get(sid)
        if (cu) comp.style = normalizeStyleValues({ ...(comp.style ?? {}), ...cu })
      }
      // Existing component: style already fully preserved from canvas — do not touch
    }
  }

  const added   = [...parsedSids].filter(s => !existingSids.has(s)).length
  // Only count as "deleted" things the parser explicitly recognises but removed —
  // unrecognised components are silently preserved, not counted as deleted.
  const deleted = [...existingSids].filter(s => !parsedSids.has(s) && !unrecognised.find(c => sanitizeId(c.id) === s)).length
  const updated = parsedList.length - added

  const globalsSet = new Set(globals.map(c => c.id))
  return {
    components: [
      ...globals,
      ...otherPage.filter(c => !globalsSet.has(c.id)),
      // Unrecognised components come first (preserve their original order on canvas),
      // then the parsed/updated components follow.
      ...unrecognised,
      ...parsedList,
    ],
    added, deleted, updated,
  }
}

// ─────────────────────────────────────────────
// SMALL FILE TYPE ICONS
// ─────────────────────────────────────────────
const PHPIcon = () => <span className="text-[10px] font-bold text-[#8892bf] shrink-0 mr-1">PHP</span>
const CSSIcon = () => <span className="text-[10px] font-bold text-[#3fa9f5] shrink-0 mr-1">CSS</span>
const JSIcon  = () => <span className="text-[10px] font-bold text-[#f7df1e] shrink-0 mr-1">JS</span>
const MDIcon  = () => <span className="text-[10px] font-bold text-[#aaa]    shrink-0 mr-1">MD</span>

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
}: CodeViewEditorProps) {
  const [selectedFile,    setSelectedFile]    = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["app","app/views","public","public/assets","public/assets/css","public/assets/js"])
  )
  const [isEditing,       setIsEditing]       = useState(false)
  const [draftContent,    setDraftContent]    = useState("")
  const [savedIndicator,  setSavedIndicator]  = useState(false)
  const [fileOverrides,   setFileOverrides]   = useState<FileOverrides>({})
  const [showAddPanel,    setShowAddPanel]    = useState(false)
  const [pendingDiff, setPendingDiff] = useState<{ added: number; deleted: number; updated: number } | null>(null)

  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const componentsRef = useRef(components)
  useEffect(() => { componentsRef.current = components }, [components])

  // ── Generated + effective files ──────────────
  const generatedFiles = useMemo(
    () => generateProjectFiles(components, pages, projectName),
    [components, pages, projectName]
  )
  const effectiveFiles = useMemo<Record<string, string>>(
    () => ({ ...generatedFiles, ...fileOverrides }),
    [generatedFiles, fileOverrides]
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
  const diffCount       = hasOverride ? countDiffLines(generatedFiles[selectedFile] ?? "", fileOverrides[selectedFile] ?? "") : 0

  const isViewPHP = selectedFile.startsWith("app/views/") && selectedFile.endsWith(".php")
  const isCSSFile = selectedFile.endsWith(".css")
  const isJSFile  = selectedFile.endsWith(".js")
  const isMDFile  = selectedFile.endsWith(".md")

  const syntaxLang = isCSSFile ? "css" : isJSFile ? "javascript" : isMDFile ? "markdown" : "php"

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

    // Also strip from any overridden files
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
    setFileOverrides(prev => ({ ...prev, [selectedFile]: draftContent }))

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
  }, [selectedFile, draftContent, isViewPHP, isCSSFile, isJSFile, onCodeChange, activePHPPageId, effectiveFiles])

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
    if (node.path.endsWith(".php")) return <PHPIcon />
    if (node.path.endsWith(".css")) return <CSSIcon />
    if (node.path.endsWith(".js"))  return <JSIcon />
    if (node.path.endsWith(".md"))  return <MDIcon />
    return <File className="w-3 h-3" />
  }

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map(node => {
      const overridden = node.type === "file" && !!fileOverrides[node.path]
      return (
        <div key={node.path}>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-muted/40 transition-colors ${
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
            <span className={`text-sm truncate flex-1 ${overridden ? "text-amber-400" : ""}`}>{node.name}</span>
            {overridden && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Manually edited" />}
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

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════
  return (
    <div className="w-full h-full flex gap-3 p-4 bg-background">

      {/* ── File Explorer ── */}
      <div className="w-52 border rounded-md flex flex-col bg-[#181818] h-full overflow-hidden shrink-0">
        <div className="px-3 py-2.5 border-b border-[#2b2b2b] flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Explorer</span>
          {Object.keys(fileOverrides).length > 0 &&
            <span className="text-[10px] text-amber-400">{Object.keys(fileOverrides).length} edited</span>
          }
        </div>
        <div className="flex-1 overflow-auto p-2">{renderTree(fileStructure)}</div>
        <div className="px-3 py-2 border-t border-[#2b2b2b] text-[10px] text-muted-foreground/40">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> manually edited</div>
        </div>
      </div>

      {/* ── Editor Pane ── */}
      <div className="flex-1 border rounded-md overflow-hidden flex flex-col bg-[#1f1f1f] h-full min-w-0">

        {/* ── Top bar ── */}
        <div className="px-4 py-2 border-b border-[#2b2b2b] bg-[#181818] flex items-center justify-between gap-2 shrink-0 flex-wrap">
          {/* Left: badges */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{selectedFile}</span>

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
            {/* Live pending diff pill */}
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

        {/* ── Code area + component sidebar ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* Code / Textarea */}
          <div className="flex-1 overflow-hidden relative">
            {isEditing ? (
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
            )}
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
                    {/* Type badge */}
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

              {/* Bottom add button */}
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