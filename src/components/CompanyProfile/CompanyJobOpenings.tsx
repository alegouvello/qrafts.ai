import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase, ExternalLink, Loader2, MapPin, RefreshCw, Sparkles, Bell } from "lucide-react";

interface CompanyJobOpeningsProps {
  jobOpenings: any[];
  jobMatchScores: Record<string, any>;
  loadingJobs: boolean;
  isWatching: boolean;
  onScanJobs: () => void;
}

export const CompanyJobOpenings = ({
  jobOpenings,
  jobMatchScores,
  loadingJobs,
  isWatching,
  onScanJobs,
}: CompanyJobOpeningsProps) => {
  const [showAllJobs, setShowAllJobs] = useState(false);

  const sortedJobs = [...jobOpenings]
    .sort((a, b) => (jobMatchScores[b.id]?.match_score || 0) - (jobMatchScores[a.id]?.match_score || 0));
  const displayedJobs = showAllJobs ? sortedJobs : sortedJobs.slice(0, 10);
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-primary" />
          Open Positions
          {jobOpenings.length > 0 && (
            <Badge variant="secondary" className="text-[10px] font-normal">{jobOpenings.length}</Badge>
          )}
        </h2>
        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onScanJobs} disabled={loadingJobs}>
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
                      {isHighMatch && <Sparkles className="h-3 w-3 text-primary shrink-0" />}
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
      )}

      {isWatching && (
        <p className="text-[11px] text-muted-foreground mt-2.5 flex items-center gap-1 border-t border-border/30 pt-2.5">
          <Bell className="h-3 w-3 text-primary" /> Daily email alerts enabled for 80%+ matches
        </p>
      )}
    </div>
  );
};
