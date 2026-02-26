"use client"

import React, { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { 
  Copy, 
  Download, 
  FileCode, 
  ChevronRight, 
  ChevronDown,
  FolderOpen,
  Folder,
  BarChart3,
  AlignLeft,
  Files,
  Cpu
} from "lucide-react"
import { ComponentData } from "../App"
import { toast } from "sonner"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism"
// Import the shared logic
import { generateProjectFiles, slugify } from "../lib/code-generator"

interface CodeExportModalProps {
  components: ComponentData[]
  projectName?: string
  pages: { id: string; name: string; path: string }[]
  onClose: () => void
}

interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: FileNode[]
}

const buildFileTree = (paths: string[]): FileNode[] => {
  const root: FileNode[] = []
  paths.forEach(path => {
    const parts = path.split("/")
    let currentLevel = root
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      let existingNode = currentLevel.find(node => node.name === part)
      if (!existingNode) {
        existingNode = { 
          name: part, 
          path: parts.slice(0, i + 1).join("/"), 
          type: isFile ? "file" : "folder", 
          children: isFile ? undefined : [] 
        }
        currentLevel.push(existingNode)
      }
      if (existingNode.children) currentLevel = existingNode.children
    })
  })
  return root
}

export function CodeExportModal({ components, projectName = "leumar", pages, onClose }: CodeExportModalProps) {
  const [selectedFile, setSelectedFile] = useState<string>("public/index.php")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["app", "app/views", "public", "public/assets", "public/assets/css"]))

  // Use the shared generator ONLY - do not redeclare this variable later
  const getFiles = useMemo(() => 
    generateProjectFiles(components, pages, projectName), 
    [components, pages, projectName]
  );

  const downloadAll = async () => {
    try {
      const zip = new JSZip()
      Object.entries(getFiles).forEach(([path, content]) => { 
        zip.file(path, content) 
      })
      const blob = await zip.generateAsync({ type: "blob" })
      saveAs(blob, `${slugify(projectName)}_export.zip`)
      toast.success("Project bundle downloaded!")
    } catch (error) {
      toast.error("Failed to create zip")
    }
  }

  const copyEntireProject = async () => {
    const fullText = Object.entries(getFiles)
      .map(([path, content]) => `--- FILE: ${path} ---\n${content}\n`)
      .join("\n")
    try {
      await navigator.clipboard.writeText(fullText)
      toast.success("Entire project copied to clipboard!")
    } catch {
      toast.error("Failed to copy project")
    }
  }

  const fileTree = useMemo(() => buildFileTree(Object.keys(getFiles)), [getFiles])

  const stats = useMemo(() => {
    const totalFiles = Object.keys(getFiles).length
    const totalLines = Object.values(getFiles).reduce((sum, content) => sum + content.split('\n').length, 0)
    return { totalFiles, totalLines }
  }, [getFiles])

  const frameworkLabel = useMemo(() => {
    const ext = selectedFile.split('.').pop()
    switch (ext) {
      case 'php': return { name: 'PHP Engine', color: 'text-[#8892bf]' }
      case 'css': return { name: 'CSS3 Styles', color: 'text-[#38bdf8]' }
      case 'js': return { name: 'JavaScript ES6', color: 'text-[#facc15]' }
      case 'sql': return { name: 'PostgreSQL', color: 'text-[#336791]' }
      default: return { name: 'Plain Text', color: 'text-white/60' }
    }
  }, [selectedFile])

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1)).map(node => {
      const isExpanded = expandedFolders.has(node.path)
      const isSelected = selectedFile === node.path

      return (
        <div key={node.path}>
          <div 
            onClick={() => {
              if (node.type === "folder") {
                const next = new Set(expandedFolders)
                next.has(node.path) ? next.delete(node.path) : next.add(node.path)
                setExpandedFolders(next)
              } else {
                setSelectedFile(node.path)
              }
            }}
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors text-sm mb-0.5 ${
              isSelected ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {node.type === "folder" ? (
              <>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {isExpanded ? <FolderOpen className="w-4 h-4 text-blue-400/80" /> : <Folder className="w-4 h-4 text-blue-400/80" />}
              </>
            ) : (
              <FileCode className={`w-4 h-4 ${node.path.endsWith('.php') ? 'text-blue-400' : node.path.endsWith('.css') ? 'text-blue-300' : 'text-yellow-400'}`} />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {node.type === "folder" && isExpanded && node.children && renderTree(node.children, depth + 1)}
        </div>
      )
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden border-[#333] shadow-2xl !opacity-100 text-white backdrop-blur-none"
        style={{ backgroundColor: "#1e1e1e" }}
      >
        <DialogHeader className="sr-only">
            <DialogTitle>Export Code</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#252526] shrink-0" style={{ backgroundColor: "#252526" }}>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 px-2 py-0.5 rounded text-white font-bold text-[10px]">BUILDX</div>
            <h2 className="text-sm font-medium text-gray-200 uppercase tracking-widest">Export Project: {projectName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#333]" onClick={copyEntireProject}>
              <Files className="w-4 h-4 mr-2" /> Copy Project
            </Button>
            <Button size="sm" onClick={downloadAll} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform active:scale-95">
              <Download className="w-4 h-4 mr-2" /> Download .zip
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
          <div className="w-64 border-r border-[#333] bg-[#181818] flex flex-col shrink-0 overflow-y-auto" style={{ backgroundColor: "#181818" }}>
            <div className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-2">Explorer</div>
            <div className="flex-1 px-1">{renderTree(fileTree)}</div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] text-xs text-gray-300 border-b border-[#1e1e1e] justify-between" style={{ backgroundColor: "#2d2d2d" }}>
              <div className="flex items-center gap-2">
                <FileCode className={`w-3.5 h-3.5 ${selectedFile.endsWith('.php') ? 'text-blue-400' : 'text-blue-300'}`} />
                <span className="font-mono">{selectedFile}</span>
              </div>
              <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-white/10" onClick={() => { navigator.clipboard.writeText(getFiles[selectedFile]); toast.success("File copied!"); }}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto" style={{ backgroundColor: "#1e1e1e" }}>
              <SyntaxHighlighter
                language={selectedFile.endsWith('.css') ? 'css' : selectedFile.endsWith('.js') ? 'javascript' : selectedFile.endsWith('.sql') ? 'sql' : 'php'}
                style={okaidia}
                showLineNumbers
                customStyle={{ 
                  margin: 0, 
                  padding: '24px', 
                  backgroundColor: '#1e1e1e', 
                  fontSize: "13px", 
                  lineHeight: "1.6", 
                  minHeight: "100%",
                  width: '100%' 
                }}
              >
                {getFiles[selectedFile] || "// No content"}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>

        <div className="h-7 bg-[#007acc] text-white flex items-center px-4 justify-between shrink-0 text-[11px] font-medium" style={{ backgroundColor: "#007acc" }}>
          <div className="flex items-center h-full">
            <div className="flex items-center gap-1.5 cursor-default hover:bg-white/10 px-3 h-full border-r border-white/10">
              <BarChart3 className="w-3 h-3" />
              <span>{stats.totalFiles} Files</span>
            </div>
            <div className="flex items-center gap-1.5 cursor-default hover:bg-white/10 px-3 h-full border-r border-white/10">
              <AlignLeft className="w-3 h-3" />
              <span>{stats.totalLines} Lines</span>
            </div>
            <div className="flex items-center gap-1.5 cursor-default hover:bg-white/10 px-3 h-full">
              <Cpu className={`w-3 h-3 ${frameworkLabel.color}`} />
              <span className={frameworkLabel.color}>{frameworkLabel.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 px-3">
            <span className="opacity-90">UTF-8</span>
            <span className="opacity-90 uppercase font-bold">{selectedFile.split('.').pop()}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}