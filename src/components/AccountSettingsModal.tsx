import React, { useState, useEffect } from 'react';
import {
    X,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Shield,
    Bell,
    Lock,
    Camera,
    Save,
    Upload,
    Loader2,
    ArrowRight,
    Database,
    CreditCard
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { getSupabaseSession } from '../supabase/auth/authService';
import { supabase } from '../supabase/config/supabaseClient';
import { changePassword } from '../supabase/data/userProfile';
import { fetchUserProfile, updateProfile, uploadAvatar } from '../supabase/data/userProfile';
import { PayMongoSettings } from './PayMongoSettings';
import { getApiBaseUrl } from '../utils/apiConfig';

interface ProfileDataState {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    joinedDate: string;
    avatarUrl: string | null;
    provider: string;
    isConnected?: number;
    paymongo_key?: string;
}

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: string;
}

export function AccountSettingsModal({ isOpen, onClose, defaultTab = "profile" }: AccountSettingsModalProps) {
    const [profileData, setProfileData] = useState<ProfileDataState>({
        fullName: '',
        email: '',
        phone: '',
        location: '',
        joinedDate: '',
        avatarUrl: null,
        provider: 'email',
        isConnected: 0,
        paymongo_key: ''
    });
    const [initialData, setInitialData] = useState<ProfileDataState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Mock state for other tabs (notifications, security)
    const [notifications, setNotifications] = useState({ emailNotifications: true, projectUpdates: true, weeklyDigest: false, marketingEmails: false });
    const [security, setSecurity] = useState({ twoFactorAuth: false, loginAlerts: true });

    // State for password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isPasswordChanging, setIsPasswordChanging] = useState(false);

    const [isConnectingSupabase, setIsConnectingSupabase] = useState(false);
    const [isDisconnectingSupabase, setIsDisconnectingSupabase] = useState(false);

    // --- Data Fetching Effect ---
    useEffect(() => {
        if (!isOpen) return;

        async function loadProfile() {
            setIsLoading(true);
            setError(null);

            const { data, error } = await fetchUserProfile();

            if (error || !data) {
                setError(error || "Could not load user data.");
            } else {
                setProfileData({
                    ...data,
                    paymongo_key: data.paymongo_key || ''
                });
                setInitialData({
                    ...data,
                    paymongo_key: data.paymongo_key || ''
                });
                // Clear password fields on modal open
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            }
            setIsLoading(false);
        }
        loadProfile();
    }, [isOpen]);

    // Safety effect to ensure pointer events are restored when dialog closes abruptly
    useEffect(() => {
        if (!isOpen) {
            // Force remove Radix UI locks
            document.body.style.pointerEvents = '';
            document.body.removeAttribute('data-scroll-locked');
        }
        return () => {
            document.body.style.pointerEvents = '';
            document.body.removeAttribute('data-scroll-locked');
        };
    }, [isOpen]);

    // Check if the user is a social login user (e.g., 'google', 'github', 'discord')
    const isSocialLogin = profileData.provider !== 'email';

    // --- Change Tracking ---
    const hasChanges = JSON.stringify(profileData) !== JSON.stringify(initialData);

    // --- Handlers (Profile, Avatar) ---
    const handleInputChange = (field: keyof ProfileDataState, value: string) => {
        setProfileData(prev => ({ ...prev, [field]: value }));
        setError(null);
        setSuccessMessage(null);
    };

    const handleSaveProfile = async () => {
        if (!hasChanges) return;

        setIsSaving(true);
        setError(null);

        // Prepare data for update (omitting provider, joinedDate, user_id, etc. which are not directly editable here)
        const updates: any = {};
        if (profileData.fullName !== initialData?.fullName) updates.fullName = profileData.fullName;
        if (profileData.email !== initialData?.email) updates.email = profileData.email;
        if (profileData.phone !== initialData?.phone) updates.phone = profileData.phone;
        if (profileData.location !== initialData?.location) updates.location = profileData.location;
        if (profileData.paymongo_key !== initialData?.paymongo_key) updates.paymongoKey = profileData.paymongo_key;

        const { error } = await updateProfile(updates);

        if (error) {
            setError(error);
        } else {
            setSuccessMessage("Profile updated successfully!");
            setInitialData({ ...profileData });
        }
        setIsSaving(false);
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !initialData) return;

        setUploading(true);
        setError(null);

        const { url, error } = await uploadAvatar(file);

        if (error) {
            setError(`Upload failed: ${error}`);
        } else if (url) {
            setProfileData(prev => ({ ...prev, avatarUrl: url }));
            setInitialData(prev => prev ? ({ ...prev, avatarUrl: url }) : null);
            setSuccessMessage("Profile picture updated!");
        }
        setUploading(false);
    };

    // --- Handler (Change Password) ---
    const handleChangePassword = async () => {
        setError(null);
        setSuccessMessage(null);

        if (isSocialLogin) {
            setError("Password cannot be changed. You signed in with a social account.");
            return;
        }

        if (!currentPassword) {
            setError("Please enter your current password.");
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setError("New password must be at least 6 characters long.");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (currentPassword === newPassword) {
            setError("New password cannot be the same as the current password.");
            return;
        }

        setIsPasswordChanging(true);

        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: profileData.email,
            password: currentPassword,
        });

        if (reauthError) {
            setIsPasswordChanging(false);
            setError(`Current password is incorrect. (${reauthError.message})`);
            return;
        }

        const { error: updateError } = await changePassword(newPassword);

        setIsPasswordChanging(false);

        if (updateError) {
            setError(updateError);
        } else {
            setSuccessMessage("Password updated successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        }
    };

    // Fallback for avatar display
    const getAvatarFallback = () => {
        return profileData.fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    };


    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                // Force remove Radix UI locks immediately on close request
                document.body.style.pointerEvents = '';
                document.body.removeAttribute('data-scroll-locked');
                onClose();
            }
        }}>
            <DialogContent
                className="max-w-3xl max-h-[85vh] overflow-hidden p-0"
                onInteractOutside={(e) => {
                    // Prevent default Radix behavior that might re-lock the screen
                    document.body.style.pointerEvents = '';
                    document.body.removeAttribute('data-scroll-locked');
                }}
            >
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                    <DialogTitle>Account Settings</DialogTitle>
                    <DialogDescription className="sr-only">
                        Manage your BuildX account settings and integrations.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="w-full justify-start px-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                        <TabsTrigger
                            value="profile"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
                        >
                            <User className="w-4 h-4 mr-2" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger
                            value="notifications"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Security
                        </TabsTrigger>
                        <TabsTrigger
                            value="integration"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
                        >
                            <Database className="w-4 h-4 mr-2" />
                            Integrations
                        </TabsTrigger>
                    </TabsList>

                    <div className="overflow-y-auto max-h-[calc(85vh-180px)] px-6 py-6">

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                                <p>Loading user profile...</p>
                            </div>
                        ) : (
                            <>
                                {/* Global Status Messages */}
                                {error && (
                                    <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-400 rounded">
                                        Error: {error}
                                    </div>
                                )}
                                {successMessage && (
                                    <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 border border-green-400 rounded">
                                        {successMessage}
                                    </div>
                                )}

                                {/* Profile Tab (Content untouched) */}
                                <TabsContent value="profile" className="mt-0">
                                    <div className="space-y-6">
                                        {/* Avatar Section */}
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <Avatar className="h-24 w-24 ring-4 ring-blue-500/20">
                                                    <AvatarImage src={profileData.avatarUrl || undefined} alt="Profile" />
                                                    <AvatarFallback className="bg-linear-to-br from-blue-600 to-violet-600 text-white text-2xl">
                                                        {getAvatarFallback()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {/* File Input Trigger */}
                                                <input
                                                    type="file"
                                                    id="avatar-upload"
                                                    accept="image/*"
                                                    hidden
                                                    onChange={handleAvatarUpload}
                                                    disabled={uploading}
                                                />
                                                <Label
                                                    htmlFor="avatar-upload"
                                                    className="absolute bottom-0 right-0 cursor-pointer rounded-full h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors"
                                                >
                                                    {uploading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                    ) : (
                                                        <Camera className="w-4 h-4 text-white" />
                                                    )}
                                                </Label>
                                            </div>
                                            <div>
                                                <h3 className="text-foreground mb-1">Profile Picture</h3>
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    Update your profile picture
                                                </p>
                                                <Label htmlFor="avatar-upload">
                                                    <Button variant="outline" size="sm" asChild>
                                                        {uploading ? "Uploading..." : "Upload New Photo"}
                                                    </Button>
                                                </Label>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Personal Information */}
                                        <div className="space-y-4">
                                            <h3 className="text-foreground">Personal Information</h3>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="fullName">Full Name</Label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                                        <Input
                                                            id="fullName"
                                                            value={profileData.fullName}
                                                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                                                            className="pl-10"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email Address</Label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                                        <Input
                                                            id="email"
                                                            type="email"
                                                            value={profileData.email}
                                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                                            className="pl-10"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="phone">Phone Number</Label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                                        <Input
                                                            id="phone"
                                                            value={profileData.phone}
                                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                                            className="pl-10"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="location">Location</Label>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                                        <Input
                                                            id="location"
                                                            value={profileData.location}
                                                            onChange={(e) => handleInputChange('location', e.target.value)}
                                                            className="pl-10"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">
                                                    Joined {profileData.joinedDate}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Notifications Tab (Content untouched) */}
                                <TabsContent value="notifications" className="mt-0">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-foreground mb-1">Email Notifications</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Manage how you receive notifications
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Email Notifications Card */}
                                            <Card className="border-border">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <Label>Email Notifications</Label>
                                                            <p className="text-sm text-muted-foreground">
                                                                Receive notifications via email
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={notifications.emailNotifications}
                                                            onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Project Updates Card */}
                                            <Card className="border-border">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <Label>Project Updates</Label>
                                                            <p className="text-sm text-muted-foreground">
                                                                Get notified about project changes and updates
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={notifications.projectUpdates}
                                                            onCheckedChange={(checked) => setNotifications({ ...notifications, projectUpdates: checked })}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Weekly Digest Card */}
                                            <Card className="border-border">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <Label>Weekly Digest</Label>
                                                            <p className="text-sm text-muted-foreground">
                                                                Receive a weekly summary of your activity
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={notifications.weeklyDigest}
                                                            onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyDigest: checked })}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Marketing Emails Card */}
                                            <Card className="border-border">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <Label>Marketing Emails</Label>
                                                            <p className="text-sm text-muted-foreground">
                                                                Receive updates about new features and offers
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={notifications.marketingEmails}
                                                            onCheckedChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Security Tab (WITH CHANGE PASSWORD LOGIC) */}
                                <TabsContent value="security" className="mt-0">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-foreground mb-1">Security Settings</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Manage your account security preferences
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Two-Factor Authentication Card (Mocked) */}
                                            <Card className="border-border">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <Lock className="w-4 h-4 text-blue-500" />
                                                                <Label>Two-Factor Authentication</Label>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Add an extra layer of security to your account
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={security.twoFactorAuth}
                                                            onCheckedChange={(checked) => setSecurity({ ...security, twoFactorAuth: checked })}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Login Alerts Card (Mocked) */}
                                            <Card className="border-border">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <Shield className="w-4 h-4 text-green-500" />
                                                                <Label>Login Alerts</Label>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Get notified of new login attempts
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={security.loginAlerts}
                                                            onCheckedChange={(checked) => setSecurity({ ...security, loginAlerts: checked })}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* CHANGE PASSWORD CARD (CONDITIONAL) */}
                                            <Card className="border-border">
                                                <CardHeader>
                                                    <CardTitle>Change Password</CardTitle>
                                                    <CardDescription>
                                                        {isSocialLogin
                                                            ? `You signed up with your ${profileData.provider} account. To change your password, you must use their security portal.`
                                                            : "Update your password to keep your account secure."}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">

                                                    {isSocialLogin ? (
                                                        <a
                                                            href="https://myaccount.google.com/security"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center space-x-2 text-blue-500 hover:text-blue-600 transition-colors"
                                                        >
                                                            <span>Go to {profileData.provider} Security Settings</span>
                                                            <ArrowRight className="w-4 h-4" />
                                                        </a>
                                                    ) : (
                                                        // Password Inputs for Email/Password users
                                                        <>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="currentPassword">Current Password</Label>
                                                                <Input
                                                                    id="currentPassword"
                                                                    type="password"
                                                                    placeholder="Enter current password"
                                                                    value={currentPassword}
                                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                                    disabled={isPasswordChanging}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="newPassword">New Password</Label>
                                                                <Input
                                                                    id="newPassword"
                                                                    type="password"
                                                                    placeholder="Enter new password"
                                                                    value={newPassword}
                                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                                    disabled={isPasswordChanging}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                                                <Input
                                                                    id="confirmPassword"
                                                                    type="password"
                                                                    placeholder="Confirm new password"
                                                                    value={confirmNewPassword}
                                                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                                    disabled={isPasswordChanging}
                                                                    required
                                                                />
                                                            </div>
                                                            <Button
                                                                className="w-full bg-blue-600 hover:bg-blue-700"
                                                                onClick={handleChangePassword}
                                                                disabled={isPasswordChanging}
                                                            >
                                                                {isPasswordChanging ? (
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                ) : (
                                                                    "Update Password"
                                                                )}
                                                            </Button>
                                                        </>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Integration Tab (NEW) */}
                                <TabsContent value="integration" className="mt-0">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-foreground mb-1">Integrations</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Manage your external service connections
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {/* PayMongo Integration */}
                                            <PayMongoSettings
                                                apiKey={profileData.paymongo_key || ''}
                                                onChange={(value) => handleInputChange('paymongo_key', value)}
                                            />

                                            {/* Supabase Integration Card */}
                                            <Card className="border-border">
                                                <CardContent className="pt-6">
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full shrink-0">
                                                                <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-semibold text-foreground">Supabase</h4>
                                                                    {profileData.isConnected === 1 && (
                                                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                                            Connected
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground max-w-[300px]">
                                                                    Connect your Supabase account to access your organizations and projects directly.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {profileData.isConnected === 1 ? (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="shrink-0"
                                                                disabled={isDisconnectingSupabase}
                                                                onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setIsDisconnectingSupabase(true);
                                                                    try {
                                                                        const { data: { user } } = await supabase.auth.getUser();
                                                                        if (user) {
                                                                            await supabase
                                                                                .from("profiles")
                                                                                .update({ isConnected: 0 })
                                                                                .eq("user_id", user.id);
                                                                        }
                                                                        // Clear local storage items related to Supabase
                                                                        localStorage.removeItem("supabase_integration_token");
                                                                        localStorage.removeItem("target_supabase_url");
                                                                        localStorage.removeItem("target_supabase_key");

                                                                        window.location.reload();
                                                                    } catch (err) {
                                                                        console.error("Failed to disconnect:", err);
                                                                        setIsDisconnectingSupabase(false);
                                                                    }
                                                                }}
                                                            >
                                                                {isDisconnectingSupabase ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        Disconnecting...
                                                                    </>
                                                                ) : (
                                                                    "Disconnect"
                                                                )}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                className="bg-success border text-black shrink-0"
                                                                disabled={isConnectingSupabase}
                                                                onClick={() => {
                                                                    setIsConnectingSupabase(true);
                                                                    const backendBase = getApiBaseUrl();
                                                                    window.location.href = `${backendBase}/api/auth/supabase`;
                                                                }}
                                                            >
                                                                {isConnectingSupabase ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        Connecting...
                                                                    </>
                                                                ) : (
                                                                    <>Connect Supabase</>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>
                            </>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                        <Button variant="outline" onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            document.body.style.pointerEvents = '';
                            document.body.removeAttribute('data-scroll-locked');
                            onClose();
                        }}>
                            Close
                        </Button>
                        <Button
                            onClick={handleSaveProfile}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!hasChanges || isSaving || isLoading}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
