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

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMessage(error.message);
            setIsInitializing(false);
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setErrorMessage("Reset session is missing or expired.");
          setIsInitializing(false);
          return;
        }

        setIsReady(true);
        setStatusMessage(
          "Recovery link verified. You can now set a new password.",
        );
      } catch (err) {
        setErrorMessage("Unable to verify reset link.");
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

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
      await supabase.auth.signOut();
      setStatusMessage(
        "Password updated successfully. Please sign in with your new password.",
      );
      setPassword("");
      setConfirmPassword("");
      setIsReady(false);
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
          <CardTitle>Set a New Password</CardTitle>
          <CardDescription>
            Enter and confirm your new password to continue.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isReady ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
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
                    Updating Password...
                  </span>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              {statusMessage && (
                <p className="text-sm text-blue-600">{statusMessage}</p>
              )}
              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Request a new reset link
              </Link>
            </div>
          )}
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
