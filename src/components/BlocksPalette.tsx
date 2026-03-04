import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import {
  Search,
  Type,
  Square,
  Image,
  Navigation,
  MousePointer,
  FileText,
  Users,
  Mail,
  Menu,
  Grid3X3,
  Video,
  Star,
  Layout,
  Code,
  Layers,
  LayoutGrid,
  LogIn,
  UserPlus
} from 'lucide-react';
import { ComponentData } from '../App';
import { useDrag, DragSourceMonitor } from 'react-dnd';

interface BlocksPaletteProps {
  onSelectBlock: (block: ComponentData) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

interface DraggableBlockProps {
  block: any;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

function DraggableBlock({ block, onClick, children, className }: DraggableBlockProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "component",
    item: {
      type: block.component.type,
      props: block.component.props,
      style: block.component.style
    },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      onClick={onClick}
      className={`${className} ${isDragging ? 'opacity-50' : ''} cursor-move`}
    >
      {children}
    </div>
  );
}

export function BlocksPalette({ onSelectBlock, searchTerm, onSearchChange }: BlocksPaletteProps) {
  const blockCategories = [
    {
      name: 'Basic Elements',
      icon: <Type className="w-4 h-4" />,
      blocks: [
        {
          id: 'text',
          name: 'Text',
          description: 'Simple text paragraph',
          icon: <Type className="w-4 h-4" />,
          component: {
            id: '',
            type: 'text',
            props: { content: 'Sample text content' },
            style: {}
          }
        },
        {
          id: 'heading',
          name: 'Heading',
          description: 'Page or section heading',
          icon: <Type className="w-4 h-4" />,
          component: {
            id: '',
            type: 'heading',
            props: { content: 'Sample Heading', level: 1 },
            style: {}
          }
        },
        {
          id: 'button',
          name: 'Button',
          description: 'Interactive button element',
          icon: <MousePointer className="w-4 h-4" />,
          component: {
            id: '',
            type: 'button',
            props: {
              text: 'Click Me',
              variant: 'default',
              onClick: 'console.log("Button clicked!")'
            },
            style: {}
          }
        },
        {
          id: 'image',
          name: 'Image',
          description: 'Image with responsive sizing',
          icon: <Image className="w-4 h-4" />,
          component: {
            id: '',
            type: 'image',
            props: { src: '', alt: 'Sample image', width: 300, height: 200 },
            style: {}
          }
        },
        {
          id: 'carousel',
          name: 'Image Carousel',
          description: 'Responsive image carousel with navigation',
          icon: <LayoutGrid className="w-4 h-4" />,
          component: {
            id: '',
            type: 'carousel',
            props: {
              slides: [
                { id: '1', src: '', alt: 'Slide 1', caption: 'First slide' },
                { id: '2', src: '', alt: 'Slide 2', caption: 'Second slide' },
                { id: '3', src: '', alt: 'Slide 3', caption: 'Third slide' }
              ],
              autoplay: true,
              autoplaySpeed: 3000,
              showArrows: true,
              showDots: true,
              infinite: true
            },
            style: {
              width: '100%',
              height: '300px',
              borderRadius: '0.5rem',
              overflow: 'hidden'
            }
          }
        }
      ]
    },
    {
      name: 'Layout',
      icon: <Layout className="w-4 h-4" />,
      blocks: [
        {
          id: 'container',
          name: 'Container',
          description: 'A container for other elements',
          icon: <Square className="w-4 h-4" />,
          component: {
            id: '',
            type: 'container',
            props: {
              children: [],
              className: 'p-4 border border-gray-200 rounded-lg bg-white',
              elementId: 'container-' + Math.random().toString(36).substr(2, 9) // Generate a random ID
            },
            style: {}
          }
        },
        {
          id: 'grid',
          name: 'Grid Layout',
          description: 'Responsive grid system',
          icon: <Grid3X3 className="w-4 h-4" />,
          component: {
            id: '',
            type: 'grid',
            props: {
              columns: 3,
              gap: '1rem',
              justifyContent: 'start',
              alignItems: 'stretch',
              padding: '1rem',
              orientation: 'horizontal',
              children: []
            },
            style: {
              display: 'grid',
              width: '100%',
              height: '300px'
            }
          }
        }
      ]
    },
    {
      name: 'Navigation',
      icon: <Navigation className="w-4 h-4" />,
      blocks: [
        {
          id: 'navbar',
          name: 'Navigation Bar',
          description: 'Top navigation with logo and links',
          icon: <Navigation className="w-4 h-4" />,
          component: {
            id: '',
            type: 'navbar',
            props: { brand: 'Your Brand', links: ['Home', 'About', 'Services', 'Contact'] },
            style: {}
          }
        },
        {
          id: 'hero',
          name: 'Hero Section',
          description: 'Large banner with title and CTA',
          icon: <Star className="w-4 h-4" />,
          component: {
            id: '',
            type: 'hero',
            props: { title: 'Welcome to Our Site', subtitle: 'Build amazing websites with ease' },
            style: {}
          }
        },
        {
          id: 'footer',
          name: 'Footer',
          description: 'Bottom page footer',
          icon: <Menu className="w-4 h-4" />,
          component: {
            id: '',
            type: 'footer',
            props: { copyright: '© 2024 Your Company. All rights reserved.' },
            style: {}
          }
        }
      ]
    },
    {
      name: 'Forms',
      icon: <FileText className="w-4 h-4" />,
      blocks: [
        {
          id: 'input',
          name: 'Input Field',
          description: 'Text input field',
          icon: <FileText className="w-4 h-4" />,
          component: {
            id: '',
            type: 'input',
            props: { placeholder: 'Enter text...', type: 'text' },
            style: {}
          }
        },
        {
          id: 'textarea',
          name: 'Text Area',
          description: 'Multi-line text input',
          icon: <FileText className="w-4 h-4" />,
          component: {
            id: '',
            type: 'textarea',
            props: { placeholder: 'Enter your message...' },
            style: {}
          }
        },

        {
          id: 'form',
          name: 'Contact Form',
          description: 'Complete contact form',
          icon: <Mail className="w-4 h-4" />,
          component: {
            id: '',
            type: 'form',
            props: { title: 'Get In Touch' },
            style: {}
          }
        }
      ]
    },
    {
      name: 'Media',
      icon: <Image className="w-4 h-4" />,
      blocks: [
        {
          id: 'video',
          name: 'Video Player',
          description: 'HTML5 video player',
          icon: <Video className="w-4 h-4" />,
          component: {
            id: '',
            type: 'video',
            props: { src: '', poster: '' },
            style: {}
          }
        },
        {
          id: 'gallery',
          name: 'Image Gallery',
          description: 'Responsive image grid',
          icon: <Image className="w-4 h-4" />,
          component: {
            id: '',
            type: 'gallery',
            props: { images: [] },
            style: {}
          }
        }
      ]
    },
    {
      name: 'Data',
      icon: <LayoutGrid className="w-4 h-4" />,
      blocks: [
        {
          id: 'table',
          name: 'Data Table',
          description: 'Display data in rows and columns',
          icon: <LayoutGrid className="w-4 h-4" />,
          component: {
            id: '',
            type: 'table',
            props: {
              headers: ['Name', 'Role', 'Status'],
              data: [
                { Name: 'John Doe', Role: 'Admin', Status: 'Active' },
                { Name: 'Jane Smith', Role: 'User', Status: 'Pending' },
              ],
              supabaseTable: '', // To be connected to a table
              tableName: 'Users Table', // Display title
            },
            style: {
              width: '100%',
              overflow: 'auto'
            }
          }
        }
      ]
    },
    {
      name: 'Authentication',
      icon: <Users className="w-4 h-4" />,
      blocks: [
        {
          id: 'sign-in',
          name: 'Sign In Form',
          description: 'Ready-to-use Supabase Sign In form',
          icon: <LogIn className="w-4 h-4" />,
          component: {
            id: '',
            type: 'sign-in',
            props: {
              title: 'Sign In',
              description: 'Enter your email and password to access your account.',
              buttonText: 'Sign In',
              redirectUrl: '/'
            },
            style: {
              width: '400px',
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }
          }
        },
        {
          id: 'sign-up',
          name: 'Sign Up Form',
          description: 'Supabase Sign Up with custom metadata fields',
          icon: <UserPlus className="w-4 h-4" />,
          component: {
            id: '',
            type: 'sign-up',
            props: {
              title: 'Sign Up',
              description: 'Create a new account by filling out the form below.',
              buttonText: 'Sign Up',
              redirectUrl: '/',
              extraFields: []
            },
            style: {
              width: '400px',
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }
          }
        }
      ]
    }
  ];

  // Filter blocks based on search term
  const filteredCategories = blockCategories.map(category => ({
    ...category,
    blocks: category.blocks.filter(block =>
      block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.blocks.length > 0);

  const handleBlockClick = (block: any) => {
    const componentData: ComponentData = {
      ...block.component,
      id: Date.now().toString() + Math.random()
    };
    onSelectBlock(componentData);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Blocks Palette
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {filteredCategories.reduce((total, cat) => total + cat.blocks.length, 0)} blocks
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full pr-4">
          <div className="p-4 space-y-4">
            {filteredCategories.map((category, categoryIndex) => (
              <div key={category.name}>
                {categoryIndex > 0 && <Separator className="mb-4" />}

                <div className="mb-3">
                  <h4 className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                    {category.icon}
                    {category.name}
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {category.blocks.map((block) => (
                    <DraggableBlock
                      key={block.id}
                      block={block}
                      onClick={() => handleBlockClick(block)}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors">
                          {block.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm group-hover:text-primary transition-colors">
                            {block.name}
                          </h5>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {block.description}
                          </p>
                        </div>
                      </div>
                    </DraggableBlock>
                  ))}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No blocks found matching "{searchTerm}"</p>
                <p className="text-sm mt-1">Try different keywords</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
