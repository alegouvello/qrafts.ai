import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowRight } from "lucide-react";

interface NaturalToneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalAnswer: string;
  naturalAnswer: string;
  onApply: () => void;
}

export const NaturalToneDialog = ({
  open,
  onOpenChange,
  originalAnswer,
  naturalAnswer,
  onApply,
}: NaturalToneDialogProps) => {
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    setApplied(true);
    onApply();
    setTimeout(() => {
      onOpenChange(false);
      setApplied(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Natural Tone Preview
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Compare your original answer with the more natural, conversational version
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Original Answer */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Original Answer</h3>
              <Badge variant="outline" className="text-xs">
                Before
              </Badge>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {originalAnswer}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {originalAnswer.length} characters
            </div>
          </Card>

          {/* Arrow indicator for desktop */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-primary text-primary-foreground rounded-full p-2">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Natural Answer */}
          <Card className="p-4 space-y-3 border-primary/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Natural Version</h3>
              <Badge className="text-xs">
                After
              </Badge>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {naturalAnswer}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {naturalAnswer.length} characters
            </div>
          </Card>
        </div>

        {/* Key Changes */}
        <Card className="p-4 bg-muted/30 mt-4">
          <h3 className="font-semibold text-sm mb-3">What Changed:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Removed corporate buzzwords and formal language</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Made the tone more conversational and authentic</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Simplified sentence structure for natural flow</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Maintained all key information and experiences</span>
            </li>
          </ul>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end mt-6">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Keep Original
          </Button>
          <Button
            onClick={handleApply}
            disabled={applied}
          >
            {applied ? "Applied!" : "Apply Natural Version"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
