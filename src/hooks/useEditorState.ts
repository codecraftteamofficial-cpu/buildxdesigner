"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import type { ComponentData, EditorState } from "../types/editor";
import { getSupabaseSession } from "../supabase/auth/authService";
import { supabase } from "../supabase/config/supabaseClient";
import {
  saveProject,
  fetchProjectById,
  fetchProjectComponents,
  syncProjectComponents,
  saveProjectMetadata,
} from "../supabase/data/projectService";
import useCollaboration from "../services/useCollaboration";

function getInitialTheme(): "light" | "dark" | "system" {
  const savedTheme = localStorage.getItem("fulldev-ai-theme");
  if (
    savedTheme === "light" ||
    savedTheme === "dark" ||
    savedTheme === "system"
  ) {
    return savedTheme;
  }
  return "dark";
}

function getInitialUserProjectConfig() {
  const url = localStorage.getItem("target_supabase_url");
  const key = localStorage.getItem("target_supabase_key");
  if (url && key) {
    return { supabaseUrl: url, supabaseKey: key };
  }
  return { supabaseUrl: "", supabaseKey: "" };
}

function getInitialView(): EditorState["currentView"] {
  const savedView = localStorage.getItem("fulldev-ai-current-view");
  if (
    savedView === "editor" ||
    savedView === "dashboard" ||
    savedView === "admin-login" ||
    savedView === "admin"
  ) {
    return savedView;
  }
  return "landing";
}

function getInitialProjectId(): string | null {
  return localStorage.getItem("fulldev-ai-current-project-id") || null;
}

function getInitialProjectName(): string {
  return localStorage.getItem("fulldev-ai-project-name") || "Untitled Project";
}

