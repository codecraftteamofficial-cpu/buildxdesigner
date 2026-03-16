import { supabase } from '../config/supabaseClient';
import { User } from '@supabase/supabase-js';


// Define the shape of data fetched from DB and Auth
interface UserProfileData {
    user_id: string;
    fullName: string;
    email: string;
    phone: string;
    location: string;
    joinedDate: string;
    avatarUrl: string | null;
    provider: string;
    isConnected?: number;
    paymongo_key?: string;
    resend_api_key?: string;
}

const AVATAR_BUCKET = 'avatars';

// --- FETCHING DATA ---
export async function fetchUserProfile(): Promise<{ data: UserProfileData | null, error: string | null }> {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
        return { data: null, error: authError?.message || 'User not authenticated.' };
    }

    const user = authData.user;
    const profileUserId = user.id;

    const provider = user.app_metadata.provider || 'email';

    const { data: profileRow, error: dbError } = await supabase
        .from('profiles')
        .select('user_id, full_name, location, avatar_url, email_address, phone_number, isConnected')
        .eq('user_id', profileUserId)
        .single();

    if (dbError && dbError.code !== 'PGRST116') {
        console.error('DB Fetch Error:', dbError.message);
        return { data: null, error: 'Failed to retrieve profile data.' };
    }

    const createdAt = new Date(user.created_at);
    const joinedDate = createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const authMetadata = user.user_metadata as { full_name?: string, paymongo_key?: string, resend_api_key?: string };

    const combinedData: UserProfileData = {
        user_id: profileUserId,
        fullName: profileRow?.full_name || authMetadata.full_name || 'User',
        email: profileRow?.email_address || user.email || '',
        phone: profileRow?.phone_number || user.phone || '',
        joinedDate: joinedDate,
        location: profileRow?.location || '',
        avatarUrl: profileRow?.avatar_url || null,
        provider: provider,
        isConnected: profileRow?.isConnected,
        paymongo_key: authMetadata.paymongo_key || '',
        resend_api_key: authMetadata.resend_api_key || ''
    };

    return { data: combinedData, error: null };
}

// --- UPDATING PROFILE DATA ---
type ProfileUpdateFields = Partial<Omit<UserProfileData, 'user_id' | 'joinedDate' | 'avatarUrl' | 'provider'>> & { paymongoKey?: string, resendApiKey?: string };

export async function updateProfile(data: ProfileUpdateFields & { email?: string, phone?: string }): Promise<{ success: boolean, error: string | null }> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'User not logged in.' };
    }
    const userId = authData.user.id;

    const authUpdates: { data?: { full_name?: string, paymongo_key?: string, resend_api_key?: string }, phone?: string, email?: string } = {};

    if (data.email !== undefined) authUpdates.email = data.email;
    if (data.phone !== undefined) authUpdates.phone = data.phone;

    // Handle metadata updates
    const metadataUpdates: { full_name?: string, paymongo_key?: string, resend_api_key?: string } = {};
    if (data.paymongoKey !== undefined) metadataUpdates.paymongo_key = data.paymongoKey;
    if (data.resendApiKey !== undefined) metadataUpdates.resend_api_key = data.resendApiKey;
    if (data.fullName !== undefined) metadataUpdates.full_name = data.fullName; // Ensure fullName is also updated in metadata if handled

    if (Object.keys(metadataUpdates).length > 0) {
        authUpdates.data = metadataUpdates;
    }

    if (Object.keys(authUpdates).length > 0) {
        const { error: updateAuthError } = await supabase.auth.updateUser(authUpdates);
        if (updateAuthError) {
            return { success: false, error: updateAuthError.message };
        }
    }

    const profileUpdates: { full_name?: string, location?: string, email_address?: string, phone_number?: string } = {};

    if (data.fullName !== undefined) profileUpdates.full_name = data.fullName;
    if (data.location !== undefined) profileUpdates.location = data.location;
    if (data.email !== undefined) profileUpdates.email_address = data.email;
    if (data.phone !== undefined) profileUpdates.phone_number = data.phone;

    if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('user_id', userId)
            .select();

        if (profileError) {
            return { success: false, error: profileError.message };
        }
    }

    return { success: true, error: null };
}

// --- NEW: CHANGE PASSWORD FUNCTION ---
export async function changePassword(newPassword: string): Promise<{ success: boolean, error: string | null }> {

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}


// --- AVATAR STORAGE FUNCTIONS ---
export async function uploadAvatar(file: File): Promise<{ url: string | null, error: string | null }> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
        return { url: null, error: authError?.message || 'User not authenticated.' };
    }
    const userId = authData.user.id;

    const fileExtension = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExtension}`;

    // Upload new file, replacing if one exists
    const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        return { url: null, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update the profile table with the new URL
    const { error: urlUpdateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId)
        .select();

    if (urlUpdateError) {
        return { url: null, error: urlUpdateError.message };
    }

    return { url: publicUrl, error: null };
}
