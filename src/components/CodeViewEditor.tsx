"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import type { ComponentData } from "../App"
import { Button } from "./ui/button"
import {
  Copy,
  Download,
  ChevronRight,
  ChevronDown,
  File,
  FilePlus,
  FolderPlus,
  Trash2,
  Save,
  Edit,
} from "lucide-react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism"

interface CodeViewEditorProps {
  components: ComponentData[]
  projectName?: string
  userProjectConfig?: {
    supabaseUrl: string
    supabaseKey: string
  }
  onCodeChange?: (newComponents: ComponentData[]) => void
}

interface FileNode {
  name: string
  type: "file" | "folder"
  path: string
  children?: FileNode[]
}

const AUTO_GENERATED_FILES = new Set([
  "public/index.php",
  "app/views/layout.php",
  "app/views/generated-components.php",
  "public/assets/css/styles.css",
  "public/assets/js/app.js",
  "config/database.php",
  "database/schema.sql",
  "README.md",
])

const PHPIcon = () => <span className="text-[10px] font-bold text-[#8892bf]">PHP</span>
const CSSIcon = () => <span className="text-[10px] font-bold text-[#3fa9f5]">CSS</span>
const JSIcon = () => <span className="text-[10px] font-bold text-[#f7df1e]">JS</span>
const SQLIcon = () => <span className="text-[10px] font-bold text-[#f29111]">SQL</span>
const MarkdownIcon = () => <span className="text-[10px] font-bold text-[#9ca3af]">MD</span>

const camelToKebab = (value: string): string => value.replace(/([A-Z])/g, "-$1").toLowerCase()

const isUnitless = (key: string) => ["opacity", "zIndex", "fontWeight", "lineHeight", "flex", "order"].includes(key)

const toCssInline = (style: Record<string, any> = {}): string =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${camelToKebab(key)}: ${typeof value === "number" && !isUnitless(key) ? `${value}px` : value}`)
    .join("; ")

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field"

const walkComponents = (components: ComponentData[], callback: (component: ComponentData) => void) => {
  components.forEach((component) => {
    callback(component)
    if (component.children?.length) {
      walkComponents(component.children, callback)
    }
  })
}

const renderComponentToPHP = (component: ComponentData, depth = 0, nested = false): string => {
  const indent = "  ".repeat(depth)
  const position = component.position ?? { x: 0, y: 0 }
  const styles = {
    ...(nested
      ? {}
      : {
          position: "absolute",
          left: `${position.x}px`,
          top: `${position.y}px`,
        }),
    ...(component.style ?? {}),
  }
  const styleAttr = toCssInline(styles)
  const attrs: string[] = styleAttr ? [`style="${styleAttr}"`] : []
  const props = component.props ?? {}

  const childOutput = (component.children ?? [])
    .map((child) => renderComponentToPHP(child, depth + 1, true))
    .join("\n")

  switch (component.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(props.level || 1)))
      return `${indent}<h${level} ${attrs.join(" ")}>${props.content || props.text || "Heading"}</h${level}>`
    }
    case "text":
      return `${indent}<p ${attrs.join(" ")}>${props.content || props.text || "Text"}</p>`
    case "button":
      return `${indent}<button type=\"button\" ${attrs.join(" ")}>${props.content || props.text || props.label || "Button"}</button>`
    case "image":
      return `${indent}<img src=\"${props.src || "https://via.placeholder.com/320x180"}\" alt=\"${props.alt || "Image"}\" ${attrs.join(" ")} />`
    case "input":
      return `${indent}<input type=\"${props.type || "text"}\" name=\"${props.name || slugify(props.placeholder || "input")}_${component.id.slice(0, 6)}\" placeholder=\"${props.placeholder || ""}\" ${attrs.join(" ")} />`
    case "textarea":
      return `${indent}<textarea name=\"${props.name || `message_${component.id.slice(0, 6)}`}\" ${attrs.join(" ")}>${props.value || props.content || ""}</textarea>`
    case "link":
      return `${indent}<a href=\"${props.href || "#"}\" ${attrs.join(" ")}>${props.content || props.text || "Link"}</a>`
    case "form":
      return `${indent}<form method=\"${props.method || "POST"}\" action=\"${props.action || ""}\" ${attrs.join(" ")}>
${childOutput}
${indent}</form>`
    case "list": {
      const tag = props.ordered ? "ol" : "ul"
      return `${indent}<${tag} ${attrs.join(" ")}>
${childOutput}
${indent}</${tag}>`
    }
    case "listItem":
      return `${indent}<li ${attrs.join(" ")}>${props.content || props.text || "List Item"}</li>`
    case "section":
    case "container":
    case "group":
    case "div":
    default:
      return `${indent}<div ${attrs.join(" ")}>
${childOutput || `${indent}  ${props.content || props.text || component.type}`}
${indent}</div>`
  }
}

