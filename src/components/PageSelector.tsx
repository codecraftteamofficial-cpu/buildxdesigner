import React, { useState } from 'react';
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
import { Plus, Layout, X } from 'lucide-react';
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
}

export function PageSelector({ pages, activePageId, onSwitchPage, onAddPage, onRemovePage }: PageSelectorProps) {
    const [showAddPage, setShowAddPage] = useState(false);
    const [newPageName, setNewPageName] = useState('');
    const [newPagePath, setNewPagePath] = useState('');

    const handleAddPage = () => {
        if (newPageName.trim() && newPagePath.trim() && onAddPage) {
            onAddPage(newPageName.trim(), newPagePath.trim());
            setShowAddPage(false);
            setNewPageName('');
            setNewPagePath('');
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 border-r border-border pr-3">
                <Layout className="w-4 h-4 text-muted-foreground hidden sm:block" />
                <Select value={activePageId} onValueChange={(val: string) => {
                    if (val === 'NEW_PAGE') {
                        setShowAddPage(true);
                    } else {
                        onSwitchPage(val);
                    }
                }}>
                    <SelectTrigger className="h-8 min-w-[120px] bg-transparent border-none hover:bg-accent focus:ring-0 shadow-none text-sm font-medium">
                        <SelectValue placeholder="Select Page" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {pages?.map((page) => (
                                <div key={page.id} className="relative group flex items-center pr-2">
                                    <SelectItem value={page.id} className="flex-1 cursor-pointer pr-10">
                                        {page.name} <span className="text-muted-foreground text-xs ml-2">{page.path}</span>
                                    </SelectItem>
                                    {page.id !== 'home' && onRemovePage && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50 text-muted-foreground hover:text-destructive"
                                            onClick={(e: React.MouseEvent) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onRemovePage(page.id);
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </SelectGroup>
                        {onAddPage && (
                            <>
                                <SelectSeparator />
                                <SelectItem value="NEW_PAGE" className="cursor-pointer text-blue-600 focus:text-blue-700 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Create New Page
                                    </div>
                                </SelectItem>
                            </>
                        )}
                    </SelectContent>
                </Select>
            </div>

            <Dialog open={showAddPage} onOpenChange={setShowAddPage}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Page</DialogTitle>
                        <DialogDescription>
                            Add a new page to your project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                value={newPageName}
                                onChange={(e) => setNewPageName(e.target.value)}
                                placeholder="e.g. About Us"
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="path" className="text-right">Path</Label>
                            <Input
                                id="path"
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
                        <Button variant="outline" onClick={() => setShowAddPage(false)}>Cancel</Button>
                        <Button onClick={handleAddPage} disabled={!newPageName.trim() || !newPagePath.trim() || newPagePath.trim() === '/'}>Create Page</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
