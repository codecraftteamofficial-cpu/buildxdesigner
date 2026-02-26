import React, { useState } from 'react';
import { Plus, MoreHorizontal, Copy, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';

export interface Page {
  id: string;
  name: string;
  thumbnail?: string;
}

interface PagesPanelProps {
  pages: Page[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  onPageAdd: () => void;
  onPageDuplicate: (pageId: string) => void;
  onPageDelete: (pageId: string) => void;
  onPageRename: (pageId: string, newName: string) => void;
}

export function PagesPanel({
  pages,
  currentPageId,
  onPageSelect,
  onPageAdd,
  onPageDuplicate,
  onPageDelete,
  onPageRename,
}: PagesPanelProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartRename = (page: Page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleFinishRename = (pageId: string) => {
    if (editingName.trim()) {
      onPageRename(pageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, pageId: string) => {
    if (e.key === 'Enter') {
      handleFinishRename(pageId);
    } else if (e.key === 'Escape') {
      setEditingPageId(null);
      setEditingName('');
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-card border-t z-30 h-24 flex items-center px-4 gap-3">
      {/* Pages Title */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium text-muted-foreground">Pages</span>
      </div>

      {/* Pages List - Scrollable */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto overflow-y-hidden pages-scroll">
        {pages.map((page) => (
          <div
            key={page.id}
            className={`shrink-0 w-32 h-16 rounded-lg border-2 cursor-pointer transition-all ${page.id === currentPageId
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
              : 'border-border hover:border-blue-300 dark:hover:border-blue-700 bg-background'
              }`}
            onClick={() => onPageSelect(page.id)}
          >
            <div className="w-full h-full p-2 flex flex-col">
              {/* Page Thumbnail Area */}
              <div className="flex-1 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                {page.thumbnail || 'Page'}
              </div>

              {/* Page Name */}
              <div className="mt-1 flex items-center justify-between gap-1">
                {editingPageId === page.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleFinishRename(page.id)}
                    onKeyDown={(e) => handleKeyDown(e, page.id)}
                    className="h-5 px-1 text-xs"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-xs truncate flex-1" title={page.name}>
                      {page.name}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(event: React.MouseEvent) => event.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-accent"
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={(event: React.MouseEvent) => {
                            event.stopPropagation();
                            handleStartRename(page);
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event: React.MouseEvent) => {
                            event.stopPropagation();
                            onPageDuplicate(page.id);
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {pages.length > 1 && (
                          <DropdownMenuItem
                            onClick={(event: React.MouseEvent) => {
                              event.stopPropagation();
                              onPageDelete(page.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onPageAdd}
        className="shrink-0 h-16 w-16 flex flex-col items-center justify-center gap-1"
      >
        <Plus className="w-4 h-4" />
        <span className="text-xs">Page</span>
      </Button>
    </div>
  );
}
