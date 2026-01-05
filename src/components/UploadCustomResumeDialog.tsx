import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ParseProgressStepper, ParseStep } from "./ParseProgressStepper";

interface UploadCustomResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  company: string;
  position: string;
  onResumeUploaded: () => void;
}

export const UploadCustomResumeDialog = ({
  open,
  onOpenChange,
  applicationId,
  company,
  position,
  onResumeUploaded,
}: UploadCustomResumeDialogProps) => {
  const { toast } = useToast();
  const [versionName, setVersionName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [saving, setSaving] = useState(false);
  const [parseStep, setParseStep] = useState<ParseStep | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const resetParseState = () => {
    setParseStep(null);
    setParseError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith(".txt")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Word document, or text file",
        variant: "destructive",
      });
      return;
    }

    // For text files, read directly
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      setResumeText(text);
      if (!versionName) {
        setVersionName(file.name.replace(/\.[^/.]+$/, ""));
      }
      return;
    }

    // For PDF/Word, use the parse-resume edge function with progress tracking
    resetParseState();
    setParseStep('uploading');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      setParseStep('extracting');

      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: {
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to parse resume");
      }

      if (data?.usedOcr) {
        setParseStep('ocr');
        // Small delay to show OCR step
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setParseStep('structuring');
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data?.text) {
        setResumeText(data.text);
        if (!versionName) {
          setVersionName(file.name.replace(/\.[^/.]+$/, ""));
        }
        setParseStep('complete');
        toast({
          title: "Resume parsed",
          description: data.usedOcr 
            ? "Your scanned resume was processed with OCR successfully" 
            : "Your resume has been extracted successfully",
        });
      } else {
        throw new Error("No text could be extracted from the file");
      }
    } catch (error) {
      console.error("Error parsing resume:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not parse the resume";
      setParseStep('error');
      setParseError(errorMessage);
      toast({
        title: "Parse failed",
        description: "See error details below for next steps",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!resumeText.trim()) {
      toast({
        title: "Resume required",
        description: "Please paste or upload your resume content",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("tailored_resumes").insert({
        user_id: user.id,
        application_id: applicationId,
        company: company,
        position: position,
        version_name: versionName.trim() || `${company} - ${position}`,
        resume_text: resumeText.trim(),
      });

      if (error) throw error;

      toast({
        title: "Resume saved",
        description: "Your resume has been saved for this role",
      });

      onResumeUploaded();
      onOpenChange(false);
      setVersionName("");
      setResumeText("");
    } catch (error) {
      console.error("Error saving resume:", error);
      toast({
        title: "Error",
        description: "Failed to save resume",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Resume for This Role
          </DialogTitle>
          <DialogDescription>
            Add a resume you've already created for {position} at {company}. This helps
            improve future tailoring suggestions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">Version Name (optional)</Label>
            <Input
              id="version-name"
              placeholder={`e.g., "${company} Final Version"`}
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Upload Resume File</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={parseStep !== null && parseStep !== 'complete' && parseStep !== 'error'}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Supports PDF, Word (.doc, .docx), and text files
            </p>
          </div>

          {parseStep && (
            <ParseProgressStepper
              currentStep={parseStep}
              errorMessage={parseError || undefined}
              className="pt-2"
            />
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or paste your resume
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume-text">Resume Content</Label>
            <Textarea
              id="resume-text"
              placeholder="Paste your resume content here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {resumeText.length > 0 && `${resumeText.split(/\s+/).filter(Boolean).length} words`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !resumeText.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Save Resume
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
