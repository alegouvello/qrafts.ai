import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  BarChart3,
  Activity,
  Zap,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { differenceInDays, format } from "date-fns";
import qraftLogo from "@/assets/qrafts-logo.png";

interface ApplicationWithHistory {
  id: string;
  company: string;
  position: string;
  applied_date: string;
  status: string;
  history: {
    status: string;
    changed_at: string;
  }[];
}

interface CompanyMetrics {
  company: string;
  avgResponseDays: number;
  totalApplications: number;
  fastestResponseDays: number;
}

const COLORS = {
  pending: "hsl(var(--secondary))",
  interview: "hsl(var(--primary))",
  rejected: "hsl(var(--destructive))",
  accepted: "hsl(var(--accent))",
};

const Analytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationWithHistory[]>([]);
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null);
  const [fastestCompany, setFastestCompany] = useState<CompanyMetrics | null>(null);
  const [slowestCompany, setSlowestCompany] = useState<CompanyMetrics | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number }[]>([]);
  const [conversionRates, setConversionRates] = useState<{ stage: string; rate: number; count: number }[]>([]);

  useEffect(() => {
    checkAuth();
    fetchAnalytics();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all applications
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("id, company, position, applied_date, status")
        .eq("user_id", user.id);

      if (appsError) throw appsError;

      // Fetch status history for all applications
      const { data: history, error: historyError } = await (supabase as any)
        .from("application_status_history")
        .select("application_id, status, changed_at")
        .eq("user_id", user.id)
        .order("changed_at", { ascending: true });

      if (historyError) {
        console.error("Error fetching status history:", historyError);
      }

      // Combine data
      const appsWithHistory: ApplicationWithHistory[] = (apps || []).map(app => ({
        ...app,
        history: (history || [])
          .filter(h => h.application_id === app.id)
          .map(h => ({ status: h.status, changed_at: h.changed_at })),
      }));

      setApplications(appsWithHistory);
      calculateMetrics(appsWithHistory);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (apps: ApplicationWithHistory[]) => {
    if (apps.length === 0) return;

    // Calculate average response time (applied to first status change)
    const responseTimes = apps
      .filter(app => app.history.length > 0)
      .map(app => {
        const firstChange = app.history[0];
        return differenceInDays(new Date(firstChange.changed_at), new Date(app.applied_date));
      });

    if (responseTimes.length > 0) {
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      setAvgResponseTime(Math.round(avg));
    }

    // Calculate company metrics
    const companyMap = new Map<string, { responseTimes: number[]; count: number }>();
    
    apps.forEach(app => {
      if (app.history.length > 0) {
        const firstChange = app.history[0];
        const days = differenceInDays(new Date(firstChange.changed_at), new Date(app.applied_date));
        
        if (!companyMap.has(app.company)) {
          companyMap.set(app.company, { responseTimes: [], count: 0 });
        }
        
        const companyData = companyMap.get(app.company)!;
        companyData.responseTimes.push(days);
        companyData.count++;
      }
    });

    const companyMetrics: CompanyMetrics[] = Array.from(companyMap.entries())
      .map(([company, data]) => ({
        company,
        avgResponseDays: Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length),
        totalApplications: data.count,
        fastestResponseDays: Math.min(...data.responseTimes),
      }))
      .sort((a, b) => a.avgResponseDays - b.avgResponseDays);

    if (companyMetrics.length > 0) {
      setFastestCompany(companyMetrics[0]);
      setSlowestCompany(companyMetrics[companyMetrics.length - 1]);
    }

    // Calculate status distribution
    const statusCount = apps.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const distribution = Object.entries(statusCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
    setStatusDistribution(distribution);

    // Calculate conversion rates
    const totalApps = apps.length;
    const interviewCount = apps.filter(a => 
      a.status === "interview" || 
      a.history.some(h => h.status === "interview")
    ).length;
    const rejectedCount = apps.filter(a => a.status === "rejected").length;
    const acceptedCount = apps.filter(a => a.status === "accepted").length;

    setConversionRates([
      {
        stage: "Applied → Interview",
        rate: totalApps > 0 ? Math.round((interviewCount / totalApps) * 100) : 0,
        count: interviewCount,
      },
      {
        stage: "Applied → Rejected",
        rate: totalApps > 0 ? Math.round((rejectedCount / totalApps) * 100) : 0,
        count: rejectedCount,
      },
      {
        stage: "Applied → Accepted",
        rate: totalApps > 0 ? Math.round((acceptedCount / totalApps) * 100) : 0,
        count: acceptedCount,
      },
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/dashboard" className="transition-all duration-300 hover:scale-105">
                <img src={qraftLogo} alt="Qraft" className="h-20" />
              </Link>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Analytics Dashboard</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {applications.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Data Yet</h2>
            <p className="text-muted-foreground mb-4">
              Start adding applications to see your analytics and track response times.
            </p>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Response Time</div>
                </div>
                <div className="text-3xl font-bold">
                  {avgResponseTime !== null ? `${avgResponseTime}` : "—"}
                  {avgResponseTime !== null && <span className="text-lg text-muted-foreground ml-1">days</span>}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Zap className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-sm text-muted-foreground">Fastest Company</div>
                </div>
                {fastestCompany ? (
                  <Link to={`/company/${encodeURIComponent(fastestCompany.company)}`}>
                    <div className="text-xl font-bold truncate hover:text-primary transition-colors">
                      {fastestCompany.company}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {fastestCompany.fastestResponseDays} days
                    </div>
                  </Link>
                ) : (
                  <div className="text-xl font-bold">—</div>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="text-sm text-muted-foreground">Slowest Company</div>
                </div>
                {slowestCompany ? (
                  <Link to={`/company/${encodeURIComponent(slowestCompany.company)}`}>
                    <div className="text-xl font-bold truncate hover:text-primary transition-colors">
                      {slowestCompany.company}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {slowestCompany.avgResponseDays} days avg
                    </div>
                  </Link>
                ) : (
                  <div className="text-xl font-bold">—</div>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground">Total Applications</div>
                </div>
                <div className="text-3xl font-bold">{applications.length}</div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Status Distribution
                </h2>
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "#888"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No status data available
                  </div>
                )}
              </Card>

              {/* Conversion Rates */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Conversion Rates
                </h2>
                {conversionRates.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={conversionRates}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="stage"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        label={{ value: "Rate (%)", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string, props: any) => [
                          `${value}% (${props.payload.count} applications)`,
                          "Rate",
                        ]}
                      />
                      <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No conversion data available
                  </div>
                )}
              </Card>
            </div>

            {/* Insights */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Key Insights
              </h2>
              <div className="space-y-4">
                {avgResponseTime !== null && (
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Average Response Time</p>
                      <p className="text-sm text-muted-foreground">
                        Companies typically respond within {avgResponseTime} days of your application.
                        {avgResponseTime > 14 && " Consider following up after 2 weeks."}
                      </p>
                    </div>
                  </div>
                )}
                
                {conversionRates.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Interview Conversion Rate</p>
                      <p className="text-sm text-muted-foreground">
                        {conversionRates[0]?.rate}% of your applications result in interviews.
                        {conversionRates[0]?.rate < 20 && " Consider tailoring your applications more specifically to each role."}
                        {conversionRates[0]?.rate >= 20 && conversionRates[0]?.rate < 40 && " You're doing well! Keep refining your approach."}
                        {conversionRates[0]?.rate >= 40 && " Excellent conversion rate! Your applications are highly targeted."}
                      </p>
                    </div>
                  </div>
                )}

                {fastestCompany && slowestCompany && (
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Company Response Patterns</p>
                      <p className="text-sm text-muted-foreground">
                        {fastestCompany.company} responds fastest (avg {fastestCompany.fastestResponseDays} days), 
                        while {slowestCompany.company} takes longer (avg {slowestCompany.avgResponseDays} days).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
