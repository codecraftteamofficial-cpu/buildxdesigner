"use client";

import type React from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Copy,
  ChevronRight,
  ChevronDown,
  File,
  Save,
  Pencil,
  X,
  Download,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  FilePlus,
  FolderPlus,
  FileCode,
  FileText,
  Globe,
  AlertTriangle,
  Layers,
  Lock,
  Eye,
  FolderOpen,
  Folder,
  BarChart3,
  AlignLeft,
  Files,
  Cpu,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { generateProjectFiles, slugify } from "../lib/code-generator";

// --- TYPES ---
export interface ComponentData {
  id: string;
  type: string;
  props: Record<string, any>;
  style?: Record<string, any>;
  position?: { x: number; y: number };
  children?: ComponentData[];
  page_id?: string;
}

interface CodeViewEditorProps {
  components: ComponentData[];
  projectName?: string;
  pages: { id: string; name: string; path: string }[];
  activePageId: string;
  onCodeChange?: (newComponents: ComponentData[]) => void;
  onPageCreate?: (name: string, path: string) => void;
  userConfig?: {
    paymongoKey?: string;
    resendApiKey?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    supabaseServiceKey?: string;
  };
  fileOverrides?: Record<string, string>;
  onFileOverrideUpdate?: (path: string, content: string) => void;

  customFiles?: Record<string, string>;
  onCustomFileUpdate?: (path: string, content: string) => void;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
}

type FileOverrides = Record<string, string>;

interface FileTypeOption {
  ext: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  folder: string;
}

interface FileCreatorModalProps {
  onClose: () => void;
  existingPaths: string[];
  onCreateFile: (path: string, content: string) => void;
}

// --- MONACO EDITOR THEME OPTIONS ---
const MONACO_THEMES = [
  { value: "vs-dark", label: "Dark", icon: "🌙" },
  { value: "vs", label: "Light", icon: "☀️" },
  { value: "hc-black", label: "High Contrast", icon: "🔳" },
  { value: "hc-light", label: "High Contrast Light", icon: "🔲" },
];

const FILE_TEMPLATES: Record<string, (name: string) => string> = {
  php: (name) =>
    `<?php\n// Backend logic for ${name}\nrequire_once __DIR__ . '/../lib/supabase.php';\n\n// Add your logic here\n`,
  js: (name) => `// ${name}.js logic\n`,
  json: (name) => `{\n  "name": "${name}"\n}\n`,
  md: (name) => `# ${name}\n`,
};

const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  {
    ext: "php",
    label: "PHP Script",
    icon: <span className="text-[10px] font-bold text-[#8892bf]">PHP</span>,
    color: "text-[#8892bf]",
    folder: "app/api",
  },
  {
    ext: "js",
    label: "JavaScript",
    icon: <span className="text-[10px] font-bold text-[#f7df1e]">JS</span>,
    color: "text-[#f7df1e]",
    folder: "public/assets/js",
  },
  {
    ext: "json",
    label: "JSON Config",
    icon: <span className="text-[10px] font-bold text-[#f5a623]">JSON</span>,
    color: "text-[#f5a623]",
    folder: "app/config",
  },
  {
    ext: "md",
    label: "Markdown",
    icon: <span className="text-[10px] font-bold text-[#aaa]">MD</span>,
    color: "text-[#aaa]",
    folder: "docs",
  },
];

