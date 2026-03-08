import React from "react";
import { Clock, TrendingUp, Target, Calendar } from "lucide-react";

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

interface Metrics {
  avgResponseDays: number | null;
  fastestResponseDays: number | null;
  totalApps: number;
  interviewRate: number;
  acceptanceRate: number;
  rejectionRate: number;
}

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

interface CompanyStatsPanelProps {
  communityStats: CompanyStats | null;
  metrics: Metrics;
}

export const CompanyStatsPanel = ({ communityStats, metrics }: CompanyStatsPanelProps) => (
  <div className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-4">
    {/* Community */}
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Community</h3>
      <div className="grid grid-cols-2 gap-1.5">
        <StatCard
          icon={TrendingUp}
          label="Interview Rate"
          value={communityStats ? `${communityStats.interview_rate}%` : "—"}
          sub={communityStats ? `${communityStats.interview_count} interviews` : undefined}
        />
        <StatCard
          icon={Target}
          label="Acceptance"
          value={communityStats ? `${communityStats.acceptance_rate}%` : "—"}
          sub={communityStats ? `${communityStats.accepted_count} accepted` : undefined}
        />
        <StatCard
          icon={Clock}
          label="Avg. Response"
          value={communityStats?.avg_response_days ? `${communityStats.avg_response_days}d` : "—"}
          sub={communityStats?.fastest_response_days ? `Fastest: ${communityStats.fastest_response_days}d` : undefined}
        />
        <StatCard
          icon={Calendar}
          label="Rejection"
          value={communityStats ? `${communityStats.rejection_rate}%` : "—"}
          sub={communityStats ? `${communityStats.rejected_count} rejected` : undefined}
          accent="destructive"
        />
      </div>
    </div>

    {/* Your Stats */}
    {metrics.totalApps > 0 && (
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Your Stats</h3>
        <div className="grid grid-cols-2 gap-1.5">
          <StatCard icon={TrendingUp} label="Interview Rate" value={`${metrics.interviewRate}%`} />
          <StatCard icon={Target} label="Acceptance" value={`${metrics.acceptanceRate}%`} />
          <StatCard
            icon={Clock}
            label="Avg. Response"
            value={metrics.avgResponseDays ? `${metrics.avgResponseDays}d` : "—"}
            sub={metrics.fastestResponseDays ? `Fastest: ${metrics.fastestResponseDays}d` : undefined}
          />
          <StatCard
            icon={Calendar}
            label="Rejection"
            value={`${metrics.rejectionRate}%`}
            accent="destructive"
          />
        </div>
      </div>
    )}
  </div>
);
