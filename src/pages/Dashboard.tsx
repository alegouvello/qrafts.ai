import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, LogOut, BarChart3 } from "lucide-react";
import { ApplicationCard } from "@/components/ApplicationCard";
import { AddApplicationDialog } from "@/components/AddApplicationDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import qraftLogo from "@/assets/qraft-logo.png";

interface Application {
  id: string;
  company: string;
  position: string;
  status: "pending" | "interview" | "rejected" | "accepted";
  appliedDate: string;
  url: string;
  questions: number;
  answersCompleted: number;
}

const Dashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchApplications();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } else {
      // Helper function to identify file upload questions (same as ApplicationDetail)
      const isFileUploadQuestion = (questionText: string) => {
        const lower = questionText.toLowerCase();
        return lower.includes('resume') || lower.includes('cv') || 
               lower.includes('cover letter') || lower.includes('upload') || 
               lower.includes('attach');
      };

      // Transform data to match the expected format
      const transformed = await Promise.all(
        (data || []).map(async (app) => {
          // Get all questions for this application
          const { data: questions } = await supabase
            .from("questions")
            .select("id, question_text")
            .eq("application_id", app.id);

          // Filter out file upload questions
          const textQuestions = questions?.filter(q => !isFileUploadQuestion(q.question_text)) || [];
          const textQuestionIds = textQuestions.map(q => q.id);
          
          let answerCount = 0;
          if (textQuestionIds.length > 0) {
            const { data: answersData } = await supabase
              .from("answers")
              .select("question_id, answer_text")
              .in("question_id", textQuestionIds);
            
            // Count only questions that have non-empty, non-whitespace answers
            const uniqueAnsweredQuestions = new Set(
              answersData
                ?.filter(a => a.answer_text && a.answer_text.trim().length > 0)
                .map(a => a.question_id)
            );
            answerCount = uniqueAnsweredQuestions.size;
          }

          return {
            id: app.id,
            company: app.company,
            position: app.position,
            status: app.status as "pending" | "interview" | "rejected" | "accepted",
            appliedDate: app.applied_date,
            url: app.url,
            questions: textQuestions.length,
            answersCompleted: answerCount,
          };
        })
      );
      setApplications(transformed);
    }
    setLoading(false);
  };

  const handleAddApplication = async (data: { company?: string; position?: string; url: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add applications",
        variant: "destructive",
      });
      return;
    }

    const { data: newApp, error } = await supabase
      .from("applications")
      .insert({
        company: data.company || "Unknown Company",
        position: data.position || "Unknown Position",
        url: data.url,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add application",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Application Added",
      description: "Extracting job details and questions...",
    });

    // Extract questions and job info in the background
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('extract-job-questions', {
        body: {
          applicationId: newApp.id,
          jobUrl: data.url,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.data?.success) {
        const parts = [];
        if (response.data.company && response.data.position) {
          parts.push(`Company: ${response.data.company}, Position: ${response.data.position}`);
        }
        parts.push(`${response.data.questionsFound} questions extracted`);
        
        toast({
          title: "Extraction Complete",
          description: parts.join('. '),
        });
      } else {
        console.error('Failed to extract:', response.data?.error);
        toast({
          title: "Extraction Issue",
          description: "Could not extract all details. You can edit them manually.",
          variant: "destructive",
        });
      }
    } catch (extractError) {
      console.error('Error calling extract function:', extractError);
      toast({
        title: "Extraction Issue",
        description: "Could not extract details automatically. You can edit them manually.",
        variant: "destructive",
      });
    }

    fetchApplications();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteApplication = async (id: string) => {
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Application Deleted",
        description: "The application and all associated data have been removed",
      });
      fetchApplications();
    }
  };

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    interviews: applications.filter((a) => a.status === "interview").length,
    responseRate: applications.length > 0 
      ? Math.round(((applications.filter((a) => a.status !== "pending").length) / applications.length) * 100)
      : 0,
  };

  // Group applications by company
  const groupedApplications = applications.reduce((acc, app) => {
    if (!acc[app.company]) {
      acc[app.company] = [];
    }
    acc[app.company].push(app);
    return acc;
  }, {} as Record<string, Application[]>);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/3 via-background to-background pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <img src={qraftLogo} alt="QRAFT.AI" className="h-20" />
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setShowAddDialog(true)} className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
              <Link to="/profile">
                <Button variant="ghost" className="w-full sm:w-auto rounded-full hover:bg-primary/5 transition-all">
                  Profile
                </Button>
              </Link>
              <Link to="/comparison">
                <Button variant="ghost" className="w-full sm:w-auto rounded-full hover:bg-accent/5 transition-all">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare
                </Button>
              </Link>
              <Button variant="ghost" onClick={handleSignOut} className="rounded-full hover:bg-destructive/5 transition-all">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{stats.total}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Applications</div>
          </div>
          <div className="group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50 hover:border-warning/30 transition-all hover:shadow-lg hover:shadow-warning/5">
            <div className="text-4xl font-bold mb-2 text-warning">{stats.pending}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pending Review</div>
          </div>
          <div className="group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="text-4xl font-bold mb-2 text-primary">{stats.interviews}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Interviews</div>
          </div>
          <div className="group relative bg-gradient-to-br from-card to-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50 hover:border-success/30 transition-all hover:shadow-lg hover:shadow-success/5">
            <div className="text-4xl font-bold mb-2 text-success">{stats.responseRate}%</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Response Rate</div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-8 w-32 bg-muted/30 rounded-lg animate-pulse" />
                <div className="h-32 bg-card/30 rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-24">
            <div className="max-w-md mx-auto space-y-6">
              <div className="relative mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-2xl" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto border border-primary/20">
                  <Plus className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold">Start Your Journey</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">Add your first application to begin tracking your progress and organizing your job search</p>
              <Button onClick={() => setShowAddDialog(true)} className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all mt-6">
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedApplications).map(([company, companyApps]) => (
              <div key={company} className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <h2 className="text-lg font-semibold">{company}</h2>
                  <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                    {companyApps.length} {companyApps.length === 1 ? 'role' : 'roles'}
                  </span>
                </div>
                <div className="space-y-3">
                  {companyApps.map((application) => (
                    <ApplicationCard key={application.id} application={application} onDelete={handleDeleteApplication} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AddApplicationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddApplication}
      />
    </div>
  );
};

export default Dashboard;
