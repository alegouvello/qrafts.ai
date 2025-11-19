import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Upload, ArrowLeft, LogOut, Calendar } from "lucide-react";
import { ApplicationCard } from "@/components/ApplicationCard";
import { AddApplicationDialog } from "@/components/AddApplicationDialog";
import { UploadResumeDialog } from "@/components/UploadResumeDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [showUploadDialog, setShowUploadDialog] = useState(false);
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
      // Transform data to match the expected format
      const transformed = await Promise.all(
        (data || []).map(async (app) => {
          // Count questions for this application
          const { count: questionCount } = await supabase
            .from("questions")
            .select("*", { count: "exact", head: true })
            .eq("application_id", app.id);

          // Count answers for questions in this application
          const { data: questions } = await supabase
            .from("questions")
            .select("id")
            .eq("application_id", app.id);

          const questionIds = questions?.map((q) => q.id) || [];
          
          let answerCount = 0;
          if (questionIds.length > 0) {
            const { count } = await supabase
              .from("answers")
              .select("*", { count: "exact", head: true })
              .in("question_id", questionIds);
            answerCount = count || 0;
          }

          return {
            id: app.id,
            company: app.company,
            position: app.position,
            status: app.status as "pending" | "interview" | "rejected" | "accepted",
            appliedDate: app.applied_date,
            url: app.url,
            questions: questionCount || 0,
            answersCompleted: answerCount,
          };
        })
      );
      setApplications(transformed);
    }
    setLoading(false);
  };

  const handleAddApplication = async (data: { company: string; position: string; url: string }) => {
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
        company: data.company,
        position: data.position,
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
      description: "Extracting questions from job posting...",
    });

    // Extract questions in the background
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
        toast({
          title: "Questions Extracted",
          description: `Found ${response.data.questionsFound} questions from the job posting.`,
        });
      } else {
        console.error('Failed to extract questions:', response.data?.error);
        toast({
          title: "Questions Extraction",
          description: "Could not extract questions automatically. You can add them manually.",
          variant: "destructive",
        });
      }
    } catch (extractError) {
      console.error('Error calling extract function:', extractError);
      toast({
        title: "Questions Extraction",
        description: "Could not extract questions automatically. You can add them manually.",
        variant: "destructive",
      });
    }

    fetchApplications();
  };

  const handleUploadResume = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload resumes",
        variant: "destructive",
      });
      return;
    }

    const filePath = `${user.id}/${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file, {
        upsert: true
      });

    if (uploadError) {
      toast({
        title: "Upload Failed",
        description: uploadError.message,
        variant: "destructive",
      });
      return;
    }

    const { error: dbError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
      });

    if (dbError) {
      toast({
        title: "Error",
        description: "Failed to save resume information",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Resume Uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                My Applications
              </h1>
            </div>
            <div className="flex gap-3">
              <Link to="/calendar">
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Resume
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-6 rounded-xl bg-card shadow-soft">
            <p className="text-sm text-muted-foreground mb-1">Total Applications</p>
            <p className="text-3xl font-bold">{applications.length}</p>
          </div>
          <div className="p-6 rounded-xl bg-card shadow-soft">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-3xl font-bold text-warning">
              {applications.filter((a) => a.status === "pending").length}
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card shadow-soft">
            <p className="text-sm text-muted-foreground mb-1">Interviews</p>
            <p className="text-3xl font-bold text-primary">
              {applications.filter((a) => a.status === "interview").length}
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card shadow-soft">
            <p className="text-sm text-muted-foreground mb-1">Response Rate</p>
            <p className="text-3xl font-bold text-success">
              {applications.length > 0
                ? Math.round((applications.filter((a) => a.status !== "pending").length / applications.length) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Your Applications</h2>
          {loading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">No applications yet</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Application
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {applications.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))}
            </div>
          )}
        </div>
      </main>

      <AddApplicationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddApplication}
      />

      <UploadResumeDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUploadResume}
      />
    </div>
  );
};

export default Dashboard;