const generateComponentPHP = (components: ComponentData[]): string => {
  const body = components.length
    ? components.map((component) => renderComponentToPHP(component, 1)).join("\n")
    : "  <div>No components in the design panel yet.</div>"

  return `<?php\n// Auto-generated from the design panel.\n?>\n<div class=\"canvas-container\">\n${body}\n</div>\n`
}

const generateLayoutPHP = (projectName: string): string => `<?php
// Shared layout file for ${projectName}
?><!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
  <link rel="stylesheet" href="assets/css/styles.css" />
</head>
<body>
  <?php include __DIR__ . '/generated-components.php'; ?>
  <script src="assets/js/app.js"></script>
</body>
</html>
`

const generateIndexPHP = (): string => `<?php
require_once __DIR__ . '/../config/database.php';
include __DIR__ . '/../app/views/layout.php';
`

const generateCSS = (components: ComponentData[]): string => {
  const classStyles: Record<string, string[]> = {}

  walkComponents(components, (component) => {
    const className = component.props?.className
    if (!className || !component.style) return

    if (!classStyles[className]) {
      classStyles[className] = []
    }

    Object.entries(component.style).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return
      const cssRule = `${camelToKebab(key)}: ${typeof value === "number" && !isUnitless(key) ? `${value}px` : value};`
      if (!classStyles[className].includes(cssRule)) {
        classStyles[className].push(cssRule)
      }
    })
  })

  const generatedClasses = Object.entries(classStyles)
    .map(([name, rules]) => `.${name} {\n${rules.map((rule) => `  ${rule}`).join("\n")}\n}`)
    .join("\n\n")

  return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f3f4f6;
}

.canvas-container {
  min-height: 100vh;
  position: relative;
  background: #ffffff;
}

${generatedClasses}
`
}

const generateJS = (): string => `document.addEventListener("DOMContentLoaded", () => {
  console.log("PHP project generated from design panel loaded.");

  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (form.getAttribute("data-preview") === "true") {
        event.preventDefault();
      }
    });
  });
});
`

const generateSchemaSQL = (components: ComponentData[]): string => {
  const formTables: string[] = []
  const usedTableNames = new Set<string>()

  walkComponents(components, (component) => {
    if (component.type !== "form") return

    const baseName = slugify(component.props?.name || component.props?.id || "form_submission")
    let tableName = `form_${baseName}`
    let counter = 1
    while (usedTableNames.has(tableName)) {
      tableName = `form_${baseName}_${counter++}`
    }
    usedTableNames.add(tableName)

    const fields = new Set<string>(["id INT AUTO_INCREMENT PRIMARY KEY", "submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"])

    walkComponents(component.children || [], (child) => {
      if (!["input", "textarea", "select"].includes(child.type)) return
      const fieldName = slugify(child.props?.name || child.props?.placeholder || `${child.type}_${child.id.slice(0, 6)}`)
      fields.add(`${fieldName} TEXT NULL`)
    })

    formTables.push(`CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${Array.from(fields).join(",\n  ")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`)
  })

  return `-- Auto-generated schema based on design panel components
CREATE TABLE IF NOT EXISTS generated_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_name VARCHAR(255) NOT NULL,
  page_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

${formTables.join("\n\n") || "-- No form components detected; add forms to generate submission tables."}
`
}

const generateDatabaseConfigPHP = (): string => `<?php
$DB_HOST = getenv('DB_HOST') ?: '127.0.0.1';
$DB_NAME = getenv('DB_NAME') ?: 'builder_output';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $exception) {
    die("Database connection failed: " . $exception->getMessage());
}
`

const buildGeneratedFiles = (components: ComponentData[], projectName: string): Record<string, string> => ({
  "public/index.php": generateIndexPHP(),
  "app/views/layout.php": generateLayoutPHP(projectName),
  "app/views/generated-components.php": generateComponentPHP(components),
  "public/assets/css/styles.css": generateCSS(components),
  "public/assets/js/app.js": generateJS(),
  "config/database.php": generateDatabaseConfigPHP(),
  "database/schema.sql": generateSchemaSQL(components),
  "README.md": `# ${projectName}\n\nGenerated PHP project synchronized with your drag-and-drop design panel.\n\n## Folder structure\n- public/index.php\n- app/views/layout.php\n- app/views/generated-components.php\n- public/assets/css/styles.css\n- public/assets/js/app.js\n- config/database.php\n- database/schema.sql\n`,
})

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

  const sortNodes = (nodes: FileNode[]): FileNode[] =>
    [...nodes]
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === "folder" ? -1 : 1
      })
      .map((node) => ({ ...node, children: node.children ? sortNodes(node.children) : undefined }))

  return sortNodes(root.children ?? [])
}

