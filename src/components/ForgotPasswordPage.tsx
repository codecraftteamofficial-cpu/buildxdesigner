import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "../supabase/config/supabaseClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { sendPasswordResetEmail } from "../utils/apiHelper";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const recoveryFlag = "supabase_password_recovery_active";
    let timeoutId: number | undefined;

    if (window.sessionStorage.getItem(recoveryFlag) === "true") {
      setResetMode(true);
      setIsInitializing(false);
    } else {
      timeoutId = window.setTimeout(() => {
        setIsInitializing(false);
      }, 1200);
    }

    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          window.sessionStorage.setItem(recoveryFlag, "true");
          setResetMode(true);
          setStatusMessage(
            "Recovery link verified. You can now set a new password.",
          );
          setErrorMessage(null);
          setIsInitializing(false);
        }
      },
    );

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Sending password reset instructions...");

    const { error } = await sendPasswordResetEmail(email);

    if (error) {
      setErrorMessage(error.message);
      setStatusMessage(null);
    } else {
      setStatusMessage(
        "Password reset email sent. Please check your inbox and spam folder.",
      );
    }

    setLoading(false);
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setStatusMessage("Updating your password...");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setStatusMessage(null);
    } else {
      window.sessionStorage.removeItem("supabase_password_recovery_active");
      await supabase.auth.signOut();

      setStatusMessage(
        "Password updated successfully. Please sign in with your new password.",
      );
      setPassword("");
      setConfirmPassword("");
      setResetMode(false);
    }

    setLoading(false);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 flex flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">
              Verifying reset link...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {resetMode ? "Set a New Password" : "Forgot Password"}
          </CardTitle>
          <CardDescription>
            {resetMode
              ? "Enter and confirm your new password to continue."
              : "Enter your account email and we will send you a reset link."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={resetMode ? handleUpdatePassword : handleRequestReset}
            className="space-y-4"
          >
            {!resetMode ? (
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {statusMessage && (
              <p className="text-sm text-blue-600">{statusMessage}</p>
            )}
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {resetMode ? "Updating Password..." : "Sending..."}
                </span>
              ) : resetMode ? (
                "Update Password"
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter>
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            Back to Landing Page
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
