"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Download,
  MoreHorizontal,
  ArrowLeft,
  Play,
  Save,
  Keyboard,
  X,
  Copy,
  Lock,
  LogOut,
  Info,
  ChevronDown,
  Eye,
  Code,
  Settings,
  Edit2,
  Globe,
  Sun,
  Moon,
  Monitor,
  Database,
  RotateCcw,
} from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { PreferencesModal } from "./PreferencesModal";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { ExitConfirmationModal } from "./ExitConfirmationModal";
import { PublishTemplateModal } from "./PublishTemplateModal";
import { PublishSiteModal } from "./PublishSiteModal";
import { AccountSettingsModal } from "./AccountSettingsModal";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../supabase/config/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { PageSelector } from "./PageSelector";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface EditorTopBarProps {
  viewMode: "design" | "code";
  onViewModeChange: (mode: "design" | "code") => void;
  onPublish: () => void;
  onShare: () => void;
  onPreview?: () => void;
  onExport?: () => void;
  onGoToDashboard?: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  hasUnsavedChanges?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  projectName?: string;
  onProjectNameChange?: (name: string) => void;
  theme?: "light" | "dark" | "system";
  onThemeChange?: (theme: "light" | "dark" | "system") => void;
  onManualSave?: () => void;
  onPublishTemplate?: (isPublic: boolean) => void;
  currentProject?: any; // Added for publish modal
  currentUser?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  } | null;
  isSupabaseConnected?: boolean;
  onPublishSuccess?: (subdomain: string) => void;
  pages?: { id: string; name: string; path: string }[];
  activePageId?: string;
  onSwitchPage?: (pageId: string) => void;
  onAddPage?: (name: string, path: string) => void;
}

