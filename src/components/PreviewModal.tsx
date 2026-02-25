import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  X,
  Monitor,
  Smartphone,
  Tablet,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Eye,
  Maximize2,
  Minimize2,
  ExternalLink,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Download
} from 'lucide-react';
import { supabase } from '../supabase/config/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

type Action = {
  id: string;
  type: 'onClick' | 'onHover' | 'onFocus' | 'onBlur';
  handlerType: 'custom' | 'navigate' | 'scroll' | 'copy' | 'toggle' | 'supabase';
  handler: string;
  url?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  selector?: string;
  textToCopy?: string;
  toggleState?: boolean;
  supabaseOperation?: 'insert' | 'update' | 'delete' | 'select';
  supabaseTable?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseData?: Record<string, string>;
};

import { ComponentData } from '../App';
import { RenderableComponent } from './RenderableComponent';
import { scrollToTarget } from '../utils/scrollUtils';

interface PreviewModalProps {
  components: ComponentData[];
  onClose: () => void;
  activePageId?: string;
  pages?: { id: string; name: string; path: string }[];
  userProjectConfig?: {
    supabaseUrl: string;
    supabaseKey: string;
  };
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';
type FitMode = 'fit' | 'fill' | 'actual';

export function PreviewModal({ components, onClose, activePageId = 'home', pages = [], userProjectConfig }: PreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [fitMode, setFitMode] = useState<FitMode>('fit');
  const [zoom, setZoom] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isPickingElement, setIsPickingElement] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [localComponents, setLocalComponents] = useState<ComponentData[]>(components);
  const [localActivePageId, setLocalActivePageId] = useState<string>(activePageId);

  // Update local active page when prop changes
  useEffect(() => {
    setLocalActivePageId(activePageId);
  }, [activePageId]);

  const handleNavigate = useCallback((path: string) => {
    console.log('Preview internal navigation to:', path);
    if (!pages || pages.length === 0) return;

    // Handle root path or /home alias
    const getActivePageFromPath = (path: string, pages: { id: string; name: string; path: string }[]): string | null => {
      if (!pages || pages.length === 0) return 'home'; // If no pages, default to home

      // Normalize path for comparison
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;

      // Handle root path or /home alias
      if (normalizedPath === '/' || normalizedPath === '/home') {
        return 'home';
      }

      // Find page by path
      const page = pages.find(p => {
        const pagePathNormalized = p.path.startsWith('/') ? p.path : `/${p.path}`;
        return pagePathNormalized === normalizedPath;
      });

      return page ? page.id : null;
    };

    const newActivePageId = getActivePageFromPath(path, pages);
    if (newActivePageId) {
      setLocalActivePageId(newActivePageId);
    } else {
      console.warn('Page not found for path:', path);
    }
  }, [pages]);

  // Sync local components when props change
  useEffect(() => {
    setLocalComponents(components);
  }, [components]);

  const handleUpdate = useCallback((componentId: string, updates: Partial<ComponentData>) => {
    setLocalComponents(prev => prev.map(c =>
      c.id === componentId ? { ...c, ...updates } : c
    ));
  }, []);

  // Handle messages from the parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our own origin for security
      if (event.origin !== window.location.origin) return;

      const { type, script } = event.data;

