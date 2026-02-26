"use client"

import type React from "react"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Button } from "./ui/button"
import {
  Copy,
  ChevronRight,
  ChevronDown,
  File,
  Edit3,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism"
import { generateProjectFiles, slugify } from "../lib/code-generator"

// --- VS CODE DARK MODERN THEME OVERRIDES ---
const customSyntaxTheme = {
  ...okaidia,
  'comment': { color: "#6a9955", fontStyle: "italic" },
  'punctuation': { color: "#d4d4d4" },
  'property': { color: "#9cdcfe" },
  'tag': { color: "#569cd6" },
  'string': { color: "#ce9178" },
  'function': { color: "#dcdcaa" },
  'keyword': { color: "#c586c0" },
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

// --- ICONS ---
const PHPIcon = () => <span className="text-[10px] font-bold text-[#8892bf] shrink-0 mr-1">PHP</span>
const CSSIcon = () => <span className="text-[10px] font-bold text-[#3fa9f5] shrink-0 mr-1">CSS</span>
const JSIcon = () => <span className="text-[10px] font-bold text-[#f7df1e] shrink-0 mr-1">JS</span>

// --- HELPERS ---
const buildTreeFromPaths = (paths: string[]): FileNode[] => {
  const root: FileNode = { name: "root", type: "folder", path: "", children: [] }
  paths.forEach((path) => {
    const segments = path.split("/")
    let current = root
    segments.forEach((segment, index) => {
      const currentPath = segments.slice(0, index + 1).join("/")
      const isFile = index === segments.length - 1 && segment.includes(".")
      if (!current.children) current.children = []
      let node = current.children.find((item) => item.path === currentPath)
      if (!node) {
        node = { name: segment, type: isFile ? "file" : "folder", path: currentPath, children: isFile ? undefined : [] }
        current.children.push(node)
      }
      current = node
    })
  })
  return (root.children ?? []).sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1
  )
}

// --- PHP PARSER ---
// Parses HTML tags inside canvas-container back into ComponentData objects
const parsePHPToComponents = (
  phpCode: string,
  pageId: string,
  existingComponents: ComponentData[]
): ComponentData[] => {
  const containerMatch = phpCode.match(/<div class="canvas-container">([\s\S]*?)<\/div>\s*\n?<script/)
  if (!containerMatch) return existingComponents

  const innerHtml = containerMatch[1].trim()
  if (!innerHtml) return []

  const results: ComponentData[] = []
  const existingByClass = new Map<string, ComponentData>()
  existingComponents.forEach(c => {
    if (c.props?.className) existingByClass.set(c.props.className, c)
  })

  const tagRegex = /<(h1|h2|h3|p|button|img|div|span|a)([^>]*)>([\s\S]*?)<\/\1>|<img([^>]*?)\/>/gi
  let match
  while ((match = tagRegex.exec(innerHtml)) !== null) {
    const tag = match[1] || "img"
    const attrsStr = match[2] || match[4] || ""
    const innerContent = match[3] || ""

    const classMatch = attrsStr.match(/class="([^"]*)"/)
    const className = classMatch ? classMatch[1].trim() : ""
    const srcMatch = attrsStr.match(/src="([^"]*)"/)
    const src = srcMatch ? srcMatch[1] : ""
    const hrefMatch = attrsStr.match(/href="([^"]*)"/)
    const href = hrefMatch ? hrefMatch[1] : ""

    let type: string
    switch (tag) {
      case "h1": case "h2": case "h3": type = "heading"; break
      case "p": case "span": type = "text"; break
      case "button": type = "button"; break
      case "img": type = "image"; break
      case "a": type = "link"; break
      default: type = "container"; break
    }

    const existing = existingByClass.get(className)
    const component: ComponentData = {
      id: existing?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      props: {
        ...(existing?.props || {}),
        className: className || existing?.props?.className || `comp-${Math.random().toString(36).substr(2, 5)}`,
        ...(type !== "image" ? { content: innerContent.replace(/<[^>]+>/g, "").trim() || existing?.props?.content } : {}),
        ...(type === "image" && src ? { src } : {}),
        ...(type === "link" && href ? { href } : {}),
      },
      style: existing?.style || {},
      position: existing?.position || { x: 100, y: 100 + results.length * 120 },
      page_id: pageId,
    }
    results.push(component)
  }
  return results
}

