import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, CreditCard, Calendar, Download, Settings as SettingsIcon, RefreshCw, Lock, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const Settings = () => {
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
    
    // Check for checkout success/cancel in URL
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutStatus = searchParams.get('checkout');
    
    if (checkoutStatus === 'success') {
      // Wait a moment for Stripe webhook to process, then refresh
      setTimeout(() => {
        checkSubscription();
        toast({
          title: "Welcome to Qraft Pro!",
          description: "Your subscription is now active. Enjoy all premium features!",
        });
      }, 2000);
      
      // Clean up URL
      window.history.replaceState({}, '', '/settings');
    } else if (checkoutStatus === 'canceled') {
      toast({
        title: "Checkout Canceled",
        description: "You can upgrade to Pro anytime from this page.",
        variant: "destructive",
      });
      
      // Clean up URL
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
      const { data, error } = await supabase.functions.invoke('check-subscription');
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

      // Delete user data (RLS policies will handle this automatically)
      const { error: profileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", user.id);

      const { error: applicationsError } = await supabase
        .from("applications")
        .delete()
        .eq("user_id", user.id);

      const { error: answersError } = await supabase
        .from("master_answers")
        .delete()
        .eq("user_id", user.id);

      const { error: templatesError } = await supabase
        .from("answer_templates")
        .delete()
        .eq("user_id", user.id);

      // Sign out the user (account deletion would typically be handled by admin)
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
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <img src={qraftLogo} alt="QRAFTS" className="h-20 transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
            <div className="flex items-center gap-2 ml-auto">
              <SettingsIcon className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        {/* Account Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-base mt-1">{userProfile?.email}</p>
            </div>
            {userProfile?.full_name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-base mt-1">{userProfile.full_name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Subscription
                </CardTitle>
                <CardDescription>Manage your Qraft Pro subscription</CardDescription>
              </div>
              <Button
                onClick={checkSubscription}
                variant="outline"
                size="sm"
                disabled={loading}
                className="rounded-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {subscriptionStatus.subscribed ? (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="p-6 rounded-xl bg-gradient-to-r from-success/10 via-success/5 to-primary/10 border border-success/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">Qraft Pro</h3>
                        {subscriptionStatus.is_trialing ? (
                          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                            Free Trial
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">$5/month</p>
                    </div>
                    <div className="p-3 rounded-full bg-success/20">
                      <Crown className="h-6 w-6 text-success" />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">
                        {subscriptionStatus.is_trialing ? "Trial Active" : "Subscribed"}
                      </span>
                    </div>
                    {subscriptionStatus.is_trialing && subscriptionStatus.trial_end && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Trial Ends</span>
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(subscriptionStatus.trial_end).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {!subscriptionStatus.is_trialing && subscriptionStatus.subscription_end && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Next Billing Date</span>
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(subscriptionStatus.subscription_end).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="font-medium mb-3">Your Pro Features</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Unlimited job applications
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      AI-powered role fit analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Advanced analytics and insights
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Priority support
                    </li>
                  </ul>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={handleManageSubscription}
                  className="w-full rounded-full"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Subscription & Billing
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Update payment method, view invoices, or cancel subscription
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Free Plan */}
                <div className="p-6 rounded-xl border border-border/50 bg-card/50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Free Plan</h3>
                      <p className="text-sm text-muted-foreground">$0/month</p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <h4 className="font-medium mb-3">Current Features</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Track up to 5 applications
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        View all your existing data
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Calendar view
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Manual answer management
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <strong>Your data is safe:</strong> All your applications and data remain accessible even if you don't upgrade. The 5 application limit only applies to adding new applications.
                    </p>
                  </div>
                </div>

                {/* Upgrade CTA */}
                <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Upgrade to Qraft Pro</h3>
                    <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                      14-Day Free Trial
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try all Pro features free for 14 days. No credit card required during trial.
                  </p>
                  <ul className="space-y-2 text-sm mb-6">
                    <li className="flex items-center gap-2 text-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Unlimited job applications
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      AI-powered role fit analysis
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Advanced analytics
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Priority support
                    </li>
                  </ul>
                  <Button 
                    onClick={handleUpgrade}
                    size="lg"
                    className="w-full rounded-full shadow-lg shadow-primary/30"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Start Free Trial
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History - Only show if subscribed */}
        {subscriptionStatus.subscribed && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>View and download your invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Access your complete payment history and download invoices through the Stripe Customer Portal
                </p>
                <Button 
                  onClick={handleManageSubscription}
                  variant="outline"
                  className="rounded-full"
                >
                  View Payment History
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
                className="w-full rounded-full"
              >
                {changingPassword ? "Updating..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Permanently delete your account and all data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong className="text-destructive">Warning:</strong> This action cannot be undone. This will permanently delete:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>All your job applications and answers</li>
                  <li>Your profile and settings</li>
                  <li>All timeline events and data</li>
                  <li>Your subscription (if active)</li>
                </ul>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                className="w-full rounded-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete your account and remove all your data from our servers.
                This action cannot be undone.
              </p>
              <div className="space-y-2">
                <Label htmlFor="deleteConfirm">
                  Type <strong>delete my account</strong> to confirm:
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete my account"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText.toLowerCase() !== "delete my account" || deletingAccount}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingAccount ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
