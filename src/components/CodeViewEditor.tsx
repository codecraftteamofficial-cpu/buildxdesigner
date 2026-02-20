"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import type { ComponentData } from "../App"
import { Button } from "./ui/button"
import { Copy, Download, ChevronRight, ChevronDown, File, FilePlus, FolderPlus, Trash2, Save, Edit } from "lucide-react"
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
  content?: string
  children?: FileNode[]
  icon?: React.ReactNode
}

/* --- Simple file type icons --- */
const HTMLIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#e34c26" />
  </svg>
)
const CSSIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#264de4" />
  </svg>
)
const JSIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#f7df1e" />
  </svg>
)
const JSONIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#d13d07" />
  </svg>
)
const MarkdownIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#2c2c2c" />
  </svg>
)

// Helper function to convert camelCase to kebab-case
const camelToKebab = (str: string): string => {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

// Helper function to extract and format CSS properties
const extractStyles = (style: Record<string, any> = {}): string => {
  const cssProperties: Record<string, string> = {}

  Object.entries(style).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      const kebabKey = camelToKebab(key)

      // Handle numeric values that need px
      if (typeof value === 'number' && !['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'order'].includes(key)) {
        cssProperties[kebabKey] = `${value}px`
      } else {
        cssProperties[kebabKey] = String(value)
      }
    }
  })

  return Object.entries(cssProperties)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ')
}

