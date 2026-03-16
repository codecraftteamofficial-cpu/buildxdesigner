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
  supabaseFilters?: { column: string; operator: string; value: string }[];
  supabaseSelectColumns?: string;

  // For chaining actions
  onSuccessActionId?: string;
  onErrorActionId?: string;
  onSuccessUrl?: string;
  onErrorUrl?: string;

  // For conditional logic
  conditionCode?: string;
  trueActionId?: string;
  falseActionId?: string;
};

import { ComponentData } from '../App';
import { RenderableComponent } from './RenderableComponent';
import { scrollToTarget } from '../utils/scrollUtils';

// ─── Responsive scaling (NEW) ─────────────────────────────────────────────────
// Must match DESIGN_WIDTH in code-generator.ts
const DESIGN_WIDTH = 1920;

const DEVICE_LOGICAL_WIDTH: Record<string, number> = {
  desktop: DESIGN_WIDTH,
  tablet:  1024,
  mobile:  768,
};

/** Scale ratio for the given view mode (desktop = 1, no change). */
const getDeviceRatio = (viewMode: string): number =>
  (DEVICE_LOGICAL_WIDTH[viewMode] ?? DESIGN_WIDTH) / DESIGN_WIDTH;

/**
 * CSS-transform ratio for the given view mode.
 * We render the canvas at the full 1920px design width, then shrink it
 * with transform:scale so every component — including those with hard-coded
 * px widths inside ResizeHandle — scales uniformly without any data mutation.
 */
// (scaleComponentForDevice removed — we now use CSS transform on the canvas wrapper)
// ─────────────────────────────────────────────────────────────────────────────

