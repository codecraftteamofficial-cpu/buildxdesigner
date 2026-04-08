import React, { useState, useRef, useEffect } from 'react';
import { CornerDownRight } from 'lucide-react';

interface DiagonalResizeHandleProps {
  onResize: (newX: number, newY: number, newWidth: number, newHeight: number) => void;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  minWidth?: number;
  minHeight?: number;
  zoom?: number;
  isSelected?: boolean;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

export const DiagonalResizeHandle: React.FC<DiagonalResizeHandleProps> = ({
  onResize,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  minWidth = 80,
  minHeight = 40,
  zoom = 1,
  isSelected = false,
  onResizeStart,
  onResizeEnd,
  containerRef
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startDimensions = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    onResizeStart?.();

    startPos.current = { x: e.clientX, y: e.clientY };
    
    // Measure actual dimensions to handle 'auto', '100%', etc. accurately
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      startDimensions.current = {
        x: initialX,
        y: initialY,
        width: rect.width / zoom,
        height: rect.height / zoom
      };
    } else {
      startDimensions.current = {
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight
      };
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = (e.clientX - startPos.current.x) / zoom;
    const deltaY = (e.clientY - startPos.current.y) / zoom;

    const newWidth = Math.max(minWidth, startDimensions.current.width + deltaX);
    const newHeight = Math.max(minHeight, startDimensions.current.height + deltaY);

    onResize(startDimensions.current.x, startDimensions.current.y, newWidth, newHeight);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    onResizeEnd?.();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    
    setIsResizing(true);
    onResizeStart?.();

    startPos.current = { x: touch.clientX, y: touch.clientY };
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      startDimensions.current = {
        x: initialX,
        y: initialY,
        width: rect.width / zoom,
        height: rect.height / zoom
      };
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = (touch.clientX - startPos.current.x) / zoom;
    const deltaY = (touch.clientY - startPos.current.y) / zoom;

    const newWidth = Math.max(minWidth, startDimensions.current.width + deltaX);
    const newHeight = Math.max(minHeight, startDimensions.current.height + deltaY);

    onResize(startDimensions.current.x, startDimensions.current.y, newWidth, newHeight);
  };

  const handleTouchEnd = () => {
    setIsResizing(false);
    onResizeEnd?.();
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div
      className={`resize-handle absolute -bottom-2 -right-2 w-6 h-6 cursor-nwse-resize bg-primary hover:bg-primary/80 transition-all flex items-center justify-center rounded-sm shadow-lg border-2 border-white dark:border-gray-800 z-50 ${
        isSelected ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{ pointerEvents: 'auto' }}
    >
      <CornerDownRight className="w-4 h-4 text-white" />
      
      {isResizing && (
        <div className="absolute -bottom-8 right-0 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
          {Math.round(startDimensions.current.width + (startPos.current.x - startPos.current.x))}px
          {/* Note: the display logic above is just a placeholder, the actual update happens in parent */}
        </div>
      )}
    </div>
  );
};
