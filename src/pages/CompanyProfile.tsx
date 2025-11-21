import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

  useEffect(() => {
    checkAuth();
    if (companyName) {
      fetchCompanyData();
      fetchCompanyNotes();
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
              <Link to="/dashboard">
                <img src={qraftLogo} alt="Qraft" className="h-8" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Company Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{decodedCompany}</h1>
            <p className="text-muted-foreground">{metrics.totalApps} application{metrics.totalApps !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </div>
            <div className="text-3xl font-bold">
              {metrics.avgResponseDays !== null ? `${metrics.avgResponseDays}` : "—"}
              {metrics.avgResponseDays !== null && <span className="text-lg text-muted-foreground ml-1">days</span>}
            </div>
            {metrics.fastestResponseDays !== null && (
              <div className="text-xs text-muted-foreground mt-1">
                Fastest: {metrics.fastestResponseDays} days
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-sm text-muted-foreground">Interview Rate</div>
            </div>
            <div className="text-3xl font-bold">{metrics.interviewRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {applications.filter(a => a.status === "interview" || a.history.some(h => h.status === "interview")).length} of {metrics.totalApps}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground">Acceptance Rate</div>
            </div>
            <div className="text-3xl font-bold">{metrics.acceptanceRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {applications.filter(a => a.status === "accepted").length} accepted
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-sm text-muted-foreground">Rejection Rate</div>
            </div>
            <div className="text-3xl font-bold">{metrics.rejectionRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {applications.filter(a => a.status === "rejected").length} rejected
            </div>
          </Card>
        </div>

        {/* Company Notes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Company Notes
            </h2>
            {!editingNotes ? (
              <Button
                onClick={() => setEditingNotes(true)}
                variant="outline"
                size="sm"
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
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  size="sm"
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
              className="min-h-32"
            />
          ) : (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {companyNotes || "No notes yet. Click Edit to add notes about this company."}
            </div>
          )}
        </Card>

        {/* Application History */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Application History
          </h2>
          <div className="space-y-4">
            {applications.map((app) => {
              const StatusIcon = statusConfig[app.status as keyof typeof statusConfig]?.icon || AlertCircle;
              const responseTime = app.history.length > 0
                ? differenceInDays(new Date(app.history[0].changed_at), new Date(app.applied_date))
                : null;

              return (
                <Card key={app.id} className="p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <StatusIcon className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold">{app.position}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={statusConfig[app.status as keyof typeof statusConfig]?.variant || "secondary"}>
                              {statusConfig[app.status as keyof typeof statusConfig]?.label || app.status}
                            </Badge>
                            {responseTime !== null && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Responded in {responseTime} days
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied {format(new Date(app.applied_date), "MMM d, yyyy")}
                        </span>
                        {app.url && (
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Job Posting
                          </a>
                        )}
                      </div>
                    </div>
                    <Link to={`/application/${app.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>

        {/* Insights */}
        {applications.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Insights
            </h2>
            <div className="space-y-3 text-sm">
              {metrics.avgResponseDays !== null && (
                <p className="text-muted-foreground">
                  • {decodedCompany} typically responds within <span className="font-semibold text-foreground">{metrics.avgResponseDays} days</span> of application submission.
                </p>
              )}
              {metrics.interviewRate > 0 && (
                <p className="text-muted-foreground">
                  • Your interview rate with {decodedCompany} is <span className="font-semibold text-foreground">{metrics.interviewRate}%</span>
                  {metrics.interviewRate >= 30 ? ", which is excellent!" : metrics.interviewRate >= 15 ? ", which is good." : ". Consider tailoring your applications more."}
                </p>
              )}
              {metrics.totalApps > 1 && (
                <p className="text-muted-foreground">
                  • You've applied to {metrics.totalApps} positions at {decodedCompany}. Consider diversifying to other companies as well.
                </p>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CompanyProfile;
