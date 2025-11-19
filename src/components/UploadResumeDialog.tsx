import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<boolean>;
}

export const UploadResumeDialog = ({
  open,
  onOpenChange,
  onUpload,
}: UploadResumeDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const success = await onUpload(selectedFile);
    
    if (success) {
      // Call parse-resume function after successful upload
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const filePath = `${user.id}/${selectedFile.name}`;
          const { data: { session } } = await supabase.auth.getSession();
          
          const response = await supabase.functions.invoke('parse-resume', {
            body: { resumeUrl: filePath },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });

          if (response.data?.success) {
            toast({
              title: "Resume Parsed",
              description: "Your profile has been updated. Questions will auto-fill!",
            });
          }
        }
      } catch (error) {
        console.error('Error parsing resume:', error);
        // Don't show error to user as upload was successful
      }
      
      setSelectedFile(null);
      onOpenChange(false);
    }
    
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>
            Upload your resume to use across all your job applications. Supported formats: PDF, DOC, DOCX (Word documents work best for automatic parsing)
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Drag and drop your resume here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                PDF, DOC, or DOCX (max 10MB)
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleChange}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 border border-border">
              <FileText className="h-10 w-10 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedFile || uploading}>
            {uploading ? "Uploading..." : "Upload Resume"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
