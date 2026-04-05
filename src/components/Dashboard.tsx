"use client";
import { getBackendUrl } from "../utils/backendConfig";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  MoreHorizontal,
  Grid3x3,
  List,
  ChevronDown,
  Sparkles,
  Layout,
  Folder,
  Trash2,
  Settings,
  LogOut,
  Plus,
  Eye,
  Copy,
  Sun,
  Moon,
  Monitor,
  Loader2,
  ArrowUp,
  ArrowRight,
  FileText,
  Heart,
  Flag,
  Store,
  Download,
  Check,
  Package,
  Calendar,
  Code2,
  User,
  Library,
  BookOpen,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import type { ComponentData } from "../App";
import { Textarea } from "./ui/textarea";
import { TemplateBrowserModal } from "./TemplateBrowserModal";
import { AccountSettingsModal } from "./AccountSettingsModal";
import { PlansModal } from "./PlansModal";
import { getSupabaseSession } from "../supabase/auth/authService";
import { supabase } from "../supabase/config/supabaseClient";
import { fetchUserProfile } from "../supabase/data/userProfile";
import {
  saveProject,
  saveProjectMetadata,
} from "../supabase/data/projectService";
import type { Project } from "../supabase/types/project";
import { generateUIAndCode } from "../services/geminiCodeGenerator";
import { CreateNewWebsiteModal } from "./CreateNewWebsiteModal"; // Added import
import { getApiBaseUrl } from "../utils/apiConfig";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { GettingStartedGuideContent } from "./GettingStartedModal";
import { BuildXIntroduction } from "./Guides/BuildXIntroduction";
import { WebsiteCreation } from "./Guides/WebsiteCreation";
import { PublishingBasics } from "./Guides/PublishingBasics";
import { DashboardOverview } from "./Guides/DashboardOverview";
import { PropertiesPanel } from "./Guides/PropertiesPanel";
import { AIAssistant } from "./Guides/AIAssistant";
import { CodeEditorTour } from "./Guides/CodeEditorTour";
import { ComponentsLibrary } from "./Guides/ComponentsLibrary";
import { SavingCollaboration } from "./Guides/SavingCollaboration";
import {
  fetchDraftProjectsFromApi,
  fetchTrendingTemplatesFromApi,
  fetchTrashedProjectsFromApi,
  insertTemplateFlagFromApi,
} from "../utils/apiHelper";
// MarketplaceComponentModal removed — import happens inline on card click
import { toast } from "sonner";
import { importPublishedComponent } from "../supabase/data/publishedComponentService";
import { deleteCustomComponent, updateCustomComponentPublicStatus, deletePublishedComponent } from "../supabase/data/customComponentService";
import { ReportTemplateModal } from "./FlagTemplateModal";
import { markStepComplete } from "../supabase/data/tutorialProgressService";

type DashboardSection =
  | "new-chat"
  | "drafts"
  | "team"
  | "all"
  | "trash"
  | "marketplace" | "custom";

const DASHBOARD_RETURN_SECTION_KEY = "dashboard_return_section";

const backendUrl = getBackendUrl();

interface DashboardProps {
  onCreateFromScratch: () => void;
  onOpenTemplates: () => void;
  onOpenAIGenerator: () => void;
  onOpenProject: (
    projectId: string,
    projectName: string,
    templateId?: string,
    isPublic?: boolean,
    authorId?: string,
  ) => void;
  onLogout?: () => void;
  theme?: "light" | "dark" | "system";
  onThemeChange?: (theme: "light" | "dark" | "system") => void;
  onLoadTemplate?: (components: ComponentData[]) => void;
  isSupabaseConnected?: boolean;
}

interface ProfileDisplayData {
  userId: string | null;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isConnected?: number;
}

const firstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
};

const resolveSessionAvatar = (user: any): string | null => {
  const metadata = (user?.user_metadata || {}) as Record<string, unknown>;
  const googleIdentity = Array.isArray(user?.identities)
    ? user.identities.find((identity: any) => identity?.provider === "google")
    : null;
  const identityData = (googleIdentity?.identity_data || {}) as Record<
    string,
    unknown
  >;

  return firstNonEmptyString(
    metadata.avatar_url,
    metadata.avatarUrl,
    metadata.picture,
    identityData.avatar_url,
    identityData.picture,
    user?.picture,
  );
};

interface TemplateCardData {
  id: string;
  projectId?: string;
  name: string;
  category: string;
  thumbnail: string;
  description: string;
  creator?: string;
  creatorAvatar?: string;
  views?: number;
  favorites?: number;
  premium: boolean;
  tags: string[];
}

interface PublishedTemplate {
  project_id: string;
  user_id: string;
  profiles: {
    user_id: string;
    full_name: string;
    avatar_url: string;
  };
  projects: {
    category: string | null;
    thumbnail: string;
    description: string;
    projects_id: string;
    is_published: boolean;
    project_name: string;
  };
}

interface SharedProject {
  user_id: string;
  project_id: string;
  role: string;
  projects: {
    user_id: string;
    thumbnail: string;
    description: string;
    projects_id: string;
    project_name: string;
    is_published?: boolean;
    owner_profile: {
      user_id: string;
      full_name: string;
      avatar_url: string;
    };
  };
}

const projectCategoryOptions = [
  "Starter",
  "Business",
  "Portfolio",
  "E-commerce",
  "Blog",
  "Restaurant",
  "Events",
  "Health",
  "Landing Page",
  "Other",
];

const normalizeProjectCategory = (category?: string) => {
  if (!category) return "Starter";
  return projectCategoryOptions.includes(category) ? category : "Other";
};

const API_URL =
  import.meta.env.VITE_API_URL || getApiBaseUrl() || "http://localhost:4000";

const getApiBaseCandidates = () => {
  const candidateSet = new Set<string>();

  if (API_URL) candidateSet.add(API_URL);

  const inferredApiBase = getApiBaseUrl();
  if (inferredApiBase) candidateSet.add(inferredApiBase);

  candidateSet.add("http://localhost:4000");

  return Array.from(candidateSet);
};

const normalizeProjectLikeRows = (raw: any) => {
  const payload = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.projectLikes)
      ? raw.projectLikes
      : Array.isArray(raw?.likes)
        ? raw.likes
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.rows)
            ? raw.rows
            : [];

  if (payload.length > 0) {
    return payload;
  }

  const mapPayload =
    raw?.likeCountsByProject ??
    raw?.countsByProjectId ??
    raw?.projectLikeCounts ??
    raw?.likesByProject ??
    raw?.counts ??
    null;

  if (mapPayload && typeof mapPayload === "object") {
    return Object.entries(mapPayload).map(([project_id, like_count]) => ({
      project_id,
      like_count,
    }));
  }

  return [];
};

const resolveTemplateProjectId = (item: any, fallback: string) =>
  String(
    item?.project_id ??
    item?.projectId ??
    item?.project?.projects_id ??
    item?.project?.project_id ??
    item?.project?.id ??
    item?.projects_id ??
    item?.projects?.projects_id ??
    item?.projects?.project_id ??
    item?.projects?.id ??
    item?.template_id ??
    item?.templateId ??
    item?.id ??
    item?._id ??
    fallback,
  ).trim();

// Mock recent projects with different statuses

