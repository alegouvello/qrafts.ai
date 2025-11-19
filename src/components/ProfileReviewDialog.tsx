import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CheckCircle2, AlertCircle, Lightbulb, TrendingUp, Loader2 } from "lucide-react";

interface ProfileReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Review {
  overall_score: number;
  strengths: string[];
  improvements: Array<{
    section: string;
    issue: string;
    suggestion: string;
  }>;
  quick_wins: string[];
}

export function ProfileReviewDialog({ open, onOpenChange }: ProfileReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<Review | null>(null);

  useEffect(() => {
    if (open && !review) {
      fetchReview();
    }
  }, [open]);

  const fetchReview = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('review-profile', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.success && data?.review) {
        setReview(data.review);
      }
    } catch (error) {
      console.error('Error fetching review:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    if (score >= 4) return "Fair";
    return "Needs Work";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Profile Review
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing your profile...</p>
          </div>
        ) : review ? (
          <div className="space-y-6 py-4">
            {/* Overall Score */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                    <p className="text-4xl font-bold">{review.overall_score}/10</p>
                    <p className={`text-sm font-medium mt-1 ${getScoreColor(review.overall_score)}`}>
                      {getScoreLabel(review.overall_score)}
                    </p>
                  </div>
                  <TrendingUp className={`h-12 w-12 ${getScoreColor(review.overall_score)}`} />
                </div>
              </CardContent>
            </Card>

            {/* Strengths */}
            {review.strengths.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-lg">Strengths</h3>
                </div>
                <div className="space-y-2">
                  {review.strengths.map((strength, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
                      <CardContent className="p-4">
                        <p className="text-sm">{strength}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Wins */}
            {review.quick_wins.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-lg">Quick Wins</h3>
                </div>
                <div className="space-y-2">
                  {review.quick_wins.map((win, index) => (
                    <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20">
                      <CardContent className="p-4">
                        <p className="text-sm">{win}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {review.improvements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">Suggestions for Improvement</h3>
                </div>
                <div className="space-y-3">
                  {review.improvements.map((improvement, index) => (
                    <Card key={index} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded">
                            {improvement.section}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{improvement.issue}</p>
                        <p className="text-sm text-muted-foreground">{improvement.suggestion}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Unable to load review. Please try again.</p>
            <Button onClick={fetchReview} className="mt-4">
              Retry
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {review && (
            <Button onClick={() => { setReview(null); fetchReview(); }}>
              Refresh Review
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
