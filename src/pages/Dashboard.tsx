import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Crown, Sparkles, Filter, Search, X } from "lucide-react";
import { AddApplicationDialog } from "@/components/AddApplicationDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { useSubscription } from "@/hooks/useSubscription";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader";
import { DashboardStats } from "@/components/Dashboard/DashboardStats";
import { WeeklyChart } from "@/components/Dashboard/WeeklyChart";
import { ApplicationsList } from "@/components/Dashboard/ApplicationsList";
import { SEO } from "@/components/SEO";

interface Application {
  id: string;
  company: string;
  position: string;
  status: "pending" | "interview" | "rejected" | "accepted";
  appliedDate: string;
  url: string;
  questions: number;
  answersCompleted: number;
  avgResponseDays?: number;
  fastestResponseDays?: number;
  companyDomain?: string | null;
}

// Helper to derive company domain from URL (mirrors ApplicationCard logic)
const JOB_BOARD_PATTERNS = [
  /lever\.co$/i,
  /greenhouse\.io$/i,
  /workday\.com$/i,
  /myworkdayjobs\.com$/i,
  /ashbyhq\.com$/i,
  /icims\.com$/i,
  /smartrecruiters\.com$/i,
  /jobvite\.com$/i,
  /applytojob\.com$/i,
  /breezy\.hr$/i,
  /recruitee\.com$/i,
  /bamboohr\.com$/i,
  /jazz\.co$/i,
  /jazzhq\.com$/i,
  /workable\.com$/i,
  /taleo\.net$/i,
  /oraclecloud\.com$/i,
  /successfactors\.com$/i,
  /ultipro\.com$/i,
  /paylocity\.com$/i,
  /paycom\.com$/i,
  /adp\.com$/i,
  /phenom\.com$/i,
  /eightfold\.ai$/i,
  /avature\.net$/i,
  /cornerstoneondemand\.com$/i,
  /pinpointhq\.com$/i,
  /teamtailor\.com$/i,
  /personio\.de$/i,
  /personio\.com$/i,
  /gem\.com$/i,
  /wellfound\.com$/i,
  /angel\.co$/i,
  /ycombinator\.com$/i,
  /workatastartup\.com$/i,
  /dover\.com$/i,
  /rippling\.com$/i,
  /gusto\.com$/i,
  /deel\.com$/i,
  /remote\.com$/i,
  /oysterhr\.com$/i,
  /linkedin\.com$/i,
  /indeed\.com$/i,
  /ziprecruiter\.com$/i,
  /glassdoor\.com$/i,
  /monster\.com$/i,
  /careerbuilder\.com$/i,
  /dice\.com$/i,
  /simplyhired\.com$/i,
  /snagajob\.com$/i,
  /flexjobs\.com$/i,
  /builtin\.com$/i,
  /themuse\.com$/i,
  /hired\.com$/i,
  /triplebyte\.com$/i,
  /otta\.com$/i,
  /cord\.co$/i,
  /getro\.com$/i,
];

function deriveCompanyDomain(url: string, companyName: string): string {
  try {
    const u = new URL(url);
    const hostname = u.hostname.replace(/^www\./, "");
    if (JOB_BOARD_PATTERNS.some((p) => p.test(hostname))) {
      return companyName.toLowerCase().replace(/\s+/g, "") + ".com";
    }
    return hostname;
  } catch {
    return companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  }
}

