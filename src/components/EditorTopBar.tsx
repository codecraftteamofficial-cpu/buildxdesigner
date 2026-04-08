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
  DropdownMenuLabel,
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
import { Switch } from "./ui/switch";
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
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "../utils/apiConfig";

const API_URL =
  import.meta.env.VITE_API_URL || getApiBaseUrl() || "http://localhost:4000";

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
  onUnpublishTemplate?: () => Promise<void> | void;
  isTemplatePublished?: boolean;
  currentProject?: any; // Added for publish modal
  currentUser?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    avatarUrl?: string;
    picture?: string;
    user_metadata?: {
      avatar_url?: string;
      picture?: string;
      name?: string;
      full_name?: string;
    };
  } | null;
  isSupabaseConnected?: boolean;
  onPublishSuccess?: (
    subdomain: string,
    siteTitle?: string,
    siteLogoUrl?: string,
  ) => void;
  onTemplatePublishedChange?: (published: boolean) => void;
  onProjectVisibilityChange?: (isPublic: boolean) => void;
  pages?: { id: string; name: string; path: string }[];
  activePageId?: string;
  onSwitchPage?: (pageId: string) => void;
  onAddPage?: (name: string, path: string) => void;
  onDeletePage?: (pageId: string) => void;
  onDuplicatePage?: (pageId: string) => void;
  onUpdatePage?: (
    pageId: string,
    updates: { name?: string; path?: string },
  ) => void;
  onStartTour?: () => void;
  onStartPublishingBasics?: () => void;
  onOpenGettingStarted?: () => void;
}

interface ProjectCollaborator {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  isCurrentUser: boolean;
}

const mergeCollaborators = (
  existing: ProjectCollaborator,
  incoming: ProjectCollaborator,
): ProjectCollaborator => {
  const pickPreferred = (currentValue: string, nextValue: string) =>
    currentValue && currentValue.trim() ? currentValue : nextValue;

  return {
    id: pickPreferred(existing.id, incoming.id),
    name: pickPreferred(existing.name, incoming.name),
    email: pickPreferred(existing.email, incoming.email),
    avatarUrl: existing.avatarUrl || incoming.avatarUrl || null,
    role:
      existing.role === "Owner" || incoming.role !== "Owner"
        ? existing.role
        : incoming.role,
    isCurrentUser: existing.isCurrentUser || incoming.isCurrentUser,
  };
};

const dedupeCollaboratorsByIdentity = (
  list: ProjectCollaborator[],
): ProjectCollaborator[] => {
  const deduped: ProjectCollaborator[] = [];

  list.forEach((candidate) => {
    const candidateEmail = candidate.email.trim().toLowerCase();
    const existingIndex = deduped.findIndex((entry) => {
      const sameId =
        Boolean(candidate.id && entry.id) && candidate.id === entry.id;
      const sameEmail =
        Boolean(candidateEmail && entry.email) &&
        candidateEmail === entry.email.trim().toLowerCase();
      return sameId || sameEmail;
    });

    if (existingIndex === -1) {
      deduped.push(candidate);
      return;
    }

    deduped[existingIndex] = mergeCollaborators(
      deduped[existingIndex],
      candidate,
    );
  });

  return deduped;
};

