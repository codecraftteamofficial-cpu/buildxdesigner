import React, { useRef } from 'react';
import { ResizeHandle } from './ResizeHandle';
import { ComponentData } from '../App';

interface GroupResizeHandleProps {
  component: ComponentData;
  onUpdate: (updates: Partial<ComponentData>) => void;
  zoom?: number;
  isSelected?: boolean;
  disabled?: boolean;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  children: React.ReactNode;
}

const parseSize = (size: string | number | undefined, defaultValue: number): number => {
  if (typeof size === 'number') return size;
  if (typeof size === 'string') {
    const parsed = parseFloat(size.replace('px', ''));
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

// Recursively scale all children and their descendants
const scaleChildren = (children: ComponentData[], scaleX: number, scaleY: number): ComponentData[] => {
  if (!children) return [];

  return children.map(child => {
    const childW = parseSize(child.style?.width, 0);
    const childH = parseSize(child.style?.height, 0);
    const childX = typeof child.position?.x === 'number' ? child.position.x : 0;
    const childY = typeof child.position?.y === 'number' ? child.position.y : 0;
    
    const newChild = {
      ...child,
      position: {
        x: childX * scaleX,
        y: childY * scaleY
      },
      style: {
        ...child.style,
        width: childW ? `${childW * scaleX}px` : undefined,
        height: childH ? `${childH * scaleY}px` : undefined,
      }
    };

    if (newChild.children && newChild.children.length > 0) {
      newChild.children = scaleChildren(newChild.children, scaleX, scaleY);
    }

    return newChild;
  });
};

export const GroupResizeHandle = React.forwardRef<HTMLDivElement, GroupResizeHandleProps>(({
  component,
  onUpdate,
  zoom,
  isSelected,
  disabled,
  onResizeStart,
  onResizeEnd,
  children
}, ref) => {
  
  // Track ONLY the starting dimensions when a resize operation begins.
  // We use this to calculate true scale from the original drop size.
  const groupStartDims = useRef({ width: 0, height: 0 });
  const startChildren = useRef<ComponentData[]>([]);

  const initialWidth = parseSize(component.style?.width, 200);
  const initialHeight = parseSize(component.style?.height, 200);

  const handleResizeStart = () => {
    groupStartDims.current = { width: initialWidth, height: initialHeight };
    startChildren.current = JSON.parse(JSON.stringify(component.children || [])); // deep copy clone starting state
    onResizeStart?.();
  };

  const handleResize = (newX: number, newY: number, newWidth: number, newHeight: number) => {
    const origWidth = groupStartDims.current.width;
    const origHeight = groupStartDims.current.height;

    // Only scale if width/height actually exist and are > 0
    const scaleX = origWidth > 0 ? newWidth / origWidth : 1;
    const scaleY = origHeight > 0 ? newHeight / origHeight : 1;
    
    const scaledChildren = scaleChildren(startChildren.current, scaleX, scaleY);

    onUpdate({
      position: { x: newX, y: newY },
      style: {
        ...component.style,
        width: `${newWidth}px`,
        height: `${newHeight}px`
      },
      children: scaledChildren
    });
  };

  return (
    <ResizeHandle
      ref={ref}
      data-component-id={component.id}
      onResize={handleResize}
      zoom={zoom}
      isSelected={isSelected}
      initialX={component.position?.x || 0}
      initialY={component.position?.y || 0}
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      className="group"
      disabled={disabled}
      onResizeStart={handleResizeStart}
      onResizeEnd={onResizeEnd}
    >
      {children}
    </ResizeHandle>
  );
});

GroupResizeHandle.displayName = 'GroupResizeHandle';
