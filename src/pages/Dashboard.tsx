import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Upload, ArrowLeft } from "lucide-react";
import { ApplicationCard } from "@/components/ApplicationCard";
import { AddApplicationDialog } from "@/components/AddApplicationDialog";
import { UploadResumeDialog } from "@/components/UploadResumeDialog";
import { useToast } from "@/hooks/use-toast";

// Mock data for demo
const mockApplications = [
  {
    id: "1",
    company: "TechCorp",
    position: "Senior Frontend Developer",
    status: "pending" as const,
    appliedDate: "2024-01-15",
    url: "https://example.com/job1",
    questions: 3,
    answersCompleted: 2,
  },
  {
    id: "2",
    company: "StartupXYZ",
    position: "Full Stack Engineer",
    status: "interview" as const,
    appliedDate: "2024-01-10",
    url: "https://example.com/job2",
    questions: 5,
    answersCompleted: 5,
  },
  {
    id: "3",
    company: "BigCompany Inc",
    position: "React Developer",
    status: "rejected" as const,
    appliedDate: "2024-01-05",
    url: "https://example.com/job3",
    questions: 4,
    answersCompleted: 4,
  },
];

const Dashboard = () => {
  const [applications, setApplications] = useState(mockApplications);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { toast } = useToast();

  const handleAddApplication = (data: { company: string; position: string; url: string }) => {
    const newApp = {
      id: String(applications.length + 1),
      ...data,
      status: "pending" as const,
      appliedDate: new Date().toISOString().split("T")[0],
      questions: 0,
      answersCompleted: 0,
    };
    setApplications([newApp, ...applications]);
    toast({
      title: "Application Added",
      description: "Your new application has been added successfully.",
    });
  };

  const handleUploadResume = (file: File) => {
    toast({
      title: "Resume Uploaded",
      description: `${file.name} has been uploaded successfully.`,
    });
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
              <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Resume
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Application
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
            <p className="text-3xl font-bold text-success">67%</p>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Your Applications</h2>
          {applications.length === 0 ? (
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
