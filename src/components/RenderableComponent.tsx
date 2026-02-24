import React, { MouseEvent } from 'react';
import { ComponentData } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Trash2, Edit, Upload } from 'lucide-react';
import { ResizeHandle } from './ResizeHandle';
import { EditableText } from './EditableText';
import { PayMongoButton } from './PayMongoButton';
import { supabase } from '../supabase/config/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import $ from 'jquery';
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { formatUrl } from '../utils/urlUtils';


type ActionType = 'onClick' | 'onHover' | 'onFocus' | 'onBlur';
type ActionHandlerType = 'custom' | 'navigate' | 'scroll' | 'copy' | 'toggle' | 'supabase';

interface Action {
  id: string;
  type: ActionType;
  handlerType: ActionHandlerType;
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
}

interface CardProps {
  title?: string;
  description?: string;
  buttonText?: string;
  image?: string | null;
  className?: string;
  [key: string]: any;
}

import { useDrag, useDrop } from 'react-dnd';

interface DraggableGridItemProps {
  id: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
  isPreview?: boolean;
}

const DraggableGridItem = ({ id, index, moveItem, children, isPreview }: DraggableGridItemProps) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'grid-item',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: any, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();

      const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveItem(dragIndex, hoverIndex);

      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'grid-item',
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isPreview,
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isPreview ? 'default' : 'move',
        width: '100%',
        height: '100%'
      }}
      data-handler-id={handlerId}
    >
      {children}
    </div>
  );
};

interface RenderableComponentProps {
  component: ComponentData;
  projectId?: string;
  isSelected?: boolean;
  onUpdate: (updates: Partial<ComponentData>) => void;
  onDelete: () => void;
  disabled?: boolean;
  isPreview?: boolean;
  editingComponentId?: string | null;
  onEditComponent?: (id: string | null) => void;
  userProjectConfig?: {
    supabaseUrl: string;
    supabaseKey: string;
  };
  navigate?: (path: string) => void;
}