export function EditorTopBar({
  viewMode,
  onViewModeChange,
  onPublish,
  onShare,
  onPreview,
  onExport,
  onGoToDashboard,
  isSaving = false,
  lastSaved = null,
  hasUnsavedChanges = false,
  onToggleFullscreen,
  isFullscreen = false,
  projectName = "Untitled Project",
  onProjectNameChange,
  theme = "dark",
  onThemeChange,
  onManualSave,
  onPublishTemplate,
  currentProject,
  currentUser,
  isSupabaseConnected = false,
  onPublishSuccess,
  pages,
  activePageId,
  onSwitchPage,
  onAddPage,
}: EditorTopBarProps) {
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const publishButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  // Modal states
  const [showPreferences, setShowPreferences] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showPublishTemplateModal, setShowPublishTemplateModal] =
    useState(false);
  const [showPublishSiteModal, setShowPublishSiteModal] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [shareVisibility, setShareVisibility] = useState<"private" | "anyone">(
    "private",
  );
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [supabaseProjects, setSupabaseProjects] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedSupabaseProjectId, setSelectedSupabaseProjectId] =
    useState<string>("");
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [targetSupabaseUrl, setTargetSupabaseUrl] = useState<string | null>(
    null,
  );
  const [supabaseIntegrationToken, setSupabaseIntegrationToken] = useState<
    string | null
  >(null);

  useEffect(() => {
    setTargetSupabaseUrl(localStorage.getItem("target_supabase_url"));
    setSupabaseIntegrationToken(
      localStorage.getItem("supabase_integration_token"),
    );

    const handleStorageChange = () => {
      setTargetSupabaseUrl(localStorage.getItem("target_supabase_url"));
      setSupabaseIntegrationToken(
        localStorage.getItem("supabase_integration_token"),
      );
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch data only when the popover is opened
  const handleOpenPopover = (open: boolean) => {
    if (open && organizations.length === 0 && !isLoadingSupabase) {
      handleRefreshSupabaseData();
    }
  };


  const handleRefreshSupabaseData = () => {
    const token = localStorage.getItem("supabase_integration_token");
    if (!token) return;

    setIsLoadingSupabase(true)
    const hostname = window.location.hostname
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1"
    const backendBase = isLocal ? "http://localhost:4000" : (hostname === 'buildxdesigner.site' ? "https://buildxdesigner.duckdns.org" : "")

    Promise.all([
      fetch(`${backendBase}/api/supabase/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (res.status === 401 || res.status === 500) {
          localStorage.removeItem("supabase_integration_token");
          throw new Error("Invalid or expired integration token");
        }
        if (!res.ok) throw new Error("Failed to fetch organizations");
        return res.json();
      }),
      fetch(`${backendBase}/api/supabase/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch projects");
        return res.json();
      }),
    ])
      .then(([orgsData, projectsData]) => {
        const orgs = Array.isArray(orgsData)
          ? orgsData
          : Array.isArray(orgsData?.data)
            ? orgsData.data
            : [];
        const projs = Array.isArray(projectsData)
          ? projectsData
          : Array.isArray(projectsData?.data)
            ? projectsData.data
            : [];

        setOrganizations(orgs);
        setSupabaseProjects(projs);
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to refresh Supabase data:", err);
        if (err.message === "Invalid or expired integration token") {
          toast.error("Supabase integration session expired. Please reconnect.");
          setSupabaseIntegrationToken(null);
        }
      })
      .finally(() => setIsLoadingSupabase(false));
  };

  useEffect(() => {
    setTempProjectName(projectName);
  }, [projectName]);

  const handleProjectNameDoubleClick = () => {
    setIsEditingProjectName(true);
    setTimeout(() => {
      if (projectNameRef.current) {
        projectNameRef.current.focus();
        projectNameRef.current.select();
      }
    }, 0);
  };

  const handleProjectNameBlur = () => {
    setIsEditingProjectName(false);
    if (tempProjectName.trim() !== "" && onProjectNameChange) {
      onProjectNameChange(tempProjectName.trim());
    } else {
      setTempProjectName(projectName);
    }
  };

  const handleProjectNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      projectNameRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTempProjectName(projectName);
      setIsEditingProjectName(false);
    }
  };

  const handlePublishTemplateClick = () => {
    // setShowPublishTemplateModal(true) // Old template modal
    setShowPublishSiteModal(true);
  };

  const handlePublishTemplate = (isPublic: boolean) => {
    if (onPublishTemplate) {
      onPublishTemplate(isPublic);
    }
  };

  const handleRenameClick = () => {
    setIsEditingProjectName(true);
    setTimeout(() => {
      if (projectNameRef.current) {
        projectNameRef.current.focus();
        projectNameRef.current.select();
      }
    }, 0);
  };

  const handleShareClick = () => {
    setShowShareDropdown(true);
  };

  const syncUrlPrivacySegment = (
    rawUrl: string,
    isPublic: boolean,
    projectId?: string | null,
  ) => {
    try {
      const url = new URL(rawUrl);
      const trimmedProjectId = projectId?.trim();
      if (trimmedProjectId) {
        url.pathname = `/editor/${trimmedProjectId}${isPublic ? "" : "/private"}`;
      } else {
        const basePath = url.pathname.replace(/\/private\/?$/, "");
        url.pathname = isPublic ? basePath : `${basePath}/private`;
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  };

  const replaceBrowserUrl = (rawUrl: string) => {
    try {
      const url = new URL(rawUrl);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    } catch {
      // no-op
    }
  };

  const resolveProjectId = () => {
    if (currentProject?.id) return String(currentProject.id);
    if (typeof window === "undefined") return null;
    const fromPath = window.location.pathname.match(/^\/editor\/([^/]+)/)?.[1];
    if (fromPath && fromPath !== "private") return fromPath;
    const fromStorage = localStorage.getItem("fulldev-ai-current-project-id");
    return fromStorage && fromStorage !== "private" ? fromStorage : null;
  };

  const applyShareVisibilityChange = async (
    nextVisibility: "private" | "anyone",
  ) => {
    if (typeof window === "undefined" || isUpdatingVisibility) return;
    if (nextVisibility === shareVisibility) {
      setShowVisibilityDropdown(false);
      return;
    }

    const previousVisibility = shareVisibility;
    const nextIsPublic = nextVisibility === "anyone";
    const previousIsPublic = previousVisibility === "anyone";
    const projectId = resolveProjectId();
    const currentUrl = window.location.href;
    const nextUrl = syncUrlPrivacySegment(currentUrl, nextIsPublic, projectId);

    console.info("[EditorTopBar] privacy change request", {
      projectId,
      nextVisibility,
      nextIsPublic,
    });

    setShareVisibility(nextVisibility);
    setShowVisibilityDropdown(false);
    replaceBrowserUrl(nextUrl);

    if (!projectId) {
      setShareVisibility(previousVisibility);
      replaceBrowserUrl(
        syncUrlPrivacySegment(currentUrl, previousIsPublic, null),
      );
      toast.error("Unable to update privacy: missing project id.");
      return;
    }

    try {
      setIsUpdatingVisibility(true);

      const requestInit: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, isPublic: nextIsPublic }),
      };

      if (typeof window !== "undefined") {
        const apiOrigin = new URL(API_URL, window.location.origin).origin;
        if (apiOrigin === window.location.origin) {
          requestInit.credentials = "include";
        }
      }

      const response = await fetch(`${API_URL}/api/toggle-privacy`, {
        ...requestInit,
      });

      const data = await response
        .clone()
        .json()
        .catch(async () => ({ raw: await response.text().catch(() => "") }));

      console.info("[EditorTopBar] privacy change response", {
        status: response.status,
        ok: response.ok,
        data,
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to change project privacy.");
      }

      toast.success(
        nextIsPublic
          ? "Project visibility set to Anyone with the link."
          : "Project visibility set to Private.",
      );
    } catch (error) {
      setShareVisibility(previousVisibility);
      replaceBrowserUrl(
        syncUrlPrivacySegment(currentUrl, previousIsPublic, projectId),
      );
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update project privacy.";
      console.error("[EditorTopBar] privacy change failed", error);
      toast.error(message);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  useEffect(() => {
    if (!showShareDropdown || typeof window === "undefined") return;
    const isPrivatePath = /\/private\/?$/.test(window.location.pathname);
    setShareVisibility(isPrivatePath ? "private" : "anyone");
  }, [showShareDropdown]);

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmation(true);
    } else {
      if (onGoToDashboard) {
        onGoToDashboard();
      }
    }
  };

  const handleExitClick = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmation(true);
    } else {
      if (onGoToDashboard) {
        onGoToDashboard();
      }
    }
  };

  return (
    <div
      id="toolbar-top"
      className="h-14 bg-card border-b border-border flex items-center justify-between px-4 relative z-[100]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          className="h-9 px-3 text-foreground/70 hover:text-foreground hover:bg-accent transition-colors gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">
            Dashboard
          </span>
        </Button>

        <div className="w-px h-6 bg-border" />

        {pages && activePageId && onSwitchPage && (
          <PageSelector
            pages={pages}
            activePageId={activePageId}
            onSwitchPage={onSwitchPage}
            onAddPage={onAddPage}
          />
        )}

        {isEditingProjectName ? (
          <input
            ref={projectNameRef}
            type="text"
            value={tempProjectName}
            onChange={(e) => setTempProjectName(e.target.value)}
            onBlur={handleProjectNameBlur}
            onKeyDown={handleProjectNameKeyDown}
            className="bg-blue-50 dark:bg-blue-950/50 text-foreground px-3 py-2 text-sm rounded-lg border-2 border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[150px] max-w-[300px]"
            placeholder="Project Name"
          />
        ) : (
          <div
            onDoubleClick={handleProjectNameDoubleClick}
            className="text-foreground px-3 py-2 text-sm rounded-lg cursor-text hover:bg-accent transition-colors truncate max-w-[250px] font-medium"
            title="Double-click to edit project name"
          >
            {projectName}
          </div>
        )}
      </div>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("design")}
                className={`h-8 px-3 rounded transition-all ${viewMode === "design"
                  ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Design Mode</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("code")}
                className={`h-8 px-3 rounded transition-all ${viewMode === "code"
                  ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Code className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Code View</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <SaveIndicator
            isSaving={isSaving}
            lastSaved={lastSaved}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        </div>

        {(isSupabaseConnected ||
          localStorage.getItem("supabase_integration_token")) && (
            <>
              <Popover onOpenChange={handleOpenPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant={
                      localStorage.getItem("target_supabase_url")
                        ? "outline"
                        : "ghost"
                    }
                    size="sm"
                    className={`h-9 px-3 gap-2 ${localStorage.getItem("target_supabase_url") ? "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" : "text-muted-foreground"}`}
                  >
                    <Database className="w-4 h-4" />
                    {localStorage.getItem("target_supabase_url") ? (
                      <span className="text-xs font-medium max-w-[100px] truncate">
                        {
                          new URL(localStorage.getItem("target_supabase_url")!)
                            .hostname
                        }
                      </span>
                    ) : (
                      <span className="text-xs">Connect DB</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">
                        Database Connection
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Select a project to write data to.
                      </p>
                    </div>

                    {targetSupabaseUrl && (
                      <div className="flex items-center justify-between text-[10px] bg-green-100 dark:bg-green-900/30 px-2 py-1.5 rounded text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900">
                        <span className="truncate max-w-[200px]">
                          Target: {new URL(targetSupabaseUrl).hostname}
                        </span>
                        <button
                          className="ml-2 hover:bg-green-200 dark:hover:bg-green-800 rounded p-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            localStorage.removeItem("target_supabase_url");
                            localStorage.removeItem("target_supabase_key");
                            setTargetSupabaseUrl(null);
                            window.location.reload();
                          }}
                          title="Disconnect Target"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Select
                        value={selectedOrgId}
                        onValueChange={setSelectedOrgId}
                        disabled={
                          !isSupabaseConnected && !supabaseIntegrationToken
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Organization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Organizations</SelectLabel>
                            <SelectItem value="ALL">All Organizations</SelectItem>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedSupabaseProjectId}
                        onValueChange={(newProjectId: string) => {
                          setSelectedSupabaseProjectId(newProjectId);
                        }}
                        disabled={
                          (!isSupabaseConnected && !supabaseIntegrationToken) ||
                          isLoadingSupabase
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Projects</SelectLabel>
                            {supabaseProjects
                              .filter(
                                (p) =>
                                  !selectedOrgId ||
                                  selectedOrgId === "ALL" ||
                                  p.organization_id === selectedOrgId,
                              )
                              .map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            {supabaseProjects.length === 0 && (
                              <SelectItem value="none" disabled>
                                No projects found
                              </SelectItem>
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 w-full"
                        disabled={
                          !selectedSupabaseProjectId ||
                          selectedSupabaseProjectId === "none" ||
                          isLoadingSupabase
                        }
                        onClick={async () => {
                          const newProjectId = selectedSupabaseProjectId;
                          if (!newProjectId || newProjectId === "none") return;

                          try {
                            setIsLoadingSupabase(true)
                            const token = localStorage.getItem("supabase_integration_token")
                            const hostname = window.location.hostname
                            const isLocal = hostname === "localhost" || hostname === "127.0.0.1"
                            const backendBase = isLocal ? "http://localhost:4000" : (hostname === 'buildxdesigner.site' ? "https://buildxdesigner.duckdns.org" : "")

                            const res = await fetch(`${backendBase}/api/supabase/projects/${newProjectId}/api-keys`, {
                              headers: { Authorization: `Bearer ${token}` }
                            })

                            if (!res.ok) throw new Error("Failed to fetch project keys: " + res.status)
                            const keysData = await res.json()

                            const anonKeyObj = keysData.find((k: any) => k.name === 'anon' || k.tags?.includes('anon'))

                            if (anonKeyObj) {
                              const newUrl = `https://${newProjectId}.supabase.co`;
                              const newKey = anonKeyObj.api_key;

                              console.log(
                                "Switching TARGET to project:",
                                newProjectId,
                              );
                              localStorage.setItem("target_supabase_url", newUrl);
                              localStorage.setItem("target_supabase_key", newKey);

                              toast.success(
                                `Successfully connected to: ${newProjectId}`,
                                {
                                  description:
                                    "The connection will be used for data operations.",
                                  duration: 4000,
                                },
                              );
                              setTimeout(() => window.location.reload(), 1000);
                            } else {
                              toast.error(
                                "Could not find 'anon' key for this project.",
                                {
                                  description:
                                    "Please check your project configuration.",
                                },
                              );
                            }
                          } catch (err: any) {
                            console.error("Failed to switch:", err);
                            toast.error("Connection Failed", {
                              description: err.message,
                            });
                          } finally {
                            setIsLoadingSupabase(false);
                          }
                        }}
                      >
                        Connect
                      </Button>
                    </div>

                    <div className="pt-2 border-t flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-full max-w-[100px]"
                        onClick={handleRefreshSupabaseData}
                        title="Refresh Data"
                        disabled={isLoadingSupabase}
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${isLoadingSupabase ? "animate-spin" : ""}`}
                        />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            {onManualSave && (
              <DropdownMenuItem
                id="save-button"
                onClick={onManualSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="cursor-pointer"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRenameClick}
              className="cursor-pointer"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowPreferences(true)}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowKeyboardShortcuts(true)}
              className="cursor-pointer"
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Keyboard Shortcuts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Theme
            </div>
            <DropdownMenuItem
              onClick={() => onThemeChange && onThemeChange("light")}
              className={`cursor-pointer ${theme === "light" ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
            >
              <Sun className="w-4 h-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onThemeChange && onThemeChange("dark")}
              className={`cursor-pointer ${theme === "dark" ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
            >
              <Moon className="w-4 h-4 mr-2" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onThemeChange && onThemeChange("system")}
              className={`cursor-pointer ${theme === "system" ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
            >
              <Monitor className="w-4 h-4 mr-2" />
              System
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleExitClick}
              className="cursor-pointer text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onPreview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreview}
            className="h-9 px-3 text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
          >
            <Play className="w-4 h-4" />
          </Button>
        )}

        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="h-9 px-3 text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}

        {isSupabaseConnected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSupabaseModal(true)}
            className="h-9 px-3 text-green-600 bg-green-50/50 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors gap-2 border border-green-200 dark:border-green-800"
            title="Manage Integrations"
          >
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Connected</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSupabaseModal(true)}
            className="h-9 px-3 text-foreground/70 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title="Go to Integration"
          >
            <Database className="w-4 h-4" />
            <span className="sr-only">Go to Integration</span>
          </Button>
        )}

        <Button
          ref={publishButtonRef}
          onClick={handlePublishTemplateClick}
          size="sm"
          variant="outline"
          className="h-9 px-4 text-foreground border-border hover:bg-accent text-sm font-medium transition-colors bg-transparent"
        >
          Publish
        </Button>

        <Button
          ref={shareButtonRef}
          onClick={handleShareClick}
          size="sm"
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <span>Share</span>
        </Button>

        {currentUser?.avatar_url ? (
          <img
            src={currentUser.avatar_url || "/placeholder.svg"}
            alt="Profile"
            className="w-9 h-9 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity">
            {currentUser?.name?.[0]?.toUpperCase() ||
              currentUser?.email?.[0]?.toUpperCase() ||
              "U"}
          </div>
        )}
      </div>

      <PreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
      <PublishTemplateModal
        isOpen={showPublishTemplateModal}
        onClose={() => setShowPublishTemplateModal(false)}
        onPublish={handlePublishTemplate}
        buttonRef={publishButtonRef}
      />
      <PublishSiteModal
        isOpen={showPublishSiteModal}
        onClose={() => setShowPublishSiteModal(false)}
        project={currentProject}
        onPublishSuccess={(url) => {
          if (onPublishSuccess) {
            // Extract subdomain from URL like https://subdomain.buildxdesigner.site
            const match = url.match(/https:\/\/([^.]+)\.buildxdesigner\.site/);
            if (match) onPublishSuccess(match[1]);
          }
        }}
      />

      {showShareDropdown && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setShowShareDropdown(false)}
        >
          <div
            className="absolute bg-card border-border rounded-lg shadow-2xl w-[480px] max-h-[600px] overflow-y-auto"
            style={{
              top: shareButtonRef.current
                ? shareButtonRef.current.getBoundingClientRect().bottom + 8
                : 0,
              right: shareButtonRef.current
                ? window.innerWidth -
                shareButtonRef.current.getBoundingClientRect().right
                : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Share</h3>
                <button
                  onClick={() => setShowShareDropdown(false)}
                  className="p-1 hover:bg-accent rounded transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  People with access
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url || "/placeholder.svg"}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {currentUser?.name?.[0]?.toUpperCase() ||
                          currentUser?.email?.[0]?.toUpperCase() ||
                          "U"}
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {currentUser?.name ||
                          currentUser?.email?.split("@")[0] ||
                          "User"}{" "}
                        (you)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentUser?.email || "user@example.com"}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md flex items-center gap-1">
                    Owner
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Visibility
                </h4>
                <div className="relative">
                  <div
                    className="flex items-center justify-between p-3 border-2 border-blue-500 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() =>
                      setShowVisibilityDropdown(!showVisibilityDropdown)
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-foreground/70" />
                      <span className="text-sm font-medium text-foreground">
                        {shareVisibility === "private"
                          ? "Private"
                          : "Anyone with the link"}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {showVisibilityDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border-border rounded-lg shadow-lg z-10">
                      <div
                        className={`p-3 cursor-pointer hover:bg-accent transition-colors ${shareVisibility === "private" ? "bg-blue-500/10" : ""
                          }`}
                        onClick={() =>
                          void applyShareVisibilityChange("private")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-foreground/70" />
                          <span className="text-sm font-medium text-foreground">
                            Private
                          </span>
                        </div>
                      </div>
                      <div
                        className={`p-3 cursor-pointer hover:bg-accent transition-colors ${shareVisibility === "anyone" ? "bg-blue-500/10" : ""
                          }`}
                        onClick={() =>
                          void applyShareVisibilityChange("anyone")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-foreground/70" />
                          <span className="text-sm font-medium text-foreground">
                            Anyone with the link
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors">
                  <Info className="w-4 h-4" />
                  How does sharing chats work?
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-transparent"
                  onClick={() => {
                    const projectId = resolveProjectId();
                    const shareUrl = syncUrlPrivacySegment(
                      window.location.href,
                      shareVisibility === "anyone",
                      projectId,
                    );
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Share link copied.");
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ExitConfirmationModal
        isOpen={showExitConfirmation}
        onClose={() => setShowExitConfirmation(false)}
        onConfirm={() => {
          setShowExitConfirmation(false);
          if (onGoToDashboard) {
            onGoToDashboard();
          }
        }}
      />

      <Dialog open={showSupabaseModal} onOpenChange={setShowSupabaseModal}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Database className="w-5 h-5 text-green-600" />
              Integration Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage your external service connections.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <span className="font-semibold block mb-1">
                  Navigation Warning
                </span>
                You need to go to the Dashboard to manage your integrations.
                This will exit the current editor session.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={() => {
                  if (onGoToDashboard) {
                    localStorage.setItem(
                      "open_account_settings",
                      "integration",
                    );
                    onGoToDashboard();
                  }
                }}
                className="w-full hover:opacity-90 bg-blue-600 text-white hover:bg-blue-700"
              >
                Go to Integration
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowSupabaseModal(false)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
