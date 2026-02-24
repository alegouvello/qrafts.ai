import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Upload, FileText, Briefcase, PartyPopper, ArrowRight, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  onAddApplication?: (data: { url: string }) => Promise<void>;
}

export const OnboardingDialog = ({ open, onComplete, onAddApplication }: OnboardingDialogProps) => {
  const [step, setStep] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [addingApp, setAddingApp] = useState(false);
  const [appAdded, setAppAdded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const TOTAL_STEPS = 4;

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          updated_at: new Date().toISOString(),
        });
    }
    onComplete();
  };

  // Resume upload logic
  const validateFile = (file: File): boolean => {
    const allowedExtensions = ['.doc', '.docx'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      toast({ title: "Invalid File", description: "Please upload a DOC or DOCX file.", variant: "destructive" });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) setResumeFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) setResumeFile(file);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    setResumeUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${resumeFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, resumeFile, { upsert: true });
      if (uploadError) throw uploadError;

      // Save to resumes table
      await supabase.from("resumes").insert({
        user_id: user.id,
        file_name: resumeFile.name,
        file_path: filePath,
        file_size: resumeFile.size,
        is_primary: true,
      });

      // Parse resume in background
      const { data: { session } } = await supabase.auth.getSession();
      supabase.functions.invoke('parse-resume', {
        body: { resumeUrl: filePath },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      setResumeUploaded(true);
      toast({ title: "Resume Uploaded!", description: "Your resume is being parsed in the background." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload Failed", description: "Please try again or skip this step.", variant: "destructive" });
    } finally {
      setResumeUploading(false);
    }
  };

  // Add application logic
  const handleAddApp = async () => {
    if (!jobUrl.trim() || !onAddApplication) return;
    setAddingApp(true);
    try {
      await onAddApplication({ url: jobUrl.trim() });
      setAppAdded(true);
      toast({ title: "Application Added!", description: "Job details are being extracted." });
    } catch {
      toast({ title: "Error", description: "Failed to add application.", variant: "destructive" });
    } finally {
      setAddingApp(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-primary/20">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Welcome to Qrafts!</h2>
              <p className="text-muted-foreground">Let's set up your account in 2 quick steps so you can start tracking applications with AI-powered insights.</p>
            </div>
          </div>
        );

      case 1: // Upload Resume
        return (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-primary/20">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold">Upload Your Resume</h2>
              <p className="text-sm text-muted-foreground">This powers AI answer suggestions and resume tailoring across all your applications.</p>
            </div>

            {resumeUploaded ? (
              <div className="w-full flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Resume uploaded & set as default!</span>
              </div>
            ) : !resumeFile ? (
              <div
                className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Drop your resume here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">DOC or DOCX (max 10MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="w-full space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{resumeFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {!resumeUploading && (
                    <Button variant="ghost" size="icon" onClick={() => setResumeFile(null)} className="flex-shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button onClick={handleResumeUpload} disabled={resumeUploading} className="w-full">
                  {resumeUploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Upload Resume</>
                  )}
                </Button>
              </div>
            )}
          </div>
        );

      case 2: // Add Application
        return (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-primary/20">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold">Add Your First Application</h2>
              <p className="text-sm text-muted-foreground">Paste a job posting URL and we'll extract the company, position, and application questions automatically.</p>
            </div>

            {appAdded ? (
              <div className="w-full flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Application added! Details are being extracted.</span>
              </div>
            ) : (
              <div className="w-full space-y-3">
                <Input
                  placeholder="https://company.com/jobs/..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={addingApp}
                  className="h-12"
                />
                <Button
                  onClick={handleAddApp}
                  disabled={!jobUrl.trim() || addingApp}
                  className="w-full"
                >
                  {addingApp ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
                  ) : (
                    <><Briefcase className="h-4 w-4 mr-2" />Add Application</>
                  )}
                </Button>
              </div>
            )}
          </div>
        );

      case 3: // Complete
        return (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500/10 to-accent/10 flex items-center justify-center border border-green-500/20">
                <PartyPopper className="h-10 w-10 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">You're All Set!</h2>
              <p className="text-muted-foreground">
                {resumeUploaded && appAdded
                  ? "Your resume is being parsed and your first application is being processed. Explore your dashboard!"
                  : resumeUploaded
                  ? "Your resume is ready. Add applications anytime from the dashboard."
                  : appAdded
                  ? "Your application is being processed. Upload your resume from your Profile for AI features."
                  : "You can upload your resume and add applications anytime from the dashboard."}
              </p>
            </div>
          </div>
        );
    }
  };

  const canProceed = () => {
    if (step === 1) return true; // Can always skip resume
    if (step === 2) return true; // Can always skip application
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleComplete()}>
      <DialogContent className="sm:max-w-md" aria-labelledby="onboarding-title">
        <div className="flex flex-col gap-6 py-4">
          {renderStep()}

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-10 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 w-full">
            {step > 0 && step < TOTAL_STEPS - 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                Back
              </Button>
            )}
            <Button
              onClick={step === TOTAL_STEPS - 1 ? handleComplete : () => setStep(step + 1)}
              className="flex-1"
            >
              {step === 0 ? (
                <>Let's Go <ArrowRight className="h-4 w-4 ml-2" /></>
              ) : step === TOTAL_STEPS - 1 ? (
                "Go to Dashboard"
              ) : (
                <>{(step === 1 && !resumeUploaded) || (step === 2 && !appAdded) ? "Skip" : "Next"} <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </div>

          {step > 0 && step < TOTAL_STEPS - 1 && (
            <button
              onClick={handleComplete}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Skip setup entirely
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
