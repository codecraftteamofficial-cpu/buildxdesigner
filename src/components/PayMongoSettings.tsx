import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { CreditCard, Eye, EyeOff, Lock } from 'lucide-react';

interface PayMongoSettingsProps {
    apiKey: string;
    onChange: (value: string) => void;
}

export function PayMongoSettings({ apiKey, onChange }: PayMongoSettingsProps) {
    const [showKey, setShowKey] = useState(false);

    return (
        <Card className="border-border">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base">PayMongo Integration</CardTitle>
                            {apiKey && (apiKey.startsWith("sk_") || apiKey.startsWith("pk_")) ? (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                    Configured
                                </span>
                            ) : apiKey ? (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                    Invalid Format
                                </span>
                            ) : null}
                        </div>
                        <CardDescription>
                            Configure your PayMongo API keys for payment processing.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="paymongo-key">Secret Key</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="paymongo-key"
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => onChange(e.target.value)}
                                className="pl-10 pr-10 font-mono text-sm"
                                placeholder="sk_live_..."
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowKey(!showKey)}
                            >
                                {showKey ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Your key is stored securely associated with your account.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
