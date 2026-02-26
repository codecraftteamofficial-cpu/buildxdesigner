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

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  matchPath,
} from "react-router-dom";

// Views
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { AdminLogin } from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import { EditorLayout } from "./components/EditorLayout";
import { OnboardingPage } from "./components/OnboardingPage";
import { GetOut } from "./components/UnexpectedEntry/UnexpectedEntry";
import LoginAuthSessionChecker from "./services/useAuthenticator";
import { CollaborationServiceProvider } from "./services/useCollaboration";

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

function AppRoutes({ editor }: { editor: EditorController }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isSyncingFromPath = useRef(false);
  const isInitialMount = useRef(true);

  const {
    state,
    setState,
    authLoading,
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

  const handleAuthenticatedSession = (session?: { user?: { user_metadata?: Record<string, unknown> } }) => {
    const onboardingCompleted = session?.user?.user_metadata?.onboarding_completed === true;

    if (!onboardingCompleted) {
      setShowOnboarding(true);
      return;
    }

    enterDashboard();
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
      ? `/editor/${projectId}${itShouldGoPrivate ? "/private" : ""}`
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

  const routeMatch =
    matchPath("/editor/:projectId/*", location.pathname) ||
    matchPath("/editor/:projectId", location.pathname);
  const matchedProjectId = routeMatch?.params?.projectId ?? null;
  const routeProjectId =
    matchedProjectId && matchedProjectId !== "private"
      ? matchedProjectId
      : null;

  useEffect(() => {
    if (location.pathname !== "/editor/private") return;

    const fallbackProjectId =
      state.currentProjectId ||
      localStorage.getItem("fulldev-ai-current-project-id");

    if (fallbackProjectId && fallbackProjectId !== "private") {
      navigate(`/editor/${fallbackProjectId}/private`, { replace: true });
      return;
    }

    navigate("/editor", { replace: true });
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

    if (location.pathname.startsWith("/editor/")) {
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

    const isPrivate = state.projectIsPublic === false;
    const targetPath = `/editor/${routeProjectId}/private`;
    const basePath = `/editor/${routeProjectId}`;

    const isBaseEditorPath = location.pathname === basePath;
    const isPrivatePath = location.pathname === targetPath;

    if (isPrivate && !isPrivatePath) {
      navigate(targetPath, { replace: true });
      return;
    }

    if (!isPrivate && isPrivatePath) {
      navigate(basePath, { replace: true });
    }
  }, [routeProjectId, state.projectIsPublic, location.pathname, navigate]);

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
    return <OnboardingPage onComplete={() => {
      setShowOnboarding(false);
      enterDashboard();
    }} />;
  }

  return (
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
      <Route
        path="/dashboard"
        element={
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
            onThemeChange={handleThemeChange}
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
                    String(comp.style?.width || "600").replace("px", ""),
                  ) || 600;

                const position = comp.position || {
                  x: centerX - width / 2,
                  y: currentY,
                };
                currentY += height + 20;

                return { ...comp, position };
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
        }
      />
      <Route
        path="/editor"
        element={
          <EditorLayout
            editor={{ ...editor, goToDashboard: goToDashboardAndRoute }}
          />
        }
      />
      <Route
        path="/editor/:projectId/*"
        element={
          <EditorLayout
            editor={{ ...editor, goToDashboard: goToDashboardAndRoute }}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { SubdomainRouter } from "./components/SubdomainRouter";

export default function App() {
  const editor = useEditorState();

  return (
    <SubdomainRouter>
      <Router>
        <AppRoutes editor={editor} />
      </Router>
    </SubdomainRouter>
  );
}
