import { useState, useEffect } from "react";
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
  const [originalResume, setOriginalResume] = useState<string>("");
  const [tailoredResume, setTailoredResume] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedTailored, setCopiedTailored] = useState(false);

  const formatHTMLContent = (html: string): string => {
    if (!html) return '';
    
    // Convert HTML list items to markdown bullets
    let text = html
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<ul>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<p>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
      .trim();
    
    return text;
  };

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
      formatted += `\n## Professional Summary\n${formatHTMLContent(jsonData.summary)}\n`;
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
          formatted += `${formatHTMLContent(exp.description)}\n`;
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
        if (edu.description) formatted += `${formatHTMLContent(edu.description)}\n`;
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
    
    // Publications
    if (jsonData.publications?.length > 0) {
      formatted += `\n## Publications\n`;
      jsonData.publications.forEach((pub: any) => {
        formatted += `- ${pub.title || pub}`;
        if (typeof pub === 'object') {
          if (pub.authors) formatted += ` by ${pub.authors}`;
          if (pub.journal) formatted += `, ${pub.journal}`;
          if (pub.year) formatted += ` (${pub.year})`;
          if (pub.url) formatted += ` - ${pub.url}`;
        }
        formatted += `\n`;
      });
    }
    
    // Projects
    if (jsonData.projects?.length > 0) {
      formatted += `\n## Projects\n`;
      jsonData.projects.forEach((proj: any) => {
        formatted += `\n### ${proj.name || proj.title}\n`;
        if (proj.description) formatted += `${formatHTMLContent(proj.description)}\n`;
        if (proj.technologies) formatted += `Technologies: ${Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies}\n`;
        if (proj.url) formatted += `URL: ${proj.url}\n`;
      });
    }
    
    // Awards & Honors
    if (jsonData.awards?.length > 0) {
      formatted += `\n## Awards & Honors\n`;
      jsonData.awards.forEach((award: any) => {
        formatted += `- ${typeof award === 'string' ? award : `${award.name || award.title} (${award.year || ''})`}\n`;
      });
    }
    
    // Languages
    if (jsonData.languages?.length > 0) {
      formatted += `\n## Languages\n`;
      jsonData.languages.forEach((lang: any) => {
        formatted += `- ${typeof lang === 'string' ? lang : `${lang.language}: ${lang.proficiency || ''}`}\n`;
      });
    }
    
    return formatted;
  };

  const fetchResume = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Fetching resume for user:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('resume_text')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Profile fetch result:', { hasProfile: !!profile, hasResumeText: !!profile?.resume_text, error: profileError });

      if (profile?.resume_text) {
        try {
          // Parse JSON if stored as JSON
          console.log('Attempting to parse resume_text as JSON');
          const parsedData = JSON.parse(profile.resume_text);
          console.log('Successfully parsed JSON, formatting...');
          const formattedText = formatResumeFromJSON(parsedData);
          console.log('Formatted text length:', formattedText.length);
          setResumeText(formattedText);
          setOriginalResume(formattedText);
        } catch (parseError) {
          // If not JSON, use as-is
          console.log('Failed to parse as JSON, using raw text:', parseError);
          setResumeText(profile.resume_text);
          setOriginalResume(profile.resume_text);
        }
      } else {
        console.log('No resume_text in profile');
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
    // Ensure we have resume text
    let textToUse = resumeText;
    if (!textToUse) {
      await fetchResume();
      // Wait for state to update - use a ref or refetch
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('resume_text')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (!profile?.resume_text) {
        toast({
          title: "No Resume Found",
          description: "Please upload your resume in your profile first.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const parsedData = JSON.parse(profile.resume_text);
        textToUse = formatResumeFromJSON(parsedData);
      } catch {
        textToUse = profile.resume_text;
      }
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('tailor-resume', {
        body: {
          resumeText: textToUse,
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

  // Fetch resume when dialog opens
  useEffect(() => {
    if (open && !resumeText && !loading) {
      fetchResume();
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAnalysis("");
      setOriginalResume("");
      setTailoredResume("");
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

  const handleCopyTailored = () => {
    navigator.clipboard.writeText(tailoredResume);
    setCopiedTailored(true);
    toast({
      title: "Copied",
      description: "Tailored resume copied to clipboard",
    });
    setTimeout(() => setCopiedTailored(false), 2000);
  };

  const handleGenerateTailored = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('apply-tailored-suggestions', {
        body: {
          originalResume: originalResume,
          suggestions: analysis,
          position: application.position,
          company: application.company,
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

      setTailoredResume(data.tailoredResume);
      toast({
        title: "Success",
        description: "Tailored resume generated successfully!",
      });
    } catch (error) {
      console.error('Error generating tailored resume:', error);
      toast({
        title: "Error",
        description: "Failed to generate tailored resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTailoredResume = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save resumes",
          variant: "destructive",
        });
        return;
      }

      const versionName = `${application.position} at ${application.company} - ${new Date().toLocaleDateString()}`;

      const { error } = await supabase
        .from('tailored_resumes')
        .insert({
          user_id: user.id,
          application_id: application.id,
          version_name: versionName,
          resume_text: tailoredResume,
          position: application.position,
          company: application.company,
        });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Your tailored resume has been saved to your profile.",
      });
    } catch (error) {
      console.error('Error saving tailored resume:', error);
      toast({
        title: "Error",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Your Resume
              </h3>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : resumeText ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{resumeText}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No resume found. Please upload your resume in your profile first.
                </p>
              )}
            </Card>
          )}

          {analysis && !tailoredResume && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-6 bg-muted/30">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Your Original Resume</h3>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert max-h-[500px] overflow-y-auto">
                  <ReactMarkdown>{originalResume}</ReactMarkdown>
                </div>
              </Card>
              
              <Card className="p-6 bg-background border-primary/20">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    AI Tailoring Suggestions
                  </h3>
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
                <div className="prose prose-sm max-w-none dark:prose-invert max-h-[500px] overflow-y-auto">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              </Card>
            </div>
          )}

          {tailoredResume && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-6 bg-muted/30">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Original Resume</h3>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert max-h-[500px] overflow-y-auto">
                  <ReactMarkdown>{originalResume}</ReactMarkdown>
                </div>
              </Card>
              
              <Card className="p-6 bg-primary/5 border-primary/30">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Tailored Resume
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTailored}
                    className="gap-2"
                  >
                    {copiedTailored ? (
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
                <div className="prose prose-sm max-w-none dark:prose-invert max-h-[500px] overflow-y-auto">
                  <ReactMarkdown>{tailoredResume}</ReactMarkdown>
                </div>
              </Card>
            </div>
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
            {analysis && !tailoredResume && (
              <>
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
                <Button
                  onClick={handleGenerateTailored}
                  disabled={generating}
                  className="gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Apply Suggestions
                    </>
                  )}
                </Button>
              </>
            )}
            {tailoredResume && (
              <>
                <Button
                  onClick={() => {
                    setTailoredResume("");
                    setAnalysis("");
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Start Over
                </Button>
                <Button
                  onClick={handleSaveTailoredResume}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Save to Profile
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
