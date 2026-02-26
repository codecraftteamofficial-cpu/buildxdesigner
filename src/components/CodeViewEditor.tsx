"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "./ui/button"
import {
  Copy,
  ChevronRight,
  ChevronDown,
  File,
} from "lucide-react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism"
// Import the shared logic
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
};

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
  return (root.children ?? []).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1))
}

export function CodeViewEditor({ components, projectName = "php-builder", pages, activePageId }: CodeViewEditorProps) {
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["app", "app/views", "public", "public/assets", "public/assets/css", "public/assets/js"]))

  // Use the SAME shared generator as the Modal
  const fileContents = useMemo(() => 
    generateProjectFiles(components, pages, projectName), 
    [components, pages, projectName]
  );

  // Auto-select the file for the currently active page in the designer
  useEffect(() => {
    const activePage = pages.find(p => p.id === activePageId) || pages[0];
    const defaultFile = `app/views/${slugify(activePage.name)}.php`;
    if (!selectedFile || !fileContents[selectedFile]) {
      setSelectedFile(defaultFile);
    }
  }, [fileContents, activePageId, pages, selectedFile]);

  const fileStructure = useMemo(() => buildTreeFromPaths(Object.keys(fileContents)), [fileContents])

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.path} className="group">
        <div 
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted/40 transition-colors ${selectedFile === node.path ? "bg-muted text-white" : "text-muted-foreground"}`} 
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => node.type === "folder" ? setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(node.path) ? next.delete(node.path) : next.add(node.path);
            return next;
          }) : setSelectedFile(node.path)}
        >
          {node.type === "folder" ? (expandedFolders.has(node.path) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : (
            node.path.endsWith(".php") ? <PHPIcon /> : node.path.endsWith(".css") ? <CSSIcon /> : node.path.endsWith(".js") ? <JSIcon /> : <File className="w-3 h-3" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {node.type === "folder" && expandedFolders.has(node.path) && node.children && renderTree(node.children, depth + 1)}
      </div>
    ))

  return (
    <div className="w-full h-full flex gap-4 p-4 bg-background">
      <div className="w-64 border rounded-md flex flex-col bg-[#181818] h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2b2b2b] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Explorer</div>
        <div className="flex-1 overflow-auto p-2 custom-scrollbar">{renderTree(fileStructure)}</div>
      </div>
      
      <div className="flex-1 border rounded-md overflow-hidden flex flex-col bg-[#1f1f1f] h-full">
        <div className="px-4 py-2 border-b border-[#2b2b2b] bg-[#181818] flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">{selectedFile}</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { navigator.clipboard.writeText(fileContents[selectedFile]); toast.success("Copied!"); }}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-[#1f1f1f]">
          <SyntaxHighlighter 
            language={selectedFile.endsWith(".css") ? "css" : selectedFile.endsWith(".js") ? "javascript" : "php"} 
            style={customSyntaxTheme} 
            showLineNumbers
            customStyle={{ margin: 0, padding: "24px", backgroundColor: "#1f1f1f", fontSize: "13px", lineHeight: "1.6", minHeight: "100%" }}
          >
            {fileContents[selectedFile] || "// No content"}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
}