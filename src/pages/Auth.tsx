import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { Loader2, ArrowLeft } from "lucide-react";
import qraftLogo from "@/assets/qrafts-logo.png";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const Auth = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; newPassword?: string; confirmPassword?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we're returning from OAuth (hash contains access_token)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasOAuthParams = hashParams.has('access_token') || hashParams.has('error');
    
    // Check if we're in password reset mode (type=recovery in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const isPasswordReset = hashParams.get('type') === 'recovery' || urlParams.get('type') === 'recovery';
    
    if (isPasswordReset) {
      console.log('Password reset mode detected');
      setResetPasswordMode(true);
    }
    
    if (hasOAuthParams) {
      setOauthProcessing(true);
      console.log('OAuth callback detected');
    }

    // Set up auth state listener FIRST to catch OAuth callbacks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session && !isPasswordReset) {
        console.log('User signed in, redirecting to dashboard');
        setOauthProcessing(false);
        navigate("/dashboard", { replace: true });
      }
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected');
        setResetPasswordMode(true);
        setOauthProcessing(false);
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
      
      // Handle OAuth errors
      if (hashParams.has('error')) {
        setOauthProcessing(false);
        toast({
          title: "Authentication failed",
          description: hashParams.get('error_description') || "Unable to complete sign in",
          variant: "destructive",
        });
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isPasswordReset) {
        console.log('Existing session found, redirecting to dashboard');
        setOauthProcessing(false);
        navigate("/dashboard", { replace: true });
      } else if (hasOAuthParams) {
        // OAuth params present but no session yet - keep loading
        setTimeout(() => setOauthProcessing(false), 5000); // Timeout after 5s
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate input
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as 'email' | 'password'] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      });
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate input with relaxed password rules for sign in
    const signInSchema = z.object({
      email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
      password: z.string().min(1, "Password required").max(100, "Password too long"),
    });

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as 'email' | 'password'] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        });
        setGoogleLoading(false);
      } else {
        console.log('Google OAuth initiated successfully');
      }
    } catch (err) {
      console.error('Unexpected error during Google sign in:', err);
      toast({
        title: "Google sign in failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setErrors({});

    // Validate email
    const emailSchema = z.string().trim().email("Invalid email address");
    const result = emailSchema.safeParse(resetEmail);
    
    if (!result.success) {
      setErrors({ email: "Invalid email address" });
      setResetLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link. Please check your inbox.",
      });
      setForgotPasswordOpen(false);
      setResetEmail("");
    }

    setResetLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate passwords
    if (newPassword.length < 8) {
      setErrors({ newPassword: "Password must be at least 8 characters" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });
      setResetPasswordMode(false);
      setNewPassword("");
      setConfirmPassword("");
      // Redirect to dashboard after password reset
      setTimeout(() => navigate("/dashboard"), 1000);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Password Reset Dialog */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300" onClick={() => setForgotPasswordOpen(false)}>
          <Card className="p-6 max-w-md mx-4 border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Reset your password</h3>
                <p className="text-sm text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForgotPasswordOpen(false)}
                    className="flex-1"
                    disabled={resetLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={resetLoading}>
                    {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
      {/* OAuth Processing Overlay */}
      {oauthProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
          <Card className="p-8 max-w-sm mx-4 border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Completing Google sign in...</h3>
                <p className="text-sm text-muted-foreground">Please wait while we authenticate your account</p>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Background decoration */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="fixed top-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="fixed bottom-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      {/* Main content - centered */}
      <div className="flex-1 flex items-center justify-center px-3 py-4 sm:p-4">
        <Card className="relative w-full max-w-[95vw] sm:max-w-md p-5 sm:p-8 md:p-10 border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl animate-enter">
          {/* Back button */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </Link>

          <div className="text-center mb-5 sm:mb-8 md:mb-10 space-y-2 sm:space-y-3 md:space-y-4">
            <div className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-2 sm:mb-4 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
              Welcome Back
            </div>
            <img src={qraftLogo} alt="Qrafts" className="h-14 sm:h-16 md:h-20 mx-auto dark:invert animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }} />
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>Your journey to success starts here</p>
          </div>
          
          {!resetPasswordMode ? (
            <Tabs defaultValue="signin" className="w-full animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-full text-sm">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:shadow-md">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:shadow-md">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4 sm:mt-6">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              variant="outline"
              className="w-full h-11 rounded-full mb-4 sm:mb-6 border-border/60 text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-primary/30"
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-sm font-medium transition-colors duration-200">{t('common.email')}</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-11 rounded-xl border-border/60 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:scale-[1.01] ${errors.email ? 'border-destructive animate-[shake_0.3s_ease-in-out]' : ''}`}
                  required
                />
                {errors.email && (
                  <p className="text-xs text-destructive animate-fade-in">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-sm font-medium transition-colors duration-200">{t('common.password')}</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`h-11 rounded-xl border-border/60 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:scale-[1.01] ${errors.password ? 'border-destructive animate-[shake_0.3s_ease-in-out]' : ''}`}
                  required
                />
                {errors.password && (
                  <p className="text-xs text-destructive animate-fade-in">{errors.password}</p>
                )}
              </div>
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <Button
                type="submit" 
                className="w-full h-11 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.signIn')}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4 sm:mt-6">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              variant="outline"
              className="w-full h-11 rounded-full mb-4 sm:mb-6 border-border/60 text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-primary/30"
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-medium transition-colors duration-200">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-11 rounded-xl border-border/60 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:scale-[1.01] ${errors.email ? 'border-destructive animate-[shake_0.3s_ease-in-out]' : ''}`}
                  required
                />
                {errors.email && (
                  <p className="text-xs text-destructive animate-fade-in">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm font-medium transition-colors duration-200">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`h-11 rounded-xl border-border/60 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:scale-[1.01] ${errors.password ? 'border-destructive animate-[shake_0.3s_ease-in-out]' : ''}`}
                  required
                  minLength={8}
                />
                {errors.password && (
                  <p className="text-xs text-destructive animate-fade-in">{errors.password}</p>
                )}
                <p className="text-xs text-muted-foreground transition-opacity duration-200">
                  Password must be 8+ characters with uppercase and number
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
          ) : (
            <div className="w-full animate-fade-in space-y-6" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold">Set New Password</h2>
                <p className="text-sm text-muted-foreground">Enter your new password below</p>
              </div>
              
              <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`h-11 rounded-xl border-border/60 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.newPassword ? 'border-destructive' : ''}`}
                    required
                    minLength={8}
                  />
                  {errors.newPassword && (
                    <p className="text-xs text-destructive animate-fade-in">{errors.newPassword}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-11 rounded-xl border-border/60 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    required
                    minLength={8}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive animate-fade-in">{errors.confirmPassword}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </div>
          )}
      </Card>
      </div>
      
      {/* Footer */}
      <div className="hidden sm:block relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default Auth;
