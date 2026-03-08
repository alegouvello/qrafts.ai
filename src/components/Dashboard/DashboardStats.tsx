import { Card } from "@/components/ui/card";
import { Briefcase, Clock, Users, TrendingUp, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DashboardStatsProps {
  stats: {
    total: number;
    newToday: number;
    pending: number;
    interviews: number;
    totalEverInterviewed: number;
    responseRate: number;
  };
}

export const DashboardStats = ({ stats }: DashboardStatsProps) => {
  const { t } = useTranslation();

  const statCards = [
    {
      icon: Briefcase,
      label: t("dashboard.stats.total"),
      value: stats.total,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Plus,
      label: t("dashboard.stats.newToday"),
      value: stats.newToday,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Clock,
      label: t("dashboard.stats.pending"),
      value: stats.pending,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      icon: Users,
      label: t("dashboard.stats.interview"),
      value: stats.totalEverInterviewed,
      sub: stats.interviews > 0 ? t("dashboard.stats.active", { count: stats.interviews }) : undefined,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: TrendingUp,
      label: t("dashboard.stats.responseRate"),
      value: `${stats.responseRate}%`,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 sm:mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={index} 
            className="p-4 sm:p-6 hover:shadow-lg transition-shadow duration-300 bg-card/50 backdrop-blur-sm border-border/40"
            role="article"
            aria-label={`${stat.label}: ${stat.value}`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`${stat.bgColor} ${stat.color} p-2 sm:p-3 rounded-xl`}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                {stat.sub && (
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">{stat.sub}</p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
