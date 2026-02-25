import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, Lock, Mail, User, Phone, Smartphone, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useGoogleAuth } from './GoogleAuthService';
import origIcon from '@/assets/3783c8fc9c2bbb9005e59c39e377b8d4ab7a0e4b.png';
import { signInWithEmail, signUpWithEmail, sendPhoneOtp, verifyPhoneOtp, updateUserName } from '../supabase/auth/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'login' | 'signup';
  onSuccess: (isSignup?: boolean) => void;
}

type AuthMethod = 'email' | 'phone';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  type,
  onSuccess
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [currentType, setCurrentType] = useState(type);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const { signIn: googleSignIn, loading: googleLoading, error: googleError } = useGoogleAuth();
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([
    { label: 'At least 8 characters', met: false },
    { label: 'Contains uppercase letter', met: false },
    { label: 'Contains lowercase letter', met: false },
    { label: 'Contains a number', met: false },
    { label: 'Contains special character', met: false },
  ]);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Update current type when prop changes
  React.useEffect(() => {
    setCurrentType(type);
  }, [type]);

  // Listen for auth type switching events
  React.useEffect(() => {
    const handleSwitchAuth = (event: CustomEvent) => {
      setCurrentType(event.detail);
    };

    window.addEventListener('switchAuth', handleSwitchAuth as EventListener);
    return () => {
      window.removeEventListener('switchAuth', handleSwitchAuth as EventListener);
    };
  }, []);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null); // Clear previous errors  
    setAuthMessage(null); // Clear previous messages
    // Note: We leave showVerification as is if it's currently true for phone verification

    if (authMethod === 'email') {
        const { email, password, confirmPassword, name } = formData;
        let result;

        if (currentType === 'signup') {
            if (password !== confirmPassword) {
                setAuthError('Passwords do not match.');
                setLoading(false);
                return;
            }
            result = await signUpWithEmail(email, password, name);
        } else {
            result = await signInWithEmail(email, password);
        }

        if (result.error) {
            setAuthError(result.error.message);
        } else if (result.success) {
            
            // Check if the success message explicitly indicates confirmation is needed
            const needsConfirmation = result.message && result.message.includes('Check your email');

            if (needsConfirmation) {
                // Display confirmation message and reset form fields immediately
                setAuthMessage(`Confirmation email sent to ${email}. Please check your inbox and spam folder.`);
                
                // Reset form data
                setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '', verificationCode: '' });
                
                // ✅ Reset Password Validation UI State
                setShowPasswordValidation(false);
                setPasswordsMatch(true);

            } else {
                // Login successful or signup without confirmation
                setAuthMessage(result.message || (currentType === 'login' ? 'Login successful!' : 'Sign-up successful!'));

                setTimeout(() => {
                    onSuccess(currentType === 'signup');
                    onClose();
                    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '', verificationCode: '' });
                    
                    // ✅ Reset Password Validation UI State on closing the modal after success
                    setShowPasswordValidation(false);
                    setPasswordsMatch(true);
                    
                }, 500);
            }
        }
        setLoading(false); 

    } else if (authMethod === 'phone') {
        const { phone, verificationCode, name } = formData;
        let result;

        if (!showVerification) {
            const type = currentType === 'signup' ? 'signup' : 'signin';
            
            if (currentType === 'signup') {
                const userExistsCheck = await sendPhoneOtp(phone, 'signin'); 

                if (userExistsCheck.success) {
                    setAuthError('This phone number is already registered. Please switch to the "Sign in" tab.');
                    setLoading(false);
                    return;
                }                
            }
            result = await sendPhoneOtp(phone, type); 
            
            if (result.error) {
                setAuthError(result.error.message);
            } else if (result.success) {
                setAuthMessage(`Code sent to ${phone}.`);
                setShowVerification(true); 
            }

        } else {
            result = await verifyPhoneOtp(phone, verificationCode); 

            if (result.error) {
                setAuthError(result.error.message);
            } else if (result.success) {
                
                if (currentType === 'signup' && name) {
                    const updateResult = await updateUserName(name); 
                    if (updateResult.error) {
                        console.error('Failed to save user name:', updateResult.error.message);
                    }
                }
                
                setAuthMessage(result.message || 'Verification successful. Redirecting...');
                
                setTimeout(() => {
                    onSuccess(currentType === 'signup');
                    onClose();
                    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '', verificationCode: '' });
                    setShowVerification(false);
                }, 500);
            }
        }
        setLoading(false);
    }
};

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    
    // Password validation for signup
    if (field === 'password' && currentType === 'signup') {
      const password = e.target.value;
      setShowPasswordValidation(password.length > 0);
      
      setPasswordRequirements([
        { label: 'At least 8 characters', met: password.length >= 8 },
        { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
        { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
        { label: 'Contains a number', met: /[0-9]/.test(password) },
        { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
      ]);
      
      // Check if passwords match when typing in password field
      if (formData.confirmPassword) {
        setPasswordsMatch(password === formData.confirmPassword);
      }
    }
    
    // Check password match for confirm password field
    if (field === 'confirmPassword' && currentType === 'signup') {
      setPasswordsMatch(formData.password === e.target.value);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await googleSignIn();
      // For Google, we can't easily know if it's a signup or login here
      // We'll handle the onboarding check in App.tsx based on user metadata
      onSuccess(false); 
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        verificationCode: ''
      });
      
    } catch (error) {
      console.error('Google authentication failed:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-md max-h-[98vh] flex items-center justify-center"
          >
            <Card className="auth-modal-content shadow-2xl border-0 w-full flex flex-col max-h-[98vh]">
              <CardHeader className="relative text-center pb-2 pt-3 flex-shrink-0">
  <button
    onClick={onClose}
    className="absolute top-2 right-2 p-1.5 hover:bg-muted rounded-full transition-colors z-10"
  >
    <X className="w-3.5 h-3.5" />
  </button>
  
  <div className="w-10 h-10 mx-auto mb-2 rounded-xl overflow-hidden shadow-lg flex items-center justify-center">
    <img 
                        src={origIcon} 
                        alt="BuildX Designer Make" 
                        className="w-full h-full object-cover"
                      />

  </div>
  
  <CardTitle className="text-lg font-bold mb-0.5">
    {currentType === 'login' ? 'Welcome Back!' : 'Join BuildX Designer'}
  </CardTitle>
                <p className="text-foreground/60 text-xs">
                  {currentType === 'login'
                    ? 'Sign in to continue building'
                    : 'Create your account and start building'
                  }
                </p>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto py-2 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`.auth-modal-content ::-webkit-scrollbar { display: none; }`}</style>
                <div className="space-y-2.5">
                  {/* Google Authentication Button */}
                  <div className="space-y-2">
                    {googleError && (
                      <div className="auth-error p-1.5 rounded-lg text-center">
                        <p className="text-xs font-medium">
                          Authentication failed: {googleError}
                        </p>
                      </div>
                    )}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-9 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      onClick={handleGoogleAuth}
                      disabled={googleLoading || loading}
                    >
                      {googleLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full mr-2"
                        />
                      ) : (
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                      <span className="font-medium text-gray-700 text-xs">
                        {googleLoading ? 'Connecting...' : 'Continue with Google'}
                      </span>
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center my-2">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-2 text-xs text-gray-500 bg-background px-1.5">
                      Or continue with
                    </span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  {/* Auth Method Selection */}
                  <Tabs value={authMethod} onValueChange={(value) => setAuthMethod(value as AuthMethod)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-2 h-8">
                      <TabsTrigger value="email" className="flex items-center gap-1 text-xs">
                        <Mail className="w-3 h-3" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger value="phone" className="flex items-center gap-1 text-xs">
                        <Smartphone className="w-3 h-3" />
                        Phone
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="space-y-2 mt-0">
                      <form onSubmit={handleSubmit} className="space-y-2">
                        {currentType === 'signup' && (
                          <div className="space-y-1">
                            <Label htmlFor="name" className="text-xs font-medium">Full Name</Label>
                            <div className="relative">
                              <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                id="name"
                                type="text"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleInputChange('name')}
                                className="pl-8 h-8 text-xs"
                                required
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="Enter your email"
                              value={formData.email}
                              onChange={handleInputChange('email')}
                              className="pl-8 h-8 text-xs"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter your password"
                              value={formData.password}
                              onChange={handleInputChange('password')}
                              className="pl-8 pr-8 h-8 text-xs"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Password Strength Indicator for Signup */}
                        {currentType === 'signup' && showPasswordValidation && (
                          <div className="p-2 bg-muted/50 rounded-md space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Password requirements:</p>
                            <div className="grid grid-cols-1 gap-0.5">
                              {passwordRequirements.map((req, index) => (
                                <div key={index} className="flex items-center gap-1 text-xs">
                                  {req.met ? (
                                    <Check className="w-2.5 h-2.5 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className={req.met ? 'text-green-600 font-medium text-[10px]' : 'text-muted-foreground text-[10px]'}>
                                    {req.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {currentType === 'signup' && (
                          <div className="space-y-1">
                            <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleInputChange('confirmPassword')}
                                className={`pl-8 h-8 text-xs ${!passwordsMatch && formData.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                                required
                              />
                            </div>
                            
                            {/* Password Match Validation */}
                            {formData.confirmPassword && !passwordsMatch && (
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-red-600">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>Passwords do not match</span>
                              </div>
                            )}
                            
                            {formData.confirmPassword && passwordsMatch && (
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-green-600">
                                <Check className="w-2.5 h-2.5" />
                                <span>Passwords match</span>
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          type="submit"
                          size="sm"
                          className="w-full h-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-xs mt-2"
                          disabled={loading}
                        >
                          {loading ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1.5"
                            />
                          ) : null}
                          {loading 
                            ? 'Please wait...' 
                            : currentType === 'login' 
                              ? 'Sign In' 
                              : 'Create Account'
                          }
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="phone" className="space-y-2 mt-0">
                      <form onSubmit={handleSubmit} className="space-y-2">
                        {currentType === 'signup' && (
                          <div className="space-y-1">
                            <Label htmlFor="name-phone" className="text-xs font-medium">Full Name</Label>
                            <div className="relative">
                              <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                id="name-phone"
                                type="text"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleInputChange('name')}
                                className="pl-8 h-8 text-xs"
                                required
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label htmlFor="phone" className="text-xs font-medium">Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="+63 (926) 123-4567"
                              value={formData.phone}
                              onChange={handleInputChange('phone')}
                              className="pl-8 h-8 text-xs"
                              required
                              disabled={showVerification}
                            />
                          </div>
                        </div>

                        {showVerification && (
                          <div className="space-y-1">
                            <Label htmlFor="verification" className="text-xs font-medium">Verification Code</Label>
                            <div className="relative">
                              <Smartphone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                id="verification"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={formData.verificationCode}
                                onChange={handleInputChange('verificationCode')}
                                className="pl-8 h-8 text-center tracking-widest text-xs"
                                maxLength={6}
                                required
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center">
                              Code sent to {formData.phone}
                            </p>
                          </div>
                        )}

                        <Button
                          type="submit"
                          size="sm"
                          className="w-full h-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-xs"
                          disabled={loading}
                        >
                          {loading ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1.5"
                            />
                          ) : null}
                          {loading 
                            ? 'Please wait...' 
                            : showVerification 
                              ? 'Verify & Continue'
                              : currentType === 'login' 
                                ? 'Send Code' 
                                : 'Send Code'
                          }
                        </Button>

                        {showVerification && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-[10px] h-7"
                            onClick={() => {
                              setShowVerification(false);
                              setFormData(prev => ({ ...prev, verificationCode: '' }));
                            }}
                          >
                            Use different number
                          </Button>
                        )}
                      </form>
                    </TabsContent>
                  </Tabs>

                  {/* Switch Auth Type */}
                  <div className="text-center pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {currentType === 'login' ? (
                        <>
                          Don't have an account?{' '}
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('switchAuth', { detail: 'signup' }))}
                            className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                          >
                            Sign up
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{' '}
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('switchAuth', { detail: 'login' }))}
                            className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                          >
                            Sign in
                          </button>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Terms and Privacy */}
                  {currentType === 'signup' && (
                    <div className="text-center pt-1">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        By creating an account, you agree to our{' '}
                        <a href="#" className="text-blue-600 hover:underline">Terms</a>{' '}
                        and{' '}
                        <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