export function Dashboard({
  onCreateFromScratch,
  onOpenTemplates,
  onOpenAIGenerator,
  onOpenProject,
  onLogout,
  theme = "dark",
  onThemeChange,
  onLoadTemplate,
  isSupabaseConnected,
}: DashboardProps) {
  // --- AUTHENTICATION STATES ---
  const [authLoading, setAuthLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileDisplayData>({
    userId: null,
    fullName: "Guest User",
    email: "",
    avatarUrl: null,
  });
  const currentUserId = profileData.userId;
  const userName = profileData.fullName;
  const userEmail = profileData.email;
  const userAvatarUrl = profileData.avatarUrl;
  const userInitial =
    profileData.fullName.substring(0, 2).toUpperCase() || "GU";
  const resolvedSidebarAvatarUrl =
    userAvatarUrl ||
    (userEmail
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=2563eb&color=ffffff&bold=true`
      : undefined);
  const [authError, setAuthError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]); // State for real projects
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [trashedProjects, setTrashedProjects] = useState<Project[]>([]);

  // --- EXISTING DASHBOARD STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("new-chat");
  const [projectsFilter, setProjectsFilter] = useState<
    "all" | "published" | "shared"
  >("all");
  const [showMakePrompt, setShowMakePrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showNameProjectDialog, setShowNameProjectDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  ); // Updated to string | null
  const [projectName, setProjectName] = useState("");
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
 
  const [showBuildXIntroductionTour, setShowBuildXIntroductionTour] =
    useState(false);
  const [showWebsiteCreationTour, setShowWebsiteCreationTour] = useState(false);
  const [showPublishingBasicsTour, setShowPublishingBasicsTour] =
    useState(false);
  const [tourCompletionKey, setTourCompletionKey] = useState(0);
  const [showGettingStartedPopup, setShowGettingStartedPopup] = useState(false);
  const [pendingGuidePopup, setPendingGuidePopup] = useState(false);
  const handleTourComplete = () => {
    setTourCompletionKey(prev => prev + 1);
  };
  const handleTourCompletedShowGuide = () => {
    handleTourComplete();
    setShowCreateTemplateModal(false);
    setSelectedTemplateId(null);
    setActiveSection("new-chat");
  };
  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanelTour] = useState(false);
  const [showAIAssistantTour, setShowAIAssistantTour] = useState(false);
  const [showCodeEditorTour, setShowCodeEditorTour] = useState(false);
  const [showComponentsLibraryTour, setShowComponentsLibraryTour] = useState(false);
  const [showSavingCollabTour, setShowSavingCollabTour] = useState(false);

  const [newProjectCategory, setNewProjectCategory] = useState("Starter");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsTab, setAccountSettingsTab] = useState("profile");
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false); // Start hidden on mobile
  const [publishedTemplates, setPublishedTemplates] = useState<
    PublishedTemplate[]
  >([]);
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [prefetchedTemplateLayouts, setPrefetchedTemplateLayouts] = useState<
    Record<string, ComponentData[]>
  >({});
  const [prefetchingTemplateIds, setPrefetchingTemplateIds] = useState<
    Record<string, boolean>
  >({});
  const [publishedTemplateCards, setPublishedTemplateCards] = useState<
    TemplateCardData[]
  >([]);
  const [likedTemplateIds, setLikedTemplateIds] = useState<
    Record<string, boolean>
  >({});
  const [likingTemplateIds, setLikingTemplateIds] = useState<
    Record<string, boolean>
  >({});
  const [projectLikeCounts, setProjectLikeCounts] = useState<
    Record<string, number>
  >({});
  const [projectLikesRows, setProjectLikesRows] = useState<any[]>([]);
  const [isApiReachable, setIsApiReachable] = useState(true);
  const projectLikesFetchErrorLoggedRef = useRef(false);
  const likeMutationAtRef = useRef<Record<string, number>>({});

  const LIKE_SYNC_COOLDOWN_MS = 10000;

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [pendingDeleteProject, setPendingDeleteProject] =
    useState<Project | null>(null);
  const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectCategory, setEditProjectCategory] = useState("Starter");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [isSavingProjectEdits, setIsSavingProjectEdits] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"last_modified" | "name">(
    "last_modified",
  );
  const [trendingTemplates, setTrendingTemplates] = useState<
    TemplateCardData[]
  >([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  const [marketplaceComponents, setMarketplaceComponents] = useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState("");
  const [marketplaceApiBase, setMarketplaceApiBase] = useState<string | null>(
    null,
  );
  const [isImporting, setIsImporting] = useState(false);
  const [showImportConfirmDialog, setShowImportConfirmDialog] = useState(false);
  const [selectedComponentForImport, setSelectedComponentForImport] =
    useState<any>(null);

  const [showMyComponentsModal, setShowMyComponentsModal] = useState(false);
  const [userCustomComponents, setUserCustomComponents] = useState<any[]>([]);
  const [userImportedComponents, setUserImportedComponents] = useState<any[]>(
    [],
  );
  const [userPublicComponents, setUserPublicComponents] = useState<any[]>([]);
  const [myComponentsLoading, setMyComponentsLoading] = useState(false);

  const [showDeleteComponentDialog, setShowDeleteComponentDialog] =
    useState(false);
  const [pendingDeleteComponent, setPendingDeleteComponent] =
    useState<any>(null);
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);

  const ALL_STEP_KEYS = ["dashboard", "palette", "website", "canvas", "properties", "ai", "code", "library", "collab", "publishing"];

  const completeTutorialStep = async (stepKey: string) => {
    if (currentUserId) {
      try {
        await markStepComplete(currentUserId, stepKey);
      } catch (err) {
        console.error(`Failed to save tutorial step ${stepKey}:`, err);
      }

      // Fetch real progress from DB to check if all done
      try {
        const { fetchTutorialProgress } = await import("../supabase/data/tutorialProgressService");
        const rows = await fetchTutorialProgress(currentUserId);
        const completedKeys = new Set(rows.filter(r => r.completed).map(r => r.step_key));
        
        const allDone = ALL_STEP_KEYS.every(key => completedKeys.has(key));
        if (allDone) {
          window.dispatchEvent(new Event("buildx-tutorial-completed"));
          return;
        }
      } catch (err) {
        console.error("Failed to fetch tutorial progress:", err);
      }
    } else {
      // localStorage-only path (no user logged in)
      localStorage.setItem(`buildx-tutorial-${stepKey}`, "1");
      const allDone = ALL_STEP_KEYS.every(
        key => key === stepKey || localStorage.getItem(`buildx-tutorial-${key}`) === "1"
      );
      if (allDone) {
        window.dispatchEvent(new Event("buildx-tutorial-completed"));
        return;
      }
    }

    handleTourCompletedShowGuide();
  };

  useEffect(() => {
    const handleTutorialComplete = () => {
      setTimeout(() => setShowCongratsPopup(true), 400);
    };
    window.addEventListener("buildx-tutorial-completed", handleTutorialComplete);
    return () => window.removeEventListener("buildx-tutorial-completed", handleTutorialComplete);
  }, []);

  useEffect(() => {
    if (activeSection === "marketplace") {
      setMarketplaceLoading(true);
      const apiBases = getApiBaseCandidates();
      (async () => {
        for (const base of apiBases) {
          try {
            const res = await fetch(`${backendUrl}/api/marketplace/components`);
            if (res.ok) {
              const data = await res.json();
              setMarketplaceComponents(data);
              setMarketplaceApiBase(base);
              break;
            }
          } catch (err) {
            console.warn(`Failed to fetch from ${base}:`, err);
          }
        }
        setMarketplaceLoading(false);
      })();
    }
  }, [activeSection]);

  useEffect(() => {
    if (currentUserId && activeSection === "marketplace") {
      fetchUserCustomComponents();
      fetchUserPublicComponents();
    }
  }, [currentUserId, activeSection]);
  const [showReportTemplateModal, setShowReportTemplateModal] = useState(false);
  const [selectedReportTemplate, setSelectedReportTemplate] =
    useState<TemplateCardData | null>(null);

  useEffect(() => {
    const openSettingsTab = localStorage.getItem("open_account_settings");

    if (openSettingsTab) {
      setAccountSettingsTab(openSettingsTab);
      setShowAccountSettings(true);

      localStorage.removeItem("open_account_settings");
    }
  }, []);

 

  // --- NEW STATES FOR REDESIGNED PROMPT SECTION ---
  const [selectedTemplateCategory, setSelectedTemplateCategory] =
    useState<string>("All");
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);

  const normalizeTemplateCard = (
    item: any,
    index: number,
  ): TemplateCardData => {
    const fallbackId = `template-${index}`;
    const resolvedProjectId = resolveTemplateProjectId(item, fallbackId);

    return {
      id: resolvedProjectId,
      projectId: resolvedProjectId,
      name: String(
        item?.name ??
        item?.title ??
        item?.project_name ??
        item?.project?.project_name ??
        item?.projects?.project_name ??
        "Untitled Template",
      ),
      description: String(
        item?.description ??
        item?.template_description ??
        item?.project_description ??
        item?.summary ??
        item?.project?.description ??
        item?.project?.project_description ??
        item?.projects?.description ??
        item?.projects?.project_description ??
        "No description available",
      ),
      thumbnail: String(
        item?.thumbnail ??
        item?.thumbnailUrl ??
        item?.image ??
        item?.project?.thumbnail ??
        item?.projects?.thumbnail ??
        "/placeholder.svg",
      ),
      category: String(
        item?.category ??
        item?.template_category ??
        item?.project_category ??
        item?.project?.category ??
        item?.project?.project_category ??
        item?.projects?.category ??
        item?.projects?.project_category ??
        "Business",
      ),
      premium: Boolean(
        item?.premium ?? item?.isPremium ?? item?.isPro ?? false,
      ),
      tags: Array.isArray(item?.tags)
        ? item.tags.map(String)
        : Array.isArray(item?.project?.tags)
          ? item.project.tags.map(String)
          : Array.isArray(item?.projects?.tags)
            ? item.projects.tags.map(String)
            : [],
      creator: item?.creator
        ? String(item.creator)
        : item?.author?.full_name
          ? String(item.author.full_name)
          : item?.profiles?.full_name
            ? String(item.profiles.full_name)
            : "BuildX Team",
      creatorAvatar: item?.creatorAvatar
        ? String(item.creatorAvatar)
        : item?.author?.avatar_url
          ? String(item.author.avatar_url)
          : item?.profiles?.avatar_url
            ? String(item.profiles.avatar_url)
            : "https://api.dicebear.com/7.x/initials/svg?seed=BuildX",
      views: Number(
        item?.views ?? item?.project?.views ?? item?.projects?.views ?? 0,
      ),
      favorites: Number(
        item?.favorites ??
        item?.like_count ??
        item?.likeCount ??
        item?.likes ??
        item?.project?.likes ??
        item?.projects?.likes ??
        0,
      ),
    };
  };

  const fetchMarketplaceComponents = async () => {
    try {
      setMarketplaceLoading(true);
      const apiBases = getApiBaseCandidates();

      for (const base of apiBases) {
        try {
          const res = await fetch(`${backendUrl}/api/marketplace/components`);
          if (res.ok) {
            const data = await res.json();
            setMarketplaceComponents(data);
            setMarketplaceApiBase(base);
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${base}:`, err);
        }
      }
    } catch (error) {
      console.error("Failed to refresh marketplace components:", error);
    } finally {
      setMarketplaceLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadTrendingTemplates = async () => {
      try {
        setTrendingLoading(true);

        const data = await fetchTrendingTemplatesFromApi(20);

        if (!mounted) return;

        const normalized = Array.isArray(data)
          ? data.map(normalizeTemplateCard)
          : [];

        setTrendingTemplates(normalized);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load trending templates:", error);
        setTrendingTemplates([]);
      } finally {
        if (mounted) {
          setTrendingLoading(false);
        }
      }
    };

    loadTrendingTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchPublishedTemplates = async () => {
      if (!currentUserId) {
        if (mounted) {
          setPublishedTemplateCards([]);
          setRecommendationsLoading(false);
        }
        return;
      }

      try {
        if (mounted) {
          setRecommendationsLoading(true);
        }

        const cbfApiUrl =
          import.meta.env.VITE_CBF_API_URL ||
          "http://buildx-cbfapi.buildxdesigner.site:5000";

        const response = await fetch(
          `${cbfApiUrl}/recommendations?user_id=${currentUserId}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch recommendations: ${response.status}`,
          );
        }

        const json = await response.json();

        const payload = Array.isArray(json)
          ? json
          : Array.isArray(json?.templates)
            ? json.templates
            : Array.isArray(json?.recommendations)
              ? json.recommendations
              : [];

        const recommendationLikeCounts = payload.reduce(
          (acc: Record<string, number>, item: any) => {
            const projectId = resolveTemplateProjectId(item, "");
            if (!projectId) return acc;

            const parsedLikeCount = Number(
              item?.like_count ??
              item?.likeCount ??
              item?.favorites ??
              item?.likes ??
              item?.project?.likes ??
              item?.projects?.likes,
            );

            if (Number.isFinite(parsedLikeCount) && parsedLikeCount >= 0) {
              acc[projectId] = parsedLikeCount;
            }

            return acc;
          },
          {},
        );

        if (mounted) {
          const normalizedCards = payload.map(normalizeTemplateCard);
          setPublishedTemplateCards(normalizedCards);

          if (Object.keys(recommendationLikeCounts).length > 0) {
            setProjectLikeCounts((prev) => ({
              ...prev,
              ...recommendationLikeCounts,
            }));
          }

          setIsApiReachable(true);
        }
      } catch (error) {
        if (mounted) {
          setIsApiReachable(false);
          setPublishedTemplateCards([]);
          console.error(
            "Failed to load recommended templates for dashboard:",
            error,
          );
        }
      } finally {
        if (mounted) {
          setRecommendationsLoading(false);
        }
      }
    };

    fetchPublishedTemplates();

    return () => {
      mounted = false;
    };
  }, [currentUserId]);

   const visibleRecommendedTemplates = publishedTemplateCards.filter(
    (t) => t.id !== "getting-started-guide" && t.id !== "getting-started",
  );

  const getTemplateLikeKey = (template: TemplateCardData) =>
    String(template.projectId ?? "").trim();

  const fetchAndSetProjectLikes = async () => {
    try {
      const apiBases = getApiBaseCandidates();

      let data: any = null;
      let lastError: unknown = null;

      for (const base of apiBases) {
        try {
          const url = currentUserId
            ? `${base}/api/project-likes?userId=${encodeURIComponent(currentUserId)}`
            : `${base}/api/project-likes`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch project likes from ${base}: ${response.status}`,
            );
          }

          data = await response.json();
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!data) {
        throw lastError ?? new Error("Failed to fetch project likes.");
      }

      const payload = normalizeProjectLikeRows(data);
      const interactionRows = Array.isArray(data?.projectLikes)
        ? data.projectLikes
        : Array.isArray(data?.likes)
          ? data.likes
          : Array.isArray(data?.interactions)
            ? data.interactions
            : [];

      const counts = payload.reduce((acc: Record<string, number>, row: any) => {
        const projectId = String(row?.project_id ?? "").trim();
        if (!projectId) return acc;

        const explicitCount = Number(row?.likeCount ?? row?.like_count);

        if (Number.isFinite(explicitCount) && explicitCount >= 0) {
          acc[projectId] = explicitCount;
        } else {
          acc[projectId] = (acc[projectId] ?? 0) + 1;
        }

        return acc;
      }, {});

      setProjectLikeCounts(counts);
      setProjectLikesRows(
        Array.isArray(interactionRows) ? interactionRows : [],
      );

      // Update liked status for current user
      if (currentUserId) {
        let likedProjectIds: string[] = [];

        // Try to get likedProjectIds from the response (new backend)
        if (Array.isArray(data?.likedProjectIds)) {
          likedProjectIds = data.likedProjectIds;
        }
        // Fallback: Build it from projectLikes array (old backend, deployed version)
        else if (Array.isArray(data?.projectLikes)) {
          likedProjectIds = data.projectLikes
            .filter(
              (row: any) =>
                String(row.user_id || "").trim() ===
                String(currentUserId).trim(),
            )
            .map((row: any) => String(row.project_id || "").trim())
            .filter(Boolean);
        }

        const likedMap = likedProjectIds.reduce(
          (acc: Record<string, boolean>, projectId: string) => {
            const trimmedId = String(projectId).trim();
            if (trimmedId) {
              acc[trimmedId] = true;
            }
            return acc;
          },
          {},
        );

        // Merge with existing state, keeping recently mutated likes for LIKE_SYNC_COOLDOWN_MS
        const now = Date.now();
        const mergedLikedMap = { ...likedMap };

        Object.keys(likedTemplateIds).forEach((projectId) => {
          const lastMutation = likeMutationAtRef.current[projectId];
          const timeSinceMutation = lastMutation
            ? now - lastMutation
            : Infinity;
          const shouldKeep =
            lastMutation && timeSinceMutation < LIKE_SYNC_COOLDOWN_MS;

          if (shouldKeep) {
            // Keep the optimistic state for recent mutations
            mergedLikedMap[projectId] = likedTemplateIds[projectId];
          }
        });

        setLikedTemplateIds(mergedLikedMap);
      }

      setIsApiReachable(true);
      projectLikesFetchErrorLoggedRef.current = false;
    } catch (error) {
      setIsApiReachable(false);
      if (!projectLikesFetchErrorLoggedRef.current) {
        console.error("Failed to fetch project likes:", error);
        projectLikesFetchErrorLoggedRef.current = true;
      }
    }
  };

  useEffect(() => {
    fetchAndSetProjectLikes();

    const intervalId = isApiReachable
      ? window.setInterval(() => {
        fetchAndSetProjectLikes();
      }, 15000)
      : null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAndSetProjectLikes();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isApiReachable, currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setLikedTemplateIds({});
      return;
    }
  }, [currentUserId]);

  const handleLikeTemplate = async (
    event: React.MouseEvent<HTMLButtonElement>,
    template: TemplateCardData,
  ) => {
    event.stopPropagation();

    if (!currentUserId) {
      alert("Please log in to like templates.");
      return;
    }

    const likeKey = getTemplateLikeKey(template);

    if (!likeKey) {
      alert("Template identifier is missing.");
      return;
    }

    if (likingTemplateIds[likeKey]) {
      return;
    }

    const isCurrentlyLiked = Boolean(likedTemplateIds[likeKey]);

    setLikingTemplateIds((prev) => ({ ...prev, [likeKey]: true }));
    try {
      const parseJsonSafe = async (res: Response) => {
        try {
          return await res.json();
        } catch {
          return null;
        }
      };

      const likeUrl = `${API_URL}/${isCurrentlyLiked ? "api/unlike-project" : "api/like-project"}`;

      const response = await fetch(likeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          projectId: likeKey,
        }),
      });

      const parsed = await parseJsonSafe(response);

      if (!response.ok) {
        const isIdempotentConflict =
          response.status === 409 ||
          (isCurrentlyLiked && response.status === 404);

        if (!isIdempotentConflict) {
          const detail =
            parsed?.error || parsed?.message || `status ${response.status}`;
          throw new Error(
            `${isCurrentlyLiked ? "Unlike" : "Like"} request failed: ${detail}`,
          );
        }
      }

      const data = parsed ?? {};
      const alreadyLiked =
        Boolean(data?.alreadyLiked) ||
        Boolean(data?.liked === true && !data?.interaction) ||
        (!isCurrentlyLiked && response.status === 409);
      const alreadyUnliked =
        Boolean(data?.alreadyUnliked) ||
        (isCurrentlyLiked &&
          (response.status === 404 || response.status === 409));

      likeMutationAtRef.current[likeKey] = Date.now();

      if (isCurrentlyLiked) {
        setLikedTemplateIds((prev) => ({ ...prev, [likeKey]: false }));
        if (!alreadyUnliked) {
          setProjectLikeCounts((prev) => ({
            ...prev,
            [likeKey]: Math.max((prev[likeKey] ?? 0) - 1, 0),
          }));
        }
      } else {
        setLikedTemplateIds((prev) => {
          const newState = { ...prev, [likeKey]: true };
          return newState;
        });
        if (!alreadyLiked) {
          setProjectLikeCounts((prev) => ({
            ...prev,
            [likeKey]: (prev[likeKey] ?? 0) + 1,
          }));
        }
      }

      setTimeout(() => {
        void fetchAndSetProjectLikes();
      }, 2000);
    } catch (error) {
      console.error(
        `Failed to ${isCurrentlyLiked ? "unlike" : "like"} template:`,
        error,
      );
      alert(
        `Failed to ${isCurrentlyLiked ? "unlike" : "like"} template. Please try again.`,
      );
    } finally {
      setLikingTemplateIds((prev) => ({ ...prev, [likeKey]: false }));
    }
  };

  const isTemplateLiked = (template: TemplateCardData) =>
    Boolean(likedTemplateIds[getTemplateLikeKey(template)]);

  const getTemplateLikeCount = (template: TemplateCardData) => {
    const projectId = getTemplateLikeKey(template);
    if (!projectId) {
      return template.favorites ?? 0;
    }

    if (publishedTemplateCards.length > 0) {
      return projectLikeCounts[projectId] ?? template.favorites ?? 0;
    }

    return projectLikeCounts[projectId] ?? template.favorites ?? 0;
  };

  const extractTemplateLayoutFromApiResponse = (
    payload: any,
  ): ComponentData[] => {
    const templateData = Array.isArray(payload?.templateData)
      ? payload.templateData
      : [];

    if (!templateData.length) return [];

    const projectLayout = templateData[0]?.projects?.project_layout;
    return Array.isArray(projectLayout)
      ? (projectLayout as ComponentData[])
      : [];
  };

  const fetchTemplateLayoutByProjectId = async (
    projectId: string,
  ): Promise<ComponentData[]> => {
    if (!projectId || projectId === "blank") {
      return getLocalTemplateComponents(projectId);
    }

    const response = await fetch(
      `${API_URL}/api/template-data/${encodeURIComponent(projectId)}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch template data: ${response.status}`);
    }

    const json = await response.json();
    return extractTemplateLayoutFromApiResponse(json);
  };

  const getLocalTemplateComponents = (templateId: string): ComponentData[] => {
    switch (templateId) {
      case "blank":
        return [];
      default:
        return [];
    }
  };

  const prefetchTemplateLayout = async (projectId: string) => {
    if (!projectId || projectId === "blank") return;
    if (prefetchedTemplateLayouts[projectId]) return;
    if (prefetchingTemplateIds[projectId]) return;

    setPrefetchingTemplateIds((prev) => ({ ...prev, [projectId]: true }));
    try {
      const layout = await fetchTemplateLayoutByProjectId(projectId);
      if (layout.length > 0) {
        setPrefetchedTemplateLayouts((prev) => ({
          ...prev,
          [projectId]: layout,
        }));
      }
    } catch (error) {
      console.error(
        `Failed to prefetch template layout for ${projectId}:`,
        error,
      );
    } finally {
      setPrefetchingTemplateIds((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  useEffect(() => {
    if (!showCreateTemplateModal || !selectedTemplateId) return;
    prefetchTemplateLayout(selectedTemplateId);
  }, [showCreateTemplateModal, selectedTemplateId]);

  useEffect(() => {
    if (!showCreateTemplateModal) return;
    if (localStorage.getItem("buildx-pending-editor-tour") === "1") {
      localStorage.removeItem("buildx-pending-editor-tour");
      const id = window.setTimeout(() => setShowWebsiteCreationTour(true), 250);
      return () => window.clearTimeout(id);
    }
  }, [showCreateTemplateModal]);

  // Add this useEffect near your other useEffects
  useEffect(() => {
    if (!showCreateTemplateModal) {
      // Check for any pending tours that need to fire when the modal closes
      // Canvas tour targets editor-only DOM; App.tsx consumes buildx-pending-canvas-tour on /editor.
      if (localStorage.getItem("buildx-pending-properties-tour") === "1") {
        localStorage.removeItem("buildx-pending-properties-tour");
        setTimeout(() => setShowPropertiesPanelTour(true), 100);
      } else if (localStorage.getItem("buildx-pending-ai-tour") === "1") {
        localStorage.removeItem("buildx-pending-ai-tour");
        setTimeout(() => setShowAIAssistantTour(true), 100);
      } else if (localStorage.getItem("buildx-pending-code-tour") === "1") {
        localStorage.removeItem("buildx-pending-code-tour");
        setTimeout(() => setShowCodeEditorTour(true), 100);
      } else if (localStorage.getItem("buildx-pending-collab-tour") === "1") {
        localStorage.removeItem("buildx-pending-collab-tour");
        setTimeout(() => setShowSavingCollabTour(true), 100);
      } else if (localStorage.getItem("buildx-pending-publishing-basics-tour") === "1") {
        localStorage.removeItem("buildx-pending-publishing-basics-tour");
        setTimeout(() => setShowPublishingBasicsTour(true), 100);
      }
    }
  }, [showCreateTemplateModal]);

  useEffect(() => {
    if (!pendingGuidePopup) return;

    const hasActiveTour =
      showBuildXIntroductionTour ||
      showWebsiteCreationTour ||
      showPublishingBasicsTour ||
      showDashboardTour ||
      showPropertiesPanel ||
      showAIAssistantTour ||
      showCodeEditorTour ||
      showComponentsLibraryTour ||
      showSavingCollabTour;

    if (hasActiveTour || showCreateTemplateModal) return;

    setShowGettingStartedPopup(true);
    setPendingGuidePopup(false);
  }, [
    pendingGuidePopup,
    showBuildXIntroductionTour,
    showWebsiteCreationTour,
    showPublishingBasicsTour,
    showDashboardTour,
    showPropertiesPanel,
    showAIAssistantTour,
    showCodeEditorTour,
    showComponentsLibraryTour,
    showSavingCollabTour,
    showCreateTemplateModal,
  ]);

  useEffect(() => {
    if (localStorage.getItem("buildx-guide-resume-from-editor-intro") === "1") {
      localStorage.removeItem("buildx-guide-resume-from-editor-intro");
      setActiveSection("new-chat");
      setTimeout(() => setShowBuildXIntroductionTour(true), 50);
      return;
    }
    if (localStorage.getItem("buildx-guide-resume-from-editor-dashboard") === "1") {
      localStorage.removeItem("buildx-guide-resume-from-editor-dashboard");
      setTimeout(() => setShowDashboardTour(true), 50);
      return;
    }
    if (localStorage.getItem("buildx-guide-resume-from-editor-library") === "1") {
      localStorage.removeItem("buildx-guide-resume-from-editor-library");
      setActiveSection("marketplace");
      setTimeout(() => setShowComponentsLibraryTour(true), 50);
      return;
    }
    if (localStorage.getItem("buildx-guide-resume-from-editor-website") === "1") {
      localStorage.removeItem("buildx-guide-resume-from-editor-website");
      setSelectedTemplateId("blank");
      setShowCreateTemplateModal(true);
      localStorage.setItem("buildx-pending-editor-tour", "1");
      return;
    }
    if (localStorage.getItem("buildx-guide-resume-from-editor-publishing") === "1") {
      localStorage.removeItem("buildx-guide-resume-from-editor-publishing");
      setSelectedTemplateId("blank");
      setShowCreateTemplateModal(true);
      localStorage.setItem("buildx-pending-publishing-basics-tour", "1");
    }
  }, []);

  // --- AUTHENTICATION EFFECT (UPDATED TO FETCH RICH PROFILE DATA) ---
  useEffect(() => {
    let mounted = true;

    const loadUserData = async () => {
      if (!mounted) return;
      setAuthLoading(true);
      setAuthError(null);

      const {
        data: { session },
      } = await getSupabaseSession();

      if (!mounted) return;

      if (session?.user) {
        const { data: fullProfile, error: profileError } =
          await fetchUserProfile();

        if (!mounted) return;

        const user = session.user;
        const metadata = (user.user_metadata || {}) as Record<string, unknown>;
        const sessionAvatarUrl = resolveSessionAvatar(user);
        if (profileError || !fullProfile) {
          setProfileData({
            userId: user.id,
            fullName:
              firstNonEmptyString(
                metadata.full_name,
                metadata.name,
                user.email?.split("@")[0],
              ) || "User",
            email: user.email || "",
            avatarUrl: sessionAvatarUrl,
          });
          console.error("Failed to load full profile data:", profileError);
        } else {
          setProfileData({
            userId: fullProfile.user_id,
            fullName:
              firstNonEmptyString(
                fullProfile.fullName,
                metadata.full_name,
                metadata.name,
                fullProfile.email?.split("@")?.[0],
              ) || "User",
            email: fullProfile.email,
            avatarUrl: firstNonEmptyString(
              fullProfile.avatarUrl,
              sessionAvatarUrl,
            ),
            isConnected: fullProfile.isConnected,
          });
        }
      } else {
        if (onLogout) {
          onLogout();
        } else {
          setAuthError("Authentication session not found. Please log in.");
        }
      }
      setAuthLoading(false);
    };

    loadUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        loadUserData();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [onLogout]);

  useEffect(() => {
    let mounted = true;
    const loadUserProjects = async () => {
      if (!mounted) return;
      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const projects = await fetchDraftProjectsFromApi(profileData.userId!);
        if (!mounted) return;
        setProjects(projects);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load user projects:", error);
        setProjectsError("Failed to load projects. Please try again.");
        setProjects([]);
      }

      setProjectsLoading(false);
    };

    if (profileData.userId) {
      loadUserProjects();
    }

    return () => {
      mounted = false;
    };
  }, [profileData.userId]);

  useEffect(() => {
    let mounted = true;

    const loadProjectsByFilter = async () => {
      if (activeSection !== "all" || !profileData.userId) return;

      setProjectsLoading(true);
      setProjectsError(null);

      try {
        if (projectsFilter === "all") {
          try {
            const projects = await fetchDraftProjectsFromApi(
              profileData.userId,
            );
            if (!mounted) return;
            setProjects(projects);
          } catch (error) {
            if (!mounted) return;
            console.error("Failed to load user projects:", error);
            setProjectsError("Failed to load projects. Please try again.");
            setProjects([]);
          }

          const apiBaseUrl = getApiBaseUrl();
          const [publishedResponseResult, sharedResponseResult] =
            await Promise.allSettled([
              fetch(
                `${apiBaseUrl}/api/published-templates?userId=${profileData.userId}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              ),
              fetch(
                `${apiBaseUrl}/api/shared-projects?userId=${profileData.userId}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              ),
            ]);

          if (!mounted) return;

          if (
            publishedResponseResult.status === "fulfilled" &&
            publishedResponseResult.value.ok
          ) {
            const publishedData = await publishedResponseResult.value.json();
            setPublishedTemplates(publishedData.publishedTemplates || []);
          } else {
            setPublishedTemplates([]);
          }

          if (
            sharedResponseResult.status === "fulfilled" &&
            sharedResponseResult.value.ok
          ) {
            const sharedData = await sharedResponseResult.value.json();
            setSharedProjects(sharedData.sharedProjects || []);
          } else {
            setSharedProjects([]);
          }
        } else if (projectsFilter === "published") {
          const apiBaseUrl = getApiBaseUrl();
          const response = await fetch(
            `${apiBaseUrl}/api/published-templates?userId=${profileData.userId}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          if (!mounted) return;

          if (response.ok) {
            const data = await response.json();
            setPublishedTemplates(data.publishedTemplates || []);
            setProjects([]);
          } else {
            console.error(
              "Failed to fetch published templates:",
              response.statusText,
            );
            setPublishedTemplates([]);
            setProjects([]);
          }
        } else if (projectsFilter === "shared") {
          const apiBaseUrl = getApiBaseUrl();
          const response = await fetch(
            `${apiBaseUrl}/api/shared-projects?userId=${profileData.userId}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          if (!mounted) return;

          if (response.ok) {
            const data = await response.json();
            setSharedProjects(data.sharedProjects || []);
            setProjects([]);
          } else {
            console.error(
              "Failed to fetch shared projects:",
              response.statusText,
            );
            setSharedProjects([]);
            setProjects([]);
          }
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Error loading projects:", err);
        setProjectsError("An error occurred while loading projects.");
        setProjects([]);
      } finally {
        if (mounted) {
          setProjectsLoading(false);
        }
      }
    };

    loadProjectsByFilter();

    return () => {
      mounted = false;
    };
  }, [projectsFilter, activeSection, profileData.userId]);

  useEffect(() => {
    let mounted = true;

    const loadTrashedProjects = async () => {
      if (activeSection !== "trash" || !profileData.userId) return;

      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const trashed = await fetchTrashedProjectsFromApi(profileData.userId);
        console.log("trashed projects from api", trashed);
        if (!mounted) return;
        setTrashedProjects(trashed);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load trashed projects:", error);
        setProjectsError("Failed to load trashed projects. Please try again.");
        setTrashedProjects([]);
      } finally {
        if (mounted) {
          setProjectsLoading(false);
        }
      }
    };

    loadTrashedProjects();

    return () => {
      mounted = false;
    };
  }, [activeSection, profileData.userId]);

  // --- AUTH LOGOUT HANDLER ---
  const handleLogout = async () => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signOut();
    setAuthLoading(false);
    if (error) {
      console.error("Error signing out:", error);
      setAuthError("Logout failed. Try again.");
    }
  };

  // Filter projects based on active section
  const getFilteredProjects = () => {
    let filtered = projects;

    switch (activeSection) {
      case "drafts":
        filtered = projects.filter((p) => p.status === "draft");
        break;
      case "team":
        filtered = projects.filter((p) => p.status === "team" || p.teamName);
        break;
      case "trash":
        filtered = trashedProjects;
        break;
      case "all":
        filtered = projects.filter((p) => p.status !== "trash");
        break;
      case "new-chat":
      default:
        filtered = [];
        break;
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;

      return bTime - aTime;
    });

    return sorted;
  };

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowTemplateBrowser(false);
    setShowNameProjectDialog(true);
  };

  const handleTemplateSelectFromModal = async (
    templateId: string,
    projectName: string,
    projectCategory: string,
    projectDescription?: string,
  ) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) return;
    const normalizedCategory = normalizeProjectCategory(projectCategory);
    const trimmedDescription = projectDescription?.trim() || "";

    const {
      data: { session },
    } = await getSupabaseSession();
    const user_id = session?.user?.id;

    if (!user_id) {
      console.error("User session required to create a project.");
      return;
    }

    let templateComponents = prefetchedTemplateLayouts[templateId] || [];

    if (templateComponents.length === 0) {
      try {
        const fetchedLayout = await fetchTemplateLayoutByProjectId(templateId);
        if (fetchedLayout.length > 0) {
          templateComponents = fetchedLayout;
          setPrefetchedTemplateLayouts((prev) => ({
            ...prev,
            [templateId]: fetchedLayout,
          }));
        }
      } catch (error) {
        console.error(
          `Failed to fetch template layout for ${templateId} during project creation:`,
          error,
        );
      }
    }

    if (templateComponents.length === 0 && templateId !== "blank") {
      alert("Template layout could not be loaded.");
      return;
    }

    const newProjectData: Partial<Project> & { user_id: string } = {
      name: trimmedProjectName,
      description:
        trimmedDescription ||
        `${normalizedCategory} website · Created ${new Date().toLocaleDateString()}`,
      category: normalizedCategory,
      thumbnail:
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop",
      user_id: user_id,
      type: "design",
      status: "draft",
      project_layout: templateComponents,
    };

    const { data: savedProject, error: saveError } =
      await saveProject(newProjectData);

    if (saveError || !savedProject) {
      console.error("Error saving new project to database:", saveError);
      alert("Failed to create project. Please try again.");
      return;
    }

    const refreshedProjects = await fetchDraftProjectsFromApi(user_id);
    setProjects(refreshedProjects);

    onOpenProject(savedProject.id, savedProject.name, templateId);

    if (onLoadTemplate && templateComponents.length > 0) {
      onLoadTemplate(templateComponents);
    }
  };

  const handleQuickTemplateClick = (template: TemplateCardData) => {
    

    setSelectedTemplateId(template.id);
    setShowTemplateBrowser(false);
    setShowCreateTemplateModal(true);
  };

  const handleCreateProject = async () => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) return;

    setShowNameProjectDialog(false);

    const {
      data: { session },
    } = await getSupabaseSession();
    const user_id = session?.user?.id;

    if (!user_id) {
      console.error("User session required to create a project.");
      return;
    }

    const templateId = selectedTemplateId as string;
    let templateComponents: ComponentData[] = [];

    if (templateId && templateId !== "blank") {
      templateComponents = prefetchedTemplateLayouts[templateId] || [];

      if (templateComponents.length === 0) {
        try {
          templateComponents = await fetchTemplateLayoutByProjectId(templateId);
        } catch (error) {
          console.error("Failed to fetch template layout:", error);
          alert("Template layout could not be loaded.");
          return;
        }
      }
    }
    const normalizedCategory = normalizeProjectCategory(newProjectCategory);

    const newProjectData: Partial<Project> & { user_id: string } = {
      name: trimmedProjectName,
      description:
        newProjectDescription.trim() ||
        `${normalizedCategory} website · Created ${new Date().toLocaleDateString()}`,
      category: normalizedCategory,
      thumbnail:
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop", // Use a generic default thumbnail
      user_id: user_id,
      type: "design",
      status: "draft",
      project_layout: templateComponents,
    };

    const { data: savedProject, error: saveError } =
      await saveProject(newProjectData);

    if (saveError) {
      console.error("Error saving new project to database:", saveError);
      alert("Failed to create project. Please try again.");
      setProjectName(trimmedProjectName);
      return;
    }

    if (savedProject) {
      const refreshedProjects = await fetchDraftProjectsFromApi(user_id);
      setProjects(refreshedProjects);

      // First set the opened project so App knows the currentProjectId
      onOpenProject(
        savedProject.id,
        savedProject.name,
        selectedTemplateId as string,
      );

      // Then load template components into the editor
      if (onLoadTemplate && templateComponents.length > 0) {
        onLoadTemplate(templateComponents);
      }
    }

    setProjectName("");
    setNewProjectDescription("");
    setNewProjectCategory("Starter");
  };

  const handleCreateBlankProject = async () => {
    try {
      setProjectsLoading(true);

      const {
        data: { session },
      } = await getSupabaseSession();
      const user_id = session?.user?.id;

      if (!user_id) {
        console.error("User session required to create a project.");
        alert("Please log in to create a project.");
        setProjectsLoading(false);
        return;
      }

      const newProjectData: Partial<Project> & { user_id: string } = {
        name: "Untitled Project",
        description: `Created ${new Date().toLocaleDateString()}`,
        category: "Starter",
        thumbnail:
          "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop",
        user_id: user_id,
        type: "design",
        status: "draft",
      };

      const { data: savedProject, error: saveError } =
        await saveProject(newProjectData);

      if (saveError || !savedProject) {
        console.error("Error saving blank project to database:", saveError);
        alert("Failed to create project. Please try again.");
        setProjectsLoading(false);
        return;
      }

      // Refresh projects list
      const refreshedProjects = await fetchDraftProjectsFromApi(user_id);
      setProjects(refreshedProjects);

      setProjectsLoading(false);

      // Open the project in the editor
      onOpenProject(savedProject.id, savedProject.name, "blank");
    } catch (err) {
      console.error("Failed to create blank project:", err);
      setProjectsLoading(false);
      alert("Failed to create project. Check console for details.");
    }
  };

  // Handler to duplicate a project
  const handleDuplicateProject = async (project: Project) => {
    try {
      setProjectsLoading(true);
      const {
        data: { session },
      } = await getSupabaseSession();
      const user_id = session?.user?.id;
      if (!user_id) {
        throw new Error("User session required to duplicate a project.");
      }
      const duplicatedProjectData: Partial<Project> & { user_id: string } = {
        name: project.name + " (Copy)",
        description: project.description,
        thumbnail: project.thumbnail,
        user_id: user_id,
        type: project.type,
        status: "draft",
        project_layout: project.project_layout,
      };
      const { data: duplicatedProject, error: duplicateError } =
        await saveProject(duplicatedProjectData);
      if (duplicateError) {
        throw duplicateError;
      }
      const refreshedProjects = await fetchDraftProjectsFromApi(user_id);
      setProjects(refreshedProjects);
      setProjectsLoading(false);
    } catch (err) {
      console.error("Failed to duplicate project:", err);
      setProjectsLoading(false);
      alert("Failed to duplicate project. Check console for details.");
    }
  };

  // Utility function to reload projects (defined here for convenience in the handler)
  const reloadProjects = async () => {
    if (!profileData.userId) return;

    setProjectsLoading(true);
    try {
      const [refreshedProjects, refreshedTrashedProjects] = await Promise.all([
        fetchDraftProjectsFromApi(profileData.userId),
        fetchTrashedProjectsFromApi(profileData.userId),
      ]);

      setProjects(refreshedProjects);
      setTrashedProjects(refreshedTrashedProjects);
    } catch (error) {
      console.error("Error refreshing projects after update:", error);
    }
    setProjectsLoading(false);
  };

  useEffect(() => {
    if (!profileData.userId) {
      setTrashedProjects([]);
    }
  }, [profileData.userId]);

  const handleDeleteProject = async (projectId: string) => {
    try {
      setProjectsLoading(true);

      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("projects_id", projectId);

      if (deleteError) {
        throw deleteError;
      }

      setShowDeleteConfirmDialog(false);
      setPendingDeleteProject(null);

      await reloadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
      setProjectsLoading(false);
      alert("Failed to delete project. Check console for details.");
    }
  };

  const openDeleteProjectDialog = (project: Project) => {
    setPendingDeleteProject(project);
    setShowDeleteConfirmDialog(true);
  };

  const getProjectCreatedDateLabel = (project: Project | null) => {
    if (!project) return "Created recently";

    const rawDate =
      (project as any)?.createdAt ??
      (project as any)?.created_at ??
      project.lastModified;

    if (!rawDate) return "Created recently";

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return "Created recently";

    return `Created ${parsed.toLocaleDateString()}`;
  };

  const openEditProjectDialog = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name || "");
    setEditProjectDescription(project.description || "");
    setEditProjectCategory(normalizeProjectCategory(project.category));
    setShowEditProjectDialog(true);
  };

  const resetEditProjectDialog = () => {
    setShowEditProjectDialog(false);
    setEditingProject(null);
    setEditProjectName("");
    setEditProjectDescription("");
    setEditProjectCategory("Starter");
    setIsSavingProjectEdits(false);
  };

  const handleSaveProjectEdits = async () => {
    if (!editingProject) return;
    if (!currentUserId) {
      alert("Please log in to edit this project.");
      return;
    }

    const trimmedName = editProjectName.trim();
    if (!trimmedName) return;

    try {
      setIsSavingProjectEdits(true);

      const { error } = await saveProjectMetadata({
        id: editingProject.id,
        user_id: currentUserId,
        name: trimmedName,
        description: editProjectDescription.trim(),
        category: normalizeProjectCategory(editProjectCategory),
      });

      if (error) {
        throw error;
      }

      const refreshedProjects = await fetchDraftProjectsFromApi(currentUserId);
      setProjects(refreshedProjects);

      if (profileData.userId && projectsFilter === "published") {
        const apiBaseUrl = getApiBaseUrl();
        const publishedResponse = await fetch(
          `${apiBaseUrl}/api/published-templates?userId=${profileData.userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (publishedResponse.ok) {
          const publishedData = await publishedResponse.json();
          setPublishedTemplates(publishedData.publishedTemplates || []);
        }
      }

      if (profileData.userId && projectsFilter === "shared") {
        const apiBaseUrl = getApiBaseUrl();
        const sharedResponse = await fetch(
          `${apiBaseUrl}/api/shared-projects?userId=${profileData.userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (sharedResponse.ok) {
          const sharedData = await sharedResponse.json();
          setSharedProjects(sharedData.sharedProjects || []);
        }
      }

      resetEditProjectDialog();
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("Failed to update project. Please try again.");
    } finally {
      setIsSavingProjectEdits(false);
    }
  };

  const handleMoveProjectToStatus = async (
    projectId: string,
    status: Project["status"],
  ) => {
    try {
      setProjectsLoading(true);

      const { error } = await supabase
        .from("projects")
        .update({ status })
        .eq("projects_id", projectId);

      if (error) {
        throw error;
      }

      await reloadProjects();
    } catch (err) {
      console.error(`Failed to move project to ${status}:`, err);
      setProjectsLoading(false);
      alert(`Failed to move project to ${status}. Check console for details.`);
    }
  };

  const handleImportComponent = async () => {
    if (!selectedComponentForImport || !currentUserId) {
      toast.error("Please log in to import components.");
      return;
    }

    try {
      setIsImporting(true);

      let targetProjectId: string;

      const { data: userProjects, error: projectsError } = await supabase
        .from("projects")
        .select("projects_id")
        .eq("user_id", currentUserId)
        .limit(1);

      if (projectsError || !userProjects || userProjects.length === 0) {
        const { data: newProject, error: createError } = await supabase
          .from("projects")
          .insert({
            user_id: currentUserId,
            name: "My Components",
            description: "My personal component library",
            category: "Other",
            status: "draft",
          })
          .select("projects_id")
          .single();

        if (createError || !newProject) {
          throw new Error("Failed to create a project for your components.");
        }

        targetProjectId = newProject.projects_id;
      } else {
        targetProjectId = userProjects[0].projects_id;
      }

      const { data, error } = await importPublishedComponent(targetProjectId, {
        name: selectedComponentForImport.name,
        component_json: {
          ...selectedComponentForImport.component_json,
          props: {
            ...selectedComponentForImport.component_json?.props,
            importedFrom: true,
            original_creator_id: selectedComponentForImport.user_id,
            marketplaceId: selectedComponentForImport.id,
            imported_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        throw error;
      }

      toast.success(
        `"${selectedComponentForImport.name}" has been imported to your components!`,
      );

      await fetchUserCustomComponents();
      await fetchUserPublicComponents();

      setShowImportConfirmDialog(false);
      setSelectedComponentForImport(null);
    } catch (error) {
      console.error("Failed to import component:", error);
      toast.error("Failed to import component. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const fetchUserCustomComponents = async () => {
    if (!currentUserId) {
      setUserCustomComponents([]);
      setUserImportedComponents([]);
      setUserPublicComponents([]);
      return;
    }

    try {
      setMyComponentsLoading(true);

      const { data: userProjects, error: projectsError } = await supabase
        .from("projects")
        .select("projects_id")
        .eq("user_id", currentUserId);

      if (projectsError) {
        throw projectsError;
      }

      if (!userProjects || userProjects.length === 0) {
        setUserCustomComponents([]);
        setUserImportedComponents([]);
        setUserPublicComponents([]);
        return;
      }

      const projectIds = userProjects.map((p) => p.projects_id);

      const { data: allComponents, error: componentsError } = await supabase
        .from("custom_components")
        .select(
          `
          *,
          projects!inner(
            user_id
          )
        `,
        )
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      if (componentsError) {
        throw componentsError;
      }

      const imported: any[] = [];
      const created: any[] = [];

      if (allComponents) {
        for (const component of allComponents) {
          const componentData = component.component_json;
          const isImported =
            componentData?.props?.importedFrom ||
            componentData?.marketplaceId ||
            componentData?.original_creator_id !== currentUserId;

          if (isImported) {
            imported.push({
              ...component,
              imported: true,
              original_creator_id: componentData?.original_creator_id,
            });
          } else {
            created.push({
              ...component,
              imported: false,
              isPublic: false,
            });
          }
        }
      }

      setUserImportedComponents(imported);
      setUserCustomComponents(created);
    } catch (error) {
      console.error("Failed to fetch user components:", error);
      toast.error("Failed to load your components.");
      setUserCustomComponents([]);
      setUserImportedComponents([]);
    } finally {
      setMyComponentsLoading(false);
    }
  };

  const fetchUserPublicComponents = async () => {
    if (!currentUserId) {
      setUserPublicComponents([]);
      return;
    }

    try {
      setMyComponentsLoading(true);

      const { data: publishedComponents, error: publishedError } = await supabase
        .from("published_components")
        .select(`
          *,
          custom_components!inner(
            id,
            name,
            component_json,
            created_at,
            isPublic,
            projects!inner(
              user_id
            )
          )
        `)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (publishedError) {
        throw publishedError;
      }

      const publicComponents = publishedComponents?.map((pubComp) => ({
        ...pubComp.custom_components,
        id: pubComp.custom_components?.id || pubComp.id,
        name: pubComp.name,
        component_json: pubComp.component_json,
        created_at: pubComp.custom_components?.created_at || pubComp.created_at,
        isPublic: true,
        published_id: pubComp.id,
      })) || [];

      setUserPublicComponents(publicComponents);
    } catch (error) {
      console.error("Failed to fetch public components:", error);
      toast.error("Failed to load your public components.");
      setUserPublicComponents([]);
    } finally {
      setMyComponentsLoading(false);
    }
  };

  const openDeleteComponentDialog = (component: any) => {
    setPendingDeleteComponent(component);
    setShowDeleteComponentDialog(true);
  };

  const handleDeleteComponent = async () => {
    if (!pendingDeleteComponent) return;

    try {
      // Check if it's a public component
      if (pendingDeleteComponent.isPublic && pendingDeleteComponent.published_id) {
        // Delete from published_components and update isPublic to 0
        const { error: deleteError } = await deletePublishedComponent(pendingDeleteComponent.published_id);
        if (deleteError) throw deleteError;

        const { error: updateError } = await updateCustomComponentPublicStatus(pendingDeleteComponent.id, false);
        if (updateError) throw updateError;

        toast.success(`"${pendingDeleteComponent.name}" has been removed from public components.`);
      } else {
        // Regular delete for imported/created components
        const { error } = await deleteCustomComponent(pendingDeleteComponent.id);
        if (error) throw error;

        toast.success(`"${pendingDeleteComponent.name}" has been deleted.`);
      }

      setShowDeleteComponentDialog(false);
      setPendingDeleteComponent(null);

      await fetchUserCustomComponents();
      await fetchUserPublicComponents();
      await fetchMarketplaceComponents(); // Refresh marketplace when public component is deleted
    } catch (error) {
      console.error("Failed to delete component:", error);
      toast.error("Failed to delete component. Please try again.");
    }
  };

  const isComponentImported = (componentId: string) => {
    return userImportedComponents.some(
      (cc) =>
        cc.component_json?.props?.marketplaceId === componentId ||
        (cc.component_json?.props?.importedFrom === true &&
          cc.component_json?.props?.marketplaceId === componentId),
    );
  };

  const generateUIWithGemini = async (prompt: string) => {
    try {
      setIsGenerating(true);
      setGenerationProgress(10);

      const {
        data: { session },
      } = await getSupabaseSession();
      const user_id = session?.user?.id;

      if (!user_id) {
        throw new Error("User session required to save AI-generated project.");
      }

      const apiKey =
        localStorage.getItem("gemini-api-key") ||
        "jeheksofndjdosjskaishsksmaajkanaj";

      const { components, code } = await generateUIAndCode(
        prompt,
        apiKey,
        (progress) => {
          setGenerationProgress(progress);
        },
      );

      setGenerationProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const initialProjectName =
        prompt.substring(0, 50) + (prompt.length > 50 ? "..." : "");
      const newProjectData: Partial<Project> & { user_id: string } = {
        name: initialProjectName,
        description: "AI Generated Project",
        thumbnail:
          "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=300&fit=crop", // Generic thumbnail
        user_id: user_id,
        type: "design",
        status: "draft",
        project_layout: components,
      };

      const { data: savedProject, error: saveError } =
        await saveProject(newProjectData);

      if (saveError || !savedProject) {
        console.error("Error saving AI project:", saveError);
        throw new Error("Failed to save AI project metadata.");
      }

      if (onLoadTemplate) {
        onLoadTemplate(components);
      }

      localStorage.setItem("generated-code", code);
      localStorage.setItem("generated-components", JSON.stringify(components));

      setShowMakePrompt(false);
      setAiPrompt("");
      setIsGenerating(false);

      setTimeout(() => {
        onOpenProject(savedProject.id || "", initialProjectName);
      }, 1000);
    } catch (error) {
      console.error("Error generating UI:", error);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const generateSampleUI = (prompt: string): ComponentData[] => {
    const lowerPrompt = prompt.toLowerCase();

    const components: ComponentData[] = [
      {
        id: "hero-" + Date.now(),
        type: "hero",
        props: {
          heading: lowerPrompt.includes("portfolio")
            ? "Welcome to My Portfolio"
            : lowerPrompt.includes("blog")
              ? "Read Our Latest Articles"
              : lowerPrompt.includes("shop") || lowerPrompt.includes("store")
                ? "Shop the Latest Collection"
                : "Welcome to Our Website",
          subheading: "Discover amazing content and experiences",
          buttonText: "Get Started",
          imageUrl:
            "https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=600&fit=crop",
        },
        style: {
          backgroundColor: "#1e3a8a",
          color: "#ffffff",
          padding: "80px 20px",
          textAlign: "center",
        },
      },
      {
        id: "features-" + Date.now(),
        type: "features",
        props: {
          heading: "Our Features",
          items: [
            {
              title: "Fast",
              description: "Lightning fast performance",
              icon: "⚡",
            },
            { title: "Secure", description: "Bank-level security", icon: "🔒" },
            {
              title: "Scalable",
              description: "Grows with your needs",
              icon: "📈",
            },
          ],
        },
        style: {
          backgroundColor: "#ffffff",
          color: "#1e293b",
          padding: "60px 20px",
        },
      },
      {
        id: "cta-" + Date.now(),
        type: "cta",
        props: {
          heading: "Ready to Get Started?",
          subheading: "Join thousands of satisfied customers today",
          buttonText: "Sign Up Now",
        },
        style: {
          backgroundColor: "#3b82f6",
          color: "#ffffff",
          padding: "60px 20px",
          textAlign: "center",
        },
      },
      {
        id: "footer-" + Date.now(),
        type: "footer",
        props: {
          text: "© 2025 BuildX Designer. All rights reserved.",
          links: ["About", "Contact", "Privacy", "Terms"],
        },
        style: {
          backgroundColor: "#1e293b",
          color: "#94a3b8",
          padding: "40px 20px",
          textAlign: "center",
        },
      },
    ];

    return components;
  };

  const handleGenerateUI = () => {
    if (!aiPrompt.trim()) return;
    generateUIWithGemini(aiPrompt);
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case "drafts":
        return "Draft Projects";
      case "team":
        return "Team Projects";
      case "trash":
        return "Deleted Projects";
      case "all":
        return "All Projects";
      case "new-chat":
      default:
        return "New Chat";
    }
  };

  const draftsCount = projects.filter((p) => p.status === "draft").length;
  const getDraftCardInitial = (name: string) =>
    name?.trim()?.charAt(0)?.toUpperCase() || "P";

  const getDraftProjectStatus = (lastModified?: string) => {
    if (!lastModified) return "inactive";

    const daysOld =
      (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24);
    return Number.isNaN(daysOld) || daysOld > 14 ? "inactive" : "active";
  };

  const getRelativeLastModified = (lastModified?: string) => {
    if (!lastModified) return "Recently updated";

    const timeDifference = Date.now() - new Date(lastModified).getTime();
    const hours = Math.floor(timeDifference / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (Number.isNaN(hours) || hours < 1) return "Updated just now";
    if (hours < 24) return `Updated ${hours}h ago`;
    if (days < 7) return `Updated ${days}d ago`;

    return `Updated on ${new Date(lastModified).toLocaleDateString()}`;
  };
  const filteredProjects = getFilteredProjects();

  const filteredRecommendedTemplates = visibleRecommendedTemplates.filter(
    (template) =>
      selectedTemplateCategory === "All" ||
      template.category === selectedTemplateCategory,
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredPublishedTemplates = normalizedSearchQuery
    ? publishedTemplates.filter((template) =>
      [
        template.projects?.project_name,
        template.projects?.description,
        template.projects?.category,
        template.profiles?.full_name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearchQuery),
        ),
    )
    : publishedTemplates;
  const filteredSharedProjects = normalizedSearchQuery
    ? sharedProjects.filter((sharedProject) =>
      [
        sharedProject.projects?.project_name,
        sharedProject.projects?.description,
        sharedProject.projects?.owner_profile?.full_name,
        sharedProject.role,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearchQuery),
        ),
    )
    : sharedProjects;
  const allProjectsPreview = filteredProjects.slice(0, 10);
  const isDeployedValue = (value: unknown) =>
    value === true || value === "true" || value === 1 || value === "1";

  const renderDeploymentStatus = (
    isPublished?: boolean | null | string | number,
  ) => {
    const isDeployed = isDeployedValue(isPublished);

    return (
      <span
        className="inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 text-[10px] font-medium leading-none whitespace-nowrap shrink-0"
        style={{
          color: isDeployed ? "#15803d" : "#b91c1c",
          backgroundColor: isDeployed
            ? "rgba(34, 197, 94, 0.12)"
            : "rgba(239, 68, 68, 0.12)",
          borderColor: isDeployed
            ? "rgba(34, 197, 94, 0.45)"
            : "rgba(239, 68, 68, 0.45)",
        }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: isDeployed ? "#16a34a" : "#dc2626" }}
        />
        {isDeployed ? "Deployed" : "Undeployed"}
      </span>
    );
  };

  const handleBrowseAllClick = () => {
    setSelectedTemplateId(null);
    setShowCreateTemplateModal(true);
  };

  const handleCreateBlankClick = () => {
    setSelectedTemplateId("blank");
    setProjectName("");
    setNewProjectDescription("");
    setNewProjectCategory("Starter");
    setShowNameProjectDialog(true);
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const ThemeIcon = themeIcons[theme];

  const renderRecommendedTemplateSkeletons = () =>
    Array.from({ length: 4 }).map((_, index) => (
      <div
        key={`template-skeleton-${index}`}
        className="rounded-xl overflow-hidden border border-border bg-card"
      >
        <div className="aspect-video">
          <Skeleton width="100%" height="100%" />
        </div>

        <div className="p-4 space-y-3">
          <Skeleton width="70%" height="20px" />
          <Skeleton width="35%" height="18px" />
          <Skeleton width="100%" height="14px" />
          <Skeleton width="85%" height="14px" />

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton width="24px" height="24px" borderRadius="9999px" />
              <Skeleton width="80px" height="12px" />
            </div>

            <div className="flex items-center gap-1">
              <Skeleton width="16px" height="16px" />
              <Skeleton width="20px" height="12px" />
            </div>
          </div>
        </div>
      </div>
    ));

  return (
    // Use flex h-screen and allow page scrolling so gallery and bottom content are reachable
    <div className="dashboard-gradient-surface flex h-screen overflow-auto">
      {/* Mobile Overlay */}
      {sidebarVisible && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarVisible(false)}
        />
      )}

      {/* Figma-style Sidebar - Drawer on mobile, fixed on desktop */}
      <aside
        className={`
        fixed md:relative
        w-60 md:w-60
        bg-card border-r border-border flex flex-col
        z-50 md:z-auto
        transition-transform duration-300 ease-in-out
        ${sidebarVisible ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        top-0 bottom-0 left-0
      `}
      >
        {/* User Profile */}
        <div className="p-4 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
              data-tour="sidebar-profile" 
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                disabled={authLoading}
              >
                <Avatar className="h-8 w-8 ring-2 ring-blue-500/50 shrink-0">
                  {/* Use actual avatar URL from Supabase Storage */}
                  <AvatarImage src={resolvedSidebarAvatarUrl} alt={userName} />

                  <AvatarFallback className="bg-linear-to-br from-blue-600 to-violet-600 text-white text-sm">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  {/* Use fetched full name and email */}
                  <p className="text-sm text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuItem onClick={() => setShowAccountSettings(true)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {(profileData.isConnected === 1 || isSupabaseConnected) && (
            <div className="mt-3 px-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Supabase Connected
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
            data-tour="sidebar-search" 
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2">
          <nav data-tour="sidebar-nav" className="space-y-1"> 
            <button
              onClick={() => setActiveSection("new-chat")}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${activeSection === "new-chat"
                ? "text-blue-500 bg-blue-500/10"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {/* Marketplace */}
            <button
              onClick={() => setActiveSection("marketplace")}
              data-tour="sidebar-components-library"
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${activeSection === "marketplace"
                ? "text-blue-500 bg-blue-500/10"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Components Library</span>
            </button>

            {/* All Projects */}
            <button
              onClick={() => setActiveSection("all")}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${activeSection === "all"
                ? "text-blue-500 bg-blue-500/10"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <Layout className="w-4 h-4" />
              <span>All projects</span>
            </button>

            {/* Drafts */}
            <button
              onClick={() => setActiveSection("drafts")}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${activeSection === "drafts"
                ? "text-blue-500 bg-blue-500/10"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <Folder className="w-4 h-4" />
              <span>Drafts</span>
              {draftsCount > 0 && (
                <Badge className="ml-auto bg-muted text-foreground text-xs h-5">
                  {draftsCount}
                </Badge>
              )}
            </button>

            {/* Trash */}
            <button
              onClick={() => setActiveSection("trash")}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${activeSection === "trash"
                ? "text-blue-500 bg-blue-500/10"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Trash</span>
            </button>
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      {/* Use overflow-hidden for the main content div */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="bg-card border-b border-border px-3 md:px-6 flex items-center justify-between h-14">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="md:hidden p-2 hover:bg-muted rounded-md transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Theme Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-tour="theme-switcher" variant="ghost" size="sm" className="gap-2 ml-auto">
                <ThemeIcon className="w-4 h-4" />
                <span className="text-sm capitalize">{theme}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onThemeChange?.("light")}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
                {theme === "light" && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onThemeChange?.("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
                {theme === "dark" && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onThemeChange?.("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>System</span>
                {theme === "system" && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Changed ScrollArea to allow for main content to scroll */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-3 md:p-6">
            {activeSection === "new-chat" ? (
              <>
                <div className="flex flex-col min-h-[calc(100vh-200px)]">
                  {/* Templates Section */}
                  <div
                    className="flex-1 px-4 pb-8 pt-0"
                    data-tour="recommended-templates"
                  >
                    {/* Updated max-width for better content spacing */}
                    <div className="w-full max-w-6xl mx-auto">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-2xl font-semibold text-foreground">
                            Recommended Template
                          </h2>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={handleCreateBlankClick}
                            >
                              Create Blank
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={handleBrowseAllClick} // Use the new handler
                            >
                              Browse all
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>

                        {!isApiReachable && (
                          <div className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                            Backend is offline. Recommended templates could not
                            be loaded, and live likes are paused until
                            connection is restored.
                          </div>
                        )}

                        {/* Template Categories Tabs */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                          {["All", ...projectCategoryOptions].map(
                            (category) => (
                              <Button
                                key={category}
                                variant={
                                  selectedTemplateCategory === category
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                className="rounded-full whitespace-nowrap"
                                onClick={() =>
                                  setSelectedTemplateCategory(category)
                                }
                              >
                                {category}
                              </Button>
                            ),
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                          {recommendationsLoading ? (
                            renderRecommendedTemplateSkeletons()
                          ) : filteredRecommendedTemplates.length > 0 ? (
                            filteredRecommendedTemplates.map((template) => (
                              <div
                                key={template.id}
                                data-tour="recommended-template-card"
                                className="theme-interactive-card group relative rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all cursor-pointer"
                                onClick={() =>
                                  handleQuickTemplateClick(template)
                                }
                              >
                                <div className="aspect-video bg-muted relative overflow-hidden">
                                  <img
                                    src={
                                      template.thumbnail || "/placeholder.svg"
                                    }
                                    alt={template.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                                <div className="p-4">
                                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-blue-600 transition-colors">
                                    {template.name}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className="mb-2 rounded-full border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                                  >
                                    {template.category}
                                  </Badge>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {template.description}
                                  </p>

                                  <div className="flex items-center justify-between pt-3 border-t border-border">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={
                                          template.creatorAvatar ||
                                          "/placeholder.svg"
                                        }
                                        alt={template.creator}
                                        className="w-6 h-6 rounded-full"
                                      />
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {template.creator}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        data-tour="template-like-button"
                                        onClick={(event) =>
                                          handleLikeTemplate(event, template)
                                        }
                                        disabled={
                                          likingTemplateIds[
                                          getTemplateLikeKey(template)
                                          ]
                                        }
                                        className={`flex items-center gap-1 transition-colors ${isTemplateLiked(template)
                                          ? "text-red-500"
                                          : "text-muted-foreground hover:text-red-500"
                                          }`}
                                      >
                                        <Heart
                                          className={`w-4 h-4 ${isTemplateLiked(template)
                                            ? "fill-red-500 text-red-500"
                                            : ""
                                            }`}
                                        />
                                        <span className="text-xs">
                                          {getTemplateLikeCount(template)}
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedReportTemplate(template);
                                          setShowReportTemplateModal(true);
                                        }}
                                        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-red-500"
                                        aria-label={`Report ${template.name}`}
                                      >
                                        <Flag className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                              No recommended templates available.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                 <div className="w-full max-w-6xl mx-auto mt-10">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold text-foreground">
                        Getting Started Guide
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Complete the tutorials in order to unlock the next step.
                    </p>
                    <GettingStartedGuideContent
                      userId={currentUserId}
                      refreshKey={tourCompletionKey}
                      onStartBuildXIntroduction={() => {
                        setShowBuildXIntroductionTour(false);
                        setActiveSection("new-chat");
                        setTimeout(() => setShowBuildXIntroductionTour(true), 50);
                      }}
                      onStartWebsiteCreation={() => {
                        setShowWebsiteCreationTour(false);
                        setActiveSection("new-chat");
                        setSelectedTemplateId("blank");
                        setShowCreateTemplateModal(true);
                        setTimeout(() => setShowWebsiteCreationTour(true), 280);
                      }}
                      onStartPublishingBasics={() => {
                        localStorage.setItem("buildx-pending-publishing-basics-tour", "1");
                        setSelectedTemplateId("blank");
                        setShowCreateTemplateModal(true);
                      }}
                      // ADD THESE:
                      onStartDashboardOverview={() => {
                        setShowDashboardTour(false);
                        setTimeout(() => setShowDashboardTour(true), 50);
                      }}
                      onStartCanvasArea={() => {
                        localStorage.setItem("buildx-pending-canvas-tour", "1");
                        setSelectedTemplateId("blank");
                        setShowCreateTemplateModal(true);
                      }}
                      onStartPropertiesPanel={() => {
                        localStorage.setItem("buildx-pending-properties-tour", "1");
                        setSelectedTemplateId("blank");
                        setShowCreateTemplateModal(true);
                      }}
                      onStartAIAssistant={() => {
                        localStorage.setItem("buildx-pending-ai-tour", "1");
                        setSelectedTemplateId("blank");
                        setShowCreateTemplateModal(true);
                      }}
                      onStartCodeEditor={() => {
                        localStorage.setItem("buildx-pending-code-tour", "1");
                        setSelectedTemplateId("blank");
                        setShowCreateTemplateModal(true);
                      }}
                      onStartComponentsLibrary={() => {
                        setActiveSection("marketplace");
                        setShowComponentsLibraryTour(false);
                        setTimeout(() => setShowComponentsLibraryTour(true), 50);
                      }}
                      onStartSavingCollaboration={() => {
                        localStorage.setItem("buildx-pending-collab-tour", "1");
                        setSelectedTemplateId("blank");
                        setShowCreateTemplateModal(true);
                      }}
                    />
                  </div>
                </div>
                <div className="w-full max-w-6xl mx-auto mt-10">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold text-foreground">
                        Trending
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                      {trendingLoading ? (
                        renderRecommendedTemplateSkeletons()
                      ) : trendingTemplates.length > 0 ? (
                        trendingTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="theme-interactive-card group relative rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => handleQuickTemplateClick(template)}
                          >
                            <div className="aspect-video bg-muted relative overflow-hidden">
                              <img
                                src={template.thumbnail || "/placeholder.svg"}
                                alt={template.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>

                            <div className="p-4">
                              <h3 className="font-semibold text-foreground mb-1 group-hover:text-blue-600 transition-colors">
                                {template.name}
                              </h3>

                              <Badge
                                variant="outline"
                                className="mb-2 rounded-full border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                              >
                                {template.category}
                              </Badge>

                              <p className="text-sm text-muted-foreground mb-3">
                                {template.description}
                              </p>

                              <div className="flex items-center justify-between pt-3 border-t border-border">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={
                                      template.creatorAvatar ||
                                      "/placeholder.svg"
                                    }
                                    alt={template.creator}
                                    className="w-6 h-6 rounded-full"
                                  />
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {template.creator}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={(event) =>
                                      handleLikeTemplate(event, template)
                                    }
                                    disabled={
                                      likingTemplateIds[
                                      getTemplateLikeKey(template)
                                      ]
                                    }
                                    className={`flex items-center gap-1 transition-colors ${isTemplateLiked(template)
                                      ? "text-red-500"
                                      : "text-muted-foreground hover:text-red-500"
                                      }`}
                                  >
                                    <Heart
                                      className={`w-4 h-4 ${isTemplateLiked(template)
                                        ? "fill-red-500 text-red-500"
                                        : ""
                                        }`}
                                    />
                                    <span className="text-xs">
                                      {getTemplateLikeCount(template)}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedReportTemplate(template);
                                      setShowReportTemplateModal(true);
                                    }}
                                    className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-red-500"
                                    aria-label={`Report ${template.name}`}
                                  >
                                    <Flag className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                          No trending templates available.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : activeSection === "marketplace" ? (
              <>
                <div className="flex flex-col min-h-[calc(100vh-200px)]">
                  <div className="flex-1 px-4 pb-8 pt-0">
                    <div className="w-full max-w-7xl mx-auto">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-primary" />
                            Components Library
                          </h2>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                          <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              data-tour="components-library-search"
                              placeholder="Search components..."
                              value={marketplaceSearch}
                              onChange={(e) =>
                                setMarketplaceSearch(e.target.value)
                              }
                              className="pl-9 h-9 bg-background border-border"
                            />
                          </div>
                          <div className="ml-auto">
                            <Button
                              data-tour="components-library-my-components"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setShowMyComponentsModal(true);
                                fetchUserCustomComponents();
                                fetchUserPublicComponents();
                              }}
                            >
                              <Library className="w-4 h-4" />
                              My Components
                            </Button>
                          </div>
                        </div>

                        {marketplaceLoading ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div
                                key={i}
                                className="rounded-xl border border-border bg-card overflow-hidden"
                              >
                                <Skeleton className="aspect-4/3 w-full" />
                                <div className="p-4">
                                  <Skeleton width="70%" height={18} />
                                  <Skeleton
                                    width="100%"
                                    height={14}
                                    className="mt-2"
                                  />
                                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                    <Skeleton circle width={24} height={24} />
                                    <Skeleton width={80} height={12} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          (() => {
                            const filtered = marketplaceComponents.filter(
                              (c) =>
                                c.name
                                  ?.toLowerCase()
                                  .includes(marketplaceSearch.toLowerCase()) ||
                                c.description
                                  ?.toLowerCase()
                                  .includes(marketplaceSearch.toLowerCase()) ||
                                c.creator_name
                                  ?.toLowerCase()
                                  .includes(marketplaceSearch.toLowerCase()),
                            );
                            return filtered.length === 0 ? (
                              <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p className="font-semibold text-base">
                                  {marketplaceSearch
                                    ? "No components match your search"
                                    : "No components published yet"}
                                </p>
                                <p className="text-sm mt-1">
                                  {marketplaceSearch
                                    ? "Try different keywords"
                                    : "Be the first to publish one!"}
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                                {filtered.map((comp) => (
                                  <div
                                    key={comp.id}
                                    data-tour="components-library-card"
                                    className="theme-interactive-card group relative rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all cursor-pointer flex flex-col h-full"
                                  >
                                    {/* PREVIEW BOX: Using zoom to force content to fit */}
                                    <div className="relative flex-1 bg-white dark:bg-slate-950 aspect-4/3 overflow-hidden flex items-center justify-center p-2">
                                      <style>
                                        {`
                                    .preview-container-${comp.id} {
                                      ${comp.component_json?.props?.css || ""}
                                      width: 100%;
                                      display: flex;
                                      justify-content: center;
                                      align-items: center;
                                    }
                                    
                                    /* This is the magic part: it shrinks the inner content to 50% size 
                                      so it looks like a high-res thumbnail */
                                    .inner-scaler-${comp.id} {
                                      zoom: 0.5; 
                                      -moz-transform: scale(0.5);
                                      -moz-transform-origin: center center;
                                      width: max-content;
                                      height: max-content;
                                    }
                                  `}
                                      </style>

                                      <div
                                        className={`preview-container-${comp.id} w-full h-full`}
                                      >
                                        <div
                                          className={`inner-scaler-${comp.id}`}
                                          dangerouslySetInnerHTML={{
                                            __html:
                                              comp.component_json?.props
                                                ?.html || "",
                                          }}
                                        />
                                      </div>

                                      <div className="absolute inset-0 pointer-events-none border-b border-border/10 shadow-inner" />
                                    </div>

                                    <div className="px-4 py-3 border-t border-border/40 bg-card">
                                      <div className="flex items-center justify-between gap-3">
                                        <h5 className="text-[13px] font-semibold text-foreground/90 truncate flex-1">
                                          {comp.name}
                                        </h5>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {isComponentImported(comp.id) ? (
                                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                                              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            </div>
                                          ) : (
                                            <button
                                              data-tour="components-library-import"
                                              className="p-1.5 hover:bg-primary/10 rounded-full transition-colors group/import"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedComponentForImport(
                                                  comp,
                                                );
                                                setShowImportConfirmDialog(
                                                  true,
                                                );
                                              }}
                                            >
                                              <Download className="w-4 h-4 text-muted-foreground group-hover/import:text-primary transition-colors" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="w-5 h-5 border border-border/50">
                                            <AvatarImage
                                              src={comp.creator_avatar || ""}
                                            />
                                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary uppercase">
                                              {(
                                                comp.creator_name || "A"
                                              ).substring(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-[11px] font-medium text-muted-foreground truncate max-w-md">
                                            {comp.creator_name}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground/60">
                                          {new Date(
                                            comp.created_at,
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : activeSection === "all" ||
              activeSection === "drafts" ||
              activeSection === "trash" ||
              activeSection === "team" ? (
              <>
                {/* Project List Views - All Projects, Drafts, Trash */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-foreground">
                      {getSectionTitle()}
                    </h2>

                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                          >
                            {sortBy === "last_modified"
                              ? "Last modified"
                              : "Name"}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => setSortBy("last_modified")}
                          >
                            Last modified
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortBy("name")}>
                            Name
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${viewMode === "grid" ? "text-blue-500" : "text-muted-foreground"}`}
                          onClick={() => setViewMode("grid")}
                        >
                          <Grid3x3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${viewMode === "list" ? "text-blue-500" : "text-muted-foreground"}`}
                          onClick={() => setViewMode("list")}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Pill Navigation - Only show for "all" section */}
                  {activeSection === "all" && (
                    <div className="flex items-center gap-2 mb-6">
                      <button
                        onClick={() => setProjectsFilter("all")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${projectsFilter === "all"
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setProjectsFilter("published")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${projectsFilter === "published"
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                      >
                        Published Templates
                      </button>
                      <button
                        onClick={() => setProjectsFilter("shared")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${projectsFilter === "shared"
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                      >
                        Shared
                      </button>
                    </div>
                  )}

                  {/* Projects Grid/List */}
                  {projectsLoading ? (
                    <div className="flex justify-center items-center p-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="ml-3 text-lg text-muted-foreground">
                        Loading projects...
                      </span>
                    </div>
                  ) : activeSection === "all" && projectsFilter === "all" ? (
                    <div className="space-y-8">
                      {allProjectsPreview.length > 0 ? (
                        <div
                          className={`grid ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"} gap-3 md:gap-4`}
                        >
                          {allProjectsPreview.map((project) => (
                            <Card
                              key={project.id}
                              className="bg-card border-border cursor-pointer transition-all group overflow-hidden hover:border-blue-500/50"
                              onClick={() =>
                                onOpenProject(project.id, project.name)
                              }
                            >
                              <CardContent className="p-3">
                                <div className="relative h-24 rounded-md overflow-hidden bg-muted mb-3">
                                  <img
                                    src={
                                      project.thumbnail || "/placeholder.svg"
                                    }
                                    alt={project.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-7 w-7 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center text-xs font-semibold shrink-0">
                                      {getDraftCardInitial(project.name)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <p className="text-sm font-semibold text-foreground line-clamp-1 min-w-0">
                                          {project.name}
                                        </p>
                                        {renderDeploymentStatus(
                                          project.isPublished,
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {getRelativeLastModified(
                                          project.lastModified,
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <Badge
                                    className={`${getDraftProjectStatus(project.lastModified) === "active" ? "bg-orange-500/90 text-white" : "bg-muted text-muted-foreground"} border-0 rounded-sm px-2 py-0 h-5 text-[10px] uppercase`}
                                  >
                                    {getDraftProjectStatus(
                                      project.lastModified,
                                    )}
                                  </Badge>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={(
                                          e: React.MouseEvent<HTMLButtonElement>,
                                        ) => e.stopPropagation()}
                                      >
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          openEditProjectDialog(project);
                                        }}
                                      >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Edit project
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          handleDuplicateProject(project);
                                        }}
                                      >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Duplicate
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          handleMoveProjectToStatus(
                                            project.id,
                                            "draft",
                                          );
                                        }}
                                      >
                                        <Folder className="mr-2 h-4 w-4" />
                                        Move to draft
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          handleMoveProjectToStatus(
                                            project.id,
                                            "trash",
                                          );
                                        }}
                                        className="text-red-500"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Move to trash
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card className="p-12 text-center bg-card border-dashed">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                              <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground text-lg">
                              {searchQuery
                                ? "No projects match your search"
                                : "Create your first project to get started"}
                            </p>
                            {!searchQuery && (
                              <Button
                                onClick={handleCreateBlankProject}
                                disabled={projectsLoading}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {projectsLoading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create New Project
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </Card>
                      )}

                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          Published Templates
                        </h3>
                        {filteredPublishedTemplates.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {filteredPublishedTemplates.map((template) => (
                              <Card
                                key={template.project_id}
                                className="bg-card border-border cursor-pointer transition-all group overflow-hidden hover:border-blue-500/50"
                                onClick={() =>
                                  onOpenProject(
                                    template.project_id,
                                    template.projects.project_name,
                                  )
                                }
                              >
                                <CardContent className="p-3">
                                  <div className="relative h-24 rounded-md overflow-hidden bg-muted mb-3">
                                    <img
                                      src={
                                        template.projects.thumbnail ||
                                        "/placeholder.svg"
                                      }
                                      alt={template.projects.project_name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <h3 className="text-sm font-semibold text-foreground line-clamp-1 min-w-0">
                                        {template.projects.project_name}
                                      </h3>
                                      {renderDeploymentStatus(
                                        template.projects.is_published,
                                      )}
                                    </div>

                                    {template.projects.category && (
                                      <div>
                                        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                          {template.projects.category}
                                        </span>
                                      </div>
                                    )}

                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {template.projects.description}
                                    </p>

                                    <div className="pt-1 border-t border-border/60">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Avatar className="h-5 w-5 shrink-0">
                                          <AvatarImage
                                            src={template.profiles?.avatar_url}
                                          />
                                          <AvatarFallback className="text-xs">
                                            {(
                                              template.profiles?.full_name ||
                                              "U"
                                            ).charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                          {template.profiles?.full_name ||
                                            "Unknown author"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {searchQuery
                              ? "No published templates match your search"
                              : "No published templates yet"}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          Shared
                        </h3>
                        {filteredSharedProjects.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {filteredSharedProjects.map((sharedProject) => (
                              <Card
                                key={sharedProject.project_id}
                                className="bg-card border-border cursor-pointer transition-all group overflow-hidden hover:border-blue-500/50"
                                onClick={() =>
                                  onOpenProject(
                                    sharedProject.project_id,
                                    sharedProject.projects.project_name,
                                  )
                                }
                              >
                                <CardContent className="p-3">
                                  <div className="relative h-24 rounded-md overflow-hidden bg-muted mb-3">
                                    <img
                                      src={
                                        sharedProject.projects.thumbnail ||
                                        "/placeholder.svg"
                                      }
                                      alt={sharedProject.projects.project_name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <h3 className="text-sm font-semibold text-foreground line-clamp-1 min-w-0">
                                        {sharedProject.projects.project_name}
                                      </h3>
                                      {renderDeploymentStatus(
                                        sharedProject.projects?.is_published,
                                      )}
                                    </div>

                                    <div>
                                      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground capitalize">
                                        {sharedProject.role}
                                      </span>
                                    </div>

                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {sharedProject.projects.description}
                                    </p>

                                    <div className="pt-1 border-t border-border/60">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Avatar className="h-5 w-5 shrink-0">
                                          <AvatarImage
                                            src={
                                              sharedProject.projects
                                                .owner_profile?.avatar_url
                                            }
                                          />
                                          <AvatarFallback className="text-xs">
                                            {(
                                              sharedProject.projects
                                                .owner_profile?.full_name || "U"
                                            ).charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                          {sharedProject.projects.owner_profile
                                            ?.full_name || "Unknown owner"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {searchQuery
                              ? "No shared projects match your search"
                              : "No shared projects yet"}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : projectsFilter === "published" &&
                    filteredPublishedTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      {filteredPublishedTemplates.map((template) => (
                        <Card
                          key={template.project_id}
                          className="bg-card border-border cursor-pointer transition-all group overflow-hidden hover:border-blue-500/50"
                          onClick={() =>
                            onOpenProject(
                              template.project_id,
                              template.projects.project_name,
                            )
                          }
                        >
                          <CardContent className="p-3">
                            {/* Thumbnail */}
                            <div className="relative h-24 rounded-md overflow-hidden bg-muted mb-3">
                              <img
                                src={
                                  template.projects.thumbnail ||
                                  "/placeholder.svg"
                                }
                                alt={template.projects.project_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            {/* Content */}
                            <div className="space-y-2">
                              {/* Title */}
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className="text-sm font-semibold text-foreground line-clamp-1 min-w-0">
                                  {template.projects.project_name}
                                </h3>
                                {renderDeploymentStatus(
                                  template.projects.is_published,
                                )}
                              </div>

                              {/* Category Badge */}
                              {template.projects.category && (
                                <div>
                                  <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                    {template.projects.category}
                                  </span>
                                </div>
                              )}

                              {/* Description */}
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {template.projects.description}
                              </p>

                              {/* Footer with Author */}
                              <div className="pt-1 border-t border-border/60">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-5 w-5 shrink-0">
                                    <AvatarImage
                                      src={template.profiles?.avatar_url}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {(
                                        template.profiles?.full_name || "U"
                                      ).charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {template.profiles?.full_name ||
                                      "Unknown author"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : projectsFilter === "shared" &&
                    filteredSharedProjects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      {filteredSharedProjects.map((sharedProject) => (
                        <Card
                          key={sharedProject.project_id}
                          className="bg-card border-border cursor-pointer transition-all group overflow-hidden hover:border-blue-500/50"
                          onClick={() =>
                            onOpenProject(
                              sharedProject.project_id,
                              sharedProject.projects.project_name,
                            )
                          }
                        >
                          <CardContent className="p-3">
                            {/* Thumbnail */}
                            <div className="relative h-24 rounded-md overflow-hidden bg-muted mb-3">
                              <img
                                src={
                                  sharedProject.projects.thumbnail ||
                                  "/placeholder.svg"
                                }
                                alt={sharedProject.projects.project_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            {/* Content */}
                            <div className="space-y-2">
                              {/* Title */}
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className="text-sm font-semibold text-foreground line-clamp-1 min-w-0">
                                  {sharedProject.projects.project_name}
                                </h3>
                                {renderDeploymentStatus(
                                  sharedProject.projects?.is_published,
                                )}
                              </div>

                              {/* Role Badge */}
                              <div>
                                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground capitalize">
                                  {sharedProject.role}
                                </span>
                              </div>

                              {/* Description */}
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {sharedProject.projects.description}
                              </p>

                              {/* Footer with Owner */}
                              <div className="pt-1 border-t border-border/60">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-5 w-5 shrink-0">
                                    <AvatarImage
                                      src={
                                        sharedProject.projects.owner_profile
                                          ?.avatar_url
                                      }
                                    />
                                    <AvatarFallback className="text-xs">
                                      {(
                                        sharedProject.projects.owner_profile
                                          ?.full_name || "U"
                                      ).charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {sharedProject.projects.owner_profile
                                      ?.full_name || "Unknown owner"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    <div
                      className={`grid ${activeSection === "drafts" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"} gap-3 md:gap-4`}
                    >
                      {filteredProjects.map((project) => (
                        <Card
                          key={project.id}
                          className={`bg-card border-border cursor-pointer transition-all group overflow-hidden ${activeSection === "drafts" ? "hover:-translate-y-1 hover:shadow-md hover:border-blue-400/40" : "hover:border-blue-500/50"}`}
                          onClick={() =>
                            onOpenProject(project.id, project.name)
                          } // <-- CRITICAL CHANGE: Pass project.name
                        >
                          {activeSection === "drafts" ||
                            activeSection === "all" ||
                            activeSection === "trash" ? (
                            <CardContent className="p-3">
                              <div className="relative h-24 rounded-md overflow-hidden bg-muted mb-3">
                                <img
                                  src={project.thumbnail || "/placeholder.svg"}
                                  alt={project.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-7 w-7 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center text-xs font-semibold shrink-0">
                                    {getDraftCardInitial(project.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <p className="text-sm font-semibold text-foreground line-clamp-1 min-w-0">
                                        {project.name}
                                      </p>
                                      {renderDeploymentStatus(
                                        project.isPublished,
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {getRelativeLastModified(
                                        project.lastModified,
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <Badge
                                  className={`${getDraftProjectStatus(project.lastModified) === "active" ? "bg-orange-500/90 text-white" : "bg-muted text-muted-foreground"} border-0 rounded-sm px-2 py-0 h-5 text-[10px] uppercase`}
                                >
                                  {getDraftProjectStatus(project.lastModified)}
                                </Badge>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(
                                        e: React.MouseEvent<HTMLButtonElement>,
                                      ) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(
                                        e: React.MouseEvent<HTMLDivElement>,
                                      ) => {
                                        e.stopPropagation();
                                        openEditProjectDialog(project);
                                      }}
                                    >
                                      <FileText className="mr-2 h-4 w-4" />
                                      Edit project
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(
                                        e: React.MouseEvent<HTMLDivElement>,
                                      ) => {
                                        e.stopPropagation();
                                        handleDuplicateProject(project);
                                      }}
                                    >
                                      <Copy className="mr-2 h-4 w-4" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(
                                        e: React.MouseEvent<HTMLDivElement>,
                                      ) => {
                                        e.stopPropagation();
                                        handleMoveProjectToStatus(
                                          project.id,
                                          "draft",
                                        );
                                      }}
                                    >
                                      <Folder className="mr-2 h-4 w-4" />
                                      Move to draft
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {activeSection === "trash" ? (
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          openDeleteProjectDialog(project);
                                        }}
                                        className="text-red-500"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete forever
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          handleMoveProjectToStatus(
                                            project.id,
                                            "trash",
                                          );
                                        }}
                                        className="text-red-500"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Move to trash
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          ) : (
                            <>
                              <div className="relative aspect-4/3 overflow-hidden bg-muted">
                                <img
                                  src={project.thumbnail || "/placeholder.svg"}
                                  alt={project.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={(
                                          e: React.MouseEvent<HTMLButtonElement>,
                                        ) => e.stopPropagation()}
                                      >
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Open
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          openEditProjectDialog(project);
                                        }}
                                      >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Edit project
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          handleDuplicateProject(project);
                                        }}
                                      >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Duplicate
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(
                                          e: React.MouseEvent<HTMLDivElement>,
                                        ) => {
                                          e.stopPropagation();
                                          handleDeleteProject(project.id);
                                        }}
                                        className="text-red-500"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <CardContent className="p-3">
                                <div className="flex items-center gap-2 min-w-0 mb-1">
                                  <h3 className="text-sm text-foreground line-clamp-1 min-w-0">
                                    {project.name}
                                  </h3>
                                  {renderDeploymentStatus(project.isPublished)}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {project.description}
                                </p>
                              </CardContent>
                            </>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-12 text-center bg-card border-dashed">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-lg">
                          {searchQuery
                            ? "No projects match your search"
                            : projectsFilter === "published"
                              ? "No published templates yet"
                              : projectsFilter === "shared"
                                ? "No shared projects yet"
                                : activeSection === "drafts"
                                  ? "No draft projects"
                                  : activeSection === "team"
                                    ? "No team projects"
                                    : activeSection === "trash"
                                      ? "No deleted projects"
                                      : "Create your first project to get started"}
                        </p>
                        {!searchQuery &&
                          activeSection !== "trash" &&
                          projectsFilter === "all" && (
                            <Button
                              onClick={handleCreateBlankProject}
                              disabled={projectsLoading}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {projectsLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Create New Project
                                </>
                              )}
                            </Button>
                          )}
                      </div>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              // This is the placeholder for other sections like drafts, team, trash, etc.
              // You would add similar logic here to display projects based on the activeSection.
              // For now, it defaults to showing a message.
              <div className="text-center p-12 text-muted-foreground">
                {getSectionTitle()} content will be displayed here.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Template Browser Modal */}
      <TemplateBrowserModal
        isOpen={showTemplateBrowser}
        onClose={() => setShowTemplateBrowser(false)}
        onSelectTemplate={handleTemplateClick}
        onCreateFromScratch={() => {
          setShowTemplateBrowser(false);
          setSelectedTemplateId("blank");
          setShowNameProjectDialog(true);
        }}
      />

      <Dialog
        open={showDeleteConfirmDialog}
        onOpenChange={(open) => {
          setShowDeleteConfirmDialog(open);
          if (!open) setPendingDeleteProject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project forever?</DialogTitle>
            <DialogDescription>
              This will permanently delete "
              {pendingDeleteProject?.name || "this project"}". This action
              cannot be undone or restored from trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmDialog(false);
                setPendingDeleteProject(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!pendingDeleteProject || projectsLoading}
              onClick={() => {
                if (!pendingDeleteProject) return;
                handleDeleteProject(pendingDeleteProject.id);
              }}
            >
              {projectsLoading ? "Deleting..." : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditProjectDialog}
        onOpenChange={(open) => {
          if (!open) {
            resetEditProjectDialog();
            return;
          }
          setShowEditProjectDialog(true);
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project name, category, and description
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 border-t border-border pt-6 space-y-6">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-start gap-4">
                <img
                  src={editingProject?.thumbnail || "/placeholder.svg"}
                  alt={editingProject?.name || "Project thumbnail"}
                  className="h-24 w-32 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-semibold text-foreground line-clamp-1">
                    {editProjectName.trim() ||
                      editingProject?.name ||
                      "Untitled Project"}
                  </p>
                  <p className="mt-1 text-base text-muted-foreground">
                    Drafts • {getProjectCreatedDateLabel(editingProject)}
                  </p>
                  <Badge variant="outline" className="mt-3 rounded-full">
                    {normalizeProjectCategory(editProjectCategory)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editProjectName">Project Name</Label>
              <Input
                id="editProjectName"
                placeholder="My Awesome Website"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editProjectName.trim()) {
                    handleSaveProjectEdits();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editProjectCategory">Project Category</Label>
              <select
                id="editProjectCategory"
                value={editProjectCategory}
                onChange={(e) => setEditProjectCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {projectCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editProjectDescription">
                Project Description (Optional)
              </Label>
              <Textarea
                id="editProjectDescription"
                placeholder="Describe your website (optional)..."
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
                className="min-h-24"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              You can change this later in project settings.
            </p>
          </div>

          <DialogFooter className="flex justify-end">
            <Button variant="ghost" onClick={resetEditProjectDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProjectEdits}
              disabled={!editProjectName.trim() || isSavingProjectEdits}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingProjectEdits ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Name Project Dialog */}
      <Dialog
        open={showNameProjectDialog}
        onOpenChange={setShowNameProjectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Project</DialogTitle>
            <DialogDescription>
              Give your new project a name to get started
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="My Awesome Website"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && projectName.trim()) {
                    handleCreateProject();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectCategory">Project Category</Label>
              <select
                id="projectCategory"
                value={newProjectCategory}
                onChange={(e) => setNewProjectCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {projectCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDescription">
                Website Description (Optional)
              </Label>
              <Textarea
                id="projectDescription"
                placeholder="Describe what kind of website you want to create..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowNameProjectDialog(false);
                setProjectName("");
                setNewProjectDescription("");
                setNewProjectCategory("Starter");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        defaultTab={accountSettingsTab}
      />

      {/* Plans Modal */}
      <PlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
      />

      <CreateNewWebsiteModal
        isOpen={showCreateTemplateModal}
        onClose={() => {
          setShowCreateTemplateModal(false);
          setSelectedTemplateId(null);
        }}
        onSelectTemplate={handleTemplateSelectFromModal}
        onTemplateChange={(templateId) => {
          setSelectedTemplateId(templateId);
          prefetchTemplateLayout(templateId);
        }}
        onTrackSearch={() => { }}
        recommendedTemplates={visibleRecommendedTemplates}
        initialTemplateId={selectedTemplateId} // Pass selectedTemplateId as initialTemplateId
      />

      <ReportTemplateModal
        isOpen={showReportTemplateModal}
        onClose={() => {
          setShowReportTemplateModal(false);
          setSelectedReportTemplate(null);
        }}
        templateName={selectedReportTemplate?.name}
        onSubmit={async ({ category, reason }) => {
          if (!currentUserId) {
            throw new Error("Please log in to report templates.");
          }

          const projectId = String(
            selectedReportTemplate?.projectId ??
            selectedReportTemplate?.id ??
            "",
          ).trim();

          if (!projectId) {
            throw new Error("Template identifier is missing.");
          }

          try {
            await insertTemplateFlagFromApi({
              projectId,
              userId: currentUserId,
              reason,
              category,
            });

            toast.success("Report submitted successfully.");
            setShowReportTemplateModal(false);
            setSelectedReportTemplate(null);
          } catch (error) {
            console.error("Failed to report template:", error);
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to submit report.",
            );
            throw error;
          }
        }}
      />

      <BuildXIntroduction
        showOnMount={showBuildXIntroductionTour}
        onComplete={() => {
          setShowBuildXIntroductionTour(false);
          setShowCreateTemplateModal(false);
          setSelectedTemplateId(null);
          completeTutorialStep("palette");
        }}
      />

      <WebsiteCreation
        showOnMount={showWebsiteCreationTour}
        onEnsureCreateWebsiteModalOpen={() => {
          setSelectedTemplateId("blank");
          setShowCreateTemplateModal(true);
        }}
        onComplete={() => {
          setShowWebsiteCreationTour(false);
          completeTutorialStep("website");
        }}
      />

      <PublishingBasics
        showOnMount={showPublishingBasicsTour}
        onComplete={() => {
          setShowPublishingBasicsTour(false);
          completeTutorialStep("publishing");
        }}
      />

      <DashboardOverview
        showOnMount={showDashboardTour}
        onNavigateToAllProjects={() => setActiveSection("all")}
        onNavigateToDashboard={() => setActiveSection("new-chat")}
        onComplete={() => {
          setShowDashboardTour(false);
          completeTutorialStep("dashboard");
        }}
      />

      <PropertiesPanel
        showOnMount={showPropertiesPanel}
        onComplete={() => {
          setShowPropertiesPanelTour(false);
          completeTutorialStep("properties");
        }}
      />

      <AIAssistant
        showOnMount={showAIAssistantTour}
        onComplete={() => {
          setShowAIAssistantTour(false);
          completeTutorialStep("ai");
        }}
      />

      <CodeEditorTour
        showOnMount={showCodeEditorTour}
        onComplete={() => {
          setShowCodeEditorTour(false);
          completeTutorialStep("code");
        }}
      />

      <ComponentsLibrary
        showOnMount={showComponentsLibraryTour}
        onComplete={() => {
          setShowComponentsLibraryTour(false);
          completeTutorialStep("library");
        }}
      />

      <SavingCollaboration
        showOnMount={showSavingCollabTour}
        onComplete={() => {
          setShowSavingCollabTour(false);
          completeTutorialStep("collab");
        }}
      />

      {/* Congratulations Modal - shows after all 10 steps completed */}
      {showCongratsPopup && (
        <Dialog open={showCongratsPopup} onOpenChange={setShowCongratsPopup}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>🎉 Congratulations!</DialogTitle>
              <DialogDescription>
                You've completed all 10 tutorial steps. You're now ready to build amazing websites with BuildX!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                className="w-full bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                onClick={() => setShowCongratsPopup(false)}
              >
                Start Building
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      {/* Import Component Confirmation Dialog */}
      <Dialog
        open={showImportConfirmDialog}
        onOpenChange={(open) => {
          setShowImportConfirmDialog(open);
          if (!open) setSelectedComponentForImport(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import to My Components?</DialogTitle>
            <DialogDescription>
              Add "{selectedComponentForImport?.name || "this component"}" to
              your personal component library. You'll be able to use it in your
              projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportConfirmDialog(false);
                setSelectedComponentForImport(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportComponent}
              disabled={isImporting || !selectedComponentForImport}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isImporting ? "Importing..." : "Import Component"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* My Components Modal */}
      <Dialog
        open={showMyComponentsModal}
        onOpenChange={(open) => {
          setShowMyComponentsModal(open);
        }}
      >
        <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Components</DialogTitle>
            <DialogDescription>
              Manage your personal component library

            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 border-t border-border pt-6">
            {myComponentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* My Public Components Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    My Public Components ({userPublicComponents.length})
                  </h3>
                  {userPublicComponents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                      <Store className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p className="font-semibold">
                        No public components yet
                      </p>
                      <p className="text-sm mt-1">
                        Export your components to make them public and available to others
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userPublicComponents.map((comp) => (
                        <div
                          key={comp.id}
                          className="theme-interactive-card group relative rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all cursor-pointer flex flex-col h-full"
                        >
                          {/* Preview */}
                          <div className="relative flex-1 bg-white dark:bg-slate-950 aspect-4/3 overflow-hidden flex items-center justify-center p-2">
                            <style>
                              {`
                                .preview-container-${comp.id} {
                                  ${comp.component_json?.props?.css || ""}
                                  width: 100%;
                                  display: flex;
                                  justify-content: center;
                                  align-items: center;
                                }
                                
                                .inner-scaler-${comp.id} {
                                  zoom: 0.5; 
                                  -moz-transform: scale(0.5);
                                  -moz-transform-origin: center center;
                                  width: max-content;
                                  height: max-content;
                                }
                              `}
                            </style>
                            <div
                              className={`preview-container-${comp.id} w-full h-full`}
                            >
                              <div
                                className={`inner-scaler-${comp.id}`}
                                dangerouslySetInnerHTML={{
                                  __html:
                                    comp.component_json?.props?.html || "",
                                }}
                              />
                            </div>
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Public
                              </Badge>
                            </div>
                          </div>

                          {/* Component Info */}
                          <div className="px-4 py-3 border-t border-border/40 bg-card">
                            <div className="flex items-center justify-between gap-3">
                              <h5 className="text-[13px] font-semibold text-foreground/90 truncate flex-1">
                                {comp.name}
                              </h5>
                              <button
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteComponentDialog(comp);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-muted-foreground/60">
                                Published{" "}
                                {new Date(comp.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Imported Components Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Imported Components ({userImportedComponents.length})
                  </h3>
                  {userImportedComponents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p className="font-semibold">
                        No imported components yet
                      </p>
                      <p className="text-sm mt-1">
                        Browse the marketplace and import components to get
                        started
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userImportedComponents.map((comp) => (
                        <div
                          key={comp.id}
                          className="theme-interactive-card group relative rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all cursor-pointer flex flex-col h-full"
                        >
                          {/* Preview */}
                          <div className="relative flex-1 bg-white dark:bg-slate-950 aspect-4/3 overflow-hidden flex items-center justify-center p-2">
                            <style>
                              {`
                                .preview-container-${comp.id} {
                                  ${comp.component_json?.props?.css || ""}
                                  width: 100%;
                                  display: flex;
                                  justify-content: center;
                                  align-items: center;
                                }
                                
                                .inner-scaler-${comp.id} {
                                  zoom: 0.5; 
                                  -moz-transform: scale(0.5);
                                  -moz-transform-origin: center center;
                                  width: max-content;
                                  height: max-content;
                                }
                              `}
                            </style>
                            <div
                              className={`preview-container-${comp.id} w-full h-full`}
                            >
                              <div
                                className={`inner-scaler-${comp.id}`}
                                dangerouslySetInnerHTML={{
                                  __html:
                                    comp.component_json?.props?.html || "",
                                }}
                              />
                            </div>
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-xs">
                                Imported
                              </Badge>
                            </div>
                          </div>

                          {/* Component Info */}
                          <div className="px-4 py-3 border-t border-border/40 bg-card">
                            <div className="flex items-center justify-between gap-3">
                              <h5 className="text-[13px] font-semibold text-foreground/90 truncate flex-1">
                                {comp.name}
                              </h5>
                              <button
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteComponentDialog(comp);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-muted-foreground/60">
                                Imported{" "}
                                {new Date(comp.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowMyComponentsModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Component Confirmation Dialog */}
      <Dialog
        open={showDeleteComponentDialog}
        onOpenChange={(open) => {
          setShowDeleteComponentDialog(open);
          if (!open) setPendingDeleteComponent(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete component forever?</DialogTitle>
            <DialogDescription>
              This will permanently delete "
              {pendingDeleteComponent?.name || "this component"}". This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteComponentDialog(false);
                setPendingDeleteComponent(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteComponent}>
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
