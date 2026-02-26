import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function EditTooltip() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    // Check if tooltip has been shown before
    const tooltipShown = localStorage.getItem('codecraft-edit-tooltip-shown');
    
    if (!tooltipShown) {
      // Show tooltip after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
        setHasBeenShown(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('codecraft-edit-tooltip-shown', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-100 animate-in slide-in-from-bottom-5">
      <div className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg shadow-2xl max-w-md">
        <div className="flex items-start gap-3">
          <div className="shrink-0 text-2xl">✏️</div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1 text-sm">💡 Edit Text Easily</h3>
            <p className="text-xs mb-3 leading-relaxed opacity-90">
              <strong>Double-click any text</strong> to edit it inline, or use the Properties panel on the right. All text is editable!
            </p>
            <div className="flex gap-2 text-xs flex-wrap">
              <span className="bg-white/20 px-2 py-1 rounded">Double-click to edit</span>
              <span className="bg-white/20 px-2 py-1 rounded">Enter to save</span>
              <span className="bg-white/20 px-2 py-1 rounded">Esc to cancel</span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
