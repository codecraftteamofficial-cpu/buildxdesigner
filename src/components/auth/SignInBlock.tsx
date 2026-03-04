import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../supabase/config/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface SignInBlockProps {
    id: string;
    title?: string;
    description?: string;
    buttonText?: string;
    redirectUrl?: string;
    isPreview?: boolean;
    userProjectConfig?: {
        supabaseUrl: string;
        supabaseKey: string;
    };
    className?: string;
    style?: React.CSSProperties;
}

export function SignInBlock({
    id,
    title = "Sign In",
    description = "Enter your email and password to access your account.",
    buttonText = "Sign In",
    redirectUrl = "/",
    isPreview = false,
    userProjectConfig,
    className,
    style
}: SignInBlockProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isPreview) {
            toast.info("Sign in is disabled in the editor. Switch to Preview mode to test.");
            return;
        }

        setLoading(true);

        try {
            let client = supabase;
            if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
            }

            const { data, error } = await client.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success("Successfully signed in!");

            if (redirectUrl) {
                if (redirectUrl.startsWith('/')) {
                    const url = new URL(redirectUrl, window.location.origin);
                    const currentSearchParams = new URLSearchParams(window.location.search);

                    currentSearchParams.forEach((value, key) => {
                        url.searchParams.set(key, value);
                    });

                    window.location.href = url.toString();
                } else {
                    window.location.href = redirectUrl;
                }
            }
        } catch (error: any) {
            console.error('Sign in error:', error);
            toast.error("Sign in failed", {
                description: error.message || "Please check your credentials and try again."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className={`w-full h-full flex flex-col ${className || ''}`} style={style} id={id}>
            <CardHeader className="shrink-0">
                <CardTitle className="text-2xl font-bold">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignIn} autoComplete="off">
                <CardContent className="space-y-4 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-email`}>Email</Label>
                        <Input
                            id={`${id}-email`}
                            type="email"
                            placeholder="you@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading || !isPreview}
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor={`${id}-password`}>Password</Label>
                        </div>
                        <Input
                            id={`${id}-password`}
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading || !isPreview}
                            autoComplete="new-password"
                        />
                    </div>
                </CardContent>
                <CardFooter className="shrink-0 mt-auto pt-6">
                    <Button type="submit" className="w-full" disabled={loading || !isPreview}>
                        {loading ? "Signing in..." : buttonText}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