// --- FILE CREATOR MODAL ---
function FileCreatorModal({
  onClose,
  existingPaths,
  onCreateFile,
}: FileCreatorModalProps) {
  const [selectedType, setSelectedType] = useState<FileTypeOption>(
    FILE_TYPE_OPTIONS[0],
  );
  const [fileName, setFileName] = useState("");
  const [customFolder, setCustomFolder] = useState("");
  const [useCustomFolder, setUseCustomFolder] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const folder = useCustomFolder ? customFolder : selectedType.folder;
  const cleanName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .toLowerCase();
  const finalPath = cleanName
    ? `${folder}/${cleanName}.${selectedType.ext}`
    : "";

  const validate = () => {
    if (!cleanName) return "File name is required.";
    if (existingPaths.includes(finalPath))
      return `File already exists: ${finalPath}`;
    return "";
  };

  const handleCreate = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const template = FILE_TEMPLATES[selectedType.ext] ?? (() => "");
    onCreateFile(finalPath, template(cleanName));
    toast.success(`Created ${finalPath}`);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[420px] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-white text-lg font-semibold">
            Create Backend File
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Add custom logic or configuration to your project.
          </p>
        </div>
        <div className="px-6 pb-4 grid gap-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs text-muted-foreground">
              Type
            </Label>
            <div className="col-span-3 flex gap-2">
              {FILE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.ext}
                  onClick={() => {
                    setSelectedType(opt);
                    setError("");
                    if (!useCustomFolder) setCustomFolder("");
                  }}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg border text-xs transition-all ${
                    selectedType.ext === opt.ext
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-[#333] bg-[#222] hover:bg-[#2a2a2a] text-muted-foreground"
                  }`}
                >
                  {opt.icon}
                  <span className="text-[10px] uppercase font-bold">
                    {opt.ext}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs text-muted-foreground">
              Name
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                ref={inputRef}
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKey}
                placeholder="e.g. auth-logic"
                className="flex-1 font-mono h-9 bg-[#222] border-[#333] text-white text-sm"
              />
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                .{selectedType.ext}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right flex flex-col items-end">
              <Label className="text-xs text-muted-foreground">Path</Label>
              <button
                onClick={() => {
                  setUseCustomFolder((p) => !p);
                  setCustomFolder(selectedType.folder);
                }}
                className="text-[9px] text-blue-400 hover:underline"
              >
                {useCustomFolder ? "Reset" : "Change"}
              </button>
            </div>
            <div className="col-span-3">
              <Input
                value={folder}
                onChange={(e) => setCustomFolder(e.target.value)}
                readOnly={!useCustomFolder}
                className={`font-mono h-9 text-sm ${!useCustomFolder ? "bg-[#111] border-[#222] text-muted-foreground" : "bg-[#222] border-[#333] text-white"}`}
              />
            </div>
          </div>
          {error && (
            <p className="text-[10px] text-red-400 col-start-2 col-span-3">
              {error}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[#222]/50 border-t border-[#333]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-white"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!cleanName}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create File
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- CODE EXPORT MODAL ---
interface CodeExportModalProps {
  components: ComponentData[];
  projectName: string;
  pages: { id: string; name: string; path: string }[];
  activePageId: string;
  effectiveFiles: Record<string, string>;
  userConfig?: {
    paymongoKey?: string;
    resendApiKey?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    supabaseServiceKey?: string;
  };
  onClose: () => void;
}

function buildExportFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];
  paths.forEach((path) => {
    const parts = path.split("/");
    let currentLevel = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let existingNode = currentLevel.find((node) => node.name === part);
      if (!existingNode) {
        existingNode = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
        };
        currentLevel.push(existingNode);
      }
      if (existingNode.children) currentLevel = existingNode.children;
    });
  });
  return root;
}

function CodeExportModal({
  components,
  projectName,
  pages,
  activePageId,
  effectiveFiles,
  userConfig,
  onClose,
}: CodeExportModalProps) {
  const defaultFile = useMemo(() => {
    const activePage = pages.find((p) => p.id === activePageId) || pages[0];
    return `app/views/${slugify(activePage.name)}.php`;
  }, [pages, activePageId]);

  const [selectedFile, setSelectedFile] = useState<string>(defaultFile);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([
      "app",
      "app/views",
      "public",
      "public/assets",
      "public/assets/css",
    ]),
  );

  const fileTree = useMemo(
    () => buildExportFileTree(Object.keys(effectiveFiles)),
    [effectiveFiles],
  );

  const stats = useMemo(() => {
    const totalFiles = Object.keys(effectiveFiles).length;
    const totalLines = Object.values(effectiveFiles).reduce(
      (sum, c) => sum + c.split("\n").length,
      0,
    );
    return { totalFiles, totalLines };
  }, [effectiveFiles]);

  const frameworkLabel = useMemo(() => {
    const ext = selectedFile.split(".").pop();
    switch (ext) {
      case "php":
        return { name: "PHP Engine", color: "text-[#8892bf]" };
      case "css":
        return { name: "CSS3 Styles", color: "text-[#38bdf8]" };
      case "js":
        return { name: "JavaScript ES6", color: "text-[#facc15]" };
      case "sql":
        return { name: "PostgreSQL", color: "text-[#336791]" };
      default:
        return { name: "Plain Text", color: "text-white/60" };
    }
  }, [selectedFile]);

  const downloadAll = async () => {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      Object.entries(effectiveFiles).forEach(([path, content]) =>
        zip.file(path, content),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(projectName)}_export.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Project bundle downloaded!");
    } catch {
      toast.error("Failed to create zip");
    }
  };

  const copyEntireProject = async () => {
    const fullText = Object.entries(effectiveFiles)
      .map(([path, content]) => `--- FILE: ${path} ---\n${content}\n`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Entire project copied to clipboard!");
    } catch {
      toast.error("Failed to copy project");
    }
  };

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes
      .sort((a, b) =>
        a.type === b.type
          ? a.name.localeCompare(b.name)
          : a.type === "folder"
            ? -1
            : 1,
      )
      .map((node) => {
        const isExpanded = expandedFolders.has(node.path);
        const isSelected = selectedFile === node.path;
        return (
          <div key={node.path}>
            <div
              onClick={() => {
                if (node.type === "folder") {
                  const next = new Set(expandedFolders);
                  if (next.has(node.path)) {
                    next.delete(node.path);
                  } else {
                    next.add(node.path);
                  }
                  setExpandedFolders(next);
                } else {
                  setSelectedFile(node.path);
                }
              }}
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors text-sm mb-0.5 ${
                isSelected
                  ? "bg-[#37373d] text-white"
                  : "text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200"
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {node.type === "folder" ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-blue-400/80" />
                  ) : (
                    <Folder className="w-4 h-4 text-blue-400/80" />
                  )}
                </>
              ) : (
                <FileCode
                  className={`w-4 h-4 ${node.path.endsWith(".php") ? "text-blue-400" : node.path.endsWith(".css") ? "text-blue-300" : "text-yellow-400"}`}
                />
              )}
              <span className="truncate">{node.name}</span>
            </div>
            {node.type === "folder" &&
              isExpanded &&
              node.children &&
              renderTree(node.children, depth + 1)}
          </div>
        );
      });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[1600px] w-[98vw] p-0 gap-0 flex flex-col overflow-hidden border-[#333] shadow-2xl text-white"
        style={{
          backgroundColor: "#1e1e1e",
          height: "min(90vh, 900px)",
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Export Code</DialogTitle>
        </DialogHeader>

        {/* Title bar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-[#333] shrink-0"
          style={{ backgroundColor: "#252526" }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 px-2 py-0.5 rounded text-white font-bold text-[10px]">
              BUILDX
            </div>
            <h2 className="text-sm font-medium text-gray-200 uppercase tracking-widest">
              Export Project: {projectName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-[#333]"
              onClick={copyEntireProject}
            >
              <Files className="w-4 h-4 mr-2" /> Copy Project
            </Button>
            <Button
              size="sm"
              onClick={downloadAll}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform active:scale-95"
            >
              <Download className="w-4 h-4 mr-2" /> Download .zip
            </Button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 flex overflow-hidden min-h-0"
          style={{ backgroundColor: "#1e1e1e" }}
        >
          {/* Explorer sidebar */}
          <div
            className="w-64 border-r border-[#333] flex flex-col shrink-0 overflow-y-auto"
            style={{ backgroundColor: "#181818" }}
          >
            <div className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-2">
              Explorer
            </div>
            <div className="flex-1 px-1">{renderTree(fileTree)}</div>
          </div>

          {/* Code pane */}
          <div
            className="flex-1 flex flex-col overflow-hidden min-w-0"
            style={{ backgroundColor: "#1e1e1e" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2 text-xs text-gray-300 border-b border-[#333] justify-between shrink-0"
              style={{ backgroundColor: "#2d2d2d" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileCode
                  className={`w-3.5 h-3.5 shrink-0 ${selectedFile.endsWith(".php") ? "text-blue-400" : "text-blue-300"}`}
                />
                <span className="font-mono truncate">{selectedFile}</span>
              </div>
              <Button
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0 hover:bg-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(
                    effectiveFiles[selectedFile] ?? "",
                  );
                  toast.success("File copied!");
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto min-h-0 bg-[#1e1e1e]">
              <Editor
                height="100%"
                language={
                  selectedFile.endsWith(".css")
                    ? "css"
                    : selectedFile.endsWith(".js")
                      ? "javascript"
                      : selectedFile.endsWith(".html")
                        ? "html"
                        : selectedFile.endsWith(".php")
                          ? "php"
                          : selectedFile.endsWith(".json")
                            ? "json"
                            : selectedFile.endsWith(".md")
                              ? "markdown"
                              : "php"
                }
                value={effectiveFiles[selectedFile] || "// No content"}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: "on",
                  padding: { top: 24, bottom: 24 },
                }}
              />
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div
          className="h-7 text-white flex items-center px-4 justify-between shrink-0 text-[11px] font-medium"
          style={{ backgroundColor: "#007acc" }}
        >
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
              <span className={frameworkLabel.color}>
                {frameworkLabel.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 px-3">
            <span className="opacity-90">UTF-8</span>
            <span className="opacity-90 uppercase font-bold">
              {selectedFile.split(".").pop()}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- UTILITIES ---
const buildTreeFromPaths = (paths: string[]): FileNode[] => {
  const root: FileNode = {
    name: "root",
    type: "folder",
    path: "",
    children: [],
  };
  for (const path of paths) {
    const segs = path.split("/");
    let cur = root;
    segs.forEach((seg, i) => {
      const curPath = segs.slice(0, i + 1).join("/");
      const isFile = i === segs.length - 1 && seg.includes(".");
      cur.children ??= [];
      let node = cur.children.find((n) => n.path === curPath);
      if (!node) {
        node = {
          name: seg,
          type: isFile ? "file" : "folder",
          path: curPath,
          children: isFile ? undefined : [],
        };
        cur.children.push(node);
      }
      cur = node;
    });
  }
  const sort = (nodes: FileNode[]): FileNode[] =>
    nodes
      .sort((a, b) =>
        a.type === b.type
          ? a.name.localeCompare(b.name)
          : a.type === "folder"
            ? -1
            : 1,
      )
      .map((n) => ({
        ...n,
        children: n.children ? sort(n.children) : undefined,
      }));
  return sort(root.children ?? []);
};

// --- MAIN COMPONENT ---
export function CodeViewEditor({
  components,
  projectName = "php-builder",
  pages,
  activePageId,
  onCodeChange,
  onPageCreate,
  userConfig,
  fileOverrides = {},
  onFileOverrideUpdate,
  customFiles = {},
  onCustomFileUpdate,
}: CodeViewEditorProps) {
  // Remove diagnostic logs as we found the issue
  const [selectedFile, setSelectedFile] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["app", "app/api", "public", "config"]),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [showFileCreator, setShowFileCreator] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false); // ← new

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure the generated code uses the configuration
  const generatedFiles = useMemo(() => {
    return generateProjectFiles(components, pages, projectName, userConfig);
  }, [components, pages, projectName, userConfig]);

  const effectiveFiles = useMemo<Record<string, string>>(
    () => ({ ...generatedFiles, ...fileOverrides, ...customFiles }),
    [generatedFiles, fileOverrides, customFiles],
  );

  // Permissions logic
  const isViewPHP =
    selectedFile.startsWith("app/views/") && selectedFile.endsWith(".php");
  const isCSSFile = selectedFile.endsWith(".css");
  const isJSFile = selectedFile.endsWith(".js");
  const isGeneratedFrontend = isViewPHP || isCSSFile || isJSFile;
  const isOverridden = !!fileOverrides[selectedFile];
  const canEdit = !!selectedFile && !isGeneratedFrontend;

  useEffect(() => {
    const page = pages.find((p) => p.id === activePageId) ?? pages[0];
    setSelectedFile((prev) => prev || `app/views/${slugify(page.name)}.php`);
  }, [activePageId, pages]);

  const readOnlyContent = effectiveFiles[selectedFile] ?? "";
  const isCustomFile = !!customFiles[selectedFile];

  const handleSelectFile = (path: string) => {
    if (path === selectedFile) return;
    setIsEditing(false);
    setDraftContent("");
    setSelectedFile(path);
  };

  const handleStartEdit = () => {
    if (!canEdit) {
      toast.error("This file is managed by the Canvas.");
      return;
    }
    setDraftContent(readOnlyContent);
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSave = useCallback(() => {
    if (!selectedFile || !canEdit) return;
    if (isCustomFile) onCustomFileUpdate?.(selectedFile, draftContent);
    else onFileOverrideUpdate?.(selectedFile, draftContent);
    setIsEditing(false);
    setDraftContent("");
    toast.success("File saved successfully.");
  }, [
    selectedFile,
    draftContent,
    canEdit,
    isCustomFile,
    onCustomFileUpdate,
    onFileOverrideUpdate,
  ]);

  const handleCreateFile = useCallback((path: string, content: string) => {
    onCustomFileUpdate?.(path, content);
    setSelectedFile(path);
    const parts = path.split("/");
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      for (let i = 1; i < parts.length; i++)
        next.add(parts.slice(0, i).join("/"));
      return next;
    });
  }, [onCustomFileUpdate]);

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme("builder-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#272727ff",
      },
    });
  };

  const fileStructure = useMemo(
    () => buildTreeFromPaths(Object.keys(effectiveFiles)),
    [effectiveFiles],
  );

  const renderFileNode = (node: FileNode, depth = 0): React.ReactNode => (
    <div key={node.path}>
      <div
        onClick={() =>
          node.type === "folder"
            ? setExpandedFolders((p) => {
                const n = new Set(p);
                if (n.has(node.path)) {
                  n.delete(node.path);
                } else {
                  n.add(node.path);
                }
                return n;
              })
            : handleSelectFile(node.path)
        }
        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm cursor-pointer transition-all duration-75 text-[13px] group ${
          selectedFile === node.path
            ? "bg-[#37373d] text-white"
            : "text-white hover:bg-[#2a2d2e]"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.type === "folder" ? (
          expandedFolders.has(node.path) ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )
        ) : (
          <File className="w-3 h-3 opacity-50" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === "folder" &&
        expandedFolders.has(node.path) &&
        node.children &&
        node.children.map((child) => renderFileNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="w-full h-full flex gap-3 p-4 bg-[#111111]">
      {/* Modals */}
      {showFileCreator && (
        <FileCreatorModal
          existingPaths={Object.keys(effectiveFiles)}
          onClose={() => setShowFileCreator(false)}
          onCreateFile={handleCreateFile}
        />
      )}
      {showExportModal && (
        <CodeExportModal
          components={components}
          projectName={projectName}
          pages={pages}
          activePageId={activePageId}
          effectiveFiles={effectiveFiles}
          userConfig={userConfig}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Explorer */}
      <div className="w-64 rounded-sm flex flex-col bg-[#252526] overflow-hidden shrink-0 shadow-xl">
        <div className="px-4 py-3 flex items-center justify-between bg-[#252526]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Filesystem
          </span>
          <button
            onClick={() => setShowFileCreator(true)}
            className="p-1 hover:bg-[#333] rounded-sm text-gray-400 hover:text-white transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
          {fileStructure.map((node) => renderFileNode(node, 0))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 rounded-sm overflow-hidden flex flex-col bg-[#272727] shadow-xl">
        {/* Toolbar */}
        <div className="px-4 py-2 bg-[#252526] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-white truncate max-w-[250px] font-medium">
              {selectedFile}
            </span>
            {isGeneratedFrontend && (
              <span
                className={`text-[10px] flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full border ${isOverridden ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-yellow-300 bg-yellow-400/10 border-yellow-400/20"}`}
                title={
                  isOverridden
                    ? "Visual changes are currently ignored due to manual edits"
                    : "Changes here may be overwritten by the visual Canvas"
                }
              >
                <AlertTriangle
                  className={`w-3 h-3 ${isOverridden ? "text-red-400" : "text-yellow-400"}`}
                />{" "}
                {isOverridden ? "Override Active" : "Managed by Canvas"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(readOnlyContent);
                    toast.success("Copied!");
                  }}
                  className="h-7 w-7 p-0 text-white hover:bg-white/20 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                {fileOverrides[selectedFile] !== undefined && !isEditing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm("Restore this file to the original generated version? Your manual changes will be lost.")) {
                        onFileOverrideUpdate?.(selectedFile, null as any);
                        toast.success("File restored to default");
                      }
                    }}
                    className="h-7 text-[10px] bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset
                  </Button>
                )}
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={handleStartEdit}
                    className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                )}

                {/* Export button — opens the full CodeExportModal */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowExportModal(true)}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white border-none gap-1.5 transition-all shadow-lg active:scale-95"
                >
                  <ExternalLink className="w-3 h-3 text-white/90" /> Export
                </Button>
              </>
            ) : (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="h-7 text-muted-foreground hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Info banner for read-only frontend files */}
        {isGeneratedFrontend && !isEditing && (
          <div
            className="px-4 py-1.5 bg-[#2e2e2e] border-b border-[#404040] flex items-center gap-2 text-[10px] tracking-tight"
            style={{ color: "#888888" }}
          >
            <AlertCircle
              className="w-3 h-3 shrink-0"
              style={{ color: "#666666" }}
            />
            <span>
              Frontend managed by visual designer. Edit layout via the{" "}
              <strong
                style={{ color: "#aaaaaa" }}
                className="font-medium underline underline-offset-2 decoration-[#555]"
              >
                Canvas
              </strong>{" "}
              {isOverridden
                ? "to update this file. (Override active - visual changes are ignored)"
                : "to prevent desync."}
            </span>
          </div>
        )}

        {/* Editor / viewer */}
        <div className="flex-1 relative overflow-hidden">
          <Editor
            height="100%"
            language={
              selectedFile.endsWith(".css")
                ? "css"
                : selectedFile.endsWith(".js")
                  ? "javascript"
                  : selectedFile.endsWith(".html")
                    ? "html"
                    : selectedFile.endsWith(".php")
                      ? "php"
                      : selectedFile.endsWith(".json")
                        ? "json"
                        : selectedFile.endsWith(".md")
                          ? "markdown"
                          : "php"
            }
            value={
              isEditing
                ? draftContent
                : readOnlyContent || "// Select a file to view source"
            }
            onChange={(val) => {
              if (isEditing) setDraftContent(val || "");
            }}
            beforeMount={handleEditorWillMount}
            theme="builder-dark"
            options={{
              readOnly: !isEditing,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: "on",
              padding: { top: 24, bottom: 24 },
            }}
          />
        </div>
      </div>
    </div>
  );
}
