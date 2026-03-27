import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Search, Download, Code2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPublishedComponents, importPublishedComponent } from '../supabase/data/publishedComponentService';
import { fetchCustomComponents } from '../supabase/data/customComponentService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getSupabaseSession } from '../supabase/auth/authService';
import { supabase } from '../supabase/config/supabaseClient';

interface ImportComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onImported: () => void; // callback to refresh the custom components list
}

export function ImportComponentModal({ isOpen, onClose, projectId, onImported }: ImportComponentModalProps) {
  const [components, setComponents] = useState<any[]>([]);
  const [customComponents, setCustomComponents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('marketplace');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [libraryPage, setLibraryPage] = useState(1);
  const [marketplacePage, setMarketplacePage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (isOpen) {
      loadPublishedComponents();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentUserId) {
      loadCustomComponents();
    }
  }, [isOpen, currentUserId]);

  useEffect(() => {
    setLibraryPage(1);
    setMarketplacePage(1);
  }, [searchTerm, activeTab]);

  const loadCustomComponents = async () => {
    if (!currentUserId) return;

    setIsLoadingCustom(true);
    try {
      // Get all user's projects
      const { data: userProjects, error: projectsError } = await supabase
        .from("projects")
        .select("projects_id")
        .eq("user_id", currentUserId);

      if (projectsError) {
        throw projectsError;
      }

      if (!userProjects || userProjects.length === 0) {
        setCustomComponents([]);
        return;
      }

      const projectIds = userProjects.map((p: any) => p.projects_id);

      // Get all custom components from all projects
      const { data: allComponents, error: componentsError } = await supabase
        .from("custom_components")
        .select(`
          *,
          projects!inner(
            user_id
          )
        `)
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      if (componentsError) {
        throw componentsError;
      }

      // Filter for imported components only
      const importedComponents = (allComponents || []).filter((comp: any) => {
        const componentData = comp.component_json;
        return componentData?.props?.importedFrom === true ||
          componentData?.props?.marketplaceId ||
          componentData?.props?.original_creator_id !== currentUserId;
      });

      setCustomComponents(importedComponents);

    } catch (error) {
      console.error("Failed to load user components:", error);
      toast.error("Failed to load your components.");
      setCustomComponents([]);
    } finally {
      setIsLoadingCustom(false);
    }
  };

  const isComponentImported = (componentId: string) => {
    return customComponents.some(cc =>
      cc.component_json?.props?.marketplaceId === componentId ||
      cc.component_json?.props?.importedFrom === true &&
      cc.component_json?.props?.marketplaceId === componentId
    );
  };

  const loadPublishedComponents = async () => {
    setIsLoading(true);
    try {
      // Get current user session
      const { data: { session } } = await getSupabaseSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);

      const { data, error } = await fetchPublishedComponents();
      if (error) {
        toast.error('Failed to load community components');
      } else {
        // Filter out current user's components
        const filteredComponents = (data || []).filter(comp => comp.user_id !== userId);
        setComponents(filteredComponents);
      }
    } catch {
      toast.error('Failed to load community components');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (component: any) => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    setImportingId(component.id);
    try {
      const { error } = await importPublishedComponent(projectId, {
        name: component.name,
        component_json: {
          ...component.component_json,
          props: {
            ...component.component_json?.props,
            importedFrom: true,
            original_creator_id: component.user_id,
            marketplaceId: component.id,
            imported_at: new Date().toISOString()
          }
        },
      });

      if (error) {
        toast.error('Failed to import component');
      } else {
        toast.success(`"${component.name}" imported successfully`);
        onImported();
        // Refresh custom components to update imported status
        loadCustomComponents();
      }
    } catch {
      toast.error('Failed to import component');
    } finally {
      setImportingId(null);
    }
  };

  const filtered = components.filter(c =>
    (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    !isComponentImported(c.id)
  );

  const filteredCustom = customComponents.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCustom.length / ITEMS_PER_PAGE);
  const paginatedCustom = filteredCustom.slice(
    (libraryPage - 1) * ITEMS_PER_PAGE,
    libraryPage * ITEMS_PER_PAGE
  );

  const totalMarketplacePages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedMarketplace = filtered.slice(
    (marketplacePage - 1) * ITEMS_PER_PAGE,
    marketplacePage * ITEMS_PER_PAGE
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full sm:max-w-lg flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-xl max-h-[70vh]">
        <DialogHeader className="p-4 border-b shrink-0 bg-muted/30">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Import Components
          </DialogTitle>
          <DialogDescription className="text-xs">Browse components library or manage your imported components.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-3 h-9">
            <TabsTrigger value="marketplace" className="text-xs">Components Library</TabsTrigger>
            <TabsTrigger value="library" className="text-xs">Your Library</TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="px-4 pt-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'marketplace' ? "Search marketplace..." : "Search your components..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </div>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="flex-1 flex flex-col mt-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-sm">Loading community components...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Code2 className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">
                      {searchTerm ? 'No components match your search' : 'All available components imported'}
                    </p>
                    <p className="text-xs mt-1">
                      {searchTerm ? 'Try different keywords' : 'Check back later for new community components!'}
                    </p>
                  </div>
                ) : (
                  <>
                    {paginatedMarketplace.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="p-2 bg-primary/10 rounded-md shrink-0">
                          <Code2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{comp.name}</h4>
                            <Badge variant="secondary" className="text-[10px] shrink-0">Community</Badge>
                          </div>
                          {comp.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{comp.description}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleImport(comp)}
                          disabled={importingId === comp.id || isComponentImported(comp.id)}
                        >
                          {importingId === comp.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isComponentImported(comp.id) ? (
                            <Download className="w-3 h-3" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          {isComponentImported(comp.id) ? 'Imported' : 'Import'}
                        </Button>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalMarketplacePages > 1 && (
                      <div className="flex items-center justify-between pt-4 pb-2 px-1 border-t mt-4">
                        <p className="text-[11px] text-muted-foreground">
                          Page {marketplacePage} of {totalMarketplacePages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setMarketplacePage(p => Math.max(1, p - 1))}
                            disabled={marketplacePage === 1}
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setMarketplacePage(p => Math.min(totalMarketplacePages, p + 1))}
                            disabled={marketplacePage === totalMarketplacePages}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Your Library Tab */}
          <TabsContent value="library" className="flex-1 flex flex-col mt-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-2">
                {isLoadingCustom ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-sm">Loading your components...</p>
                  </div>
                ) : filteredCustom.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Code2 className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">
                      {searchTerm ? 'No components match your search' : 'No imported components yet'}
                    </p>
                    <p className="text-xs mt-1">
                      {searchTerm ? 'Try different keywords' : 'Import components from the marketplace to get started'}
                    </p>
                  </div>
                ) : (
                  <>
                    {paginatedCustom.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="p-2 bg-green-500/10 rounded-md shrink-0">
                          <Code2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{comp.name}</h4>
                            <Badge variant="default" className="text-[10px] shrink-0 bg-green-100 text-green-800 border-green-200">
                              Imported
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Imported {new Date(comp.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 pb-2 px-1 border-t mt-4">
                        <p className="text-[11px] text-muted-foreground">
                          Page {libraryPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setLibraryPage(p => Math.max(1, p - 1))}
                            disabled={libraryPage === 1}
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setLibraryPage(p => Math.min(totalPages, p + 1))}
                            disabled={libraryPage === totalPages}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
