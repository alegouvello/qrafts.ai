import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Loader2,
  CheckCircle,
  Sparkles,
  Library,
  Copy,
  Edit2,
  FileText,
  Upload,
} from "lucide-react";

interface ResumeTabProps {
  application: {
    id: string;
    company: string;
    position: string;
  };
  savedTailoredResume: any;
  loadingTailoredResume: boolean;
  onShowResumeTailorDialog: () => void;
  onShowSavedResumesDialog: () => void;
  onShowUploadResumeDialog: () => void;
}

export const ResumeTab = ({
  application,
  savedTailoredResume,
  loadingTailoredResume,
  onShowResumeTailorDialog,
  onShowSavedResumesDialog,
  onShowUploadResumeDialog,
}: ResumeTabProps) => {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Resume Tailoring</h2>
          <p className="text-sm text-muted-foreground">
            Get AI-powered suggestions to tailor your resume for this specific role
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={onShowSavedResumesDialog} variant="outline" className="gap-2">
            <Library className="h-4 w-4" />
            View All
          </Button>
          <Button onClick={onShowUploadResumeDialog} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Resume
          </Button>
          <Button onClick={onShowResumeTailorDialog} className="gap-2">
            <FileText className="h-4 w-4" />
            {savedTailoredResume ? "Update Resume" : "Tailor Resume"}
          </Button>
        </div>
      </div>

      {loadingTailoredResume ? (
        <Card className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </Card>
      ) : savedTailoredResume ? (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Tailored Resume</h3>
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(savedTailoredResume.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(savedTailoredResume.resume_text);
                  toast({ title: "Copied", description: "Resume copied to clipboard" });
                }}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowResumeTailorDialog}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert max-h-[600px] overflow-y-auto">
            <ReactMarkdown>{savedTailoredResume.resume_text}</ReactMarkdown>
          </div>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">How Resume Tailoring Works</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our AI analyzes your resume alongside the job description and requirements for{" "}
                  {application.position} at {application.company}. It provides specific, actionable
                  suggestions to:
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Highlight relevant experience and skills that match the role</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Incorporate keywords from the job description to pass ATS screening</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Quantify your achievements and demonstrate measurable impact</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Restructure sections to emphasize your strongest qualifications</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
