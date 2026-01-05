import { Check, Loader2, AlertCircle, Upload, FileSearch, Eye, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type ParseStep = 'uploading' | 'extracting' | 'ocr' | 'structuring' | 'complete' | 'error';

interface ParseProgressStepperProps {
  currentStep: ParseStep;
  errorMessage?: string;
  className?: string;
}

const steps = [
  { id: 'uploading', label: 'Uploading', icon: Upload },
  { id: 'extracting', label: 'Extracting text', icon: FileSearch },
  { id: 'ocr', label: 'OCR (if needed)', icon: Eye },
  { id: 'structuring', label: 'Structuring', icon: FileText },
] as const;

const stepOrder: Record<ParseStep, number> = {
  uploading: 0,
  extracting: 1,
  ocr: 2,
  structuring: 3,
  complete: 4,
  error: -1,
};

export const ParseProgressStepper = ({
  currentStep,
  errorMessage,
  className,
}: ParseProgressStepperProps) => {
  const currentIndex = stepOrder[currentStep];
  const isError = currentStep === 'error';
  const isComplete = currentStep === 'complete';

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentIndex === index && !isError && !isComplete;
          const isCompleted = (currentIndex > index) || isComplete;
          const isPending = currentIndex < index && !isError;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors duration-300",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    isActive && "border-primary bg-primary/10 text-primary",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isPending && "border-border bg-background text-muted-foreground",
                    isError && currentIndex === index && "border-destructive bg-destructive/10 text-destructive"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isError && currentIndex === index ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors duration-300",
                      currentIndex > index ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center",
                  isActive && "text-primary",
                  isCompleted && "text-primary",
                  isPending && "text-muted-foreground",
                  isError && currentIndex === index && "text-destructive"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {isError && errorMessage && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">Parsing Failed</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
          <div className="border-t border-destructive/20 pt-3">
            <p className="text-xs font-medium text-foreground mb-2">Next steps:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Try a different file format (Word documents work best)</li>
              <li>• If your PDF is scanned, ensure it's clear and under 6MB</li>
              <li>• Copy and paste your resume text directly</li>
              <li>• Contact support if the issue persists</li>
            </ul>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-primary">Resume parsed successfully!</p>
          </div>
        </div>
      )}
    </div>
  );
};
