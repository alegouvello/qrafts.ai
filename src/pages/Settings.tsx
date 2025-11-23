import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, CreditCard, Calendar, Download, Settings as SettingsIcon, RefreshCw, Lock, Trash2, Eye, EyeOff, LogOut, User, Shield, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import qraftLogo from "@/assets/qrafts-logo.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const Settings = () => {
  const { t } = useTranslation();
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscribed: boolean;
    product_id: string | null;
    subscription_end: string | null;
    is_trialing?: boolean;
    trial_end?: string | null;
  }>({ subscribed: false, product_id: null, subscription_end: null });
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    email: string;
    full_name?: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchUserProfile();
    
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutStatus = searchParams.get('checkout');
    
    if (checkoutStatus === 'success') {
      setTimeout(() => {
        checkSubscription();
        toast({
          title: "Welcome to Qraft Pro!",
          description: "Your subscription is now active. Enjoy all premium features!",
        });
      }, 2000);
      
      window.history.replaceState({}, '', '/settings');
    } else if (checkoutStatus === 'canceled') {
      toast({
        title: "Checkout Canceled",
        description: "You can upgrade to Pro anytime from this page.",
        variant: "destructive",
      });
      
      window.history.replaceState({}, '', '/settings');
    } else {
      checkSubscription();
    }
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      setUserProfile({
        email: user.email || "",
        full_name: profile?.full_name || undefined,
      });
    }
    setLoading(false);
  };

  const checkSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session, skipping subscription check');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('Error checking subscription:', error);
        toast({
          title: "Error",
          description: "Failed to check subscription status",
          variant: "destructive",
        });
      } else if (data) {
        setSubscriptionStatus(data);
        toast({
          title: "Status Updated",
          description: "Subscription status refreshed successfully",
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Error",
        description: "Failed to check subscription status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) {
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate checkout",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) {
        toast({
          title: "Error",
          description: "Failed to open subscription management",
          variant: "destructive",
        });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open portal",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    setChangingPassword(true);
    try {
      const validatedData = passwordSchema.parse({ newPassword, confirmPassword });
      
      const { error } = await supabase.auth.updateUser({
        password: validatedData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully",
      });
      
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update password. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "delete my account") {
      toast({
        title: "Confirmation Required",
        description: "Please type 'delete my account' to confirm",
        variant: "destructive",
      });
      return;
    }

    setDeletingAccount(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      await supabase.from("user_profiles").delete().eq("user_id", user.id);
      await supabase.from("applications").delete().eq("user_id", user.id);
      await supabase.from("master_answers").delete().eq("user_id", user.id);
      await supabase.from("answer_templates").delete().eq("user_id", user.id);

      await supabase.auth.signOut();

      toast({
        title: "Account Data Deleted",
        description: "Your account data has been removed. Please contact support to complete account deletion.",
      });

      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('settings.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-1/4 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="rounded-full hover:scale-105 transition-transform">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <img 
                src={qraftLogo} 
                alt="Qrafts"
                className="h-16 transition-all duration-300 hover:scale-105 dark:invert" 
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full border border-primary/20">
                <SettingsIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t('settings.title')}</span>
              </div>
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl relative z-10">
        <div className="mb-12 text-center animate-fade-in-down">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {t('settings.account')}
          </h1>
          <p className="text-muted-foreground text-lg">{t('settings.personalDetails')}</p>
        </div>

        <div className="grid gap-8">
          {/* Profile Section */}
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm animate-fade-in-up">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-primary/10 animate-glow-pulse">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t('settings.profileInfo')}</CardTitle>
                  <CardDescription className="text-base">{t('settings.personalDetails')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    {t('settings.emailAddress')}
                  </label>
                  <p className="text-lg font-medium">{userProfile?.email}</p>
                </div>
                {userProfile?.full_name && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent"></div>
                      {t('profile.fullName')}
                    </label>
                    <p className="text-lg font-medium">{userProfile.full_name}</p>
                  </div>
                )}
              </div>
              
              <Separator className="my-6" />
              
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full sm:w-auto rounded-full group hover:border-primary/50 transition-all"
                size="lg"
              >
                <LogOut className="h-4 w-4 mr-2 group-hover:translate-x-[-2px] transition-transform" />
                {t('settings.signOut')}
              </Button>
            </CardContent>
          </Card>

          {/* Subscription Section */}
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl"></div>
            <CardHeader className="relative">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 animate-glow-pulse" style={{ animationDelay: '0.5s' }}>
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{t('settings.subscription')}</CardTitle>
                    <CardDescription className="text-base">{t('settings.proPlan')}</CardDescription>
                  </div>
                </div>
                <Button
                  onClick={checkSubscription}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="rounded-full hover:border-primary/50 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {t('settings.refresh')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {subscriptionStatus.subscribed ? (
                <div className="space-y-6">
                  <div className="relative p-8 rounded-2xl bg-gradient-to-br from-success/10 via-primary/5 to-transparent border border-success/20 overflow-hidden group hover:border-success/40 transition-all">
                    <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sparkles className="h-32 w-32 text-success" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-2xl font-bold">{t('settings.pro')}</h3>
                            {subscriptionStatus.is_trialing ? (
                              <Badge className="bg-primary text-primary-foreground border-0 shadow-lg shadow-primary/20">
                                {t('settings.freeTrial')}
                              </Badge>
                            ) : (
                              <Badge className="bg-success text-success-foreground border-0 shadow-lg shadow-success/20">
                                {t('settings.active')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">$29.99 per month</p>
                        </div>
                        <div className="p-4 rounded-full bg-success/20 backdrop-blur-sm">
                          <Crown className="h-8 w-8 text-success animate-float" />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
                          <p className="text-sm text-muted-foreground mb-1">{t('settings.status')}</p>
                          <p className="text-lg font-semibold">
                            {subscriptionStatus.is_trialing ? t('settings.freeTrial') : t('settings.subscribed')}
                          </p>
                        </div>
                        {((subscriptionStatus.is_trialing && subscriptionStatus.trial_end) || 
                          (!subscriptionStatus.is_trialing && subscriptionStatus.subscription_end)) && (
                          <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
                            <p className="text-sm text-muted-foreground mb-1">
                              {subscriptionStatus.is_trialing ? t('settings.trialEnds') : t('settings.renewsOn')}
                            </p>
                            <p className="text-lg font-semibold flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              {new Date(
                                subscriptionStatus.is_trialing 
                                  ? subscriptionStatus.trial_end! 
                                  : subscriptionStatus.subscription_end!
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 mb-6">
                        {[
                          t('settings.proFeature1'),
                          t('settings.proFeature2'),
                          t('settings.proFeature3'),
                          t('settings.proFeature4')
                        ].map((feature, index) => (
                          <div key={index} className="flex items-center gap-3 text-foreground">
                            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button 
                        onClick={handleManageSubscription}
                        className="w-full rounded-full shadow-lg shadow-primary/30 group"
                        size="lg"
                      >
                        <CreditCard className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                        {t('settings.manageSubscriptionBilling')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative p-8 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border border-border/50 overflow-hidden group hover:border-primary/30 transition-all">
                    <div className="absolute top-0 right-0 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Crown className="h-40 w-40 text-primary" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
                          <Crown className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">Upgrade to Qraft Pro</h3>
                          <Badge className="mt-2 bg-success/20 text-success border-success/30">
                            14-Day Free Trial
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-6 text-lg">
                        Try all Pro features free for 14 days. No credit card required during trial.
                      </p>

                      <div className="grid sm:grid-cols-2 gap-4 mb-6">
                        {[
                          t('settings.proFeature1'),
                          t('settings.proFeature2'),
                          t('settings.proFeature3'),
                          t('settings.proFeature4')
                        ].map((feature, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent"></div>
                            <span className="text-sm font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button 
                        onClick={handleUpgrade}
                        size="lg"
                        className="w-full rounded-full shadow-xl shadow-primary/30 bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/40 transition-all group"
                      >
                        <Crown className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
                        Start Free Trial
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-primary/10 animate-glow-pulse" style={{ animationDelay: '1s' }}>
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t('settings.security')}</CardTitle>
                  <CardDescription className="text-base">{t('settings.securitySettings')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-base">{t('settings.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('settings.newPassword')}
                      className="pr-12 h-12 rounded-full"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-10 px-3 hover:bg-transparent rounded-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-base">{t('settings.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('settings.confirmPassword')}
                      className="pr-12 h-12 rounded-full"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-10 px-3 hover:bg-transparent rounded-full"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={!newPassword || !confirmPassword || changingPassword}
                  className="w-full rounded-full group"
                  size="lg"
                >
                  <Lock className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  {changingPassword ? t('common.loading') : t('settings.changePassword')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="overflow-hidden border border-destructive/30 shadow-lg shadow-destructive/10 bg-gradient-to-br from-card to-destructive/5 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-destructive/10">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-destructive">{t('settings.dangerZone')}</CardTitle>
                  <CardDescription className="text-base">{t('settings.dangerWarning')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-destructive/5 border border-destructive/20">
                  <p className="text-sm mb-3">
                    <strong className="text-destructive">Warning:</strong> {t('settings.deleteWarningText')}
                  </p>
                  <ul className="space-y-2">
                    {[
                      t('settings.deleteItem1'),
                      t('settings.deleteItem2'),
                      t('settings.deleteItem3'),
                      t('settings.deleteItem4')
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-destructive"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  className="w-full rounded-full group"
                  size="lg"
                >
                  <Trash2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  {t('settings.deleteAccount')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-base">
              <p>
                This will permanently delete your account and remove all your data from our servers.
                This action cannot be undone.
              </p>
              <div className="space-y-3">
                <Label htmlFor="deleteConfirm" className="text-base">
                  Type <strong className="text-destructive">delete my account</strong> to confirm:
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete my account"
                  className="h-12 rounded-full"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")} className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText.toLowerCase() !== "delete my account" || deletingAccount}
              className="bg-destructive hover:bg-destructive/90 rounded-full"
            >
              {deletingAccount ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Footer />
    </div>
  );
};

export default Settings;
