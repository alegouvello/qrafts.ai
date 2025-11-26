import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Download, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";

interface ResumeTailorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: {
    id: string;
    company: string;
    position: string;
    role_summary?: any;
  };
}

export const ResumeTailorDialog = ({ open, onOpenChange, application }: ResumeTailorDialogProps) => {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [resumeText, setResumeText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatResumeFromJSON = (jsonData: any): string => {
    let formatted = '';
    
    // Basic info
    if (jsonData.full_name) formatted += `${jsonData.full_name}\n`;
    if (jsonData.email) formatted += `${jsonData.email}\n`;
    if (jsonData.phone) formatted += `${jsonData.phone}\n`;
    if (jsonData.location) formatted += `${jsonData.location}\n`;
    if (jsonData.linkedin_url) formatted += `LinkedIn: ${jsonData.linkedin_url}\n`;
    if (jsonData.website_url) formatted += `Website: ${jsonData.website_url}\n`;
    
    // Summary
    if (jsonData.summary) {
      formatted += `\n## Professional Summary\n${jsonData.summary.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n')}\n`;
    }
    
    // Experience
    if (jsonData.experience?.length > 0) {
      formatted += `\n## Experience\n`;
      jsonData.experience.forEach((exp: any) => {
        formatted += `\n### ${exp.position} at ${exp.company}\n`;
        if (exp.location) formatted += `${exp.location}\n`;
        if (exp.start_date || exp.end_date) {
          formatted += `${exp.start_date || ''} - ${exp.end_date || ''}\n`;
        }
        if (exp.description) {
          formatted += `${exp.description.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n')}\n`;
        }
      });
    }
    
    // Education
    if (jsonData.education?.length > 0) {
      formatted += `\n## Education\n`;
      jsonData.education.forEach((edu: any) => {
        formatted += `\n### ${edu.degree} in ${edu.field || ''}\n`;
        formatted += `${edu.institution}\n`;
        if (edu.location) formatted += `${edu.location}\n`;
        if (edu.start_date || edu.end_date) {
          formatted += `${edu.start_date || ''} - ${edu.end_date || ''}\n`;
        }
        if (edu.gpa) formatted += `GPA: ${edu.gpa}\n`;
        if (edu.honors?.length > 0) formatted += `Honors: ${edu.honors.join(', ')}\n`;
      });
    }
    
    // Skills
    if (jsonData.skills?.length > 0) {
      formatted += `\n## Skills\n${jsonData.skills.join(', ')}\n`;
    }
    
    // Certifications
    if (jsonData.certifications?.length > 0) {
      formatted += `\n## Certifications\n`;
      jsonData.certifications.forEach((cert: any) => {
        formatted += `- ${cert.name} (${cert.issuer}, ${cert.date})\n`;
      });
    }
    
    return formatted;
  };

  const fetchResume = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('resume_text')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.resume_text) {
        try {
          // Parse JSON if stored as JSON
          const parsedData = JSON.parse(profile.resume_text);
          const formattedText = formatResumeFromJSON(parsedData);
          setResumeText(formattedText);
        } catch {
          // If not JSON, use as-is
          setResumeText(profile.resume_text);
        }
      } else {
        toast({
          title: "No Resume Found",
          description: "Please upload your resume in your profile first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
      toast({
        title: "Error",
        description: "Failed to load your resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText) {
      await fetchResume();
      if (!resumeText) return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('tailor-resume', {
        body: {
          resumeText,
          position: application.position,
          company: application.company,
          roleSummary: application.role_summary,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setAnalysis(data.suggestions);
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your resume and provided tailored suggestions.",
      });
    } catch (error) {
      console.error('Error analyzing resume:', error);
      toast({
        title: "Error",
        description: "Failed to analyze resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !resumeText && !loading) {
      fetchResume();
    }
    if (!newOpen) {
      setAnalysis("");
    }
    onOpenChange(newOpen);
  };

  const handleCopyAnalysis = () => {
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Analysis copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tailor Your Resume with AI
          </DialogTitle>
          <DialogDescription>
            Get AI-powered suggestions to tailor your resume for {application.position} at {application.company}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!analysis && (
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Your Resume
              </h3>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : resumeText ? (
                <Textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Your resume will appear here..."
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No resume found. Please upload your resume in your profile first.
                </p>
              )}
            </Card>
          )}

          {analysis && (
            <Card className="p-6 bg-background">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">AI Tailoring Suggestions</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAnalysis}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {!analysis && (
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !resumeText}
                className="gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Analyze & Get Suggestions
                  </>
                )}
              </Button>
            )}
            {analysis && (
              <Button
                onClick={() => {
                  setAnalysis("");
                  handleAnalyze();
                }}
                disabled={analyzing}
                variant="outline"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Analyze Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
