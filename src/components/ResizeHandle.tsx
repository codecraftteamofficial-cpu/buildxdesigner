import React, { useState, useRef } from 'react';
import { GripHorizontal, GripVertical, CornerDownRight } from 'lucide-react';

interface ResizeHandleProps {
  onResize: (width: number, height: number) => void;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export function ResizeHandle({
  onResize,
  initialWidth = 300,
  initialHeight = 200,
  minWidth = 50,
  minHeight = 30,
  className = '',
  children,
  disabled = false,
  onResizeStart,
  onResizeEnd
}: ResizeHandleProps) {
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'width' | 'height' | 'both' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startDimensions = useRef({ width: 0, height: 0 });

  // Refs to track state in event listeners (avoiding stale closures)
  const currentDimensions = useRef(dimensions);
  const activeResizeDirection = useRef<'width' | 'height' | 'both' | null>(null);

  // Update dimensions when initialWidth or initialHeight changes
  React.useEffect(() => {
    // Prevent the parent state from fighting the local state while dragging
    if (!isResizing) {
      const newDims = { width: initialWidth, height: initialHeight };
      setDimensions(newDims);
      currentDimensions.current = newDims;
    }
  }, [initialWidth, initialHeight, isResizing]);

  const handleMouseDown = (e: React.MouseEvent, direction: 'width' | 'height' | 'both') => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeDirection(direction);
    activeResizeDirection.current = direction;
    onResizeStart?.();

    startPos.current = { x: e.clientX, y: e.clientY };
    startDimensions.current = { ...dimensions };
    currentDimensions.current = { ...dimensions };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'both' ? 'nw-resize' :
      direction === 'width' ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!activeResizeDirection.current) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    let newWidth = startDimensions.current.width;
    let newHeight = startDimensions.current.height;

    if (activeResizeDirection.current === 'width' || activeResizeDirection.current === 'both') {
      newWidth = Math.max(minWidth, startDimensions.current.width + deltaX);
    }

    if (activeResizeDirection.current === 'height' || activeResizeDirection.current === 'both') {
      newHeight = Math.max(minHeight, startDimensions.current.height + deltaY);
    }

    const newDims = { width: newWidth, height: newHeight };
    setDimensions(newDims);
    currentDimensions.current = newDims;
    onResize(newWidth, newHeight); // <-- ADDED THIS FOR LIVE UPDATES
  };

  const handleMouseUp = () => {
    if (activeResizeDirection.current) {
      setIsResizing(false);
      setResizeDirection(null);
      activeResizeDirection.current = null;
      onResizeEnd?.();

      onResize(currentDimensions.current.width, currentDimensions.current.height);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  };

  const handleTouchStart = (e: React.TouchEvent, direction: 'width' | 'height' | 'both') => {
    if (disabled) return;
    
    // REMOVED e.preventDefault() here! CSS touch-none handles this now.
    e.stopPropagation();

    const touch = e.touches[0];
    setIsResizing(true);
    setResizeDirection(direction);
    activeResizeDirection.current = direction;

    startPos.current = { x: touch.clientX, y: touch.clientY };
    startDimensions.current = { ...dimensions };
    currentDimensions.current = { ...dimensions };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!activeResizeDirection.current) return;

    e.preventDefault(); 

    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;

    let newWidth = startDimensions.current.width;
    let newHeight = startDimensions.current.height;

    if (activeResizeDirection.current === 'width' || activeResizeDirection.current === 'both') {
      newWidth = Math.max(minWidth, startDimensions.current.width + deltaX);
    }

    if (activeResizeDirection.current === 'height' || activeResizeDirection.current === 'both') {
      newHeight = Math.max(minHeight, startDimensions.current.height + deltaY);
    }

    const newDims = { width: newWidth, height: newHeight };
    setDimensions(newDims);
    currentDimensions.current = newDims;
    onResize(newWidth, newHeight); // <-- ADDED THIS FOR LIVE UPDATES
  };

  const handleTouchEnd = () => {
    if (activeResizeDirection.current) {
      setIsResizing(false);
      setResizeDirection(null);
      activeResizeDirection.current = null;

      onResize(currentDimensions.current.width, currentDimensions.current.height);

      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative block ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`
      }}
    >
      {children}

      {/* Resize handles - visible on hover and when selected */}
      {!disabled && (
        <div className="absolute inset-0 pointer-events-none group-hover:pointer-events-auto transition-opacity">
          {/* Right handle (width) */}
          <div
            className="absolute top-0 -right-1.5 w-3 h-full cursor-ew-resize bg-primary/0 hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center border-r-2 border-transparent hover:border-primary touch-none"
            onMouseDown={(e) => handleMouseDown(e, 'width')}
            onTouchStart={(e) => handleTouchStart(e, 'width')}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="w-1 h-8 bg-primary rounded-full opacity-0 group-hover:opacity-80 transition-opacity" />
          </div>

          {/* Bottom handle (height) */}
          <div
            className="absolute -bottom-1.5 left-0 w-full h-3 cursor-ns-resize bg-primary/0 hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center border-b-2 border-transparent hover:border-primary touch-none"
            onMouseDown={(e) => handleMouseDown(e, 'height')}
            onTouchStart={(e) => handleTouchStart(e, 'height')}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="h-1 w-8 bg-primary rounded-full opacity-0 group-hover:opacity-80 transition-opacity" />
          </div>

          {/* Corner handle (both) - most prominent */}
          <div
            className="absolute -bottom-2 -right-2 w-5 h-5 cursor-nwse-resize bg-primary hover:bg-primary/80 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-sm shadow-lg border-2 border-white dark:border-gray-800 touch-none"
            onMouseDown={(e) => handleMouseDown(e, 'both')}
            onTouchStart={(e) => handleTouchStart(e, 'both')}
            style={{ pointerEvents: 'auto' }}
          >
            <CornerDownRight className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      {/* Visual feedback during resize */}
      {isResizing && (
        <div className="absolute -top-8 left-0 bg-primary text-primary-foreground px-2 py-1 rounded text-xs z-20">
          {dimensions.width}×{dimensions.height}
        </div>
      )}
    </div>
  );
}