export function useEditorState() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("/index.html");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const exportSnapshotRef = useRef<ComponentData[]>([]);

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  } | null>(null);

  const [state, setState] = useState<EditorState>({
    currentView: getInitialView(),
    currentPage: getInitialView(),
    pages: [{ id: "home", name: "Home", path: "/" }],
    activePageId: "home",
    components: [],
    selectedComponent: null,
    showPreview: false,
    showCodeExport: false,
    showTemplates: false,
    showAIGenerator: false,
    editorMode: "blocks",
    viewMode: "design",
    leftSidebarWidth: 280,
    rightSidebarWidth: 320,
    isLeftSidebarVisible: true,
    isRightSidebarVisible: true,
    isResizingLeftSidebar: false,
    isResizingRightSidebar: false,
    propertiesPanelVisible: true,
    aiAssistantVisible: true,
    canvasWidth: 1280,
    showMobileProperties: false,
    canvasZoom: 100,
    currentProjectId: getInitialProjectId(),
    showPublishModal: false,
    showShareModal: false,
    lastSaved: null,
    theme: getInitialTheme(),
    isCodeSyncing: true,
    isSaving: false,
    hasUnsavedChanges: false,
    isFullscreen: false,
    rightSidebarTab: "properties",
    projectName: getInitialProjectName(),
    canvasBackgroundColor: "#ffffff",
    showCanvasGrid: true,
    showAIAssistantModal: false,
    currentUser: null,
    isSupabaseConnected: false,
    userProjectConfig: getInitialUserProjectConfig(),
    projectIsPublic: null,
    projectAuthorId: null,
    projectSubdomain: undefined as string | undefined,
    projectIsPublished: undefined as boolean | undefined,
    projectLastPublishedAt: undefined as string | undefined,
    projectTemplatePublished: undefined as boolean | undefined,
    exportSnapshot: [],
  });

  const {
    getOrInitDoc,
    replaceComponents,
    replacePages,
    addComponent: rawAddComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    reorderComponent: collaborationReorder,
    clearCanvas,
    remoteCursors,
    replaceProjectName,
  } = useCollaboration({
    projectId: state.currentProjectId || "",
    setState,
    state,
    currentProjectId: state.currentProjectId,
    projectSubdomain: state.projectSubdomain,
    projectIsPublished: state.projectIsPublished,
    projectLastPublishedAt: state.projectLastPublishedAt,
  });

  const addComponent = (component: ComponentData) => {
    rawAddComponent({
      ...component,
      page_id: component.page_id || state.activePageId,
    });
  };

  // ==================== AUTO-SAVE METADATA ====================
  // Save metadata like pages and project name whenever they change
  useEffect(() => {
    if (!state.currentProjectId || !isAuthenticated || !state.hasUnsavedChanges)
      return;

    const timer = setTimeout(async () => {
      try {
        console.log("Autosaving project metadata (pages, etc)...");
        await saveProjectMetadata({
          id: state.currentProjectId!,
          name: state.projectName,
          user_id: currentUser?.id || "",
          pages: state.pages,
          siteTitle: state.siteTitle,
          siteLogoUrl: state.siteLogoUrl,
          // We also include components from state to keep the JSON column in sync
          project_layout: state.components,
        });
      } catch (err) {
        console.error("Failed to autosave metadata:", err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    state.pages,
    state.projectName,
    state.siteTitle,
    state.siteLogoUrl,
    state.currentProjectId,
    isAuthenticated,
    currentUser?.id,
    state.components,
  ]);

  // ==================== AUTH ====================

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken =
      hashParams.get("access_token") ||
      searchParams.get("token") ||
      searchParams.get("access_token");
    const refreshToken =
      hashParams.get("refresh_token") || searchParams.get("refresh_token");

    const isIntegrationCallback = searchParams.get("status") === "success";

    if (accessToken) {
      if (isIntegrationCallback) {
        if (accessToken) {
          localStorage.setItem("supabase_integration_token", accessToken);
        }
        localStorage.setItem("open_account_settings", "integration");
        localStorage.setItem("update_supabase_status", "true");
        window.location.href = "/dashboard";
        return;
      }

      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        })
        .then(async () => {
          window.history.replaceState({}, document.title, "/dashboard");
          setState((prev) => ({
            ...prev,
            currentView: "dashboard",
            currentPage: "dashboard",
          }));
          setIsAuthenticated(true);
          setAuthLoading(false);
        })
        .catch((err) => {
          console.error("Error setting session from URL:", err);
          setAuthLoading(false);
        });

      return;
    }

    // No token in URL, check existing session
    const checkSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const {
        data: { session },
      } = await getSupabaseSession();
      const loggedIn = !!session;

      let isConnected = false;
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("isConnected")
          .eq("user_id", session.user.id) // ✅ Use "user_id" not "id"
          .single();

        if (profileError) {
          console.error(
            "Error fetching profile connection status:",
            profileError,
          );
        }

        if (profile?.isConnected === 1) isConnected = true;
      }

      setIsAuthenticated(loggedIn);

      // Check onboarding status
      if (loggedIn && session?.user) {
        const onboardingCompleted =
          session.user.user_metadata?.onboarding_completed;
        if (!onboardingCompleted) {
          setShowOnboarding(true);
        }
      }

      setAuthLoading(false);

      const savedView = localStorage.getItem("fulldev-ai-current-view");
      const path = window.location.pathname;

      setState((prev) => {
        let nextView = prev.currentView;

        if (path.startsWith("/editor")) {
          nextView = "editor";
        } else if (loggedIn) {
          if (savedView === "editor" || savedView === "dashboard") {
            nextView = savedView;
          } else {
            nextView = "dashboard";
          }
        } else {
          nextView = "landing";
        }

        return {
          ...prev,
          currentView: nextView,
          currentPage: nextView,
          currentUser: session?.user || null,
          isSupabaseConnected: isConnected,
        };
      });
    };

    checkSession();
  }, []);

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { session },
      } = await getSupabaseSession();
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || "",
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name,
          avatar_url:
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture,
        });
      }
    };
    fetchCurrentUser();
  }, []);

  // ==================== PERSISTENCE ====================

  useEffect(() => {
    if (
      state.currentView === "editor" ||
      state.currentView === "dashboard" ||
      state.currentView === "admin-login" ||
      state.currentView === "admin"
    ) {
      localStorage.setItem("fulldev-ai-current-view", state.currentView);
    } else if (state.currentView === "landing") {
      localStorage.removeItem("fulldev-ai-current-view");
    }
  }, [state.currentView]);

  useEffect(() => {
    if (state.currentProjectId) {
      localStorage.setItem(
        "fulldev-ai-current-project-id",
        state.currentProjectId,
      );
    }
  }, [state.currentProjectId]);

  useEffect(() => {
    if (state.projectName) {
      localStorage.setItem("fulldev-ai-project-name", state.projectName);
    }
  }, [state.projectName]);

  // ==================== PROJECT LOADING ====================

  useEffect(() => {
    if (!state.currentProjectId) return;
    if (state.currentView !== "editor") return;

    let isCancelled = false;
    const requestedProjectId = state.currentProjectId;

    const timeoutId = window.setTimeout(() => {
      if (isCancelled) return;
      setState((prev) => {
        if (
          prev.currentProjectId !== requestedProjectId ||
          prev.projectIsPublic !== null
        ) {
          return prev;
        }

        return {
          ...prev,
          projectIsPublic: false,
          projectAuthorId: null,
        };
      });
    }, 8000);

    (async () => {
      try {
        const { data: urlValidity, error: urlError } = await supabase
          .from("projects")
          .select(
            "is_public, user_id, subdomain, is_published, last_published_at, published_template",
          )
          .eq("projects_id", requestedProjectId)
          .maybeSingle();

        if (isCancelled) return;

        if (urlError || !urlValidity) {
          console.error("Project visibility check failed.", urlError);

          // If we can't read visibility, check if we can read the project itself
          const { data: projectCheck } = await supabase
            .from("projects")
            .select(
              "is_public, user_id, subdomain, is_published, last_published_at, published_template",
            )
            .eq("projects_id", requestedProjectId)
            .maybeSingle();

          if (isCancelled) return;

          if (projectCheck) {
            setState((prev) => {
              if (prev.currentProjectId !== requestedProjectId) return prev;
              return {
                ...prev,
                projectIsPublic: !!projectCheck.is_public,
                projectAuthorId: projectCheck.user_id || null,
                projectSubdomain: projectCheck.subdomain || undefined,
                projectIsPublished: !!projectCheck.is_published,
                projectLastPublishedAt:
                  projectCheck.last_published_at || undefined,
                projectTemplatePublished:
                  projectCheck.published_template === null ||
                  projectCheck.published_template === undefined
                    ? undefined
                    : !!projectCheck.published_template,
              };
            });
          } else {
            setState((prev) => {
              if (prev.currentProjectId !== requestedProjectId) return prev;
              return {
                ...prev,
                projectIsPublic: false,
                projectAuthorId: null,
                projectTemplatePublished: undefined,
              };
            });
          }
          return;
        }

        setState((prev) => {
          if (prev.currentProjectId !== requestedProjectId) return prev;
          return {
            ...prev,
            projectIsPublic: !!urlValidity?.is_public,
            projectAuthorId: urlValidity?.user_id || null,
            projectSubdomain: urlValidity?.subdomain || undefined,
            projectIsPublished: !!urlValidity?.is_published,
            projectLastPublishedAt: urlValidity?.last_published_at || undefined,
            projectTemplatePublished:
              urlValidity?.published_template === null ||
              urlValidity?.published_template === undefined
                ? undefined
                : !!urlValidity?.published_template,
          };
        });
      } catch (error) {
        if (isCancelled) return;
        console.error("Unexpected visibility check error:", error);
        setState((prev) => {
          if (prev.currentProjectId !== requestedProjectId) return prev;
          return {
            ...prev,
            projectIsPublic: false,
            projectAuthorId: null,
            projectTemplatePublished: undefined,
          };
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [state.currentProjectId, state.currentView, setState]);

  // ==================== THEME ====================

  useEffect(() => {
    const root = document.documentElement;

    if (state.currentView === "landing") {
      root.classList.remove("dark");
      return;
    }

    const applyTheme = () => {
      if (state.theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        root.classList.toggle("dark", systemTheme === "dark");
      } else {
        root.classList.toggle("dark", state.theme === "dark");
      }
    };

    applyTheme();

    if (state.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [state.theme, state.currentView]);

  // ==================== TOGGLE HELPERS ====================

  const togglePreview = () =>
    setState((prev) => ({ ...prev, showPreview: !prev.showPreview }));
  const toggleCodeExport = () => {
    const { yComponents } = getOrInitDoc();
    const snapshot = yComponents.toArray();
    const captured = snapshot.length > 0 ? snapshot : state.components;

    setState((prev) => ({
      ...prev,
      showCodeExport: !prev.showCodeExport,
      exportSnapshot: !prev.showCodeExport ? captured : prev.exportSnapshot,
    }));
  };
  const toggleTemplates = () =>
    setState((prev) => ({ ...prev, showTemplates: !prev.showTemplates }));
  const togglePublishModal = () =>
    setState((prev) => ({ ...prev, showPublishModal: !prev.showPublishModal }));
  const toggleShareModal = () =>
    setState((prev) => ({ ...prev, showShareModal: !prev.showShareModal }));
  const toggleEditorMode = () =>
    setState((prev) => ({
      ...prev,
      editorMode: prev.editorMode === "blocks" ? "dual-pane" : "blocks",
    }));
  const togglePropertiesPanel = () =>
    setState((prev) => ({
      ...prev,
      propertiesPanelVisible: !prev.propertiesPanelVisible,
    }));
  const toggleCodeSync = () =>
    setState((prev) => ({ ...prev, isCodeSyncing: !prev.isCodeSyncing }));
  const toggleMobileProperties = () =>
    setState((prev) => ({
      ...prev,
      showMobileProperties: !prev.showMobileProperties,
    }));

  const toggleAIAssistant = () => {
    setState((prev) => ({
      ...prev,
      aiAssistantVisible: !prev.aiAssistantVisible,
      showAIAssistantModal: !prev.showAIAssistantModal,
    }));
  };

  // ==================== NAVIGATION ====================

  const enterDashboard = () =>
    setState((prev) => ({
      ...prev,
      currentView: "dashboard",
      currentPage: "dashboard",
    }));
  const enterEditor = () =>
    setState((prev) => ({
      ...prev,
      currentView: "editor",
      currentPage: "editor",
    }));
  const goToLanding = () =>
    setState((prev) => ({
      ...prev,
      currentView: "landing",
      currentPage: "landing",
    }));
  const goToDashboard = () =>
    setState((prev) => ({
      ...prev,
      currentView: "dashboard",
      currentPage: "dashboard",
      currentProjectId: null,
      projectIsPublic: null,
      projectAuthorId: null,
      projectTemplatePublished: undefined,
    }));
  const goToAdminLogin = () =>
    setState((prev) => ({
      ...prev,
      currentView: "admin-login",
      currentPage: "admin-login",
    }));
  const goToAdmin = () =>
    setState((prev) => ({
      ...prev,
      currentView: "admin",
      currentPage: "admin",
    }));

  // ==================== PROJECT OPERATIONS ====================

  const createFromScratch = () => {
    replaceComponents([]);
    setState((prev) => ({
      ...prev,
      currentView: "editor",
      currentPage: "editor",
      selectedComponent: null,
      currentProjectId: null,
      projectName: "Untitled Project",
      hasUnsavedChanges: false,
    }));
  };

  const openProject = (projectId: string, projectName?: string) => {
    setState((prev) => ({
      ...prev,
      currentView: "editor",
      currentPage: "editor",
      currentProjectId: projectId,
      projectIsPublic: null,
      projectAuthorId: null,
      projectTemplatePublished: undefined,
      projectName: projectName ?? "Untitled Project",
      selectedComponent: null,
      hasUnsavedChanges: false,
    }));
    localStorage.setItem("fulldev-ai-current-project-id", projectId);
    if (projectName) {
      localStorage.setItem("fulldev-ai-project-name", projectName);
    }
  };

  const updateProjectName = (name: string) => {
    setState((prev) => ({
      ...prev,
      projectName: name,
      hasUnsavedChanges: true,
    }));
    replaceProjectName(name);
    localStorage.setItem("fulldev-ai-project-name", name);
  };

  const updateUserProjectConfig = (url: string, key: string) => {
    const config = { supabaseUrl: url, supabaseKey: key };
    localStorage.setItem(
      "fulldev-ai-user-project-config",
      JSON.stringify(config),
    );
    setState((prev) => ({ ...prev, userProjectConfig: config }));
  };

  // ==================== TEMPLATE LOADING ====================

  const loadTemplate = async (template: ComponentData[]) => {
    const centerX = 500;
    const centerY = 300;
    let currentY = centerY;

    const newComponents = template.map((comp) => {
      const height =
        Number.parseFloat(
          String(comp.style?.height || "100").replace("px", ""),
        ) || 100;
      const width =
        Number.parseFloat(
          String(comp.style?.width || "600").replace("px", ""),
        ) || 600;

      const position = comp.position || { x: centerX - width / 2, y: currentY };
      currentY += height + 20;

      return { ...comp, id: Date.now().toString() + Math.random(), position };
    });

    try {
      let projectId = state.currentProjectId;
      const {
        data: { session },
      } = await getSupabaseSession();
      const user_id = session?.user?.id;

      if (user_id) {
        const payloadBase = {
          name: state.projectName || "Untitled Project",
          user_id,
          project_layout: newComponents,
        };

        if (!projectId) {
          const { data, error } = await saveProject(payloadBase);
          if (!error && data) {
            projectId = data.id;
          } else {
            console.error("Error creating project from template:", error);
          }
        } else {
          const { error } = await saveProject({
            ...payloadBase,
            id: projectId,
          });
          if (error) {
            console.error("Error updating project with template:", error);
          }
        }
      }

      replaceComponents(newComponents);
      setState((prev) => ({
        ...prev,
        showTemplates: false,
        currentView: "editor",
        currentPage: "editor",
        currentProjectId: projectId ?? prev.currentProjectId,
        hasUnsavedChanges: true,
      }));
    } catch (e) {
      console.error("Unexpected error applying template:", e);
      replaceComponents(newComponents);
      setState((prev) => ({
        ...prev,
        showTemplates: false,
        currentView: "editor",
        currentPage: "editor",
        hasUnsavedChanges: true,
      }));
    }
  };

  // ==================== THEME & VIEW ====================

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    setState((prev) => ({ ...prev, theme }));
    localStorage.setItem("fulldev-ai-theme", theme);
  };

  const handleViewModeChange = (viewMode: "design" | "code") => {
    setState((prev) => ({ ...prev, viewMode }));
  };

  const setCanvasZoom = (zoom: number) => {
    setState((prev) => ({
      ...prev,
      canvasZoom: Math.max(50, Math.min(200, zoom)),
    }));
  };

  const updateCanvasBackground = (color: string) => {
    setState((prev) => ({ ...prev, canvasBackgroundColor: color }));
  };

  const toggleCanvasGrid = (show: boolean) => {
    setState((prev) => ({ ...prev, showCanvasGrid: show }));
  };

  // ==================== SAVE ====================

  const handleManualSave = async () => {
    if (!state.currentProjectId) return;
    setState((prev) => ({ ...prev, isSaving: true }));

    try {
      const {
        data: { session },
      } = await getSupabaseSession();
      const user_id = session?.user?.id;

      if (user_id) {
        // Get current components from Yjs
        const { yComponents } = getOrInitDoc();
        const currentComponents = yComponents.toArray();

        await saveProject({
          id: state.currentProjectId,
          name: state.projectName || "Untitled Project",
          user_id,
          project_layout: currentComponents,
          pages: state.pages,
          siteTitle: state.siteTitle,
          siteLogoUrl: state.siteLogoUrl,
        });

        setState((prev) => ({
          ...prev,
          isSaving: false,
          hasUnsavedChanges: false,
          lastSaved: new Date(),
        }));
      } else {
        setState((prev) => ({ ...prev, isSaving: false }));
      }
    } catch (error) {
      console.error("Manual save error:", error);
      setState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // ==================== FULLSCREEN ====================

  const toggleFullscreen = () => {
    setState((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen }));
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.log("Fullscreen request failed:", err);
        });
      } else {
        document.exitFullscreen().catch((err) => {
          console.log("Exit fullscreen failed:", err);
        });
      }
    } catch (err) {
      console.log("Fullscreen not supported or blocked:", err);
    }
  };

  // ==================== PUBLISH / SHARE / EXPORT ====================

  const handlePublishTemplate = (isPublic: boolean) => {
    console.log("Publishing template as:", isPublic ? "public" : "private");
  };

  const handlePublish = () => {
    // Implement publish logic
  };

  const handleShare = () => {
    // Implement share logic
  };

  const handleExport = () => {
    // Implement export logic
  };

  // ==================== SIDEBAR RESIZE ====================

  const handleLeftSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, isResizingLeftSidebar: true }));
  };

  const handleRightSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, isResizingRightSidebar: true }));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (state.isResizingLeftSidebar) {
        const newWidth = e.clientX;
        if (newWidth >= 0 && newWidth <= 600) {
          setState((prev) => ({ ...prev, leftSidebarWidth: newWidth }));
        }
      } else if (state.isResizingRightSidebar) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 0 && newWidth <= 600) {
          setState((prev) => ({ ...prev, rightSidebarWidth: newWidth }));
        }
      }
    };

    const handleMouseUp = () => {
      setState((prev) => ({
        ...prev,
        isResizingLeftSidebar: false,
        isResizingRightSidebar: false,
      }));
    };

    if (state.isResizingLeftSidebar || state.isResizingRightSidebar) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [state.isResizingLeftSidebar, state.isResizingRightSidebar]);

  // ==================== KEYBOARD SHORTCUTS ====================

  useEffect(() => {
    const handleAddComponent = (event: CustomEvent) => {
      addComponent(event.detail);
    };
    window.addEventListener(
      "addComponent",
      handleAddComponent as EventListener,
    );
    return () => {
      window.removeEventListener(
        "addComponent",
        handleAddComponent as EventListener,
      );
    };
  }, [addComponent]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (state.isFullscreen !== isCurrentlyFullscreen) {
        setState((prev) => ({ ...prev, isFullscreen: isCurrentlyFullscreen }));
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [state.isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "b") {
        event.preventDefault();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "P"
      ) {
        event.preventDefault();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "A"
      ) {
        event.preventDefault();
        toggleAIAssistant();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "R"
      ) {
        event.preventDefault();
        setState((prev) => ({
          ...prev,
          propertiesPanelVisible: !prev.propertiesPanelVisible,
          aiAssistantVisible: !prev.aiAssistantVisible,
        }));
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "e") {
        event.preventDefault();
        toggleEditorMode();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleManualSave();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "p") {
        event.preventDefault();
        togglePreview();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "n") {
        event.preventDefault();
        clearCanvas();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "o") {
        event.preventDefault();
        toggleTemplates();
      }

      if (event.key === "Delete" && state.selectedComponent) {
        event.preventDefault();
        deleteComponent(state.selectedComponent);
      }

      if (event.key === "Escape") {
        event.preventDefault();
        selectComponent(null);
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "=" &&
        window.innerWidth >= 768
      ) {
        event.preventDefault();
        setState((prev) => ({
          ...prev,
          canvasZoom: Math.min(prev.canvasZoom + 10, 200),
        }));
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "-" &&
        window.innerWidth >= 768
      ) {
        event.preventDefault();
        setState((prev) => ({
          ...prev,
          canvasZoom: Math.max(prev.canvasZoom - 10, 50),
        }));
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "0" &&
        window.innerWidth >= 768
      ) {
        event.preventDefault();
        setState((prev) => ({ ...prev, canvasZoom: 100 }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.selectedComponent]);

  // ==================== PAGE MANAGEMENT ====================

  const switchPage = (pageId: string) => {
    setState((prev) => ({
      ...prev,
      activePageId: pageId,
      selectedComponent: null,
    }));
  };

  const addPage = (name: string, path: string) => {
    const newPage = { id: `page-${Date.now().toString()}`, name, path };
    const newPages = [...state.pages, newPage];
    setState((prev) => ({
      ...prev,
      pages: newPages,
      activePageId: newPage.id,
      selectedComponent: null,
      hasUnsavedChanges: true,
    }));
    replacePages(newPages);
  };

  const deletePage = (pageId: string) => {
    setState((prev) => {
      if (prev.pages.length <= 1) return prev; // Cannot delete last page
      const newPages = prev.pages.filter((p) => p.id !== pageId);
      const newActiveId =
        prev.activePageId === pageId ? newPages[0].id : prev.activePageId;
      // Also remove components belonging to this page
      const newComponents = prev.components.filter((c) => c.page_id !== pageId);

      replacePages(newPages);

      return {
        ...prev,
        pages: newPages,
        components: newComponents,
        activePageId: newActiveId,
        selectedComponent: null,
        hasUnsavedChanges: true,
      };
    });
  };

  const updatePage = (
    pageId: string,
    updates: Partial<{ name: string; path: string }>,
  ) => {
    setState((prev) => {
      const newPages = prev.pages.map((p) =>
        p.id === pageId ? { ...p, ...updates } : p,
      );

      replacePages(newPages);

      return {
        ...prev,
        pages: newPages,
        hasUnsavedChanges: true,
      };
    });
  };

  // src/hooks/useEditorState.ts

  const handleReorderComponent = (
    id: string,
    target: "front" | "back" | string,
  ) => {
    // 1. Calculate the new order using the CURRENT state
    const currentComponents = [...state.components];
    const index = currentComponents.findIndex((c) => c.id === id);

    if (index === -1) return;

    const [movedItem] = currentComponents.splice(index, 1);

    if (target === "front") {
      currentComponents.push(movedItem);
    } else if (target === "back") {
      currentComponents.unshift(movedItem);
    } else {
      const dropIndex = currentComponents.findIndex((c) => c.id === target);
      currentComponents.splice(dropIndex, 0, movedItem);
    }

    // 2. Update the local React state
    setState((prev) => ({
      ...prev,
      components: currentComponents,
      hasUnsavedChanges: true,
    }));

    // 3. Update the collaboration "truth" (Yjs/Supabase)
    // This ensures the move is permanent and won't be overwritten by a sync pulse
    replaceComponents(currentComponents);
  };

  // src/hooks/useEditorState.ts

  const handleMoveLayer = (id: string, action: "forward" | "backward") => {
    const currentComponents = [...state.components];
    const index = currentComponents.findIndex((c) => c.id === id);

    if (index === -1) return;

    // Bring Forward: Swap with the item to the right (higher index)
    if (action === "forward" && index < currentComponents.length - 1) {
      [currentComponents[index], currentComponents[index + 1]] = [
        currentComponents[index + 1],
        currentComponents[index],
      ];
    }
    // Send Backward: Swap with the item to the left (lower index)
    else if (action === "backward" && index > 0) {
      [currentComponents[index], currentComponents[index - 1]] = [
        currentComponents[index - 1],
        currentComponents[index],
      ];
    } else {
      return; // Boundary reached, do nothing
    }

    // Update local state
    setState((prev) => ({
      ...prev,
      components: currentComponents,
      hasUnsavedChanges: true,
    }));

    // Sync with collaboration service/Supabase
    replaceComponents(currentComponents);
  };

  // ==================== RETURN ====================

  return {
    // State
    state,
    setState,
    authLoading,
    isAuthenticated,
    selectedFile,
    setSelectedFile,
    currentUser,
    remoteCursors,
    getOrInitDoc,
    // In the return:
    exportSnapshot: exportSnapshotRef.current,

    // Component operations
    addComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    reorderComponent: handleReorderComponent,
    moveLayer: handleMoveLayer,
    clearCanvas,

    // Toggles
    togglePreview,
    toggleCodeExport,
    toggleTemplates,
    togglePublishModal,
    toggleShareModal,
    toggleEditorMode,
    togglePropertiesPanel,
    toggleCodeSync,
    toggleMobileProperties,
    toggleAIAssistant,
    toggleFullscreen,
    toggleCanvasGrid,

    // Navigation
    enterDashboard,
    enterEditor,
    goToLanding,
    goToDashboard,
    goToAdminLogin,
    goToAdmin,

    // Project
    createFromScratch,
    openProject,
    updateProjectName,
    updateUserProjectConfig,
    loadTemplate,

    // Theme & view
    handleThemeChange,
    handleViewModeChange,
    setCanvasZoom,
    updateCanvasBackground,

    // Save & publish
    handleManualSave,
    handlePublishTemplate,
    handlePublish,
    handleShare,
    handleExport,

    // Sidebar resize
    handleLeftSplitterMouseDown,
    handleRightSplitterMouseDown,

    // Page Management
    switchPage,
    addPage,
    deletePage,
    updatePage,
    // Onboarding
    showOnboarding,
    setShowOnboarding,
  };
}
