import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../supabase/config/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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
    switchToSignUpText?: string;
    switchToSignUpUrl?: string;
    navigate?: (path: string) => void;
}

export function SignInBlock({
    id,
    title,
    description,
    buttonText,
    redirectUrl,
    isPreview = false,
    userProjectConfig,
    className,
    style,
    switchToSignUpText,
    switchToSignUpUrl,
    navigate
}: SignInBlockProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const displayTitle = title ?? "Sign In";
    const displayDescription = description ?? "Enter your email and password to access your account.";
    const displayButtonText = buttonText ?? "Sign In";
    const displaySwitchText = switchToSignUpText ?? "Sign Up";
    const displaySwitchUrl = switchToSignUpUrl ?? "/sign-up";

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

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

            const { data, error: signInError } = await client.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            setSuccess(true);
            toast.success("Successfully signed in!");

            const targetUrl = redirectUrl || "/";
            if (targetUrl) {
                if (targetUrl.startsWith('/')) {
                    // Handle internal navigation with parameter preservation
                    const url = new URL(targetUrl, window.location.origin);
                    const currentSearchParams = new URLSearchParams(window.location.search);

                    currentSearchParams.forEach((value, key) => {
                        url.searchParams.set(key, value);
                    });

                    if (navigate) {
                        // Use project's navigation if available (best for SPA)
                        navigate(url.pathname + url.search);
                    } else {
                        // Fallback to window.location
                        window.location.href = url.toString();
                    }
                } else {
                    // External URL redirect
                    window.location.href = targetUrl;
                }
            }
        } catch (err: any) {
            console.error('Sign in error:', err);
            setError(err.message || "Sign in failed. Please check your credentials.");
            toast.error("Sign in failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className={`w-full h-full flex flex-col ${className || ''}`} style={style} id={id}>
            <CardHeader className="shrink-0">
                <CardTitle className="text-2xl font-bold">{displayTitle}</CardTitle>
                <CardDescription>{displayDescription}</CardDescription>
                </CardHeader>
            <form onSubmit={handleSignIn} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
                <CardContent className="space-y-4 flex-1 overflow-y-auto min-h-0">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {success && (
                        <Alert className="border-green-500 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 stroke-green-500" />
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>Successfully signed in!</AlertDescription>
                        </Alert>
                    )}
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
                <CardFooter className="shrink-0 mt-auto pt-6 flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={loading || !isPreview}>
                        {loading ? "Signing in..." : displayButtonText}
                    </Button>
                    {displaySwitchText && (
                        <p className="text-sm text-center text-muted-foreground w-full">
                            Don't have an account?{" "}
                            <a
                                href={displaySwitchUrl}
                                className="text-primary hover:underline font-medium"
                                onClick={(e) => {
                                    if (!isPreview) {
                                        e.preventDefault();
                                        return;
                                    }

                                    if (displaySwitchUrl.startsWith('/')) {
                                        e.preventDefault();
                                        const url = new URL(displaySwitchUrl, window.location.origin);
                                        const currentSearchParams = new URLSearchParams(window.location.search);
                                        currentSearchParams.forEach((value, key) => {
                                            url.searchParams.set(key, value);
                                        });

                                        if (navigate) {
                                            navigate(url.pathname + url.search);
                                        } else {
                                            window.location.href = url.toString();
                                        }
                                    } else if (window.location.hostname.includes('localhost')) {
                                        console.log('Navigating to:', displaySwitchUrl);
                                    }
                                }}
                            >
                                {displaySwitchText}
                            </a>
                        </p>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}