interface PreviewModalProps {
  components: ComponentData[];
  onClose: () => void;
  activePageId?: string;
  pages?: { id: string; name: string; path: string }[];
  userProjectConfig?: {
    supabaseUrl: string;
    supabaseKey: string;
    resendApiKey?: string;
  };
  currentUser?: any;
  canvasBackgroundColor?: string;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';
type FitMode = 'fit' | 'fill' | 'actual';

export function PreviewModal({ components, onClose, activePageId = 'home', pages = [], userProjectConfig, currentUser, canvasBackgroundColor = '#ffffff' }: PreviewModalProps) {
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

      // Normalize path for comparison (ignore search parameters)
      const pathname = path.split('?')[0];
      const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

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
      case 'mobile':  return { width: 375,   height: 667,  name: 'mobile' };
      case 'tablet':  return { width: 768,   height: 1024, name: 'tablet' };
      case 'desktop':
      default:        return { width: '100%', height: '100%', name: 'desktop' };
    }
  };

  // Calculate the CSS transform:scale() value for the 1920px canvas wrapper.
  //
  // Desktop:  scale = containerWidth / 1920  → canvas always fills the preview area
  // Tablet:   scale = containerHeight * 0.9 / 1024  → device frame fills screen height
  // Mobile:   scale = containerHeight * 0.9 / 667   → same for phone
  // actual:   user-controlled zoom
  const calculateScale = useCallback(() => {
    if (fitMode === 'actual') return zoom;

    const container = document.querySelector('.preview-container') as HTMLElement;
    const containerW = container ? container.getBoundingClientRect().width  : window.innerWidth;
    const containerH = container ? container.getBoundingClientRect().height : window.innerHeight - 60;

    if (viewMode === 'desktop') {
      // Scale so the 1920px canvas exactly fills the container width
      return containerW / DESIGN_WIDTH;
    }

    // For tablet/mobile: fit the device frame (768×1024 or 375×667) into the container
    const FRAME_W = viewMode === 'mobile' ? 375  : 768;
    const FRAME_H = viewMode === 'mobile' ? 667  : 1024;
    const scaleByW = (containerW * 0.85) / FRAME_W;
    const scaleByH = (containerH * 0.85) / FRAME_H;
    return Math.min(scaleByW, scaleByH);
  }, [fitMode, viewMode, zoom]);

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

      const executeSinglePreviewAction = async (action: any): Promise<void> => {
        if (!action) return;

        const executeHandler = async () => {
          try {
            // Handle navigation actions
            if (action.handlerType === 'navigate' && action.url) {
              console.log('Executing navigation action:', action);
              const isInternal = action.url.startsWith('/') || action.url.startsWith('./');
              if (isInternal && (!action.target || action.target === '_self')) {
                handleNavigate(action.url);
              } else {
                window.open(action.url, action.target || '_blank');
              }
              return true;
            }

            // Handle copy to clipboard actions
            if (action.handlerType === 'copy' && action.textToCopy) {
              console.log('Executing copy action:', action);
              await navigator.clipboard.writeText(action.textToCopy || '');
              return true;
            }

            // Handle scroll to element actions
            if (action.handlerType === 'scroll' && action.selector) {
              console.log('Executing scroll action to:', action.selector);
              const root = contentRef.current || document;
              const success = await scrollToTarget(action.selector, 2000, root);
              return success;
            }

            // Handle toggle element actions
            if (action.handlerType === 'toggle' && action.selector) {
              console.log('Executing toggle action:', action);

              const selector = action.selector;
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
                  if (typeof action.toggleState === 'boolean') {
                    // Use the toggleState if provided
                    (element as HTMLElement).style.display = action.toggleState ? 'block' : 'none';
                  } else {
                    // Toggle based on current state
                    const currentDisplay = window.getComputedStyle(element as Element).display;
                    (element as HTMLElement).style.display = currentDisplay === 'none' ? 'block' : 'none';
                  }
                });
                console.log(`Toggled ${elements.length} element(s) with selector:`, action.selector);
                return true;
              } else {
                console.error('No elements found with selector:', action.selector);
                return false;
              }
            }

            // Handle custom scripts
            if (action.handlerType === 'custom' && action.handler) {
              console.log('Executing custom action:', action);
              const actionFn = new Function('event', 'props', `
                try {
                  ${action.handler}
                } catch (err) {
                  console.error('Error in custom action:', err);
                  return false;
                }
                return true;
              `);
              return actionFn(e, component.props);
            }

            // Handle Supabase actions
            if (action.handlerType === 'supabase' && action.supabaseTable) {
              console.log('Executing Supabase action:', action);
              const table = action.supabaseTable;
              const operation = action.supabaseOperation || 'insert';
              const dataMapping = action.supabaseData || {};

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
                    // Check if the static value is a JS expression like {currentUser.id}
                    if (typeof valAsString === 'string' && valAsString.startsWith('{') && valAsString.endsWith('}')) {
                      const expression = valAsString.substring(1, valAsString.length - 1);
                      try {
                        const evaluationFn = new Function('currentUser', 'window', `return ${expression}`);
                        recordData[col] = evaluationFn(currentUser, window);
                        console.log(`[Supabase Preview] Evaluated expression for column "${col}":`, recordData[col]);
                      } catch (err) {
                        console.error(`[Supabase Preview] Error evaluating expression "${expression}":`, err);
                        recordData[col] = valAsString;
                      }
                    } else {
                      recordData[col] = valAsString;
                      console.log(`[Supabase Preview] Mapped "${col}" to static/not-found value: "${valAsString}"`);
                    }
                  }
              });

              let client = supabase;
              if (action.supabaseUrl && action.supabaseKey) {
                client = createClient(action.supabaseUrl, action.supabaseKey);
              } else if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
              }

              let query: any = client.from(table);

              if (operation === 'insert') {
                query = query.insert(recordData).select();
              } else if (operation === 'select') {
                query = query.select(action.supabaseSelectColumns || '*');

                Object.entries(recordData).forEach(([key, value]) => {
                  if (value) {
                    query = query.eq(key, value);
                  }
                });
              } else if (operation === 'update') {
                if (!action.supabaseFilters || action.supabaseFilters.length === 0) {
                  if (recordData.id) {
                    const { id, ...updateData } = recordData;
                    query = query.update(updateData).eq('id', id).select();
                  } else {
                    throw new Error('Update requires an "id" type field inside mapping data.');
                  }
                } else {
                  query = query.update(recordData).select();
                }
              } else if (operation === 'delete') {
                if (!action.supabaseFilters || action.supabaseFilters.length === 0) {
                  if (recordData.id) {
                    query = query.delete().eq('id', recordData.id).select();
                  } else {
                    throw new Error('Delete requires an "id" type field internally.');
                  }
                } else {
                  query = query.delete().select();
                }
              }

              if (operation !== 'insert' && action.supabaseFilters && action.supabaseFilters.length > 0) {
                action.supabaseFilters.forEach((filter: any) => {
                  if (!filter.column || !filter.value) return;

                  let filterValue = filter.value;
                  const cleanId = filterValue.startsWith('#') ? filterValue.substring(1) : filterValue;

                  let refElement: any = null;
                  const allElements = document.querySelectorAll(`[id="${cleanId}"]`);

                  if (allElements.length > 0) {
                    const previewElement = Array.from(allElements).find(el => el.closest('.preview-container'));
                    if (previewElement) {
                      refElement = previewElement;
                    } else {
                      refElement = allElements[allElements.length - 1]; // Fallback
                    }
                  }

                  if (refElement && ('value' in refElement)) {
                    filterValue = refElement.value;
                  } else if (refElement) {
                    filterValue = refElement.innerText;
                  }

                  switch (filter.operator) {
                    case 'eq': query = query.eq(filter.column, filterValue); break;
                    case 'neq': query = query.neq(filter.column, filterValue); break;
                    case 'gt': query = query.gt(filter.column, filterValue); break;
                    case 'gte': query = query.gte(filter.column, filterValue); break;
                    case 'lt': query = query.lt(filter.column, filterValue); break;
                    case 'lte': query = query.lte(filter.column, filterValue); break;
                    case 'like': query = query.like(filter.column, filterValue); break;
                    case 'ilike': query = query.ilike(filter.column, filterValue); break;
                    default: query = query.eq(filter.column, filterValue); break;
                  }
                });
              }

              console.log(`[Supabase Preview] Executing ${operation} on "${table}"`);
              const result = await query;

              if (operation === 'select') {
                console.log('[Supabase Preview] Select Result:', result.data);
                (window as any).supabaseData = result.data;

                if (result.data) {
                  toast.success('Select Query Successful', {
                    description: `Found ${result.data.length} records. Check console for details.`
                  });
                  console.log('First 3 records:', result.data.slice(0, 3));
                }
              }

              if (result && result.error) throw result.error;

              if (result) {
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

              return true;
            }

            // Handle alert actions
            if (action.handlerType as string === 'showAlert' && action.alertSelector) {
              console.log('Executing showAlert action for:', action.alertSelector);
              const elementId = action.alertSelector.startsWith('#') 
                ? action.alertSelector.substring(1) 
                : action.alertSelector;

              window.dispatchEvent(new CustomEvent('showAlertRequested', {
                detail: { elementId }
              }));
              return true;
            }

            // Handle condition blocks
            if (action.handlerType === 'condition' && action.conditionCode) {
              console.log('Evaluating Condition Action...');
              const conditionFn = new Function('event', 'props', `
                  try {
                     ${action.conditionCode}
                  } catch (err) {
                     console.error('Condition Evaluation Error:', err);
                     return false;
                  }
               `);

              const isTrue = conditionFn(e, component.props);
              console.log(`Condition Evaluated: ${isTrue}`);

              if (isTrue && action.trueActionId && action.trueActionId !== 'none') {
                const trueAction = onClickActions.find((a: any) => a.id === action.trueActionId);
                if (trueAction) await executeSinglePreviewAction(trueAction);
              } else if (!isTrue && action.falseActionId && action.falseActionId !== 'none') {
                const falseAction = onClickActions.find((a: any) => a.id === action.falseActionId);
                if (falseAction) await executeSinglePreviewAction(falseAction);
              }
              return true;
            }

            return false;
          } catch (error: any) {
            console.error('Error executing preview action:', error);
            toast.error("Action Execution Failed", {
              description: error.message || "An error occurred while running the action."
            });
            return false;
          }
        };

        const success = await executeHandler();

        // Execute chains
        if (success) {
          if (action.onSuccessUrl && action.onSuccessUrl !== 'none') {
            console.log('Chaining success navigation to:', action.onSuccessUrl);
            handleNavigate(action.onSuccessUrl);
          } else if (action.onSuccessActionId && action.onSuccessActionId !== 'none') {
            const nextAction = onClickActions.find((a: any) => a.id === action.onSuccessActionId);
            if (nextAction && nextAction.id !== action.id) {
              await executeSinglePreviewAction(nextAction);
            }
          }
        } else {
          if (action.onErrorUrl && action.onErrorUrl !== 'none') {
            console.log('Chaining error navigation to:', action.onErrorUrl);
            handleNavigate(action.onErrorUrl);
          } else if (action.onErrorActionId && action.onErrorActionId !== 'none') {
            const errAction = onClickActions.find((a: any) => a.id === action.onErrorActionId);
            if (errAction && errAction.id !== action.id) {
              await executeSinglePreviewAction(errAction);
            }
          }
        }
      };

      const chainedActionIds = new Set<string>();
      onClickActions.forEach((a: any) => {
        if (a.onSuccessActionId && a.onSuccessActionId !== 'none') chainedActionIds.add(a.onSuccessActionId);
        if (a.onErrorActionId && a.onErrorActionId !== 'none') chainedActionIds.add(a.onErrorActionId);
        if (a.trueActionId && a.trueActionId !== 'none') chainedActionIds.add(a.trueActionId);
        if (a.falseActionId && a.falseActionId !== 'none') chainedActionIds.add(a.falseActionId);
      });

      const rootActions = onClickActions.filter((a: any) => !chainedActionIds.has(a.id));

      rootActions.forEach((rootAction: any) => {
        executeSinglePreviewAction(rootAction);
      });
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
    if (viewMode === 'desktop') {
      // Desktop: canvas is scaled to fill container width; outer frame just wraps it
      return {
        width:    '100%' as const,
        height:   '100%' as const,
        position: 'relative' as const,
        overflow: 'hidden' as const,
        backgroundColor: 'white',
      };
    }
    // Tablet/Mobile: the visible frame = device px × scale (so it fills the screen nicely)
    const FRAME_W = viewMode === 'mobile' ? 375  : 768;
    const FRAME_H = viewMode === 'mobile' ? 667  : 1024;
    return {
      width:    `${Math.round(FRAME_W * scale)}px`,
      height:   `${Math.round(FRAME_H * scale)}px`,
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

  // ── Filter + CSS-transform responsive scaling (NEW) ─────────────────────────
  // We render all components at their original 1920px canvas coordinates, then
  // shrink the entire canvas wrapper with CSS transform:scale(ratio).
  // This means ResizeHandle / internal px sizes all scale uniformly with zero
  // data mutation — identical to how browser DevTools responsive mode works.
  const filteredComponents = localComponents.filter(c => {
    // Mirrors Canvas.tsx filter exactly — falsy page_id treated as 'home'
    if (c.page_id === 'all') return true;
    const compPageId = c.page_id || 'home';
    const activeId   = localActivePageId || 'home';
    return compPageId === activeId;
  });

  // Safe canvas height at full 1920px, then CSS scale brings it to device size
  const fullCanvasHeight = filteredComponents.length > 0
    ? Math.max(
        ...filteredComponents.map(c =>
          (c.position?.y || 0) + (parseInt(String(c.style?.height || 0)) || 100)
        ),
        800
      )
    : 800;
  // ──────────────────────────────────────────────────────────────────────────

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
          className={`shadow-2xl overflow-hidden ${viewMode === 'mobile' ? 'rounded-4xl' :
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

          {/* Content — scrollable viewport at device logical size */}
          {/* Outer scroll container: sized to POST-scale dimensions so scrollbar matches visible content */}
          <div
            ref={contentRef}
            style={{
              width:    '100%',
              height:   '100%',
              overflow: 'auto',
              position: 'relative',
              background: canvasBackgroundColor || '#ffffff',
            }}
          >
            {filteredComponents.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-xl font-medium mb-2">No Components</h3>
                  <p>Add some components to see your design in preview</p>
                </div>
              </div>
            ) : (
              /* Clip wrapper: exactly the post-scale size so overflow is hidden correctly */
              <div style={{
                width:    `${Math.round(DESIGN_WIDTH * scale)}px`,
                height:   `${Math.round(fullCanvasHeight * scale)}px`,
                overflow: 'hidden',
                position: 'relative',
              }}>
              {/* Canvas at full 1920px, shrunk by transform:scale — uniform scaling */}
              <div
                ref={previewRef}
                style={{
                  width:           `${DESIGN_WIDTH}px`,
                  height:          `${fullCanvasHeight}px`,
                  transform:       `scale(${scale})`,
                  transformOrigin: 'top left',
                  position:        'relative',
                }}
              >
                {/* filteredComponents rendered at original 1920px coords (NEW) */}
                {filteredComponents.map((component, index) => {
                    const position = component.position || { x: 100, y: 100 };
                    const isLastComponent = index === filteredComponents.length - 1;

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
                            currentUser={currentUser}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>  {/* end transform:scale canvas */}
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