"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Search, X, Sparkles, Heart } from "lucide-react";
import { getApiBaseUrl } from "../utils/apiConfig";
import { getSupabaseSession } from "../supabase/auth/authService";

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  projectLayout?: any[];
  category: string;
  premium: boolean;
  tags: string[];
  creator?: string;
  creatorAvatar?: string;
  views?: number;
  favorites?: number;
}

interface CreateNewWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (
    templateId: string,
    projectName: string,
    projectCategory: string,
    projectDescription?: string,
  ) => void | Promise<void>;
  onTemplateChange?: (templateId: string) => void;
  onTrackSearch: (query: string) => void;
  recommendedTemplates?: Template[];
  initialTemplateId?: string | null;
}

interface TemplateComment {
  id: string;
  userId: string;
  userName: string;
  userComment: string;
  createdAt: string;
  userAvatar?: string;
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

const categories = [
  "All",
  "Blank",
  "Portfolio",
  "E-commerce",
  "Blog",
  "Landing Page",
  "Dashboard",
  "Business",
  "Agency",
];

const normalizeProjectCategory = (category?: string) => {
  if (!category) return "Starter";
  return projectCategoryOptions.includes(category) ? category : "Other";
};
const API_URL =
  import.meta.env.VITE_API_URL || getApiBaseUrl() || "http://localhost:4000";

const joinApiUrl = (base: string, path: string) => {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const fetchWithPathFallback = async (paths: string[], init?: RequestInit) => {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const response = await fetch(joinApiUrl(API_URL, path), init);
      if (!response.ok) {
        throw new Error(`Request failed for ${path}: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Request failed for all route candidates.");
};

const normalizeCanvasValue = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const collectPreviewComponents = (layout: any[]): any[] => {
  const collected: any[] = [];

  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;
    collected.push(node);

    if (Array.isArray(node.children)) node.children.forEach(visit);
    if (Array.isArray(node.components)) node.components.forEach(visit);
  };

  layout.forEach(visit);
  return collected;
};

const extractLayoutBounds = (components: any[]) => {
  if (!components.length) return { minX: 0, minY: 0, maxX: 1200, maxY: 720 };

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  components.forEach((component) => {
    const x = normalizeCanvasValue(component?.position?.x, 0);
    const y = normalizeCanvasValue(component?.position?.y, 0);
    const width = normalizeCanvasValue(component?.style?.width, 320);
    const height = normalizeCanvasValue(component?.style?.height, 160);

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + Math.max(width, 1));
    maxY = Math.max(maxY, y + Math.max(height, 1));
  });

  return {
    minX: Number.isFinite(minX) ? minX : 0,
    minY: Number.isFinite(minY) ? minY : 0,
    maxX: Number.isFinite(maxX) ? maxX : 1200,
    maxY: Number.isFinite(maxY) ? maxY : 720,
  };
};

const resolveFirstPageLayout = (layout?: any[]): any[] => {
  if (!Array.isArray(layout) || layout.length === 0) return [];
  const firstItem = layout[0];
  if (
    firstItem &&
    typeof firstItem === "object" &&
    Array.isArray(firstItem.components)
  ) {
    return firstItem.components;
  }
  return layout;
};

const CanvasLayoutPreview = ({
  layout,
  name,
  className = "w-full h-full",
  viewportWidth = 320,
  viewportHeight = 180,
}: {
  layout?: any[];
  name: string;
  className?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}) => {
  const normalizedLayout = Array.isArray(layout)
    ? collectPreviewComponents(layout).filter(
        (component) => component && typeof component === "object",
      )
    : [];

  if (!normalizedLayout.length) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-muted text-xs text-muted-foreground`}
      >
        {name}
      </div>
    );
  }

  const bounds = extractLayoutBounds(normalizedLayout);
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const viewportRatio = viewportHeight / viewportWidth;
  const idealPreviewHeight = width * viewportRatio;
  const isTallLayout = height > idealPreviewHeight * 1.25;
  const croppedHeight = isTallLayout
    ? Math.min(height, Math.max(idealPreviewHeight, height * 0.5))
    : height;
  const fitScale = viewportWidth / width;
  const safeScale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 0.2;
  const scaledWidth = width * safeScale;
  const scaledHeight = croppedHeight * safeScale;
  const translateX = (viewportWidth - scaledWidth) / 2;
  const translateY =
    scaledHeight > viewportHeight ? 0 : (viewportHeight - scaledHeight) / 2;

  return (
    <div
      className={`${className} relative overflow-hidden rounded-md bg-[#f7f8fa]`}
    >
      <div
        className="origin-top-left"
        style={{
          width: `${width}px`,
          height: `${croppedHeight}px`,
          transform: `translate(${translateX}px, ${translateY}px) scale(${safeScale})`,
          transformOrigin: "top left",
        }}
      >
        {normalizedLayout.map((component, index) => {
          const componentStyle = (component?.style || {}) as Record<
            string,
            any
          >;
          const x =
            normalizeCanvasValue(component?.position?.x, 0) - bounds.minX;
          const y =
            normalizeCanvasValue(component?.position?.y, 0) - bounds.minY;
          const widthValue = normalizeCanvasValue(componentStyle.width, 320);
          const heightValue = normalizeCanvasValue(componentStyle.height, 140);
          const type = String(component?.type || "").toLowerCase();
          const content = String(
            component?.props?.text ??
              component?.props?.content ??
              component?.props?.children ??
              component?.props?.title ??
              component?.props?.label ??
              component?.name ??
              "",
          );

          return (
            <div
              key={component.id || `${name}-${index}`}
              className="absolute overflow-hidden"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${Math.max(widthValue, 1)}px`,
                height: `${Math.max(heightValue, 1)}px`,
                borderRadius: componentStyle.borderRadius ?? 8,
                background:
                  componentStyle.background ||
                  componentStyle.backgroundColor ||
                  (type === "button" ? "#2563eb" : "rgba(148,163,184,0.2)"),
                border:
                  componentStyle.border || "1px solid rgba(148,163,184,0.35)",
                color:
                  componentStyle.color ||
                  (type === "button" ? "#ffffff" : "#0f172a"),
                fontSize:
                  componentStyle.fontSize ||
                  (type === "heading" ? "22px" : "14px"),
                fontWeight:
                  componentStyle.fontWeight || (type === "heading" ? 700 : 500),
                padding: componentStyle.padding || "8px 10px",
                display: "flex",
                alignItems: componentStyle.alignItems || "center",
                justifyContent: componentStyle.justifyContent || "center",
                textAlign: componentStyle.textAlign || "center",
                whiteSpace: "pre-wrap",
                boxShadow:
                  componentStyle.boxShadow || "0 2px 8px rgba(15,23,42,0.06)",
              }}
            >
              {type === "image" && component?.props?.src ? (
                <img
                  src={component.props.src}
                  alt={component?.props?.alt || name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="line-clamp-3">{content || type}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function CreateNewWebsiteModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onTemplateChange,
  onTrackSearch,
  recommendedTemplates = [],
  initialTemplateId = null,
}: CreateNewWebsiteModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [projectName, setProjectName] = useState("");

  const [projectCategory, setProjectCategory] = useState("Starter");
  const [projectDescription, setProjectDescription] = useState("");

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [showNameInput, setShowNameInput] = useState(false);
  const [projectTemplates, setProjectTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateComments, setTemplateComments] = useState<TemplateComment[]>(
    [],
  );
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const createProjectInFlightRef = useRef(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isBlankTemplateSelected = selectedTemplate?.id === "blank";
  const [mlRecommendedTemplates, setMlRecommendedTemplates] = useState<
    Template[]
  >([]);
  const [isLoadingRecommendedTemplates, setIsLoadingRecommendedTemplates] =
    useState(false);

  // 1. We sync state DURING the render phase instead of waiting for a useEffect.
  // This calculates the correct view BEFORE the browser paints, completely eliminating the flash on open.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  const normalizeTemplate = (item: any, index: number): Template => ({
    id: String(
      item?.id ??
        item?._id ??
        item?.project_id ??
        item?.project?.projects_id ??
        item?.projects?.projects_id ??
        item?.templateId ??
        `template-${index}`,
    ),
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
    projectLayout: resolveFirstPageLayout(
      Array.isArray(item?.project_layout)
        ? item.project_layout
        : Array.isArray(item?.projectLayout)
          ? item.projectLayout
          : Array.isArray(item?.project?.project_layout)
            ? item.project.project_layout
            : Array.isArray(item?.projects?.project_layout)
              ? item.projects.project_layout
              : [],
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
    premium: Boolean(item?.premium ?? item?.isPremium ?? item?.isPro ?? false),
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
        item?.likeCount ??
        item?.like_count ??
        item?.likes ??
        item?.project?.likes ??
        item?.projects?.likes ??
        0,
    ),
  });

  const extractTemplateLayoutFromApiResponse = (payload: any): any[] => {
    const templateData = Array.isArray(payload?.templateData)
      ? payload.templateData
      : [];

    if (!templateData.length) return [];

    const projectLayout = templateData[0]?.projects?.project_layout;
    return Array.isArray(projectLayout)
      ? resolveFirstPageLayout(projectLayout)
      : [];
  };

  const fetchTemplateLayoutByProjectId = async (
    projectId: string,
  ): Promise<any[]> => {
    if (!projectId || projectId === "blank") return [];

    const response = await fetchWithPathFallback([
      `/api/template-data/${encodeURIComponent(projectId)}`,
      `/api/get-template-data-by-id/${encodeURIComponent(projectId)}`,
    ]);

    const json = await response.json();
    return extractTemplateLayoutFromApiResponse(json);
  };

  const hydrateTemplatesWithLayouts = async (
    templates: Template[],
  ): Promise<Template[]> => {
    const hydratedTemplates = await Promise.all(
      templates.map(async (template) => {
        if (
          Array.isArray(template.projectLayout) &&
          template.projectLayout.length > 0
        ) {
          return template;
        }

        try {
          const fetchedLayout = await fetchTemplateLayoutByProjectId(
            template.id,
          );
          if (Array.isArray(fetchedLayout) && fetchedLayout.length > 0) {
            return { ...template, projectLayout: fetchedLayout };
          }
        } catch (error) {
          console.warn(
            `[CreateNewWebsiteModal] failed to fetch layout for ${template.id}`,
            error,
          );
        }

        return template;
      }),
    );

    return hydratedTemplates;
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchProjectTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const response = await fetch(`${API_URL}/api/display-templates`);
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.status}`);
        }

        const json = await response.json();
        const payload = Array.isArray(json)
          ? json
          : Array.isArray(json?.templates)
            ? json.templates
            : [];

        if (isMounted) {
          const normalizedTemplates = payload.map(normalizeTemplate);
          const hydratedTemplates =
            await hydrateTemplatesWithLayouts(normalizedTemplates);
          setProjectTemplates(hydratedTemplates);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        if (isMounted) {
          setProjectTemplates([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTemplates(false);
        }
      }
    };

    fetchProjectTemplates();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async () => {
      const {
        data: { session },
      } = await getSupabaseSession();

      if (!mounted) return;
      setCurrentUserId(session?.user?.id ?? null);
    };

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const loadRecommendedTemplates = async () => {
      try {
        setIsLoadingRecommendedTemplates(true);

        const {
          data: { session },
        } = await getSupabaseSession();

        const userId = session?.user?.id;

        if (!userId) {
          if (mounted) setMlRecommendedTemplates([]);
          return;
        }

        const cbfApiUrl =
          import.meta.env.VITE_CBF_API_URL ||
          "http://buildx-cbfapi.buildxdesigner.site:5000";

        const response = await fetch(
          `${cbfApiUrl}/recommendations?user_id=${encodeURIComponent(userId)}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch recommendations: ${response.status}`,
          );
        }

        const json = await response.json();
        console.log("recommended templates response", json);
        const payload = Array.isArray(json)
          ? json
          : Array.isArray(json?.templates)
            ? json.templates
            : Array.isArray(json?.recommendations)
              ? json.recommendations
              : [];

        if (mounted) {
          const normalizedTemplates = payload.map(normalizeTemplate);
          const hydratedTemplates =
            await hydrateTemplatesWithLayouts(normalizedTemplates);
          setMlRecommendedTemplates(hydratedTemplates);
        }
      } catch (error) {
        console.error("Failed to fetch ML recommended templates:", error);
        if (mounted) {
          setMlRecommendedTemplates([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingRecommendedTemplates(false);
        }
      }
    };

    loadRecommendedTemplates();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const normalizeCommentsPayload = (payload: any): TemplateComment[] => {
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.comments)
        ? payload.comments
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    return rows.map((item: any, index: number) => {
      const commentText = String(
        item?.userComment ?? item?.user_comment ?? item?.comment ?? "",
      ).trim();

      return {
        id: String(
          item?.id ?? item?._id ?? item?.comment_id ?? `comment-${index}`,
        ),
        userId: String(
          item?.userId ??
            item?.user_id ??
            item?.profiles?.user_id ??
            item?.profiles?.id ??
            "",
        ),
        userName: String(
          item?.userName ??
            item?.user_name ??
            item?.profiles?.full_name ??
            item?.full_name ??
            "Anonymous",
        ),
        userComment: commentText,
        createdAt: String(
          item?.createdAt ??
            item?.created_at ??
            item?.timestamp ??
            item?.commented_at ??
            "",
        ),
        userAvatar: item?.avatarUrl
          ? String(item.avatarUrl)
          : item?.avatar_url
            ? String(item.avatar_url)
            : item?.profiles?.avatar_url
              ? String(item.profiles.avatar_url)
              : "",
      };
    });
  };

  const fetchTemplateComments = async (projectId: string) => {
    setIsLoadingComments(true);
    setCommentsError(null);

    try {
      const encodedProjectId = encodeURIComponent(projectId);
      const response = await fetchWithPathFallback(
        [
          `/api/fetch-comments/${encodedProjectId}`,
          `/fetch-comments/${encodedProjectId}`,
          `/api/fetch-comments?projectId=${encodedProjectId}`,
          `/fetch-comments?projectId=${encodedProjectId}`,
        ],
        {
          method: "GET",
        },
      );

      const payload = await response.json();
      setTemplateComments(normalizeCommentsPayload(payload));
    } catch (error) {
      console.error("Failed to fetch template comments:", error);
      setCommentsError("Failed to load comments.");
      setTemplateComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (!showNameInput || !selectedTemplate?.id || isBlankTemplateSelected) {
      setTemplateComments([]);
      setCommentsError(null);
      return;
    }

    fetchTemplateComments(selectedTemplate.id);
  }, [showNameInput, selectedTemplate?.id, isBlankTemplateSelected]);

  const handleSubmitComment = async () => {
    const trimmedComment = newComment.trim();
    const projectId = selectedTemplate?.id;

    if (
      !projectId ||
      !trimmedComment ||
      isSubmittingComment ||
      isBlankTemplateSelected
    ) {
      return;
    }

    if (!currentUserId) {
      setCommentsError("Please log in to submit a comment.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentsError(null);

    try {
      const encodedProjectId = encodeURIComponent(projectId);

      await fetchWithPathFallback(
        [
          `/api/insert-comment/${encodedProjectId}`,
          `/insert-comment/${encodedProjectId}`,
          "/api/insert-comment",
          "/insert-comment",
        ],
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            userId: currentUserId,
            userComment: trimmedComment,
          }),
        },
      );

      setNewComment("");
      await fetchTemplateComments(projectId);
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setCommentsError("Failed to submit comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getRelativeCommentTime = (value: string) => {
    if (!value) return "";

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return "";

    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(value).toLocaleDateString();
  };

  const availableTemplates = projectTemplates;

  const resolveProjectCategory = (template: Template) =>
    normalizeProjectCategory(
      template.id === "blank" ? "Starter" : template.category,
    );

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      if (initialTemplateId) {
        const allTemplates = [...availableTemplates, ...recommendedTemplates];
        const template = allTemplates.find((t) => t.id === initialTemplateId);
        if (template) {
          setSelectedTemplate(template);
          setProjectName(`My ${template.name}`);

          setProjectCategory(resolveProjectCategory(template));
          setProjectDescription("");
          setShowNameInput(true);
        }
      } else {
        // Reset to default browse state when opening without a specific template
        setShowNameInput(false);
        setSelectedTemplate(null);
        setProjectName("");
        setProjectCategory("Starter");
        setProjectDescription("");
        setSearchQuery("");
        setSelectedCategory("All");
      }
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      onTrackSearch(query);
    }
  };

  const filteredTemplates = availableTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === "All" || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    onTemplateChange?.(template.id);
    setProjectName(`My ${template.name}`);
    setProjectCategory(resolveProjectCategory(template));
    setProjectDescription("");
    setNewComment("");
    setTemplateComments([]);
    setCommentsError(null);
    setShowNameInput(true);
  };

  const handleCreateProject = async () => {
    if (!selectedTemplate || !projectName.trim()) return;
    if (createProjectInFlightRef.current) return;

    createProjectInFlightRef.current = true;
    setIsCreatingProject(true);

    try {
      await onSelectTemplate(
        selectedTemplate.id,
        projectName,
        projectCategory,
        projectDescription.trim(),
      );
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      createProjectInFlightRef.current = false;
      setIsCreatingProject(false);
    }
  };

  const handleClose = () => {
    createProjectInFlightRef.current = false;
    setIsCreatingProject(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        data-tour="template-details-dialog"
        className="max-h-[95vh] p-0 overflow-auto"
        style={{ width: "min(1000px, 98vw)", maxWidth: "98vw" }}
      >
        {!showNameInput ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-2xl">Create New Website</DialogTitle>
              {/* FIXED: Changed from <p> to <DialogDescription> to resolve Radix warning */}
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                Choose a template to get started quickly
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-4 border-b bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search templates by name, category, or keywords..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <Tabs
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-6 pt-4">
                <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2">
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="shrink-0"
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea
                data-tour="create-website-templates"
                className="flex-1 px-6 py-4 overflow-visible"
              >
                {selectedCategory === "All" && !searchQuery && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-600" />
                      Recommended Template
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                      {mlRecommendedTemplates.slice(0, 10).map((template) => (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-violet-200 hover:border-violet-400 group overflow-hidden"
                          onClick={() => handleTemplateClick(template)}
                        >
                          <div className="relative aspect-video overflow-hidden">
                            {Array.isArray(template.projectLayout) &&
                            template.projectLayout.length > 0 ? (
                              <CanvasLayoutPreview
                                layout={template.projectLayout}
                                name={template.name}
                              />
                            ) : (
                              <img
                                src={template.thumbnail || "/placeholder.svg"}
                                alt={template.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            )}
                            {template.premium && (
                              <Badge className="absolute top-2 right-2 bg-linear-to-r from-yellow-500 to-yellow-600">
                                Premium
                              </Badge>
                            )}
                            <div className="absolute top-2 left-2">
                              <Badge
                                variant="secondary"
                                className="bg-violet-600 text-white"
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Recommended
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-1 line-clamp-1">
                              {template.name}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {template.description}
                            </p>
                            <div className="flex items-center justify-between pt-3 border-t">
                              <div className="flex items-center gap-2">
                                <img
                                  src={
                                    template.creatorAvatar ||
                                    "https://api.dicebear.com/7.x/initials/svg?seed=User"
                                  }
                                  alt={template.creator}
                                  className="w-6 h-6 rounded-full"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {template.creator}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5" />
                                  <span>{template.favorites || 0}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4 mt-2">
                  <h3 className="text-lg font-semibold">All Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse all available templates
                  </p>
                </div>

                <TabsContent
                  value={selectedCategory}
                  className="mt-0 space-y-4"
                >
                  {isLoadingTemplates && (
                    <div className="text-sm text-muted-foreground">
                      Loading templates...
                    </div>
                  )}
                  {filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                      {filteredTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-blue-400 group overflow-hidden"
                          onClick={() => handleTemplateClick(template)}
                        >
                          <div className="relative aspect-video overflow-hidden">
                            {Array.isArray(template.projectLayout) &&
                            template.projectLayout.length > 0 ? (
                              <CanvasLayoutPreview
                                layout={template.projectLayout}
                                name={template.name}
                              />
                            ) : (
                              <img
                                src={template.thumbnail || "/placeholder.svg"}
                                alt={template.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            )}
                            {template.premium && (
                              <Badge className="absolute top-2 right-2 bg-linear-to-r from-yellow-500 to-yellow-600">
                                Premium
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-1 line-clamp-1">
                              {template.name}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {template.description}
                            </p>
                            <div className="flex items-center justify-between pt-3 border-t">
                              <div className="flex items-center gap-2">
                                <img
                                  src={
                                    template.creatorAvatar ||
                                    "https://api.dicebear.com/7.x/initials/svg?seed=User"
                                  }
                                  alt={template.creator}
                                  className="w-6 h-6 rounded-full"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {template.creator}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5" />
                                  <span>{template.favorites || 0}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        No templates found
                      </h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search or filter
                      </p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-2xl">Name Your Project</DialogTitle>
              {/* FIXED: Changed from <p> to <DialogDescription> */}
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                Give your new website a memorable name
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {selectedTemplate && (
                <Card className="border-2">
                  <div className="flex items-start gap-4 p-4">
                    <div className="w-32 h-24 rounded overflow-hidden shrink-0">
                      {Array.isArray(selectedTemplate.projectLayout) &&
                      selectedTemplate.projectLayout.length > 0 ? (
                        <CanvasLayoutPreview
                          layout={selectedTemplate.projectLayout}
                          name={selectedTemplate.name}
                          className="w-full h-full"
                          viewportWidth={128}
                          viewportHeight={96}
                        />
                      ) : (
                        <img
                          src={selectedTemplate.thumbnail || "/placeholder.svg"}
                          alt={selectedTemplate.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">
                        {selectedTemplate.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedTemplate.description}
                      </p>
                      <Badge variant="outline">
                        {selectedTemplate.category}
                      </Badge>
                    </div>
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  placeholder="Enter project name..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Category</label>
                <Select
                  value={projectCategory}
                  onValueChange={setProjectCategory}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectCategoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Project Description (Optional)
                </label>
                <Textarea
                  placeholder="Describe your website (optional)..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="min-h-[100px] text-sm"
                />

                <p className="text-xs text-muted-foreground">
                  You can change this later in project settings
                </p>
              </div>

              {!isBlankTemplateSelected && (
                <div className="space-y-3 border-t pt-4">
                  <div className="space-y-2">
                    <Textarea
                      data-tour="template-comment-textarea"
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Share feedback about this template.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                      >
                        {isSubmittingComment
                          ? "Submitting..."
                          : "Submit Comment"}
                      </Button>
                    </div>
                    {commentsError && (
                      <p className="text-xs text-red-500">{commentsError}</p>
                    )}
                  </div>
                  <label className="text-sm font-medium">Comments</label>

                  <div className="max-h-48 overflow-y-auto space-y-3 rounded-md border p-3 bg-muted/20">
                    {isLoadingComments ? (
                      <p className="text-sm text-muted-foreground">
                        Loading comments...
                      </p>
                    ) : templateComments.length > 0 ? (
                      templateComments.map((comment) => (
                        <div key={comment.id} className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={
                                  comment.userAvatar ||
                                  "https://api.dicebear.com/7.x/initials/svg?seed=User"
                                }
                                alt={comment.userName || "Anonymous"}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                              <p className="text-xs font-medium text-foreground truncate">
                                {comment.userName || "Anonymous"}
                              </p>
                            </div>
                            {comment.createdAt && (
                              <p className="text-[11px] text-muted-foreground shrink-0">
                                {getRelativeCommentTime(comment.createdAt)}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground break-words">
                            {comment.userComment}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No comments yet. Be the first to comment.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handleCreateProject}
                  disabled={!projectName.trim() || isCreatingProject}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                >
                  {isCreatingProject ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
