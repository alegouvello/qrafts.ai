import { Button } from "@/components/ui/button";
import { Crown, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpgradePromptProps {
  type: "application-limit" | "ai-feature";
  remainingApplications?: number;
  featureName?: string;
  compact?: boolean;
}

export const UpgradePrompt = ({ 
  type, 
  remainingApplications = 0, 
  featureName = "AI features",
  compact = false
}: UpgradePromptProps) => {
  const { toast } = useToast();

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) {
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate checkout",
        variant: "destructive",
      });
    }
  };

  if (type === "application-limit") {
    if (compact) {
      return (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Lock className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400">
            {remainingApplications > 0 
              ? `${remainingApplications} applications remaining on free plan`
              : "Application limit reached"}
          </span>
          <Button 
            size="sm" 
            onClick={handleUpgrade}
            className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Crown className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl text-center">
        <div className="p-3 bg-amber-500/20 rounded-full">
          <Lock className="h-8 w-8 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {remainingApplications > 0 
              ? `${remainingApplications} Applications Remaining`
              : "Application Limit Reached"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {remainingApplications > 0 
              ? "Free plan is limited to 10 applications. Upgrade to Pro for unlimited tracking."
              : "You've reached the 10 application limit on the free plan. Upgrade to Pro for unlimited applications."}
          </p>
        </div>
        <Button 
          onClick={handleUpgrade}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro - $5/month
        </Button>
      </div>
    );
  }

  // AI feature prompt
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          {featureName} requires Pro
        </span>
        <Button 
          size="sm" 
          onClick={handleUpgrade}
          className="ml-auto"
        >
          <Crown className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl text-center">
      <div className="p-3 bg-primary/20 rounded-full">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Pro Feature
        </h3>
        <p className="text-sm text-muted-foreground">
          {featureName} is only available on the Pro plan. Upgrade to unlock all AI-powered features.
        </p>
      </div>
      <Button onClick={handleUpgrade}>
        <Crown className="h-4 w-4 mr-2" />
        Upgrade to Pro - $5/month
      </Button>
    </div>
  );
};
