import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { 
  X, 
  Search, 
  Zap,
  Layout,
  Briefcase,
  ShoppingCart,
  Heart,
  Camera,
  Calendar,
  FileText,
  Play,
  Sparkles,
  Plus
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail: string;
  isPro?: boolean;
}

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  onCreateFromScratch: () => void;
}

// Extended template list with more options
const allTemplates: Template[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with a clean slate',
    category: 'Starter',
    tags: ['blank', 'custom', 'scratch'],
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop'
  },
  {
    id: 'modern-landing',
    name: 'Modern Business Landing',
    description: 'Clean, conversion-focused landing page',
    category: 'Business',
    tags: ['landing', 'business', 'modern', 'conversion'],
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop'
  },
  {
    id: 'creative-portfolio',
    name: 'Creative Portfolio',
    description: 'Showcase your work in style',
    category: 'Portfolio',
    tags: ['portfolio', 'creative', 'showcase', 'gallery'],
    thumbnail: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=300&fit=crop'
  },
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'Complete online store template',
    category: 'E-commerce',
    tags: ['ecommerce', 'shop', 'products', 'store'],
    thumbnail: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=300&fit=crop',
    isPro: true
  },
  {
    id: 'blog-magazine',
    name: 'Magazine Blog',
    description: 'Editorial-style blog layout',
    category: 'Blog',
    tags: ['blog', 'magazine', 'editorial', 'content'],
    thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop'
  },
  {
    id: 'restaurant-menu',
    name: 'Restaurant & Menu',
    description: 'Elegant restaurant presentation',
    category: 'Restaurant',
    tags: ['restaurant', 'menu', 'food', 'dining'],
    thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'
  },
  {
    id: 'event-landing',
    name: 'Event Landing',
    description: 'Perfect for conferences and events',
    category: 'Events',
    tags: ['event', 'conference', 'landing', 'registration'],
    thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop'
  },
  {
    id: 'saas-landing',
    name: 'SaaS Product Landing',
    description: 'Conversion-optimized SaaS landing page',
    category: 'Business',
    tags: ['saas', 'software', 'landing', 'conversion'],
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    isPro: true
  },
  {
    id: 'creative-agency',
    name: 'Creative Agency',
    description: 'Bold agency portfolio and services',
    category: 'Portfolio',
    tags: ['agency', 'creative', 'portfolio', 'services'],
    thumbnail: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400&h=300&fit=crop'
  },
  {
    id: 'personal-blog',
    name: 'Personal Blog',
    description: 'Clean and minimal blog design',
    category: 'Blog',
    tags: ['blog', 'personal', 'minimal', 'writing'],
    thumbnail: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop'
  },
  {
    id: 'fitness-gym',
    name: 'Fitness & Gym',
    description: 'Dynamic fitness center website',
    category: 'Health',
    tags: ['fitness', 'gym', 'health', 'sports'],
    thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop'
  },
  {
    id: 'real-estate',
    name: 'Real Estate Listings',
    description: 'Property showcase and search',
    category: 'Business',
    tags: ['real estate', 'property', 'listings', 'business'],
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop',
    isPro: true
  }
];

const categories = [
  { id: 'all', name: 'All Templates', icon: Layout },
  { id: 'Starter', name: 'Starter', icon: Plus },
  { id: 'Business', name: 'Business', icon: Briefcase },
  { id: 'Portfolio', name: 'Portfolio', icon: Camera },
  { id: 'E-commerce', name: 'E-commerce', icon: ShoppingCart },
  { id: 'Blog', name: 'Blog', icon: FileText },
  { id: 'Restaurant', name: 'Restaurant', icon: Heart },
  { id: 'Events', name: 'Events', icon: Calendar },
  { id: 'Health', name: 'Health', icon: Heart }
];

export function TemplateBrowserModal({ 
  isOpen, 
  onClose, 
  onSelectTemplate,
  onCreateFromScratch 
}: TemplateBrowserModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleTemplateClick = (templateId: string) => {
    if (templateId === 'blank') {
      onClose();
      onCreateFromScratch();
    } else {
      onSelectTemplate(templateId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="max-w-7xl w-[96vw] h-[85vh] p-0 gap-0 flex flex-col overflow-hidden" aria-describedby="template-browser-description">
        <DialogHeader className="sr-only">
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription id="template-browser-description">
            Start with a professional design or create from scratch
          </DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl">Choose a Template</h2>
              <p className="text-sm text-muted-foreground">Start with a professional design or create from scratch</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates by name, category, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-1">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                    >
                      <Icon className="w-4 h-4" />
                      {category.name}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Templates Grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="template-card group cursor-pointer border hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden"
                    onClick={() => handleTemplateClick(template.id)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="template-image w-full h-full object-cover"
                      />
                      {template.isPro && (
                        <Badge className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black">
                          <Zap className="w-3 h-3 mr-1" />
                          PRO
                        </Badge>
                      )}
                      {template.id === 'blank' && (
                        <Badge className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                          <Plus className="w-3 h-3 mr-1" />
                          Start Fresh
                        </Badge>
                      )}
                      <div className="template-overlay absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button
                          size="sm"
                          className="bg-white text-black hover:bg-white/90 shadow-xl"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {template.id === 'blank' ? 'Create Blank' : 'Use Template'}
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1">{template.name}</h3>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg mb-2">No templates found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your search or filters</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
