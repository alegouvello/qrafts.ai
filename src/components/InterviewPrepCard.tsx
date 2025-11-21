import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, User, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Interviewer {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  extracted_data: any;
  interview_prep: any;
}

interface InterviewPrepCardProps {
  interviewer: Interviewer;
  onDelete: () => void;
  onPrepGenerated: () => void;
}

export const InterviewPrepCard = ({ interviewer, onDelete, onPrepGenerated }: InterviewPrepCardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

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
    } catch (error: any) {
      console.error("Error deleting interviewer:", error);
      toast({
        title: t("toast.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const prep = interviewer.interview_prep;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
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
                  >
                    LinkedIn Profile
                  </a>
                )}
              </div>
            </div>
          </div>
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
      </CardHeader>
      <CardContent>
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
          <div className="space-y-6">
            {prep.talkingPoints && prep.talkingPoints.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Key Talking Points</Badge>
                </h4>
                <ul className="space-y-2">
                  {prep.talkingPoints.map((point: string, idx: number) => (
                    <li key={idx} className="text-sm pl-4 border-l-2 border-primary/30">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prep.commonGround && prep.commonGround.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Common Ground</Badge>
                </h4>
                <ul className="space-y-2">
                  {prep.commonGround.map((point: string, idx: number) => (
                    <li key={idx} className="text-sm pl-4 border-l-2 border-primary/30">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prep.questionsToAsk && prep.questionsToAsk.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Questions to Ask</Badge>
                </h4>
                <ul className="space-y-2">
                  {prep.questionsToAsk.map((question: string, idx: number) => (
                    <li key={idx} className="text-sm pl-4 border-l-2 border-primary/30">
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prep.areasToEmphasize && prep.areasToEmphasize.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Areas to Emphasize</Badge>
                </h4>
                <ul className="space-y-2">
                  {prep.areasToEmphasize.map((area: string, idx: number) => (
                    <li key={idx} className="text-sm pl-4 border-l-2 border-primary/30">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prep.potentialConcerns && prep.potentialConcerns.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Potential Concerns</Badge>
                </h4>
                <ul className="space-y-2">
                  {prep.potentialConcerns.map((concern: string, idx: number) => (
                    <li key={idx} className="text-sm pl-4 border-l-2 border-destructive/30">
                      {concern}
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
      </CardContent>
    </Card>
  );
};