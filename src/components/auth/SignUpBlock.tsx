import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../supabase/config/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
}

export function SignUpBlock({
    id,
    title = "Sign Up",
    description = "Create a new account by filling out the form below.",
    buttonText = "Sign Up",
    redirectUrl = "/",
    extraFields = [],
    isPreview = false,
    userProjectConfig,
    className,
    style
}: SignUpBlockProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [extraValues, setExtraValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const handleInputChange = (name: string, value: string) => {
        setExtraValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

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

            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: extraValues,
                    emailRedirectTo: window.location.origin + window.location.pathname,
                }
            });

            if (error) throw error;

            if (data?.user?.identities?.length === 0 || (data?.user && !data.session)) {
                toast.success("Check your email!", {
                    description: "We've sent a confirmation link to your email address. Please click it to verify your account."
                });
                return;
            } else {
                toast.success("Successfully signed up!");
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                }
            }
        } catch (error: any) {
            console.error('Sign up error:', error);
            toast.error("Sign up failed", {
                description: error.message || "Please check your information and try again."
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
            <form onSubmit={handleSignUp} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
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
                <CardFooter className="shrink-0 mt-auto pt-6">
                    <Button type="submit" className="w-full" disabled={loading || !isPreview}>
                        {loading ? "Signing up..." : buttonText}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