// --- CSS PARSER ---
// Parses CSS class rules and merges matching styles back to components
const applyCSSToComponents = (
  cssCode: string,
  components: ComponentData[]
): ComponentData[] => {
  const ruleRegex = /\.([^\s{,]+)\s*\{([^}]*)\}/g
  const styleMap = new Map<string, Record<string, any>>()

  let match
  while ((match = ruleRegex.exec(cssCode)) !== null) {
    const className = match[1].trim()
    const declarations = match[2].trim()
    const styleObj: Record<string, any> = {}

    declarations.split(";").forEach(decl => {
      const colonIdx = decl.indexOf(":")
      if (colonIdx === -1) return
      const prop = decl.slice(0, colonIdx).trim()
      const val = decl.slice(colonIdx + 1).trim()
      if (!prop || !val) return
      // Convert kebab-case to camelCase
      const camelProp = prop.replace(/-([a-z])/g, (_, l) => l.toUpperCase())
      styleObj[camelProp] = val
    })

    if (Object.keys(styleObj).length > 0) {
      styleMap.set(className, styleObj)
    }
  }

  return components.map(comp => {
    const cls = comp.props?.className
    if (!cls) return comp
    // Support multi-class like "btn primary"
    const classes = cls.split(" ")
    let mergedStyle = { ...comp.style }
    classes.forEach((c: string) => {
      const s = styleMap.get(c)
      if (s) mergedStyle = { ...mergedStyle, ...s }
    })
    return { ...comp, style: mergedStyle }
  })
}

