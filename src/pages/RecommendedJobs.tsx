import { useState, useEffect, useMemo } from "react"; // v2
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
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
  Check,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  XCircle,
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
    fetchRecommendedJobs();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchRecommendedJobs = async () => {
    setLoading(true);
    try {
      // Fetch total active jobs count and unique companies for stats
      const { count } = await supabase
        .from("job_openings")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      setTotalActiveJobs(count || 0);

      // Get distinct company count from all active job openings (paginate to avoid 1000-row limit)
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
      // Fetch all match scores using pagination to avoid the 1000-row default limit
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
      const scores = allScores;
      const error = null;

      if (error) throw error;
      if (!scores || scores.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      // Get the job openings details
      const jobIds = scores.map(s => s.job_opening_id);
      
      // Batch the .in() query to avoid URL length limits
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

      // Merge scores with job data
      const merged: JobWithScore[] = [];
      for (const score of scores) {
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
              setScanProgress({
                completed: event.completed,
                total: event.total,
                currentCompany: event.company,
              });
              results.push({
                company: event.company,
                jobsFound: event.jobsFound || 0,
                error: event.error || undefined,
              });
            } else if (event.type === "complete") {
              finalData = event;
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      setScanResults(results);
      const failedCount = results.filter(r => r.error || r.jobsFound === 0).length;
      if (failedCount > 0) {
        setShowScanResults(true);
      }

      toast({
        title: "Scan Complete",
        description: `Scanned ${finalData.scanned || 0} companies, found ${finalData.totalJobs || 0} total openings${failedCount > 0 ? ` (${failedCount} had issues)` : ""}. Now scoring matches...`,
      });

      // Automatically score unscored jobs after scan
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
        // Refresh token before each round to prevent expiry
        const token = await getFreshToken();
        const results = await Promise.all(
          Array.from({ length: PARALLEL }, () => scoreBatch(token))
        );

        let batchFailed = 0;
        let anyWork = false;
        for (const data of results) {
          if (!data) {
            batchFailed++;
            continue;
          }
          const batchScored = data.scored || 0;
          totalScored += batchScored;
          if (batchScored > 0) anyWork = true;
          if (batchScored === 0 || (data.total || 0) < BATCH_SIZE) {
            keepGoing = false;
          }
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

      toast({
        title: "Scoring Complete",
        description: `Scored ${totalScored} jobs total`,
      });

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

  // Check if a job title matches an applied position at that company
  // Uses exact URL-based matching first, then strict title comparison
  const isJobApplied = (job: JobWithScore) => {
    const jobTitle = job.title.toLowerCase().trim();
    const company = job.company_name.toLowerCase().trim();
    for (const key of appliedPositions) {
      const [appCompany, appPosition] = key.split("::");
      // Company must match
      if (!company.includes(appCompany) && !appCompany.includes(company)) continue;
      // Strict title match: one must contain the other, or they must be very similar
      if (jobTitle === appPosition || jobTitle.includes(appPosition) || appPosition.includes(jobTitle)) {
        return true;
      }
    }
    return false;
  };

  // City → country mapping for grouping
  const CITY_COUNTRY: Record<string, string> = {
    "New York": "United States", "San Francisco": "United States", "Los Angeles": "United States",
    "Seattle": "United States", "Chicago": "United States", "Austin": "United States",
    "Boston": "United States", "Denver": "United States", "Washington DC": "United States",
    "San Diego": "United States", "Miami": "United States", "Atlanta": "United States",
    "Dallas": "United States", "Portland": "United States", "Phoenix": "United States",
    "Minneapolis": "United States", "Detroit": "United States", "Philadelphia": "United States",
    "Pittsburgh": "United States", "San Jose": "United States", "Palo Alto": "United States",
    "Mountain View": "United States", "Sunnyvale": "United States", "Menlo Park": "United States",
    "Cupertino": "United States", "Redmond": "United States", "Bellevue": "United States",
    "Raleigh": "United States", "Nashville": "United States", "Salt Lake City": "United States",
    "London": "United Kingdom", "Manchester": "United Kingdom", "Edinburgh": "United Kingdom",
    "Dublin": "Ireland", "Paris": "France", "Berlin": "Germany", "Munich": "Germany",
    "Hamburg": "Germany", "Amsterdam": "Netherlands", "Stockholm": "Sweden",
    "Copenhagen": "Denmark", "Oslo": "Norway", "Helsinki": "Finland",
    "Zurich": "Switzerland", "Geneva": "Switzerland", "Milan": "Italy", "Rome": "Italy",
    "Madrid": "Spain", "Barcelona": "Spain", "Lisbon": "Portugal",
    "Tokyo": "Japan", "Singapore": "Singapore", "Sydney": "Australia",
    "Melbourne": "Australia", "Toronto": "Canada", "Vancouver": "Canada",
    "Montreal": "Canada", "São Paulo": "Brazil", "Tel Aviv": "Israel",
    "Bangalore": "India", "Mumbai": "India", "Hyderabad": "India",
    "New Delhi": "India", "Seoul": "South Korea", "Taipei": "Taiwan",
    "Hong Kong": "Hong Kong", "Shanghai": "China", "Beijing": "China",
    "Warsaw": "Poland", "Prague": "Czech Republic", "Budapest": "Hungary",
    "Bucharest": "Romania", "Riyadh": "Saudi Arabia", "Dubai": "UAE",
  };

  // Aliases: lowercase → canonical city
  const CITY_ALIASES: Record<string, string> = {
    "nyc": "New York", "ny": "New York", "new york": "New York",
    "new york city": "New York", "manhattan": "New York", "brooklyn": "New York",
    "sf": "San Francisco", "san francisco": "San Francisco", "bay area": "San Francisco",
    "san francisco bay area": "San Francisco",
    "la": "Los Angeles", "los angeles": "Los Angeles",
    "seattle": "Seattle", "chicago": "Chicago", "austin": "Austin",
    "boston": "Boston", "denver": "Denver",
    "dc": "Washington DC", "washington dc": "Washington DC", "washington d.c.": "Washington DC",
    "london": "London", "dublin": "Dublin", "paris": "Paris", "berlin": "Berlin",
    "munich": "Munich", "amsterdam": "Amsterdam", "stockholm": "Stockholm",
    "milan": "Milan", "rome": "Rome", "madrid": "Madrid", "barcelona": "Barcelona",
    "tokyo": "Tokyo", "singapore": "Singapore", "sydney": "Sydney",
    "toronto": "Toronto", "vancouver": "Vancouver", "montreal": "Montreal",
    "sao paulo": "São Paulo", "são paulo": "São Paulo",
    "tel aviv": "Tel Aviv", "bangalore": "Bangalore", "mumbai": "Mumbai",
    "hyderabad": "Hyderabad", "new delhi": "New Delhi",
    "san diego": "San Diego", "miami": "Miami", "atlanta": "Atlanta",
    "dallas": "Dallas", "portland": "Portland",
    "palo alto": "Palo Alto", "mountain view": "Mountain View",
    "sunnyvale": "Sunnyvale", "menlo park": "Menlo Park",
    "cupertino": "Cupertino", "redmond": "Redmond", "bellevue": "Bellevue",
    "remote": "Remote", "anywhere": "Remote", "worldwide": "Remote", "global": "Remote",
    "hybrid": "Hybrid",
  };

  // Check if a string looks like a valid city (not an address, nonsense, etc.)
  const isValidLocation = (s: string): boolean => {
    if (!s || s.length < 3) return false;
    // Filter out street addresses (start with numbers)
    if (/^\d+\s/.test(s)) return false;
    // Filter out entries that are just numbers
    if (/^\d+$/.test(s)) return false;
    // Filter out things like "3 other locations", "multiple locations"
    if (/other\s*location/i.test(s) || /multiple/i.test(s)) return false;
    // Filter out things that look like descriptions, not places
    if (/\b(travel|friendly|flexible|competitive|tbd|n\/a|various)\b/i.test(s)) return false;
    // Filter out very long strings (likely descriptions)
    if (s.length > 40) return false;
    return true;
  };

  // Normalize a single city token to a canonical name
  const normalizeCityToken = (raw: string): string | null => {
    if (!raw) return null;
    let s = raw.trim();
    // Remove parenthetical qualifiers
    s = s.replace(/\s*\(.*?\)\s*/g, "").trim();
    if (!s || !isValidLocation(s)) return null;

    const lower = s.toLowerCase().replace(/['']/g, "'");

    // Check direct alias
    if (CITY_ALIASES[lower]) return CITY_ALIASES[lower];

    // Strip state suffixes (full name or abbreviation)
    const stateStripped = s.replace(/,\s*(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|[A-Z]{2})$/i, "").trim();
    const strippedLower = stateStripped.toLowerCase();
    if (CITY_ALIASES[strippedLower]) return CITY_ALIASES[strippedLower];

    // Strip country suffix
    const countryStripped = s.replace(/,\s*\w[\w\s]*$/, "").trim();
    const countryStrippedLower = countryStripped.toLowerCase();
    if (CITY_ALIASES[countryStrippedLower]) return CITY_ALIASES[countryStrippedLower];

    // If the stripped version is in CITY_COUNTRY, use it
    if (CITY_COUNTRY[stateStripped]) return stateStripped;
    if (CITY_COUNTRY[countryStripped]) return countryStripped;

    // If still valid, return as-is
    if (isValidLocation(stateStripped) && stateStripped.length >= 3) return stateStripped;
    return null;
  };

  // Split multi-location strings and normalize each
  const getJobLocations = (loc: string | null): string[] => {
    if (!loc) return [];
    const parts = loc
      .split(/[;|]/)
      .flatMap(p => p.split(/\bor\b/i))
      .flatMap(p => p.split(/\s*[-–—\/&]\s*/))
      .flatMap(p => p.split(/\s*\+\s*/))
      .flatMap(p => {
        const trimmed = p.trim();
        if (!trimmed) return [];
        if (/^[^,]+,\s*([A-Z]{2}|[A-Z][a-z]+(\s[A-Z][a-z]+)?)$/.test(trimmed)) {
          return [trimmed];
        }
        if ((trimmed.match(/,/g) || []).length > 1) {
          return trimmed.split(",").map(s => s.trim()).filter(Boolean);
        }
        return [trimmed];
      })
      .filter(Boolean);
    const normalized = new Set(parts.map(normalizeCityToken).filter(Boolean) as string[]);
    return [...normalized];
  };

  // Extract locations grouped by country
  const locationGroups = useMemo(() => {
    const counts = new Map<string, number>();
    jobs.forEach(j => {
      for (const loc of getJobLocations(j.location)) {
        counts.set(loc, (counts.get(loc) || 0) + 1);
      }
    });

    // Group by country
    const groups = new Map<string, { label: string; count: number }[]>();
    for (const [loc, count] of counts) {
      if (loc === "Remote" || loc === "Hybrid") {
        const key = loc;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ label: loc, count });
      } else {
        const country = CITY_COUNTRY[loc] || "Other";
        if (!groups.has(country)) groups.set(country, []);
        groups.get(country)!.push({ label: loc, count });
      }
    }

    // Sort cities within each group by count desc
    for (const cities of groups.values()) {
      cities.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    }

    // Order groups: Remote first, then Hybrid, then countries by total count
    const groupOrder: { group: string; cities: { label: string; count: number }[] }[] = [];
    if (groups.has("Remote")) { groupOrder.push({ group: "Remote", cities: groups.get("Remote")! }); groups.delete("Remote"); }
    if (groups.has("Hybrid")) { groupOrder.push({ group: "Hybrid", cities: groups.get("Hybrid")! }); groups.delete("Hybrid"); }

    const sortedCountries = [...groups.entries()]
      .map(([group, cities]) => ({ group, cities, total: cities.reduce((s, c) => s + c.count, 0) }))
      .sort((a, b) => b.total - a.total || a.group.localeCompare(b.group));

    for (const { group, cities } of sortedCountries) {
      groupOrder.push({ group, cities });
    }

    return groupOrder;
  }, [jobs]);

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    jobs.forEach(j => {
      if (j.department) counts.set(j.department, (counts.get(j.department) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([dept, count]) => ({ label: dept, count }));
  }, [jobs]);

  // Apply filters
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
    <div className="min-h-screen bg-background relative flex flex-col">
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
              disabled={scanning || scoring}
              className="rounded-full shadow-lg shadow-primary/20"
            >
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : scoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {scanning
                ? scanProgress
                  ? `${scanProgress.completed}/${scanProgress.total}`
                  : "Starting…"
                : scoring
                ? "Scoring..."
                : "Scan All Companies"}
            </Button>
          </div>
        </div>
      </header>

      {/* Scan progress bar */}
      {scanning && scanProgress && scanProgress.total > 0 && (
        <div className="sticky top-[73px] sm:top-[89px] z-10 bg-background/90 backdrop-blur-sm border-b border-border/40 px-4 sm:px-6 py-3">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Progress value={(scanProgress.completed / scanProgress.total) * 100} className="h-2" />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                {scanProgress.completed}/{scanProgress.total}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Scanning {scanProgress.currentCompany || "…"}
            </p>
          </div>
        </div>
      )}

      <main className="relative container mx-auto px-4 py-6 sm:py-8 max-w-4xl flex-1">
        {/* Scan Results Summary */}
        {scanResults.length > 0 && !scanning && (
          <ScanResultsSummary
            results={scanResults}
            show={showScanResults}
            onToggle={() => setShowScanResults(!showScanResults)}
          />
        )}

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Recommended Jobs</h1>
          <p className="text-sm text-muted-foreground">
            AI-matched roles from companies you've applied to and your watchlist
          </p>
        </div>

        {/* Summary stats */}
        {!loading && jobs.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">Scored Matches</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
                <p className="text-2xl font-bold">{totalActiveJobs}</p>
                <p className="text-xs text-muted-foreground">Total Openings</p>
                {totalActiveJobs > jobs.length && (
                  <p className="text-[10px] text-warning mt-0.5">{totalActiveJobs - jobs.length} unscored</p>
                )}
              </div>
              <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
                <p className="text-2xl font-bold">{totalCompanies}</p>
                <p className="text-xs text-muted-foreground">Companies</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{newJobs.length}</p>
                <p className="text-xs text-muted-foreground">New Today</p>
              </div>
            </div>

            {/* Unscored jobs banner */}
            {totalActiveJobs > jobs.length && !scoring && (
              <div className="flex items-center justify-between gap-3 mb-6 p-3 rounded-lg border border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{totalActiveJobs - jobs.length}</span> jobs haven't been scored against your resume yet
                  </span>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => handleScoreUnscored()}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Score Now
                </Button>
              </div>
            )}

            {/* Scoring progress */}
            {scoring && scoreProgress && (
              <div className="mb-6 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Scoring jobs... {scoreProgress.scored}/{scoreProgress.total}</span>
                </div>
                <Progress value={(scoreProgress.scored / scoreProgress.total) * 100} className="h-1.5" />
              </div>
            )}

            {/* Filters */}
            {(locationGroups.length > 0 || departments.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                {locationGroups.length > 0 && (
                  <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[200px] h-8 text-xs justify-between font-normal">
                        {locationFilter === "all" ? "All Locations" : locationFilter}
                        <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search locations..." className="h-8 text-xs" />
                        <CommandList>
                          <CommandEmpty>No locations found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => { setLocationFilter("all"); setLocationOpen(false); }}
                              className="text-xs"
                            >
                              <Check className={cn("mr-2 h-3 w-3", locationFilter === "all" ? "opacity-100" : "opacity-0")} />
                              All Locations
                            </CommandItem>
                          </CommandGroup>
                          {locationGroups.map(({ group, cities }) => (
                            <CommandGroup key={group} heading={group !== "Remote" && group !== "Hybrid" ? group : undefined}>
                              {cities.map(c => (
                                <CommandItem
                                  key={c.label}
                                  value={c.label}
                                  onSelect={() => { setLocationFilter(c.label); setLocationOpen(false); }}
                                  className="text-xs"
                                >
                                  <Check className={cn("mr-2 h-3 w-3", locationFilter === c.label ? "opacity-100" : "opacity-0")} />
                                  {c.label} ({c.count})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                {departments.length > 0 && (
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dep => (
                        <SelectItem key={dep.label} value={dep.label}>{dep.label} ({dep.count})</SelectItem>
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
                  .sort((a, b) => a[0].localeCompare(b[0]))
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

const ScanResultsSummary = ({ results, show, onToggle }: { results: ScanResult[]; show: boolean; onToggle: () => void }) => {
  const succeeded = results.filter(r => !r.error && r.jobsFound > 0);
  const noJobs = results.filter(r => !r.error && r.jobsFound === 0);
  const failed = results.filter(r => !!r.error);

  return (
    <div className="mb-6 rounded-xl border border-border/40 bg-card/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1.5 text-primary font-medium">
            <CheckCircle className="h-4 w-4" /> {succeeded.length} found jobs
          </span>
          {noJobs.length > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" /> {noJobs.length} no jobs
            </span>
          )}
          {failed.length > 0 && (
            <span className="flex items-center gap-1.5 text-destructive">
              <XCircle className="h-4 w-4" /> {failed.length} failed
            </span>
          )}
        </div>
        {show ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {show && (
        <div className="border-t border-border/40 px-4 py-3 space-y-1 max-h-64 overflow-y-auto">
          {failed.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-destructive mb-1.5">Failed ({failed.length})</p>
              {failed.map(r => (
                <div key={r.company} className="flex items-center justify-between py-1 text-xs">
                  <span className="font-medium">{r.company}</span>
                  <span className="text-destructive/80 truncate ml-2">{r.error}</span>
                </div>
              ))}
            </div>
          )}
          {noJobs.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">No jobs found ({noJobs.length})</p>
              {noJobs.map(r => (
                <div key={r.company} className="flex items-center justify-between py-1 text-xs">
                  <span className="font-medium">{r.company}</span>
                  <span className="text-muted-foreground">0 jobs</span>
                </div>
              ))}
            </div>
          )}
          {succeeded.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-primary mb-1.5">Successful ({succeeded.length})</p>
              {succeeded.sort((a, b) => b.jobsFound - a.jobsFound).map(r => (
                <div key={r.company} className="flex items-center justify-between py-1 text-xs">
                  <span className="font-medium">{r.company}</span>
                  <span className="text-primary">{r.jobsFound} jobs</span>
                </div>
              ))}
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
