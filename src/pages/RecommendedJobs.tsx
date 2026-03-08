import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { MobileBottomNav } from "@/components/Dashboard/MobileBottomNav";
import { JobStatsBar } from "@/components/RecommendedJobs/JobStatsBar";
import { JobFilters } from "@/components/RecommendedJobs/JobFilters";
import { buildLocationGroups, getJobLocations } from "@/utils/locationNormalizer";
import {
  ArrowLeft, Briefcase, ExternalLink, MapPin, Sparkles, Loader2, RefreshCw,
  Building2, TrendingUp, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import qraftLogo from "@/assets/qrafts-logo.png";

interface JobWithScore {
  id: string;
  title: string;
  url: string | null;
  location: string | null;
  department: string | null;
  company_name: string;
  first_seen_at: string;
  match_score: number;
  match_reasons: string[] | null;
}

interface ScanResult {
  company: string;
  jobsFound: number;
  error?: string;
}

const RecommendedJobs = () => {
  useAuthGuard();
  const [jobs, setJobs] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreProgress, setScoreProgress] = useState<{ scored: number; total: number } | null>(null);
  const [scanProgress, setScanProgress] = useState<{ completed: number; total: number; currentCompany: string } | null>(null);
  const [appliedPositions, setAppliedPositions] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [locationOpen, setLocationOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [showScanResults, setShowScanResults] = useState(false);
  const [totalActiveJobs, setTotalActiveJobs] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendedJobs();
  }, []);

  const fetchRecommendedJobs = async () => {
    setLoading(true);
    try {
      const { count } = await supabase
        .from("job_openings")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      setTotalActiveJobs(count || 0);

      const allCompanyNames = new Set<string>();
      let companyPage = 0;
      const COMPANY_PAGE_SIZE = 1000;
      while (true) {
        const { data: companyRows } = await supabase
          .from("job_openings")
          .select("company_name")
          .eq("is_active", true)
          .range(companyPage * COMPANY_PAGE_SIZE, (companyPage + 1) * COMPANY_PAGE_SIZE - 1);
        if (!companyRows || companyRows.length === 0) break;
        for (const r of companyRows) allCompanyNames.add(r.company_name);
        if (companyRows.length < COMPANY_PAGE_SIZE) break;
        companyPage++;
      }
      setTotalCompanies(allCompanyNames.size);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: applications } = await supabase
        .from("applications")
        .select("company, position")
        .eq("user_id", user.id);

      const appliedSet = new Set<string>();
      if (applications) {
        for (const app of applications) {
          appliedSet.add(`${app.company.toLowerCase()}::${app.position.toLowerCase()}`);
        }
      }
      setAppliedPositions(appliedSet);

      const PAGE_SIZE = 1000;
      let allScores: { match_score: number; match_reasons: string[] | null; job_opening_id: string }[] = [];
      let page = 0;
      while (true) {
        const { data: pageScores, error: pageError } = await supabase
          .from("job_match_scores")
          .select("match_score, match_reasons, job_opening_id")
          .eq("user_id", user.id)
          .order("match_score", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (pageError) throw pageError;
        if (!pageScores || pageScores.length === 0) break;
        allScores.push(...pageScores);
        if (pageScores.length < PAGE_SIZE) break;
        page++;
      }

      if (allScores.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      const jobIds = allScores.map(s => s.job_opening_id);
      const BATCH = 100;
      const allOpenings: any[] = [];
      for (let i = 0; i < jobIds.length; i += BATCH) {
        const batch = jobIds.slice(i, i + BATCH);
        const { data: batchOpenings } = await supabase
          .from("job_openings")
          .select("*")
          .in("id", batch)
          .eq("is_active", true);
        if (batchOpenings) allOpenings.push(...batchOpenings);
      }

      if (allOpenings.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      const merged: JobWithScore[] = [];
      for (const score of allScores) {
        const opening = allOpenings.find(o => o.id === score.job_opening_id);
        if (opening) {
          merged.push({
            id: opening.id,
            title: opening.title,
            url: opening.url,
            location: opening.location,
            department: opening.department,
            company_name: opening.company_name,
            first_seen_at: opening.first_seen_at,
            match_score: score.match_score,
            match_reasons: score.match_reasons,
          });
        }
      }

      merged.sort((a, b) => b.match_score - a.match_score);
      setJobs(merged);
    } catch (err) {
      console.error("Error fetching recommended jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanAll = async () => {
    setScanning(true);
    setScanProgress(null);
    setScanResults([]);
    setShowScanResults(false);
    const results: ScanResult[] = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-all-companies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: { scanned?: number; totalJobs?: number } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "start") {
              setScanProgress({ completed: 0, total: event.total, currentCompany: "" });
            } else if (event.type === "progress") {
              setScanProgress({ completed: event.completed, total: event.total, currentCompany: event.company });
              results.push({ company: event.company, jobsFound: event.jobsFound || 0, error: event.error || undefined });
            } else if (event.type === "complete") {
              finalData = event;
            }
          } catch { /* skip malformed */ }
        }
      }

      setScanResults(results);
      const failedCount = results.filter(r => r.error || r.jobsFound === 0).length;
      if (failedCount > 0) setShowScanResults(true);

      toast({
        title: "Scan Complete",
        description: `Scanned ${finalData.scanned || 0} companies, found ${finalData.totalJobs || 0} total openings${failedCount > 0 ? ` (${failedCount} had issues)` : ""}. Now scoring matches...`,
      });

      await handleScoreUnscored(session.access_token);
      await fetchRecommendedJobs();
    } catch (err) {
      console.error("Error scanning:", err);
      toast({ title: "Error", description: "Failed to scan companies", variant: "destructive" });
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  const handleScoreUnscored = async (accessToken?: string) => {
    setScoring(true);
    setScoreProgress(null);
    try {
      let totalScored = 0;
      let keepGoing = true;
      let consecutiveErrors = 0;
      const PARALLEL = 3;
      const BATCH_SIZE = 50;

      const getFreshToken = async (): Promise<string> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");
        return session.access_token;
      };

      const scoreBatch = async (currentToken: string): Promise<{ scored: number; total: number } | null> => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-unscored-jobs`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${currentToken}`,
                  "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({ limit: BATCH_SIZE }),
              }
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
          } catch (fetchErr) {
            console.warn(`Score batch attempt ${attempt + 1} failed:`, fetchErr);
            if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          }
        }
        return null;
      };

      while (keepGoing) {
        const token = await getFreshToken();
        const results = await Promise.all(Array.from({ length: PARALLEL }, () => scoreBatch(token)));
        let batchFailed = 0;
        let anyWork = false;
        for (const data of results) {
          if (!data) { batchFailed++; continue; }
          const batchScored = data.scored || 0;
          totalScored += batchScored;
          if (batchScored > 0) anyWork = true;
          if (batchScored === 0 || (data.total || 0) < BATCH_SIZE) keepGoing = false;
        }
        setScoreProgress({ scored: totalScored, total: totalScored });
        if (batchFailed >= PARALLEL) {
          consecutiveErrors++;
          if (consecutiveErrors >= 2) break;
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        consecutiveErrors = 0;
        if (!anyWork) keepGoing = false;
      }

      toast({ title: "Scoring Complete", description: `Scored ${totalScored} jobs total` });
      await fetchRecommendedJobs();
    } catch (err) {
      console.error("Error scoring:", err);
      toast({ title: "Error", description: "Failed to score jobs", variant: "destructive" });
    } finally {
      setScoring(false);
      setScoreProgress(null);
    }
  };

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const isJobApplied = (job: JobWithScore) => {
    const jobTitle = job.title.toLowerCase().trim();
    const company = job.company_name.toLowerCase().trim();
    for (const key of appliedPositions) {
      const [appCompany, appPosition] = key.split("::");
      if (!company.includes(appCompany) && !appCompany.includes(company)) continue;
      if (jobTitle === appPosition || jobTitle.includes(appPosition) || appPosition.includes(jobTitle)) return true;
    }
    return false;
  };

  const locationGroups = useMemo(() => buildLocationGroups(jobs), [jobs]);

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    jobs.forEach(j => { if (j.department) counts.set(j.department, (counts.get(j.department) || 0) + 1); });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([dept, count]) => ({ label: dept, count }));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (locationFilter !== "all") {
        const jobLocs = getJobLocations(j.location);
        if (!jobLocs.includes(locationFilter)) return false;
      }
      if (departmentFilter !== "all" && j.department !== departmentFilter) return false;
      return true;
    });
  }, [jobs, locationFilter, departmentFilter]);

  const companiesMap = new Map<string, JobWithScore[]>();
  for (const job of filteredJobs) {
    const existing = companiesMap.get(job.company_name) || [];
    existing.push(job);
    companiesMap.set(job.company_name, existing);
  }

  const topJobs = filteredJobs.slice(0, 20);
  const newJobs = filteredJobs.filter(j => (now - new Date(j.first_seen_at).getTime()) < ONE_DAY);

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <SEO title="Recommended Jobs - Qrafts" description="AI-matched job recommendations based on your resume and profile." noindex={true} />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/3 via-background to-background pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
              </Link>
              <img src={qraftLogo} alt="Qrafts logo" className="h-14 sm:h-20 transition-all duration-300 hover:scale-105 dark:invert" />
            </div>
            <Button onClick={handleScanAll} disabled={scanning || scoring} className="rounded-full shadow-lg shadow-primary/20">
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : scoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {scanning ? (scanProgress ? `${scanProgress.completed}/${scanProgress.total}` : "Starting…") : scoring ? "Scoring..." : "Scan All Companies"}
            </Button>
          </div>
        </div>
      </header>

      {/* Scan progress bar */}
      {scanning && scanProgress && scanProgress.total > 0 && (
        <div className="sticky top-[73px] sm:top-[89px] z-10 bg-background/90 backdrop-blur-sm border-b border-border/40 px-4 sm:px-6 py-3">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3">
              <div className="flex-1"><Progress value={(scanProgress.completed / scanProgress.total) * 100} className="h-2" /></div>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">{scanProgress.completed}/{scanProgress.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">Scanning {scanProgress.currentCompany || "…"}</p>
          </div>
        </div>
      )}

      <main className="relative container mx-auto px-4 py-6 sm:py-8 max-w-4xl flex-1">
        {scanResults.length > 0 && !scanning && (
          <ScanResultsSummary results={scanResults} show={showScanResults} onToggle={() => setShowScanResults(!showScanResults)} />
        )}

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Recommended Jobs</h1>
          <p className="text-sm text-muted-foreground">AI-matched roles from companies you've applied to and your watchlist</p>
        </div>

        {!loading && jobs.length > 0 && (
          <>
            <JobStatsBar
              scoredCount={jobs.length}
              totalActiveJobs={totalActiveJobs}
              totalCompanies={totalCompanies}
              newJobsCount={newJobs.length}
              scoring={scoring}
              scoreProgress={scoreProgress}
              onScoreUnscored={() => handleScoreUnscored()}
            />
            <JobFilters
              locationGroups={locationGroups}
              departments={departments}
              locationFilter={locationFilter}
              departmentFilter={departmentFilter}
              locationOpen={locationOpen}
              onLocationOpenChange={setLocationOpen}
              onLocationChange={setLocationFilter}
              onDepartmentChange={setDepartmentFilter}
              onClear={() => { setLocationFilter("all"); setDepartmentFilter("all"); }}
            />
          </>
        )}

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading recommendations…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-1">No recommendations yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Click "Scan All Companies" to analyze job openings at companies you've applied to</p>
            <Button onClick={handleScanAll} disabled={scanning} className="rounded-full">
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {scanning ? "Scanning…" : "Scan Now"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {newJobs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                  New Since Last Scan
                  <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10">{newJobs.length}</Badge>
                </h2>
                <div className="space-y-1.5">
                  {newJobs.slice(0, 10).map(job => (
                    <JobRow key={job.id} job={job} isNew isApplied={isJobApplied(job)} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top Matches
              </h2>
              <div className="space-y-1.5">
                {topJobs.map(job => {
                  const isNew = (now - new Date(job.first_seen_at).getTime()) < ONE_DAY;
                  return <JobRow key={job.id} job={job} isNew={isNew} isApplied={isJobApplied(job)} />;
                })}
              </div>
              {filteredJobs.length > 20 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Showing top 20 of {filteredJobs.length} matches. Visit individual company profiles for full listings.
                </p>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                By Company
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...companiesMap.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([company, companyJobs]) => {
                    const topScore = Math.max(...companyJobs.map(j => j.match_score));
                    const newCount = companyJobs.filter(j => (now - new Date(j.first_seen_at).getTime()) < ONE_DAY).length;
                    return (
                      <Link key={company} to={`/company/${encodeURIComponent(company)}`}
                        className="rounded-xl border border-border/40 bg-card/50 p-4 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate">{company}</p>
                          {newCount > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10 shrink-0">{newCount} new</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{companyJobs.length} positions</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">Top match: <span className="font-semibold text-primary">{topScore}%</span></span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav onAddApplication={() => navigate("/dashboard")} />
      <div className="h-16 sm:hidden" />
    </div>
  );
};

const ScanResultsSummary = ({ results, show, onToggle }: { results: ScanResult[]; show: boolean; onToggle: () => void }) => {
  const succeeded = results.filter(r => !r.error && r.jobsFound > 0);
  const noJobs = results.filter(r => !r.error && r.jobsFound === 0);
  const failed = results.filter(r => !!r.error);

  return (
    <div className="mb-6 rounded-xl border border-border/40 bg-card/50 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1.5 text-primary font-medium"><CheckCircle className="h-4 w-4" /> {succeeded.length} found jobs</span>
          {noJobs.length > 0 && <span className="flex items-center gap-1.5 text-muted-foreground"><AlertTriangle className="h-4 w-4" /> {noJobs.length} no jobs</span>}
          {failed.length > 0 && <span className="flex items-center gap-1.5 text-destructive"><XCircle className="h-4 w-4" /> {failed.length} failed</span>}
        </div>
        {show ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {show && (
        <div className="border-t border-border/40 px-4 py-3 space-y-1 max-h-64 overflow-y-auto">
          {failed.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-destructive mb-1.5">Failed ({failed.length})</p>
              {failed.map(r => (<div key={r.company} className="flex items-center justify-between py-1 text-xs"><span className="font-medium">{r.company}</span><span className="text-destructive/80 truncate ml-2">{r.error}</span></div>))}
            </div>
          )}
          {noJobs.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">No jobs found ({noJobs.length})</p>
              {noJobs.map(r => (<div key={r.company} className="flex items-center justify-between py-1 text-xs"><span className="font-medium">{r.company}</span><span className="text-muted-foreground">0 jobs</span></div>))}
            </div>
          )}
          {succeeded.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-primary mb-1.5">Successful ({succeeded.length})</p>
              {succeeded.sort((a, b) => b.jobsFound - a.jobsFound).map(r => (<div key={r.company} className="flex items-center justify-between py-1 text-xs"><span className="font-medium">{r.company}</span><span className="text-primary">{r.jobsFound} jobs</span></div>))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const JobRow = ({ job, isNew, isApplied }: { job: JobWithScore; isNew: boolean; isApplied?: boolean }) => {
  const isHighMatch = job.match_score >= 80;
  const isMedMatch = job.match_score >= 60 && job.match_score < 80;

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
      isApplied ? "border-muted-foreground/20 bg-muted/30 opacity-75"
        : isNew ? "border-green-500/30 bg-green-500/5"
        : isHighMatch ? "border-primary/20 bg-primary/5"
        : "border-transparent hover:bg-muted/40"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-[13px] font-medium truncate ${isApplied ? "line-through text-muted-foreground" : ""}`}>{job.title}</p>
          {isApplied && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/40 text-muted-foreground bg-muted/50 shrink-0 flex items-center gap-0.5"><CheckCircle className="h-2.5 w-2.5" /> Applied</Badge>}
          {isNew && !isApplied && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10 shrink-0">New</Badge>}
          {isHighMatch && !isApplied && <Sparkles className="h-3 w-3 text-primary shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground font-medium">{job.company_name}</span>
          {job.location && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {job.location}</span>}
          {job.department && <span className="text-[11px] text-muted-foreground">{job.department}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <Progress value={job.match_score} className="w-12 h-1.5" />
          <span className={`text-xs font-semibold tabular-nums ${isHighMatch ? "text-primary" : isMedMatch ? "text-yellow-600" : "text-muted-foreground"}`}>{job.match_score}%</span>
        </div>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};

export default RecommendedJobs;
