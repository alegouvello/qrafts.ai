import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Plus, ArrowLeft, LogOut, BarChart3, Crown, Sparkles, Settings, Briefcase, Clock, Users, TrendingUp } from "lucide-react";
import { ApplicationCard } from "@/components/ApplicationCard";
import { AddApplicationDialog } from "@/components/AddApplicationDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import qraftLogo from "@/assets/qrafts-logo.png";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useTranslation } from "react-i18next";

interface Application {
  id: string;
  company: string;
  position: string;
  status: "pending" | "interview" | "rejected" | "accepted";
  appliedDate: string;
  url: string;
  questions: number;
  answersCompleted: number;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscribed: boolean;
    product_id: string | null;
    subscription_end: string | null;
    is_trialing?: boolean;
    trial_end?: string | null;
  }>({ subscribed: false, product_id: null, subscription_end: null });
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
    fetchApplications();
    fetchUserProfile();
    checkSubscription();
    
    // Check for checkout success/cancel
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast({
        title: "Subscription Activated!",
        description: "Welcome to Qraft Pro! Your subscription is now active.",
      });
      // Remove the query param
      window.history.replaceState({}, '', '/dashboard');
      // Recheck subscription
      setTimeout(() => checkSubscription(), 2000);
    } else if (checkout === 'canceled') {
      toast({
        title: "Checkout Canceled",
        description: "You can upgrade to Qraft Pro anytime.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const checkSubscription = async () => {
    setCheckingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session, skipping subscription check');
        setCheckingSubscription(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('Error checking subscription:', error);
      } else if (data) {
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setCheckingSubscription(false);
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

  const handleRefresh = async () => {
    await Promise.all([
      fetchApplications(),
      fetchUserProfile(),
      checkSubscription()
    ]);
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

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } else {
      // Helper function to identify file upload questions (same as ApplicationDetail)
      const isFileUploadQuestion = (questionText: string) => {
        const lower = questionText.toLowerCase();
        return lower.includes('resume') || lower.includes('cv') || 
               lower.includes('cover letter') || lower.includes('upload') || 
               lower.includes('attach');
      };

      // Transform data to match the expected format
      const transformed = await Promise.all(
        (data || []).map(async (app) => {
          // Get all questions for this application
          const { data: questions } = await supabase
            .from("questions")
            .select("id, question_text")
            .eq("application_id", app.id);

          // Filter out file upload questions
          const textQuestions = questions?.filter(q => !isFileUploadQuestion(q.question_text)) || [];
          const textQuestionIds = textQuestions.map(q => q.id);
          
          let answerCount = 0;
          if (textQuestionIds.length > 0) {
            const { data: answersData } = await supabase
              .from("answers")
              .select("question_id, answer_text")
              .in("question_id", textQuestionIds);
            
            // Count only questions that have non-empty, non-whitespace answers
            const uniqueAnsweredQuestions = new Set(
              answersData
                ?.filter(a => a.answer_text && a.answer_text.trim().length > 0)
                .map(a => a.question_id)
            );
            answerCount = uniqueAnsweredQuestions.size;
          }

          return {
            id: app.id,
            company: app.company,
            position: app.position,
            status: app.status as "pending" | "interview" | "rejected" | "accepted",
            appliedDate: app.applied_date,
            url: app.url,
            questions: textQuestions.length,
            answersCompleted: answerCount,
          };
        })
      );
      setApplications(transformed);
    }
    setLoading(false);
  };

  const handleAddApplication = async (data: { company?: string; position?: string; url: string }) => {
    // Check if user has reached application limit (free users: 5 apps)
    if (!subscriptionStatus.subscribed && applications.length >= 5) {
      toast({
        title: "Application Limit Reached",
        description: "Free users can track up to 5 applications. Upgrade to Pro for unlimited tracking.",
        variant: "destructive",
      });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add applications",
        variant: "destructive",
      });
      return;
    }

    const { data: newApp, error } = await supabase
      .from("applications")
      .insert({
        company: data.company || "Unknown Company",
        position: data.position || "Unknown Position",
        url: data.url,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add application",
        variant: "destructive",
      });
      return;
    }

    // Record initial status in history
    await (supabase as any)
      .from("application_status_history")
      .insert({
        application_id: newApp.id,
        status: newApp.status,
        user_id: user.id,
      });

    toast({
      title: "Application Added",
      description: "Extracting job details and questions...",
    });

    // Extract questions and job info in the background
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('extract-job-questions', {
        body: {
          applicationId: newApp.id,
          jobUrl: data.url,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.data?.success) {
        const parts = [];
        if (response.data.company && response.data.position) {
          parts.push(`Company: ${response.data.company}, Position: ${response.data.position}`);
        }
        parts.push(`${response.data.questionsFound} questions extracted`);
        
        toast({
          title: "Extraction Complete",
          description: parts.join('. '),
        });
      } else {
        console.error('Failed to extract:', response.data?.error);
        toast({
          title: "Extraction Issue",
          description: "Could not extract all details. You can edit them manually.",
          variant: "destructive",
        });
      }
    } catch (extractError) {
      console.error('Error calling extract function:', extractError);
      toast({
        title: "Extraction Issue",
        description: "Could not extract details automatically. You can edit them manually.",
        variant: "destructive",
      });
    }

    fetchApplications();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteApplication = async (id: string) => {
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Application Deleted",
        description: "The application and all associated data have been removed",
      });
      fetchApplications();
    }
  };

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    interviews: applications.filter((a) => a.status === "interview").length,
    responseRate: applications.length > 0 
      ? Math.round(((applications.filter((a) => a.status !== "pending").length) / applications.length) * 100)
      : 0,
  };

  // Group applications by company
  const groupedApplications = applications.reduce((acc, app) => {
    if (!acc[app.company]) {
      acc[app.company] = [];
    }
    acc[app.company].push(app);
    return acc;
  }, {} as Record<string, Application[]>);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/3 via-background to-background pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <img src={qraftLogo} alt="QRAFTS" className="h-20 transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] dark:invert" />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button 
                onClick={() => {
                  if (!subscriptionStatus.subscribed && applications.length >= 5) {
                    toast({
                      title: "Application Limit Reached",
                      description: "Free users can track up to 5 applications. Upgrade to Pro for unlimited tracking.",
                      variant: "destructive",
                    });
                  } else {
                    setShowAddDialog(true);
                  }
                }}
                className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
              <Link to="/profile" className="flex-1 sm:flex-none">
                <Button variant="ghost" className="w-full rounded-full hover:bg-primary/5 transition-all text-sm flex items-center justify-center gap-2">
                  {userProfile?.avatar_url ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={userProfile.avatar_url} alt={userProfile.full_name || "Profile"} />
                      <AvatarFallback>
                        {userProfile.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    "Profile"
                  )}
                </Button>
              </Link>
              <Link to="/comparison" className="flex-1 sm:flex-none">
                <Button variant="ghost" className="w-full rounded-full hover:bg-accent/5 transition-all text-sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Compare</span>
                  <span className="sm:hidden">Stats</span>
                </Button>
              </Link>
              {subscriptionStatus.subscribed && (
                <Link to="/settings">
                  <Button 
                    variant="ghost" 
                    className="rounded-full hover:bg-success/10 transition-all px-3 border border-success/20 bg-success/5"
                    size="sm"
                  >
                    <Crown className="h-3.5 w-3.5 mr-1.5 text-success" />
                    <span className="text-xs font-medium text-success">Pro</span>
                    {subscriptionStatus.is_trialing && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary border border-primary/30">
                        Trial
                      </span>
                    )}
                  </Button>
                </Link>
              )}
              <LanguageSwitcher />
              <ThemeToggle />
              <Link to="/settings">
                <Button variant="ghost" className="rounded-full hover:bg-primary/5 transition-all" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" onClick={handleSignOut} className="rounded-full hover:bg-destructive/5 transition-all" size="icon">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent=""
        refreshingContent={
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        }
      >
        <main className="relative container mx-auto px-4 py-6 sm:py-8">
        {/* Subscription Banner */}
        {!checkingSubscription && !loading && !subscriptionStatus.subscribed && (
          <div className="mb-6 sm:mb-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Upgrade to Qraft Pro</h3>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/20 text-success border border-success/30">
                    14-Day Free Trial
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Try Qraft Pro free for 14 days, then just $5/month. Cancel anytime.
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Unlimited job applications
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    AI-powered role fit analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Priority support
                  </li>
                </ul>
              </div>
              <Button onClick={handleUpgrade} size="lg" className="rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all">
                <Crown className="h-4 w-4 mr-2" />
                Start Free Trial
              </Button>
            </div>
          </div>
        )}

        {/* Free tier limit warning */}
        {!checkingSubscription && !loading && !subscriptionStatus.subscribed && applications.length >= 4 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-warning/10 via-warning/5 to-primary/10 border border-warning/20 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-warning/20 flex-shrink-0">
                <Sparkles className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-warning mb-1">
                  {applications.length >= 5 ? 'Application Limit Reached' : 'Almost at Your Limit'}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {applications.length >= 5 
                    ? 'You\'ve reached the free tier limit of 5 applications. Upgrade to Pro for unlimited tracking and AI-powered features.'
                    : `You're using ${applications.length} of 5 free applications. Upgrade to Pro for unlimited tracking and AI-powered features.`
                  }
                </p>
                <Button 
                  onClick={handleUpgrade}
                  size="sm" 
                  className="rounded-full"
                >
                  <Crown className="h-3.5 w-3.5 mr-1.5" />
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="group relative bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/40 hover:border-border transition-all hover:shadow-lg animate-fade-in" style={{ animationDelay: '0ms' }}>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-primary/5 transition-transform group-hover:scale-110">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.stats.total')}</div>
            </div>
          </div>
          
          <div className="group relative bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/40 hover:border-border transition-all hover:shadow-lg animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-warning/5 transition-transform group-hover:scale-110">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats.pending}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.stats.pendingReview')}</div>
            </div>
          </div>
          
          <div className="group relative bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/40 hover:border-border transition-all hover:shadow-lg animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-primary/5 transition-transform group-hover:scale-110">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats.interviews}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.stats.interview')}</div>
            </div>
          </div>
          
          <div className="group relative bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/40 hover:border-border transition-all hover:shadow-lg animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-success/5 transition-transform group-hover:scale-110">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats.responseRate}%</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.stats.responseRate')}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-8 w-32 bg-muted/30 rounded-lg animate-pulse" />
                <div className="h-32 bg-card/30 rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-24">
            <div className="max-w-md mx-auto space-y-6">
              <div className="relative mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-2xl" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto border border-primary/20">
                  <Plus className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold">Start Your Journey</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">Add your first application to begin tracking your progress and organizing your job search</p>
              <Button onClick={() => setShowAddDialog(true)} className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all mt-6">
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedApplications).map(([company, companyApps], groupIndex) => (
              <div key={company} className="space-y-4 animate-fade-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                <div className="flex items-center gap-3">
                  <Link to={`/company/${encodeURIComponent(company)}`}>
                    <h2 className="text-xl font-semibold hover:text-primary transition-colors cursor-pointer">
                      {company}
                    </h2>
                  </Link>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                    {companyApps.length} {companyApps.length === 1 ? 'role' : 'roles'}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                  {companyApps.map((application, index) => (
                    <div key={application.id} className="animate-fade-in" style={{ animationDelay: `${(groupIndex * 100) + (index * 50)}ms` }}>
                      <ApplicationCard application={application} onDelete={handleDeleteApplication} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      </PullToRefresh>

      <AddApplicationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddApplication}
      />
      
      <Footer />
    </div>
  );
};

export default Dashboard;
