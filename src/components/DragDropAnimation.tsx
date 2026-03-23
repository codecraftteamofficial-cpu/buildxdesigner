import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Type, Heading, MousePointer2, Image as ImageIcon, Settings, Eye, Code, Share2, Wand2 } from 'lucide-react';

interface Component {
  id: number;
  type: 'text' | 'heading' | 'button' | 'image';
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
}

interface PlacedComponent {
  id: number;
  type: string;
  name: string;
  x: number;
  y: number;
}

export const DragDropAnimation: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<number | null>(null);
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>([]);
  const [animationStep, setAnimationStep] = useState(0);
  const [showProperties, setShowProperties] = useState(false);

  const components: Component[] = [
    { id: 1, type: 'text', icon: Type, name: 'Text', description: 'Simple text paragraph' },
    { id: 2, type: 'heading', icon: Heading, name: 'Heading', description: 'Page or section heading' },
    { id: 3, type: 'button', icon: MousePointer2, name: 'Button', description: 'Interactive button element' },
    { id: 4, type: 'image', icon: ImageIcon, name: 'Image', description: 'Image placeholder' }
  ];

  useEffect(() => {
    const sequence = async () => {
      // Reset
      setAnimationStep(0);
      setPlacedComponents([]);
      setShowProperties(false);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 1: Highlight heading component
      setAnimationStep(1);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Step 2: Drag heading to canvas
      setActiveComponent(2);
      setAnimationStep(2);
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // Step 3: Place heading
      setPlacedComponents([{ id: 2, type: 'heading', name: 'Heading', x: 180, y: 80 }]);
      setActiveComponent(null);
      setAnimationStep(3);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Show properties
      setShowProperties(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 5: Drag text to canvas
      setActiveComponent(1);
      setAnimationStep(5);
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // Step 6: Place text
      setPlacedComponents(prev => [...prev, { id: 1, type: 'text', name: 'Text', x: 180, y: 140 }]);
      setActiveComponent(null);
      setAnimationStep(6);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 7: Drag button to canvas
      setActiveComponent(3);
      setAnimationStep(7);
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // Step 8: Place button
      setPlacedComponents(prev => [...prev, { id: 3, type: 'button', name: 'Button', x: 180, y: 210 }]);
      setActiveComponent(null);
      setAnimationStep(8);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Loop
      setPlacedComponents([]);
      setShowProperties(false);
    };

    const interval = setInterval(sequence, 15000);
    sequence();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-linear-to-br from-slate-950 via-indigo-950 to-violet-950 rounded-2xl overflow-hidden shadow-2xl border border-violet-500/20 relative">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(139, 92, 246, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(139, 92, 246, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      {/* Glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>

      <div className="relative h-full flex">
        {/* Left Sidebar - Blocks Palette */}
         <div className="w-52 bg-slate-900 border-r border-violet-500/20">
          {/* Header */}
          <div className="h-14 border-b border-violet-500/20 px-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
            </div>
            <span className="text-xs text-slate-400">Untitled Project</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-violet-500/20">
            <div className="flex-1 px-4 py-2 text-xs text-violet-300 bg-violet-500/10 border-b-2 border-violet-500">
              Blocks
            </div>
            <div className="flex-1 px-4 py-2 text-xs text-slate-500 text-center">
              Components
            </div>
          </div>

          {/* Blocks Palette */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-violet-500/20 rounded">
                  <div className="w-4 h-4 border-2 border-violet-400 rounded"></div>
                </div>
                <div>
                  <div className="text-sm text-white">Blocks Palette</div>
                  <div className="text-xs text-slate-500">14 blocks</div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search blocks..."
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-400 placeholder-slate-600"
                  readOnly
                />
              </div>
            </div>

            {/* Basic Elements */}
            <div className="space-y-1">
              <div className="text-xs text-slate-500 mb-2 flex items-center">
                <Type className="w-3 h-3 mr-1" />
                Basic Elements
              </div>
              
              {components.map((component) => {
                const Icon = component.icon;
                const isActive = activeComponent === component.id;
                const isHighlighted = animationStep === 1 && component.id === 2 ||
                                    animationStep === 5 && component.id === 1 ||
                                    animationStep === 7 && component.id === 3;
                
                return (
                  <motion.div
                    key={component.id}
                    animate={{
                      scale: isHighlighted ? 1.03 : 1,
                      backgroundColor: isActive ? 'rgba(139, 92, 246, 0.3)' : 
                                     isHighlighted ? 'rgba(139, 92, 246, 0.15)' :
                                     'rgba(51, 65, 85, 0.3)'
                    }}
                    className="p-3 rounded-lg border border-slate-700/50 hover:border-violet-500/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-start space-x-2">
                      <div className="p-1.5 bg-violet-500/10 rounded">
                        <Icon className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-200">{component.name}</div>
                        <div className="text-xs text-slate-500 truncate">{component.description}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="h-14 bg-slate-900 border-b border-violet-500/20 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-1">
                <button className="px-3 py-1.5 bg-violet-500/20 rounded text-xs text-violet-300 flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
                <button className="px-3 py-1.5 rounded text-xs text-slate-500 flex items-center space-x-1">
                  <Code className="w-3 h-3" />
                  <span>Code</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Saved</span>
              </div>
              <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
              <button className="px-4 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                Publish
              </button>
              <button className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs text-white transition-colors flex items-center space-x-1">
                <Share2 className="w-3 h-3" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative overflow-hidden bg-slate-900/70">
            <div className="absolute inset-0 p-8">
              <div className="w-full h-full bg-slate-950 rounded-lg border-2 border-dashed border-violet-500/30 relative overflow-hidden">
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(139, 92, 246, 1) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(139, 92, 246, 1) 1px, transparent 1px)
                  `,
                  backgroundSize: '24px 24px'
                }}></div>

                {/* Drag cursor animation */}
                <AnimatePresence>
                  {activeComponent && (
                    <motion.div
                      initial={{ x: -80, y: 60 }}
                      animate={{ 
                        x: activeComponent === 2 ? 180 : activeComponent === 1 ? 180 : 180, 
                        y: activeComponent === 2 ? 80 : activeComponent === 1 ? 140 : 210
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="absolute pointer-events-none z-50"
                    >
                      <div className="relative">
                        {/* Cursor */}
                        <svg width="20" height="20" viewBox="0 0 24 24" className="text-violet-400 drop-shadow-lg">
                          <path fill="currentColor" d="M8.5 2L3 12.5L8.5 11L12 22L22 2L8.5 2Z" />
                        </svg>
                        
                        {/* Component being dragged */}
                        <motion.div
                          animate={{ rotate: [0, 3, -3, 0] }}
                          transition={{ duration: 0.4, repeat: Infinity }}
                          className="absolute top-0 left-6 bg-violet-600/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-violet-400/50 shadow-2xl"
                        >
                          <span className="text-xs text-white whitespace-nowrap">
                            {components.find(c => c.id === activeComponent)?.name}
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Placed components */}
                <AnimatePresence>
                  {placedComponents.map((component) => (
                    <motion.div
                      key={component.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      style={{
                        position: 'absolute',
                        left: component.x,
                        top: component.y
                      }}
                      className="group"
                    >
                      {component.type === 'heading' && (
                        <div className="bg-violet-500/10 border-2 border-violet-500/50 rounded-lg px-4 py-3 backdrop-blur-sm min-w-[200px]">
                          <div className="text-base text-violet-200">Welcome to BuildX Designer</div>
                        </div>
                      )}
                      {component.type === 'text' && (
                        <div className="bg-violet-500/10 border-2 border-violet-500/40 rounded-lg px-4 py-2 backdrop-blur-sm min-w-[200px]">
                          <div className="text-xs text-violet-300">Build amazing websites visually</div>
                        </div>
                      )}
                      {component.type === 'button' && (
                        <div className="bg-violet-600 hover:bg-violet-700 border-2 border-violet-500/50 rounded-lg px-6 py-2 backdrop-blur-sm">
                          <div className="text-xs text-white">Get Started</div>
                        </div>
                      )}
                      
                      {/* Selection handles */}
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-violet-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-violet-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-violet-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty state */}
                {placedComponents.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <MousePointer2 className="w-8 h-8 text-violet-600/50" />
                      </div>
                      <p className="text-sm text-slate-600">Drag blocks here to build your page</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Bottom status bar */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-900 border-t border-violet-500/20 flex items-center justify-between px-4">
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                <div className="flex items-center space-x-1">
                  <Code className="w-3 h-3" />
                  <span>BuildX Designer v1.0.0</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Blocks Mode</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>{placedComponents.length} Component{placedComponents.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                <div>100% Zoom</div>
                <div className="flex items-center space-x-1">
                  <span>Last saved: 04:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ 
            width: showProperties && placedComponents.length > 0 ? 280 : 0,
            opacity: showProperties && placedComponents.length > 0 ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
          className="bg-slate-900 border-l border-violet-500/20 overflow-hidden"
        >
          <div className="w-70 p-4">
            {/* Tabs */}
            <div className="flex border-b border-violet-500/20 mb-4">
              <div className="flex-1 px-3 py-2 text-xs text-violet-300 bg-violet-500/10 border-b-2 border-violet-500 text-center">
                Properties
              </div>
              <div className="flex-1 px-3 py-2 text-xs text-slate-500 text-center flex items-center justify-center space-x-1">
                <Wand2 className="w-3 h-3" />
                <span>AI Mentor</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-6 h-6 text-violet-400" />
                </div>
                <p className="text-xs text-slate-400">Select a component to edit its properties</p>
              </div>

              {/* AI Suggestions */}
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-linear-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Wand2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs text-violet-200">AI Mentor</span>
                </div>
                <p className="text-xs text-violet-400/70">Get smart suggestions as you build</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
