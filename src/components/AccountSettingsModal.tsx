import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Save,
  Upload,
  Loader2,
  Database,
  CreditCard,
  Eye,
  ArrowRight,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

import { Separator } from "./ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { getSupabaseSession } from "../supabase/auth/authService";

import {
  fetchUserProfile,
  updateProfile,
  uploadAvatar,
} from "../supabase/data/userProfile";
import { PayMongoSettings } from "./PayMongoSettings";
import { getBackendUrl } from "../utils/backendConfig";
import { supabase } from "../supabase/config/supabaseClient";
import { sendPasswordResetEmail } from "../utils/apiHelper";

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
  resend_api_key?: string;
}

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  defaultTab = "profile",
}: AccountSettingsModalProps) {
  const supportedTabs = new Set(["profile", "integration"]);
  const activeTab = supportedTabs.has(defaultTab) ? defaultTab : "profile";
  const [profileData, setProfileData] = useState<ProfileDataState>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    joinedDate: "",
    avatarUrl: null,
    provider: "email",
    isConnected: 0,
    paymongo_key: "",
    resend_api_key: "",
  });
  const [initialData, setInitialData] = useState<ProfileDataState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isConnectingSupabase, setIsConnectingSupabase] = useState(false);
  const [isDisconnectingSupabase, setIsDisconnectingSupabase] = useState(false);
  const [showResendApiKey, setShowResendApiKey] = useState(false);

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
          paymongo_key: data.paymongo_key || "",
          resend_api_key: data.resend_api_key || "",
        });
        setInitialData({
          ...data,
          paymongo_key: data.paymongo_key || "",
          resend_api_key: data.resend_api_key || "",
        });
      }
      setIsLoading(false);
    }
    loadProfile();
  }, [isOpen]);

  // Safety effect to ensure pointer events are restored when dialog closes abruptly
  useEffect(() => {
    if (!isOpen) {
      // Force remove Radix UI locks
      document.body.style.pointerEvents = "";
      document.body.removeAttribute("data-scroll-locked");
    }
    return () => {
      document.body.style.pointerEvents = "";
      document.body.removeAttribute("data-scroll-locked");
    };
  }, [isOpen]);

  // --- Change Tracking ---
  const hasChanges =
    JSON.stringify(profileData) !== JSON.stringify(initialData);

  // --- Handlers (Profile, Avatar) ---
  const handleInputChange = (field: keyof ProfileDataState, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSaveProfile = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);

    // Prepare data for update (omitting provider, joinedDate, user_id, etc. which are not directly editable here)
    const updates: any = {};
    if (profileData.fullName !== initialData?.fullName)
      updates.fullName = profileData.fullName;

    if (profileData.phone !== initialData?.phone)
      updates.phone = profileData.phone;
    if (profileData.location !== initialData?.location)
      updates.location = profileData.location;
    if (profileData.paymongo_key !== initialData?.paymongo_key)
      updates.paymongoKey = profileData.paymongo_key;
    if (profileData.resend_api_key !== initialData?.resend_api_key)
      updates.resendApiKey = profileData.resend_api_key;

    const { error } = await updateProfile(updates);

    if (error) {
      setError(error);
    } else {
      setSuccessMessage("Profile updated successfully!");
      setInitialData({ ...profileData });
      // Sync resend API key to localStorage so the editor state picks it up
      if (profileData.resend_api_key) {
        localStorage.setItem(
          "target_resend_api_key",
          profileData.resend_api_key,
        );
      } else {
        localStorage.removeItem("target_resend_api_key");
      }
      // Notify editor state of config change
      window.dispatchEvent(
        new CustomEvent("userProjectConfigUpdated", {
          detail: { 
            resendApiKey: profileData.resend_api_key || "",
            paymongoKey: profileData.paymongo_key || "",  // ← add
          },
        }),
      );
    }
    setIsSaving(false);
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !initialData) return;

    setUploading(true);
    setError(null);

    const { url, error } = await uploadAvatar(file);

    if (error) {
      setError(`Upload failed: ${error}`);
    } else if (url) {
      setProfileData((prev) => ({ ...prev, avatarUrl: url }));
      setInitialData((prev) => (prev ? { ...prev, avatarUrl: url } : null));
      setSuccessMessage("Profile picture updated!");
    }
    setUploading(false);
  };

  // Fallback for avatar display
  const getAvatarFallback = () => {
    return (
      profileData.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  const isSocialLogin = profileData.provider !== "email";

  const [isPasswordResetSending, setIsPasswordResetSending] = useState(false);

  const handleSendPasswordReset = async () => {
    setError(null);
    setSuccessMessage(null);

    if (isSocialLogin) {
      setError(
        "Password cannot be changed here because this account uses social sign-in.",
      );
      return;
    }

    setIsPasswordResetSending(true);

    const { error } = await sendPasswordResetEmail(profileData.email);

    setIsPasswordResetSending(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage(
        "Password reset link sent. Please check your inbox and spam folder.",
      );
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Force remove Radix UI locks immediately on close request
          document.body.style.pointerEvents = "";
          document.body.removeAttribute("data-scroll-locked");
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-3xl max-h-[85vh] overflow-hidden p-0"
        onInteractOutside={(e) => {
          // Prevent default Radix behavior that might re-lock the screen
          document.body.style.pointerEvents = "";
          document.body.removeAttribute("data-scroll-locked");
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Manage your BuildX account settings and integrations.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="w-full justify-start px-6 bg-transparent border-b border-border rounded-none h-auto p-0">
            <TabsTrigger
              value="profile"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
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
                          <AvatarImage
                            src={profileData.avatarUrl || undefined}
                            alt="Profile"
                          />
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
                        <h3 className="text-foreground mb-1">
                          Profile Picture
                        </h3>
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
                              onChange={(e) =>
                                handleInputChange("fullName", e.target.value)
                              }
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
                              className="pl-10"
                              required
                              readOnly
                              disabled
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Email address can't be changed.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              id="phone"
                              value={profileData.phone}
                              onChange={(e) =>
                                handleInputChange("phone", e.target.value)
                              }
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
                              onChange={(e) =>
                                handleInputChange("location", e.target.value)
                              }
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
                              <span>
                                Go to {profileData.provider} Security Settings
                              </span>
                              <ArrowRight className="w-4 h-4" />
                            </a>
                          ) : (
                            // Password Inputs for Email/Password users
                            <>
                              <p className="text-sm text-muted-foreground">
                                We’ll send a secure password reset link to:
                                <span className="ml-1 font-medium text-foreground">
                                  {profileData.email}
                                </span>
                              </p>

                              <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleSendPasswordReset}
                                disabled={isPasswordResetSending}
                              >
                                {isPasswordResetSending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending Reset Link...
                                  </>
                                ) : (
                                  "Send Password Reset Link"
                                )}
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Integration Tab */}
                <TabsContent
                  value="integration"
                  className="mt-0"
                  data-tour="integration-settings"
                >
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-foreground mb-1">Integrations</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage your external service connections
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* PayMongo Integration */}
                      <div data-tour="paymongo-integration">
                        <PayMongoSettings
                          apiKey={profileData.paymongo_key || ""}
                          onChange={(value) =>
                            handleInputChange("paymongo_key", value)
                          }
                        />
                      </div>

                      {/* Resend Integration Card */}
                      <Card className="border-border">
                        <CardContent className="pt-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-full shrink-0">
                                <Mail className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground">
                                    Resend
                                  </h4>
                                  {profileData.resend_api_key &&
                                  profileData.resend_api_key.startsWith(
                                    "re_",
                                  ) ? (
                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                      Configured
                                    </span>
                                  ) : profileData.resend_api_key ? (
                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                      Invalid Format
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-muted-foreground max-w-[300px]">
                                  Modern email infrastructure for developers.
                                  Used for sending transactional emails.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            <Label htmlFor="resend-api-key" className="text-xs">
                              API Key
                            </Label>
                            <div className="relative">
                              <Input
                                id="resend-api-key"
                                type={showResendApiKey ? "text" : "password"}
                                placeholder="re_123456789..."
                                value={profileData.resend_api_key || ""}
                                onChange={(e) =>
                                  handleInputChange(
                                    "resend_api_key",
                                    e.target.value,
                                  )
                                }
                                className={`pr-10 ${profileData.resend_api_key && !profileData.resend_api_key.startsWith("re_") ? "border-amber-500" : ""}`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowResendApiKey(!showResendApiKey)
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showResendApiKey ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Required for contact forms to send emails. Keys
                              start with <code>re_</code>.
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Supabase Integration Card */}
                      <Card
                        className="border-border"
                        data-tour="supabase-connection"
                      >
                        <CardContent className="pt-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full shrink-0">
                                <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground">
                                    Supabase
                                  </h4>
                                  {profileData.isConnected === 1 && (
                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                      Connected
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground max-w-[300px]">
                                  Connect your Supabase account to access your
                                  organizations and projects directly.
                                </p>
                              </div>
                            </div>

                            {profileData.isConnected === 1 ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="shrink-0"
                                disabled={isDisconnectingSupabase}
                                onClick={async (
                                  e: React.MouseEvent<HTMLButtonElement>,
                                ) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsDisconnectingSupabase(true);
                                  try {
                                    const {
                                      data: { user },
                                    } = await supabase.auth.getUser();
                                    if (user) {
                                      await supabase
                                        .from("profiles")
                                        .update({ isConnected: 0 })
                                        .eq("user_id", user.id);
                                    }
                                    // Clear local storage items related to Supabase
                                    localStorage.removeItem(
                                      "supabase_integration_token",
                                    );
                                    localStorage.removeItem(
                                      "target_supabase_url",
                                    );
                                    localStorage.removeItem(
                                      "target_supabase_key",
                                    );

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
                                  const currentUrl = window.location.href;
                                  window.location.href = `${getBackendUrl()}/api/auth/supabase?redirect_to=${encodeURIComponent(currentUrl)}`;
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
            <Button
              variant="outline"
              data-tour="account-settings-close"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                e.stopPropagation();
                document.body.style.pointerEvents = "";
                document.body.removeAttribute("data-scroll-locked");
                onClose();
              }}
            >
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
