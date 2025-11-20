import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, ExternalLink, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import qraftLogo from "@/assets/qraft-logo-original.png";

interface Application {
  id: string;
  company: string;
  position: string;
  status: string;
  applied_date: string;
  url: string;
  role_summary?: any;
}

interface ApplicationWithScore extends Application {
  fitScore?: number;
  analyzing?: boolean;
  overallFit?: string;
  strengths?: string[];
  gaps?: string[];
  suggestions?: string[];
}

const ComparisonView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkAuth();
    fetchUserProfile();
    fetchApplications();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_profiles")
      .select("resume_text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.resume_text) {
      setResumeText(data.resume_text);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("applied_date", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  };

  const analyzeApplication = async (app: ApplicationWithScore) => {
    if (!resumeText) {
      toast({
        title: "No resume found",
        description: "Please upload your resume in the Profile section first",
        variant: "destructive",
      });
      return;
    }

    if (!app.role_summary) {
      toast({
        title: "No role details",
        description: "This application doesn't have role details extracted yet",
        variant: "destructive",
      });
      return;
    }

    setApplications(apps =>
      apps.map(a => a.id === app.id ? { ...a, analyzing: true } : a)
    );

    try {
      const { data, error } = await supabase.functions.invoke('analyze-role-fit', {
        body: { 
          roleDetails: {
            company: app.company,
            position: app.position,
            requirements: app.role_summary?.requirements,
            responsibilities: app.role_summary?.responsibilities,
          },
          resumeText 
        }
      });

      if (error) throw error;

      setApplications(apps =>
        apps.map(a => a.id === app.id ? { 
          ...a, 
          fitScore: data.confidenceScore,
          overallFit: data.overallFit,
          strengths: data.strengths,
          gaps: data.gaps,
          suggestions: data.suggestions,
          analyzing: false 
        } : a)
      );

      toast({
        title: "Analysis complete",
        description: `Fit score: ${data.confidenceScore}%`,
      });
    } catch (error: any) {
      console.error('Error analyzing application:', error);
      setApplications(apps =>
        apps.map(a => a.id === app.id ? { ...a, analyzing: false } : a)
      );
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze application",
        variant: "destructive",
      });
    }
  };

  const analyzeAll = async () => {
    if (!resumeText) {
      toast({
        title: "No resume found",
        description: "Please upload your resume in the Profile section first",
        variant: "destructive",
      });
      return;
    }

    const appsToAnalyze = applications.filter(app => 
      app.role_summary && !app.fitScore && !app.analyzing
    );

    if (appsToAnalyze.length === 0) {
      toast({
        title: "Nothing to analyze",
        description: "All applications with role details have been analyzed",
      });
      return;
    }

    setAnalyzingAll(true);

    for (const app of appsToAnalyze) {
      await analyzeApplication(app);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setAnalyzingAll(false);
  };

  const sortedApplications = [...applications].sort((a, b) => {
    if (a.fitScore === undefined && b.fitScore === undefined) return 0;
    if (a.fitScore === undefined) return 1;
    if (b.fitScore === undefined) return -1;
    return b.fitScore - a.fitScore;
  });

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 75) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const getTrendIcon = (rank: number, total: number) => {
    const percentile = (rank / total) * 100;
    if (percentile <= 33) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (percentile <= 66) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const toggleReasoning = (appId: string) => {
    setExpandedReasons(prev => ({ ...prev, [appId]: !prev[appId] }));
  };

  const analyzedCount = applications.filter(app => app.fitScore !== undefined).length;
  const avgScore = analyzedCount > 0
    ? Math.round(applications.reduce((sum, app) => sum + (app.fitScore || 0), 0) / analyzedCount)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="rounded-full"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <img src={qraftLogo} alt="QRAFT.AI" className="h-10 sm:h-12 opacity-70" />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Application Comparison</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Compare your applications ranked by AI fit score
              </p>
            </div>
            <Button
              onClick={analyzeAll}
              disabled={analyzingAll || !resumeText}
              size="lg"
              className="w-full sm:w-auto"
            >
              {analyzingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze All
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        {analyzedCount > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">Applications Analyzed</div>
              <div className="text-2xl sm:text-3xl font-bold">{analyzedCount}</div>
              <div className="text-xs text-muted-foreground mt-1">
                out of {applications.length} total
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">Average Fit Score</div>
              <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(avgScore)}`}>
                {avgScore}%
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">Best Match</div>
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {Math.max(...applications.map(app => app.fitScore || 0))}%
              </div>
            </Card>
          </div>
        )}

        {/* Applications List */}
        <div className="space-y-4">
          {sortedApplications.map((app, index) => (
            <Card key={app.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {app.fitScore !== undefined && getTrendIcon(index, analyzedCount)}
                    <Link
                      to={`/application/${app.id}`}
                      className="text-xl font-semibold hover:text-primary transition-colors"
                    >
                      {app.position}
                    </Link>
                  </div>
                  <div className="text-muted-foreground mb-3">{app.company}</div>

                  {app.fitScore !== undefined && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Fit Score</span>
                            <span className={`font-semibold ${getScoreColor(app.fitScore)}`}>
                              {app.fitScore}%
                            </span>
                          </div>
                          <Progress value={app.fitScore} className="h-2" />
                        </div>
                        <Badge variant={getScoreBadgeVariant(app.fitScore)}>
                          Rank #{index + 1}
                        </Badge>
                      </div>

                      {app.overallFit && (
                        <div>
                          <button
                            onClick={() => toggleReasoning(app.id)}
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            {expandedReasons[app.id] ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Hide reasoning
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Show reasoning
                              </>
                            )}
                          </button>
                          
                          {expandedReasons[app.id] && (
                            <div className="mt-3 p-4 bg-muted/50 rounded-lg space-y-3">
                              <div>
                                <div className="text-sm font-medium mb-1">Overall Assessment</div>
                                <p className="text-sm text-muted-foreground">{app.overallFit}</p>
                              </div>
                              
                              {app.strengths && app.strengths.length > 0 && (
                                <div>
                                  <div className="text-sm font-medium text-green-600 mb-1">Strengths</div>
                                  <ul className="list-disc list-inside space-y-1">
                                    {app.strengths.map((strength, i) => (
                                      <li key={i} className="text-sm text-muted-foreground">{strength}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {app.gaps && app.gaps.length > 0 && (
                                <div>
                                  <div className="text-sm font-medium text-orange-600 mb-1">Areas for Improvement</div>
                                  <ul className="list-disc list-inside space-y-1">
                                    {app.gaps.map((gap, i) => (
                                      <li key={i} className="text-sm text-muted-foreground">{gap}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {app.analyzing ? (
                    <Button disabled size="sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                  ) : app.fitScore === undefined ? (
                    <Button
                      onClick={() => analyzeApplication(app)}
                      disabled={!resumeText || !app.role_summary}
                      size="sm"
                      variant="outline"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze
                    </Button>
                  ) : (
                    <Button
                      onClick={() => analyzeApplication(app)}
                      size="sm"
                      variant="ghost"
                    >
                      Re-analyze
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                  >
                    <Link to={`/application/${app.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {applications.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No applications yet</p>
              <Button asChild className="mt-4">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;
