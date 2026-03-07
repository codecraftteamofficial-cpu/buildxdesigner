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
  RefreshCw,
  AlertCircle,
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

// Track per-file overrides (user edits not yet reflected in canvas)
type FileOverrides = Record<string, string>

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
const MDIcon = () => (
  <span className="text-[10px] font-bold text-[#aaa] shrink-0 mr-1">MD</span>
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

  // headings h1–h6
  const hRegex = /<h([1-6])[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/h[1-6]>/gi
  for (const m of phpCode.matchAll(hRegex)) {
    const sid = extractShortId(m[2])
    if (sid)
      updates.set(sid, {
        type: "heading",
        props: { content: stripTags(m[3].trim()), level: parseInt(m[1]), className: extractClassName(m[2]) },
      })
  }

  // paragraphs
  const pRegex = /<p[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/gi
  for (const m of phpCode.matchAll(pRegex)) {
    const sid = extractShortId(m[1])
    if (sid)
      updates.set(sid, {
        type: "text",
        props: { content: stripTags(m[2].trim()), className: extractClassName(m[1]) },
      })
  }

  // buttons
  const btnRegex = /<button[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi
  for (const m of phpCode.matchAll(btnRegex)) {
    const sid = extractShortId(m[1])
    if (sid)
      updates.set(sid, {
        type: "button",
        props: { text: stripTags(m[2].trim()), content: stripTags(m[2].trim()), className: extractClassName(m[1]) },
      })
  }

  // images — src before class
  const imgA = /<img[^>]*src="([^"]*)"[^>]*class="([^"]*)"[^>]*\/?>/gi
  for (const m of phpCode.matchAll(imgA)) {
    const sid = extractShortId(m[2])
    if (sid)
      updates.set(sid, {
        type: "image",
        props: { src: m[1], className: extractClassName(m[2]) },
      })
  }
  // images — class before src
  const imgB = /<img[^>]*class="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi
  for (const m of phpCode.matchAll(imgB)) {
    const sid = extractShortId(m[1])
    if (sid && !updates.has(sid))
      updates.set(sid, {
        type: "image",
        props: { src: m[2], className: extractClassName(m[1]) },
      })
  }

  // navbar brand
  const brandRegex = /<div class="nav-brand">([\s\S]*?)<\/div>/gi
  for (const m of phpCode.matchAll(brandRegex)) {
    // Find the enclosing nav's class
    const navBefore = phpCode.slice(0, phpCode.indexOf(m[0]))
    const lastNav = navBefore.lastIndexOf("<nav")
    if (lastNav !== -1) {
      const navTag = phpCode.slice(lastNav, lastNav + 300)
      const clsMatch = navTag.match(/class="([^"]*)"/)
      if (clsMatch) {
        const sid = extractShortId(clsMatch[1])
        if (sid) {
          const existing = updates.get(sid) || { type: "navbar", props: {} }
          updates.set(sid, {
            ...existing,
            props: { ...(existing.props || {}), brand: stripTags(m[1].trim()) },
          })
        }
      }
    }
  }

  // nav links
  const navLinksRegex = /<ul class="nav-links">([\s\S]*?)<\/ul>/gi
  for (const m of phpCode.matchAll(navLinksRegex)) {
    const navBefore = phpCode.slice(0, phpCode.indexOf(m[0]))
    const lastNav = navBefore.lastIndexOf("<nav")
    if (lastNav !== -1) {
      const navTag = phpCode.slice(lastNav, lastNav + 300)
      const clsMatch = navTag.match(/class="([^"]*)"/)
      if (clsMatch) {
        const sid = extractShortId(clsMatch[1])
        if (sid) {
          const linkMatches = [...m[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)]
          const links = linkMatches.map(lm => stripTags(lm[1].trim()))
          const existing = updates.get(sid) || { type: "navbar", props: {} }
          updates.set(sid, {
            ...existing,
            props: { ...(existing.props || {}), links },
          })
        }
      }
    }
  }

  // hero section
  const heroRegex = /<section[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/section>/gi
  for (const m of phpCode.matchAll(heroRegex)) {
    const sid = extractShortId(m[1])
    if (sid) {
      const h1 = m[2].match(/<h1>([\s\S]*?)<\/h1>/i)
      const p = m[2].match(/<p>([\s\S]*?)<\/p>/i)
      const btn = m[2].match(/<a[^>]*class="hero-btn"[^>]*>([\s\S]*?)<\/a>/i)
      updates.set(sid, {
        type: "hero",
        props: {
          title: h1 ? stripTags(h1[1].trim()) : undefined,
          subtitle: p ? stripTags(p[1].trim()) : undefined,
          buttonText: btn ? stripTags(btn[1].trim()) : undefined,
        },
      })
    }
  }

  // footer
  const footerRegex = /<footer[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/footer>/gi
  for (const m of phpCode.matchAll(footerRegex)) {
    const sid = extractShortId(m[1])
    if (sid) {
      const p = m[2].match(/<p>([\s\S]*?)<\/p>/i)
      updates.set(sid, {
        type: "footer",
        props: { copyright: p ? stripTags(p[1].trim()) : "" },
      })
    }
  }

  // input
  const inputRegex = /<input[^>]*class="([^"]*)"[^>]*placeholder="([^"]*)"[^>]*\/?>/gi
  for (const m of phpCode.matchAll(inputRegex)) {
    const sid = extractShortId(m[1])
    if (sid)
      updates.set(sid, {
        type: "input",
        props: { placeholder: m[2], className: extractClassName(m[1]) },
      })
  }

  // textarea
  const textareaRegex = /<textarea[^>]*class="([^"]*)"[^>]*placeholder="([^"]*)"[^>]*>/gi
  for (const m of phpCode.matchAll(textareaRegex)) {
    const sid = extractShortId(m[1])
    if (sid)
      updates.set(sid, {
        type: "textarea",
        props: { placeholder: m[2], className: extractClassName(m[1]) },
      })
  }

  return updates
}

function parseCSSToStyleUpdates(
  cssCode: string
): Map<string, Record<string, any>> {
  const updates = new Map<string, Record<string, any>>()
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
      style[camel] = value
    }
    if (Object.keys(style).length > 0) updates.set(sanitizedId, style)
  }
  return updates
}

/**
 * Parse JS file for button event listener content changes.
 * Looks for patterns like: // Event listener for <name>
 * and extracts any console.log or custom code inside.
 * This is intentionally lightweight — JS edits are stored as file overrides
 * and don't round-trip to canvas components (JS is behaviour, not structure).
 */
function parseJSForComponentHints(
  _jsCode: string
): Map<string, Partial<ComponentData>> {
  // JS files control behaviour, not component structure/style.
  // We return an empty map — JS changes are preserved as file overrides only.
  return new Map()
}

function extractShortId(cls: string): string | null {
  const firstClass = cls.trim().split(/\s+/)[0]
  const m = firstClass.match(/^comp-(.+)$/)
  return m ? m[1] : null
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-")
}
function extractClassName(cls: string): string {
  return cls.trim().split(/\s+/)[0] || cls.trim()
}
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "")
}

