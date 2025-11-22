import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, CheckCircle2, XCircle, Lightbulb, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RoleFitAnalysisProps {
  company: string;
  position: string;
  roleDetails: any;
  resumeText: string | null;
  subscribed: boolean;
  onUpgrade: () => void;
}

interface Analysis {
  confidenceScore: number;
  overallFit: string;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
}

export const RoleFitAnalysis = ({ company, position, roleDetails, resumeText, subscribed, onUpgrade }: RoleFitAnalysisProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const analyzeRoleFit = async () => {
    // Check subscription status
    if (!subscribed) {
      toast({
        title: "Pro Feature",
        description: "AI role fit analysis is available with Qraft Pro. Upgrade to get detailed compatibility insights.",
        variant: "destructive",
        action: (
          <Button onClick={onUpgrade} size="sm" className="ml-auto">
            Upgrade to Pro
          </Button>
        ),
      });
      return;
    }

    if (!resumeText) {
      toast({
        title: "No resume found",
        description: "Please upload your resume in the Profile section first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to use this feature",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-role-fit', {
        body: { 
          roleDetails: {
            company,
            position,
            requirements: roleDetails?.requirements,
            responsibilities: roleDetails?.responsibilities,
          },
          resumeText 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      setAnalysis(data);
      toast({
        title: "Analysis complete",
        description: "Your role fit analysis is ready",
      });
    } catch (error: any) {
      console.error('Error analyzing role fit:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze role fit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return "Strong Match";
    if (score >= 50) return "Moderate Match";
    return "Weak Match";
  };

  return (
    <div className="space-y-4">
      {!analysis ? (
        <div className="flex items-center justify-end">
          <Button 
            onClick={analyzeRoleFit} 
            disabled={loading || !resumeText}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI Role Fit
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Match Score</h3>
                <Badge className={getScoreColor(analysis.confidenceScore)}>
                  {getScoreLabel(analysis.confidenceScore)}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className={`font-semibold ${getScoreColor(analysis.confidenceScore)}`}>
                    {analysis.confidenceScore}%
                  </span>
                </div>
                <Progress value={analysis.confidenceScore} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">{analysis.overallFit}</p>
              <Button 
                onClick={analyzeRoleFit} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Re-analyzing...
                  </>
                ) : (
                  'Re-analyze'
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Your Strengths</h3>
              </div>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {analysis.gaps.length > 0 && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold">Gaps to Address</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.gaps.map((gap, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-orange-600 mt-0.5">•</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Resume Tailoring Suggestions</h3>
              </div>
              <ul className="space-y-3">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <span className="text-primary font-semibold mt-0.5">{index + 1}.</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
