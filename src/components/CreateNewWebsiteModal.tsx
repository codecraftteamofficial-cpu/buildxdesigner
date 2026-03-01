"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Search, X, Sparkles, Eye, Heart } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
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
  onSelectTemplate: (templateId: string, projectName: string) => void;
  onTrackSearch: (query: string) => void;
  recommendedTemplates?: Template[];
  initialTemplateId?: string | null;
}

const templates: Template[] = [
  {
    id: "blank",
    name: "Blank Canvas",
    description:
      "Start from scratch with a clean workspace and build your design from the ground up",
    thumbnail:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Blank",
    premium: false,
    tags: ["blank", "scratch", "empty", "custom"],
    creator: "BuildX Team",
    creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=BuildX",
    views: 45600,
    favorites: 892,
  },
  {
    id: "portfolio-modern",
    name: "Modern Portfolio",
    description:
      "Clean and modern portfolio template perfect for showcasing your work",
    thumbnail:
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Portfolio",
    premium: false,
    tags: ["modern", "clean", "portfolio", "personal"],
    creator: "Sarah Chen",
    creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=SarahChen",
    views: 23400,
    favorites: 567,
  },
  {
    id: "ecommerce-pro",
    name: "E-commerce Pro",
    description: "Full-featured online store template with shopping cart",
    thumbnail:
      "https://images.unsplash.com/photo-1557821552-17105176677c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "E-commerce",
    premium: true,
    tags: ["ecommerce", "store", "shopping", "business"],
    creator: "Alex Rodriguez",
    creatorAvatar:
      "https://api.dicebear.com/7.x/initials/svg?seed=AlexRodriguez",
    views: 34200,
    favorites: 1240,
  },
  {
    id: "blog-minimal",
    name: "Minimal Blog",
    description: "Minimalist blog template focused on content",
    thumbnail:
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Blog",
    premium: false,
    tags: ["blog", "minimal", "content", "writing"],
    creator: "Emma Wilson",
    creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=EmmaWilson",
    views: 18900,
    favorites: 423,
  },
  {
    id: "landing-startup",
    name: "Startup Landing",
    description: "Modern startup landing page with CTAs",
    thumbnail:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Landing Page",
    premium: false,
    tags: ["landing", "startup", "business", "modern"],
    creator: "Michael Park",
    creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=MichaelPark",
    views: 29800,
    favorites: 745,
  },
  {
    id: "dashboard-admin",
    name: "Admin Dashboard",
    description: "Professional admin dashboard template",
    thumbnail:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Dashboard",
    premium: true,
    tags: ["dashboard", "admin", "analytics", "professional"],
    creator: "James Kumar",
    creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=JamesKumar",
    views: 41200,
    favorites: 1580,
  },
  {
    id: "restaurant-menu",
    name: "Restaurant Website",
    description: "Beautiful restaurant website with menu",
    thumbnail:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Business",
    premium: false,
    tags: ["restaurant", "business", "food", "menu"],
    creator: "Sofia Martinez",
    creatorAvatar:
      "https://api.dicebear.com/7.x/initials/svg?seed=SofiaMartinez",
    views: 15600,
    favorites: 389,
  },
  {
    id: "agency-creative",
    name: "Creative Agency",
    description: "Bold creative agency portfolio",
    thumbnail:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Agency",
    premium: true,
    tags: ["agency", "creative", "portfolio", "bold"],
    creator: "David Lee",
    creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=DavidLee",
    views: 27300,
    favorites: 892,
  },
  {
    id: "photography-portfolio",
    name: "Photography Portfolio",
    description: "Stunning photography portfolio template",
    thumbnail:
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Portfolio",
    premium: false,
    tags: ["photography", "portfolio", "gallery", "visual"],
    creator: "Olivia Brown",
    creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=OliviaBrown",
    views: 19700,
    favorites: 534,
  },
  {
    id: "saas-landing",
    name: "SaaS Landing Page",
    description: "Convert visitors with this SaaS template",
    thumbnail:
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Landing Page",
    premium: true,
    tags: ["saas", "landing", "business", "conversion"],
    creator: "Ryan Zhang",
    creatorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=RyanZhang",
    views: 36500,
    favorites: 1120,
  },
  {
    id: "corporate-business",
    name: "Corporate Business",
    description: "Professional corporate website template",
    thumbnail:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Business",
    premium: false,
    tags: ["corporate", "business", "professional", "enterprise"],
    creator: "Jennifer Taylor",
    creatorAvatar:
      "https://api.dicebear.com/7.x/initials/svg?seed=JenniferTaylor",
    views: 21800,
    favorites: 467,
  },
  {
    id: "fashion-store",
    name: "Fashion Store",
    description: "Trendy fashion e-commerce template",
    thumbnail:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "E-commerce",
    premium: true,
    tags: ["fashion", "ecommerce", "store", "trendy"],
    creator: "Isabella Garcia",
    creatorAvatar:
      "https://api.dicebear.com/7.x/initials/svg?seed=IsabellaGarcia",
    views: 31200,
    favorites: 978,
  },
  {
    id: "real-estate",
    name: "Real Estate Listings",
    description: "Property listing website template",
    thumbnail:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    category: "Business",
    premium: false,
    tags: ["real estate", "property", "listings", "business"],
    creator: "Thomas Anderson",
    creatorAvatar:
      "https://api.dicebear.com/7.x/initials/svg?seed=ThomasAnderson",
    views: 17400,
    favorites: 412,
  },
];

