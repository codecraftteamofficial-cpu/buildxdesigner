"use client";

/**
 * App.tsx - Main application router.
 *   1. Initializing shared editor state via useEditorState()
 *   2. Showing a loading spinner while auth is checked
 *   3. Routing to the correct view based on state.currentView
 *
 * All logic has been extracted to:
 *   - src/types/editor.ts         -> ComponentData & EditorState interfaces
 *   - src/hooks/useEditorState.ts  -> All state, effects, handlers, and business logic
 *   - src/components/EditorLayout.tsx -> The full editor view (canvas, sidebars, modals)
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, Monitor, Smartphone } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { useIsMobile } from "./components/ui/use-mobile";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  matchPath,
} from "react-router-dom";
import { isOnboardingRequired } from "./utils/onboarding";
import { supabase } from "./supabase/config/supabaseClient";

// Make Supabase available globally for custom components
if (typeof window !== 'undefined') {
  window.supabaseClient = supabase;
}

// Add Supabase to global window type
declare global {
  interface Window {
    supabaseClient: typeof supabase;
  }
}

// Views
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { AdminLogin } from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import { EditorLayout } from "./components/EditorLayout";
import { OnboardingPage } from "./components/OnboardingPage";
import { GetOut } from "./components/UnexpectedEntry/UnexpectedEntry";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import LoginAuthSessionChecker from "./services/useAuthenticator";
import { CollaborationServiceProvider } from "./services/useCollaboration";
import { WebsiteCreation } from "./components/Guides/WebsiteCreation";
import { PublishingBasics } from "./components/Guides/PublishingBasics";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { CanvasArea } from "./components/Guides/CanvasArea";
import { PropertiesPanel } from "./components/Guides/PropertiesPanel";
import { AIAssistant } from "./components/Guides/AIAssistant";
import { CodeEditorTour } from "./components/Guides/CodeEditorTour";
import { SavingCollaboration } from "./components/Guides/SavingCollaboration";
import { markStepComplete } from "./supabase/data/tutorialProgressService";

// State hook (contains ALL state, effects, auth, keyboard shortcuts, etc.)
import { useEditorState } from "./hooks/useEditorState";

// Re-export ComponentData so existing imports from App.tsx still work
export type { ComponentData } from "./types/editor";

type EditorController = ReturnType<typeof useEditorState>;

const getViewFromPath = (path: string) => {
  if (path === "/" || path === "") return "landing";
  if (path.startsWith("/admin-login")) return "admin-login";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/editor")) return "editor";
  return "landing";
};

const getPathFromState = (view: string, projectId: string | null) => {
  switch (view) {
    case "dashboard":
      return "/dashboard";
    case "admin-login":
      return "/admin-login";
    case "admin":
      return "/admin";
    case "editor":
      return projectId ? `/editor/${projectId}` : "/editor";
    case "landing":
    default:
      return "/";
  }
};

const ONBOARDING_SESSION_INTENT_KEY = "buildxdesigner:auth-intent";
const ONBOARDING_COMPLETED_PREFIX = "buildxdesigner:onboarding-completed:";

const getOnboardingCompletedKey = (userId: string) =>
  `${ONBOARDING_COMPLETED_PREFIX}${userId}`;

const isLikelyNewUser = (session?: {
  user?: { created_at?: string; last_sign_in_at?: string };
}) => {
  const createdAt = session?.user?.created_at;
  const lastSignInAt = session?.user?.last_sign_in_at;

  if (!createdAt || !lastSignInAt) return false;

  const createdTime = new Date(createdAt).getTime();
  const lastSignInTime = new Date(lastSignInAt).getTime();

  if (Number.isNaN(createdTime) || Number.isNaN(lastSignInTime)) {
    return false;
  }

  return Math.abs(lastSignInTime - createdTime) < 60_000;
};

function AppRoutes({ editor }: { editor: EditorController }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isSyncingFromPath = useRef(false);
  const isInitialMount = useRef(true);
  const onboardingCheckUserIdRef = useRef<string | null>(null);
  const [showEditorTour, setShowEditorTour] = useState(false);
  const [showPublishingBasicsTour, setShowPublishingBasicsTour] =
    useState(false);
  const [showCanvasTour, setShowCanvasTour] = useState(false);
  const [showPropertiesT, setShowPropertiesT] = useState(false);
  const [showAITour, setShowAITour] = useState(false);
  const [showCodeTour, setShowCodeTour] = useState(false);
  const [showCollabTour, setShowCollabTour] = useState(false);

  //Ito is ihohold niya muna yung tutorial to create a project, and then kapag nakacreate na siya ng project, dun na magcocontinue yung tutorial
useEffect(() => {
  if (!location.pathname.startsWith("/editor")) return;

  const checks = [
    { key: "buildx-pending-editor-tour",            setter: setShowEditorTour },
    { key: "buildx-pending-publishing-basics-tour", setter: setShowPublishingBasicsTour },
    { key: "buildx-pending-canvas-tour",            setter: setShowCanvasTour },
    { key: "buildx-pending-properties-tour",        setter: setShowPropertiesT },
    { key: "buildx-pending-ai-tour",                setter: setShowAITour },
    { key: "buildx-pending-code-tour",              setter: setShowCodeTour },
    { key: "buildx-pending-collab-tour",            setter: setShowCollabTour },
  ];

  checks.forEach(({ key, setter }) => {
    if (localStorage.getItem(key) === "1") {
      localStorage.removeItem(key);
      setTimeout(() => setter(true), 100); // ← added setTimeout
    }
  });
}, [location.pathname]);

useEffect(() => {
  console.log("[App] showCanvasTour state changed:", showCanvasTour);
}, [showCanvasTour]);

const {
    state,
    setState,
    authLoading,
    currentUser,
    enterDashboard,
    goToLanding,
    goToAdmin,
    goToAdminLogin,
    goToDashboard,
    handleThemeChange,
    createFromScratch,
    toggleTemplates,
    openProject,
    showOnboarding,
    setShowOnboarding,
  } = editor;

const currentUserRef = useRef<string | null>(null);
useEffect(() => {
  currentUserRef.current = currentUser?.id ?? null;
}, [currentUser?.id]);

useEffect(() => {
  const handleStepCompleted = async (e: Event) => {
    const stepKey = (e as CustomEvent).detail?.stepKey;
    if (!stepKey) return;

    const userId = currentUserRef.current;
    if (!userId) return;

    try {
      await markStepComplete(userId, stepKey);
    } catch (err) {
      console.error(`[App] Failed to save tutorial step ${stepKey}:`, err);
    }
  };

  window.addEventListener("buildx-tutorial-step-completed", handleStepCompleted);
  return () =>
    window.removeEventListener("buildx-tutorial-step-completed", handleStepCompleted);
}, []);

  const handleAuthenticatedSession = async (session?: {
    user?: {
      user_metadata?: Record<string, unknown>;
      id?: string;
      created_at?: string;
      last_sign_in_at?: string;
    };
  }) => {
    const userId = session?.user?.id;

    if (!userId) {
      goToLanding();
      return;
    }

    const authIntent = sessionStorage.getItem(ONBOARDING_SESSION_INTENT_KEY);
    const onboardingEligible =
      authIntent === "signup" || isLikelyNewUser(session);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/api/onboarding-data/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (onboardingEligible) {
          setShowOnboarding(true);
          return;
        }

        enterDashboard();
        return;
      }

      const data = await response.json();

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setShowOnboarding(true);
        return;
      }

      enterDashboard();

      const hasValue = (value: unknown) =>
        value !== null && value !== undefined && String(value).trim() !== "";

      const hasAnswerFields = (obj: unknown) => {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
        const record = obj as Record<string, unknown>;
        return [
          record.primary_role,
          record.workplace_type,
          record.experience,
          record.experience_level,
          record.main_goal,
          record.team_size,
        ].some(hasValue);
      };

      const topLevelRecord = data as Record<string, unknown>;
      const onboardingPayload =
        topLevelRecord.onboarding_data ??
        topLevelRecord.onboardingData ??
        topLevelRecord.data ??
        topLevelRecord.result;

      const payloadRecord =
        Array.isArray(onboardingPayload) && onboardingPayload.length > 0
          ? onboardingPayload[0]
          : onboardingPayload;

      const hasBooleanSignal =
        topLevelRecord.exists === true ||
        topLevelRecord.found === true ||
        topLevelRecord.completed === true ||
        topLevelRecord.hasOnboardingData === true;

      const hasOnboardingData =
        hasBooleanSignal ||
        onboardingPayload === true ||
        (Array.isArray(onboardingPayload) && onboardingPayload.length > 0) ||
        hasAnswerFields(payloadRecord) ||
        hasAnswerFields(topLevelRecord);

      if (hasOnboardingData) {
        localStorage.setItem(getOnboardingCompletedKey(userId), "true");
        enterDashboard();
        return;
      }

      if (onboardingEligible) {
        setShowOnboarding(true);
        return;
      }

      enterDashboard();
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      if (onboardingEligible) {
        setShowOnboarding(true);
        return;
      }

      enterDashboard();
    } finally {
      sessionStorage.removeItem(ONBOARDING_SESSION_INTENT_KEY);
    }
  };

  const openProjectAndRoute = (
    projectId: string,
    projectName: string,
    templateId?: string,
    isPublic?: boolean,
    authorId?: string,
  ) => {
    openProject(projectId, projectName);
    const itShouldGoPrivate = isPublic === false;
    const targetPath = projectId
      ? itShouldGoPrivate
        ? `/editor/${projectId}/private`
        : `/editor/${projectId}`
      : "/editor";
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  };

  const goToDashboardAndRoute = () => {
    goToDashboard();
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard", { replace: true });
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (location.pathname === "/reset-password") return;

    const userId = currentUser?.id;
    if (!userId) return;
    if (onboardingCheckUserIdRef.current === userId) {
      return;
    }

    onboardingCheckUserIdRef.current = userId;

    void handleAuthenticatedSession({ user: { id: userId } });
  }, [authLoading, currentUser?.id, location.pathname]);

  const routeMatch =
    matchPath("/editor/:projectId/*", location.pathname) ||
    matchPath("/editor/:projectId", location.pathname);
  const matchedProjectId = routeMatch?.params?.projectId ?? null;
  const routeProjectId =
    matchedProjectId && matchedProjectId !== "private"
      ? matchedProjectId
      : null;
  const privateAccessPath = routeProjectId
    ? `/project-private/${routeProjectId}`
    : "/project-private";
  const ownerPrivateEditorPath = routeProjectId
    ? `/editor/${routeProjectId}/private`
    : "/editor/private";

  useEffect(() => {
    if (location.pathname !== "/editor/private") return;

    const fallbackProjectId =
      state.currentProjectId ||
      localStorage.getItem("fulldev-ai-current-project-id");

    if (fallbackProjectId && fallbackProjectId !== "private") {
      navigate(`/project-private/${fallbackProjectId}`, { replace: true });
      return;
    }

    navigate("/project-private", { replace: true });
  }, [location.pathname, navigate, state.currentProjectId]);

  useEffect(() => {
    if (authLoading) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isSyncingFromPath.current) {
      isSyncingFromPath.current = false;
      return;
    }

    if (
      location.pathname === "/reset-password" ||
      location.pathname.startsWith("/editor/") ||
      location.pathname.startsWith("/project-private")
    ) {
      return;
    }

    const viewFromPath = getViewFromPath(location.pathname);
    if (viewFromPath === state.currentView) {
      return;
    }

    const targetPath = getPathFromState(
      state.currentView,
      state.currentProjectId,
    );

    if (
      routeProjectId &&
      state.currentView === "editor" &&
      !state.currentProjectId
    ) {
      return;
    }

    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [
    authLoading,
    state.currentView,
    state.currentProjectId,
    location.pathname,
    navigate,
    routeProjectId,
  ]);

  useEffect(() => {
    if (!routeProjectId) return;
    if (state.projectIsPublic === null) return;
    if (state.projectCanView === null) return;
    if (state.projectAuthorId === null && state.projectIsPublic === false)
      return;

    const isPrivate = state.projectIsPublic === false;
    const canView = state.projectCanView === true;
    const isOwner =
      !!state.currentUser?.id && state.currentUser.id === state.projectAuthorId;

    const basePath = `/editor/${routeProjectId}`;
    const privateViewerPath = `/project-private/${routeProjectId}`;
    const privateOwnerPath = `/editor/${routeProjectId}/private`;

    const isOnPrivateViewerPath = location.pathname === privateViewerPath;
    const isOnPrivateOwnerPath = location.pathname === privateOwnerPath;

    if (isPrivate && !canView && !isOnPrivateViewerPath) {
      navigate(privateViewerPath, { replace: true });
      return;
    }

    if (isPrivate && canView && isOwner && !isOnPrivateOwnerPath) {
      navigate(privateOwnerPath, { replace: true });
      return;
    }

    if (isPrivate && canView && !isOwner && isOnPrivateOwnerPath) {
      navigate(basePath, { replace: true });
      return;
    }

    if (!isPrivate && (isOnPrivateViewerPath || isOnPrivateOwnerPath)) {
      navigate(basePath, { replace: true });
    }
  }, [
    routeProjectId,
    state.projectIsPublic,
    state.projectCanView,
    state.projectAuthorId,
    currentUser?.id,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    if (authLoading) return;

    const viewFromPath = getViewFromPath(location.pathname);

    setState((prev) => {
      let next = prev;
      let changed = false;

      if (
        prev.currentView !== viewFromPath ||
        prev.currentPage !== viewFromPath
      ) {
        next = {
          ...next,
          currentView: viewFromPath,
          currentPage: viewFromPath,
        };
        changed = true;
      }

      if (
        viewFromPath === "editor" &&
        routeProjectId &&
        (routeProjectId !== prev.currentProjectId ||
          prev.currentView !== "editor")
      ) {
        next = {
          ...next,
          currentProjectId: routeProjectId,
          projectIsPublic: null,
          projectAuthorId: null,
          projectCanView: null,
          projectRole: null,
          projectCanEdit: false,
        };
        changed = true;
      }

      if (changed) {
        isSyncingFromPath.current = true;
      }
      return changed ? next : prev;
    });
  }, [authLoading, location.pathname, routeProjectId, setState]);

  // --- Loading Screen ---
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-full bg-background">
        <Loader2 className="w-8 h-8 mr-2 text-blue-600 animate-spin" />
        <p className="text-xl text-foreground">Verifying secure session...</p>
      </div>
    );
  }

  // Ito is protected by the LoginAuthSessionChecker na ginawa ko. Kung walang valid session, hindi niya ipapakita yung LandingPage at magre-render lang siya ng children niya ulit (which is yung LandingPage).
  // Kapag may valid session naman, saka niya ipapakita yung LandingPage. Sa LandingPage, may button na "Enter Editor" na kapag pinindot, tatawagin niya yung enterDashboard function (na galing sa useEditorState)
  // para i-set yung currentView sa "dashboard". Sa effect ng useEditorState, kapag nakita niyang nagbago yung currentView to "dashboard", saka niya ipapakita yung Dashboard component.

  if (showOnboarding) {
    return (
      <OnboardingPage
        onComplete={() => {
          if (currentUser?.id) {
            localStorage.setItem(
              getOnboardingCompletedKey(currentUser.id),
              "true",
            );
          }
          setShowOnboarding(false);
          enterDashboard();
        }}
      />
    );
  }

  return (
    <>
    <Routes>
      <Route
        path="/"
        element={
          <LoginAuthSessionChecker onAuthenticated={handleAuthenticatedSession}>
            <LandingPage onEnterEditor={enterDashboard} />
            <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50" />
          </LoginAuthSessionChecker>
        }
      />
      <Route
        path="/admin-login"
        element={
          <>
            <AdminLogin
              onLoginSuccess={goToAdmin}
              onBack={goToLanding}
              theme={state.theme}
              onThemeChange={handleThemeChange}
            />
            <Toaster />
          </>
        }
      />
      <Route
        path="/admin"
        element={
          <>
            <AdminDashboard
              onBack={goToAdminLogin}
              theme={state.theme}
              onThemeChange={handleThemeChange}
            />
            <Toaster />
          </>
        }
      />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/dashboard"
        element={
          <>
            <Dashboard
              onCreateFromScratch={createFromScratch}
              onOpenTemplates={toggleTemplates}
              onOpenAIGenerator={() =>
                setState((prev) => ({
                  ...prev,
                  showAIGenerator: !prev.showAIGenerator,
                }))
              }
              onOpenProject={openProjectAndRoute}
              onLogout={goToLanding}
              theme={state.theme}
              isSupabaseConnected={state.isSupabaseConnected}
              onLoadTemplate={(components) => {
                const centerX = 500;
                const centerY = 300;
                let currentY = centerY;

                const positionedComponents = components.map((comp) => {
                  const height =
                    Number.parseFloat(
                      String(comp.style?.height || "100").replace("px", ""),
                    ) || 100;
                  const width =
                    Number.parseFloat(
                      String(comp.style?.width || "100").replace("px", ""),
                    ) || 100;

                  return {
                    ...comp,
                    position: {
                      x: centerX - width / 2,
                      y: currentY,
                    },
                  };
                  currentY += height + 20;
                });

                setState((prev) => ({
                  ...prev,
                  components: positionedComponents,
                  currentView: "editor",
                  currentPage: "editor",
                  hasUnsavedChanges: true,
                }));
              }}
            />
            <Toaster />
          </>
        }
      />
      <Route
        path="/project-private"
        element={<GetOut onBackToDashboard={goToDashboardAndRoute} />}
      />
      <Route
        path="/project-private/:projectId"
        element={<GetOut onBackToDashboard={goToDashboardAndRoute} />}
      />
      <Route
        path="/editor/:projectId/private"
        element={
          state.projectIsPublic === null ||
          state.projectCanView === null ||
          (state.projectIsPublic === false &&
            state.projectAuthorId === null) ? (
            <div className="flex justify-center items-center h-screen w-full bg-background">
              <Loader2 className="w-8 h-8 mr-2 text-blue-600 animate-spin" />
              <p className="text-xl text-foreground">Checking access...</p>
            </div>
          ) : state.projectIsPublic === false && !state.projectCanView ? (
            <Navigate to={privateAccessPath} replace />
          ) : state.projectIsPublic === false &&
            state.currentUser?.id &&
            state.currentUser.id !== state.projectAuthorId ? (
            <Navigate to={`/editor/${routeProjectId}`} replace />
          ) : (
            <>
              <EditorLayout
                editor={{ ...editor, goToDashboard: goToDashboardAndRoute }}
                onStartTour={() => setShowEditorTour(true)}
                onStartPublishingBasics={() =>
                  setShowPublishingBasicsTour(true)
                }
                onStartCanvasArea={() => setShowCanvasTour(true)}
              />
              <WebsiteCreation
                showOnMount={showEditorTour}
                onComplete={() => {
                  localStorage.setItem("buildx-tutorial-website-creation", "1");
                  setShowEditorTour(false);
                  window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "website" } }));
                }}
              />
              <PublishingBasics
                showOnMount={showPublishingBasicsTour}
                onComplete={() => {
                  localStorage.setItem("buildx-tutorial-publishing-basics", "1");
                  setShowPublishingBasicsTour(false);
                  window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "publishing" } }));
                }}
              />
              <CanvasArea
                showOnMount={showCanvasTour}
                onComplete={() => {
                  localStorage.setItem("buildx-tutorial-canvas", "1");
                  setShowCanvasTour(false);
                  window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "canvas" } }));
                }}
              />
              <PropertiesPanel
                showOnMount={showPropertiesT}
                onComplete={() => {
                  localStorage.setItem("buildx-tutorial-properties", "1");
                  setShowPropertiesT(false);
                  window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "properties" } }));
                }}
              />
              <AIAssistant
                showOnMount={showAITour}
                onComplete={() => {
                  localStorage.setItem("buildx-tutorial-ai", "1");
                  setShowAITour(false);
                  window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "ai" } }));
                }}
              />
              <CodeEditorTour
                showOnMount={showCodeTour}
                onComplete={() => {
                  localStorage.setItem("buildx-tutorial-code", "1");
                  setShowCodeTour(false);
                  window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "code" } }));
                }}
              />
              <SavingCollaboration
                showOnMount={showCollabTour}
                onComplete={() => {
                  localStorage.setItem("buildx-tutorial-collab", "1");
                  setShowCollabTour(false);
                  window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "collab" } }));
                }}
              />
            </>
          )
        }
      />
      <Route
        path="/editor"
        element={
          <>
            <EditorLayout
              editor={{ ...editor, goToDashboard: goToDashboardAndRoute }}
              onStartTour={() => setShowEditorTour(true)}
              onStartPublishingBasics={() => setShowPublishingBasicsTour(true)}
              onStartCanvasArea={() => setShowCanvasTour(true)}
            />
              <WebsiteCreation
              showOnMount={showEditorTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-website-creation", "1");
                setShowEditorTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "website" } }));
              }}
            />
            <PublishingBasics
              showOnMount={showPublishingBasicsTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-publishing-basics", "1");
                setShowPublishingBasicsTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "publishing" } }));
              }}
            />
            <CanvasArea
              showOnMount={showCanvasTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-canvas", "1");
                setShowCanvasTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "canvas" } }));
              }}
            />
            <PropertiesPanel
              showOnMount={showPropertiesT}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-properties", "1");
                setShowPropertiesT(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "properties" } }));
              }}
            />
            <AIAssistant
              showOnMount={showAITour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-ai", "1");
                setShowAITour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "ai" } }));
              }}
            />
            <CodeEditorTour
              showOnMount={showCodeTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-code", "1");
                setShowCodeTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "code" } }));
              }}
            />
            <SavingCollaboration
              showOnMount={showCollabTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-collab", "1");
                setShowCollabTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "collab" } }));
              }}
            />
          </>
        }
      />
      <Route
        path="/editor/:projectId/*"
        element={
          <>
            <EditorLayout
              editor={{ ...editor, goToDashboard: goToDashboardAndRoute }}
              onStartTour={() => setShowEditorTour(true)}
              onStartPublishingBasics={() => setShowPublishingBasicsTour(true)}
              onStartCanvasArea={() => setShowCanvasTour(true)}
            />
            <WebsiteCreation
              showOnMount={showEditorTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-website-creation", "1");
                setShowEditorTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "website" } }));
              }}
            />
            <PublishingBasics
              showOnMount={showPublishingBasicsTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-publishing-basics", "1");
                setShowPublishingBasicsTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "publishing" } }));
              }}
            />
            <CanvasArea
              showOnMount={showCanvasTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-canvas", "1");
                setShowCanvasTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "canvas" } }));
              }}
            />
            <PropertiesPanel
              showOnMount={showPropertiesT}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-properties", "1");
                setShowPropertiesT(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "properties" } }));
              }}
            />
            <AIAssistant
              showOnMount={showAITour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-ai", "1");
                setShowAITour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "ai" } }));
              }}
            />
            <CodeEditorTour
              showOnMount={showCodeTour}
              onComplete={() => {
                localStorage.setItem("buildx-tutorial-code", "1");
                setShowCodeTour(false);
                window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "code" } }));
              }}
            />
            <SavingCollaboration
            showOnMount={showCollabTour}
            onComplete={() => {
              localStorage.setItem("buildx-tutorial-collab", "1");
              setShowCollabTour(false);
              window.dispatchEvent(new CustomEvent("buildx-tutorial-step-completed", { detail: { stepKey: "collab" } }));
            }}
            />
          </>
        }
      />

<Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

    </>
  );
}

import { SubdomainRouter } from "./components/SubdomainRouter";

export default function App() {
  const editor = useEditorState();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <div className="mb-4 flex items-center justify-center gap-3 text-muted-foreground">
            <Smartphone className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs font-medium">→</span>
            <Monitor className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold">Unsupported viewport</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your window is too small! Please access the app on a device with a
            larger screen or resize your browser window to be wider than 768
            pixels.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SubdomainRouter>
      <Router>
        <AppRoutes editor={editor} />
      </Router>
    </SubdomainRouter>
  );
}