export function CodeViewEditor({
  components,
  projectName = "php-builder",
  pages,
  activePageId,
  onCodeChange,
}: CodeViewEditorProps) {
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["app", "app/views", "public", "public/assets", "public/assets/css", "public/assets/js"])
  )
  // editingFiles: stores per-file edited content while in edit mode
  const [editingFiles, setEditingFiles] = useState<Record<string, string>>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const fileContents = useMemo(
    () => generateProjectFiles(components, pages, projectName),
    [components, pages, projectName]
  )

  // Current displayed content: edited version takes priority
  const currentContent = editingFiles[selectedFile] ?? fileContents[selectedFile] ?? ""

  // Auto-select active page's PHP file on load
  useEffect(() => {
    const activePage = pages.find(p => p.id === activePageId) || pages[0]
    const defaultFile = `app/views/${slugify(activePage.name)}.php`
    if (!selectedFile || !fileContents[selectedFile]) {
      setSelectedFile(defaultFile)
    }
  }, [fileContents, activePageId, pages, selectedFile])

  // When leaving edit mode, discard all in-progress edits
  const handleToggleEditMode = () => {
    if (isEditMode) {
      setEditingFiles({})
    }
    setIsEditMode(prev => !prev)
  }

  // Real-time parse with debounce
  const handleCodeInput = useCallback((value: string) => {
    // Immediately update textarea
    setEditingFiles(prev => ({ ...prev, [selectedFile]: value }))

    if (!onCodeChange) return

    if (debounceRef.current[selectedFile]) {
      clearTimeout(debounceRef.current[selectedFile])
    }

    debounceRef.current[selectedFile] = setTimeout(() => {
      // Match file to a page
      const fileBase = selectedFile
        .replace("app/views/", "").replace(".php", "")
        .replace("public/assets/css/", "").replace(".css", "")
        .replace("public/assets/js/", "").replace(".js", "")

      const page = pages.find(p => slugify(p.name) === fileBase)
      if (!page) return

      const pageComponents = components.filter(c => (c.page_id || "home") === page.id)
      const otherComponents = components.filter(c => (c.page_id || "home") !== page.id)

      let updatedPageComponents: ComponentData[]

      if (selectedFile.endsWith(".php")) {
        updatedPageComponents = parsePHPToComponents(value, page.id, pageComponents)
      } else if (selectedFile.endsWith(".css")) {
        updatedPageComponents = applyCSSToComponents(value, pageComponents)
      } else {
        // JS and other files: preserve components unchanged
        updatedPageComponents = pageComponents
      }

      onCodeChange([...otherComponents, ...updatedPageComponents])
    }, 600)
  }, [selectedFile, components, pages, onCodeChange])

  const fileStructure = useMemo(
    () => buildTreeFromPaths(Object.keys(fileContents)),
    [fileContents]
  )

  const hasEdits = Object.keys(editingFiles).length > 0

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.path} className="group">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-muted/40 transition-colors ${
            selectedFile === node.path ? "bg-muted text-white" : "text-muted-foreground"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() =>
            node.type === "folder"
              ? setExpandedFolders(prev => {
                  const next = new Set(prev)
                  next.has(node.path) ? next.delete(node.path) : next.add(node.path)
                  return next
                })
              : setSelectedFile(node.path)
          }
        >
          {node.type === "folder" ? (
            expandedFolders.has(node.path)
              ? <ChevronDown className="w-3 h-3 shrink-0" />
              : <ChevronRight className="w-3 h-3 shrink-0" />
          ) : node.path.endsWith(".php") ? <PHPIcon />
            : node.path.endsWith(".css") ? <CSSIcon />
            : node.path.endsWith(".js") ? <JSIcon />
            : <File className="w-3 h-3 shrink-0" />
          }
          <span className="text-sm truncate flex-1">{node.name}</span>
          {/* Yellow dot for files with pending edits */}
          {editingFiles[node.path] !== undefined && (
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" title="Modified" />
          )}
        </div>
        {node.type === "folder" && expandedFolders.has(node.path) && node.children &&
          renderTree(node.children, depth + 1)
        }
      </div>
    ))

  return (
    <div className="w-full h-full flex gap-4 p-4 bg-background">
      {/* File Explorer */}
      <div className="w-64 border rounded-md flex flex-col bg-[#181818] h-full overflow-hidden shrink-0">
        <div className="px-4 py-3 border-b border-[#2b2b2b] text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Explorer</span>
          {hasEdits && <span className="text-[10px] text-yellow-400 font-normal normal-case">● editing</span>}
        </div>
        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
          {renderTree(fileStructure)}
        </div>
      </div>

      {/* Code Panel */}
      <div className="flex-1 border rounded-md overflow-hidden flex flex-col bg-[#1f1f1f] h-full min-w-0">
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-[#2b2b2b] bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-muted-foreground truncate">{selectedFile}</span>
            {editingFiles[selectedFile] !== undefined && (
              <span className="text-[10px] text-yellow-400 shrink-0">● modified</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onCodeChange && (
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 px-2 gap-1 text-xs transition-colors ${
                  isEditMode
                    ? "text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20"
                    : "text-muted-foreground hover:text-white"
                }`}
                onClick={handleToggleEditMode}
                title={isEditMode ? "Switch to preview mode" : "Switch to edit mode"}
              >
                {isEditMode
                  ? <><Eye className="h-3 w-3" />Preview</>
                  : <><Edit3 className="h-3 w-3" />Edit</>
                }
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
              onClick={() => { navigator.clipboard.writeText(currentContent); toast.success("Copied!") }}
              title="Copy to clipboard"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Edit mode hint banner */}
        {isEditMode && (
          <div className="px-4 py-1.5 bg-blue-500/10 border-b border-blue-500/20 text-[11px] text-blue-400 flex items-center gap-2 shrink-0">
            <Edit3 className="w-3 h-3 shrink-0" />
            {selectedFile.endsWith(".php") ? (
              <>Edit HTML tags inside <code className="bg-blue-500/20 px-1 rounded mx-0.5">canvas-container</code> — canvas updates automatically.</>
            ) : selectedFile.endsWith(".css") ? (
              <>Edit CSS class rules — component styles sync to canvas automatically.</>
            ) : (
              <>JS changes are preserved but don't sync to canvas components.</>
            )}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto bg-[#1f1f1f] relative">
          {isEditMode ? (
            <textarea
              className="w-full h-full bg-[#1f1f1f] text-[#d4d4d4] font-mono text-[13px] leading-relaxed p-6 resize-none outline-none border-none"
              value={currentContent}
              onChange={e => handleCodeInput(e.target.value)}
              spellCheck={false}
              autoFocus
            />
          ) : (
            <SyntaxHighlighter
              language={
                selectedFile.endsWith(".css") ? "css"
                : selectedFile.endsWith(".js") ? "javascript"
                : "php"
              }
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
              {currentContent || "// No content"}
            </SyntaxHighlighter>
          )}
        </div>
      </div>
    </div>
  )
}