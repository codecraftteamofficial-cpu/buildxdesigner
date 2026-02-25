"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import { TemplateBrowserModal } from "./TemplateBrowserModal";
import { AccountSettingsModal } from "./AccountSettingsModal";
import { PlansModal } from "./PlansModal";
import { getSupabaseSession } from "../supabase/auth/authService";
import { supabase } from "../supabase/config/supabaseClient";
import { fetchUserProfile } from "../supabase/data/userProfile";
import {
  fetchUserProjects,
  saveProject,
} from "../supabase/data/projectService";
import type { Project } from "../supabase/types/project";
import { getLocalCanvasComponents } from "../supabase/data/projectService";
import { generateUIAndCode } from "../services/geminiCodeGenerator";
import { CreateNewWebsiteModal } from "./CreateNewWebsiteModal"; // Added import

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
}

interface ProfileDisplayData {
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

// Mock recommended templates
const recommendedTemplates = [
  {
    id: "getting-started-guide",
    name: "Getting Started Guide",
    category: "Onboarding",
    thumbnail:
      "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&h=300&fit=crop", // Changed thumbnail for unique look
    description:
      "Learn how to use the editor: drag, drop, style, and save. Includes an example welcome section.",
    creator: "BuildX Team",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Builder",
    views: 99999, // High views to show popularity
    favorites: 1000,
    premium: false,
    tags: ["guide", "onboarding", "tutorial"],
  },
  {
    id: "portfolio-modern",
    name: "Modern Portfolio",
    category: "Portfolio",
    thumbnail:
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=300&fit=crop",
    description: "Professional portfolio template",
    creator: "Sarah Johnson",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    views: 15200,
    favorites: 342,
    premium: false,
    tags: ["portfolio", "modern", "professional"],
  },
  {
    id: "ecommerce-pro",
    name: "E-commerce Pro",
    category: "E-commerce",
    thumbnail:
      "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=300&fit=crop",
    description: "Full-featured online store",
    creator: "Mike Chen",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    views: 23400,
    favorites: 567,
    premium: false,
    tags: ["portfolio", "modern", "professional"],
  },
  {
    id: "blog-minimal",
    name: "Minimal Blog",
    category: "Blog",
    thumbnail:
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop",
    description: "Clean and simple blog layout",
    creator: "Emma Davis",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    views: 18900,
    favorites: 421,
    premium: false,
    tags: ["portfolio", "modern", "professional"],
  },
  {
    id: "landing-startup",
    name: "Startup Landing",
    category: "Landing Page",
    thumbnail:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
    description: "Modern startup landing page",
    creator: "Alex Martinez",
    creatorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    views: 31500,
    favorites: 892,
    premium: false,
    tags: ["portfolio", "modern", "professional"],
  },
];

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
}: DashboardProps) {
  // --- AUTHENTICATION STATES ---
  const [authLoading, setAuthLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileDisplayData>({
    fullName: "Guest User",
    email: "",
    avatarUrl: null,
  });
  const userName = profileData.fullName;
  const userEmail = profileData.email;
  const userAvatarUrl = profileData.avatarUrl;
  const userInitial =
    profileData.fullName.substring(0, 2).toUpperCase() || "GU";
  const [authError, setAuthError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]); // State for real projects
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // --- EXISTING DASHBOARD STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeSection, setActiveSection] = useState<
    "new-chat" | "drafts" | "team" | "all" | "trash"
  >("new-chat");
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
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsTab, setAccountSettingsTab] = useState("profile");
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false); // Start hidden on mobile

  useEffect(() => {
    const openSettingsTab = localStorage.getItem("open_account_settings");
    const shouldUpdateStatus = localStorage.getItem("update_supabase_status");

    if (openSettingsTab) {
      setAccountSettingsTab(openSettingsTab);
      setShowAccountSettings(true);

      // Optimistically update connection status if we are coming from the integration flow
      if (openSettingsTab === "integration") {
        setProfileData((prev) => ({ ...prev, isConnected: 1 }));
      }

      localStorage.removeItem("open_account_settings");
    }

    if (shouldUpdateStatus) {
      // Perform deferred DB update
      localStorage.removeItem("update_supabase_status");

      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from("profiles")
            .update({ isConnected: 1 })
            .eq("user_id", user.id);

          if (error) {
            console.error("❌ Failed to update connection status:", error);
          } else {
            console.log("✅ Deferred Supabase Connection Update Complete");
          }
        }
      })();
    }
  }, []);

  // --- NEW STATES FOR REDESIGNED PROMPT SECTION ---
  const [selectedTemplateCategory, setSelectedTemplateCategory] =
    useState<string>("All Templates");
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);

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

        if (profileError || !fullProfile) {
          const user = session.user;
          const metadata = user.user_metadata as { full_name?: string };

          setProfileData({
            fullName: metadata.full_name || user.email?.split("@")[0] || "User",
            email: user.email || "",
            avatarUrl: null,
          });
          console.error("Failed to load full profile data:", profileError);
        } else {
          setProfileData({
            fullName: fullProfile.fullName,
            email: fullProfile.email,
            avatarUrl: fullProfile.avatarUrl,
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

      const { data, error } = await fetchUserProjects();

      if (!mounted) return;

      if (error) {
        console.error("Failed to load user projects:", error);
        setProjectsError("Failed to load projects. Please try again.");
        setProjects([]);
      } else if (data) {
        setProjects(data);
      }

      setProjectsLoading(false);
    };

    // Only load projects if the user's profile has been fetched (i.e. we have their email/fullName)
    // This avoids fetching projects immediately before we even know if they are logged in.
    if (profileData.email) {
      loadUserProjects();
    }

    return () => {
      mounted = false;
    };
  }, [profileData.email]);

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
        filtered = projects.filter((p) => p.status === "trash");
        break;
      case "all":
        filtered = projects.filter((p) => p.status !== "trash");
        break;
      case "new-chat":
      default:
        filtered = [];
        break;
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return filtered;
  };

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowTemplateBrowser(false);
    setShowNameProjectDialog(true);
  };

  const handleTemplateSelectFromModal = async (
    templateId: string,
    projectName: string,
  ) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) return;

    const {
      data: { session },
    } = await getSupabaseSession();
    const user_id = session?.user?.id;

    if (!user_id) {
      console.error("User session required to create a project.");
      return;
    }

    const templateComponents = getTemplateComponents(templateId);

    const newProjectData: Partial<Project> & { user_id: string } = {
      name: trimmedProjectName,
      description: `Drafts • Created ${new Date().toLocaleDateString()}`,
      thumbnail:
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop",
      user_id: user_id,
      type: "design",
      status: "draft",
    };

    const { data: savedProject, error: saveError } =
      await saveProject(newProjectData);

    if (saveError) {
      console.error("Error saving new project to database:", saveError);
      alert("Failed to create project. Please try again.");
      return;
    }

    if (savedProject) {
      const { data: refreshedProjects } = await fetchUserProjects();
      if (refreshedProjects) {
        setProjects(refreshedProjects);
      }

      onOpenProject(savedProject.id, savedProject.name, templateId);

      if (onLoadTemplate && templateComponents.length > 0) {
        onLoadTemplate(templateComponents);
      }
    }
  };

  const handleQuickTemplateClick = (
    template: (typeof recommendedTemplates)[0],
  ) => {
    setSelectedTemplateId(template.id);
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

    const templateComponents = getTemplateComponents(
      selectedTemplateId as string,
    ); // Asserting selectedTemplateId is a string

    const newProjectData: Partial<Project> & { user_id: string } = {
      name: trimmedProjectName,
      description: `Drafts • Created ${new Date().toLocaleDateString()}`,
      thumbnail:
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop", // Use a generic default thumbnail
      user_id: user_id,
      type: "design",
      status: "draft",
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
      const { data: refreshedProjects } = await fetchUserProjects();
      if (refreshedProjects) {
        setProjects(refreshedProjects);
      }

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
        description: `Drafts • Created ${new Date().toLocaleDateString()}`,
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
      const { data: refreshedProjects } = await fetchUserProjects();
      if (refreshedProjects) {
        setProjects(refreshedProjects);
      }

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
      const { data: refreshedProjects } = await fetchUserProjects();
      if (refreshedProjects) {
        setProjects(refreshedProjects);
      }
      setProjectsLoading(false);
    } catch (err) {
      console.error("Failed to duplicate project:", err);
      setProjectsLoading(false);
      alert("Failed to duplicate project. Check console for details.");
    }
  };

  // Utility function to reload projects (defined here for convenience in the handler)
  const reloadProjects = async () => {
    setProjectsLoading(true);
    const { data, error } = await fetchUserProjects();
    if (data) {
      setProjects(data);
    } else {
      console.error("Error refreshing projects after delete:", error);
    }
    setProjectsLoading(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setProjectsLoading(true);

      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("projects_id", projectId);

      if (deleteError) {
        throw deleteError;
      }

      await reloadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
      setProjectsLoading(false);
      alert("Failed to delete project. Check console for details.");
    }
  };

  const getTemplateComponents = (templateId: string): ComponentData[] => {
    switch (templateId) {
      case "getting-started-guide":
        return [
          {
            id: "guide-hero-1",
            type: "hero",
            props: {
              heading: "Welcome to BuildX!",
              subtitle: "Your step-by-step guide to building a website.",
              buttonText: "Start Designing",
            },
            style: {
              backgroundColor: "#5a67d8",
              color: "#ffffff",
              padding: "80px 20px",
              textAlign: "center",
            },
            position: { x: 300, y: 100 },
          },
          {
            id: "guide-instruction-2",
            type: "text",
            props: {
              content:
                "1. Look left: Find the 'Sidebar' to drag components onto this canvas. Try dragging a Container below this text!",
            },
            style: {
              width: "600px",
              padding: "20px",
              border: "1px dashed #5a67d8",
              backgroundColor: "#ffffff",
            },
            position: { x: 300, y: 350 },
          },
        ];
      case "blank":
        return [
          {
            id: "1",
            type: "canvas",
            props: {},
            style: {},
            position: { x: 0, y: 0 },
            project_layout: getLocalCanvasComponents(),
          },
        ];
      case "portfolio-modern":
        return [
          {
            id: "1763555375439",
            type: "navbar",
            props: {
              brand: "@YourBrandLogo",
              links: ["Home", "Projects", "Skills", "Contact"],
              showBrand: false,
              showHamburger: true,
            },
            style: {
              color: "#000000",
              width: "1150px",
              height: "99px",
              padding: "1rem",
              position: "sticky",
              boxShadow: "5px 5px 4px 0px rgba(0,0,0,0.1)",
              "--nav-hover": "#000000",
              "--nav-active": "#000000",
              borderRadius: "010px",
              "--nav-spacing": "0.5rem",
              backgroundColor: "#ffffff",
            },
            position: { x: 333, y: 133 },
          },
          {
            id: "1763560723769",
            type: "container",
            props: { content: "" },
            style: {
              width: "1148px",
              height: "829px",
              boxShadow: "5px 5px 4px 0px rgba(0,0,0,0.1)",
              borderRadius: "010px",
              backgroundColor: "#ffffff",
            },
            position: { x: 333, y: 250 },
          },
          {
            id: "1763566412390",
            type: "text",
            props: {
              content:
                "Hi, I’m 'Name' .\nI’m a BSIT student from 'School Name' who enjoys building websites and learning new tech. I like creating clean and useful projects, especially with HTML, CSS, JavaScript, PHP, and Tailwind. I always try to work smarter, not harder, and I’m excited to grow my skills and build real solutions that help people.",
            },
            style: {
              color: "#000000",
              width: "803px",
              height: "181px",
              textAlign: "left",
              fontFamily: "monospace",
              fontWeight: "500",
              lineHeight: "1.5",
              borderRadius: "0",
              letterSpacing: "02px",
            },
            position: { x: 645, y: 322 },
          },
          {
            id: "1763566455262",
            type: "image",
            props: {
              alt: "Sample image",
              src: "",
              width: "250",
              height: "250",
            },
            style: {
              width: "auto",
              boxShadow: "5px 10px 10px 4px rgba(0,0,0,0.1)",
              borderRadius: "0px",
            },
            position: { x: 361, y: 305 },
          },
          {
            id: "1763566614320",
            type: "heading",
            props: {
              level: 6,
              style: { margin: "px", textAlign: "left" },
              content: "Projects",
            },
            style: {
              color: "#000000",
              fontSize: "25px",
              fontStyle: "normal",
              fontFamily: "monospace",
            },
            position: { x: 380, y: 599 },
          },
          {
            id: "1763570091948",
            type: "button",
            props: {
              text: "Learn More About me",
              actions: [
                {
                  id: "action-1763572063649",
                  url: "",
                  type: "onClick",
                  selector: "container-54735k1yb",
                  handlerType: "scroll",
                  handler:
                    "{ try { const element = document.getElementById('container-54735k1yb'); if (element) { element.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; } return false; } catch (error) { return false; } }",
                },
              ],
              onClick: "Alert('na click mo na');",
              variant: "default",
              elementId: "btn",
            },
            style: {
              width: "200px",
              height: "40px",
              padding: "0.75rem 1.5rem",
            },
            position: { x: 645, y: 527 },
          },
          {
            id: "1763573928438",
            type: "container",
            props: {
              content: "",
              className: "skill-tab",
              elementId: "skill-tab",
            },
            style: {
              width: "1148px",
              height: "829px",
              boxShadow: "5px 5px 4px 0px rgba(0,0,0,0.1)",
              borderRadius: "010px",
              backgroundColor: "#ffffff",
            },
            position: { x: 335, y: 1097 },
          },
          {
            id: "1763580637906",
            type: "heading",
            props: {
              level: 6,
              style: { margin: "px", textAlign: "left" },
              content: "Skills",
            },
            style: {
              color: "#000000",
              fontSize: "25px",
              fontStyle: "normal",
              fontFamily: "monospace",
            },
            position: { x: 407, y: 1134 },
          },
          {
            id: "1763580709186",
            type: "footer",
            props: {
              copyright: "© 2025 Your Company. All rights reserved.",
            },
            style: {
              width: "1144px",
              height: "100px",
              borderRadius: "010px",
            },
            position: { x: 340, y: 2796 },
          },
          {
            id: "1763596784877",
            type: "container",
            props: {
              children: [],
              className: "",
              elementId: "container-qzsyigw5g",
            },
            style: {
              color: "#000000",
              width: "100px",
              height: "100px",
              borderRadius: "200px",
              backgroundColor: "#ff7070",
            },
            position: { x: 401, y: 1234 },
          },
          {
            id: "1763597345547",
            type: "container",
            props: {
              content: "",
              className: "skill-tab",
              elementId: "skill-tab-2",
            },
            style: {
              width: "1148px",
              height: "829px",
              boxShadow: "5px 5px 4px 0px rgba(0,0,0,0.1)",
              borderRadius: "010px",
              backgroundColor: "#ffffff",
            },
            position: { x: 342, y: 1945 },
          },
          {
            id: "1763597417839",
            type: "container",
            props: {
              children: [],
              className: "",
              elementId: "container-qzs-2",
            },
            style: {
              width: "100px",
              height: "100px",
              borderRadius: "200px",
              backgroundColor: "#4b0aff",
            },
            position: { x: 401, y: 1365 },
          },
          {
            id: "1763597421247",
            type: "container",
            props: {
              children: [],
              className: "",
              elementId: "container-qzs-3",
            },
            style: {
              width: "100px",
              height: "100px",
              borderRadius: "200px",
              backgroundColor: "#be2af4",
            },
            position: { x: 399, y: 1494 },
          },
          {
            id: "1763597426740",
            type: "container",
            props: {
              children: [],
              className: "",
              elementId: "container-qzs-4",
            },
            style: {
              width: "100px",
              height: "100px",
              borderRadius: "200px",
              backgroundColor: "#ffe438",
            },
            position: { x: 397, y: 1626 },
          },
          {
            id: "1763597431095",
            type: "container",
            props: {
              children: [],
              className: "",
              elementId: "container-qzs-5",
            },
            style: {
              width: "100px",
              height: "100px",
              borderRadius: "200px",
              backgroundColor: "#3bff05",
            },
            position: { x: 392, y: 1763 },
          },
          {
            id: "1763597872244",
            type: "text",
            props: { content: "HTML" },
            style: {
              color: "#ffffff",
              fontSize: "30px",
              textAlign: "center",
              fontFamily: "monospace",
            },
            position: { x: 414, y: 1261 },
          },
          {
            id: "1763597967651",
            type: "text",
            props: { content: "CSS" },
            style: {
              color: "#ffffff",
              fontSize: "30px",
              textAlign: "center",
              fontFamily: "monospace",
            },
            position: { x: 422, y: 1394 },
          },
          {
            id: "1763598029368",
            type: "text",
            props: { content: "PHP" },
            style: {
              color: "#ffffff",
              fontSize: "30px",
              textAlign: "center",
              fontFamily: "monospace",
            },
            position: { x: 420, y: 1522 },
          },
          {
            id: "1763598063728",
            type: "text",
            props: { content: "JS" },
            style: {
              color: "#ffffff",
              fontSize: "30px",
              textAlign: "center",
              fontFamily: "monospace",
            },
            position: { x: 426, y: 1655 },
          },
          {
            id: "1763598224042",
            type: "text",
            props: { content: "NPM" },
            style: {
              color: "#ffffff",
              fontSize: "30px",
              textAlign: "center",
              fontFamily: "monospace",
            },
            position: { x: 417, y: 1791 },
          },
          {
            id: "1763598322027",
            type: "container",
            props: {
              children: [],
              className: "p-4 border border-gray-200 rounded-lg bg-white",
              elementId: "project-box-1",
            },
            style: { width: "305px", height: "206px" },
            position: { x: 401, y: 681 },
          },
          {
            id: "1763598472793",
            type: "text",
            props: { content: "Project Title" },
            style: {},
            position: { x: 407, y: 898 },
          },
          {
            id: "1763598523175",
            type: "container",
            props: {
              children: [],
              className: "p-4 border border-gray-200 rounded-lg bg-white",
              elementId: "project-box-2",
            },
            style: { width: "305px", height: "206px" },
            position: { x: 756, y: 681 },
          },
          {
            id: "1763598523530",
            type: "container",
            props: {
              children: [],
              className: "p-4 border border-gray-200 rounded-lg bg-white",
              elementId: "project-box-3",
            },
            style: { width: "305px", height: "206px" },
            position: { x: 1103, y: 681 },
          },
          {
            id: "1763598569349",
            type: "text",
            props: { content: "Project Title" },
            style: {},
            position: { x: 761, y: 899 },
          },
          {
            id: "1763598572766",
            type: "text",
            props: { content: "Project Title" },
            style: {},
            position: { x: 1109, y: 897 },
          },
          {
            id: "1763598579905",
            type: "text",
            props: { content: "Project Description" },
            style: { fontSize: "12px" },
            position: { x: 406, y: 948 },
          },
          {
            id: "1763598606111",
            type: "text",
            props: { content: "Project Description" },
            style: { fontSize: "12px" },
            position: { x: 759, y: 950 },
          },
          {
            id: "1763598609803",
            type: "text",
            props: { content: "Project Description" },
            style: { fontSize: "12px" },
            position: { x: 1106, y: 949 },
          },
          {
            id: "1763598642646",
            type: "heading",
            props: {
              level: 6,
              style: { margin: "px", textAlign: "left" },
              content: "Contact",
            },
            style: {
              color: "#000000",
              fontSize: "25px",
              fontStyle: "normal",
              fontFamily: "monospace",
            },
            position: { x: 394, y: 1982 },
          },
          {
            id: "1763598665827",
            type: "form",
            props: { title: "", namePlaceholder: "" },
            style: { width: "920px", height: "439px" },
            position: { x: 401, y: 2055 },
          },
          {
            id: "1763598830398",
            type: "heading",
            props: {
              level: 6,
              style: { margin: "px", textAlign: "left" },
              content: "Connect With Us: ",
            },
            style: {
              color: "#000000",
              fontSize: "25px",
              fontStyle: "normal",
              fontFamily: "monospace",
            },
            position: { x: 405, y: 2552 },
          },
          {
            id: "1763598941963",
            type: "image",
            props: { alt: "Sample image", src: "", width: "50", height: "50" },
            style: {},
            position: { x: 718, y: 2552 },
          },
          {
            id: "1763599003671",
            type: "image",
            props: { alt: "Sample image", src: "", width: "50", height: "50" },
            style: {},
            position: { x: 786, y: 2552 },
          },
          {
            id: "1763599007462",
            type: "image",
            props: { alt: "Sample image", src: "", width: "50", height: "50" },
            style: {},
            position: { x: 856, y: 2552 },
          },
          {
            id: "1763599012544",
            type: "image",
            props: { alt: "Sample image", src: "", width: "50", height: "50" },
            style: {},
            position: { x: 922, y: 2551 },
          },
          {
            id: "1763599023987",
            type: "heading",
            props: {
              level: 6,
              style: { margin: "px", textAlign: "left" },
              content: "Social Media",
            },
            style: {
              color: "#000000",
              fontSize: "10px",
              fontStyle: "normal",
              fontFamily: "monospace",
            },
            position: { x: 724, y: 2503 },
          },
        ];

      case "ecommerce-pro":
        return [
          {
            id: "1",
            type: "navbar",
            props: {
              brand: "Store",
              links: ["Products", "Categories", "Cart"],
            },
            style: {},
          },
          {
            id: "2",
            type: "hero",
            props: {
              title: "Shop Premium Products",
              subtitle: "Discover quality items",
            },
            style: {},
          },
        ];
      case "blog-minimal":
        return [
          {
            id: "1",
            type: "navbar",
            props: { brand: "Blog", links: ["Home", "Articles", "About"] },
            style: {},
          },
          {
            id: "2",
            type: "heading",
            props: { content: "Latest Stories", level: 1 },
            style: { textAlign: "center", margin: "2rem 0" },
          },
        ];
      case "landing-startup":
        return [
          {
            id: "1",
            type: "navbar",
            props: {
              brand: "Startup",
              links: ["Features", "Pricing", "Contact"],
            },
            style: {},
          },
          {
            id: "2",
            type: "hero",
            props: {
              title: "Transform Your Business",
              subtitle: "Powerful solutions that drive results",
            },
            style: {},
          },
          {
            id: "3",
            type: "grid",
            props: { columns: 3 },
            style: { margin: "4rem 0" },
          },
        ];
      default:
        return [];
    }
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
        description: "AI Generated Draft",
        thumbnail:
          "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=300&fit=crop", // Generic thumbnail
        user_id: user_id,
        type: "design",
        status: "draft",
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
  const filteredProjects = getFilteredProjects();

  const handleBrowseAllClick = () => {
    setSelectedTemplateId(null);
    setShowCreateTemplateModal(true);
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const ThemeIcon = themeIcons[theme];

  return (
    // Use flex h-screen and allow page scrolling so gallery and bottom content are reachable
    <div className="flex h-screen bg-background overflow-auto">
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
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                disabled={authLoading}
              >
                <Avatar className="h-8 w-8 ring-2 ring-blue-500/50">
                  {/* Use actual avatar URL from Supabase Storage */}
                  <AvatarImage
                    src={userAvatarUrl || undefined}
                    alt={userName}
                  />
                  <AvatarFallback className="bg-linear-to-br from-blue-600 to-violet-600 text-white text-sm">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  {/* Use fetched full name and email */}
                  <p className="text-sm text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {userEmail}
                  </p>
                  <ChevronDown className="w-3 h-3 text-muted-foreground inline" />
                </div>
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
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection("new-chat")}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${activeSection === "new-chat"
                ? "text-blue-500 bg-blue-500/10"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>New chat</span>
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
              <Button variant="ghost" size="sm" className="gap-2 ml-auto">
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
                {/* Hero Prompt Section */}
                <div className="flex flex-col min-h-[calc(100vh-200px)]">
                  <div className="shrink-0 py-16 px-4">
                    <div className="w-full max-w-4xl mx-auto">
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-foreground mb-8">
                        What do you want to create?
                      </h1>

                      <div className="relative max-w-3xl mx-auto">
                        <div className="relative flex items-center bg-background border border-border rounded-full shadow-sm hover:shadow-md hover:border-foreground/20 transition-all">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-2 h-9 w-9 rounded-full hover:bg-muted shrink-0"
                            disabled={isGenerating}
                          >
                            <Plus className="w-5 h-5" />
                          </Button>
                          <Input
                            placeholder="Ask buildx to generate..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                aiPrompt.trim() &&
                                !isGenerating
                              ) {
                                handleGenerateUI();
                              }
                            }}
                            className="h-14 text-base px-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent rounded-full flex-1"
                          />
                          <Button
                            onClick={handleGenerateUI}
                            disabled={!aiPrompt.trim() || isGenerating}
                            size="icon"
                            className="mr-2 h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0"
                          >
                            {isGenerating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowUp className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* Generation Progress */}
                        {isGenerating && (
                          <div className="mt-4">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-foreground transition-all duration-300"
                                style={{ width: `${generationProgress}%` }}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 text-center">
                              Generating your UI... {generationProgress}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Templates Section */}
                  <div className="flex-1 px-4 pb-8">
                    {/* Updated max-width for better content spacing */}
                    <div className="w-full max-w-6xl mx-auto">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-2xl font-semibold text-foreground">
                            Recommended Template
                          </h2>
                          <Button
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={handleBrowseAllClick} // Use the new handler
                          >
                            Browse all
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>

                        {/* Template Categories Tabs */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                          {[
                            "All Templates",
                            "Landing Pages",
                            "Components",
                            "Dashboards",
                          ].map((category) => (
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
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                         {recommendedTemplates
                            .filter(
                              (template) =>
                               
                                template.id !== "getting-started-guide",
                            )
                            .map((template) => (
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
                                <p className="text-sm text-muted-foreground mb-3">
                                  {template.description}
                                </p>

                                {/* Creator and stats row */}
                                <div className="flex items-center justify-between pt-3 border-t border-border">
                                  {/* Creator info */}
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

                                  {/* Views and favorites */}
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Eye className="w-4 h-4" />
                                      <span className="text-xs">
                                        {template.views >= 1000
                                          ? `${(template.views / 1000).toFixed(1)}k`
                                          : template.views}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors">
                                      <Heart className="w-4 h-4" />
                                      <span className="text-xs">
                                        {template.favorites}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
                            Last viewed
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>Last viewed</DropdownMenuItem>
                          <DropdownMenuItem>Last modified</DropdownMenuItem>
                          <DropdownMenuItem>Name</DropdownMenuItem>
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

                  {/* Projects Grid/List */}
                  {projectsLoading ? (
                    <div className="flex justify-center items-center p-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="ml-3 text-lg text-muted-foreground">
                        Loading projects...
                      </span>
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    <div
                      className={`grid ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"} gap-3 md:gap-4`}
                    >
                      {filteredProjects.map((project) => (
                        <Card
                          key={project.id}
                          className="bg-card border-border cursor-pointer hover:border-blue-500/50 transition-all group overflow-hidden"
                          onClick={() =>
                            onOpenProject(project.id, project.name)
                          } // <-- CRITICAL CHANGE: Pass project.name
                        >
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
                            <h3 className="text-sm text-foreground mb-1 line-clamp-1">
                              {project.name}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {project.description}
                            </p>
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
                            : activeSection === "drafts"
                              ? "No draft projects"
                              : activeSection === "team"
                                ? "No team projects"
                                : activeSection === "trash"
                                  ? "No deleted projects"
                                  : "Create your first project to get started"}
                        </p>
                        {!searchQuery && activeSection !== "trash" && (
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
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowNameProjectDialog(false);
                setProjectName("");
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
        onTrackSearch={(query) => console.log("Search:", query)}
        recommendedTemplates={recommendedTemplates}
        initialTemplateId={selectedTemplateId} // Pass selectedTemplateId as initialTemplateId
      />
    </div>
  );
}
