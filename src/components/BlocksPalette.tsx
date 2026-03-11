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
  Star,
  Layout,
  Code,
  Layers,
  LayoutGrid,
  LogIn,
  UserPlus,
  Minus,
  BoxSelect,
  ChevronDown,
  PanelTopClose,
  Columns,
  AlertTriangle,
  Maximize2,
  CreditCard
} from 'lucide-react';
import { ComponentData } from '../App';
import { useDrag, DragSourceMonitor } from 'react-dnd';
import {useEffect, useRef} from "react";
import {TourGuide} from "./Guides/Highlight";


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
      id: 'elements',
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
        
      ]
    },
    {
      name: 'Layout',
      icon: <Layout className="w-4 h-4" />,
      blocks: [
        {
          id: 'divider',
          name: 'Divider',
          description: 'Horizontal line to separate content',
          icon: <Minus className="w-4 h-4" />,
          component: {
            id: '',
            type: 'divider',
            props: {
              styleType: 'solid',
              thickness: '1px',
              color: '#000000ff'
            },
            style: {
              width: '100%',
              margin: '16px 0'
            }
          }
        },
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
        }
      ]
    },
    {
      name: 'Interactive',
      icon: <ChevronDown className="w-4 h-4" />,
      blocks: [
        {
          id: 'accordion',
          name: 'Accordion (FAQ)',
          description: 'Collapsible content sections for FAQs',
          icon: <PanelTopClose className="w-4 h-4" />,
          component: {
            id: '',
            type: 'accordion',
            props: {
              items: [
                { question: 'What is this?', answer: 'This is a sample accordion item. Click to expand or collapse.' },
                { question: 'How does it work?', answer: 'Each item can be toggled open or closed independently.' }
              ],
              allowMultiple: false
            },
            style: {
              width: '100%'
            }
          }
        },
        {
          id: 'tabs',
          name: 'Tabs',
          description: 'Switchable content panels',
          icon: <Columns className="w-4 h-4" />,
          component: {
            id: '',
            type: 'tabs',
            props: {
              tabs: [
                { label: 'Tab 1', content: 'Content for Tab 1' },
                { label: 'Tab 2', content: 'Content for Tab 2' },
                { label: 'Tab 3', content: 'Content for Tab 3' }
              ],
              activeTab: 0
            },
            style: {
              width: '100%'
            }
          }
        },
        {
          id: 'modal',
          name: 'Modal / Popup',
          description: 'Button that opens a customizable overlay',
          icon: <Maximize2 className="w-4 h-4" />,
          component: {
            id: '',
            type: 'modal',
            props: {
              triggerText: 'Open Modal',
              modalTitle: 'Modal Title',
              modalContent: 'This is the modal body content. You can customize this text.',
              overlayColor: 'rgba(0,0,0,0.5)'
            },
            style: {
              width: 'auto'
            }
          }
        },
        {
          id: 'alert',
          name: 'Alert / Banner',
          description: 'Callout box for important messages',
          icon: <AlertTriangle className="w-4 h-4" />,
          component: {
            id: '',
            type: 'alert',
            props: {
              variant: 'info',
              message: 'This is an informational alert message.',
              dismissible: true
            },
            style: {
              width: '100%'
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
        },
        {
          id: 'select',
          name: 'Select / Dropdown',
          description: 'Dropdown menu for selecting options',
          icon: <ChevronDown className="w-4 h-4" />,
          component: {
            id: '',
            type: 'select',
            props: {
              label: 'Select Option',
              placeholder: 'Select an option...',
              options: [
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
                { label: 'Option 3', value: 'option3' }
              ]
            },
            style: {
              width: '100%'
            }
          }
        },
        {
          id: 'checkbox',
          name: 'Checkbox',
          description: 'Single checkbox with label',
          icon: <BoxSelect className="w-4 h-4" />,
          component: {
            id: '',
            type: 'checkbox',
            props: {
              label: 'Remember me',
              checked: false
            },
            style: {}
          }
        },
        {
          id: 'radio-group',
          name: 'Radio Group',
          description: 'List of radio buttons for single selection',
          icon: <Users className="w-4 h-4" />,
          component: {
            id: '',
            type: 'radio-group',
            props: {
              label: 'Choose an option',
              options: [
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' }
              ],
              defaultValue: 'option1'
            },
            style: {
              width: '100%'
            }
          }
        }
      ]
    },
    {
      name: 'Media',
      icon: <Image className="w-4 h-4" />,
      blocks: [
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
    },
    {
      name: 'Payment',
      icon: <CreditCard className="w-4 h-4" />,
      blocks: [
        {
          id: 'paymongo-button',
          name: 'PayMongo Button',
          description: 'Payment button with PayMongo integration',
          icon: <CreditCard className="w-4 h-4" />,
          component: {
            id: '',
            type: 'paymongo-button',
            props: {
              label: 'Buy Now',
              amount: 100,
              description: 'Product Purchase',
              currency: 'PHP',
              variant: 'default',
              size: 'default'
            },
            style: {}
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
    <Card className="h-full flex flex-col"
      id="blocks-palette">
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
