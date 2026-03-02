import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
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
  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/30">
    <div className={`p-2 rounded-lg bg-${accent}/10 shrink-0`}>
      <Icon className={`h-4 w-4 text-${accent}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

const CompanyProfile = () => {
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

  useEffect(() => {
    checkAuth();
    if (companyName) {
      fetchCompanyData();
      fetchCompanyNotes();
      fetchCommunityStats();
      fetchExperiences();
      fetchSharedQuestions();
    }
  }, [companyName]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

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
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard" className="transition-all duration-300 hover:scale-105">
              <img src={qraftLogo} alt="Qraft" className="h-16 dark:invert" />
            </Link>
          </div>
        </div>
      </header>

      {/* Compact Hero */}
      <div className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-6">
            {/* Logo */}
            {!logoError ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-background/80 flex items-center justify-center border border-border/50 shadow-lg shrink-0">
                <img
                  src={logoFallback ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128` : getCompanyLogo()}
                  alt={decodedCompany}
                  className="w-full h-full object-contain p-3"
                  onError={() => {
                    if (!logoFallback) setLogoFallback(true);
                    else setLogoError(true);
                  }}
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border/50 shadow-lg shrink-0">
                <span className="text-3xl font-bold text-primary">{decodedCompany.charAt(0).toUpperCase()}</span>
              </div>
            )}

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold tracking-tight truncate">{decodedCompany}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {metrics.totalApps} {metrics.totalApps === 1 ? 'application' : 'applications'} tracked
                {communityStats && communityStats.total_applications > metrics.totalApps && (
                  <span> · {communityStats.total_applications} across community</span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <a href={`https://${companyDomain}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1 rounded-full border border-border/50 hover:border-primary/30">
                  <Globe className="h-3 w-3" /> Website
                </a>
                <a href={`https://www.linkedin.com/company/${decodedCompany.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1 rounded-full border border-border/50 hover:border-primary/30">
                  <Linkedin className="h-3 w-3" /> LinkedIn
                </a>
                <a href={`https://${companyDomain}/careers`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1 rounded-full border border-border/50 hover:border-primary/30">
                  <Briefcase className="h-3 w-3" /> Careers
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Two-column grid for desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── Left column (2/3) ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            {companyDescription && (
              <Card className="border-border/40 bg-card/50">
                <div className="p-5">
                  <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    About {decodedCompany}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{companyDescription}</p>
                  {companyProfileData?.industry && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {companyProfileData.industry && <Badge variant="secondary" className="text-xs">{companyProfileData.industry}</Badge>}
                      {companyProfileData.size && <Badge variant="secondary" className="text-xs">{companyProfileData.size}</Badge>}
                      {companyProfileData.headquarters && <Badge variant="secondary" className="text-xs">{companyProfileData.headquarters}</Badge>}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Application History */}
            <Card className="border-border/40 bg-card/50">
              <div className="p-5">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Application History
                </h2>
                <div className="space-y-2">
                  {applications.map((app) => {
                    const StatusIcon = statusConfig[app.status as keyof typeof statusConfig]?.icon || AlertCircle;
                    const responseTime = app.history.length > 0
                      ? differenceInDays(new Date(app.history[0].changed_at), new Date(app.applied_date))
                      : null;

                    return (
                      <Link key={app.id} to={`/application/${app.id}`} className="block">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-background/80 transition-all group">
                          <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                            <StatusIcon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{app.position}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{format(new Date(app.applied_date), "MMM d, yyyy")}</span>
                              {responseTime !== null && <span>· {responseTime}d response</span>}
                            </div>
                          </div>
                          <Badge
                            variant={statusConfig[app.status as keyof typeof statusConfig]?.variant || "secondary"}
                            className="text-xs shrink-0"
                          >
                            {statusConfig[app.status as keyof typeof statusConfig]?.label || app.status}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Card>

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
          <div className="space-y-6">

            {/* Community Stats */}
            <Card className="border-border/40 bg-card/50">
              <div className="p-5">
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Community Stats
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    icon={Clock}
                    label="Avg Response"
                    value={communityStats?.avg_response_days && communityStats.avg_response_days > 0 ? `${Math.round(communityStats.avg_response_days)}d` : "—"}
                    sub={communityStats?.fastest_response_days && communityStats.fastest_response_days > 0 ? `Fastest: ${communityStats.fastest_response_days}d` : undefined}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Interview Rate"
                    value={`${communityStats?.interview_rate || 0}%`}
                    sub={`${communityStats?.interview_count || 0} of ${communityStats?.total_applications || 0}`}
                  />
                  <StatCard
                    icon={Target}
                    label="Acceptance"
                    value={`${communityStats?.acceptance_rate || 0}%`}
                    sub={`${communityStats?.accepted_count || 0} accepted`}
                  />
                  <StatCard
                    icon={XCircle}
                    label="Rejection"
                    value={`${communityStats?.rejection_rate || 0}%`}
                    sub={`${communityStats?.rejected_count || 0} rejected`}
                    accent="destructive"
                  />
                </div>
              </div>
            </Card>

            {/* Your Stats */}
            <Card className="border-border/40 bg-card/50">
              <div className="p-5">
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Your Stats
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    icon={Clock}
                    label="Avg Response"
                    value={metrics.avgResponseDays != null && metrics.avgResponseDays > 0 ? `${metrics.avgResponseDays}d` : "—"}
                    sub={metrics.fastestResponseDays != null && metrics.fastestResponseDays > 0 ? `Fastest: ${metrics.fastestResponseDays}d` : undefined}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Interview Rate"
                    value={`${metrics.interviewRate}%`}
                    sub={`${applications.filter(a => a.status === "interview" || a.history.some(h => h.status === "interview")).length} of ${metrics.totalApps}`}
                  />
                  <StatCard
                    icon={Target}
                    label="Acceptance"
                    value={`${metrics.acceptanceRate}%`}
                    sub={`${applications.filter(a => a.status === "accepted").length} accepted`}
                  />
                  <StatCard
                    icon={XCircle}
                    label="Rejection"
                    value={`${metrics.rejectionRate}%`}
                    sub={`${applications.filter(a => a.status === "rejected").length} rejected`}
                    accent="destructive"
                  />
                </div>
              </div>
            </Card>

            {/* Company Notes */}
            <Card className="border-border/40 bg-card/50">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Edit className="h-4 w-4 text-primary" />
                    Notes
                  </h2>
                  {!editingNotes ? (
                    <Button onClick={() => setEditingNotes(true)} variant="ghost" size="sm" className="h-7 text-xs">
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button onClick={() => { setCompanyNotes(savedNotes); setEditingNotes(false); }} variant="ghost" size="sm" className="h-7 text-xs">Cancel</Button>
                      <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm" className="h-7 text-xs">
                        <Save className="h-3 w-3 mr-1" /> {savingNotes ? "..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
                {editingNotes ? (
                  <Textarea
                    value={companyNotes}
                    onChange={(e) => setCompanyNotes(e.target.value)}
                    placeholder="Add notes about this company..."
                    className="min-h-24 text-sm bg-background/50"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {companyNotes || "No notes yet. Click Edit to add notes."}
                  </p>
                )}
              </div>
            </Card>

            {/* Community Insights */}
            {communityStats && (communityStats.avg_response_days || communityStats.interview_rate > 0 || metrics.totalApps > 0) && (
              <Card className="border-border/40 bg-gradient-to-br from-primary/5 to-card/50">
                <div className="p-5">
                  <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Insights
                  </h2>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    {communityStats.avg_response_days != null && communityStats.avg_response_days > 0 && (
                      <p className="flex gap-1.5">
                        <span className="text-primary shrink-0">•</span>
                        Typically responds within <span className="font-medium text-foreground">{Math.round(communityStats.avg_response_days)} days</span>
                      </p>
                    )}
                    {communityStats.interview_rate > 0 && (
                      <p className="flex gap-1.5">
                        <span className="text-primary shrink-0">•</span>
                        Interview rate: <span className="font-medium text-foreground">{communityStats.interview_rate}%</span>
                        {communityStats.interview_rate >= 30 ? " — excellent!" : communityStats.interview_rate >= 15 ? " — decent" : " — highly selective"}
                      </p>
                    )}
                    {metrics.totalApps > 0 && (
                      <p className="flex gap-1.5">
                        <span className="text-primary shrink-0">•</span>
                        You've applied to {metrics.totalApps} position{metrics.totalApps > 1 ? 's' : ''}
                        {metrics.interviewRate > (communityStats.interview_rate || 0) && " — above avg!"}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CompanyProfile;
