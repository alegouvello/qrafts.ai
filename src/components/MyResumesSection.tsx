import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Upload, Trash2, Loader2, Download, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ResumeFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

interface MyResumesSectionProps {
  onUploadClick: () => void;
}

export const MyResumesSection = ({ onUploadClick }: MyResumesSectionProps) => {
  const { toast } = useToast();
  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleDelete = async (resume: ResumeFile) => {
    setDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .remove([resume.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resume.id);

      if (dbError) throw dbError;

      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
      toast({
        title: "Resume Deleted",
        description: `"${resume.file_name}" has been removed`,
      });
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the resume file",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDownload = async (resume: ResumeFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(resume.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = resume.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading resume:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the resume file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <>
      <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">My Resumes</h2>
                <p className="text-sm text-muted-foreground">
                  {resumes.length} resume{resumes.length !== 1 ? "s" : ""} uploaded
                </p>
              </div>
            </div>
            <Button onClick={onUploadClick} size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload New</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                No resumes uploaded yet. Upload your first resume to get started.
              </p>
              <Button onClick={onUploadClick} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Resume
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-primary/20 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{resume.file_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{formatFileSize(resume.file_size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(resume.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(resume)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(resume.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resume file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const resume = resumes.find((r) => r.id === deleteId);
                if (resume) handleDelete(resume);
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