// Normalize company names for grouping (handles variations like "JPMorgan Chase" vs "JPMorgan Chase & Co.")
function normalizeCompanyName(name: string): string {
  // Remove common suffixes and normalize
  return name
    .replace(/[,.]?\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?|& Co\.?|Group|Holdings|International|Intl\.?)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const Dashboard = () => {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "interview" | "rejected" | "accepted">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const { 
    subscriptionStatus, 
    checking: checkingSubscription, 
    handleUpgrade, 
    handleManageSubscription,
    checkSubscription 
  } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
    fetchApplications();
    fetchUserProfile();
    checkIfFirstTimeUser();
    
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

  const checkIfFirstTimeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has any applications
    const { data: apps } = await supabase
      .from("applications")
      .select("id")
      .limit(1);

    // Show onboarding if no applications exist
    if (!apps || apps.length === 0) {
      setShowOnboarding(true);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if email is verified
    if (!session.user.email_confirmed_at) {
      console.log('Email not confirmed, redirecting to auth');
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

  const handleRefresh = async () => {
    await Promise.all([
      fetchApplications(),
      fetchUserProfile(),
      checkSubscription()
    ]);
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

          // Get status history to calculate actual response time
          const { data: statusHistory } = await supabase
            .from("application_status_history")
            .select("changed_at, status")
            .eq("application_id", app.id)
            .order("changed_at", { ascending: true });

          // Calculate response time from applied_date to first status change
          let actualResponseDays = null;
          if (statusHistory && statusHistory.length > 0 && app.status !== "pending") {
            const appliedDate = new Date(app.applied_date);
            const firstStatusChange = new Date(statusHistory[0].changed_at);
            
            // Normalize to calendar days
            const appliedDay = new Date(appliedDate.getFullYear(), appliedDate.getMonth(), appliedDate.getDate());
            const responseDay = new Date(firstStatusChange.getFullYear(), firstStatusChange.getMonth(), firstStatusChange.getDate());
            
            const daysDiff = Math.floor((responseDay.getTime() - appliedDay.getTime()) / (1000 * 60 * 60 * 24));
            actualResponseDays = daysDiff;
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
            actualResponseDays,
            companyDomain: app.company_domain,
          };
        })
      );

      // Fetch company stats for each unique company
      const uniqueCompanies = [...new Set(transformed.map(app => app.company))];
      const companyStatsMap = new Map();
      
      await Promise.all(
        uniqueCompanies.map(async (company) => {
          try {
            const { data: stats } = await supabase.rpc('get_company_stats', { 
              company_name: company 
            });
            
            if (stats && stats.length > 0) {
              companyStatsMap.set(company, {
                avgResponseDays: stats[0].avg_response_days,
                fastestResponseDays: stats[0].fastest_response_days,
              });
            }
          } catch (error) {
            console.error(`Error fetching stats for ${company}:`, error);
          }
        })
      );

      // Add stats to applications
      const transformedWithStats = transformed.map(app => ({
        ...app,
        avgResponseDays: app.actualResponseDays !== null ? app.actualResponseDays : companyStatsMap.get(app.company)?.avgResponseDays,
        fastestResponseDays: companyStatsMap.get(app.company)?.fastestResponseDays,
      }));

      setApplications(transformedWithStats);
    }
    setLoading(false);
  };

  const handleAddApplication = async (data: { company?: string; position?: string; url: string }) => {
    // Check if user has reached application limit (free users: 10 apps)
    const hasAccess = subscriptionStatus.subscribed || subscriptionStatus.is_trialing;
    if (!hasAccess && applications.length >= 10) {
      toast({
        title: "Application Limit Reached",
        description: "Free users can track up to 10 applications. Upgrade to Pro for unlimited tracking.",
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

    // Compute company domain for logo lookup
    const companyName = data.company || "Unknown Company";
    const companyDomain = deriveCompanyDomain(data.url, companyName);

    const { data: newApp, error } = await supabase
      .from("applications")
      .insert({
        company: companyName,
        position: data.position || "Unknown Position",
        url: data.url,
        user_id: user.id,
        company_domain: companyDomain,
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

    // Extract job details and questions in the background
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // First, extract company, position, and job summary
      const jobInfoResponse = await supabase.functions.invoke('refresh-job-description', {
        body: {
          applicationId: newApp.id,
          jobUrl: data.url,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      // Then extract application questions
      const questionsResponse = await supabase.functions.invoke('extract-job-questions', {
        body: {
          applicationId: newApp.id,
          jobUrl: data.url,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (jobInfoResponse.data?.success || questionsResponse.data?.success) {
        const parts = [];
        if (jobInfoResponse.data?.company && jobInfoResponse.data?.position) {
          parts.push(`${jobInfoResponse.data.company} - ${jobInfoResponse.data.position}`);
        }
        if (questionsResponse.data?.questionsFound) {
          parts.push(`${questionsResponse.data.questionsFound} questions extracted`);
        }
        
        toast({
          title: "Extraction Complete",
          description: parts.length > 0 ? parts.join('. ') : 'Job details extracted',
        });
      } else {
        console.error('Failed to extract job info:', jobInfoResponse.data?.error);
        console.error('Failed to extract questions:', questionsResponse.data?.error);
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

  const today = new Date().toISOString().split('T')[0];
  
  const stats = {
    total: applications.length,
    newToday: applications.filter((a) => a.appliedDate === today).length,
    pending: applications.filter((a) => a.status === "pending").length,
    interviews: applications.filter((a) => a.status === "interview").length,
    responseRate: applications.length > 0 
      ? Math.round(((applications.filter((a) => a.status !== "pending").length) / applications.length) * 100)
      : 0,
  };

  // Filter applications by status and search query
  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.position.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Group applications by normalized company name (consolidates variations like "JPMorgan Chase" vs "JPMorgan Chase & Co.")
  const groupedApplications = filteredApplications.reduce((acc, app) => {
    const normalizedName = normalizeCompanyName(app.company);
    // Use the first encountered company name as the display name for the group
    const existingGroupKey = Object.keys(acc).find(
      key => normalizeCompanyName(key) === normalizedName
    );
    const groupKey = existingGroupKey || app.company;
    
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(app);
    return acc;
  }, {} as Record<string, Application[]>);

  // Compute the most common domain for each company group (for consistent logos)
  const groupDomains = useMemo(() => {
    const domains: Record<string, string> = {};
    Object.entries(groupedApplications).forEach(([company, apps]) => {
      // Count domain occurrences
      const domainCounts: Record<string, number> = {};
      apps.forEach(app => {
        const domain = app.companyDomain || '';
        if (domain) {
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        }
      });
      // Find most common domain
      let maxCount = 0;
      let mostCommonDomain = '';
      Object.entries(domainCounts).forEach(([domain, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonDomain = domain;
        }
      });
      if (mostCommonDomain) {
        domains[company] = mostCommonDomain;
      }
    });
    return domains;
  }, [groupedApplications]);

  return (
    <div className="min-h-screen bg-background relative">
      <SEO 
        title="Your Job Applications Dashboard"
        description="Manage and track all your job applications in one place. View application status, interview schedules, and get AI-powered insights to improve your job search success rate."
        keywords="job dashboard, application tracker, interview tracking, job search management"
        noindex={true}
      />
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/3 via-background to-background pointer-events-none" />
      
      {/* Header */}
      <DashboardHeader
        userProfile={userProfile}
        subscriptionStatus={subscriptionStatus}
        applicationsCount={applications.length}
        onAddApplication={() => {
          const hasAccess = subscriptionStatus.subscribed || subscriptionStatus.is_trialing;
          if (!hasAccess && applications.length >= 10) {
            toast({
              title: "Application Limit Reached",
              description: "Free users can track up to 10 applications. Upgrade to Pro for unlimited tracking.",
              variant: "destructive",
            });
          } else {
            setShowAddDialog(true);
          }
        }}
        onSignOut={handleSignOut}
      />

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
        {/* Subscription Banner - only show if under the application limit */}
        {!checkingSubscription && !loading && !subscriptionStatus.subscribed && !subscriptionStatus.is_trialing && applications.length < 10 && (
          <div className="mb-6 sm:mb-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Upgrade to Qraft Pro</h3>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/20 text-success border border-success/30">
                    7-Day Free Trial
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Try Qraft Pro free for 7 days, then just $29.99/month. Cancel anytime.
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
        {!checkingSubscription && !loading && !subscriptionStatus.subscribed && !subscriptionStatus.is_trialing && applications.length >= 8 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-warning/10 via-warning/5 to-primary/10 border border-warning/20 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-warning/20 flex-shrink-0">
                <Sparkles className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-warning">
                    {applications.length >= 10 ? 'Application Limit Reached' : 'Almost at Your Limit'}
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground">
                    {applications.length}/10 apps
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-muted/50 rounded-full h-2 mb-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-warning to-primary transition-all duration-500 rounded-full"
                    style={{ width: `${(applications.length / 10) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {applications.length >= 10 
                    ? 'You\'ve reached the free tier limit of 10 applications. Upgrade to Pro for unlimited tracking and AI-powered features.'
                    : `You're using ${applications.length} of 10 free applications. Upgrade to Pro for unlimited tracking and AI-powered features.`
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
        <DashboardStats stats={stats} />

        {/* Weekly Chart */}
        {!loading && applications.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <WeeklyChart applications={applications} />
          </div>
        )}

        {/* Search and Filter */}
        {!loading && applications.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Search by company or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 rounded-full border-border/40"
                aria-label="Search applications"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter applications by status">
              {(["all", "pending", "interview", "rejected", "accepted"] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="rounded-full transition-all"
                  role="tab"
                  aria-selected={statusFilter === status}
                  aria-controls="applications-list"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}

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
          <EmptyState
            icon={Filter}
            title="Start Your Journey"
            description="Add your first application to begin tracking your progress and organizing your job search"
            action={
              <Button onClick={() => setShowAddDialog(true)} className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all" size="lg">
                Add Application
              </Button>
            }
          />
        ) : filteredApplications.length === 0 ? (
          <EmptyState
            icon={searchQuery ? Search : Filter}
            title={searchQuery ? "No matches found" : "No applications found"}
            description={searchQuery 
              ? `No applications match "${searchQuery}". Try a different search term.`
              : "No applications match the current filter. Try selecting a different status."}
            action={
              <Button 
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                variant="outline"
                className="rounded-full"
              >
                Clear {searchQuery ? "Search & Filter" : "Filter"}
              </Button>
            }
            className="py-12"
          />
        ) : (
          <ApplicationsList 
            groupedApplications={groupedApplications}
            groupDomains={groupDomains}
            onDelete={handleDeleteApplication}
          />
        )}
      </main>
      </PullToRefresh>

      <AddApplicationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddApplication}
      />
      
      <OnboardingDialog
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
      
      <Footer />
    </div>
  );
};

export default Dashboard;
