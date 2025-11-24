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
  const [communityStats, setCommunityStats] = useState<CompanyStats | null>(null);

  useEffect(() => {
    checkAuth();
    if (companyName) {
      fetchCompanyData();
      fetchCompanyNotes();
      fetchCommunityStats();
    }
  }, [companyName]);

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

      // Fetch applications for this company
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("company", decodedCompany)
        .order("applied_date", { ascending: false });

      if (appsError) throw appsError;

      // Fetch status history
      const { data: history, error: historyError } = await (supabase as any)
        .from("application_status_history")
        .select("application_id, status, changed_at")
        .eq("user_id", user.id)
        .order("changed_at", { ascending: true });

      if (historyError) {
        console.error("Error fetching status history:", historyError);
      }

      // Combine data
      const appsWithHistory: Application[] = (apps || []).map(app => ({
        ...app,
        history: (history || [])
          .filter(h => h.application_id === app.id)
          .map(h => ({ status: h.status, changed_at: h.changed_at })),
      }));

      setApplications(appsWithHistory);
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

      // Use rpc or direct query to bypass type checking
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

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const decodedCompany = decodeURIComponent(companyName || "");

      // Check if notes exist
      const { data: existing } = await (supabase as any)
        .from("company_notes")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_name", decodedCompany)
        .maybeSingle();

      if (existing) {
        // Update existing notes
        const { error } = await (supabase as any)
          .from("company_notes")
          .update({ notes: companyNotes })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new notes
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
      toast({
        title: "Notes Saved",
        description: "Your company notes have been saved",
      });
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  // Calculate metrics
  const calculateMetrics = () => {
    if (applications.length === 0) {
      return {
        avgResponseDays: null,
        fastestResponseDays: null,
        totalApps: 0,
        interviewRate: 0,
        acceptanceRate: 0,
        rejectionRate: 0,
      };
    }

    const responseTimes = applications
      .filter(app => app.history.length > 0)
      .map(app => {
        const firstChange = app.history[0];
        return differenceInDays(new Date(firstChange.changed_at), new Date(app.applied_date));
      });

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

  // Get company logo from Clearbit
  const getCompanyLogo = (company: string) => {
    const domain = company.toLowerCase().replace(/\s+/g, '') + '.com';
    return `https://logo.clearbit.com/${domain}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading company profile...</p>
        </div>
      </div>
    );
  }

  const decodedCompany = decodeURIComponent(companyName || "");

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/dashboard" className="transition-all duration-300 hover:scale-105">
              <img src={qraftLogo} alt="Qraft" className="h-20 dark:invert" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-16 relative">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            {!logoError ? (
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-background/80 backdrop-blur-sm flex items-center justify-center border border-border/50 shadow-2xl shadow-primary/10 transition-all duration-300 hover:scale-105 hover:shadow-primary/20">
                <img 
                  src={getCompanyLogo(decodedCompany)}
                  alt={decodedCompany}
                  className="w-full h-full object-contain p-6"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border/50 shadow-2xl shadow-primary/10 backdrop-blur-sm">
                <span className="text-6xl font-bold text-primary">
                  {decodedCompany.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-5xl font-bold tracking-tight">{decodedCompany}</h1>
              <p className="text-lg text-muted-foreground">
                {metrics.totalApps} {metrics.totalApps === 1 ? 'Application' : 'Applications'} Tracked
              </p>
              {communityStats && communityStats.total_applications > metrics.totalApps && (
                <p className="text-sm text-muted-foreground">
                  {communityStats.total_applications} total applications tracked across the community
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12 space-y-12 max-w-7xl">

        {/* Key Metrics - Community Stats */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Community Insights</h2>
            <p className="text-sm text-muted-foreground">Statistics from all applications to {decodedCompany}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                  <div className="text-4xl font-bold tracking-tight">
                    {communityStats?.avg_response_days ? Math.round(communityStats.avg_response_days) : "—"}
                    {communityStats?.avg_response_days && <span className="text-xl text-muted-foreground ml-1.5">days</span>}
                  </div>
                  {communityStats?.fastest_response_days && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Fastest: {communityStats.fastest_response_days} days
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Interview Rate</p>
                  <div className="text-4xl font-bold tracking-tight">{communityStats?.interview_rate || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {communityStats?.interview_count || 0} of {communityStats?.total_applications || 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Acceptance Rate</p>
                  <div className="text-4xl font-bold tracking-tight">{communityStats?.acceptance_rate || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {communityStats?.accepted_count || 0} accepted
                  </p>
                </div>
              </div>
            </Card>

            <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-destructive/40 hover:shadow-xl hover:shadow-destructive/5 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-destructive/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Rejection Rate</p>
                  <div className="text-4xl font-bold tracking-tight">{communityStats?.rejection_rate || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {communityStats?.rejected_count || 0} rejected
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Your Personal Stats */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Your Statistics</h2>
            <p className="text-sm text-muted-foreground">Your personal metrics for {decodedCompany}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <div className="text-4xl font-bold tracking-tight">
                  {metrics.avgResponseDays !== null ? `${metrics.avgResponseDays}` : "—"}
                  {metrics.avgResponseDays !== null && <span className="text-xl text-muted-foreground ml-1.5">days</span>}
                </div>
                {metrics.fastestResponseDays !== null && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Fastest: {metrics.fastestResponseDays} days
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Interview Rate</p>
                <div className="text-4xl font-bold tracking-tight">{metrics.interviewRate}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {applications.filter(a => a.status === "interview" || a.history.some(h => h.status === "interview")).length} of {metrics.totalApps}
                </p>
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Acceptance Rate</p>
                <div className="text-4xl font-bold tracking-tight">{metrics.acceptanceRate}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {applications.filter(a => a.status === "accepted").length} accepted
                </p>
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-destructive/40 hover:shadow-xl hover:shadow-destructive/5 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-destructive/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Rejection Rate</p>
                <div className="text-4xl font-bold tracking-tight">{metrics.rejectionRate}%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {applications.filter(a => a.status === "rejected").length} rejected
                </p>
              </div>
            </div>
          </Card>
        </div>
        </div>

        {/* Company Notes */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Edit className="h-5 w-5 text-primary" />
                </div>
                Company Notes
              </h2>
              {!editingNotes ? (
                <Button
                  onClick={() => setEditingNotes(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setCompanyNotes(savedNotes);
                      setEditingNotes(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    size="sm"
                    className="rounded-full"
                  >
                    {savingNotes ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            {editingNotes ? (
              <Textarea
                value={companyNotes}
                onChange={(e) => setCompanyNotes(e.target.value)}
                placeholder="Add notes about this company (culture, contacts, interview insights, etc.)"
                className="min-h-32 bg-background/50"
              />
            ) : (
              <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {companyNotes || "No notes yet. Click Edit to add notes about this company."}
              </div>
            )}
          </div>
        </Card>

        {/* Application History */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="p-8">
            <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              Application History
            </h2>
            <div className="space-y-4">
              {applications.map((app) => {
                const StatusIcon = statusConfig[app.status as keyof typeof statusConfig]?.icon || AlertCircle;
                const responseTime = app.history.length > 0
                  ? differenceInDays(new Date(app.history[0].changed_at), new Date(app.applied_date))
                  : null;

                return (
                  <Card key={app.id} className="group overflow-hidden border-border/40 bg-background/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                              <StatusIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{app.position}</h3>
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge 
                                  variant={statusConfig[app.status as keyof typeof statusConfig]?.variant || "secondary"}
                                  className="rounded-full"
                                >
                                  {statusConfig[app.status as keyof typeof statusConfig]?.label || app.status}
                                </Badge>
                                {responseTime !== null && (
                                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Responded in {responseTime} days
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pl-14">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              Applied {format(new Date(app.applied_date), "MMM d, yyyy")}
                            </span>
                            {app.url && (
                              <a
                                href={app.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-primary transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Job Posting
                              </a>
                            )}
                          </div>
                        </div>
                        <Link to={`/application/${app.id}`}>
                          <Button variant="outline" size="sm" className="rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Insights */}
        {communityStats && (
          <Card className="border-border/40 bg-gradient-to-br from-primary/5 via-card/50 to-card/50 backdrop-blur-sm">
            <div className="p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                Community Insights
              </h2>
              <div className="space-y-4">
                {communityStats.avg_response_days && (
                  <p className="text-muted-foreground leading-relaxed flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>
                      {decodedCompany} typically responds within <span className="font-semibold text-foreground">{Math.round(communityStats.avg_response_days)} days</span> based on {communityStats.total_applications} total applications across the community.
                    </span>
                  </p>
                )}
                {communityStats.interview_rate > 0 && (
                  <p className="text-muted-foreground leading-relaxed flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>
                      The overall interview rate with {decodedCompany} is <span className="font-semibold text-foreground">{communityStats.interview_rate}%</span>
                      {communityStats.interview_rate >= 30 ? ", which is excellent across the board!" : communityStats.interview_rate >= 15 ? ", which is a decent rate." : ", which suggests high selectivity."}
                    </span>
                  </p>
                )}
                {metrics.totalApps > 0 && (
                  <p className="text-muted-foreground leading-relaxed flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>
                      You've applied to {metrics.totalApps} position{metrics.totalApps > 1 ? 's' : ''} at {decodedCompany}. 
                      {metrics.interviewRate > (communityStats.interview_rate || 0) && " Your interview rate is above the community average!"}
                      {metrics.interviewRate < (communityStats.interview_rate || 0) && " Consider refining your approach based on community success patterns."}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default CompanyProfile;
