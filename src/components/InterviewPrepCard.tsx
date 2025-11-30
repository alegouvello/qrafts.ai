import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, User, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FormattedNotes } from "@/components/FormattedNotes";

interface InterviewPrep {
  talkingPoints?: string[];
  commonGround?: string[];
  questionsToAsk?: string[];
  areasToEmphasize?: string[];
  potentialConcerns?: string[];
}

interface Interviewer {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  notes: string | null;
  extracted_data: Record<string, unknown> | null;
  interview_prep: InterviewPrep | null;
}

interface InterviewPrepCardProps {
  interviewer: Interviewer;
  onDelete: () => void;
  onPrepGenerated: () => void;
}

// Component to safely render HTML content
const RichText = ({ content }: { content: string }) => {
  return <span dangerouslySetInnerHTML={{ __html: content }} />;
};

export const InterviewPrepCard = ({ interviewer, onDelete, onPrepGenerated }: InterviewPrepCardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGeneratePrep = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-interview-prep", {
        body: { interviewerId: interviewer.id },
      });

      if (error) throw error;

      toast({
        title: t("toast.success"),
        description: "Interview prep generated successfully",
      });
      onPrepGenerated();
    } catch (error: any) {
      console.error("Error generating prep:", error);
      toast({
        title: t("toast.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("interviewers")
        .delete()
        .eq("id", interviewer.id);

      if (error) throw error;

      toast({
        title: t("toast.success"),
        description: "Interviewer deleted successfully",
      });
      onDelete();
    } catch (error: unknown) {
      console.error("Error deleting interviewer:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete interviewer";
      toast({
        title: t("toast.error"),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const prep = interviewer.interview_prep;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{interviewer.name}</CardTitle>
              <CardDescription>
                {interviewer.role && <span>{interviewer.role}</span>}
                {interviewer.role && interviewer.company && <span> • </span>}
                {interviewer.company && <span>{interviewer.company}</span>}
              </CardDescription>
              <div className="flex flex-wrap gap-2 mt-1">
                {interviewer.email && (
                  <a
                    href={`mailto:${interviewer.email}`}
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {interviewer.email}
                  </a>
                )}
                {interviewer.linkedin_url && (
                  <a
                    href={interviewer.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    LinkedIn Profile
                  </a>
                )}
              </div>
              {!isExpanded && (
                <div className="mt-2 flex gap-2">
                  {interviewer.notes && (
                    <Badge variant="secondary" className="text-xs">Has Notes</Badge>
                  )}
                  {prep && (
                    <Badge variant="secondary" className="text-xs">Prep Ready</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Interviewer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete {interviewer.name} and all associated interview preparation data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6" onClick={(e) => e.stopPropagation()}>
          {interviewer.notes && (
            <div className="bg-muted/30 rounded-lg p-4" style={{ border: 'none' }}>
              <FormattedNotes notes={interviewer.notes} />
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Interview Preparation</h3>
            </div>

            {!prep ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Generate AI-powered interview preparation based on this interviewer's background and your resume
                </p>
                <Button onClick={handleGeneratePrep} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Interview Prep
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {prep.talkingPoints && prep.talkingPoints.length > 0 && (
                  <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-xl p-6 border border-primary/10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-1 bg-primary rounded-full" />
                      <h4 className="font-bold text-base text-foreground">Key Talking Points</h4>
                    </div>
                    <ul className="space-y-4">
                      {prep.talkingPoints.map((point: string, idx: number) => (
                        <li key={idx} className="flex gap-3 items-start group">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0 group-hover:scale-125 transition-transform" />
                          <p className="text-base leading-relaxed text-foreground/90">
                            <RichText content={point} />
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prep.commonGround && prep.commonGround.length > 0 && (
                  <div className="bg-gradient-to-br from-accent/5 via-accent/3 to-transparent rounded-xl p-6 border border-accent/10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-1 bg-accent rounded-full" />
                      <h4 className="font-bold text-base text-foreground">Common Ground</h4>
                    </div>
                    <ul className="space-y-4">
                      {prep.commonGround.map((point: string, idx: number) => (
                        <li key={idx} className="flex gap-3 items-start group">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-accent flex-shrink-0 group-hover:scale-125 transition-transform" />
                          <p className="text-base leading-relaxed text-foreground/90">
                            <RichText content={point} />
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prep.questionsToAsk && prep.questionsToAsk.length > 0 && (
                  <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-xl p-6 border border-primary/10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-1 bg-primary rounded-full" />
                      <h4 className="font-bold text-base text-foreground">Questions to Ask</h4>
                    </div>
                    <ul className="space-y-4">
                      {prep.questionsToAsk.map((question: string, idx: number) => (
                        <li key={idx} className="flex gap-3 items-start group">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0 group-hover:scale-125 transition-transform" />
                          <p className="text-base leading-relaxed text-foreground/90">
                            <RichText content={question} />
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prep.areasToEmphasize && prep.areasToEmphasize.length > 0 && (
                  <div className="bg-gradient-to-br from-success/5 via-success/3 to-transparent rounded-xl p-6 border border-success/10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-1 bg-success rounded-full" />
                      <h4 className="font-bold text-base text-foreground">Areas to Emphasize</h4>
                    </div>
                    <ul className="space-y-4">
                      {prep.areasToEmphasize.map((area: string, idx: number) => (
                        <li key={idx} className="flex gap-3 items-start group">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-success flex-shrink-0 group-hover:scale-125 transition-transform" />
                          <p className="text-base leading-relaxed text-foreground/90">
                            <RichText content={area} />
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prep.potentialConcerns && prep.potentialConcerns.length > 0 && (
                  <div className="bg-gradient-to-br from-warning/5 via-warning/3 to-transparent rounded-xl p-6 border border-warning/10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-1 bg-warning rounded-full" />
                      <h4 className="font-bold text-base text-foreground">Potential Concerns</h4>
                    </div>
                    <ul className="space-y-4">
                      {prep.potentialConcerns.map((concern: string, idx: number) => (
                        <li key={idx} className="flex gap-3 items-start group">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-warning flex-shrink-0 group-hover:scale-125 transition-transform" />
                          <p className="text-base leading-relaxed text-foreground/90">
                            <RichText content={concern} />
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={handleGeneratePrep} variant="outline" size="sm" disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Regenerate Prep
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};