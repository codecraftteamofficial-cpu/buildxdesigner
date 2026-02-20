import React, { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Sparkles,
  Zap,
  Send,
  Lightbulb,
  Palette,
  Layout,
  Globe,
  Briefcase,
  ShoppingCart,
  Camera,
  Users,
  Heart,
  Calendar,
  X,
} from "lucide-react";
import { ComponentData } from "../App";
import { GeminiConfigCard } from './GeminiConfigCard';

interface AIDesignGeneratorProps {
  onClose: () => void;
  onGenerate: (components: ComponentData[]) => void;
}

export function AIDesignGenerator({
  onClose,
  onGenerate,
}: AIDesignGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] =
    useState(0);
  const [generatedDesign, setGeneratedDesign] = useState<
    ComponentData[] | null
  >(null);
  const [currentStep, setCurrentStep] = useState('');
  const [showGeminiConfig, setShowGeminiConfig] = useState(false);

  const examplePrompts = [
    {
      icon: Briefcase,
      category: "Business",
      prompt:
        "Create a modern SaaS landing page with a hero section, feature highlights, pricing table, and testimonials for a project management tool",
    },
    {
      icon: ShoppingCart,
      category: "E-commerce",
      prompt:
        "Design an elegant online boutique homepage with product showcase, featured collections, and newsletter signup",
    },
    {
      icon: Camera,
      category: "Portfolio",
      prompt:
        "Build a minimalist photography portfolio with a full-screen image gallery, about section, and contact form",
    },
    {
      icon: Users,
      category: "Blog",
      prompt:
        "Create a personal blog layout with featured articles, author bio, sidebar navigation, and social media links",
    },
    {
      icon: Heart,
      category: "Non-profit",
      prompt:
        "Design a charity website with donation call-to-action, mission statement, impact stories, and volunteer signup",
    },
    {
      icon: Calendar,
      category: "Events",
      prompt:
        "Build a conference landing page with event details, speaker lineup, schedule, and registration form",
    },
  ];

  const generateDesignFromPrompt = async (
    userPrompt: string,
  ) => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Step 1: Analyzing requirements
      setCurrentStep('Analyzing your requirements...');
      setGenerationProgress(20);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Call Gemini API
      setCurrentStep('Connecting to AI models...');
      setGenerationProgress(40);

      const components = await callGeminiForUIGeneration(userPrompt);

      // Step 3: Processing response
      setCurrentStep('Optimizing component structure...');
      setGenerationProgress(70);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 4: Finalizing
      setCurrentStep('Finalizing your design...');
      setGenerationProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 200));

      setGeneratedDesign(components);
      setCurrentStep('');
    } catch (error) {
      console.error('AI Generation Error:', error);
      setCurrentStep('Using fallback generation...');
      // Fallback to local generation if API fails
      const fallbackComponents = analyzePromptAndGenerateComponents(userPrompt);
      setGeneratedDesign(fallbackComponents);
      setCurrentStep('');
    } finally {
      setIsGenerating(false);
    }
  };

  const callGeminiForUIGeneration = async (prompt: string): Promise<ComponentData[]> => {
    const systemPrompt = `You are a professional UI/UX designer and developer. Generate a website component structure based on the user's description. 

AVAILABLE COMPONENTS:
- navbar: Navigation bar with brand and links
- hero: Hero section with title and subtitle
- heading: Section headings (h1-h6)
- text: Paragraph text content
- button: Clickable buttons with variants (default, outline, ghost)
- form: Contact/signup forms
- input: Form input fields
- gallery: Image galleries
- grid: Layout grids with columns
- container: Content containers
- footer: Website footer
- card: Content cards

RESPONSE FORMAT:
Return a JSON array of components. Each component must have this exact structure:
{
  "id": "unique_id",
  "type": "component_type",
  "props": {
    // Component-specific properties
  },
  "style": {
    // CSS style object (camelCase properties)
  }
}

COMPONENT PROPERTIES:
- navbar: { brand: string, links: string[] }
- hero: { title: string, subtitle: string }
- heading: { content: string, level: 1-6 }
- text: { content: string }
- button: { text: string, variant: "default"|"outline"|"ghost" }
- form: { title: string }
- input: { type: string, placeholder: string }
- gallery: { images: any[] }
- grid: { columns: number }
- container: {}
- footer: { copyright: string }
- card: { title?: string, content?: string }

STYLE GUIDELINES:
- Use standard CSS properties in camelCase (backgroundColor, fontSize, etc.)
- Common properties: margin, padding, textAlign, fontSize, fontWeight, color, backgroundColor, minHeight, maxWidth, display, flexDirection, justifyContent, alignItems
- Keep styles simple and clean
- Use semantic spacing (1rem, 2rem, 3rem, etc.)

DESIGN PRINCIPLES:
- Start with navbar if it's a full page
- Include hero section for landing pages
- Add appropriate sections based on the content type
- End with footer for complete pages
- Make content relevant to the prompt
- Use professional, engaging copy
- Structure components logically top to bottom

Generate a complete, professional website structure based on this prompt:`;

    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    const apiKey = 'YOUR_GEMINI_API_KEY_HERE'; // This would be replaced with actual API key

    // For now, we'll use a mock response that simulates what Gemini would return
    // In production, this would be the actual API call:
    /*
    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser Request: ${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }
    
    const components = JSON.parse(jsonMatch[0]);
    */

    // Mock Gemini-style intelligent response based on prompt analysis
    const components = await generateIntelligentComponents(prompt);

    // Validate and ensure proper structure
    return components.map((comp, index) => ({
      ...comp,
      id: (index + 1).toString()
    }));
  };

  const generateIntelligentComponents = async (prompt: string): Promise<ComponentData[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lowerPrompt = prompt.toLowerCase();
    const components: ComponentData[] = [];

    // Intelligent component generation based on Gemini-like analysis
    if (lowerPrompt.includes('landing') || lowerPrompt.includes('homepage') || lowerPrompt.includes('website')) {
      // Full page structure
      components.push({
        id: '1',
        type: 'navbar',
        props: {
          brand: extractIntelligentBrand(prompt),
          links: generateIntelligentNavigation(prompt)
        },
        style: {}
      });

      components.push({
        id: '2',
        type: 'hero',
        props: {
          title: generateIntelligentTitle(prompt),
          subtitle: generateIntelligentSubtitle(prompt)
        },
        style: {
          padding: '5rem 2rem',
          textAlign: 'center',
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }
      });
    }

    // Add content sections based on prompt analysis
    if (lowerPrompt.includes('feature') || lowerPrompt.includes('service') || lowerPrompt.includes('benefit')) {
      components.push({
        id: (components.length + 1).toString(),
        type: 'heading',
        props: { content: 'Our Features', level: 2 },
        style: { textAlign: 'center', margin: '4rem 0 2rem' }
      });

      components.push({
        id: (components.length + 1).toString(),
        type: 'grid',
        props: { columns: 3 },
        style: { margin: '2rem 0', maxWidth: '1200px', marginLeft: 'auto', marginRight: 'auto' }
      });
    }

    if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('gallery') || lowerPrompt.includes('work')) {
      components.push({
        id: (components.length + 1).toString(),
        type: 'heading',
        props: { content: 'Our Work', level: 2 },
        style: { textAlign: 'center', margin: '4rem 0 2rem' }
      });

      components.push({
        id: (components.length + 1).toString(),
        type: 'gallery',
        props: { images: [] },
        style: { margin: '2rem 0' }
      });
    }

    if (lowerPrompt.includes('pricing') || lowerPrompt.includes('plan') || lowerPrompt.includes('package')) {
      components.push({
        id: (components.length + 1).toString(),
        type: 'heading',
        props: { content: 'Choose Your Plan', level: 2 },
        style: { textAlign: 'center', margin: '4rem 0 2rem' }
      });

      components.push({
        id: (components.length + 1).toString(),
        type: 'grid',
        props: { columns: 3 },
        style: { margin: '2rem 0', maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }
      });
    }

    if (lowerPrompt.includes('testimonial') || lowerPrompt.includes('review') || lowerPrompt.includes('customer')) {
      components.push({
        id: (components.length + 1).toString(),
        type: 'heading',
        props: { content: 'What Our Customers Say', level: 2 },
        style: { textAlign: 'center', margin: '4rem 0 2rem' }
      });

      components.push({
        id: (components.length + 1).toString(),
        type: 'text',
        props: { content: 'Join thousands of satisfied customers who trust our solutions.' },
        style: { textAlign: 'center', fontSize: '1.1rem', color: '#666', margin: '0 auto 3rem', maxWidth: '600px' }
      });
    }

    if (lowerPrompt.includes('contact') || lowerPrompt.includes('get in touch') || lowerPrompt.includes('form')) {
      components.push({
        id: (components.length + 1).toString(),
        type: 'heading',
        props: { content: 'Get In Touch', level: 2 },
        style: { textAlign: 'center', margin: '4rem 0 2rem' }
      });

      components.push({
        id: (components.length + 1).toString(),
        type: 'form',
        props: { title: 'Contact Us' },
        style: { maxWidth: '600px', margin: '2rem auto' }
      });
    }

    // Add call-to-action
    if (lowerPrompt.includes('signup') || lowerPrompt.includes('register') || lowerPrompt.includes('get started') || lowerPrompt.includes('cta')) {
      components.push({
        id: (components.length + 1).toString(),
        type: 'button',
        props: {
          text: generateIntelligentCTA(prompt),
          variant: 'default'
        },
        style: {
          margin: '3rem auto 4rem',
          display: 'block',
          padding: '1rem 2rem',
          fontSize: '1.1rem'
        }
      });
    }

    // Add footer for complete pages
    if (components.length > 2) {
      components.push({
        id: (components.length + 1).toString(),
        type: 'footer',
        props: {
          copyright: `© 2024 ${extractIntelligentBrand(prompt)}. All rights reserved.`
        },
        style: {}
      });
    }

    return components;
  };

  const extractIntelligentBrand = (prompt: string): string => {
    // Extract or generate brand name from context
    const words = prompt.toLowerCase().split(' ');

    if (words.includes('fitness') || words.includes('gym')) return 'FitPro';
    if (words.includes('saas') || words.includes('software')) return 'CloudFlow';
    if (words.includes('restaurant') || words.includes('food')) return 'Bistro';
    if (words.includes('ecommerce') || words.includes('shop')) return 'ShopHub';
    if (words.includes('agency') || words.includes('creative')) return 'CreativeStudio';
    if (words.includes('portfolio') || words.includes('photography')) return 'VisualStory';
    if (words.includes('blog') || words.includes('news')) return 'BlogCentral';
    if (words.includes('event') || words.includes('conference')) return 'EventPro';
    if (words.includes('education') || words.includes('learning')) return 'EduHub';
    if (words.includes('medical') || words.includes('health')) return 'HealthCare';

    return 'YourBrand';
  };

  const generateIntelligentNavigation = (prompt: string): string[] => {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('saas') || lowerPrompt.includes('software')) {
      return ['Features', 'Pricing', 'About', 'Contact'];
    }
    if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop')) {
      return ['Products', 'Categories', 'About', 'Contact'];
    }
    if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('agency')) {
      return ['Work', 'Services', 'About', 'Contact'];
    }
    if (lowerPrompt.includes('blog') || lowerPrompt.includes('news')) {
      return ['Home', 'Articles', 'Categories', 'About'];
    }
    if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('food')) {
      return ['Menu', 'Reservations', 'About', 'Contact'];
    }
    if (lowerPrompt.includes('event') || lowerPrompt.includes('conference')) {
      return ['Schedule', 'Speakers', 'Tickets', 'Contact'];
    }

    return ['Home', 'About', 'Services', 'Contact'];
  };

  const generateIntelligentTitle = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('fitness') || lowerPrompt.includes('gym')) {
      return 'Transform Your Fitness Journey';
    }
    if (lowerPrompt.includes('saas') || lowerPrompt.includes('software')) {
      return 'Streamline Your Business Operations';
    }
    if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('food')) {
      return 'Exceptional Dining Experience';
    }
    if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop')) {
      return 'Discover Premium Products';
    }
    if (lowerPrompt.includes('agency') || lowerPrompt.includes('creative')) {
      return 'We Create Digital Excellence';
    }
    if (lowerPrompt.includes('portfolio')) {
      return 'Showcasing Creative Vision';
    }
    if (lowerPrompt.includes('education') || lowerPrompt.includes('learning')) {
      return 'Learn Without Limits';
    }
    if (lowerPrompt.includes('medical') || lowerPrompt.includes('health')) {
      return 'Your Health, Our Priority';
    }

    return 'Welcome to Innovation';
  };

  const generateIntelligentSubtitle = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('fitness')) {
      return 'Join thousands who have achieved their fitness goals with our personalized training programs and expert guidance.';
    }
    if (lowerPrompt.includes('saas')) {
      return 'Powerful tools and integrations that help modern teams collaborate, automate, and scale efficiently.';
    }
    if (lowerPrompt.includes('restaurant')) {
      return 'Crafted with passion, served with pride. Experience culinary excellence in every bite.';
    }
    if (lowerPrompt.includes('ecommerce')) {
      return 'Curated collections of premium products delivered right to your doorstep with exceptional service.';
    }
    if (lowerPrompt.includes('agency')) {
      return 'Transforming ideas into powerful digital experiences that drive results and captivate audiences.';
    }
    if (lowerPrompt.includes('education')) {
      return 'Unlock your potential with world-class courses designed by industry experts and thought leaders.';
    }

    return 'Experience innovation that transforms possibilities into reality.';
  };

  const generateIntelligentCTA = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('signup') || lowerPrompt.includes('register')) return 'Sign Up Now';
    if (lowerPrompt.includes('trial') || lowerPrompt.includes('saas')) return 'Start Free Trial';
    if (lowerPrompt.includes('shop') || lowerPrompt.includes('buy')) return 'Shop Now';
    if (lowerPrompt.includes('contact') || lowerPrompt.includes('quote')) return 'Get In Touch';
    if (lowerPrompt.includes('learn') || lowerPrompt.includes('course')) return 'Start Learning';
    if (lowerPrompt.includes('book') || lowerPrompt.includes('reservation')) return 'Book Now';

    return 'Get Started';
  };

  const analyzePromptAndGenerateComponents = (
    userPrompt: string,
  ): ComponentData[] => {
    const prompt = userPrompt.toLowerCase();
    const components: ComponentData[] = [];
    let componentId = 1;

    // Always start with navigation
    components.push({
      id: (componentId++).toString(),
      type: "navbar",
      props: {
        brand: extractBrandName(prompt),
        links: generateNavigationLinks(prompt),
      },
      style: {},
    });

    // Add hero section for most sites
    if (
      !prompt.includes("blog") ||
      prompt.includes("landing")
    ) {
      components.push({
        id: (componentId++).toString(),
        type: "hero",
        props: {
          title: generateHeroTitle(prompt),
          subtitle: generateHeroSubtitle(prompt),
        },
        style: getHeroStyle(prompt),
      });
    }

    // Add specific components based on keywords
    if (
      prompt.includes("portfolio") ||
      prompt.includes("gallery")
    ) {
      components.push({
        id: (componentId++).toString(),
        type: "gallery",
        props: { images: [] },
        style: { margin: "3rem 0" },
      });
    }

    if (prompt.includes("pricing") || prompt.includes("saas")) {
      components.push({
        id: (componentId++).toString(),
        type: "grid",
        props: { columns: 3 },
        style: { margin: "4rem 0" },
      });
    }

    if (
      prompt.includes("testimonial") ||
      prompt.includes("review")
    ) {
      components.push({
        id: (componentId++).toString(),
        type: "text",
        props: {
          content: "What our customers say about us",
        },
        style: {
          textAlign: "center",
          fontSize: "2rem",
          fontWeight: "bold",
          margin: "3rem 0 1rem",
        },
      });
    }

    if (prompt.includes("contact") || prompt.includes("form")) {
      components.push({
        id: (componentId++).toString(),
        type: "form",
        props: { title: "Get in touch" },
        style: { maxWidth: "600px", margin: "3rem auto" },
      });
    }

    if (prompt.includes("blog") || prompt.includes("article")) {
      components.push({
        id: (componentId++).toString(),
        type: "heading",
        props: { content: "Latest Posts", level: 2 },
        style: { textAlign: "center", margin: "3rem 0 1rem" },
      });
    }

    if (
      prompt.includes("cta") ||
      prompt.includes("call-to-action") ||
      prompt.includes("signup") ||
      prompt.includes("register")
    ) {
      components.push({
        id: (componentId++).toString(),
        type: "button",
        props: {
          text: generateCTAText(prompt),
          variant: "default",
        },
        style: {
          margin: "2rem auto",
          display: "block",
          padding: "1rem 2rem",
          fontSize: "1.1rem",
        },
      });
    }

    // Always end with footer
    components.push({
      id: (componentId++).toString(),
      type: "footer",
      props: {
        copyright: `© 2024 ${extractBrandName(prompt)}. All rights reserved.`,
      },
      style: {},
    });

    return components;
  };

  const extractBrandName = (prompt: string): string => {
    if (
      prompt.includes("saas") ||
      prompt.includes("project management")
    )
      return "TaskFlow";
    if (
      prompt.includes("boutique") ||
      prompt.includes("ecommerce")
    )
      return "Boutique";
    if (prompt.includes("photography")) return "Studio";
    if (prompt.includes("blog")) return "Blog";
    if (
      prompt.includes("charity") ||
      prompt.includes("non-profit")
    )
      return "HopeFoundation";
    if (
      prompt.includes("conference") ||
      prompt.includes("event")
    )
      return "Event2024";
    return "YourBrand";
  };

  const generateNavigationLinks = (
    prompt: string,
  ): string[] => {
    if (prompt.includes("saas"))
      return ["Features", "Pricing", "About", "Contact"];
    if (
      prompt.includes("ecommerce") ||
      prompt.includes("boutique")
    )
      return ["Shop", "Collections", "About", "Contact"];
    if (prompt.includes("portfolio"))
      return ["Work", "About", "Contact"];
    if (prompt.includes("blog"))
      return ["Home", "Articles", "About", "Contact"];
    if (prompt.includes("charity"))
      return ["Mission", "Donate", "Volunteer", "Contact"];
    if (
      prompt.includes("event") ||
      prompt.includes("conference")
    )
      return ["Schedule", "Speakers", "Register", "Contact"];
    return ["Home", "About", "Services", "Contact"];
  };

  const generateHeroTitle = (prompt: string): string => {
    if (
      prompt.includes("saas") ||
      prompt.includes("project management")
    )
      return "Streamline Your Projects";
    if (prompt.includes("boutique"))
      return "Discover Unique Style";
    if (prompt.includes("photography"))
      return "Capturing Life's Moments";
    if (prompt.includes("charity"))
      return "Together We Make a Difference";
    if (prompt.includes("conference"))
      return "Innovation Conference 2024";
    return "Welcome to Excellence";
  };

  const generateHeroSubtitle = (prompt: string): string => {
    if (prompt.includes("saas"))
      return "The ultimate project management solution for modern teams";
    if (prompt.includes("boutique"))
      return "Curated fashion pieces for the modern individual";
    if (prompt.includes("photography"))
      return "Professional photography that tells your story";
    if (prompt.includes("charity"))
      return "Join us in creating positive change in communities worldwide";
    if (prompt.includes("conference"))
      return "Join industry leaders for insights that shape the future";
    return "Experience quality and innovation like never before";
  };

  const getHeroStyle = (
    prompt: string,
  ): Record<string, any> => {
    const baseStyle = {
      padding: "4rem 2rem",
      textAlign: "center" as const,
    };

    if (
      prompt.includes("conference") ||
      prompt.includes("event")
    ) {
      return {
        ...baseStyle,
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column" as const,
        justifyContent: "center" as const,
      };
    }

    return baseStyle;
  };

  const generateCTAText = (prompt: string): string => {
    if (
      prompt.includes("signup") ||
      prompt.includes("register")
    )
      return "Sign Up Now";
    if (prompt.includes("donate")) return "Donate Now";
    if (prompt.includes("saas")) return "Start Free Trial";
    if (prompt.includes("ecommerce")) return "Shop Now";
    if (prompt.includes("contact")) return "Get in Touch";
    return "Get Started";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Design Generator
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="max-w-full mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold">
                AI Design Generator
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Describe your vision and let our AI create a
                professional website design tailored to your
                needs. Be as detailed as possible for the best
                results.
              </p>
            </div>

            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Describe Your Design
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Example: Create a modern landing page for a fitness app with a hero section showcasing workout videos, testimonials from users, pricing plans, and a download section..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                  disabled={isGenerating}
                />

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {prompt.length}/500 characters
                  </div>
                  <Button
                    onClick={() =>
                      generateDesignFromPrompt(prompt)
                    }
                    disabled={
                      !prompt.trim() ||
                      isGenerating ||
                      prompt.length > 500
                    }
                    className="flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Generate Design
                      </>
                    )}
                  </Button>
                </div>

                {isGenerating && (
                  <div className="space-y-3">
                    <Progress
                      value={generationProgress}
                      className="w-full progress-glow"
                    />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-blue-600">
                        AI is creating your design...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {generationProgress}% complete
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Example Prompts */}
            {!isGenerating && !generatedDesign && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  Try These Examples
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {examplePrompts.map((example, index) => {
                    const Icon = example.icon;
                    return (
                      <Card
                        key={index}
                        className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="space-y-2 flex-1">
                              <Badge
                                variant="secondary"
                                className="text-xs"
                              >
                                {example.category}
                              </Badge>
                              <p
                                className="text-sm leading-relaxed cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() =>
                                  setPrompt(example.prompt)
                                }
                              >
                                {example.prompt}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generated Design Preview */}
            {generatedDesign && !isGenerating && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-green-500" />
                      Your AI-Generated Design
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      ✨ Ready
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">
                      Generated Components:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedDesign.map((comp, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="capitalize"
                        >
                          {comp.type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        onGenerate(generatedDesign)
                      }
                      className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Use This Design
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGeneratedDesign(null);
                        setPrompt("");
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

