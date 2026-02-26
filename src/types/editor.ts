/**
 * Core type definitions for the website builder editor.
 * Extracted from App.tsx for better organization and reusability.
 */

export interface Page {
  id: string;
  name: string;
  path: string;
}

export interface ComponentData {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: ComponentData[];
  style?: Record<string, any>;
  position?: { x: number; y: number };
  project_layout?: any[];
  page_id?: string;
}

export interface EditorState {
  currentView: "landing" | "dashboard" | "editor" | "admin-login" | "admin" | "onboarding";
  currentPage: "landing" | "dashboard" | "editor" | "admin-login" | "admin" | "onboarding";
  pages: Page[];
  activePageId: string;
  components: ComponentData[];
  selectedComponent: string | null;
  showPreview: boolean;
  showCodeExport: boolean;
  showTemplates: boolean;
  showAIGenerator: boolean;
  editorMode: "blocks" | "dual-pane";
  viewMode: "design" | "code";
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  isLeftSidebarVisible: boolean;
  isRightSidebarVisible: boolean;
  isResizingLeftSidebar: boolean;
  isResizingRightSidebar: boolean;
  propertiesPanelVisible: boolean;
  aiAssistantVisible: boolean;
  canvasWidth: number;
  showMobileProperties: boolean;
  canvasZoom: number;
  currentProjectId: string | null;
  showPublishModal: boolean;
  showShareModal: boolean;
  lastSaved: Date | null;
  theme: "light" | "dark" | "system";
  isCodeSyncing: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isFullscreen: boolean;
  rightSidebarTab: "properties" | "ai-assistant";
  projectName: string;
  canvasBackgroundColor: string;
  showCanvasGrid: boolean;
  showAIAssistantModal: boolean;
  currentUser: any;
  isSupabaseConnected: boolean;
  userProjectConfig: {
    supabaseUrl: string;
    supabaseKey: string;
  };
  projectIsPublic: boolean | null;
  projectAuthorId: string | null;
  projectSubdomain?: string;
  projectIsPublished?: boolean;
  projectLastPublishedAt?: string;
  siteTitle?: string;
  siteLogoUrl?: string;
}
