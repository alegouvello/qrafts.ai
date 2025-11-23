import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Award, ArrowRight, Sparkles } from "lucide-react";

interface ResumeOrderAnalysis {
  experienceLevel: string;
  industry: string;
  recommendedOrder: string[];
  reasoning: string;
  keyInsights: string[];
}

interface ResumeOrderAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: ResumeOrderAnalysis | null;
  currentOrder: string[];
  onApplyOrder: (recommendedOrder: string[]) => void;
  isApplying?: boolean;
}

const sectionLabels: Record<string, string> = {
  summary: "Professional Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  publications: "Publications",
  projects: "Projects",
  awards: "Awards & Honors",
  languages: "Languages",
  volunteer_work: "Volunteer Work",
  interests: "Interests",
  additional_skills: "Additional Skills"
};

export function ResumeOrderAnalysisDialog({
  open,
  onOpenChange,
  analysis,
  currentOrder,
  onApplyOrder,
  isApplying = false
}: ResumeOrderAnalysisDialogProps) {
  if (!analysis) return null;

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      "entry-level": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "mid-level": "bg-green-500/10 text-green-500 border-green-500/20",
      "senior": "bg-purple-500/10 text-purple-500 border-purple-500/20",
      "executive": "bg-orange-500/10 text-orange-500 border-orange-500/20",
      "academic": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
    };
    return colors[level] || "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl">Resume Order Analysis</DialogTitle>
          </div>
          <DialogDescription>
            AI-powered recommendations based on your experience level and industry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Summary */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge className={`${getLevelColor(analysis.experienceLevel)} px-4 py-1.5 text-sm font-medium`}>
                  {analysis.experienceLevel.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Badge>
                <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium">
                  {analysis.industry}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.reasoning}
              </p>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Key Insights</h3>
            </div>
            <div className="space-y-2">
              {analysis.keyInsights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <Award className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground/80">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section Order Comparison */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Recommended Section Order</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Current Order */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Current Order
                </p>
                <div className="space-y-2">
                  {currentOrder.map((section, index) => (
                    <div
                      key={section}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm text-foreground/70">
                        {sectionLabels[section] || section}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Order */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recommended Order
                </p>
                <div className="space-y-2">
                  {analysis.recommendedOrder.map((section, index) => {
                    const currentIndex = currentOrder.indexOf(section);
                    const hasChanged = currentIndex !== index;
                    
                    return (
                      <div
                        key={section}
                        className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                          hasChanged 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'bg-muted/30'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          hasChanged 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          {index + 1}
                        </span>
                        <span className={`text-sm ${
                          hasChanged 
                            ? 'font-medium text-foreground' 
                            : 'text-foreground/70'
                        }`}>
                          {sectionLabels[section] || section}
                        </span>
                        {hasChanged && (
                          <ArrowRight className="h-3 w-3 text-primary ml-auto" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isApplying}
            >
              Close
            </Button>
            <Button
              onClick={() => onApplyOrder(analysis.recommendedOrder)}
              className="flex-1 gap-2"
              disabled={isApplying}
            >
              <Sparkles className="h-4 w-4" />
              {isApplying ? "Applying..." : "Apply Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}