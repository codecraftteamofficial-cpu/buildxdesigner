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

interface AuthBlockProps {
    id: string;
    initialMode?: 'signin' | 'signup';
    signInTitle?: string;
    signInDescription?: string;
    signInButtonText?: string;
    signUpTitle?: string;
    signUpDescription?: string;
    signUpButtonText?: string;
    redirectUrl?: string;
    extraFields?: ExtraField[];
    isPreview?: boolean;
    userProjectConfig?: {
        supabaseUrl: string;
        supabaseKey: string;
    };
    className?: string;
    style?: React.CSSProperties;
    navigate?: (path: string) => void;
}

export function AuthBlock({
    id,
    initialMode = 'signin',
    signInTitle,
    signInDescription,
    signInButtonText,
    signUpTitle,
    signUpDescription,
    signUpButtonText,
    redirectUrl,
    extraFields = [],
    isPreview = false,
    userProjectConfig,
    className,
    style,
    navigate
}: AuthBlockProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Sync mode with prop change (important for editor experience)
    React.useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const [extraValues, setExtraValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const isSignIn = mode === 'signin';

    const displayTitle = isSignIn 
        ? (signInTitle ?? "Sign In") 
        : (signUpTitle ?? "Sign Up");
    
    const displayDescription = isSignIn 
        ? (signInDescription ?? "Enter your email and password to access your account.") 
        : (signUpDescription ?? "Create a new account by filling out the form below.");
    
    const displayButtonText = isSignIn 
        ? (signInButtonText ?? "Sign In") 
        : (signUpButtonText ?? "Sign Up");

    const handleInputChange = (name: string, value: string) => {
        setExtraValues(prev => ({ ...prev, [name]: value }));
    };

    const toggleMode = (e: React.MouseEvent) => {
        e.preventDefault();
        setMode(prev => prev === 'signin' ? 'signup' : 'signin');
        setError(null);
        setSuccessMsg(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (!isPreview) {
            toast.info(`${isSignIn ? 'Sign in' : 'Sign up'} is disabled in the editor. Switch to Preview mode to test.`);
            return;
        }

        setLoading(true);

        try {
            let client = supabase;
            if (userProjectConfig?.supabaseUrl && userProjectConfig?.supabaseKey) {
                client = createClient(userProjectConfig.supabaseUrl, userProjectConfig.supabaseKey);
            }

            if (isSignIn) {
                const { error: signInError } = await client.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;

                setSuccessMsg("Successfully signed in!");
                toast.success("Successfully signed in!");
            } else {
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
                }
            }

            // Redirect on success
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
        } catch (err: any) {
            console.error(`${mode} error:`, err);
            setError(err.message || `${isSignIn ? 'Sign in' : 'Sign up'} failed. Please check your information.`);
            toast.error(`${isSignIn ? 'Sign in' : 'Sign up'} failed`);
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
            <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
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
                            placeholder='your password'
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading || !isPreview}
                            autoComplete="new-password"
                        />
                    </div>

                    {!isSignIn && extraFields && extraFields.map((field, index) => (
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
                        {loading ? "Processing..." : displayButtonText}
                    </Button>
                    <p className="text-sm text-center text-muted-foreground w-full">
                        {isSignIn ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-primary hover:underline font-medium bg-transparent border-none p-0 cursor-pointer"
                            disabled={loading}
                        >
                            {isSignIn ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}