export function RenderableComponent({
  component,
  projectId,
  isSelected,
  onUpdate,
  onDelete,
  disabled = false,
  isPreview = false,
  editingComponentId,
  onEditComponent,
  userProjectConfig,
  navigate
}: RenderableComponentProps) {
  const { type, props, style } = component;
  const combinedStyle = { ...style } as React.CSSProperties;

  const [editingRow, setEditingRow] = React.useState<Record<string, any> | null>(null);
  const [deletingRow, setDeletingRow] = React.useState<Record<string, any> | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  const [tableData, setTableData] = React.useState(props?.data || []);
  const [tableHeaders, setTableHeaders] = React.useState(props?.headers || []);
  const tableRef = React.useRef<HTMLTableElement>(null);
  const dataTableInstance = React.useRef<any>(null);

  React.useEffect(() => {
    if (type === 'table') {
      setTableData(props.data || []);
    }
  }, [props.data, type]);

  React.useEffect(() => {
    if (type === 'table') {
      setTableHeaders(props.headers || []);
    }
  }, [props.headers, type]);

  React.useEffect(() => {
    if (type === 'table' && props.supabaseTable) {
      const handleData = (data: any[]) => {
        if (data && data.length > 0) {
          setTableData(data);

          // If the user hasn't defined any headers yet, auto-detect them
          if (!props.headers || props.headers.length === 0) {
            const autoHeaders = Object.keys(data[0]);
            setTableHeaders(autoHeaders);

            // Sync back to props
            onUpdate({ props: { ...props, data, headers: autoHeaders } });
          } else {
            // Respect the user's defined headers from props
            setTableHeaders(props.headers);

            // Only update data in props if it changed
            if (JSON.stringify(props.data) !== JSON.stringify(data)) {
              onUpdate({ props: { ...props, data } });
            }
          }
        } else {
          setTableData([]);
          setTableHeaders([]);
        }
      };

      const fetchTableData = async () => {
        try {
          const ascending = props.fetchOrder === 'asc';

          let client = supabase;
          if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
            client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
          }

          const tableName = props.supabaseTable.replace(/^public\./, '');
          const { data, error } = await client
            .from(tableName)
            .select('*')
            .order('created_at', { ascending });

          if (error) {
            console.warn("Error with ordered fetch, retrying without order:", error.message);
            const { data: retryData, error: retryError } = await client
              .from(tableName)
              .select('*');
            if (!retryError) handleData(retryData);
          } else {
            handleData(data);
          }
        } catch (err) {
          console.error("Exception fetching table data:", err);
        }
      };

      fetchTableData();

      const handleRefresh = (event: any) => {
        if (event && event.detail && event.detail.table === props.supabaseTable) {
          fetchTableData();
        }
      };

      window.addEventListener('supabase-data-update' as any, handleRefresh);
      return () => window.removeEventListener('supabase-data-update' as any, handleRefresh);
    }
  }, [type, props.supabaseTable, props.fetchOrder, userProjectConfig]);

  React.useEffect(() => {
    // ONLY initialize DataTables in PREVIEW mode to avoid errors during editing in the canvas
    if (isPreview && type === 'table' && tableRef.current && tableData.length > 0 && tableHeaders.length > 0) {
      const timer = setTimeout(() => {
        try {
          // 1. Destroy existing instance if it exists
          if (dataTableInstance.current) {
            try {
              // Use destroy() without removing from DOM to let React manage the HTML
              dataTableInstance.current.destroy();
              dataTableInstance.current = null;
            } catch (e) {
              console.warn('DataTable destroy error:', e);
            }
          }

          // 2. Initialize new instance
          // We use a small timeout to let React finish updating the DOM structure
          // with the new headers/rows before DataTables scrapes it.

          if (tableRef.current) {
            // We re-verify the columns exist in the DOM before initializing
            const headerCount = $(tableRef.current).find('thead th').length;
            const firstRowColumnCount = $(tableRef.current).find('tbody tr:first td').length;

            if (headerCount > 0 && (tableData.length === 0 || headerCount === firstRowColumnCount)) {
              dataTableInstance.current = ($(tableRef.current) as any).DataTable({
                paging: true,
                searching: true,
                ordering: true,
                info: true,
                responsive: true,
                pageLength: 10,
                lengthMenu: [[5, 10, 25, 50, 100, -1], [5, 10, 25, 50, 100, "All"]],
                lengthChange: true,
                autoWidth: false,
                language: {
                  search: "Search:",
                  lengthMenu: "Show _MENU_ entries",
                  info: "Showing _START_ to _END_ of _TOTAL_ entries",
                  infoEmpty: "Showing 0 to 0 of 0 entries",
                  infoFiltered: "(filtered from _MAX_ total entries)",
                  paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                  },
                  emptyTable: "No data available in table"
                },
                dom: '<"flex flex-col sm:flex-row justify-between items-center mb-4 gap-2"lf>rt<"flex flex-col sm:flex-row justify-between items-center mt-4 gap-2"ip>',
                destroy: true
              });
            } else {
              console.warn('Post-render column mismatch detected. Skipping DataTable init to prevent crash.');
            }
          }
        } catch (error) {
          console.error("Error initializing DataTable:", error);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (dataTableInstance.current) {
          try {
            dataTableInstance.current.destroy();
            dataTableInstance.current = null;
          } catch (error) {
            // Silently fail if already destroyed
          }
        }
      };
    }
  }, [type, tableData, tableHeaders, isPreview]);

  const [{ isOver }, drop] = useDrop({
    accept: 'component',
    canDrop: () => component.type === 'grid' && !isPreview,
    drop: (item: any, monitor) => {
      if (monitor.didDrop()) return;

      const newChild: ComponentData = {
        id: Date.now().toString(),
        type: item.type,
        props: item.props || {},
        style: item.style || {},
        position: { x: 0, y: 0 }
      };

      const currentChildren = component.children || [];
      onUpdate({ children: [...currentChildren, newChild] });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });
  const handleResize = (width: number, height: number) => {
    onUpdate({
      style: {
        ...component.style,
        width: `${width}px`,
        height: `${height}px`
      }
    });
  };

  const parseSize = (size: string | number | undefined, defaultValue: number): number => {
    if (typeof size === 'number') return size;
    if (typeof size === 'string') {
      const parsed = parseInt(size.replace('px', ''));
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  };

  const executeActions = (actions: Action[], event: React.SyntheticEvent) => {
    const componentProps = component.props || {};
    console.log('executeActions called with actions:', actions);
    console.log('isPreview:', isPreview);

    // In preview mode, we want to execute the actions
    if (isPreview) {
      console.log('Executing actions in preview mode');

      // Prevent default for form submissions
      if (event && 'preventDefault' in event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Check for scroll actions first
      const scrollAction = actions.find(action => action.handlerType === 'scroll' && action.selector);
      if (scrollAction && scrollAction.selector) {
        // Remove any leading # from the selector
        const elementId = scrollAction.selector.startsWith('#')
          ? scrollAction.selector.substring(1)
          : scrollAction.selector;

        // Dispatch a custom event that the parent component can listen for
        const scrollEvent = new CustomEvent('scrollToElement', {
          detail: { elementId }
        });
        window.dispatchEvent(scrollEvent);
        return; // Don't process other actions if we found a scroll action
      }

      actions.forEach((action: Action) => {
        console.log('Processing action:', action);

        // Execute the handler based on its type
        const executeHandler = () => {
          try {
            // Handle scroll action specifically
            if (action.handlerType === 'scroll' && action.selector) {
              console.log('Executing scroll action to:', action.selector);

              // Create a simple scroll function that we'll execute in the context of the iframe
              const scrollScript = `
                try {
                  // First try to find the element by ID (with or without #)
                  let selector = '${action.selector.replace(/'/g, "\\'")}';
                  let element = document.getElementById(selector) || 
                               document.querySelector('#' + selector) ||
                               document.querySelector('[data-component-id="' + selector + '"]') ||
                               document.querySelector(selector);
                  
                  // If still not found, try to find by any selector
                  if (!element) {
                    element = document.querySelector(selector);
                  }
                  
                  if (element) {
                    console.log('Found element for scrolling:', element);
                    element.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                    return true;
                  } else {
                    console.error('Element not found with selector:', selector);
                    return false;
                  }
                } catch (error) {
                  console.error('Error in scroll handler:', error);
                  return false;
                }
              `;

              // Execute the script in the context of the iframe
              try {
                // Get the iframe element
                const iframe = document.querySelector('iframe');
                if (iframe && iframe.contentWindow) {
                  // Execute the script in the iframe's context
                  iframe.contentWindow.postMessage({
                    type: 'EXECUTE_SCRIPT',
                    script: `(${scrollScript})()`
                  }, '*');
                  return true;
                } else {
                  // Fallback to direct execution if iframe not found
                  const script = document.createElement('script');
                  script.text = `(${scrollScript})();`;
                  document.body.appendChild(script).remove();
                  return true;
                }
              } catch (error) {
                console.error('Error executing scroll script:', error);
                return false;
              }
            }

            // Handle toggle action
            if (action.handlerType === 'toggle' && action.selector) {
              console.log('Executing toggle action on:', action.selector);

              // Create a simple toggle function that we'll execute in the context of the iframe
              const toggleScript = `
                try {
                  const selector = '${action.selector.replace(/'/g, "\\'")}';
                  // Try to find by ID (with or without #), class, or data attributes
                  let elements = document.querySelectorAll(selector);
                  if (elements.length === 0 && !selector.startsWith('#') && !selector.startsWith('.')) {
                    elements = document.querySelectorAll('#' + selector);
                  }
                  if (elements.length === 0) {
                     // Try data-component-id
                     elements = document.querySelectorAll('[data-component-id="' + selector + '"]');
                  }
                  
                  if (elements.length > 0) {
                    elements.forEach(element => {
                      if (${typeof action.toggleState === 'boolean' ? 'true' : 'false'}) {
                        // Use the toggleState if provided
                        element.style.display = ${action.toggleState ? '"block"' : '"none"'};
                      } else {
                        // Toggle based on current state
                        const currentDisplay = window.getComputedStyle(element).display;
                        element.style.display = currentDisplay === 'none' ? 'block' : 'none';
                      }
                    });
                    console.log('Toggled ' + elements.length + ' element(s) with selector:', selector);
                    return true;
                  } else {
                    console.error('No elements found with selector:', selector);
                    return false;
                  }
                } catch (error) {
                  console.error('Error in toggle handler:', error);
                  return false;
                }
              `;

              // Execute the script in the context of the iframe
              try {
                // Get the iframe element
                const iframe = document.querySelector('iframe');
                if (iframe && iframe.contentWindow) {
                  // Execute the script in the iframe's context
                  iframe.contentWindow.postMessage({
                    type: 'EXECUTE_SCRIPT',
                    script: `(${toggleScript})()`
                  }, '*');
                  return true;
                } else {
                  // Fallback to direct execution if iframe not found
                  const script = document.createElement('script');
                  script.text = `(${toggleScript})();`;
                  document.body.appendChild(script).remove();
                  return true;
                }
              } catch (error) {
                console.error('Error executing toggle script:', error);
                return false;
              }
            }

            // Handle navigation
            if (action.handlerType === 'navigate' && action.url) {
              const absoluteUrl = formatUrl(action.url);
              console.log(`Executing navigate action to: ${action.url} -> ${absoluteUrl}`);

              const isInternal = action.url.startsWith('/') || action.url.startsWith('./');

              if (isInternal && navigate && (!action.target || action.target === '_self')) {
                console.log(`Using internal navigate for ${action.url}`);
                navigate(action.url);
              } else {
                // For navigation, we can use the parent window directly
                window.open(absoluteUrl, action.target || '_blank');
              }
              return true;
            }

            // Handle copy to clipboard
            if (action.handlerType === 'copy' && action.textToCopy) {
              console.log('Executing copy action with text:', action.textToCopy);
              navigator.clipboard.writeText(action.textToCopy)
                .then(() => console.log('Text copied to clipboard'))
                .catch(err => console.error('Failed to copy text: ', err));
              return true;
            }

            // Handle Supabase actions
            if (action.handlerType === 'supabase' && action.supabaseTable) {
              console.log('Executing Supabase action:', action);
              const table = action.supabaseTable.replace(/^public\./, '');
              const operation = action.supabaseOperation || 'insert';
              const dataMapping = action.supabaseData || {};

              const recordData: Record<string, any> = {};

              Object.entries(dataMapping).forEach(([rawCol, valOrId]) => {
                const col = rawCol.trim();
                if (!col) return;

                const cleanId = valOrId.startsWith('#') ? valOrId.substring(1) : valOrId;
                let element = document.getElementById(cleanId) as any;

                if (isPreview) {
                  const allElements = document.querySelectorAll(`[id="${cleanId}"]`);
                  if (allElements.length > 1) {
                    const previewElement = Array.from(allElements).find(el => el.closest('.preview-container'));
                    if (previewElement) {
                      element = previewElement;
                    } else {
                      element = allElements[allElements.length - 1];
                    }
                  }
                }

                if (element && ('value' in element)) {
                  recordData[col] = element.value;
                  console.log(`[Supabase] Mapped column "${col}" to input value: "${element.value}" (Element ID: ${cleanId})`);
                } else if (element) {
                  recordData[col] = element.innerText;
                  console.log(`[Supabase] Mapped column "${col}" to text content: "${element.innerText}"`);
                } else {
                  recordData[col] = valOrId;
                  console.log(`[Supabase] Mapped column "${col}" to static value: "${valOrId}" (Element not found)`);
                }
              });

              (async () => {
                try {
                  console.log(`[Supabase] Executing ${operation} on table "${table}"`);
                  console.log(`[Supabase] Payload:`, recordData);

                  let client = supabase;
                  if (action.supabaseUrl && action.supabaseKey) {
                    console.log('Using custom Supabase client from action config:', action.supabaseUrl);
                    client = createClient(action.supabaseUrl, action.supabaseKey);
                  } else if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                    console.log('Using global user project config for Supabase');
                    client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
                  } else {
                    console.log('Using default Supabase client');
                  }

                  let result;

                  if (operation === 'insert') {
                    result = await client.from(table).insert(recordData);
                  } else if (operation === 'select') {
                    result = await client.from(table).select('*');
                    console.log('Supabase Select Result:', result.data);
                  } else if (operation === 'update') {
                    if (recordData.id) {
                      const { id, ...updateData } = recordData;
                      result = await client.from(table).update(updateData).eq('id', id);
                    } else {
                      console.warn('Update operation requires an "id" column in the data mapping');
                      toast.error('Update Failed', {
                        description: 'Update requires an "id" column in the data mapping'
                      });
                      return;
                    }
                  } else if (operation === 'delete') {
                    if (recordData.id) {
                      result = await client.from(table).delete().eq('id', recordData.id);
                    } else {
                      console.warn('Delete operation requires an "id" column in the data mapping');
                      toast.error('Delete Failed', {
                        description: 'Delete requires an "id" column in the data mapping'
                      });
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
                      window.dispatchEvent(new CustomEvent('supabase-data-update', {
                        detail: { table, operation }
                      }));
                    }
                  }
                } catch (err) {
                  console.error("Supabase Exception:", err);
                  toast.error('Unexpected Error', {
                    description: 'An unexpected error occurred. Check console for details.'
                  });
                }
              })();

              return true;
            }

            // For other action types, execute the generated handler
            if (action.handler && action.handlerType !== 'supabase') {
              console.log('Executing custom handler:', action.handlerType);
              try {
                // Execute the handler directly since it's already JavaScript code
                const handlerFn = new Function('event', 'props', `
                  try {
                    ${action.handler}
                  } catch (error) {
                    console.error('Error in action handler:', error);
                  }
                  return true;
                `);
                return handlerFn(event, componentProps);
              } catch (error: any) {
                console.error('Error executing action handler:', error);
                if (isPreview) {
                  toast.error("Custom Script Error", {
                    description: error.message
                  });
                }
                return false;
              }
            }

            return false;
          } catch (error: any) {
            console.error('Error executing action:', error);
            // Show toast error in preview mode so user knows something failed
            if (isPreview) {
              toast.error("Action Execution Failed", {
                description: error.message || "An error occurred while running the action."
              });
            }
            return false;
          }
        };

        // Execute the handler
        if (action.type === 'onClick') {
          // For click events, prevent default behavior
          if (event && 'preventDefault' in event) {
            event.stopPropagation();
          }

          // Execute immediately
          executeHandler();
        } else {
          // For other event types, execute immediately
          executeHandler();
        }
      });
    } else {
      console.log('Not in preview mode, skipping action execution');
    }
  };

  const renderComponent = () => {
    const { type, props, style } = component;
    const combinedStyle = { ...style } as React.CSSProperties;

    switch (type) {
      case 'text':
        const textWidth = parseSize(style?.width, 200);
        const textHeight = parseSize(style?.height, 50);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={textWidth}
            initialHeight={textHeight}
            className="group inline-block"
            minWidth={50}
            minHeight={20}
            disabled={isPreview}
          >

            <EditableText
              id={props.elementId}
              text={props.content}
              onTextChange={(newText) => onUpdate({ props: { ...props, content: newText } })}
              element="p"
              style={{ ...combinedStyle, width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}
              className={props.className || ''}
              placeholder="Sample Text"
              isSelected={isSelected}
              disabled={disabled || isPreview}
              isEditing={editingComponentId === component.id}

              onToggleEditing={(val) => onEditComponent?.(val ? component.id : null)}
            />
          </ResizeHandle>
        );

      case 'heading':
        const headingLevel = props.level || 1;
        const HeadingElement = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        const headingWidth = parseSize(style?.width, 300);
        const headingHeight = parseSize(style?.height, 60);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={headingWidth}
            initialHeight={headingHeight}
            className="group inline-block"
            minWidth={100}
            minHeight={30}
            disabled={isPreview}
          >

            <EditableText
              id={props.elementId}
              text={props.content}
              onTextChange={(newText) => onUpdate({ props: { ...props, content: newText } })}
              element={HeadingElement}
              style={{ ...combinedStyle, width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}
              className={props.className || ''}
              placeholder="Heading"
              isSelected={isSelected}
              disabled={disabled || isPreview}
              isEditing={editingComponentId === component.id}
              onToggleEditing={(val) => onEditComponent?.(val ? component.id : null)}
            />
          </ResizeHandle>
        );

      case 'button':
        const buttonWidth = parseSize(style?.width, 120);
        const buttonHeight = parseSize(style?.height, 40);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={buttonWidth}
            initialHeight={buttonHeight}
            className="group inline-block"
            minWidth={60}
            minHeight={30}
            disabled={isPreview}
          >
            <Button
              id={props.elementId}
              variant={props.variant || 'default'}
              size={props.size || 'default'}
              disabled={disabled}
              style={{
                ...combinedStyle,
                width: '100%',
                height: '100%',
                pointerEvents: isPreview ? 'auto' : (isSelected ? 'none' : 'auto'),
                zIndex: isPreview ? 20 : 'auto'
              }}
              className={`${props.className || ''} ${isSelected ? 'relative' : ''}`}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                console.log('Button clicked in preview mode:', isPreview);
                console.log('Button props:', props);

                e.preventDefault();
                e.stopPropagation();

                if (!isPreview && isSelected) {
                  console.log('In edit mode and selected, preventing action execution');
                  return;
                }

                // Handle onClick actions
                const onClickActions = ((props.actions as Action[]) || []).filter((a: Action) => a.type === 'onClick');
                console.log('Filtered onClick actions:', onClickActions);

                // Handle navigation actions immediately
                const navigateAction = onClickActions.find(a => a.handlerType === 'navigate');
                if (navigateAction && navigateAction.url) {
                  const absoluteUrl = formatUrl(navigateAction.url);
                  console.log(`Executing navigation action: ${navigateAction.url} -> ${absoluteUrl}`);
                  window.open(absoluteUrl, navigateAction.target || '_blank');
                  return;
                }

                // Handle copy to clipboard actions
                const copyAction = onClickActions.find(a => a.handlerType === 'copy' && a.textToCopy);
                if (copyAction) {
                  console.log('Executing copy action:', copyAction);
                  navigator.clipboard.writeText(copyAction.textToCopy || '').then(() => {
                    console.log('Text copied to clipboard');
                  }).catch(err => {
                    console.error('Failed to copy text:', err);
                  });
                  return;
                }

                // Handle scroll actions
                const scrollAction = onClickActions.find(a => a.handlerType === 'scroll' && a.selector);
                if (scrollAction?.selector) {
                  console.log('Executing scroll action via event:', scrollAction);

                  const elementId = scrollAction.selector.startsWith('#')
                    ? scrollAction.selector.substring(1)
                    : scrollAction.selector;

                  const scrollEvent = new CustomEvent('scrollToElement', {
                    detail: { elementId }
                  });
                  window.dispatchEvent(scrollEvent);
                  return;
                }

                // Handle toggle actions
                const toggleAction = onClickActions.find(a => a.handlerType === 'toggle' && a.selector);
                if (toggleAction?.selector) {
                  console.log('Executing toggle action:', toggleAction);
                  try {
                    if (toggleAction.handler) {
                      const handlerFn = new Function('event', 'props', toggleAction.handler);
                      handlerFn(e, props);
                      return;
                    }

                    const selector = toggleAction.selector;
                    const cleanId = selector.startsWith('#') ? selector.substring(1) : selector;
                    const cleanSelector = selector.replace(/'/g, "\\'");

                    let elements = document.querySelectorAll(selector);

                    if (elements.length === 0) {
                      elements = document.querySelectorAll(`[id="${cleanId}"], [data-component-id="${cleanId}"]`);
                      if (elements.length === 0 && !selector.startsWith('#') && !selector.startsWith('.')) {
                        elements = document.querySelectorAll(`#${cleanSelector}`);
                      }
                    }

                    elements.forEach(el => {
                      if (el instanceof HTMLElement) {
                        el.style.display = el.style.display === 'none' ? '' : 'none';
                      }
                    });
                  } catch (err) {
                    console.error('Error toggling element:', err);
                  }
                  return;
                }

                if (onClickActions.length > 0) {
                  console.log('Executing custom actions');
                  executeActions(onClickActions, e);
                } else {
                  console.log('No onClick actions found or no valid action handlers');
                }
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!isPreview && isSelected) return;
                const hoverActions = ((props.actions as Action[]) || []).filter((a: Action) => a.type === 'onHover');
                executeActions(hoverActions, e);
              }}
              onFocus={(e: React.FocusEvent<HTMLButtonElement>) => {
                if (!isPreview && isSelected) return;
                const focusActions = ((props.actions as Action[]) || []).filter((a: Action) => a.type === 'onFocus');
                executeActions(focusActions, e);
              }}
              onBlur={(e: React.FocusEvent<HTMLButtonElement>) => {
                if (!isPreview && isSelected) return;
                const blurActions = ((props.actions as Action[]) || []).filter((a: Action) => a.type === 'onBlur');
                executeActions(blurActions, e);
              }}
            >
              <EditableText
                text={props.text}
                onTextChange={(newText) => onUpdate({ props: { ...props, text: newText } })}
                element="span"
                placeholder="Button"
                isSelected={isSelected}
                disabled={disabled || isPreview}
                isEditing={editingComponentId === component.id}
                onToggleEditing={(val) => onEditComponent?.(val ? component.id : null)}
              />
            </Button>
          </ResizeHandle>
        );

      case 'paymongo-button':
        const pmWidth = parseSize(style?.width, 160);
        const pmHeight = parseSize(style?.height, 40);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={pmWidth}
            initialHeight={pmHeight}
            className="group inline-block"
            minWidth={100}
            minHeight={30}
            disabled={isPreview}
          >
            <PayMongoButton
              projectId={projectId}
              label={props.label || "Buy Now"}
              amount={props.amount || 100}
              description={props.description || "Product Purchase"}
              currency={props.currency || "PHP"}
              paymentMethodTypes={props.paymentMethodTypes}
              className={props.className || ''}
              style={{
                ...combinedStyle,
                width: '100%',
                height: '100%',
                pointerEvents: isPreview ? 'auto' : (isSelected ? 'none' : 'auto'),
                zIndex: isPreview ? 20 : 'auto'
              }}
              disabled={disabled}
              isPreview={isPreview}
            />
          </ResizeHandle>
        );

      case 'table':
        const tableWidth = parseSize(style?.width, 600);
        const tableHeight = parseSize(style?.height, 400);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={tableWidth}
            initialHeight={tableHeight}
            className="group inline-block"
            minWidth={200}
            minHeight={100}
            disabled={isPreview}
          >
            <Card
              className="w-full h-full overflow-hidden flex flex-col"
              style={{ ...combinedStyle }}
            >
              <CardHeader
                className="py-3 px-4 border-b shrink-0"
                style={{
                  backgroundColor: combinedStyle.backgroundColor || '#f8fafc',
                  borderColor: combinedStyle.borderColor || '#e2e8f0'
                }}
              >
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <EditableText
                    text={props.tableName || 'Data Table'}
                    onTextChange={(newText) => onUpdate({ props: { ...props, tableName: newText } })}
                    element="span"
                    isSelected={isSelected}
                    disabled={disabled || isPreview}
                    isEditing={editingComponentId === component.id && !isPreview}
                    onToggleEditing={(val) => onEditComponent?.(val ? component.id : null)}
                  />
                  {props.supabaseTable && (
                    <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                      Source: {props.supabaseTable}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent
                className="p-4 flex-1 overflow-auto"
                style={{
                  pointerEvents: isPreview ? 'auto' : undefined,
                  backgroundColor: combinedStyle.backgroundColor || '#ffffff',
                  color: combinedStyle.color
                }}
              >
                <div
                  key={isPreview ? `table-wrapper-${component.id}-${tableHeaders.length}-${tableData.length}` : `table-wrapper-${component.id}`}
                  className="w-full"
                  style={{ pointerEvents: isPreview ? 'auto' : undefined }}
                >
                  <table
                    ref={tableRef}
                    className="display min-w-full cell-border stripe hover"
                  >
                    <thead>
                      <tr>
                        {(tableHeaders || []).map((header: string, idx: number) => (
                          <th
                            key={`${header}-${idx}`}
                            className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                            style={{
                              color: combinedStyle.color || '#6b7280',
                              fontFamily: combinedStyle.fontFamily,
                              fontSize: combinedStyle.fontSize,
                              fontWeight: combinedStyle.fontWeight || 500
                            }}
                          >
                            {header}
                          </th>
                        ))}
                        {props.showActions && (
                          <th
                            className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider"
                            style={{
                              color: combinedStyle.color || '#6b7280',
                              fontFamily: combinedStyle.fontFamily,
                              fontWeight: combinedStyle.fontWeight || 500
                            }}
                          >
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(tableData || []).map((row: any, rIdx: number) => (
                        <tr key={rIdx}>
                          {(tableHeaders || []).map((header: string, cIdx: number) => {
                            let value = row[header];
                            if (value === undefined) {
                              const key = Object.keys(row).find(k => k.toLowerCase() === header.toLowerCase());
                              if (key) value = row[key];
                            }

                            return (
                              <td
                                key={cIdx}
                                className="px-3 py-2 whitespace-nowrap text-xs"
                                style={{
                                  color: combinedStyle.color || '#6b7280',
                                  fontFamily: combinedStyle.fontFamily,
                                  fontSize: combinedStyle.fontSize
                                }}
                              >
                                {value === null || value === undefined
                                  ? ""
                                  : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)}
                              </td>
                            );
                          })}
                          {props.showActions && (
                            <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
                              <div className="flex justify-end gap-2">
                                {props.showUpdateAction && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    onClick={(e: MouseEvent) => {
                                      e.stopPropagation();
                                      if (props.supabaseTable) {
                                        setEditingRow(row);
                                      } else {
                                        toast.info("Update button clicked (No Supabase table connected)");
                                      }
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                {props.showDeleteAction && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                    onClick={(e: MouseEvent) => {
                                      e.stopPropagation();
                                      setDeletingRow(row);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!tableData || tableData.length === 0) && (
                    <div className="px-3 py-8 text-center text-xs text-gray-400">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </ResizeHandle>
        );

      case 'image':
        const imgWidth = parseSize(props.width || style?.width, 300);
        const imgHeight = parseSize(props.height || style?.height, 200);

        const handleDragOver = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
        };

        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOver(false);

          if (!e.dataTransfer || !e.dataTransfer.files) {
            console.error('No files in drop event');
            return;
          }

          try {
            const files = Array.from(e.dataTransfer.files);
            const imageFile = files.find(file => file.type.startsWith('image/'));

            if (imageFile) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const result = event.target?.result as string;
                if (result) {
                  onUpdate({
                    props: { ...props, src: result, alt: imageFile.name }
                  });
                }
              };
              reader.onerror = (error) => {
                console.error('Error reading file:', error);
              };
              reader.readAsDataURL(imageFile);
            }
          } catch (error) {
            console.error('Error handling file drop:', error);
          }
        };

        const handleDragEnter = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOver(true);
          e.stopPropagation();
          // Check if dragging files (not just text/other)
          if (e.dataTransfer.types.includes('Files')) {
            setIsDraggingOver(true);
          }
        };

        const handleDragLeave = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOver(false);
          e.stopPropagation();
          // Only set to false if we're actually leaving the drop zone
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX;
          const y = e.clientY;
          if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDraggingOver(false);
          }
        };

        return (
          <ResizeHandle
            onResize={(width, height) => {
              onUpdate({
                props: { ...props, width, height },
                style: { ...style, width: `${width}px`, height: `${height}px` }
              });
            }}
            initialWidth={imgWidth}
            initialHeight={imgHeight}
            className="group"
            disabled={isPreview}
          >

            {props.src ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className="w-full h-full"
              >
                <ImageWithFallback
                  id={props.elementId}
                  src={props.src}
                  alt={props.alt || 'Image'}
                  width={imgWidth}
                  height={imgHeight}
                  style={{ ...combinedStyle, width: '100%', height: '100%', objectFit: 'fill' }}
                  className={`rounded-lg ${props.className || ''} ${isDraggingOver ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
                />
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center w-full h-full bg-muted/30 border-2 border-dashed border-muted-foreground/25 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer ${isDraggingOver ? 'bg-blue-50 border-blue-500' : ''}`}
                style={{ width: '100%', height: '100%' }}
              >
                <Upload className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">Upload Image</span>
                <span className="text-xs opacity-70 mt-1">Drag & drop or use properties</span>
              </div>
            )}
          </ResizeHandle>
        );

      case 'group':
        const groupWidth = parseSize(style?.width, 200);
        const groupHeight = parseSize(style?.height, 200);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={groupWidth}
            initialHeight={groupHeight}
            className="group"
            disabled={isPreview}
          >

            <div
              style={{
                ...combinedStyle,
                width: '100%',
                height: '100%',
                position: 'relative',
                border: isSelected ? '1px dashed #3b82f6' : 'none',
              }}
            >
              {component.children?.map((child) => (
                <div
                  key={child.id}
                  style={{
                    position: 'absolute',
                    left: child.position?.x,
                    top: child.position?.y,
                    width: child.style?.width,
                    height: child.style?.height,
                  }}
                >
                  <RenderableComponent
                    component={child}
                    projectId={projectId}
                    isSelected={false}
                    onUpdate={(childUpdates) => {
                      const newChildren = component.children?.map(c =>
                        c.id === child.id ? { ...c, ...childUpdates } : c
                      );
                      onUpdate({ children: newChildren });
                    }}
                    onDelete={() => {
                      const newChildren = component.children?.filter(c => c.id !== child.id);
                      onUpdate({ children: newChildren });
                    }}
                    disabled={disabled}
                    isPreview={isPreview}
                  />
                </div>
              ))}
            </div>
          </ResizeHandle>
        );

      case 'container':
        const containerWidth = parseSize(style?.width, 300);
        const containerHeight = parseSize(style?.height, 150);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={containerWidth}
            initialHeight={containerHeight}
            className="group"
            disabled={isPreview}
          >

            <div
              id={props.elementId}
              style={{
                padding: '20px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                minHeight: '100px',
                backgroundColor: '#f8fafc',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                ...combinedStyle
              }}
              className={props.className || ''}
            >
              <div className="text-muted-foreground text-center">
                <EditableText
                  text={props.content || ''}
                  onTextChange={(newText) => onUpdate({ props: { ...props, content: newText } })}
                  element="p"
                  isSelected={isSelected}
                  disabled={disabled || isPreview}
                  isEditing={editingComponentId === component.id}

                  onToggleEditing={(val) => onEditComponent?.(val ? component.id : null)}
                />
              </div>
            </div>
          </ResizeHandle>
        );

      case 'navbar':
        const navWidth = parseSize(style?.width, 800);
        const navHeight = parseSize(style?.height, 64);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={navWidth}
            initialHeight={navHeight}
            className="group"
            minWidth={200}
            minHeight={40}
            disabled={isPreview}
          >

            <nav
              id={props.elementId}
              style={{
                backgroundColor: '#1f2937',
                color: 'white',
                padding: '1rem',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                ...combinedStyle
              }}
              className={`flex justify-between items-center ${props.className || ''}`}
            >
              <div>
                <EditableText
                  text={props.brand}
                  onTextChange={(newText) => onUpdate({ props: { ...props, brand: newText } })}
                  element="span"
                  placeholder=""
                  isSelected={isSelected}
                  disabled={disabled || isPreview}
                />

              </div>
              <div className="flex gap-4">
                {(props.links || ['Home', 'About', 'Contact']).map((link: string, index: number) => (
                  <a key={index} href="#" className="hover:text-gray-300">
                    <EditableText
                      text={link}
                      onTextChange={(newText) => {
                        const newLinks = [...(props.links || ['Home', 'About', 'Contact'])];
                        newLinks[index] = newText;
                        onUpdate({ props: { ...props, links: newLinks } });
                      }}
                      element="span"
                      isSelected={isSelected}
                      disabled={disabled || isPreview}
                    />

                  </a>
                ))}
              </div>
            </nav>
          </ResizeHandle>
        );

      case 'hero':
        const heroWidth = parseSize(style?.width, 800);
        const heroHeight = parseSize(style?.height, 400);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={heroWidth}
            initialHeight={heroHeight}
            className="group"
            minWidth={300}
            minHeight={200}
            disabled={isPreview}
          >

            <div
              id={props.elementId}
              style={{
                backgroundColor: '#f3f4f6',
                padding: '4rem 2rem',
                textAlign: 'center',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                ...combinedStyle
              }}
              className={props.className || ''}
            >
              <EditableText
                text={props.title}
                onTextChange={(newText) => onUpdate({ props: { ...props, title: newText } })}
                element="h1"
                className="mb-4"
                placeholder="Welcome"
                isSelected={isSelected}
                disabled={disabled || isPreview}
              />

              <EditableText
                text={props.subtitle}
                onTextChange={(newText) => onUpdate({ props: { ...props, subtitle: newText } })}
                element="p"
                className="mb-6"
                placeholder="Build amazing websites with drag and drop"
                isSelected={isSelected}
                disabled={disabled || isPreview}
              />

              <Button>
                <EditableText
                  text={props.buttonText}
                  onTextChange={(newText) => onUpdate({ props: { ...props, buttonText: newText } })}
                  element="span"
                  placeholder="Get Started"
                  isSelected={isSelected}
                  disabled={disabled || isPreview}
                />

              </Button>
            </div>
          </ResizeHandle>
        );

      case 'footer':
        const footerWidth = parseSize(style?.width, 800);
        const footerHeight = parseSize(style?.height, 100);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={footerWidth}
            initialHeight={footerHeight}
            className="group"
            minWidth={200}
            minHeight={50}
            disabled={isPreview}
          >

            <footer
              id={props.elementId}
              style={{
                backgroundColor: '#374151',
                color: 'white',
                padding: '2rem',
                textAlign: 'center',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...combinedStyle
              }}
              className={props.className || ''}
            >
              <EditableText
                text={props.copyright}
                onTextChange={(newText) => onUpdate({ props: { ...props, copyright: newText } })}
                element="p"
                placeholder=" 2024 Your Company"
                isSelected={isSelected}
                disabled={disabled || isPreview}
              />

            </footer>
          </ResizeHandle>
        );

      case 'input':
        const inputWidth = parseSize(style?.width, 300);
        const inputHeight = parseSize(style?.height, 40);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={inputWidth}
            initialHeight={inputHeight}
            className="group"
            minWidth={100}
            minHeight={30}
            disabled={isPreview}
          >
            <div className="relative w-full h-full">
              <Input
                id={props.elementId}
                type={props.type || 'text'}
                placeholder={props.placeholder || 'Enter text...'}
                style={{ ...combinedStyle, width: '100%', height: '100%', pointerEvents: isPreview ? 'auto' : 'none' }}
                className={props.className || ''}
                disabled={disabled}
                onClick={(e) => {
                  if (isSelected) e.stopPropagation();
                }}
                onChange={(e) => {
                  e.target.setAttribute('value', e.target.value);
                }}
                readOnly={!isPreview}
              />
              {isSelected && (
                <div
                  className="absolute -top-7 left-0 text-xs bg-blue-500 text-white px-2 py-0.5 rounded cursor-pointer hover:bg-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newPlaceholder = prompt('Edit placeholder text:', props.placeholder || 'Enter text...');
                    if (newPlaceholder !== null) {
                      onUpdate({ props: { ...props, placeholder: newPlaceholder } });
                    }
                  }}
                  title="Click to edit placeholder"
                >
                  Edit placeholder
                </div>
              )}
            </div>
          </ResizeHandle>
        );

      case 'textarea':
        const textareaWidth = parseSize(style?.width, 400);
        const textareaHeight = parseSize(style?.height, 120);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={textareaWidth}
            initialHeight={textareaHeight}
            className="group"
            minWidth={150}
            minHeight={60}
            disabled={isPreview}
          >
            <div className="relative w-full h-full">
              <Textarea
                id={props.elementId}
                placeholder={props.placeholder || 'Enter message...'}
                style={{ ...combinedStyle, width: '100%', height: '100%', resize: 'none', pointerEvents: isPreview ? 'auto' : 'none' }}
                className={props.className || ''}
                disabled={disabled}
                onClick={(e) => {
                  if (isSelected) e.stopPropagation();
                }}
                readOnly={!isPreview}
              />
              {isSelected && (
                <div
                  className="absolute -top-7 left-0 text-xs bg-blue-500 text-white px-2 py-0.5 rounded cursor-pointer hover:bg-blue-600 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newPlaceholder = prompt('Edit placeholder text:', props.placeholder || 'Enter message...');
                    if (newPlaceholder !== null) {
                      onUpdate({ props: { ...props, placeholder: newPlaceholder } });
                    }
                  }}
                  title="Click to edit placeholder"
                >
                  Edit placeholder
                </div>
              )}
            </div>
          </ResizeHandle>
        );

      case 'form':
        const formWidth = parseSize(style?.width, 400);
        const formHeight = parseSize(style?.height, 300);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={formWidth}
            initialHeight={formHeight}
            className="group"
          >
            <Card
              id={props.elementId}
              style={{ ...combinedStyle, width: '100%', height: '100%' }}
              className={props.className || ''}
            >
              <CardHeader>
                <CardTitle>
                  <EditableText
                    text={props.title}
                    onTextChange={(newText) => onUpdate({ props: { ...props, title: newText } })}
                    element="span"
                    placeholder="Contact Form"
                    isSelected={isSelected}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder={props.namePlaceholder || "Name"}
                    onClick={(e) => isSelected && e.stopPropagation()}
                  />
                  {isSelected && (
                    <span
                      className="absolute -left-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 cursor-pointer hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newPlaceholder = prompt('Edit name placeholder:', props.namePlaceholder || 'Name');
                        if (newPlaceholder !== null) {
                          onUpdate({ props: { ...props, namePlaceholder: newPlaceholder } });
                        }
                      }}
                      title="Edit placeholder"
                    >
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder={props.emailPlaceholder || "Email"}
                    onClick={(e) => isSelected && e.stopPropagation()}
                  />
                  {isSelected && (
                    <span
                      className="absolute -left-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 cursor-pointer hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newPlaceholder = prompt('Edit email placeholder:', props.emailPlaceholder || 'Email');
                        if (newPlaceholder !== null) {
                          onUpdate({ props: { ...props, emailPlaceholder: newPlaceholder } });
                        }
                      }}
                      title="Edit placeholder"
                    >
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Textarea
                    placeholder={props.messagePlaceholder || "Message"}
                    onClick={(e) => isSelected && e.stopPropagation()}
                  />
                  {isSelected && (
                    <span
                      className="absolute -left-2 top-4 text-xs text-blue-500 cursor-pointer hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newPlaceholder = prompt('Edit message placeholder:', props.messagePlaceholder || 'Message');
                        if (newPlaceholder !== null) {
                          onUpdate({ props: { ...props, messagePlaceholder: newPlaceholder } });
                        }
                      }}
                      title="Edit placeholder"
                    >
                    </span>
                  )}
                </div>
                <Button onClick={(e: React.MouseEvent<HTMLButtonElement>) => isSelected && e.preventDefault()}>
                  <EditableText
                    text={props.submitText}
                    onTextChange={(newText) => onUpdate({ props: { ...props, submitText: newText } })}
                    element="span"
                    placeholder="Submit"
                    isSelected={isSelected}
                  />
                </Button>
              </CardContent>
            </Card>
          </ResizeHandle>
        );

      case 'grid':
        const gridWidth = parseSize(style?.width, 700);
        const gridHeight = parseSize(style?.height, 300);
        const isVertical = props.orientation === 'vertical';

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={gridWidth}
            initialHeight={gridHeight}
            className="group"
            minWidth={300}
            minHeight={150}
            disabled={isPreview}
          >

            <div
              ref={drop as unknown as React.RefObject<HTMLDivElement>}
              id={props.elementId}
              style={{
                display: 'grid',
                gridTemplateColumns: isVertical ? '1fr' : `repeat(${props.columns || 3}, 1fr)`,
                gap: props.gap || '1rem',
                padding: props.padding || '1rem',
                alignItems: props.alignItems || 'stretch',
                justifyContent: props.justifyContent || 'start',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: isOver ? '#e0f2fe' : '#f8fafc',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                ...combinedStyle
              }}
              className={props.className || ''}
            >
              {component.children && component.children.length > 0 ? (
                component.children.map((child, index) => (
                  <DraggableGridItem
                    key={child.id}
                    id={child.id}
                    index={index}
                    moveItem={(dragIndex, hoverIndex) => {
                      const newChildren = [...(component.children || [])];
                      const [draggedItem] = newChildren.splice(dragIndex, 1);
                      newChildren.splice(hoverIndex, 0, draggedItem);
                      onUpdate({ children: newChildren });
                    }}
                    isPreview={isPreview}
                  >
                    <RenderableComponent
                      component={child}
                      projectId={projectId}
                      isSelected={false}
                      onUpdate={(childUpdates) => {
                        const newChildren = [...(component.children || [])];
                        newChildren[index] = { ...newChildren[index], ...childUpdates };
                        onUpdate({ children: newChildren });
                      }}
                      onDelete={() => {
                        const newChildren = (component.children || []).filter(c => c.id !== child.id);
                        onUpdate({ children: newChildren });
                      }}
                      disabled={disabled}
                      isPreview={isPreview}
                    />
                  </DraggableGridItem>
                ))
              ) : (
                Array.from({ length: isVertical ? 1 : (props.columns || 3) }).map((_, index) => (
                  <div key={index} className="border border-dashed border-gray-300 rounded p-4 flex items-center justify-center text-muted-foreground">
                    Drop items here
                  </div>
                ))
              )}
            </div>
          </ResizeHandle>
        );

      case 'video':
        const videoWidth = parseSize(style?.width, 640);
        const videoHeight = parseSize(style?.height, 360);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={videoWidth}
            initialHeight={videoHeight}
            className="group"
            minWidth={200}
            minHeight={150}
            disabled={isPreview}
          >

            <div
              id={props.elementId}
              style={{ ...combinedStyle, width: '100%', height: '100%' }}
              className={props.className || ''}
            >
              <video
                width="100%"
                height="100%"
                controls
                poster={props.poster}
                style={{ borderRadius: '8px', objectFit: 'cover' }}
              >
                {props.src && <source src={props.src} type="video/mp4" />}
                Your browser does not support the video tag.
              </video>
            </div>
          </ResizeHandle>
        );

      case 'card':
        const cardProps = props as CardProps;
        const cardWidth = parseSize(style?.width, 300);
        const cardHeight = parseSize(style?.height, 350);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={cardWidth}
            initialHeight={cardHeight}
            className="group"
            minWidth={200}
            minHeight={200}
            disabled={isPreview}
          >
            <Card
              id={props.elementId}
              style={{ ...combinedStyle, width: '100%', height: '100%' }}
              className={`flex flex-col ${cardProps.className || ''}`}
            >
              {cardProps.image && (
                <div className="h-40 overflow-hidden">
                  <ImageWithFallback
                    id={props.elementId}
                    src={cardProps.image}
                    alt={cardProps.title || 'Card image'}
                    width={300}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                {cardProps.title && (
                  <CardTitle>
                    <EditableText
                      id={props.elementId}
                      text={cardProps.title}
                      onTextChange={(newText) => onUpdate({ props: { ...props, title: newText } })}
                      element="h3"
                      className="text-lg font-medium"
                      placeholder="Card Title"
                      isSelected={isSelected}
                      disabled={disabled || isPreview}
                    />
                  </CardTitle>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {cardProps.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <EditableText
                      id={props.elementId}
                      text={cardProps.description}
                      onTextChange={(newText) => onUpdate({ props: { ...props, description: newText } })}
                      element="span"
                      placeholder="Card description"
                      isSelected={isSelected}
                      disabled={disabled || isPreview}
                    />
                  </p>
                )}
                {cardProps.buttonText && (
                  <Button
                    id={props.elementId}
                    variant="outline"
                    size="sm"
                    className="mt-auto"
                    onClick={(e: MouseEvent) => {
                      if (isSelected) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <EditableText
                      id={props.elementId}
                      text={cardProps.buttonText}
                      onTextChange={(newText) => onUpdate({ props: { ...props, buttonText: newText } })}
                      element="span"
                      placeholder="Button"
                      isSelected={isSelected}
                      disabled={disabled || isPreview}
                    />
                  </Button>
                )}
              </CardContent>
            </Card>
          </ResizeHandle>
        );

      case 'section-heading':
        const sectionHeadingWidth = parseSize(style?.width, 600);
        const sectionHeadingHeight = parseSize(style?.height, 120);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={sectionHeadingWidth}
            initialHeight={sectionHeadingHeight}
            className="group"
            minWidth={200}
            minHeight={80}
            disabled={isPreview}
          >
            <div
              id={props.elementId}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: props.align || 'center',
                textAlign: props.align || 'center',
                padding: '1rem',
                ...combinedStyle
              }}
              className={props.className || ''}
            >
              <EditableText
                id={props.elementId}
                text={props.title || 'Section Title'}
                onTextChange={(newText) => onUpdate({ props: { ...props, title: newText } })}
                element="h2"
                className="text-3xl font-bold mb-2"
                isSelected={isSelected}
                disabled={disabled || isPreview}
              />
              {props.subtitle && (
                <EditableText
                  id={props.elementId}
                  text={props.subtitle}
                  onTextChange={(newText) => onUpdate({ props: { ...props, subtitle: newText } })}
                  element="p"
                  className="text-lg text-gray-600 dark:text-gray-300"
                  isSelected={isSelected}
                  disabled={disabled || isPreview}
                />
              )}
            </div>
          </ResizeHandle>
        );

      case 'paragraph':
        const paraWidth = parseSize(style?.width, 600);
        const paragraphWidth = parseSize(style?.width, 600);
        const paragraphHeight = parseSize(style?.height, 100);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={paragraphWidth}
            initialHeight={paragraphHeight}
            className="group"
            minWidth={200}
            minHeight={40}
            disabled={isPreview}
          >
            <div
              id={props.elementId}
              style={{
                width: '100%',
                height: '100%',
                padding: '0.5rem',
                ...combinedStyle
              }}
              className={props.className || ''}
            >
              <EditableText
                id={props.elementId}
                text={props.content || 'This is a paragraph. Double-click to edit the text.'}
                onTextChange={(newText) => onUpdate({ props: { ...props, content: newText } })}
                element="p"
                className="text-base text-gray-700 dark:text-gray-300 leading-relaxed"
                isSelected={isSelected}
                disabled={disabled || isPreview}
                isEditing={editingComponentId === component.id}
                onToggleEditing={(val) => onEditComponent?.(val ? component.id : null)}
              />
            </div>
          </ResizeHandle>
        );

      case 'gallery':
        const galleryWidth = parseSize(style?.width, 800);
        const galleryHeight = parseSize(style?.height, 400);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={galleryWidth}
            initialHeight={galleryHeight}
            className="group"
            minWidth={300}
            minHeight={200}
            disabled={isPreview}
          >
            <div
              id={props.elementId}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                overflow: 'auto',
                ...combinedStyle
              }}
              className={props.className || ''}
            >
              {props.images?.length > 0 ? (
                props.images.map((img: string, index: number) => (
                  <ImageWithFallback
                    key={index}
                    src={img}
                    alt={`Gallery image ${index + 1}`}
                    width={200}
                    height={150}
                    className="rounded-lg object-cover w-full h-auto"
                  />
                ))
              ) : (
                <div className="col-span-full text-center text-muted-foreground p-8 border border-dashed rounded-lg flex items-center justify-center">
                  No images in gallery
                </div>
              )}
            </div>
          </ResizeHandle>
        );

      case 'carousel':
        const carouselWidth = parseSize(style?.width, 800);
        const carouselHeight = parseSize(style?.height, 400);
        const [currentSlide, setCurrentSlide] = React.useState(0);

        const nextSlide = () => {
          setCurrentSlide((prev) =>
            prev === (props.slides?.length || 1) - 1 ? 0 : prev + 1
          );
        };

        const prevSlide = () => {
          setCurrentSlide((prev) =>
            prev === 0 ? (props.slides?.length || 1) - 1 : prev - 1
          );
        };

        // Auto-advance slides if autoplay is enabled
        React.useEffect(() => {
          if (!props.autoplay || !isPreview) return;

          const timer = setInterval(() => {
            nextSlide();
          }, props.autoplaySpeed || 5000);

          return () => clearInterval(timer);
        }, [props.autoplay, props.autoplaySpeed, currentSlide, isPreview]);

        return (
          <ResizeHandle
            onResize={handleResize}
            initialWidth={carouselWidth}
            initialHeight={carouselHeight}
            className="group relative overflow-hidden"
            minWidth={300}
            minHeight={200}
            disabled={isPreview}
          >
            <div
              className="relative w-full h-full"
              style={{
                ...combinedStyle,
                overflow: 'hidden',
                borderRadius: '0.5rem',
              }}
            >
              {/* Slides */}
              <div
                className="flex transition-transform duration-500 ease-in-out w-full h-full"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                  height: '100%'
                }}
              >
                {props.slides && props.slides.length > 0 && props.slides.some((s: any) => s.src) ? (
                  props.slides.map((slide: any, index: number) => (
                    <div
                      key={slide.id || index}
                      className="shrink-0 w-full h-full relative"
                      style={{
                        backgroundImage: `url(${slide.src})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        height: '100%',
                        minHeight: '100%',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                      }}
                    >
                      {(slide.caption || slide.alt) && (
                        <div className="bg-black bg-opacity-50 text-white p-4 w-full text-center">
                          <h3 className="text-xl font-bold">{slide.caption}</h3>
                          {slide.alt && <p className="text-sm opacity-90">{slide.alt}</p>}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div
                    className="shrink-0 w-full h-full flex flex-col items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/25 rounded-lg text-muted-foreground"
                  >
                    <Upload className="w-10 h-10 mb-3 opacity-50" />
                    <span className="text-sm font-medium">Upload Carousel Images</span>
                    <span className="text-xs opacity-70 mt-1">Add slides via properties panel</span>
                  </div>
                )}
              </div>

              {/* Navigation Arrows - Only show in preview */}
              {isPreview && props.showArrows && props.slides?.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevSlide();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-10"
                    aria-label="Previous slide"
                  >
                    ←
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextSlide();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-10"
                    aria-label="Next slide"
                  >
                    →
                  </button>
                </>
              )}

              {/* Dots Indicator - Only show in preview */}
              {isPreview && props.showDots && props.slides?.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {props.slides.map((_: any, index: number) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(index);
                      }}
                      className={`w-3 h-3 rounded-full transition-all ${index === currentSlide
                        ? 'bg-white scale-125'
                        : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </ResizeHandle>
        );

      default:
        return (
          <div style={combinedStyle} className={`p-4 border border-dashed rounded ${props.className || ''}`}>
            Unknown component type: {type}
          </div>
        );
    }
  };

  const hasEditableText = ['text', 'heading', 'button', 'navbar', 'hero', 'footer', 'form', 'container', 'grid', 'carousel'].includes(component.type);

  return (
    <div className="relative group">
      {renderComponent()}

      {isSelected && (
        <>
          {/* Delete Button */}
          <div className="absolute -top-2 -right-2 flex gap-1 z-10">
            <Button
              size="sm"
              variant="destructive"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-6 h-6 p-0"
              title="Delete component"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {/* Edit Indicator for text components */}
          {hasEditableText && (
            <div className="absolute -top-2 -left-2 z-10 pointer-events-none">
              <div className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                <Edit className="w-2.5 h-2.5" />
                <span>Double-click to edit</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Row Dialog */}
      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-[400px] w-full">
          <DialogHeader>
            <DialogTitle>Edit Row</DialogTitle>
            <DialogDescription>
              Make changes to the row data here.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {editingRow && (tableHeaders || []).map((key: string) => {
              // Only show if the key exists in the row (or we want to allow adding it)
              // and if it matches a header.
              // We use exact match here as headers usually match keys.
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`edit-${key}`} className="text-left text-xs font-medium uppercase text-muted-foreground">
                    {key}
                  </Label>
                  <Input
                    id={`edit-${key}`}
                    value={editingRow[key] || ''}
                    onChange={(e) => setEditingRow({ ...editingRow, [key]: e.target.value })}
                    disabled={key === 'id'}
                    className="w-full h-9"
                  />
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editingRow || !component.props.supabaseTable) return;

              if (!editingRow.id) {
                toast.error("Cannot update: Row is missing 'id' field");
                return;
              }

              const { id, ...updateData } = editingRow;

              try {
                const tableName = component.props.supabaseTable.replace(/^public\./, '');
                let client = supabase;
                if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                  client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
                }
                const { error } = await client
                  .from(tableName)
                  .update(updateData)
                  .eq('id', id);

                if (error) throw error;

                toast.success("Row updated successfully");
                setEditingRow(null);

                // Trigger refresh if possible (dispatch custom event)
                window.dispatchEvent(new CustomEvent('supabase-data-update', {
                  detail: { table: component.props.supabaseTable, operation: 'update' }
                }));
              } catch (err: any) {
                toast.error("Update failed: " + err.message);
              }
            }}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRow} onOpenChange={(open: boolean) => !open && setDeletingRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the row from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRow(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-red-700 focus:ring-red-600"
              onClick={async () => {
                if (!deletingRow || !component.props.supabaseTable) return;

                if (!deletingRow.id) {
                  toast.error("Cannot delete: Row is missing 'id' field");
                  return;
                }

                const tableName = component.props.supabaseTable.replace(/^public\./, '');
                let client = supabase;
                if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                  client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
                }

                const { error } = await client
                  .from(tableName)
                  .delete()
                  .eq('id', deletingRow.id);

                if (error) {
                  toast.error("Delete failed: " + error.message);
                } else {
                  toast.success("Row deleted successfully");
                  setDeletingRow(null);
                  // Trigger refresh
                  window.dispatchEvent(new CustomEvent('supabase-data-update', {
                    detail: { table: component.props.supabaseTable, operation: 'delete' }
                  }));
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