const UNITLESS_PROPS = new Set([
  "opacity", "zIndex", "fontWeight", "lineHeight", "flex", "order",
  "flexGrow", "flexShrink", "columnCount", "animationIterationCount",
])

function normalizeStyleValues(style: Record<string, any> = {}): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(style)) {
    if (typeof value === "number") {
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

    const normalizedExistingStyle = normalizeStyleValues(comp.style)

    if (!pu && !cu) {
      if (JSON.stringify(normalizedExistingStyle) === JSON.stringify(comp.style)) {
        return comp
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
// DIFF UTILITY — highlights unsaved changes
// ─────────────────────────────────────────────
function countDiffLines(original: string, edited: string): number {
  const a = original.split("\n")
  const b = edited.split("\n")
  let diff = 0
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) diff++
  }
  return diff
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

  // ── File overrides: stores user-edited versions of ANY file ──
  // Key = file path, value = edited content string
  const [fileOverrides, setFileOverrides] = useState<FileOverrides>({})

  // Always-current ref so handleSave never closes over a stale components array
  const componentsRef = useRef(components)
  useEffect(() => { componentsRef.current = components }, [components])

  // Generated files — source of truth from canvas
  const generatedFiles = useMemo(
    () => generateProjectFiles(components, pages, projectName),
    [components, pages, projectName]
  )

  // Merge generated files with overrides — overrides win for display
  const effectiveFiles = useMemo<Record<string, string>>(() => {
    return { ...generatedFiles, ...fileOverrides }
  }, [generatedFiles, fileOverrides])

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

  // The content to display for a file: override > generated
  const readOnlyContent = effectiveFiles[selectedFile] ?? ""

  // All file types are now editable
  const isSyncableFile = selectedFile.endsWith(".php") || selectedFile.endsWith(".css")
  const isJSFile       = selectedFile.endsWith(".js")
  const isMDFile       = selectedFile.endsWith(".md")
  const isEditableFile = isSyncableFile || isJSFile || isMDFile || selectedFile.endsWith(".php")

  // Has this file been manually overridden?
  const hasOverride = !!fileOverrides[selectedFile]
  // How many lines differ from generated?
  const diffCount = hasOverride
    ? countDiffLines(generatedFiles[selectedFile] ?? "", fileOverrides[selectedFile] ?? "")
    : 0

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

  // ── Reset override for a file ────────────────
  const handleResetOverride = useCallback(() => {
    setFileOverrides((prev) => {
      const next = { ...prev }
      delete next[selectedFile]
      return next
    })
    toast.info("File reset to canvas-generated version.")
  }, [selectedFile])

  // ── Save & sync ──────────────────────────────
  const handleSave = useCallback(() => {
    if (!selectedFile) return

    // Always store the edit as a file override (preserves JS/MD/config edits)
    setFileOverrides((prev) => ({ ...prev, [selectedFile]: draftContent }))

    // For PHP and CSS: also attempt to sync back to canvas components
    if (onCodeChange && isSyncableFile) {
      let phpUpdates = new Map<string, Partial<ComponentData>>()
      let cssUpdates = new Map<string, Record<string, any>>()

      if (selectedFile.endsWith(".php")) {
        phpUpdates = parsePHPToComponentUpdates(draftContent)
      } else if (selectedFile.endsWith(".css")) {
        cssUpdates = parseCSSToStyleUpdates(draftContent)
      }

      if (phpUpdates.size > 0 || cssUpdates.size > 0) {
        const updated = applyUpdatesToComponents(componentsRef.current, phpUpdates, cssUpdates)
        onCodeChange(updated)
        toast.success("Canvas updated from code!")
      } else {
        toast.success("File saved. (No structural component changes detected)")
      }
    } else if (isJSFile) {
      toast.success("JS file saved as override. Changes apply to exported project.")
    } else if (isMDFile) {
      toast.success("README saved.")
    } else {
      toast.success("File saved.")
    }

    setIsEditing(false)
    setDraftContent("")
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 2500)
  }, [selectedFile, draftContent, onCodeChange, isSyncableFile, isJSFile, isMDFile])

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
    () => buildTreeFromPaths(Object.keys(effectiveFiles)),
    [effectiveFiles]
  )

  const renderFileIcon = (node: FileNode) => {
    if (node.path.endsWith(".php")) return <PHPIcon />
    if (node.path.endsWith(".css")) return <CSSIcon />
    if (node.path.endsWith(".js"))  return <JSIcon />
    if (node.path.endsWith(".md"))  return <MDIcon />
    return <File className="w-3 h-3" />
  }

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      const isOverridden = node.type === "file" && !!fileOverrides[node.path]
      return (
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
            ) : (
              renderFileIcon(node)
            )}
            <span className={`text-sm truncate ${isOverridden ? "text-amber-400" : ""}`}>
              {node.name}
            </span>
            {/* Dot indicator for overridden files */}
            {isOverridden && (
              <span
                className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400"
                title="File has unsaved overrides"
              />
            )}
          </div>
          {node.type === "folder" &&
            expandedFolders.has(node.path) &&
            node.children &&
            renderTree(node.children, depth + 1)}
        </div>
      )
    })

  // ── Tab size for textarea ────────────────────
  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end   = ta.selectionEnd
      const spaces = "  " // 2-space indent
      const newVal = ta.value.slice(0, start) + spaces + ta.value.slice(end)
      setDraftContent(newVal)
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        ta.selectionStart = start + spaces.length
        ta.selectionEnd   = start + spaces.length
      })
    }
  }

  // ── RENDER ───────────────────────────────────
  return (
    <div className="w-full h-full flex gap-4 p-4 bg-background">

      {/* ── File Explorer ── */}
      <div className="w-64 border rounded-md flex flex-col bg-[#181818] h-full overflow-hidden shrink-0">
        <div className="px-4 py-3 border-b border-[#2b2b2b] flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Explorer
          </span>
          {Object.keys(fileOverrides).length > 0 && (
            <span
              className="text-[10px] text-amber-400 cursor-pointer hover:text-amber-300"
              title={`${Object.keys(fileOverrides).length} file(s) with overrides`}
            >
              {Object.keys(fileOverrides).length} edited
            </span>
          )}
        </div>
        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
          {renderTree(fileStructure)}
        </div>

        {/* Legend */}
        <div className="px-3 py-2 border-t border-[#2b2b2b] text-[10px] text-muted-foreground/50 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span>File has manual edits</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
            <span>Synced to canvas</span>
          </div>
        </div>
      </div>

      {/* ── Editor Pane ── */}
      <div className="flex-1 border rounded-md overflow-hidden flex flex-col bg-[#1f1f1f] h-full min-w-0">

        {/* Top bar */}
        <div className="px-4 py-2 border-b border-[#2b2b2b] bg-[#181818] flex items-center justify-between gap-2 shrink-0">

          {/* Left: file path + status badges */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground truncate">
              {selectedFile}
            </span>

            {/* File type badge */}
            {isJSFile && (
              <span className="shrink-0 text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.5 rounded font-medium">
                JS — behaviour only
              </span>
            )}
            {isMDFile && (
              <span className="shrink-0 text-[10px] bg-gray-500/20 text-gray-300 border border-gray-500/30 px-1.5 py-0.5 rounded font-medium">
                Markdown
              </span>
            )}

            {/* Override indicator */}
            {hasOverride && !isEditing && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">
                <AlertCircle className="w-3 h-3" />
                {diffCount} line{diffCount !== 1 ? "s" : ""} changed
              </span>
            )}

            {isEditing && (
              <span className="shrink-0 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">
                Editing
              </span>
            )}

            {savedIndicator && !isEditing && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-medium">
                <CheckCircle2 className="w-3 h-3" />
                {isSyncableFile ? "Canvas updated" : "Saved"}
              </span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing ? (
              <>
                {/* Reset override button */}
                {hasOverride && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    onClick={handleResetOverride}
                    title="Reset to canvas-generated version"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset
                  </Button>
                )}

                {/* Edit button — available for ALL file types */}
                {onCodeChange !== undefined || isJSFile || isMDFile ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 gap-1.5 text-xs border-[#3a3a3a] bg-[#2a2a2a] hover:bg-[#333] text-muted-foreground hover:text-white"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                ) : null}

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
                  className={`h-7 px-3 gap-1.5 text-xs text-white border-0 ${
                    isSyncableFile
                      ? "bg-purple-600 hover:bg-purple-700"
                      : isJSFile
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={handleSave}
                  title={
                    isSyncableFile
                      ? "Save & sync to canvas (Ctrl+S)"
                      : "Save file (Ctrl+S)"
                  }
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSyncableFile ? "Save & Sync" : "Save"}
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

        {/* Sync notice for JS/MD files */}
        {!isEditing && isJSFile && (
          <div className="px-4 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-[11px] text-yellow-400/80 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 shrink-0" />
            JS changes are saved as file overrides and included in export, but do not modify canvas components.
          </div>
        )}

        {/* Code area */}
        <div className="flex-1 overflow-hidden relative">

          {isEditing ? (
            /* ── EDIT MODE: plain textarea ── */
            <div className="absolute inset-0 flex flex-col">
              <textarea
                ref={textareaRef}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                onKeyDown={handleTabKey}
                spellCheck={false}
                className="flex-1 w-full resize-none bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] leading-[1.6] p-6 outline-none border-0 overflow-auto"
                style={{ tabSize: 2 }}
              />
              {/* Bottom hint bar */}
              <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-[#181818] border-t border-[#2b2b2b]">
                <span className="text-[10px] text-muted-foreground/60 select-none">
                  Ctrl+S — save{isSyncableFile ? " &amp; sync" : ""} &nbsp;·&nbsp; Esc — cancel &nbsp;·&nbsp; Tab — indent
                </span>
                <div className="flex items-center gap-3">
                  {/* Live diff count */}
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
            /* ── READ-ONLY MODE: syntax highlighted ── */
            <div className="absolute inset-0 overflow-auto">
              {/* Read-only label for non-editable config files */}
              {!isEditableFile && (
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