// Generate exact HTML from canvas components - IMPROVED VERSION
const generateHTMLFromComponents = (components: ComponentData[]): string => {
  const renderComponent = (comp: ComponentData, isNested = false, depth = 0): string => {
    const position = comp.position || { x: 0, y: 0 }
    const style = comp.style || {}
    const props = comp.props || {}

    // Build complete style object with positioning
    const completeStyle: Record<string, any> = {
      ...(isNested ? {} : {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`
      }),
      ...style
    }

    const styleStr = extractStyles(completeStyle)
    const indent = '  '.repeat(depth + 2)

    let content = ''
    let tag = 'div'
    let attributes: string[] = []

    switch (comp.type) {
      case 'text':
        tag = 'p'
        content = props.content || props.text || 'Text'
        break

      case 'heading':
        tag = `h${props.level || 1}`
        content = props.content || props.text || 'Heading'
        break

      case 'button':
        tag = 'button'
        content = props.content || props.text || props.label || 'Button'
        if (props.onClick) {
          attributes.push(`onclick="${props.onClick}"`)
        }
        break

      case 'image':
        tag = 'img'
        const imgSrc = props.src || props.url || 'https://via.placeholder.com/300x200'
        const imgAlt = props.alt || 'Image'
        attributes.push(`src="${imgSrc}"`)
        attributes.push(`alt="${imgAlt}"`)
        break

      case 'input':
        tag = 'input'
        const inputType = props.type || 'text'
        const placeholder = props.placeholder || ''
        attributes.push(`type="${inputType}"`)
        if (placeholder) {
          attributes.push(`placeholder="${placeholder}"`)
        }
        if (props.value) {
          attributes.push(`value="${props.value}"`)
        }
        if (props.name) {
          attributes.push(`name="${props.name}"`)
        }
        break

      case 'textarea':
        tag = 'textarea'
        content = props.value || props.content || ''
        if (props.placeholder) {
          attributes.push(`placeholder="${props.placeholder}"`)
        }
        if (props.rows) {
          attributes.push(`rows="${props.rows}"`)
        }
        if (props.cols) {
          attributes.push(`cols="${props.cols}"`)
        }
        break

      case 'link':
        tag = 'a'
        content = props.content || props.text || 'Link'
        if (props.href) {
          attributes.push(`href="${props.href}"`)
        }
        if (props.target) {
          attributes.push(`target="${props.target}"`)
        }
        break

      case 'container':
      case 'group':
      case 'div':
        tag = 'div'
        if (props.className) {
          attributes.push(`class="${props.className}"`)
        }
        // Handle children properly
        if (comp.children && comp.children.length > 0) {
          const childIndent = '  '.repeat(depth + 3)
          content = '\n' + comp.children.map(child =>
            childIndent + renderComponent(child, true, depth + 1)
          ).join('\n') + '\n' + indent
        } else {
          content = props.content || props.text || ''
        }
        break

      case 'section':
        tag = 'section'
        if (props.className) {
          attributes.push(`class="${props.className}"`)
        }
        if (comp.children && comp.children.length > 0) {
          const childIndent = '  '.repeat(depth + 3)
          content = '\n' + comp.children.map(child =>
            childIndent + renderComponent(child, true, depth + 1)
          ).join('\n') + '\n' + indent
        }
        break

      case 'form':
        tag = 'form'
        if (props.action) {
          attributes.push(`action="${props.action}"`)
        }
        if (props.method) {
          attributes.push(`method="${props.method}"`)
        }
        if (comp.children && comp.children.length > 0) {
          const childIndent = '  '.repeat(depth + 3)
          content = '\n' + comp.children.map(child =>
            childIndent + renderComponent(child, true, depth + 1)
          ).join('\n') + '\n' + indent
        }
        break

      case 'list':
        tag = props.ordered ? 'ol' : 'ul'
        if (comp.children && comp.children.length > 0) {
          const childIndent = '  '.repeat(depth + 3)
          content = '\n' + comp.children.map(child =>
            childIndent + renderComponent(child, true, depth + 1)
          ).join('\n') + '\n' + indent
        }
        break

      case 'listItem':
        tag = 'li'
        content = props.content || props.text || 'List Item'
        break

      case 'video':
        tag = 'video'
        if (props.src) {
          attributes.push(`src="${props.src}"`)
        }
        if (props.controls !== false) {
          attributes.push('controls')
        }
        if (props.autoplay) {
          attributes.push('autoplay')
        }
        if (props.loop) {
          attributes.push('loop')
        }
        break

      case 'audio':
        tag = 'audio'
        if (props.src) {
          attributes.push(`src="${props.src}"`)
        }
        if (props.controls !== false) {
          attributes.push('controls')
        }
        break

      case 'navbar':
      case 'header':
        tag = 'header'
        attributes.push(`class="navbar"`)
        if (comp.children && comp.children.length > 0) {
          const childIndent = '  '.repeat(depth + 3)
          content = '\n' + comp.children.map(child =>
            childIndent + renderComponent(child, true, depth + 1)
          ).join('\n') + '\n' + indent
        } else {
          // Default navbar structure if no children
          content = props.content || props.text || ''
        }
        break

      case 'footer':
        tag = 'footer'
        attributes.push(`class="footer"`)
        if (comp.children && comp.children.length > 0) {
          const childIndent = '  '.repeat(depth + 3)
          content = '\n' + comp.children.map(child =>
            childIndent + renderComponent(child, true, depth + 1)
          ).join('\n') + '\n' + indent
        } else {
          // Default footer structure if no children
          content = props.content || props.text || ''
        }
        break

      default:
        tag = 'div'
        if (comp.children && comp.children.length > 0) {
          const childIndent = '  '.repeat(depth + 3)
          content = '\n' + comp.children.map(child =>
            childIndent + renderComponent(child, true, depth + 1)
          ).join('\n') + '\n' + indent
        } else {
          content = props.content || props.text || comp.type
        }
    }

    // Build the attributes string
    const attrsStr = attributes.length > 0 ? ' ' + attributes.join(' ') : ''

    // Self-closing tags
    if (['img', 'input', 'br', 'hr'].includes(tag)) {
      return `<${tag}${attrsStr} style="${styleStr}" />`
    }

    return `<${tag}${attrsStr} style="${styleStr}">${content}</${tag}>`
  }

  const componentsHTML = components.map(comp => '    ' + renderComponent(comp, false, 0)).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Project</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div class="canvas-container">
${componentsHTML}
  </div>
  <script src="js/main.js"></script>
</body>
</html>`
}

// Generate CSS from components - IMPROVED VERSION
const generateCSSFromComponents = (components: ComponentData[]): string => {
  // Collect all unique class names and their styles
  const classStyles: Record<string, string[]> = {}

  const extractComponentStyles = (comp: ComponentData): void => {
    // Extract class-based styles
    if (comp.props?.className) {
      const className = comp.props.className
      if (!classStyles[className]) {
        classStyles[className] = []
      }

      // Add component-specific styles
      if (comp.style) {
        Object.entries(comp.style).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            const kebabKey = camelToKebab(key)
            let cssValue = value

            if (typeof value === 'number' && !['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'order'].includes(key)) {
              cssValue = `${value}px`
            }

            const styleRule = `${kebabKey}: ${cssValue};`
            if (!classStyles[className].includes(styleRule)) {
              classStyles[className].push(styleRule)
            }
          }
        })
      }
    }

    // Recursively process children
    if (comp.children) {
      comp.children.forEach(child => extractComponentStyles(child))
    }
  }

  // Extract styles from all components
  components.forEach(comp => extractComponentStyles(comp))

  // Generate class-based CSS
  let additionalStyles = ''
  Object.entries(classStyles).forEach(([className, styles]) => {
    if (styles.length > 0) {
      additionalStyles += `.${className} {\n`
      styles.forEach(style => {
        additionalStyles += `  ${style}\n`
      })
      additionalStyles += `}\n\n`
    }
  })

  return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f5;
  overflow-x: hidden;
}

.canvas-container {
  position: relative;
  min-height: 100vh;
  background-color: white;
}

/* Navbar Styles */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.navbar nav {
  display: flex;
  gap: 2rem;
}

.navbar a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.2s;
}

.navbar a:hover {
  color: #0066cc;
}

/* Footer Styles */
.footer {
  padding: 2rem;
  background-color: #f8f9fa;
  border-top: 1px solid #e5e5e5;
  text-align: center;
}

button {
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background-color: #0066cc;
  color: white;
  font-size: 1rem;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

img {
  display: block;
  object-fit: cover;
  max-width: 100%;
  height: auto;
}

input, textarea {
  font-family: inherit;
  font-size: inherit;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #0066cc;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 0.5rem;
}

p {
  line-height: 1.6;
  margin-bottom: 1rem;
}

a {
  text-decoration: none;
  color: #0066cc;
}

a:hover {
  text-decoration: underline;
}

ul, ol {
  list-style-position: inside;
  margin-bottom: 1rem;
}

section {
  padding: 2rem;
}

${additionalStyles}
/* Add your custom styles below */
`
}

// Generate JavaScript
const generateJavaScript = (): string => {
  return `// Main JavaScript file
console.log('Project loaded successfully!');

// Add your interactive code here
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');
  
  // Example: Add click handlers to buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      console.log('Button clicked:', e.target.textContent);
    });
  });
  
  // Example: Form handling
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      console.log('Form submitted');
      // Add your form handling logic here
    });
  });

  // Example: Navbar mobile menu toggle
  const navbarToggle = document.querySelector('.navbar-toggle');
  const navbarMenu = document.querySelector('.navbar-menu');
  
  if (navbarToggle && navbarMenu) {
    navbarToggle.addEventListener('click', () => {
      navbarMenu.classList.toggle('active');
    });
  }
});
`
}

export function CodeViewEditor({ components, projectName = "web-project" }: CodeViewEditorProps) {
  const [selectedFile, setSelectedFile] = useState<string>("index.html")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root", "css", "js"]))
  const [fileStructure, setFileStructure] = useState<FileNode[]>([])
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)

  // Initialize file structure and contents whenever components change
  useEffect(() => {
    const htmlContent = generateHTMLFromComponents(components)
    const cssContent = generateCSSFromComponents(components)
    const jsContent = generateJavaScript()

    const structure: FileNode[] = [
      {
        name: "index.html",
        type: "file",
        path: "index.html",
        content: htmlContent,
        icon: <HTMLIcon />
      },
      {
        name: "css",
        type: "folder",
        path: "css",
        children: [
          {
            name: "styles.css",
            type: "file",
            path: "css/styles.css",
            content: cssContent,
            icon: <CSSIcon />
          }
        ]
      },
      {
        name: "js",
        type: "folder",
        path: "js",
        children: [
          {
            name: "main.js",
            type: "file",
            path: "js/main.js",
            content: jsContent,
            icon: <JSIcon />
          }
        ]
      },
      {
        name: "README.md",
        type: "file",
        path: "README.md",
        content: `# ${projectName}\n\nGenerated from canvas design.\n\n## Getting Started\n\nOpen index.html in your browser to view the project.\n\n## Project Structure\n\n- index.html - Main HTML file\n- css/styles.css - Stylesheet\n- js/main.js - JavaScript functionality\n\n## Components\n\nThis project contains ${components.length} component(s).\n\n## Features\n\n- Responsive design\n- Clean, semantic HTML\n- Modern CSS styling\n- Interactive JavaScript\n`,
        icon: <MarkdownIcon />
      }
    ]

    setFileStructure(structure)

    const contents: Record<string, string> = {
      "index.html": htmlContent,
      "css/styles.css": cssContent,
      "js/main.js": jsContent,
      "README.md": `# ${projectName}\n\nGenerated from canvas design.\n\n## Getting Started\n\nOpen index.html in your browser to view the project.\n\n## Project Structure\n\n- index.html - Main HTML file\n- css/styles.css - Stylesheet\n- js/main.js - JavaScript functionality\n\n## Components\n\nThis project contains ${components.length} component(s).\n\n## Features\n\n- Responsive design\n- Clean, semantic HTML\n- Modern CSS styling\n- Interactive JavaScript\n`
    }

    setFileContents(contents)
  }, [components, projectName])

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    if (ext === "html") return <HTMLIcon />
    if (ext === "css") return <CSSIcon />
    if (ext === "js") return <JSIcon />
    if (ext === "json") return <JSONIcon />
    if (ext === "md") return <MarkdownIcon />
    return <File className="w-4 h-4 text-muted-foreground" />
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const addNewFile = () => {
    if (!newFileName.trim()) {
      toast.error("Please enter a filename")
      return
    }

    const newPath = selectedFile.includes('/')
      ? `${selectedFile.split('/')[0]}/${newFileName}`
      : newFileName

    if (fileContents[newPath]) {
      toast.error("File already exists")
      return
    }

    const newFile: FileNode = {
      name: newFileName,
      type: "file",
      path: newPath,
      content: "",
      icon: getFileIcon(newFileName)
    }

    setFileContents(prev => ({ ...prev, [newPath]: "" }))

    // Add to structure
    setFileStructure(prev => {
      const updated = [...prev]
      if (selectedFile.includes('/')) {
        const folder = selectedFile.split('/')[0]
        const folderNode = updated.find(n => n.path === folder)
        if (folderNode && folderNode.children) {
          folderNode.children.push(newFile)
        }
      } else {
        updated.push(newFile)
      }
      return updated
    })

    setNewFileName("")
    setShowNewFileDialog(false)
    setSelectedFile(newPath)
    toast.success("File created successfully")
  }

  const addNewFolder = () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name")
      return
    }

    if (fileStructure.find(n => n.path === newFolderName)) {
      toast.error("Folder already exists")
      return
    }

    const newFolder: FileNode = {
      name: newFolderName,
      type: "folder",
      path: newFolderName,
      children: []
    }

    setFileStructure(prev => [...prev, newFolder])
    setExpandedFolders(prev => new Set([...prev, newFolderName]))
    setNewFolderName("")
    setShowNewFolderDialog(false)
    toast.success("Folder created successfully")
  }

  const deleteFile = (path: string) => {
    setFileContents(prev => {
      const updated = { ...prev }
      delete updated[path]
      return updated
    })

    setFileStructure(prev => {
      const deleteFromStructure = (nodes: FileNode[]): FileNode[] => {
        return nodes.filter(node => {
          if (node.path === path) return false
          if (node.children) {
            node.children = deleteFromStructure(node.children)
          }
          return true
        })
      }
      return deleteFromStructure([...prev])
    })

    if (selectedFile === path) {
      setSelectedFile("index.html")
    }
    toast.success("File deleted")
  }

  const renderFileTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.path}>
        {node.type === "folder" ? (
          <>
            <div
              className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded transition-colors group"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              <div className="flex-1 flex items-center gap-1" onClick={() => toggleFolder(node.path)}>
                {expandedFolders.has(node.path) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground font-medium">{node.name}</span>
              </div>
            </div>
            {expandedFolders.has(node.path) && node.children && renderFileTree(node.children, depth + 1)}
          </>
        ) : (
          <div
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded transition-colors group ${selectedFile === node.path ? "bg-muted" : ""
              }`}
            style={{ paddingLeft: `${depth * 16 + 28}px` }}
            onClick={() => {
              setSelectedFile(node.path)
              setIsEditing(false)
            }}
          >
            <div className="flex-1 flex items-center gap-2">
              {node.icon}
              <span className="text-sm text-foreground">{node.name}</span>
            </div>
            {!["index.html", "css/styles.css", "js/main.js", "README.md"].includes(node.path) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Delete ${node.name}?`)) {
                    deleteFile(node.path)
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            )}
          </div>
        )}
      </div>
    ))

  const handleEdit = () => {
    setEditContent(fileContents[selectedFile] || "")
    setIsEditing(true)
  }

  const handleSave = () => {
    setFileContents(prev => ({ ...prev, [selectedFile]: editContent }))
    setIsEditing(false)
    toast.success("File saved")
  }

  const copyCode = async () => {
    const code = fileContents[selectedFile] || ""
    try {
      await navigator.clipboard.writeText(code)
      toast.success("Code copied to clipboard!")
    } catch {
      toast.error("Failed to copy code")
    }
  }

  const downloadAsZip = async () => {
    setIsDownloading(true)
    try {
      // Simple download implementation - creates data URLs for each file
      const zip = Object.entries(fileContents)
        .map(([path, content]) => `File: ${path}\n${'='.repeat(50)}\n${content}\n\n`)
        .join('\n')

      const blob = new Blob([zip], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName}-code.txt`
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Project files downloaded!")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Error downloading project")
    } finally {
      setIsDownloading(false)
    }
  }

  const getLang = (filename: string) => {
    if (filename.endsWith(".html")) return "html"
    if (filename.endsWith(".css")) return "css"
    if (filename.endsWith(".js")) return "javascript"
    if (filename.endsWith(".json")) return "json"
    if (filename.endsWith(".md")) return "markdown"
    return "text"
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="w-full h-full flex gap-4">
        {/* File Explorer - Left sidebar */}
        <div className="w-64 bg-card border border-border rounded-md p-2 overflow-auto flex flex-col">
          <div className="px-3 py-2 border-b border-border mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Explorer</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setShowNewFileDialog(true)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="New File"
              >
                <FilePlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowNewFolderDialog(true)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="New Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New File Dialog */}
          {showNewFileDialog && (
            <div className="mb-2 p-2 bg-muted rounded">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.ext"
                className="w-full px-2 py-1 text-sm border rounded mb-2 bg-background"
                onKeyDown={(e) => e.key === 'Enter' && addNewFile()}
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={addNewFile}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowNewFileDialog(false)
                  setNewFileName("")
                }}>Cancel</Button>
              </div>
            </div>
          )}

          {/* New Folder Dialog */}
          {showNewFolderDialog && (
            <div className="mb-2 p-2 bg-muted rounded">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="folder-name"
                className="w-full px-2 py-1 text-sm border rounded mb-2 bg-background"
                onKeyDown={(e) => e.key === 'Enter' && addNewFolder()}
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={addNewFolder}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowNewFolderDialog(false)
                  setNewFolderName("")
                }}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2">{renderFileTree(fileStructure)}</div>
        </div>

        {/* Code Editor - Main panel */}
        <div className="flex-1 flex flex-col h-full border border-border rounded-md overflow-hidden bg-card">
          {/* Header with file name and action buttons */}
          <div className="flex items-center justify-between gap-2 p-3 border-b border-border bg-muted/30">
            <div className="flex-1 text-sm font-medium text-foreground">{selectedFile || "No file selected"}</div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleSave} title="Save changes">
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} title="Cancel">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleEdit} title="Edit file">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={copyCode} title="Copy code">
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadAsZip}
                disabled={isDownloading}
                title="Download entire project"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Code display/editor */}
          {selectedFile ? (
            <div className="flex-1 min-h-0 overflow-auto">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm bg-[#282c34] text-white resize-none focus:outline-none"
                  spellCheck={false}
                  style={{
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    tabSize: 2,
                  }}
                />
              ) : (
                <SyntaxHighlighter
                  language={getLang(selectedFile)}
                  style={okaidia}
                  showLineNumbers
                  wrapLines
                  customStyle={{
                    margin: 0,
                    padding: "16px",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    lineHeight: "1.5",
                    backgroundColor: "#282c34",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                  }}
                >
                  {fileContents[selectedFile] || "// Empty file"}
                </SyntaxHighlighter>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a file to view code
            </div>
          )}
        </div>
      </div>
    </div>
  )
}