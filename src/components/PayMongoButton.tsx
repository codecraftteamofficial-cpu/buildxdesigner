import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabase/config/supabaseClient';
import { getApiBaseUrl } from '../utils/apiConfig';

interface PayMongoButtonProps {
    amount: number;
    description: string;
    label?: string;
    currency?: string;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    isPreview?: boolean;
    paymentMethodTypes?: string[];
    projectId?: string;
}

export function PayMongoButton({
    amount,
    description,
    label = "Buy Now",
    currency = "PHP",
    className,
    style,
    disabled,
    isPreview,
    paymentMethodTypes,
    projectId
}: PayMongoButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (disabled) return;

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // If no token, we ONLY allow if we have a projectId (published site)
            if (!token && !projectId) {
                toast.error("Authentication Error", { description: "You must be logged in to test payments in Preview mode." });
                setLoading(false);
                return;
            }

            const apiBase = getApiBaseUrl();

            const response = await fetch(`${apiBase}/api/paymongo/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    amount,
                    description,
                    currency,
                    payment_method_types: paymentMethodTypes,
                    projectId
                })
            });

            let result;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                result = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
            }

            if (!response.ok) {
                throw new Error(result.error || result.details || "Payment failed");
            }

            if (result.data?.attributes?.checkout_url) {
                // Redirect to PayMongo Checkout
                window.open(result.data.attributes.checkout_url, '_blank');
            } else {
                throw new Error("No checkout URL returned by payment provider.");
            }

        } catch (error: any) {
            console.error("Payment Error:", error);
            toast.error("Payment Error", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            className={`flex items-center gap-2 ${className || ''}`}
            style={style}
            onClick={handleCheckout}
            disabled={disabled && !isPreview}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            <span>{label}</span>
            <span className="opacity-80 ml-1">
                {currency} {amount}
            </span>
        </Button>
    );
}
