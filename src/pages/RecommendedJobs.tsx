import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { MobileBottomNav } from "@/components/Dashboard/MobileBottomNav";
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  MapPin,
  Sparkles,
  Loader2,
  RefreshCw,
  Building2,
  TrendingUp,
  Filter,
} from "lucide-react";
import qraftLogo from "@/assets/qrafts-logo.png";
import { CheckCircle } from "lucide-react";

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

const RecommendedJobs = () => {
  const [jobs, setJobs] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [appliedPositions, setAppliedPositions] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchRecommendedJobs();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchRecommendedJobs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's applied positions to flag them
      const { data: applications } = await supabase
        .from("applications")
        .select("company, position")
        .eq("user_id", user.id);

      const appliedSet = new Set<string>();
      if (applications) {
        for (const app of applications) {
          // Normalize: lowercase company+position for fuzzy matching
          appliedSet.add(`${app.company.toLowerCase()}::${app.position.toLowerCase()}`);
        }
      }
      setAppliedPositions(appliedSet);

      // Get all match scores for this user with job details
      const { data: scores, error } = await supabase
        .from("job_match_scores")
        .select("match_score, match_reasons, job_opening_id")
        .eq("user_id", user.id)
        .order("match_score", { ascending: false });

      if (error) throw error;
      if (!scores || scores.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      // Get the job openings details
      const jobIds = scores.map(s => s.job_opening_id);
      const { data: openings } = await supabase
        .from("job_openings")
        .select("*")
        .in("id", jobIds)
        .eq("is_active", true);

      if (!openings) {
        setJobs([]);
        setLoading(false);
        return;
      }

      // Merge scores with job data
      const merged: JobWithScore[] = [];
      for (const score of scores) {
        const opening = openings.find(o => o.id === score.job_opening_id);
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

      // Sort by score descending
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
    try {
      const { data, error } = await supabase.functions.invoke("scan-all-companies");

      if (error) throw error;

      toast({
        title: "Scan Complete",
        description: `Scanned ${data?.scanned || 0} companies, found ${data?.totalJobs || 0} total openings`,
      });

      await fetchRecommendedJobs();
    } catch (err) {
      console.error("Error scanning:", err);
      toast({ title: "Error", description: "Failed to scan companies", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Check if a job title roughly matches an applied position at that company
  const isJobApplied = (job: JobWithScore) => {
    const jobTitle = job.title.toLowerCase();
    const company = job.company_name.toLowerCase();
    for (const key of appliedPositions) {
      const [appCompany, appPosition] = key.split("::");
      if (company.includes(appCompany) || appCompany.includes(company)) {
        // Fuzzy title match: check if significant words overlap
        const jobWords = jobTitle.split(/[\s\-\/,]+/).filter(w => w.length > 2);
        const posWords = appPosition.split(/[\s\-\/,]+/).filter(w => w.length > 2);
        const overlap = jobWords.filter(w => posWords.includes(w)).length;
        if (overlap >= Math.min(2, posWords.length) || jobTitle.includes(appPosition) || appPosition.includes(jobTitle)) {
          return true;
        }
      }
    }
    return false;
  };

  // Extract unique locations and departments for filters
  const locations = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => { if (j.location) set.add(j.location); });
    return [...set].sort();
  }, [jobs]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => { if (j.department) set.add(j.department); });
    return [...set].sort();
  }, [jobs]);

  // Apply filters
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (locationFilter !== "all" && j.location !== locationFilter) return false;
      if (departmentFilter !== "all" && j.department !== departmentFilter) return false;
      return true;
    });
  }, [jobs, locationFilter, departmentFilter]);

  // Group jobs by company
  const companiesMap = new Map<string, JobWithScore[]>();
  for (const job of filteredJobs) {
    const existing = companiesMap.get(job.company_name) || [];
    existing.push(job);
    companiesMap.set(job.company_name, existing);
  }

  const topJobs = filteredJobs.slice(0, 20);
  const newJobs = filteredJobs.filter(j => (now - new Date(j.first_seen_at).getTime()) < ONE_DAY);
  const hasActiveFilters = locationFilter !== "all" || departmentFilter !== "all";

  return (
    <div className="min-h-screen bg-background relative">
      <SEO
        title="Recommended Jobs - Qrafts"
        description="AI-matched job recommendations based on your resume and profile."
        noindex={true}
      />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/3 via-background to-background pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <img src={qraftLogo} alt="Qrafts logo" className="h-14 sm:h-20 transition-all duration-300 hover:scale-105 dark:invert" />
            </div>
            <Button
              onClick={handleScanAll}
              disabled={scanning}
              className="rounded-full shadow-lg shadow-primary/20"
            >
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {scanning ? "Scanning…" : "Scan All Companies"}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Recommended Jobs</h1>
          <p className="text-sm text-muted-foreground">
            AI-matched roles from companies you've applied to and your watchlist
          </p>
        </div>

        {/* Summary stats */}
        {!loading && jobs.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{filteredJobs.length}</p>
                <p className="text-xs text-muted-foreground">Total Matches</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{newJobs.length}</p>
                <p className="text-xs text-muted-foreground">New Today</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
                <p className="text-2xl font-bold">{companiesMap.size}</p>
                <p className="text-xs text-muted-foreground">Companies</p>
              </div>
            </div>

            {/* Filters */}
            {(locations.length > 0 || departments.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                {locations.length > 0 && (
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {departments.length > 0 && (
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dep => (
                        <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => { setLocationFilter("all"); setDepartmentFilter("all"); }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
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
            <p className="text-sm text-muted-foreground mb-4">
              Click "Scan All Companies" to analyze job openings at companies you've applied to
            </p>
            <Button onClick={handleScanAll} disabled={scanning} className="rounded-full">
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {scanning ? "Scanning…" : "Scan Now"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* New Jobs Section */}
            {newJobs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                  New Since Last Scan
                  <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10">
                    {newJobs.length}
                  </Badge>
                </h2>
                <div className="space-y-1.5">
                  {newJobs.slice(0, 10).map(job => (
                    <JobRow key={job.id} job={job} isNew isApplied={isJobApplied(job)} />
                  ))}
                </div>
              </div>
            )}

            {/* Top Matches */}
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

            {/* By Company */}
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                By Company
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...companiesMap.entries()]
                  .sort((a, b) => {
                    const aMax = Math.max(...a[1].map(j => j.match_score));
                    const bMax = Math.max(...b[1].map(j => j.match_score));
                    return bMax - aMax;
                  })
                  .map(([company, companyJobs]) => {
                    const topScore = Math.max(...companyJobs.map(j => j.match_score));
                    const newCount = companyJobs.filter(j => (now - new Date(j.first_seen_at).getTime()) < ONE_DAY).length;
                    return (
                      <Link
                        key={company}
                        to={`/company/${encodeURIComponent(company)}`}
                        className="rounded-xl border border-border/40 bg-card/50 p-4 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate">{company}</p>
                          {newCount > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10 shrink-0">
                              {newCount} new
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{companyJobs.length} positions</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            Top match: <span className="font-semibold text-primary">{topScore}%</span>
                          </span>
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

const JobRow = ({ job, isNew, isApplied }: { job: JobWithScore; isNew: boolean; isApplied?: boolean }) => {
  const isHighMatch = job.match_score >= 80;
  const isMedMatch = job.match_score >= 60 && job.match_score < 80;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
        isApplied
          ? "border-muted-foreground/20 bg-muted/30 opacity-75"
          : isNew
            ? "border-green-500/30 bg-green-500/5"
            : isHighMatch
              ? "border-primary/20 bg-primary/5"
              : "border-transparent hover:bg-muted/40"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-[13px] font-medium truncate ${isApplied ? "line-through text-muted-foreground" : ""}`}>{job.title}</p>
          {isApplied && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/40 text-muted-foreground bg-muted/50 shrink-0 flex items-center gap-0.5">
              <CheckCircle className="h-2.5 w-2.5" /> Applied
            </Badge>
          )}
          {isNew && !isApplied && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10 shrink-0">New</Badge>
          )}
          {isHighMatch && !isApplied && <Sparkles className="h-3 w-3 text-primary shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground font-medium">{job.company_name}</span>
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
        <div className="flex items-center gap-1.5">
          <Progress value={job.match_score} className="w-12 h-1.5" />
          <span className={`text-xs font-semibold tabular-nums ${
            isHighMatch ? "text-primary" : isMedMatch ? "text-yellow-600" : "text-muted-foreground"
          }`}>
            {job.match_score}%
          </span>
        </div>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};

export default RecommendedJobs;
