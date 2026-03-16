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

interface ExtraField {
    name: string;
    label: string;
    type: string;
    required: boolean;
}

interface SignUpBlockProps {
    id: string;
    title?: string;
    description?: string;
    buttonText?: string;
    redirectUrl?: string;
    extraFields?: ExtraField[];
    isPreview?: boolean;
    userProjectConfig?: {
        supabaseUrl: string;
        supabaseKey: string;
    };
    className?: string;
    style?: React.CSSProperties;
    switchToSignInText?: string;
    switchToSignInUrl?: string;
    navigate?: (path: string) => void;
}

export function SignUpBlock({
    id,
    title,
    description,
    buttonText,
    redirectUrl,
    extraFields = [],
    isPreview = false,
    userProjectConfig,
    className,
    style,
    switchToSignInText,
    switchToSignInUrl,
    navigate
}: SignUpBlockProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [extraValues, setExtraValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const displayTitle = title ?? "Sign Up";
    const displayDescription = description ?? "Create a new account by filling out the form below.";
    const displayButtonText = buttonText ?? "Sign Up";
    const displaySwitchText = switchToSignInText ?? "Sign In";
    const displaySwitchUrl = switchToSignInUrl ?? "/sign-in";

    const handleInputChange = (name: string, value: string) => {
        setExtraValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (!isPreview) {
            toast.info("Sign up is disabled in the editor. Switch to Preview mode to test.");
            return;
        }

        setLoading(true);

        try {
            let client = supabase;
            if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
            }

            const { data, error: signUpError } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: extraValues,
                    emailRedirectTo: window.location.origin + window.location.pathname,
                }
            });

            if (signUpError) throw signUpError;

            if (data?.user?.identities?.length === 0 || (data?.user && !data.session)) {
                const checkEmailMsg = "Check your email! We've sent a confirmation link to your email address.";
                setSuccessMsg(checkEmailMsg);
                toast.success("Check your email!", {
                    description: "We've sent a confirmation link to your email address. Please click it to verify your account."
                });
                return;
            } else {
                setSuccessMsg("Successfully signed up!");
                toast.success("Successfully signed up!");
                
                const targetUrl = redirectUrl || "/";
                if (targetUrl) {
                    if (targetUrl.startsWith('/')) {
                        const url = new URL(targetUrl, window.location.origin);
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
                        window.location.href = targetUrl;
                    }
                }
            }
        } catch (err: any) {
            console.error('Sign up error:', err);
            setError(err.message || "Sign up failed. Please check your information.");
            toast.error("Sign up failed");
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
            <form onSubmit={handleSignUp} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
                <CardContent className="space-y-4 flex-1 overflow-y-auto min-h-0">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {successMsg && (
                        <Alert className="border-green-500 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 stroke-green-500" />
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>{successMsg}</AlertDescription>
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
                        <Label htmlFor={`${id}-password`}>Password</Label>
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

                    {extraFields && extraFields.map((field, index) => (
                        <div key={`${field.name}-${index}`} className="space-y-2">
                            <Label htmlFor={`${id}-${field.name}`}>
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </Label>
                            <Input
                                id={`${id}-${field.name}`}
                                type={field.type || "text"}
                                required={field.required}
                                value={extraValues[field.name] || ''}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                disabled={loading || !isPreview}
                                autoComplete="off"
                            />
                        </div>
                    ))}

                </CardContent>
                <CardFooter className="shrink-0 mt-auto pt-6 flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={loading || !isPreview}>
                        {loading ? "Signing up..." : displayButtonText}
                    </Button>
                    {displaySwitchText && (
                        <p className="text-sm text-center text-muted-foreground w-full">
                            Already have an account?{" "}
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
