"use client"

import type React from "react"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Button } from "./ui/button"
import {
  Copy,
  ChevronRight,
  ChevronDown,
  File,
  Save,
  Pencil,
  X,
  CheckCircle2,
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

// --- SMALL ICONS ---
const PHPIcon = () => (
  <span className="text-[10px] font-bold text-[#8892bf] shrink-0 mr-1">PHP</span>
)
const CSSIcon = () => (
  <span className="text-[10px] font-bold text-[#3fa9f5] shrink-0 mr-1">CSS</span>
)
const JSIcon = () => (
  <span className="text-[10px] font-bold text-[#f7df1e] shrink-0 mr-1">JS</span>
)

// ─────────────────────────────────────────────
// FILE TREE HELPER
// ─────────────────────────────────────────────
const buildTreeFromPaths = (paths: string[]): FileNode[] => {
  const root: FileNode = { name: "root", type: "folder", path: "", children: [] }
  paths.forEach((path) => {
    const segments = path.split("/")
    let current = root
    segments.forEach((segment, index) => {
      const currentPath = segments.slice(0, index + 1).join("/")
      const isFile = index === segments.length - 1 && segment.includes(".")
      if (!current.children) current.children = []
      let node = current.children.find((n) => n.path === currentPath)
      if (!node) {
        node = {
          name: segment,
          type: isFile ? "file" : "folder",
          path: currentPath,
          children: isFile ? undefined : [],
        }
        current.children.push(node)
      }
      current = node
    })
  })
  return (root.children ?? []).sort((a, b) =>
    a.type === b.type
      ? a.name.localeCompare(b.name)
      : a.type === "folder"
      ? -1
      : 1
  )
}

// ─────────────────────────────────────────────
// REVERSE PARSERS
// ─────────────────────────────────────────────
function parsePHPToComponentUpdates(
  phpCode: string
): Map<string, Partial<ComponentData>> {
  const updates = new Map<string, Partial<ComponentData>>()

  const h1Regex = /<h1[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/h1>/gi
  for (const m of phpCode.matchAll(h1Regex)) {
    const sid = extractShortId(m[1])
    if (sid)
      updates.set(sid, {
        type: "heading",
        props: { content: stripTags(m[2].trim()), className: extractClassName(m[1]) },
      })
  }

  const pRegex = /<p[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/gi
  for (const m of phpCode.matchAll(pRegex)) {
    const sid = extractShortId(m[1])
    if (sid)
      updates.set(sid, {
        type: "text",
        props: { content: stripTags(m[2].trim()), className: extractClassName(m[1]) },
      })
  }

  const btnRegex = /<button[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi
  for (const m of phpCode.matchAll(btnRegex)) {
    const sid = extractShortId(m[1])
    if (sid)
      updates.set(sid, {
        type: "button",
        props: { content: stripTags(m[2].trim()), className: extractClassName(m[1]) },
      })
  }

  const imgA = /<img[^>]*src="([^"]*)"[^>]*class="([^"]*)"[^>]*\/?>/gi
  for (const m of phpCode.matchAll(imgA)) {
    const sid = extractShortId(m[2])
    if (sid)
      updates.set(sid, {
        type: "image",
        props: { src: m[1], className: extractClassName(m[2]) },
      })
  }
  const imgB = /<img[^>]*class="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi
  for (const m of phpCode.matchAll(imgB)) {
    const sid = extractShortId(m[1])
    if (sid && !updates.has(sid))
      updates.set(sid, {
        type: "image",
        props: { src: m[2], className: extractClassName(m[1]) },
      })
  }

  return updates
}

function parseCSSToStyleUpdates(
  cssCode: string
): Map<string, Record<string, any>> {
  const updates = new Map<string, Record<string, any>>()
  // Selector is always .comp-{sanitizedId} — only hyphens, letters, digits
  const ruleRegex = /\.(comp-[a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g
  for (const m of cssCode.matchAll(ruleRegex)) {
    const sanitizedId = m[1].replace(/^comp-/, "")
    const style: Record<string, any> = {}
    for (const line of m[2].split(";")) {
      const t = line.trim()
      if (!t) continue
      const ci = t.indexOf(":")
      if (ci === -1) continue
      const prop = t.slice(0, ci).trim()
      const value = t.slice(ci + 1).trim()
      if (!prop || !value) continue
      const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      // Keep the raw string value — do NOT strip px or convert to number.
      // PropertiesPanel expects strings like "16px", not numbers like 16.
      style[camel] = value
    }
    if (Object.keys(style).length > 0) updates.set(sanitizedId, style)
  }
  return updates
}

function extractShortId(cls: string): string | null {
  // First class is always comp-{sanitizedId}.
  // Extract the sanitized ID — we match against sanitized IDs in applyUpdates.
  const firstClass = cls.trim().split(/\s+/)[0]
  const m = firstClass.match(/^comp-(.+)$/)
  return m ? m[1] : null
}

// Mirror of the generator's sanitizeId — dots and invalid chars → hyphens
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-")
}
function extractClassName(cls: string): string {
  return cls.trim().split(/\s+/)[0] || cls.trim()
}
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "")
}

// Normalize style values — PropertiesPanel expects all style values to be strings.
// Numeric values (e.g. fontSize: 16) must be converted back to "16px" strings
// for px-based properties, or plain strings for unitless ones.
const UNITLESS_PROPS = new Set([
  "opacity", "zIndex", "fontWeight", "lineHeight", "flex", "order",
  "flexGrow", "flexShrink", "columnCount", "animationIterationCount",
])

function normalizeStyleValues(style: Record<string, any> = {}): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(style)) {
    if (typeof value === "number") {
      // Unitless props stay as numbers, px-based ones become "Npx" strings
      result[key] = UNITLESS_PROPS.has(key) ? value : `${value}px`
    } else {
      result[key] = value
    }
  }
  return result
}

function applyUpdatesToComponents(
  components: ComponentData[],
  phpUpdates: Map<string, Partial<ComponentData>>,
  cssUpdates: Map<string, Record<string, any>>
): ComponentData[] {
  return components.map((comp) => {
    const sid = sanitizeId(comp.id)
    const pu = phpUpdates.get(sid)
    const cu = cssUpdates.get(sid)

    // Always normalize existing style values to strings — fixes any numeric
    // fontSize/width/etc that was stored from a previous save.
    const normalizedExistingStyle = normalizeStyleValues(comp.style)

    if (!pu && !cu) {
      // No code changes for this component, but still normalize its style
      if (JSON.stringify(normalizedExistingStyle) === JSON.stringify(comp.style)) {
        return comp // nothing changed, avoid unnecessary re-render
      }
      return { ...comp, style: normalizedExistingStyle }
    }

    const patchedProps = pu?.props
      ? { ...comp.props, ...pu.props }
      : comp.props

    const patchedStyle = cu
      ? normalizeStyleValues({ ...normalizedExistingStyle, ...cu })
      : normalizedExistingStyle

    return {
      ...comp,
      props: patchedProps,
      style: patchedStyle,
    }
  })
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
export function CodeViewEditor({
  components,
  projectName = "php-builder",
  pages,
  activePageId,
  onCodeChange,
}: CodeViewEditorProps) {
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([
      "app",
      "app/views",
      "public",
      "public/assets",
      "public/assets/css",
      "public/assets/js",
    ])
  )

  // ── Edit mode ───────────────────────────────
  const [isEditing, setIsEditing]       = useState(false)
  const [draftContent, setDraftContent] = useState("")
  const [savedIndicator, setSavedIndicator] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Always-current ref so handleSave never closes over a stale components array
  const componentsRef = useRef(components)
  useEffect(() => { componentsRef.current = components }, [components])

  // Generated files — source of truth from canvas
  const generatedFiles = useMemo(
    () => generateProjectFiles(components, pages, projectName),
    [components, pages, projectName]
  )

  // Auto-select the active page view file on mount / page switch
  useEffect(() => {
    const activePage = pages.find((p) => p.id === activePageId) || pages[0]
    const defaultFile = `app/views/${slugify(activePage.name)}.php`
    setSelectedFile((prev) => prev || defaultFile)
  }, [activePageId, pages])

  // Switch file — always leave edit mode cleanly
  const handleSelectFile = (path: string) => {
    if (path === selectedFile) return
    setIsEditing(false)
    setDraftContent("")
    setSelectedFile(path)
  }

  const readOnlyContent  = generatedFiles[selectedFile] ?? ""
  const isSyncableFile   = selectedFile.endsWith(".php") || selectedFile.endsWith(".css")

  const syntaxLang = selectedFile.endsWith(".css")
    ? "css"
    : selectedFile.endsWith(".js")
    ? "javascript"
    : selectedFile.endsWith(".md")
    ? "markdown"
    : "php"

  // ── Enter edit mode ──────────────────────────
  const handleStartEdit = () => {
    setDraftContent(readOnlyContent)
    setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  // ── Cancel ──────────────────────────────────
  const handleCancelEdit = () => {
    setIsEditing(false)
    setDraftContent("")
  }

  // ── Save & sync ──────────────────────────────
  const handleSave = useCallback(() => {
    if (!onCodeChange || !selectedFile) return

    let phpUpdates = new Map<string, Partial<ComponentData>>()
    let cssUpdates = new Map<string, Record<string, any>>()

    if (selectedFile.endsWith(".php")) {
      phpUpdates = parsePHPToComponentUpdates(draftContent)
    } else if (selectedFile.endsWith(".css")) {
      cssUpdates = parseCSSToStyleUpdates(draftContent)
    }

    if (phpUpdates.size === 0 && cssUpdates.size === 0) {
      toast.info("No component changes detected.")
      setIsEditing(false)
      return
    }

    // Use the ref so we always apply onto the LATEST components array,
    // preserving any position / style changes made on the canvas after
    // the last code save.
    const updated = applyUpdatesToComponents(componentsRef.current, phpUpdates, cssUpdates)
    onCodeChange(updated)

    setIsEditing(false)
    setDraftContent("")
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 2500)
    toast.success("Canvas updated!")
  }, [selectedFile, draftContent, onCodeChange]) // ← no `components` dep needed

  // Keyboard shortcuts while editing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isEditing) return
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
      if (e.key === "Escape") {
        handleCancelEdit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isEditing, handleSave])

  // ── File tree ────────────────────────────────
  const fileStructure = useMemo(
    () => buildTreeFromPaths(Object.keys(generatedFiles)),
    [generatedFiles]
  )

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.path} className="group">
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted/40 transition-colors ${
            selectedFile === node.path
              ? "bg-muted text-white"
              : "text-muted-foreground"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() =>
            node.type === "folder"
              ? setExpandedFolders((prev) => {
                  const next = new Set(prev)
                  next.has(node.path) ? next.delete(node.path) : next.add(node.path)
                  return next
                })
              : handleSelectFile(node.path)
          }
        >
          {node.type === "folder" ? (
            expandedFolders.has(node.path) ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : node.path.endsWith(".php") ? (
            <PHPIcon />
          ) : node.path.endsWith(".css") ? (
            <CSSIcon />
          ) : node.path.endsWith(".js") ? (
            <JSIcon />
          ) : (
            <File className="w-3 h-3" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {node.type === "folder" &&
          expandedFolders.has(node.path) &&
          node.children &&
          renderTree(node.children, depth + 1)}
      </div>
    ))

  // ── RENDER ───────────────────────────────────
  return (
    <div className="w-full h-full flex gap-4 p-4 bg-background">

      {/* ── File Explorer ── */}
      <div className="w-64 border rounded-md flex flex-col bg-[#181818] h-full overflow-hidden shrink-0">
        <div className="px-4 py-3 border-b border-[#2b2b2b] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Explorer
        </div>
        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
          {renderTree(fileStructure)}
        </div>
      </div>

      {/* ── Editor Pane ── */}
      <div className="flex-1 border rounded-md overflow-hidden flex flex-col bg-[#1f1f1f] h-full min-w-0">

        {/* Top bar */}
        <div className="px-4 py-2 border-b border-[#2b2b2b] bg-[#181818] flex items-center justify-between gap-2 shrink-0">

          {/* Left: file path + status badges */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-muted-foreground truncate">
              {selectedFile}
            </span>

            {isEditing && (
              <span className="shrink-0 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">
                Editing
              </span>
            )}

            {savedIndicator && !isEditing && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Canvas updated
              </span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing ? (
              <>
                {isSyncableFile && onCodeChange && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 gap-1.5 text-xs border-[#3a3a3a] bg-[#2a2a2a] hover:bg-[#333] text-muted-foreground hover:text-white"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                  title="Copy to clipboard"
                  onClick={() => {
                    navigator.clipboard.writeText(readOnlyContent)
                    toast.success("Copied!")
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 px-3 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white border-0"
                  onClick={handleSave}
                  title="Save & sync to canvas (Ctrl+S)"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-white"
                  onClick={handleCancelEdit}
                  title="Discard changes (Esc)"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Code area */}
        <div className="flex-1 overflow-hidden relative">

          {isEditing ? (
            /* ── EDIT MODE: plain textarea ── */
            <div className="absolute inset-0 flex flex-col">
              <textarea
                ref={textareaRef}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full resize-none bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] leading-[1.6] p-6 outline-none border-0 overflow-auto"
                style={{ tabSize: 2 }}
              />
              {/* Bottom hint bar */}
              <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-[#181818] border-t border-[#2b2b2b]">
                <span className="text-[10px] text-muted-foreground/60 select-none">
                  Ctrl+S — save &amp; sync &nbsp;·&nbsp; Esc — cancel
                </span>
                <span className="text-[10px] text-muted-foreground/40 select-none">
                  {draftContent.split("\n").length} lines
                </span>
              </div>
            </div>
          ) : (
            /* ── READ-ONLY MODE: syntax highlighted ── */
            <div className="absolute inset-0 overflow-auto">
              {!isSyncableFile && (
                <div className="absolute top-2 right-3 z-10 text-[10px] text-muted-foreground/40 pointer-events-none select-none">
                  read-only
                </div>
              )}
              <SyntaxHighlighter
                language={syntaxLang}
                style={customSyntaxTheme}
                showLineNumbers
                customStyle={{
                  margin: 0,
                  padding: "24px",
                  backgroundColor: "#1f1f1f",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  minHeight: "100%",
                }}
              >
                {readOnlyContent || "// No content"}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}