import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/config/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { LogOut, User, Settings, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface MenuItem {
    id: string;
    label: string;
    path: string;
}

interface ProfileBlockProps {
    id: string;
    menuItems?: MenuItem[];
    isPreview?: boolean;
    userProjectConfig?: {
        supabaseUrl: string;
        supabaseKey: string;
    };
    className?: string;
    style?: React.CSSProperties;
    navigate?: (path: string) => void;
}

export function ProfileBlock({
    id,
    menuItems = [],
    isPreview = false,
    userProjectConfig,
    className,
    style,
    navigate
}: ProfileBlockProps) {
    const [user, setUser] = useState<{
        email?: string;
        name?: string;
        avatar_url?: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                let client = supabase;
                if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                    client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
                }

                const { data: { session } } = await client.auth.getSession();
                
                if (session?.user) {
                    setUser({
                        email: session.user.email,
                        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
                        avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
                    });
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('Error fetching user for profile block:', err);
            } finally {
                setLoading(false);
            }
        };

        if (isPreview) {
            fetchUser();
        } else {
            // Placeholder user for editor mode
            setUser({
                email: 'user@example.com',
                name: 'John Doe',
                avatar_url: ''
            });
            setLoading(false);
        }
    }, [isPreview, userProjectConfig]);

    const handleLogout = async () => {
        try {
            let client = supabase;
            if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
            }

            const { error } = await client.auth.signOut();
            if (error) throw error;

            toast.success("Successfully Logged out!");
            
            // Redirect to home after logout
            if (navigate) {
                navigate('/');
            } else {
                window.location.href = '/';
            }
        } catch (err: any) {
            console.error('Logout error:', err);
            toast.error("Logout failed: " + err.message);
        }
    };

    const handleMenuItemClick = (path: string) => {
        if (!isPreview) return;

        if (path.startsWith('/')) {
            // Handle internal navigation with parameter preservation
            const url = new URL(path, window.location.origin);
            const currentSearchParams = new URLSearchParams(window.location.search);

            currentSearchParams.forEach((value, key) => {
                url.searchParams.set(key, value);
            });

            if (navigate) {
                navigate(url.pathname + url.search);
            } else {
                window.location.href = url.toString();
            }
        } else {
            // External URL redirect
            window.location.href = path;
        }
    };

    if (loading) {
        return <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />;
    }

    if (!user && isPreview) {
        return null; // Don't show if not logged in in preview
    }

    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

    return (
        <div id={id} className={className} style={style}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden border">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user?.avatar_url} alt={user?.name || 'User'} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user?.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user?.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {menuItems.map((item) => (
                        <DropdownMenuItem 
                            key={item.id} 
                            onClick={() => handleMenuItemClick(item.path)}
                            className="cursor-pointer"
                        >
                            {item.label === 'Settings' ? <Settings className="mr-2 h-4 w-4" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                            <span>{item.label}</span>
                        </DropdownMenuItem>
                    ))}
                    {menuItems.length > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem 
                        onClick={handleLogout}
                        className="text-red-600 focus:text-red-500 cursor-pointer"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
