import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
} from './ui/select';
import { Button } from './ui/button';
import { Plus, Layout, Copy, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface Page {
    id: string;
    name: string;
    path: string;
}

interface PageSelectorProps {
    pages: Page[];
    activePageId: string;
    onSwitchPage: (pageId: string) => void;
    onAddPage?: (name: string, path: string) => void;
    onRemovePage?: (pageId: string) => void;
    onDuplicatePage?: (pageId: string) => void;
    onUpdatePage?: (pageId: string, updates: { name?: string; path?: string }) => void;
}

interface PageMenuProps {
    page: Page;
    anchorRef: React.RefObject<HTMLButtonElement | null>;
    onClose: () => void;
    onEdit: (page: Page) => void;
    onDuplicate?: (pageId: string) => void;
    onRemove?: (pageId: string) => void;
}

function PageMenu({ page, anchorRef, onClose, onEdit, onDuplicate, onRemove }: PageMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const [isReady, setIsReady] = useState(false);

    React.useLayoutEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.right - 128 });
            setIsReady(true);
        }
    }, [anchorRef]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node) &&
                !anchorRef.current?.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [onClose, anchorRef]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler, true);
        return () => document.removeEventListener('keydown', handler, true);
    }, [onClose]);

    const MenuItem = ({
        label,
        Icon,
        action,
        danger = false,
    }: {
        label: string;
        Icon: React.ElementType;
        action: () => void;
        danger?: boolean;
    }) => {
        const stopAll = (e: React.SyntheticEvent | React.PointerEvent | React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            if ('nativeEvent' in e) {
                e.nativeEvent.stopImmediatePropagation();
            }
        };

        return (
            <button
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-sm cursor-pointer ${danger ? 'text-destructive' : ''}`}
                onPointerDown={stopAll}
                onPointerUp={stopAll}
                onMouseDown={stopAll}
                onMouseUp={stopAll}
                onClick={(e) => {
                    stopAll(e);
                    action();
                }}
            >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
            </button>
        );
    };

    const blockPropagation = (e: React.SyntheticEvent | React.PointerEvent | React.MouseEvent) => {
        e.stopPropagation();
        if ('nativeEvent' in e) {
            e.nativeEvent.stopImmediatePropagation();
        }
    };

    return createPortal(
        <div
            ref={menuRef}
            style={{ 
                position: 'fixed', 
                top: pos.top, 
                left: pos.left, 
                zIndex: 9999, 
                pointerEvents: 'auto',
                opacity: isReady ? 1 : 0
            }}
            className="w-32 rounded-md border border-border bg-popover shadow-md p-1"
            onPointerDown={blockPropagation}
            onPointerUp={blockPropagation}
            onMouseDown={blockPropagation}
            onMouseUp={blockPropagation}
            onClick={blockPropagation}
        >
            <MenuItem label="Edit" Icon={Pencil} action={() => onEdit(page)} />
            {onDuplicate && (
                <MenuItem label="Duplicate" Icon={Copy} action={() => onDuplicate(page.id)} />
            )}
            {page.id !== 'home' && onRemove && (
                <MenuItem label="Delete" Icon={Trash2} action={() => onRemove(page.id)} danger />
            )}
        </div>
    , document.body);
}

export function PageSelector({
    pages,
    activePageId,
    onSwitchPage,
    onAddPage,
    onRemovePage,
    onDuplicatePage,
    onUpdatePage,
}: PageSelectorProps) {
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [openMenuPageId, setOpenMenuPageId] = useState<string | null>(null);
    const menuBtnRefs = useRef<Record<string, React.RefObject<HTMLButtonElement | null>>>({});

    const getMenuBtnRef = (id: string) => {
        if (!menuBtnRefs.current[id]) {
            menuBtnRefs.current[id] = React.createRef<HTMLButtonElement | null>();
        }
        return menuBtnRefs.current[id];
    };

    // Add page dialog
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newPageName, setNewPageName] = useState('');
    const [newPagePath, setNewPagePath] = useState('');

    // Edit page dialog
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [editName, setEditName] = useState('');
    const [editPath, setEditPath] = useState('');

    const handleAddPage = () => {
        if (newPageName.trim() && newPagePath.trim() && onAddPage) {
            onAddPage(newPageName.trim(), newPagePath.trim());
            setShowAddDialog(false);
            setNewPageName('');
            setNewPagePath('');
        }
    };

    const handleStartEdit = (page: Page) => {
        setIsSelectOpen(false);
        setTimeout(() => {
            setEditingPage(page);
            setEditName(page.name);
            setEditPath(page.path);
        }, 50);
    };

    const handleUpdatePage = () => {
        if (editingPage && editName.trim() && editPath.trim() && onUpdatePage) {
            onUpdatePage(editingPage.id, { name: editName.trim(), path: editPath.trim() });
            setEditingPage(null);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 border-r border-border pr-3">
                <Layout className="w-4 h-4 text-muted-foreground hidden sm:block" />

                <Select
                    value={activePageId}
                    open={isSelectOpen}
                    onOpenChange={setIsSelectOpen}
                    onValueChange={(val: string) => {
                        if (val === 'NEW_PAGE') {
                            setIsSelectOpen(false);
                            setTimeout(() => setShowAddDialog(true), 50);
                        } else {
                            onSwitchPage(val);
                            setIsSelectOpen(false);
                        }
                    }}
                >
                    <SelectTrigger 
                        data-tour="page-selector-trigger"
                        className="h-8 min-w-[120px] bg-transparent border-none hover:bg-accent focus:ring-0 shadow-none text-sm font-medium"
                    >
                        <SelectValue placeholder="Select Page" />
                    </SelectTrigger>

                    <SelectContent className="min-w-[260px]">
                        <SelectGroup>
                            {pages?.map((page) => {
                                const btnRef = getMenuBtnRef(page.id);
                                return (
                                    <div key={page.id} className="relative flex items-center px-1">
                                        <SelectItem
                                            value={page.id}
                                            hideIndicator={true}
                                            className={`flex-1 cursor-pointer pr-4 focus:bg-accent focus:text-accent-foreground 
                                                ${page.id === activePageId ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''}`}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden py-1">
                                                <span className={`truncate max-w-[130px] ${page.id === activePageId ? 'font-semibold' : ''}`}>{page.name}</span>
                                                <span className={`text-muted-foreground text-[10px] shrink-0 opacity-70 ${page.id === activePageId ? 'text-primary/70' : ''}`}>
                                                    {page.path}
                                                </span>
                                            </div>
                                        </SelectItem>

                                        <button
                                            ref={btnRef}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 z-50
                                                       h-6 w-6 flex items-center justify-center
                                                       rounded-full text-muted-foreground
                                                       hover:text-foreground hover:bg-muted/60
                                                       transition-colors"
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setOpenMenuPageId((prev) =>
                                                    prev === page.id ? null : page.id
                                                );
                                            }}
                                        >
                                            <MoreVertical className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </SelectGroup>

                        {onAddPage && (
                            <>
                                <SelectSeparator />
                                <SelectItem
                                    value="NEW_PAGE"
                                    className="cursor-pointer text-blue-600 focus:text-blue-700 font-medium"
                                >
                                    <div className="flex items-center gap-2" data-tour="create-new-page">
                                        <Plus className="w-4 h-4" />
                                        Create New Page
                                    </div>
                                </SelectItem>
                            </>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {openMenuPageId && (() => {
                const page = pages.find((p) => p.id === openMenuPageId);
                if (!page) return null;
                return (
                    <PageMenu
                        page={page}
                        anchorRef={getMenuBtnRef(openMenuPageId)}
                        onClose={() => setOpenMenuPageId(null)}
                        onEdit={(p) => {
                            setOpenMenuPageId(null);
                            handleStartEdit(p);
                        }}
                        onDuplicate={
                            onDuplicatePage
                                ? (id) => { setOpenMenuPageId(null); onDuplicatePage(id); }
                                : undefined
                        }
                        onRemove={
                            onRemovePage
                                ? (id) => { setOpenMenuPageId(null); onRemovePage(id); }
                                : undefined
                        }
                    />
                );
            })()}

            {/* Add Page Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent data-tour="new-page-modal" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Create New Page</DialogTitle>
                        <DialogDescription>Add a new page to your project.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-name" className="text-right">Name</Label>
                            <Input
                                id="add-name"
                                autoFocus
                                value={newPageName}
                                onChange={(e) => setNewPageName(e.target.value)}
                                placeholder="e.g. About Us"
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-path" className="text-right">Path</Label>
                            <Input
                                id="add-path"
                                value={newPagePath}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (!val.startsWith('/')) val = '/' + val;
                                    setNewPagePath(val);
                                }}
                                placeholder="e.g. /about"
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleAddPage}
                            disabled={!newPageName.trim() || !newPagePath.trim() || newPagePath.trim() === '/'}
                        >
                            Create Page
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Page Dialog */}
            <Dialog open={!!editingPage} onOpenChange={(open) => { if (!open) setEditingPage(null); }}>
                <DialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Edit Page Settings</DialogTitle>
                        <DialogDescription>Update the page name and path.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Name</Label>
                            <Input
                                id="edit-name"
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-path" className="text-right">Path</Label>
                            <Input
                                id="edit-path"
                                value={editPath}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (!val.startsWith('/')) val = '/' + val;
                                    setEditPath(val);
                                }}
                                disabled={editingPage?.id === 'home'}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPage(null)}>Cancel</Button>
                        <Button
                            onClick={handleUpdatePage}
                            disabled={!editName.trim() || !editPath.trim()}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}