export function CodeViewEditor({ components, projectName = "php-builder-project" }: CodeViewEditorProps) {
  const [selectedFile, setSelectedFile] = useState<string>("public/index.php")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["public", "app", "app/views", "public/assets"]))
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")

  useEffect(() => {
    const generated = buildGeneratedFiles(components, projectName)

    setFileContents((previous) => {
      const next = { ...previous }
      Object.entries(generated).forEach(([path, content]) => {
        next[path] = content
      })
      return next
    })

    if (!selectedFile) {
      setSelectedFile("public/index.php")
    }
  }, [components, projectName, selectedFile])

  const fileStructure = useMemo(() => buildTreeFromPaths(Object.keys(fileContents)), [fileContents])

  const toggleFolder = (path: string) => {
    setExpandedFolders((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const getBaseDirectory = () => {
    if (!selectedFile) return ""
    const selected = fileStructure.flatMap((node) => node.path)
    if (selected.includes(selectedFile) && selectedFile.includes(".")) {
      const parts = selectedFile.split("/")
      parts.pop()
      return parts.join("/")
    }
    return selectedFile
  }

  const addNewFile = () => {
    if (!newFileName.trim()) return toast.error("Please provide a file name")
    const baseDir = getBaseDirectory()
    const path = [baseDir, newFileName.trim()].filter(Boolean).join("/")
    if (fileContents[path]) return toast.error("File already exists")

    setFileContents((previous) => ({ ...previous, [path]: "" }))
    setSelectedFile(path)
    setShowNewFileDialog(false)
    setNewFileName("")
    toast.success("File created")
  }

  const addNewFolder = () => {
    if (!newFolderName.trim()) return toast.error("Please provide a folder name")
    const baseDir = getBaseDirectory()
    const path = [baseDir, newFolderName.trim()].filter(Boolean).join("/")
    const placeholder = `${path}/.gitkeep`
    if (fileContents[placeholder]) return toast.error("Folder already exists")

    setFileContents((previous) => ({ ...previous, [placeholder]: "" }))
    setExpandedFolders((previous) => new Set(previous).add(path))
    setShowNewFolderDialog(false)
    setNewFolderName("")
    toast.success("Folder created")
  }

  const deletePath = (path: string) => {
    const isAutoGenerated = AUTO_GENERATED_FILES.has(path)
    if (isAutoGenerated) return toast.error("Auto-generated files cannot be deleted")

    setFileContents((previous) => {
      const next: Record<string, string> = {}
      Object.entries(previous).forEach(([filePath, content]) => {
        if (filePath === path || filePath.startsWith(`${path}/`)) return
        next[filePath] = content
      })
      return next
    })

    if (selectedFile === path || selectedFile.startsWith(`${path}/`)) {
      setSelectedFile("public/index.php")
    }

    toast.success("Deleted")
  }

  const handleSave = () => {
    setFileContents((previous) => ({ ...previous, [selectedFile]: editContent }))
    setIsEditing(false)
    toast.success("File saved")
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(fileContents[selectedFile] || "")
      toast.success("Copied")
    } catch {
      toast.error("Clipboard unavailable")
    }
  }

  const downloadProject = () => {
    const exportText = Object.entries(fileContents)
      .map(([path, content]) => `FILE: ${path}\n${"=".repeat(40)}\n${content}`)
      .join("\n\n")

    const blob = new Blob([exportText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${projectName}-php-project.txt`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("Project downloaded")
  }

  const getFileIcon = (path: string) => {
    if (path.endsWith(".php")) return <PHPIcon />
    if (path.endsWith(".css")) return <CSSIcon />
    if (path.endsWith(".js")) return <JSIcon />
    if (path.endsWith(".sql")) return <SQLIcon />
    if (path.endsWith(".md")) return <MarkdownIcon />
    return <File className="w-3.5 h-3.5 text-muted-foreground" />
  }

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      if (node.name === ".gitkeep") return null

      if (node.type === "folder") {
        return (
          <div key={node.path}>
            <div
              className="flex items-center gap-1 px-2 py-1 hover:bg-muted/40 rounded cursor-pointer"
              style={{ paddingLeft: `${depth * 14 + 6}px` }}
              onClick={() => {
                setSelectedFile(node.path)
                toggleFolder(node.path)
              }}
            >
              {expandedFolders.has(node.path) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="text-sm">{node.name}</span>
              <button className="ml-auto opacity-0 group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); deletePath(node.path) }}>
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
            {expandedFolders.has(node.path) && node.children ? renderTree(node.children, depth + 1) : null}
          </div>
        )
      }

      return (
        <div
          key={node.path}
          className={`group flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted/40 ${selectedFile === node.path ? "bg-muted" : ""}`}
          style={{ paddingLeft: `${depth * 14 + 20}px` }}
          onClick={() => {
            setSelectedFile(node.path)
            setIsEditing(false)
          }}
        >
          {getFileIcon(node.path)}
          <span className="text-sm truncate flex-1">{node.name}</span>
          {!AUTO_GENERATED_FILES.has(node.path) && (
            <button
              className="opacity-0 group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation()
                deletePath(node.path)
              }}
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          )}
        </div>
      )
    })

  const getLanguage = (path: string) => {
    if (path.endsWith(".php")) return "php"
    if (path.endsWith(".css")) return "css"
    if (path.endsWith(".js")) return "javascript"
    if (path.endsWith(".sql")) return "sql"
    if (path.endsWith(".md")) return "markdown"
    return "text"
  }

  return (
    <div className="w-full h-full flex gap-4">
      <div className="w-72 border border-border rounded-md p-2 flex flex-col">
        <div className="px-2 py-2 border-b border-border mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">PHP Explorer</span>
          <div className="flex gap-1">
            <button onClick={() => setShowNewFileDialog(true)} className="p-1 hover:bg-muted rounded" title="New File">
              <FilePlus className="w-4 h-4" />
            </button>
            <button onClick={() => setShowNewFolderDialog(true)} className="p-1 hover:bg-muted rounded" title="New Folder">
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showNewFileDialog && (
          <div className="mb-2 p-2 rounded bg-muted">
            <input
              className="w-full border rounded px-2 py-1 text-sm bg-background"
              value={newFileName}
              placeholder="filename.php"
              onChange={(event) => setNewFileName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addNewFile()}
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={addNewFile}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewFileDialog(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {showNewFolderDialog && (
          <div className="mb-2 p-2 rounded bg-muted">
            <input
              className="w-full border rounded px-2 py-1 text-sm bg-background"
              value={newFolderName}
              placeholder="folder-name"
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addNewFolder()}
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={addNewFolder}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="overflow-auto flex-1">{renderTree(fileStructure)}</div>
      </div>

      <div className="flex-1 border border-border rounded-md overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{selectedFile}</span>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleSave}><Save className="w-4 h-4 mr-1" />Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => { setIsEditing(true); setEditContent(fileContents[selectedFile] || "") }}>
                <Edit className="w-4 h-4 mr-1" />Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={copyCode}><Copy className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" onClick={downloadProject}><Download className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isEditing ? (
            <textarea
              className="w-full h-full p-4 bg-[#282c34] text-white font-mono text-sm resize-none outline-none"
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              spellCheck={false}
            />
          ) : (
            <SyntaxHighlighter
              language={getLanguage(selectedFile)}
              style={okaidia}
              showLineNumbers
              customStyle={{ margin: 0, minHeight: "100%", backgroundColor: "#282c34" }}
            >
              {fileContents[selectedFile] || "// Empty file"}
            </SyntaxHighlighter>
          )}
        </div>
      </div>
    </div>
  )
}
