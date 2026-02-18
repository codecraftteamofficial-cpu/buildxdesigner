import { supabase, SupabaseAuthError, SupabaseProvider } from '../config/supabaseClient';


interface AuthOperationResult {
    success: boolean;
    message?: string;
    url?: string;
    error?: SupabaseAuthError;
}

// --- CORE AUTHENTICATION FUNCTIONS ---

// Function for Google Sign-In
export async function initiateGoogleSignIn(redirectPath: string = '/dashboard'): Promise<AuthOperationResult> {

    const baseUrl = window.location.origin;

    const fullRedirectUrl = baseUrl + redirectPath;
    console.log('[Auth Debug] Redirecting to:', fullRedirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google' as SupabaseProvider,
        options: {
            redirectTo: fullRedirectUrl,
        },
    });

    if (error) {
        console.error('Supabase OAuth initiation error:', error.message);
        return { success: false, error: error };
    }

    return { success: true, url: data.url };
}


// Function for Email Sign-Up
export async function signUpWithEmail(email: string, password: string, name: string = ''): Promise<AuthOperationResult> {

    const userData = name ? { full_name: name } : {};

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: userData,
        }
    });

    if (error) {
        console.error('Supabase Sign Up error:', error.message);
        return { success: false, error: error };
    }

    if (data.user && !data.session) {
        return {
            success: true,
            message: 'Sign-up successful! Check your email to confirm your account.'
        };
    }

    return { success: true, message: 'Sign-up successful!' };
}


// Function for Email Sign-In
export async function signInWithEmail(email: string, password: string): Promise<AuthOperationResult> {
    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Supabase Sign In error:', error.message);
        return { success: false, error: error };
    }

    return { success: true, message: 'Login successful.' };
}


// Function to send the OTP (verification code)
export async function sendPhoneOtp(phone: string, type: 'signup' | 'signin'): Promise<AuthOperationResult> {

    const shouldCreate = type === 'signup';

    const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
            shouldCreateUser: shouldCreate,
        },
    });

    if (error) {
        console.error('Supabase Send OTP error:', error.message);
        return { success: false, error: error };
    }
    return { success: true, message: 'OTP sent successfully.' };
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<AuthOperationResult> {
    const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token,
        type: 'sms',
    });
    if (error) {
        console.error('Supabase Verify OTP error:', error.message);
        return { success: false, error: error };
    }
    return { success: true, message: 'Verification successful.' };
}

// Function to update user metadata (e.g., full name)
export async function updateUserName(name: string): Promise<AuthOperationResult> {
    const { data, error } = await supabase.auth.updateUser({
        data: { full_name: name }
    });

    if (error) {
        console.error('Supabase Update User Error:', error.message);
        return { success: false, error: error };
    }
    return { success: true, message: 'User metadata updated.' };
}


// Function to get current session
export async function getSupabaseSession() {
    return supabase.auth.getSession();
}


// Function for Sign-Out
export async function signOut(): Promise<boolean> {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error.message);
        return false;
    }
    return true;
}
