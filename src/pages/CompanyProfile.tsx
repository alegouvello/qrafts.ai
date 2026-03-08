import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { CompanyExperiences } from "@/components/CompanyExperiences";
import { CompanySharedQuestions } from "@/components/CompanySharedQuestions";
import {
  ArrowLeft,
  Building2,
  Clock,
  TrendingUp,
  Calendar,
  Target,
  ExternalLink,
  Save,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Globe,
  Linkedin,
  Briefcase,
  Bell,
  BellOff,
  Sparkles,
  MapPin,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import qraftLogo from "@/assets/qrafts-logo.png";

interface Application {
  id: string;
  company: string;
  position: string;
  status: string;
  applied_date: string;
  url: string;
  created_at: string;
  history: {
    status: string;
    changed_at: string;
  }[];
}

interface CompanyNote {
  id: string;
  company_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface CompanyStats {
  total_applications: number;
  avg_response_days: number | null;
  fastest_response_days: number | null;
  interview_rate: number;
  acceptance_rate: number;
  rejection_rate: number;
  interview_count: number;
  accepted_count: number;
  rejected_count: number;
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  interview: { label: "Interview", variant: "default" as const, icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
  accepted: { label: "Accepted", variant: "outline" as const, icon: CheckCircle },
};

/* ─── Stat mini-card ─── */
const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) => (
  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
    <div className={`p-1.5 rounded-md shrink-0 ${accent === "destructive" ? "bg-destructive/10" : "bg-primary/10"}`}>
      <Icon className={`h-3.5 w-3.5 ${accent === "destructive" ? "text-destructive" : "text-primary"}`} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{label}</p>
      <p className="text-sm font-semibold leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{sub}</p>}
    </div>
  </div>
);

const CompanyProfile = () => {
  useAuthGuard();
  const { companyName } = useParams<{ companyName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [companyNotes, setCompanyNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoFallback, setLogoFallback] = useState(false);
  const [communityStats, setCommunityStats] = useState<CompanyStats | null>(null);
  const [companyDescription, setCompanyDescription] = useState<string | null>(null);
  const [companyProfileData, setCompanyProfileData] = useState<any>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [sharedQuestions, setSharedQuestions] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [jobMatchScores, setJobMatchScores] = useState<Record<string, any>>({});
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [togglingWatch, setTogglingWatch] = useState(false);

  useEffect(() => {
    if (companyName) {
      fetchCompanyData();
      fetchCompanyNotes();
      fetchCommunityStats();
      fetchExperiences();
      fetchSharedQuestions();
      fetchJobOpenings();
      fetchWatchStatus();
    }
  }, [companyName]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);




  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const decodedCompany = decodeURIComponent(companyName || "");

      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("company", decodedCompany)
        .order("applied_date", { ascending: false });

      if (appsError) throw appsError;

      const { data: history, error: historyError } = await (supabase as any)
        .from("application_status_history")
        .select("application_id, status, changed_at")
        .eq("user_id", user.id)
        .order("changed_at", { ascending: true });

      if (historyError) {
        console.error("Error fetching status history:", historyError);
      }

      const appsWithHistory: Application[] = (apps || []).map(app => ({
        ...app,
        history: (history || [])
          .filter((h: any) => h.application_id === app.id)
          .map((h: any) => ({ status: h.status, changed_at: h.changed_at })),
      }));

      setApplications(appsWithHistory);
      fetchCompanyProfile();
    } catch (error) {
      console.error("Error fetching company data:", error);
      toast({
        title: "Error",
        description: "Failed to load company data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const decodedCompany = decodeURIComponent(companyName || "");

      const { data, error } = await (supabase as any)
        .from("company_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("company_name", decodedCompany)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching notes:", error);
      }

      if (data) {
        setCompanyNotes(data.notes || "");
        setSavedNotes(data.notes || "");
      }
    } catch (error) {
      console.error("Error fetching company notes:", error);
    }
  };

  const fetchCommunityStats = async () => {
    try {
      const decodedCompany = decodeURIComponent(companyName || "");
      
      const { data, error } = await supabase.rpc('get_company_stats', {
        company_name: decodedCompany
      });

      if (error) {
        console.error("Error fetching community stats:", error);
        return;
      }

      if (data && data.length > 0) {
        setCommunityStats(data[0]);
      }
    } catch (error) {
      console.error("Error fetching community stats:", error);
    }
  };

  const fetchExperiences = async () => {
    try {
      const decodedCompany = decodeURIComponent(companyName || "");
      const { data, error } = await (supabase as any)
        .from("company_experiences")
        .select("*")
        .eq("company_name", decodedCompany)
        .order("created_at", { ascending: false });
      if (!error) setExperiences(data || []);
    } catch (error) {
      console.error("Error fetching experiences:", error);
    }
  };

  const fetchSharedQuestions = async () => {
    try {
      const decodedCompany = decodeURIComponent(companyName || "");
      const { data, error } = await supabase
        .from("shared_questions")
        .select("*")
        .eq("company", decodedCompany)
        .order("position", { ascending: true });
      if (!error) setSharedQuestions(data || []);
    } catch (error) {
      console.error("Error fetching shared questions:", error);
    }
  };

  const fetchCompanyProfile = async () => {
    try {
      const decodedCompany = decodeURIComponent(companyName || "");
      const { data: cached } = await (supabase as any)
        .from("company_profiles")
        .select("*")
        .eq("company_name", decodedCompany)
        .maybeSingle();

      if (cached?.description) {
        setCompanyDescription(cached.description);
        setCompanyProfileData(cached);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const domain = applications.length > 0
        ? (applications[0] as any).company_domain
        : undefined;

      supabase.functions.invoke("fetch-company-info", {
        body: { companyName: decodedCompany, domain },
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(({ data }) => {
        if (data?.profile?.description) {
          setCompanyDescription(data.profile.description);
          setCompanyProfileData(data.profile);
        }
      }).catch(console.error);
    } catch (error) {
      console.error("Error fetching company profile:", error);
    }
  };

  const fetchJobOpenings = async () => {
    try {
      const decodedCompany = decodeURIComponent(companyName || "");
      const { data, error } = await supabase
        .from("job_openings")
        .select("*")
        .eq("company_name", decodedCompany)
        .eq("is_active", true)
        .order("first_seen_at", { ascending: false });

      if (!error && data) {
        setJobOpenings(data);
        // Fetch match scores for current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user && data.length > 0) {
          const jobIds = data.map((j: any) => j.id);
          const { data: scores } = await supabase
            .from("job_match_scores")
            .select("*")
            .eq("user_id", user.id)
            .in("job_opening_id", jobIds);

          if (scores) {
            const scoreMap: Record<string, any> = {};
            scores.forEach((s: any) => { scoreMap[s.job_opening_id] = s; });
            setJobMatchScores(scoreMap);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching job openings:", error);
    }
  };

  const fetchWatchStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const decodedCompany = decodeURIComponent(companyName || "");
      const { data } = await supabase
        .from("company_watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_name", decodedCompany)
        .maybeSingle();
      setIsWatching(!!data);
    } catch (error) {
      console.error("Error fetching watch status:", error);
    }
  };

  const handleToggleWatch = async () => {
    setTogglingWatch(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const decodedCompany = decodeURIComponent(companyName || "");

      if (isWatching) {
        await supabase
          .from("company_watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("company_name", decodedCompany);
        setIsWatching(false);
        toast({ title: "Unwatched", description: `You'll no longer receive job alerts for ${decodedCompany}` });
      } else {
        await supabase
          .from("company_watchlist")
          .insert({ user_id: user.id, company_name: decodedCompany });
        setIsWatching(true);
        toast({ title: "Watching!", description: `You'll receive daily alerts for high-match jobs at ${decodedCompany}` });
      }
    } catch (error) {
      console.error("Error toggling watch:", error);
      toast({ title: "Error", description: "Failed to update watch status", variant: "destructive" });
    } finally {
      setTogglingWatch(false);
    }
  };

  const handleScanJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const decodedCompany = decodeURIComponent(companyName || "");

      // Get user resume and location
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("resume_text, location")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke("crawl-job-openings", {
        body: {
          companyName: decodedCompany,
          userResumeText: profile?.resume_text || null,
          userId: user.id,
          userLocation: profile?.location || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Scan Complete",
        description: `Found ${data?.totalFound || 0} job openings at ${decodedCompany}`,
      });

      // Refresh the list
      await fetchJobOpenings();
    } catch (error) {
      console.error("Error scanning jobs:", error);
      toast({ title: "Error", description: "Failed to scan for job openings", variant: "destructive" });
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const decodedCompany = decodeURIComponent(companyName || "");

      const { data: existing } = await (supabase as any)
        .from("company_notes")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_name", decodedCompany)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("company_notes")
          .update({ notes: companyNotes })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("company_notes")
          .insert({
            user_id: user.id,
            company_name: decodedCompany,
            notes: companyNotes,
          });
        if (error) throw error;
      }

      setSavedNotes(companyNotes);
      setEditingNotes(false);
      toast({ title: "Notes Saved", description: "Your company notes have been saved" });
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    } finally {
      setSavingNotes(false);
    }
  };

  const calculateMetrics = () => {
    if (applications.length === 0) {
      return { avgResponseDays: null, fastestResponseDays: null, totalApps: 0, interviewRate: 0, acceptanceRate: 0, rejectionRate: 0 };
    }

    const responseTimes = applications
      .filter(app => app.history.length > 0)
      .map(app => differenceInDays(new Date(app.history[0].changed_at), new Date(app.applied_date)));

    const interviewCount = applications.filter(
      a => a.status === "interview" || a.history.some(h => h.status === "interview")
    ).length;
    const acceptedCount = applications.filter(a => a.status === "accepted").length;
    const rejectedCount = applications.filter(a => a.status === "rejected").length;

    return {
      avgResponseDays: responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null,
      fastestResponseDays: responseTimes.length > 0 ? Math.min(...responseTimes) : null,
      totalApps: applications.length,
      interviewRate: Math.round((interviewCount / applications.length) * 100),
      acceptanceRate: Math.round((acceptedCount / applications.length) * 100),
      rejectionRate: Math.round((rejectedCount / applications.length) * 100),
    };
  };

  const metrics = calculateMetrics();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading company profile...</p>
        </div>
      </div>
    );
  }

  const decodedCompany = decodeURIComponent(companyName || "");

  const getCompanyDomain = (): string | null => {
    const domainsFromApps = applications.map(a => (a as any).company_domain).filter(Boolean) as string[];
    if (domainsFromApps.length > 0) {
      const freq = domainsFromApps.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {} as Record<string, number>);
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    }
    return null;
  };

  const companyDomain = getCompanyDomain() || `${decodedCompany.toLowerCase().replace(/\s+/g, '')}.com`;
  const getCompanyLogo = () => `https://logo.clearbit.com/${companyDomain}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${decodedCompany} Company Profile & Insights`}
        description={`View detailed insights about ${decodedCompany} including application success rates, average response times, and community-sourced statistics.`}
        keywords={`${decodedCompany} jobs, company insights, application statistics, company profile`}
        noindex={true}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/dashboard" className="transition-all duration-300 hover:scale-105">
            <img src={qraftLogo} alt="Qraft" className="h-12 dark:invert" />
          </Link>
        </div>
      </header>

      {/* Hero — Compact inline */}
      <div className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-5 max-w-7xl">
          <div className="flex items-center gap-5">
            {!logoError ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-background flex items-center justify-center border border-border/50 shadow-md shrink-0">
                <img
                  src={logoFallback ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=256` : getCompanyLogo()}
                  alt={decodedCompany}
                  className="w-full h-full object-contain p-2"
                  onError={() => { if (!logoFallback) setLogoFallback(true); else setLogoError(true); }}
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border/50 shadow-md shrink-0">
                <span className="text-xl font-bold text-primary">{decodedCompany.charAt(0).toUpperCase()}</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{decodedCompany}</h1>
                {companyProfileData?.industry && (
                  <Badge variant="secondary" className="text-[11px]">{companyProfileData.industry}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {metrics.totalApps} application{metrics.totalApps !== 1 ? 's' : ''} tracked
                  {communityStats && communityStats.total_applications > metrics.totalApps && (
                    <> · {communityStats.total_applications} community</>
                  )}
                </span>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <a href={companyProfileData?.website_url || `https://${companyDomain}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                    <Globe className="h-3 w-3" /> Website
                  </a>
                  {companyProfileData?.linkedin_url && (
                    <>
                      <span className="text-border">·</span>
                      <a href={companyProfileData.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                        <Linkedin className="h-3 w-3" /> LinkedIn
                      </a>
                    </>
                  )}
                  {companyProfileData?.careers_url && (
                    <>
                      <span className="text-border">·</span>
                      <a href={companyProfileData.careers_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                        <Briefcase className="h-3 w-3" /> Careers
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Watch button in hero */}
            <Button
              variant={isWatching ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-8 text-xs gap-1.5"
              onClick={handleToggleWatch}
              disabled={togglingWatch}
            >
              {togglingWatch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isWatching ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              {isWatching ? "Watching" : "Watch"}
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-5 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ─── Left column (2/3) ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* About + Tags — Inline */}
            {companyDescription && (
              <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  About
                </h2>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{companyDescription}</p>
                {(companyProfileData?.size || companyProfileData?.headquarters) && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {companyProfileData.size && <Badge variant="outline" className="text-[10px] font-normal">{companyProfileData.size}</Badge>}
                    {companyProfileData.headquarters && <Badge variant="outline" className="text-[10px] font-normal">{companyProfileData.headquarters}</Badge>}
                  </div>
                )}
              </div>
            )}

            {/* Application History */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-4">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Application History
                <Badge variant="secondary" className="text-[10px] ml-auto font-normal">{applications.length}</Badge>
              </h2>
              <div className="space-y-1.5">
                {applications.map((app) => {
                  const StatusIcon = statusConfig[app.status as keyof typeof statusConfig]?.icon || AlertCircle;
                  const responseTime = app.history.length > 0
                    ? differenceInDays(new Date(app.history[0].changed_at), new Date(app.applied_date))
                    : null;

                  return (
                    <Link key={app.id} to={`/application/${app.id}`} className="block">
                      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group">
                        <StatusIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate group-hover:text-primary transition-colors">{app.position}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {format(new Date(app.applied_date), "MMM d, yyyy")}
                            {responseTime !== null && responseTime > 0 && <> · {responseTime}d response</>}
                          </p>
                        </div>
                        <Badge
                          variant={statusConfig[app.status as keyof typeof statusConfig]?.variant || "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {statusConfig[app.status as keyof typeof statusConfig]?.label || app.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Open Positions */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  Open Positions
                  {jobOpenings.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-normal">{jobOpenings.length}</Badge>
                  )}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={handleScanJobs}
                  disabled={loadingJobs}
                >
                  {loadingJobs ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  {loadingJobs ? "Scanning…" : "Scan"}
                </Button>
              </div>

              {loadingJobs && jobOpenings.length === 0 ? (
                <div className="text-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">Scanning careers page…</p>
                </div>
              ) : jobOpenings.length === 0 ? (
                <div className="text-center py-5">
                  <Briefcase className="h-6 w-6 text-muted-foreground/20 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No openings found. Click Scan to crawl careers page.</p>
                </div>
              ) : (
                (() => {
                  const sortedJobs = [...jobOpenings]
                    .sort((a, b) => (jobMatchScores[b.id]?.match_score || 0) - (jobMatchScores[a.id]?.match_score || 0));
                  const displayedJobs = showAllJobs ? sortedJobs : sortedJobs.slice(0, 10);
                  const now = Date.now();
                  const ONE_DAY = 24 * 60 * 60 * 1000;

                  return (
                    <>
                      <div className="space-y-1.5">
                        {displayedJobs.map((job) => {
                          const matchData = jobMatchScores[job.id];
                          const score = matchData?.match_score;
                          const isHighMatch = score && score >= 80;
                          const isMedMatch = score && score >= 60 && score < 80;
                          const isNew = job.first_seen_at && (now - new Date(job.first_seen_at).getTime()) < ONE_DAY;

                          return (
                            <div
                              key={job.id}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                                isNew
                                  ? "border-green-500/30 bg-green-500/5"
                                  : isHighMatch
                                    ? "border-primary/20 bg-primary/5"
                                    : "border-transparent hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[13px] font-medium truncate">{job.title}</p>
                                  {isNew && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10 shrink-0">New</Badge>
                                  )}
                                  {isHighMatch && (
                                    <Sparkles className="h-3 w-3 text-primary shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {job.location && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                      <MapPin className="h-2.5 w-2.5" /> {job.location}
                                    </span>
                                  )}
                                  {job.department && (
                                    <span className="text-[11px] text-muted-foreground">{job.department}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                {score != null && (
                                  <div className="flex items-center gap-1.5">
                                    <Progress value={score} className="w-12 h-1.5" />
                                    <span className={`text-xs font-semibold tabular-nums ${
                                      isHighMatch ? "text-primary" : isMedMatch ? "text-yellow-600" : "text-muted-foreground"
                                    }`}>
                                      {score}%
                                    </span>
                                  </div>
                                )}
                                {job.url && (
                                  <a href={job.url} target="_blank" rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary transition-colors">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {sortedJobs.length > 10 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs text-muted-foreground h-7"
                          onClick={() => setShowAllJobs(!showAllJobs)}
                        >
                          {showAllJobs ? "Show top 10 only" : `Show all ${sortedJobs.length} positions`}
                        </Button>
                      )}
                    </>
                  );
                })()
              )}

              {isWatching && (
                <p className="text-[11px] text-muted-foreground mt-2.5 flex items-center gap-1 border-t border-border/30 pt-2.5">
                  <Bell className="h-3 w-3 text-primary" /> Daily email alerts enabled for 80%+ matches
                </p>
              )}
            </div>

            {/* Community Experiences */}
            <CompanyExperiences
              companyName={decodedCompany}
              experiences={experiences}
              currentUserId={currentUserId}
              onRefresh={fetchExperiences}
            />

            {/* Shared Interview Questions */}
            <CompanySharedQuestions
              companyName={decodedCompany}
              questions={sharedQuestions}
            />
          </div>

          {/* ─── Right sidebar (1/3) ─── */}
          <div className="space-y-4">

            {/* Stats — Unified card with tabs-like sections */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-4">
              {/* Community */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Community</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <StatCard icon={Clock} label="Avg Response"
                    value={communityStats?.avg_response_days && communityStats.avg_response_days > 0 ? `${Math.round(communityStats.avg_response_days)}d` : "—"}
                    sub={communityStats?.fastest_response_days && communityStats.fastest_response_days > 0 ? `Fastest: ${communityStats.fastest_response_days}d` : undefined}
                  />
                  <StatCard icon={TrendingUp} label="Interview Rate"
                    value={`${communityStats?.interview_rate || 0}%`}
                    sub={`${communityStats?.interview_count || 0} of ${communityStats?.total_applications || 0}`}
                  />
                  <StatCard icon={Target} label="Acceptance"
                    value={`${communityStats?.acceptance_rate || 0}%`}
                    sub={`${communityStats?.accepted_count || 0} accepted`}
                  />
                  <StatCard icon={XCircle} label="Rejection"
                    value={`${communityStats?.rejection_rate || 0}%`}
                    sub={`${communityStats?.rejected_count || 0} rejected`}
                    accent="destructive"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/30" />

              {/* Your stats */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Your Stats</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <StatCard icon={Clock} label="Avg Response"
                    value={metrics.avgResponseDays != null && metrics.avgResponseDays > 0 ? `${metrics.avgResponseDays}d` : "—"}
                    sub={metrics.fastestResponseDays != null && metrics.fastestResponseDays > 0 ? `Fastest: ${metrics.fastestResponseDays}d` : undefined}
                  />
                  <StatCard icon={TrendingUp} label="Interview Rate"
                    value={`${metrics.interviewRate}%`}
                    sub={`${applications.filter(a => a.status === "interview" || a.history.some(h => h.status === "interview")).length} of ${metrics.totalApps}`}
                  />
                  <StatCard icon={Target} label="Acceptance"
                    value={`${metrics.acceptanceRate}%`}
                    sub={`${applications.filter(a => a.status === "accepted").length} accepted`}
                  />
                  <StatCard icon={XCircle} label="Rejection"
                    value={`${metrics.rejectionRate}%`}
                    sub={`${applications.filter(a => a.status === "rejected").length} rejected`}
                    accent="destructive"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</h3>
                {!editingNotes ? (
                  <Button onClick={() => setEditingNotes(true)} variant="ghost" size="sm" className="h-6 text-[11px] px-2">
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button onClick={() => { setCompanyNotes(savedNotes); setEditingNotes(false); }} variant="ghost" size="sm" className="h-6 text-[11px] px-2">Cancel</Button>
                    <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm" className="h-6 text-[11px] px-2">
                      <Save className="h-3 w-3 mr-1" /> {savingNotes ? "…" : "Save"}
                    </Button>
                  </div>
                )}
              </div>
              {editingNotes ? (
                <Textarea
                  value={companyNotes}
                  onChange={(e) => setCompanyNotes(e.target.value)}
                  placeholder="Add notes about this company…"
                  className="min-h-20 text-[13px] bg-background/50"
                />
              ) : (
                <p className="text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {companyNotes || "No notes yet. Click Edit to add."}
                </p>
              )}
            </div>

            {/* Insights */}
            {communityStats && (communityStats.avg_response_days || communityStats.interview_rate > 0 || metrics.totalApps > 0) && (
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Insights</h3>
                <div className="space-y-2 text-[13px] text-muted-foreground">
                  {communityStats.avg_response_days != null && communityStats.avg_response_days > 0 && (
                    <p className="flex gap-1.5 items-start">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      Typically responds within <span className="font-medium text-foreground">{Math.round(communityStats.avg_response_days)}d</span>
                    </p>
                  )}
                  {communityStats.interview_rate > 0 && (
                    <p className="flex gap-1.5 items-start">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      Interview rate: <span className="font-medium text-foreground">{communityStats.interview_rate}%</span>
                      {communityStats.interview_rate >= 30 ? " — excellent" : communityStats.interview_rate >= 15 ? " — decent" : " — selective"}
                    </p>
                  )}
                  {metrics.totalApps > 0 && (
                    <p className="flex gap-1.5 items-start">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      You've applied to {metrics.totalApps} position{metrics.totalApps > 1 ? 's' : ''}
                      {metrics.interviewRate > (communityStats.interview_rate || 0) && " — above avg!"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CompanyProfile;
