import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { CompanyExperiences } from "@/components/CompanyExperiences";
import { CompanySharedQuestions } from "@/components/CompanySharedQuestions";
import { CompanyHero } from "@/components/CompanyProfile/CompanyHero";
import { CompanyJobOpenings } from "@/components/CompanyProfile/CompanyJobOpenings";
import { CompanyStatsPanel } from "@/components/CompanyProfile/CompanyStatsPanel";
import {
  ArrowLeft, Building2, Clock, CheckCircle, XCircle, AlertCircle, BarChart3,
  ExternalLink, Save, Edit, Loader2, MapPin,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import qraftLogo from "@/assets/qrafts-logo.png";

interface Application {
  id: string; company: string; position: string; status: string;
  applied_date: string; url: string; created_at: string;
  history: { status: string; changed_at: string }[];
}

interface CompanyStats {
  total_applications: number; avg_response_days: number | null;
  fastest_response_days: number | null; interview_rate: number;
  acceptance_rate: number; rejection_rate: number;
  interview_count: number; accepted_count: number; rejected_count: number;
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
  interview: { label: "Interview", variant: "default" as const, icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
  accepted: { label: "Accepted", variant: "outline" as const, icon: CheckCircle },
};

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
  const [communityStats, setCommunityStats] = useState<CompanyStats | null>(null);
  const [companyDescription, setCompanyDescription] = useState<string | null>(null);
  const [companyProfileData, setCompanyProfileData] = useState<any>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [sharedQuestions, setSharedQuestions] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [jobMatchScores, setJobMatchScores] = useState<Record<string, any>>({});
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [togglingWatch, setTogglingWatch] = useState(false);

  useEffect(() => {
    if (companyName) {
      fetchCompanyData(); fetchCompanyNotes(); fetchCommunityStats();
      fetchExperiences(); fetchSharedQuestions(); fetchJobOpenings(); fetchWatchStatus();
    }
  }, [companyName]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
  }, []);

  const decodedCompany = decodeURIComponent(companyName || "");

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: apps, error: appsError } = await supabase.from("applications").select("*").eq("user_id", user.id).eq("company", decodedCompany).order("applied_date", { ascending: false });
      if (appsError) throw appsError;
      const { data: history } = await (supabase as any).from("application_status_history").select("application_id, status, changed_at").eq("user_id", user.id).order("changed_at", { ascending: true });
      const appsWithHistory: Application[] = (apps || []).map(app => ({
        ...app,
        history: (history || []).filter((h: any) => h.application_id === app.id).map((h: any) => ({ status: h.status, changed_at: h.changed_at })),
      }));
      setApplications(appsWithHistory);
      fetchCompanyProfile();
    } catch (error) {
      console.error("Error fetching company data:", error);
      toast({ title: "Error", description: "Failed to load company data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any).from("company_notes").select("*").eq("user_id", user.id).eq("company_name", decodedCompany).maybeSingle();
      if (data) { setCompanyNotes(data.notes || ""); setSavedNotes(data.notes || ""); }
    } catch (error) { console.error("Error fetching company notes:", error); }
  };

  const fetchCommunityStats = async () => {
    try {
      const { data } = await supabase.rpc('get_company_stats', { company_name: decodedCompany });
      if (data && data.length > 0) setCommunityStats(data[0]);
    } catch (error) { console.error("Error fetching community stats:", error); }
  };

  const fetchExperiences = async () => {
    try {
      const { data, error } = await (supabase as any).from("company_experiences_public").select("*").eq("company_name", decodedCompany).order("created_at", { ascending: false });
      if (!error) setExperiences(data || []);
    } catch (error) { console.error("Error fetching experiences:", error); }
  };

  const fetchSharedQuestions = async () => {
    try {
      const { data, error } = await supabase.from("shared_questions").select("*").eq("company", decodedCompany).order("position", { ascending: true });
      if (!error) setSharedQuestions(data || []);
    } catch (error) { console.error("Error fetching shared questions:", error); }
  };

  const fetchCompanyProfile = async () => {
    try {
      const { data: cached } = await (supabase as any).from("company_profiles").select("*").eq("company_name", decodedCompany).maybeSingle();
      if (cached?.description) { setCompanyDescription(cached.description); setCompanyProfileData(cached); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const domain = applications.length > 0 ? (applications[0] as any).company_domain : undefined;
      supabase.functions.invoke("fetch-company-info", {
        body: { companyName: decodedCompany, domain },
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(({ data }) => {
        if (data?.profile?.description) { setCompanyDescription(data.profile.description); setCompanyProfileData(data.profile); }
      }).catch(console.error);
    } catch (error) { console.error("Error fetching company profile:", error); }
  };

  const fetchJobOpenings = async () => {
    try {
      const { data, error } = await supabase.from("job_openings").select("*").eq("company_name", decodedCompany).eq("is_active", true).order("first_seen_at", { ascending: false });
      if (!error && data) {
        setJobOpenings(data);
        const { data: { user } } = await supabase.auth.getUser();
        if (user && data.length > 0) {
          const jobIds = data.map((j: any) => j.id);
          const { data: scores } = await supabase.from("job_match_scores").select("*").eq("user_id", user.id).in("job_opening_id", jobIds);
          if (scores) {
            const scoreMap: Record<string, any> = {};
            scores.forEach((s: any) => { scoreMap[s.job_opening_id] = s; });
            setJobMatchScores(scoreMap);
          }
        }
      }
    } catch (error) { console.error("Error fetching job openings:", error); }
  };

  const fetchWatchStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("company_watchlist").select("id").eq("user_id", user.id).eq("company_name", decodedCompany).maybeSingle();
      setIsWatching(!!data);
    } catch (error) { console.error("Error fetching watch status:", error); }
  };

  const handleToggleWatch = async () => {
    setTogglingWatch(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (isWatching) {
        await supabase.from("company_watchlist").delete().eq("user_id", user.id).eq("company_name", decodedCompany);
        setIsWatching(false);
        toast({ title: "Unwatched", description: `You'll no longer receive job alerts for ${decodedCompany}` });
      } else {
        await supabase.from("company_watchlist").insert({ user_id: user.id, company_name: decodedCompany });
        setIsWatching(true);
        toast({ title: "Watching!", description: `You'll receive daily alerts for high-match jobs at ${decodedCompany}` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update watch status", variant: "destructive" });
    } finally { setTogglingWatch(false); }
  };

  const handleScanJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("user_profiles").select("resume_text, location").eq("user_id", user.id).maybeSingle();
      const { data, error } = await supabase.functions.invoke("crawl-job-openings", {
        body: { companyName: decodedCompany, userResumeText: profile?.resume_text || null, userId: user.id, userLocation: profile?.location || null },
      });
      if (error) throw error;
      toast({ title: "Scan Complete", description: `Found ${data?.totalFound || 0} job openings at ${decodedCompany}` });
      await fetchJobOpenings();
    } catch (error) {
      toast({ title: "Error", description: "Failed to scan for job openings", variant: "destructive" });
    } finally { setLoadingJobs(false); }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await (supabase as any).from("company_notes").select("id").eq("user_id", user.id).eq("company_name", decodedCompany).maybeSingle();
      if (existing) {
        await (supabase as any).from("company_notes").update({ notes: companyNotes }).eq("id", existing.id);
      } else {
        await (supabase as any).from("company_notes").insert({ user_id: user.id, company_name: decodedCompany, notes: companyNotes });
      }
      setSavedNotes(companyNotes); setEditingNotes(false);
      toast({ title: "Notes Saved", description: "Your company notes have been saved" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    } finally { setSavingNotes(false); }
  };

  const calculateMetrics = () => {
    if (applications.length === 0) return { avgResponseDays: null, fastestResponseDays: null, totalApps: 0, interviewRate: 0, acceptanceRate: 0, rejectionRate: 0 };
    const responseTimes = applications.filter(app => app.history.length > 0).map(app => differenceInDays(new Date(app.history[0].changed_at), new Date(app.applied_date)));
    const interviewCount = applications.filter(a => a.status === "interview" || a.history.some(h => h.status === "interview")).length;
    const acceptedCount = applications.filter(a => a.status === "accepted").length;
    const rejectedCount = applications.filter(a => a.status === "rejected").length;
    return {
      avgResponseDays: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null,
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

  const getCompanyDomain = (): string | null => {
    const domainsFromApps = applications.map(a => (a as any).company_domain).filter(Boolean) as string[];
    if (domainsFromApps.length > 0) {
      const freq = domainsFromApps.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {} as Record<string, number>);
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    }
    return null;
  };
  const companyDomain = getCompanyDomain() || `${decodedCompany.toLowerCase().replace(/\s+/g, '')}.com`;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${decodedCompany} Company Profile & Insights`} description={`View detailed insights about ${decodedCompany}`} noindex={true} />

      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <Link to="/dashboard" className="transition-all duration-300 hover:scale-105"><img src={qraftLogo} alt="Qraft" className="h-12 dark:invert" /></Link>
        </div>
      </header>

      <CompanyHero
        decodedCompany={decodedCompany}
        companyDomain={companyDomain}
        companyProfileData={companyProfileData}
        metricsTotal={metrics.totalApps}
        communityTotal={communityStats?.total_applications}
        isWatching={isWatching}
        togglingWatch={togglingWatch}
        onToggleWatch={handleToggleWatch}
      />

      <main className="container mx-auto px-4 py-5 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {companyDescription && (
              <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" />About</h2>
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
                <BarChart3 className="h-3.5 w-3.5 text-primary" />Application History
                <Badge variant="secondary" className="text-[10px] ml-auto font-normal">{applications.length}</Badge>
              </h2>
              <div className="space-y-1.5">
                {applications.map((app) => {
                  const StatusIcon = statusConfig[app.status as keyof typeof statusConfig]?.icon || AlertCircle;
                  const responseTime = app.history.length > 0 ? differenceInDays(new Date(app.history[0].changed_at), new Date(app.applied_date)) : null;
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
                        <Badge variant={statusConfig[app.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-[10px] shrink-0">
                          {statusConfig[app.status as keyof typeof statusConfig]?.label || app.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <CompanyJobOpenings
              jobOpenings={jobOpenings}
              jobMatchScores={jobMatchScores}
              loadingJobs={loadingJobs}
              isWatching={isWatching}
              onScanJobs={handleScanJobs}
            />

            <CompanyExperiences companyName={decodedCompany} experiences={experiences} currentUserId={currentUserId} onRefresh={fetchExperiences} />
            <CompanySharedQuestions companyName={decodedCompany} questions={sharedQuestions} />
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <CompanyStatsPanel communityStats={communityStats} metrics={metrics} />

            {/* Notes */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Notes</h3>
                {!editingNotes && savedNotes && (
                  <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setEditingNotes(true)}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                )}
              </div>
              {editingNotes || !savedNotes ? (
                <div className="space-y-2">
                  <Textarea value={companyNotes} onChange={(e) => setCompanyNotes(e.target.value)} placeholder="Add private notes about this company..." className="min-h-24 text-[13px]" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-[11px]" onClick={handleSaveNotes} disabled={savingNotes}>
                      {savingNotes ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Save
                    </Button>
                    {savedNotes && <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => { setCompanyNotes(savedNotes); setEditingNotes(false); }}>Cancel</Button>}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{savedNotes}</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CompanyProfile;