const normalizeCollaboratorRows = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;

  const candidates = [
    raw?.collaborators,
    raw?.permissions?.collaborators,
    raw?.permissions,
    raw?.members,
    raw?.users,
    raw?.data,
    raw?.rows,
    raw?.result,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const formatRoleLabel = (role: unknown, isOwner: boolean) => {
  if (isOwner) return "Owner";

  const value = String(role || "").trim();
  if (!value) return "Collaborator";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

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
  onUnpublishTemplate,
  isTemplatePublished,
  currentProject,
  currentUser,
  isSupabaseConnected = false,
  onPublishSuccess,
  onTemplatePublishedChange,
  onProjectVisibilityChange,
  pages,
  activePageId,
  onSwitchPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onUpdatePage,
  onStartTour,
  onStartPublishingBasics,
  onOpenGettingStarted,
}: EditorTopBarProps) {
  const navigate = useNavigate();
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const publishButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const profileDisplayName =
    currentUser?.name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "User";

  const resolvedAvatarUrl =
    currentUser?.avatar_url ||
    currentUser?.avatarUrl ||
    currentUser?.picture ||
    currentUser?.user_metadata?.avatar_url ||
    currentUser?.user_metadata?.picture ||
    (currentUser?.email
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.email)}&background=2563eb&color=ffffff&bold=true`
      : null);

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
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(
    null,
  );
  const [collaboratorsRefreshKey, setCollaboratorsRefreshKey] = useState(0);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [updatingPermissionFor, setUpdatingPermissionFor] = useState<
    string | null
  >(null);
  const [removingCollaboratorFor, setRemovingCollaboratorFor] = useState<
    string | null
  >(null);
  const [isTogglingTemplatePublish, setIsTogglingTemplatePublish] =
    useState(false);
  const [templatePublishedState, setTemplatePublishedState] = useState(
    Boolean(isTemplatePublished),
  );

  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsTab, setAccountSettingsTab] =
    useState<string>("profile");

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
  const [anyoneCanPermission, setAnyoneCanPermission] = useState<
    "view" | "edit"
  >(currentProject?.anyone_can === "edit" ? "edit" : "view");
  const currentUserIsOwner = collaborators.some(
    (c) => c.isCurrentUser && c.role.trim().toLowerCase() === "owner",
  );

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

    const handleClosePublishSiteModal = () => {
      setShowPublishSiteModal(false);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("supabaseKeysUpdated", handleStorageChange);
    window.addEventListener("userProjectConfigUpdated", handleStorageChange);
    window.addEventListener("close-publish-site-modal", handleClosePublishSiteModal);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("supabaseKeysUpdated", handleStorageChange);
      window.removeEventListener("userProjectConfigUpdated", handleStorageChange);
      window.removeEventListener("close-publish-site-modal", handleClosePublishSiteModal);
    };
  }, []);

  // Fetch data only when the popover is opened
  const handleOpenPopover = (open: boolean) => {
    if (open && organizations.length === 0 && !isLoadingSupabase) {
      handleRefreshSupabaseData();
    }
  };

  const handleRefreshSupabaseData = () => {
    const token = localStorage.getItem("supabase_integration_token");
    console.log("[Supabase] token:", token ? "present" : "missing");
    if (!token) return;

    setIsLoadingSupabase(true);
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const backendBase = isLocal
      ? "http://localhost:4000"
      : hostname === "buildxdesigner.site"
        ? "https://buildxdesigner.duckdns.org"
        : "";

    console.log("[Supabase] backendBase:", backendBase);

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
          toast.error(
            "Supabase integration session expired. Please reconnect.",
          );
          setSupabaseIntegrationToken(null);
        }
      })
      .finally(() => setIsLoadingSupabase(false));
  };

  useEffect(() => {
    setTempProjectName(projectName);
  }, [projectName]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [resolvedAvatarUrl]);

  const resolvedTemplatePublished =
    typeof isTemplatePublished === "boolean"
      ? isTemplatePublished
      : (currentProject?.published_template ??
        currentProject?.isTemplatePublished ??
        currentProject?.templatePublished ??
        currentProject?.published_template_id);

  useEffect(() => {
    if (isTogglingTemplatePublish) return;
    if (typeof resolvedTemplatePublished !== "boolean") return;
    setTemplatePublishedState(resolvedTemplatePublished);
  }, [isTogglingTemplatePublish, resolvedTemplatePublished]);

  useEffect(() => {
    const nextPermission =
      currentProject?.anyone_can === "edit" ? "edit" : "view";

    setAnyoneCanPermission(nextPermission);
  }, [currentProject?.anyone_can]);

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

  const handleTemplatePublishToggle = async (nextChecked: boolean) => {
    if (isTogglingTemplatePublish) return;

    if (nextChecked === templatePublishedState) return;

    const projectId = resolveProjectId();
    const userId = currentUser?.id;

    if (!projectId) {
      toast.error(
        "Unable to update template publish state: missing project id.",
      );
      return;
    }

    if (nextChecked && !userId) {
      toast.error("Unable to publish template: user not found.");
      return;
    }

    const previousState = templatePublishedState;
    setTemplatePublishedState(nextChecked);

    try {
      setIsTogglingTemplatePublish(true);

      const response = nextChecked
        ? await fetch(`${API_URL}/api/insert-template-data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, userId }),
        })
        : await fetch(`${API_URL}/api/publish-template/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            published_template: false,
            publishedTemplate: false,
            isPublished: false,
            ...(userId ? { userId } : {}),
          }),
        });

      const data = await response
        .clone()
        .json()
        .catch(async () => ({ raw: await response.text().catch(() => "") }));

      console.info("[EditorTopBar] template publish toggle response", {
        status: response.status,
        ok: response.ok,
        nextChecked,
        data,
      });

      if (!response.ok) {
        const rawMessage =
          data?.message || data?.error || data?.details || data?.raw || "";
        const normalizedMessage = String(rawMessage).toLowerCase();

        if (
          (nextChecked && response.status === 409) ||
          (nextChecked && normalizedMessage.includes("already")) ||
          (nextChecked && normalizedMessage.includes("duplicate")) ||
          (nextChecked && normalizedMessage.includes("unique"))
        ) {
          setTemplatePublishedState(true);
          onTemplatePublishedChange?.(true);
          toast.info("Template is already published.");
          return;
        }

        throw new Error(
          rawMessage
            ? `Failed to update template publish state (${response.status}): ${rawMessage}`
            : `Failed to update template publish state (${response.status}).`,
        );
      }

      setTemplatePublishedState(nextChecked);
      onTemplatePublishedChange?.(nextChecked);
      toast.success(
        nextChecked
          ? "Template published successfully."
          : "Template unpublished successfully.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update template publish state.";
      setTemplatePublishedState(previousState);
      console.error("[EditorTopBar] template publish toggle failed", error);
      toast.error(message);
    } finally {
      setIsTogglingTemplatePublish(false);
    }
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
      navigate(`${url.pathname}${url.search}${url.hash}`, { replace: true });
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

  useEffect(() => {
    if (!showShareDropdown) return;

    const projectId = resolveProjectId();
    if (!projectId) {
      setCollaborators([]);
      setCollaboratorsError("Missing project id.");
      return;
    }

    let didCancel = false;

    const fetchCollaborators = async () => {
      try {
        setIsLoadingCollaborators(true);
        setCollaboratorsError(null);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const requestInit: RequestInit = {
          method: "GET",
          headers,
        };

        if (typeof window !== "undefined") {
          const apiOrigin = new URL(API_URL, window.location.origin).origin;
          if (apiOrigin === window.location.origin) {
            requestInit.credentials = "include";
          }
        }

        const response = await fetch(
          `${API_URL}/api/view-permissions/${encodeURIComponent(projectId)}`,
          requestInit,
        );

        const payload = await response
          .clone()
          .json()
          .catch(async () => ({ raw: await response.text().catch(() => "") }));

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load collaborators.");
        }

        const rows = normalizeCollaboratorRows(payload);
        const dedupedByIdentity = new Map<string, ProjectCollaborator>();

        const rawAnyoneCan =
          payload?.anyone_can ??
          payload?.anyoneCan ??
          payload?.project?.anyone_can ??
          payload?.project?.anyoneCan ??
          payload?.permissions?.anyone_can ??
          payload?.permissions?.anyoneCan;

        const rawIsPublic =
          payload?.is_public ??
          payload?.isPublic ??
          payload?.project?.is_public ??
          payload?.project?.isPublic ??
          payload?.permissions?.project?.is_public ??
          payload?.permissions?.project?.isPublic;

        if (!didCancel) {
          if (rawAnyoneCan === "view" || rawAnyoneCan === "edit") {
            setAnyoneCanPermission(rawAnyoneCan);
          }

          if (typeof rawIsPublic === "boolean") {
            setShareVisibility(rawIsPublic ? "anyone" : "private");
          }
        }

        rows.forEach((row: any) => {
          const id = String(
            row?.user_id ??
            row?.userId ??
            row?.id ??
            row?.member_id ??
            row?.profile_id ??
            row?.profiles?.user_id ??
            "",
          ).trim();

          const email = String(
            row?.email ??
            row?.email_address ??
            row?.user_email ??
            row?.user?.email ??
            row?.profile?.email ??
            row?.profiles?.email ??
            row?.profiles?.email_address ??
            "",
          ).trim();

          const name = String(
            row?.full_name ??
            row?.name ??
            row?.display_name ??
            row?.user?.full_name ??
            row?.user?.name ??
            row?.profile?.full_name ??
            row?.profile?.name ??
            row?.profiles?.full_name ??
            row?.profiles?.name ??
            email.split("@")[0] ??
            "Collaborator",
          ).trim();

          const avatarUrl =
            row?.avatar_url ??
            row?.avatarUrl ??
            row?.user?.avatar_url ??
            row?.profile?.avatar_url ??
            row?.profiles?.avatar_url ??
            null;

          const isOwner =
            row?.is_owner === true ||
            String(row?.role || "").toLowerCase() === "owner";

          const role = formatRoleLabel(
            row?.role ?? row?.permission ?? row?.access_level,
            isOwner,
          );

          const key = `${id || ""}|${email.toLowerCase()}`;
          if (!key || key === "|") return;

          dedupedByIdentity.set(key, {
            id: id || email,
            name,
            email,
            avatarUrl,
            role,
            isCurrentUser:
              Boolean(currentUser?.id && id && currentUser.id === id) ||
              Boolean(
                currentUser?.email &&
                email &&
                currentUser.email.toLowerCase() === email.toLowerCase(),
              ),
          });
        });

        if (currentUser?.email || currentUser?.id) {
          const currentUserEmail = (currentUser?.email || "").toLowerCase();

          const alreadyPresent = Array.from(dedupedByIdentity.values()).some(
            (entry) => {
              const sameId =
                Boolean(currentUser?.id && entry.id) &&
                entry.id === currentUser.id;
              const sameEmail =
                Boolean(currentUserEmail && entry.email) &&
                entry.email.trim().toLowerCase() === currentUserEmail;

              return sameId || sameEmail;
            },
          );

          if (!alreadyPresent) {
            dedupedByIdentity.set(
              `self|${currentUser?.id || currentUserEmail}`,
              {
                id: currentUser?.id || currentUser?.email || "current-user",
                name:
                  currentUser?.name ||
                  currentUser?.email?.split("@")[0] ||
                  "User",
                email: currentUser?.email || "",
                avatarUrl: currentUser?.avatar_url || null,
                role: "Viewer",
                isCurrentUser: true,
              },
            );
          }
        }

        if (!didCancel) {
          setCollaborators(
            dedupeCollaboratorsByIdentity(
              Array.from(dedupedByIdentity.values()),
            ),
          );
        }
      } catch (error) {
        if (!didCancel) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load collaborators.";
          setCollaboratorsError(message);

          if (currentUser?.email || currentUser?.id) {
            setCollaborators([
              {
                id: currentUser?.id || currentUser?.email || "current-user",
                name:
                  currentUser?.name ||
                  currentUser?.email?.split("@")[0] ||
                  "User",
                email: currentUser?.email || "",
                avatarUrl: currentUser?.avatar_url || null,
                role: "Viewer",
                isCurrentUser: true,
              },
            ]);
          } else {
            setCollaborators([]);
          }
        }
      } finally {
        if (!didCancel) {
          setIsLoadingCollaborators(false);
        }
      }
    };

    void fetchCollaborators();

    return () => {
      didCancel = true;
    };
  }, [
    showShareDropdown,
    collaboratorsRefreshKey,
    currentProject?.id,
    currentUser?.id,
    currentUser?.email,
    currentUser?.name,
    currentUser?.avatar_url,
  ]);

  const applyShareVisibilityChange = async (
    nextVisibility: "private" | "anyone",
  ) => {
    if (!currentUserIsOwner) {
      toast.error("Only the owner can change project visibility.");
      return;
    }

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
    onProjectVisibilityChange?.(nextIsPublic);
    replaceBrowserUrl(nextUrl);

    if (!projectId) {
      setShareVisibility(previousVisibility);
      onProjectVisibilityChange?.(previousIsPublic);
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
      onProjectVisibilityChange?.(previousIsPublic);
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

  const updateAnyoneCanPermission = async (nextPermission: "view" | "edit") => {
    if (!currentUserIsOwner) {
      toast.error("Only the owner can change link permissions.");
      return;
    }

    const projectId = resolveProjectId();

    if (!projectId) {
      toast.error("Missing project id.");
      return;
    }

    const previousPermission = anyoneCanPermission;
    setAnyoneCanPermission(nextPermission);

    try {
      const response = await fetch(`${API_URL}/api/update-anyone-can`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          anyoneCan: nextPermission,
        }),
      });

      const data = await response
        .clone()
        .json()
        .catch(async () => ({ raw: await response.text().catch(() => "") }));

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Failed to update permission.",
        );
      }

      setCollaboratorsRefreshKey((prev) => prev + 1);
      toast.success(`Anyone with the link can now ${nextPermission}.`);
    } catch (error) {
      setAnyoneCanPermission(previousPermission);
      toast.error(
        error instanceof Error ? error.message : "Failed to update permission.",
      );
    }
  };

  const updatePermission = async (
    userId: string,
    newRole: "editor" | "viewer",
  ) => {
    if (!currentUserIsOwner) {
      toast.error("Only the owner can change collaborator permissions.");
      return;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      toast.error("Unable to update permission: missing project id.");
      return;
    }

    // Find the collaborator to preserve their current data
    const collaborator = collaborators.find((c) => c.id === userId);
    if (!collaborator) {
      toast.error("Collaborator not found.");
      return;
    }

    const previousRole = collaborator.role;
    const previousCollaborators = collaborators;

    // Optimistic update
    setCollaborators(
      collaborators.map((c) =>
        c.id === userId
          ? { ...c, role: newRole.charAt(0).toUpperCase() + newRole.slice(1) }
          : c,
      ),
    );
    setUpdatingPermissionFor(userId);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const requestInit: RequestInit = {
        method: "PUT",
        headers,
        body: JSON.stringify({
          projectId,
          userId,
          newRole,
        }),
      };

      if (typeof window !== "undefined") {
        const apiOrigin = new URL(API_URL, window.location.origin).origin;
        if (apiOrigin === window.location.origin) {
          requestInit.credentials = "include";
        }
      }

      const response = await fetch(
        `${API_URL}/api/update-permission`,
        requestInit,
      );

      const data = await response
        .clone()
        .json()
        .catch(async () => ({ raw: await response.text().catch(() => "") }));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update permission.");
      }

      toast.success(
        `Permission updated to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}.`,
      );
    } catch (error) {
      // Revert to previous state on error
      setCollaborators(previousCollaborators);
      const message =
        error instanceof Error ? error.message : "Failed to update permission.";
      console.error("[EditorTopBar] permission update failed", error);
      toast.error(message);
    } finally {
      setUpdatingPermissionFor(null);
    }
  };

  const handleAddCollaborator = async () => {
    if (!currentUserIsOwner) {
      toast.error("Only the owner can add collaborators.");
      return;
    }

    if (isAddingCollaborator) return;

    const projectId = resolveProjectId();
    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!projectId) {
      toast.error("Unable to add collaborator: missing project id.");
      return;
    }

    if (!normalizedEmail) {
      toast.error("Please enter an email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const alreadyExists = collaborators.some(
      (collaborator) =>
        collaborator.email.trim().toLowerCase() === normalizedEmail,
    );

    if (alreadyExists) {
      toast.info("This user is already a collaborator.");
      return;
    }

    try {
      setIsAddingCollaborator(true);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const requestInit: RequestInit = {
        method: "POST",
        headers,
      };

      if (typeof window !== "undefined") {
        const apiOrigin = new URL(API_URL, window.location.origin).origin;
        if (apiOrigin === window.location.origin) {
          requestInit.credentials = "include";
        }
      }

      const payloadCandidates = [
        { project_id: projectId, email: normalizedEmail },
        { projectId, email: normalizedEmail },
      ];

      let response: Response | null = null;
      let data: any = null;

      for (const payload of payloadCandidates) {
        response = await fetch(`${API_URL}/api/add-collaborator`, {
          ...requestInit,
          body: JSON.stringify(payload),
        });

        data = await response
          .clone()
          .json()
          .catch(async () => ({ raw: await response!.text().catch(() => "") }));

        if (response.ok) break;

        if (response.status !== 400 && response.status !== 422) {
          break;
        }
      }

      if (!response || !response.ok) {
        const message =
          data?.message ||
          data?.error ||
          data?.details ||
          data?.raw ||
          `Failed to add collaborator${response ? ` (${response.status})` : ""}.`;
        throw new Error(message);
      }

      setInviteEmail("");
      setCollaboratorsError(null);
      setCollaboratorsRefreshKey((prev) => prev + 1);
      toast.success("Collaborator added successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add collaborator.";
      toast.error(message);
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  const removeCollaborator = async (userId: string) => {
    if (!currentUserIsOwner) {
      toast.error("Only the owner can remove collaborators.");
      return;
    }

    if (removingCollaboratorFor) return;

    const projectId = resolveProjectId();
    if (!projectId) {
      toast.error("Unable to remove collaborator: missing project id.");
      return;
    }

    try {
      setRemovingCollaboratorFor(userId);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const requestInit: RequestInit = {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          projectId,
          userId,
        }),
      };

      if (typeof window !== "undefined") {
        const apiOrigin = new URL(API_URL, window.location.origin).origin;
        if (apiOrigin === window.location.origin) {
          requestInit.credentials = "include";
        }
      }

      const response = await fetch(
        `${API_URL}/api/remove-collaborator`,
        requestInit,
      );

      const data = await response
        .clone()
        .json()
        .catch(async () => ({ raw: await response.text().catch(() => "") }));

      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          data?.details ||
          data?.raw ||
          "Failed to remove collaborator.";
        throw new Error(message);
      }

      setCollaboratorsError(null);
      setCollaboratorsRefreshKey((prev) => prev + 1);
      toast.success("Collaborator removed successfully.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to remove collaborator.";
      toast.error(message);
    } finally {
      setRemovingCollaboratorFor(null);
    }
  };

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
      data-tour="toolbar-top"
      className="h-14 bg-card border-b border-border flex items-center justify-between px-4 relative z-100"
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
            data-tour="top-bar-page-selector"
            pages={pages}
            activePageId={activePageId}
            onSwitchPage={onSwitchPage}
            onAddPage={onAddPage}
            onRemovePage={onDeletePage}
            onDuplicatePage={onDuplicatePage}
            onUpdatePage={onUpdatePage}
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

        {onOpenGettingStarted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenGettingStarted}
            className="h-8 px-3 text-foreground/70 hover:text-foreground hover:bg-accent transition-colors gap-2 ml-1"
            title="Getting Started Guide"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline font-medium text-sm">Guide</span>
          </Button>
        )}
      </div>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-tour="design-mode"
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
                data-tour="code-view"
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
        <div className="hidden md:block" data-tour="save-progress">
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
                            localStorage.removeItem("target_supabase_service_key");
                            setTargetSupabaseUrl(null);
                            window.dispatchEvent(
                              new CustomEvent("userProjectConfigUpdated", {
                                detail: { supabaseUrl: "", supabaseKey: "", supabaseServiceKey: "" },
                              }),
                            );
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
                            setIsLoadingSupabase(true);
                            const token = localStorage.getItem(
                              "supabase_integration_token",
                            );
                            const hostname = window.location.hostname;
                            const isLocal =
                              hostname === "localhost" ||
                              hostname === "127.0.0.1";
                            const backendBase = isLocal
                              ? "http://localhost:4000"
                              : hostname === "buildxdesigner.site"
                                ? "https://buildxdesigner.duckdns.org"
                                : "";

                            const res = await fetch(
                              `${backendBase}/api/supabase/projects/${newProjectId}/api-keys`,
                              {
                                headers: { Authorization: `Bearer ${token}` },
                              },
                            );

                            if (!res.ok)
                              throw new Error(
                                "Failed to fetch project keys: " + res.status,
                              );
                            const keysData = await res.json();

                            const anonKeyObj = keysData.find(
                              (k: any) =>
                                k.name === "anon" || k.tags?.includes("anon"),
                            );

                            if (anonKeyObj) {
                              const newUrl = `https://${newProjectId}.supabase.co`;
                              const newKey = anonKeyObj.api_key;

                              console.log(
                                "Switching TARGET to project:",
                                newProjectId,
                              );
                              localStorage.setItem("target_supabase_url", newUrl);
                              localStorage.setItem("target_supabase_key", newKey);
                              window.dispatchEvent(
                                new CustomEvent("userProjectConfigUpdated", {
                                  detail: { supabaseUrl: newUrl, supabaseKey: newKey },
                                }),
                              );
                              toast.success(
                                `Successfully connected to: ${newProjectId}`,
                                {
                                  description: "The connection will be used for data operations.",
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
              data-tour="more-options"
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
                data-tour="save-button"
                onClick={onManualSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="cursor-pointer"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Template
            </DropdownMenuLabel>
            <div data-tour="publish-marketplace" className="flex items-center justify-between px-2 py-2 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-foreground/70" />
                <div className="text-sm text-foreground truncate">
                  Publish Template
                </div>
              </div>
              <Switch
                checked={templatePublishedState}
                disabled={isTogglingTemplatePublish}
                onCheckedChange={(checked: boolean) => {
                  void handleTemplatePublishToggle(checked);
                }}
                aria-label="Toggle template publish state"
              />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRenameClick}
              className="cursor-pointer"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Rename
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
            data-tour="top-bar-preview"
            variant="ghost"
            size="sm"
            onClick={onPreview}
            className="h-9 px-3 text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
          >
            <Play className="w-4 h-4" />
          </Button>
        )}


        <Button
          data-tour="database-integration"
          variant="ghost"
          size="sm"
          onClick={() => setShowSupabaseModal(true)}
          className={
            isSupabaseConnected
              ? "h-9 px-3 text-green-600 bg-green-50/50 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors gap-2 border border-green-200 dark:border-green-800"
              : "h-9 px-3 text-foreground/70 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          }
          title={
            isSupabaseConnected ? "Manage Integrations" : "Go to Integration"
          }
        >
          <Database className="w-4 h-4" />
          {isSupabaseConnected ? (
            <span className="hidden sm:inline font-medium">Connected</span>
          ) : (
            <span className="sr-only">Go to Integration</span>
          )}
        </Button>

        <Button
          data-tour="top-bar-publish-template"
          ref={publishButtonRef}
          onClick={handlePublishTemplateClick}
          size="sm"
          variant="outline"
          className="h-9 px-4 text-foreground border-border hover:bg-accent text-sm font-medium transition-colors bg-transparent"
        >
          Publish
        </Button>

        <Button
          data-tour="share"
          ref={shareButtonRef}
          onClick={handleShareClick}
          size="sm"
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <span>Share</span>
        </Button>



        {resolvedAvatarUrl && !avatarLoadFailed ? (
          <img
            src={resolvedAvatarUrl}
            alt={`${profileDisplayName} profile`}
            title={currentUser?.email || profileDisplayName}
            onError={() => setAvatarLoadFailed(true)}
            className="w-9 h-9 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity border border-border"
          />
        ) : (
          <div
            title={currentUser?.email || profileDisplayName}
            className="w-9 h-9 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity"
          >
            {profileDisplayName?.[0]?.toUpperCase() ||
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
        onPublishSuccess={(url, siteTitle, siteLogoUrl) => {
          if (onPublishSuccess) {
            // Extract subdomain from URL like https://subdomain.buildxdesigner.site
            const match = url.match(/https:\/\/([^.]+)\.buildxdesigner\.site/);
            if (match) onPublishSuccess(match[1], siteTitle, siteLogoUrl);
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
            <div className="p-6 space-y-6" data-tour="share-modal">
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

                {currentUserIsOwner && (
                  <div className="grid grid-cols-1 gap-2 items-end">
                    <div className="space-y-1">
                      <Label
                        htmlFor="invite-collaborator-email"
                        className="text-xs text-muted-foreground"
                      >
                        Invite by email
                      </Label>
                      <Input
                        id="invite-collaborator-email"
                        type="email"
                        placeholder="name@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleAddCollaborator();
                          }
                        }}
                        disabled={isAddingCollaborator}
                        className="h-9"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={() => void handleAddCollaborator()}
                      disabled={isAddingCollaborator || !inviteEmail.trim()}
                      className="h-9"
                    >
                      {isAddingCollaborator ? "Adding..." : "Add"}
                    </Button>
                  </div>
                )}

                {isLoadingCollaborators && (
                  <div className="text-xs text-muted-foreground">
                    Loading collaborators...
                  </div>
                )}

                {collaboratorsError && (
                  <div className="text-xs text-red-500">
                    {collaboratorsError}
                  </div>
                )}

                {!isLoadingCollaborators && collaborators.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No collaborators found.
                  </div>
                )}

                {collaborators.map((collaborator) => (
                  <div
                    key={`${collaborator.id}-${collaborator.email}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {collaborator.avatarUrl ? (
                        <img
                          src={collaborator.avatarUrl || "/placeholder.svg"}
                          alt={collaborator.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {collaborator.name?.[0]?.toUpperCase() ||
                            collaborator.email?.[0]?.toUpperCase() ||
                            "U"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {collaborator.name}
                          {collaborator.isCurrentUser ? " (you)" : ""}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {collaborator.email || "No email"}
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const canChangeRole =
                        currentUserIsOwner && !collaborator.isCurrentUser;

                      if (canChangeRole) {
                        return (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                void removeCollaborator(collaborator.id)
                              }
                              disabled={
                                removingCollaboratorFor === collaborator.id ||
                                updatingPermissionFor === collaborator.id
                              }
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              aria-label={`Remove ${collaborator.name}`}
                              title="Remove collaborator"
                            >
                              <X className="w-4 h-4" />
                            </Button>

                            <Select
                              value={collaborator.role.toLowerCase()}
                              onValueChange={(value: string) =>
                                updatePermission(
                                  collaborator.id,
                                  value as "editor" | "viewer",
                                )
                              }
                              disabled={
                                updatingPermissionFor === collaborator.id ||
                                removingCollaboratorFor === collaborator.id
                              }
                            >
                              <SelectTrigger className="px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md flex items-center gap-1 border-0 h-auto w-fit">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }

                      return (
                        <div className="px-3 py-1.5 text-sm text-muted-foreground bg-muted rounded-md flex items-center gap-1">
                          {collaborator.role}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Visibility
                </h4>
                <div className="relative">
                  <div
                    className={`flex items-center justify-between p-3 border-2 border-blue-500 rounded-lg transition-colors ${currentUserIsOwner
                      ? "cursor-pointer hover:bg-accent"
                      : "cursor-not-allowed opacity-60"
                      }`}
                    onClick={() => {
                      if (!currentUserIsOwner) return;
                      setShowVisibilityDropdown(!showVisibilityDropdown);
                    }}
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

                  {currentUserIsOwner && showVisibilityDropdown && (
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

                {shareVisibility === "anyone" && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Anyone with the link can
                    </h4>

                    <Select
                      value={anyoneCanPermission}
                      onValueChange={(value: "view" | "edit") => {
                        if (!currentUserIsOwner) return;
                        void updateAnyoneCanPermission(value);
                      }}
                      disabled={isUpdatingVisibility || !currentUserIsOwner}
                    >
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Select permission" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
        <DialogContent className="max-w-[400px]" data-tour="integration">
          <div>
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
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  <span className="font-semibold block mb-1">
                    External Integrations
                  </span>
                  Ready to go live? Connect your own <span className="font-medium text-indigo-900 dark:text-indigo-100">Supabase, Resend, and Paymongo</span> accounts to take full control of your data and payments.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  data-tour="go-to-integration"
                  onClick={() => {
                    setShowSupabaseModal(false);
                    setAccountSettingsTab("integration");
                    setShowAccountSettings(true);
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
          </div>
        </DialogContent>
      </Dialog>

      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        defaultTab={accountSettingsTab}
      />
    </div>
  );
}