const formatViews = (views: number): string => {
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}k`;
  }
  return views.toString();
};

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function CreateNewWebsiteModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onTrackSearch,
  recommendedTemplates = [],
  initialTemplateId = null,
}: CreateNewWebsiteModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [projectName, setProjectName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [showNameInput, setShowNameInput] = useState(false);
  const [projectTemplates, setProjectTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // 1. We sync state DURING the render phase instead of waiting for a useEffect.
  // This calculates the correct view BEFORE the browser paints, completely eliminating the flash on open.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const normalizeTemplate = (item: any, index: number): Template => ({
      id: String(
        item?.id ??
          item?._id ??
          item?.project_id ??
          item?.projects?.projects_id ??
          item?.templateId ??
          `template-${index}`,
      ),
      name: String(
        item?.name ??
          item?.title ??
          item?.project_name ??
          item?.projects?.project_name ??
          "Untitled Template",
      ),
      description: String(
        item?.description ??
          item?.projects?.description ??
          "No description available",
      ),
      thumbnail: String(
        item?.thumbnail ??
          item?.thumbnailUrl ??
          item?.image ??
          item?.projects?.thumbnail ??
          "/placeholder.svg",
      ),
      category: String(
        item?.category ?? item?.projects?.category ?? "Business",
      ),
      premium: Boolean(
        item?.premium ?? item?.isPremium ?? item?.isPro ?? false,
      ),
      tags: Array.isArray(item?.tags)
        ? item.tags.map(String)
        : Array.isArray(item?.projects?.tags)
          ? item.projects.tags.map(String)
          : [],
      creator: item?.creator
        ? String(item.creator)
        : item?.profiles?.full_name
          ? String(item.profiles.full_name)
          : "BuildX Team",
      creatorAvatar: item?.creatorAvatar
        ? String(item.creatorAvatar)
        : item?.profiles?.avatar_url
          ? String(item.profiles.avatar_url)
          : "https://api.dicebear.com/7.x/initials/svg?seed=BuildX",
      views: Number(item?.views ?? item?.projects?.views ?? 0),
      favorites: Number(
        item?.favorites ?? item?.likes ?? item?.projects?.likes ?? 0,
      ),
    });

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
          setProjectTemplates(payload.map(normalizeTemplate));
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

  const availableTemplates =
    projectTemplates.length > 0 ? projectTemplates : templates;

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      if (initialTemplateId) {
        const allTemplates = [...availableTemplates, ...recommendedTemplates];
        const template = allTemplates.find((t) => t.id === initialTemplateId);
        if (template) {
          setSelectedTemplate(template);
          setProjectName(`My ${template.name}`);
          setShowNameInput(true);
        }
      } else {
        // Reset to default browse state when opening without a specific template
        setShowNameInput(false);
        setSelectedTemplate(null);
        setProjectName("");
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
    setProjectName(`My ${template.name}`);
    setShowNameInput(true);
  };

  const handleCreateProject = () => {
    if (selectedTemplate && projectName.trim()) {
      onSelectTemplate(selectedTemplate.id, projectName);
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[1400px] w-[96vw] max-h-[95vh] p-0 overflow-auto">
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

              <ScrollArea className="flex-1 px-6 py-4 overflow-visible">
                {recommendedTemplates.length > 0 &&
                  selectedCategory === "All" &&
                  !searchQuery && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-600" />
                        Recommended Template
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-6">
                        {recommendedTemplates.slice(0, 3).map((template) => (
                          <Card
                            key={template.id}
                            className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-violet-200 hover:border-violet-400 group overflow-hidden"
                            onClick={() => handleTemplateClick(template)}
                          >
                            <div className="relative aspect-video overflow-hidden">
                              <img
                                src={template.thumbnail || "/placeholder.svg"}
                                alt={template.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
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
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>
                                      {template.views
                                        ? formatViews(template.views)
                                        : "0"}
                                    </span>
                                  </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                      {filteredTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-blue-400 group overflow-hidden"
                          onClick={() => handleTemplateClick(template)}
                        >
                          <div className="relative aspect-video overflow-hidden">
                            <img
                              src={template.thumbnail || "/placeholder.svg"}
                              alt={template.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
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
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>
                                    {template.views
                                      ? formatViews(template.views)
                                      : "0"}
                                  </span>
                                </div>
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
                      <img
                        src={selectedTemplate.thumbnail || "/placeholder.svg"}
                        alt={selectedTemplate.name}
                        className="w-full h-full object-cover"
                      />
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
                <p className="text-xs text-muted-foreground">
                  You can change this later in project settings
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNameInput(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!projectName.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                >
                  Create Project
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
