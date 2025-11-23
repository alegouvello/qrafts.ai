import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Target, Briefcase, TrendingUp, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
}

export const OnboardingDialog = ({ open, onComplete }: OnboardingDialogProps) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Sparkles,
      title: "Welcome to Qraft!",
      description: "Your AI-powered job application assistant. Let's get you started on your journey to landing your dream job.",
    },
    {
      icon: Briefcase,
      title: "Track Applications",
      description: "Add job applications by simply pasting the job posting URL. We'll automatically extract the details and questions.",
    },
    {
      icon: Target,
      title: "AI-Powered Answers",
      description: "Get intelligent suggestions for application questions based on your profile and the job requirements.",
    },
    {
      icon: TrendingUp,
      title: "Monitor Progress",
      description: "Track your application status, schedule interviews, and analyze your success rate across companies.",
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Mark onboarding as completed in user preferences
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          updated_at: new Date().toISOString(),
        });
    }
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleComplete()}>
      <DialogContent 
        className="sm:max-w-md"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        <div className="flex flex-col items-center text-center gap-6 py-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-primary/20">
              <Icon className="h-10 w-10 text-primary" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 id="onboarding-title" className="text-2xl font-bold">
              {currentStep.title}
            </h2>
            <p id="onboarding-description" className="text-muted-foreground">
              {currentStep.description}
            </p>
          </div>

          <div className="flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
                aria-label={`Step ${i + 1} ${i <= step ? "completed" : "pending"}`}
              />
            ))}
          </div>

          <div className="flex gap-3 w-full">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1"
            >
              {step < steps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>

          <button
            onClick={handleComplete}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
