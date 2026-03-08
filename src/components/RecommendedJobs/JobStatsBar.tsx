import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

interface JobStatsBarProps {
  scoredCount: number;
  totalActiveJobs: number;
  totalCompanies: number;
  newJobsCount: number;
  scoring: boolean;
  scoreProgress: { scored: number; total: number } | null;
  onScoreUnscored: () => void;
}

export const JobStatsBar = ({
  scoredCount,
  totalActiveJobs,
  totalCompanies,
  newJobsCount,
  scoring,
  scoreProgress,
  onScoreUnscored,
}: JobStatsBarProps) => (
  <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
        <p className="text-2xl font-bold text-primary">{scoredCount}</p>
        <p className="text-xs text-muted-foreground">Scored Matches</p>
      </div>
      <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
        <p className="text-2xl font-bold">{totalActiveJobs}</p>
        <p className="text-xs text-muted-foreground">Total Openings</p>
        {totalActiveJobs > scoredCount && (
          <p className="text-[10px] text-warning mt-0.5">{totalActiveJobs - scoredCount} unscored</p>
        )}
      </div>
      <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
        <p className="text-2xl font-bold">{totalCompanies}</p>
        <p className="text-xs text-muted-foreground">Companies</p>
      </div>
      <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
        <p className="text-2xl font-bold text-primary">{newJobsCount}</p>
        <p className="text-xs text-muted-foreground">New Today</p>
      </div>
    </div>

    {/* Unscored jobs banner */}
    {totalActiveJobs > scoredCount && !scoring && (
      <div className="flex items-center justify-between gap-3 mb-6 p-3 rounded-lg border border-warning/30 bg-warning/5">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{totalActiveJobs - scoredCount}</span> jobs haven't been scored against your resume yet
          </span>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={onScoreUnscored}>
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
  </>
);
