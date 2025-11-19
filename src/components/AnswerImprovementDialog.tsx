import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, Sparkles } from "lucide-react";

interface AnswerImprovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strengths: string;
  improvements: string;
  improvedVersion: string;
  onApply: () => void;
}

export const AnswerImprovementDialog = ({
  open,
  onOpenChange,
  strengths,
  improvements,
  improvedVersion,
  onApply,
}: AnswerImprovementDialogProps) => {
  const parseListItems = (text: string) => {
    return text
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[•\-\*]\s*/, '').trim());
  };

  const strengthsList = parseListItems(strengths);
  const improvementsList = parseListItems(improvements);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Answer Improvement
          </DialogTitle>
          <DialogDescription>
            Review the feedback and apply the improved version to your answer
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Strengths */}
            {strengthsList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <h3 className="font-semibold text-lg">Strengths</h3>
                </div>
                <ul className="space-y-2 pl-7">
                  {strengthsList.map((strength, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {improvementsList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <h3 className="font-semibold text-lg">Areas for Improvement</h3>
                </div>
                <ul className="space-y-2 pl-7">
                  {improvementsList.map((improvement, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improved Version */}
            {improvedVersion && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Improved Version</h3>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {improvedVersion}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Original
          </Button>
          <Button onClick={onApply}>
            Apply Improved Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