      if (type === 'EXECUTE_SCRIPT' && script) {
        try {
          // Execute the script in the iframe's context
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
            // Create a script element in the iframe
            const scriptEl = document.createElement('script');
            scriptEl.text = `
              try {
                ${script}
              } catch (error) {
                console.error('Error executing script in iframe:', error);
              }
            `;

            // Append and remove the script
            if (iframe.contentDocument) {
              iframe.contentDocument.body.appendChild(scriptEl);
              iframe.contentDocument.body.removeChild(scriptEl);
            }
          }
        } catch (error) {
          console.error('Error handling script execution:', error);
        }
      }
    };

    // Add event listener for messages
    window.addEventListener('message', handleMessage);

    // Clean up the event listener
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [scale, setScale] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);



  // Listen for scroll events from child components
  useEffect(() => {
    const handleScrollEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ elementId: string }>;
      if (customEvent.detail?.elementId) {
        console.log('Received scrollToElement event:', customEvent.detail.elementId);
        const root = contentRef.current || document;
        scrollToTarget(customEvent.detail.elementId, 2000, root);
      }
    };

    window.addEventListener('scrollToElement', handleScrollEvent as EventListener);

    return () => {
      window.removeEventListener('scrollToElement', handleScrollEvent as EventListener);
    };
  }, []);

  // Device dimensions
  const getDeviceDimensions = () => {
    switch (viewMode) {
      case 'mobile':
        return { width: 375, height: 667, name: 'mobile' };
      case 'tablet':
        return { width: 768, height: 1024, name: 'tablet' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%', name: 'desktop' };
    }
  };

  // Calculate scale factor for fit mode
  const calculateScale = useCallback(() => {
    const container = document.querySelector('.preview-container') as HTMLElement;
    if (!container) return 1;

    const containerRect = container.getBoundingClientRect();
    const device = getDeviceDimensions();

    // For desktop, we want to focus on the visible canvas area
    if (viewMode === 'desktop') {
      // Get the canvas container from the main editor
      const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;

      if (canvasContainer) {
        // Use the canvas container's dimensions instead of calculating from components
        const canvasRect = canvasContainer.getBoundingClientRect();

        // Calculate scale based on the canvas container size
        const scaleX = (containerRect.width * 0.9) / canvasRect.width;
        const scaleY = (containerRect.height * 0.9) / canvasRect.height;

        // Use the smaller scale to ensure everything fits, but don't go below 10% or above 100%
        const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 1);
        return newScale;
      }

      // Fallback to default scale if canvas container not found
      return Math.min(
        (containerRect.width * 0.9) / 1200,
        (containerRect.height * 0.9) / 800
      );
    }

    // For mobile/tablet, use the device dimensions
    const containerWidth = containerRect.width - 80; // Account for padding
    const containerHeight = containerRect.height - 120; // Account for header and padding

    const deviceWidth = typeof device.width === 'number' ? device.width : parseInt(device.width, 10) || 1440;
    const deviceHeight = typeof device.height === 'number' ? device.height : parseInt(device.height, 10) || 900;

    switch (fitMode) {
      case 'fit':
        return Math.min(
          containerWidth / deviceWidth,
          containerHeight / deviceHeight
        ) * 0.9; // 90% to add some margin
      case 'fill':
        return Math.max(
          containerWidth / deviceWidth,
          containerHeight / deviceHeight
        );
      case 'actual':
        return zoom;
      default:
        return 1;
    }
  }, [localComponents, fitMode, viewMode, zoom]);

  // Update scale when view mode changes or window is resized
  useEffect(() => {
    const updateScale = () => {
      const newScale = calculateScale();
      setScale(newScale);
    };

    // Initial scale calculation with a small delay to ensure DOM is ready
    const timer = setTimeout(updateScale, 50);

    // Also update on window resize
    window.addEventListener('resize', updateScale);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScale);
    };
  }, [calculateScale]);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setShowControls(true);
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    controlsTimeoutRef.current = timeout;
  }, []);

  // Handle mouse movement for auto-hide controls
  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Handle element picking in the preview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ELEMENT_PICKED' && event.data.element) {
        // Forward the element data to the parent window
        if (window.parent) {
          window.parent.postMessage({
            type: 'ELEMENT_PICKED',
            element: event.data.element,
            action: event.data.action,
          }, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle element selection in the preview
  useEffect(() => {
    if (!isPickingElement) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (target) {
        // Find the closest element with an ID
        const elementWithId = target.closest('[id]');
        if (elementWithId) {
          // Notify the parent window about the selected element
          window.parent?.postMessage({
            type: 'ELEMENT_PICKED',
            element: {
              id: elementWithId.id,
              tagName: elementWithId.tagName,
              className: elementWithId.className
            }
          }, '*');
        }
      }

      setIsPickingElement(false);
      document.body.style.cursor = '';
    };

    if (isPickingElement) {
      document.body.style.cursor = 'crosshair';
      document.addEventListener('click', handleClick, true);
    }

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.body.style.cursor = '';
    };
  }, [isPickingElement]);

  // Handle button clicks in preview mode
  const handleButtonClick = useCallback((e: React.MouseEvent, component: any) => {
    console.log('Button clicked in preview:', component);

    // Prevent default and stop propagation to avoid conflicts
    e.preventDefault();
    e.stopPropagation();

    // If it's a button with actions
    if (component.type === 'button' && component.props?.actions?.length) {
      const onClickActions = component.props.actions.filter((a: any) => a.type === 'onClick');

      // Handle navigation actions immediately
      const navigateAction = onClickActions.find((a: any) => a.handlerType === 'navigate');
      if (navigateAction && navigateAction.url) {
        console.log('Executing navigation action:', navigateAction);

        const isInternal = navigateAction.url.startsWith('/') || navigateAction.url.startsWith('./');
        if (isInternal && (!navigateAction.target || navigateAction.target === '_self')) {
          handleNavigate(navigateAction.url);
        } else {
          window.open(navigateAction.url, navigateAction.target || '_blank');
        }
        return;
      }

      // Handle copy to clipboard actions
      const copyAction = onClickActions.find((a: any) => a.handlerType === 'copy' && a.textToCopy);
      if (copyAction) {
        console.log('Executing copy action:', copyAction);
        navigator.clipboard.writeText(copyAction.textToCopy || '').catch(console.error);
        return;
      }

      // Handle scroll to element actions
      const scrollAction = onClickActions.find((a: any) => a.handlerType === 'scroll' && a.selector);
      if (scrollAction) {
        console.log('--- SCROLL ACTION TRIGGERED ---');
        console.log('Component:', component);
        console.log('All Actions:', component.props?.actions);
        console.log('Scroll Action:', scrollAction);
        console.log('Target Selector:', scrollAction.selector);

        const root = contentRef.current || document;
        scrollToTarget(scrollAction.selector, 2000, root).then(success => {
          console.log('Scroll result:', success ? 'SUCCESS' : 'FAILED');
        });
        return;
      }

      // Handle toggle element actions
      const toggleAction = onClickActions.find((a: any) => a.handlerType === 'toggle' && a.selector);
      if (toggleAction) {
        console.log('Executing toggle action:', toggleAction);

        // Use generated handler if available
        if (toggleAction.handler) {
          try {
            const handlerFn = new Function('event', 'props', toggleAction.handler);
            handlerFn(e, component.props);
            return;
          } catch (err) {
            console.error('Error executing generated toggle handler:', err);
          }
        }

        const selector = toggleAction.selector;
        const cleanId = selector.startsWith('#') ? selector.substring(1) : selector;
        const cleanSelector = selector.replace(/'/g, "\\'");

        let elements = document.querySelectorAll(selector);

        if (elements.length === 0) {
          // Try by ID and data-component-id
          elements = document.querySelectorAll(`[id="${cleanId}"], [data-component-id="${cleanId}"]`);
          if (elements.length === 0 && !selector.startsWith('#') && !selector.startsWith('.')) {
            elements = document.querySelectorAll(`#${cleanSelector}`);
          }
        }

        if (elements.length > 0) {
          elements.forEach(element => {
            if (typeof toggleAction.toggleState === 'boolean') {
              // Use the toggleState if provided
              (element as HTMLElement).style.display = toggleAction.toggleState ? 'block' : 'none';
            } else {
              // Toggle based on current state
              const currentDisplay = window.getComputedStyle(element as Element).display;
              (element as HTMLElement).style.display = currentDisplay === 'none' ? 'block' : 'none';
            }
          });
          console.log(`Toggled ${elements.length} element(s) with selector:`, toggleAction.selector);
        } else {
          console.error('No elements found with selector:', toggleAction.selector);
        }
        return;
      }

      // Handle custom actions
      const customAction = onClickActions.find((a: any) => a.handlerType === 'custom' && a.handler);
      if (customAction) {
        console.log('Executing custom action:', customAction);
        try {
          const actionFn = new Function('event', 'props', `
            try {
              ${customAction.handler}
            } catch (err) {
              console.error('Error in custom action:', err);
            }
          `);
          actionFn(e, component.props);
        } catch (error) {
          console.error('Error executing custom action:', error);
        }
        return;
      }
      // Handle Supabase actions
      const supabaseAction = onClickActions.find((a: any) => a.handlerType === 'supabase' && a.supabaseTable);
      if (supabaseAction) {
        console.log('Executing Supabase action:', supabaseAction);
        const table = supabaseAction.supabaseTable;
        const operation = supabaseAction.supabaseOperation || 'insert';
        const dataMapping = supabaseAction.supabaseData || {};

        // Resolve data from input elements if mapped
        const recordData: Record<string, any> = {};

        Object.entries(dataMapping).forEach(([rawCol, valOrId]) => {
          const col = (rawCol as string).trim();
          if (!col) return;

          const valAsString = valOrId as string;
          const cleanId = valAsString.startsWith('#') ? valAsString.substring(1) : valAsString;

          let element: any = null;
          const allElements = document.querySelectorAll(`[id="${cleanId}"]`);

          if (allElements.length > 0) {
            const previewElement = Array.from(allElements).find(el => el.closest('.preview-container'));
            if (previewElement) {
              element = previewElement;
            } else {
              element = allElements[allElements.length - 1]; // Fallback
            }
          } else {
            element = document.querySelector(`.preview-container ${valAsString}`);
          }

          if (element && ('value' in element)) {
            recordData[col] = element.value;
            console.log(`[Supabase Preview] Mapped "${col}" to input value: "${element.value}"`);
          } else if (element) {
            recordData[col] = element.innerText;
            console.log(`[Supabase Preview] Mapped "${col}" to text content: "${element.innerText}"`);
          } else {
            recordData[col] = valAsString;
            console.log(`[Supabase Preview] Mapped "${col}" to static/not-found value: "${valAsString}"`);
          }
        });

        (async () => {
          try {
            console.log(`[Supabase Preview] Executing ${operation} on "${table}"`);

            let client = supabase;
            if (supabaseAction.supabaseUrl && supabaseAction.supabaseKey) {
              client = createClient(supabaseAction.supabaseUrl, supabaseAction.supabaseKey);
            } else if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
              client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
            }

            let result;
            if (operation === 'insert') {
              result = await client.from(table).insert(recordData);
            } else if (operation === 'select') {
              let query = client.from(table).select('*');

              Object.entries(recordData).forEach(([key, value]) => {
                if (value) {
                  query = query.eq(key, value);
                }
              });

              result = await query;
              console.log('[Supabase Preview] Select Result:', result.data);

              if (result.data) {
                toast.success('Select Query Successful', {
                  description: `Found ${result.data.length} records. Check console for details.`
                });
                console.log('First 3 records:', result.data.slice(0, 3));
              }
            } else if (operation === 'update') {
              if (recordData.id) {
                const { id, ...updateData } = recordData;
                result = await client.from(table).update(updateData).eq('id', id);
              } else {
                console.error('[Supabase Preview] Update requires an "id" field in the data mapping');
                return;
              }
            } else if (operation === 'delete') {
              if (recordData.id) {
                result = await client.from(table).delete().eq('id', recordData.id);
              } else {
                console.error('[Supabase Preview] Delete requires an "id" field type');
                return;
              }
            }

            if (result && result.error) {
              console.error("Supabase Operation Error:", result.error);
              toast.error('Supabase Operation Failed', {
                description: result.error.message
              });
            } else if (result) {
              console.log("Supabase Operation Success:", result);
              toast.success('Action Completed', {
                description: `${operation.charAt(0).toUpperCase() + operation.slice(1)} operation completed successfully`
              });

              if (operation === 'insert' || operation === 'update' || operation === 'delete') {
                console.log('Dispatching supabase-data-update event for table:', table);
                window.dispatchEvent(new CustomEvent('supabase-data-update', {
                  detail: { table, operation }
                }));
              }
            }
          } catch (err) {
            console.error('[Supabase Preview] Exception:', err);
            toast.error('Unexpected Error', {
              description: 'An unexpected error occurred. Check console for details.'
            });
          }
        })();
        return;
      }
    }
  }, [userProjectConfig]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const currentFitMode = fitMode;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case '1':
        setViewMode('desktop');
        break;
      case '2':
        setViewMode('tablet');
        break;
      case '3':
        setViewMode('mobile');
        break;
      case 'f':
        setFitMode('fit');
        break;
      case 'F':
        setFitMode('fill');
        break;
      case '0':
        setFitMode('actual');
        setZoom(1);
        break;
      case '+':
      case '=':
        if (currentFitMode === 'actual') {
          setZoom(prev => Math.min(prev * 1.2, 5));
        }
        break;
      case '-':
        if (currentFitMode === 'actual') {
          setZoom(prev => Math.max(prev / 1.2, 0.1));
        }
        break;
      case '?':
        setShowHelp(prev => !prev);
        break;
      case 'f':
      case 'F':
        setIsFullscreen(prev => !prev);
        break;
      case 'r':
      case 'R':
        setIsRotated(prev => !prev);
        break;
    }
  }, [onClose, fitMode]);

  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => handleKeyDown(e);
    const mouseMoveHandler = () => handleMouseMove();

    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('mousemove', mouseMoveHandler);
    resetControlsTimeout();

    return () => {
      document.removeEventListener('keydown', keyDownHandler);
      document.removeEventListener('mousemove', mouseMoveHandler);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [handleKeyDown, handleMouseMove, resetControlsTimeout]);

  const device = getDeviceDimensions();

  const getDeviceStyles = () => {
    const width = typeof device.width === 'number' ? `${device.width}px` : device.width;
    const height = typeof device.height === 'number' ? `${device.height}px` : device.height;

    return {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'center center',
      transition: 'transform 0.3s ease-out',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      backgroundColor: 'white',
    };
  };

  const resetView = () => {
    setZoom(1);
    setFitMode('fit');
  };

  const handleZoomIn = () => {
    if (fitMode !== 'actual') {
      setFitMode('actual');
    }
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    if (fitMode !== 'actual') {
      setFitMode('actual');
    }
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Controls Overlay */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Preview</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
                className="text-white hover:text-black"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewMode === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tablet')}
                className="text-white hover:text-black"
              >
                <Tablet className="w-4 h-4 mr-1" />
                Tablet
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="text-white hover:text-black"
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Mobile
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button
                variant={fitMode === 'fit' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFitMode('fit')}
                className="text-white hover:text-black"
              >
                <Maximize className="w-4 h-4 mr-1" />
                Fit
              </Button>
              <Button
                variant={fitMode === 'fill' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFitMode('fill')}
                className="text-white hover:text-black"
              >
                Fill
              </Button>
              <Button
                variant={fitMode === 'actual' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => { setFitMode('actual'); setZoom(1); }}
                className="text-white hover:text-black"
              >
                100%
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="text-white hover:text-black"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Badge variant="secondary" className="px-2 py-1 text-xs min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="text-white hover:text-black"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetView}
              className="text-white hover:text-black"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:text-black"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="preview-container w-full h-full flex items-center justify-center">
        <div
          className={`shadow-2xl overflow-hidden ${viewMode === 'mobile' ? 'rounded-[2rem]' :
            viewMode === 'tablet' ? 'rounded-xl' :
              'rounded-none'
            }`}
          style={{
            ...getDeviceStyles()
            // Dark background for the device frame
          }}
        >
          {/* Device Frame for Mobile/Tablet */}
          {viewMode !== 'desktop' && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {viewMode === 'mobile' && (
                <>
                  {/* iPhone-style notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl" />
                  {/* Home indicator */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-black/20 rounded-full" />
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div
            ref={contentRef}
            className="relative w-full h-full"
            style={{
              minHeight: '100%',
              // Note: Scaling is handled by the parent container via getDeviceStyles().
              // Do NOT add transform: scale() here as it causes double-scaling and 
              // rendering glitches (disappearing elements) during scrolling.
              width: '100%',
              height: '100%',
              overflow: 'auto',
              backgroundColor: '#ffffff',
              position: 'relative'
            }}
          >
            {localComponents.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-xl font-medium mb-2">No Components</h3>
                  <p>Add some components to see your design in preview</p>
                </div>
              </div>
            ) : (
              <div
                ref={previewRef}
                className="relative w-full"
                style={{
                  minHeight: '100%',
                  height: Math.max(
                    ...localComponents
                      .filter(c => c.page_id === localActivePageId || c.page_id === 'all' || (!c.page_id && localActivePageId === 'home'))
                      .map(c => (c.position?.y || 0) + (parseInt(String(c.style?.height || 0)) || 100)),
                    800 // Minimum height
                  ) + 'px'
                  // Ensure dark background for content
                }}
              >
                {localComponents
                  .filter(c => c.page_id === localActivePageId || c.page_id === 'all' || (!c.page_id && localActivePageId === 'home'))
                  .map((component, index) => {
                    const position = component.position || { x: 100, y: 100 };
                    const isLastComponent = index === localComponents.length - 1;

                    return (
                      <div
                        key={component.id}
                        data-component-id={component.id}
                        className="absolute transition-shadow duration-200"
                        style={{
                          left: `${position.x}px`,
                          top: `${position.y}px`,
                          width: component.style?.width || (typeof component.props?.width === 'number' ? `${component.props.width}px` : component.props?.width) || 'max-content',
                          height: component.style?.height || (typeof component.props?.height === 'number' ? `${component.props.height}px` : component.props?.height) || 'max-content',
                          pointerEvents: 'auto',
                          zIndex: 10,
                          minWidth: '100px', // Fallback
                          minHeight: '40px' // Fallback
                        }}
                        onClick={(e) => {
                          // Don't interfere with table interactions
                          if (component.type === 'table') {
                            return;
                          }

                          // Handle button clicks directly
                          if (component.type === 'button') {
                            handleButtonClick(e, component);
                          }
                          e.stopPropagation();
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                          }}
                        >
                          <RenderableComponent
                            key={`preview-${component.id}`}
                            component={component}
                            isSelected={false}
                            onUpdate={(updates) => handleUpdate(component.id, updates)}
                            onDelete={() => { }}
                            isPreview={true}
                            userProjectConfig={userProjectConfig}
                            navigate={handleNavigate}
                          />
                        </div>

                        {/* Interactive element overlay to ensure clicks are captured in preview */}
                        {(component.type === 'button') && (
                          <div
                            className="absolute inset-0 z-50 cursor-pointer"
                            style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}
                            onClick={(e) => {
                              console.log('Preview overlay clicked for component:', component.id);
                              e.preventDefault();
                              e.stopPropagation();
                              handleButtonClick(e, component);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div
        className={`absolute bottom-4 left-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        <div className="bg-black/80 backdrop-blur-sm text-white text-xs p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-2">
            <div><kbd className="bg-white/20 px-1 rounded">Esc</kbd> Close</div>
            <div><kbd className="bg-white/20 px-1 rounded">F</kbd> Fit to Screen</div>
            <div><kbd className="bg-white/20 px-1 rounded">1-3</kbd> Device Mode</div>
            <div><kbd className="bg-white/20 px-1 rounded">+/-</kbd> Zoom</div>
          </div>
        </div>
      </div>
    </div>
  );
}
