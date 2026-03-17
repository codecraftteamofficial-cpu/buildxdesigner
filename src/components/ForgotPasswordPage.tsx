import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../supabase/config/supabaseClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkRecoverySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setResetMode(true);
      }
    };

    checkRecoverySession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setResetMode(true);
      }
    });

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Sending password reset instructions...');

    const redirectTo = `${window.location.origin}/forgot-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setErrorMessage(error.message);
      setStatusMessage(null);
    } else {
      setStatusMessage('Password reset email sent. Please check your inbox and spam folder.');
    }

    setLoading(false);
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match Bobo ka kasi.');
      return;
    }

    setLoading(true);
    setStatusMessage('Updating your password...');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setStatusMessage(null);
    } else {
      setStatusMessage('Password updated successfully. You can now sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{resetMode ? 'Set a New Password' : 'Forgot Password'}</CardTitle>
          <CardDescription>
            {resetMode
              ? 'Enter and confirm your new password to continue.'
              : 'Enter your account email and we will send you a reset link.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={resetMode ? handleUpdatePassword : handleRequestReset} className="space-y-4">
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
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
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

            {statusMessage && <p className="text-sm text-blue-600">{statusMessage}</p>}
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {resetMode ? 'Updating Password...' : 'Sending...'}
                </span>
              ) : resetMode ? (
                'Update Password'
              ) : (
                'Send Reset Link'
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