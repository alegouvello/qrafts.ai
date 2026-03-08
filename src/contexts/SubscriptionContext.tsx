import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const FREE_APPLICATION_LIMIT = 10;

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  is_trialing?: boolean;
  trial_end?: string | null;
}

interface SubscriptionContextValue {
  subscriptionStatus: SubscriptionStatus;
  checking: boolean;
  checkSubscription: () => Promise<void>;
  handleUpgrade: () => Promise<void>;
  handleManageSubscription: () => Promise<void>;
  // Limits
  applicationCount: number;
  applicationLimit: number;
  canAddApplication: boolean;
  canUseAI: boolean;
  remainingApplications: number;
  limitsLoading: boolean;
  refreshLimits: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    product_id: null,
    subscription_end: null,
    is_trialing: false,
  });
  const [checking, setChecking] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [limitsLoading, setLimitsLoading] = useState(true);
  const { toast } = useToast();

  const checkSubscription = useCallback(async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setChecking(false);
        setLimitsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        console.error('Error checking subscription:', error);
        toast({
          title: "Subscription Check Failed",
          description: "Unable to verify your subscription status.",
          variant: "destructive",
          action: <Button onClick={checkSubscription} size="sm" variant="outline">Retry</Button>,
        });
      } else if (data) {
        setSubscriptionStatus(data);
      }

      // Count applications in parallel
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true });
      setApplicationCount(count || 0);
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Connection Error",
        description: "Failed to check subscription status.",
        variant: "destructive",
        action: <Button onClick={checkSubscription} size="sm" variant="outline">Retry</Button>,
      });
    } finally {
      setChecking(false);
      setLimitsLoading(false);
    }
  }, [toast]);

  const handleUpgrade = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) {
        toast({ title: "Error", description: "Failed to create checkout session", variant: "destructive" });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      toast({ title: "Error", description: "Failed to initiate checkout", variant: "destructive" });
    }
  }, [toast]);

  const handleManageSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) {
        toast({ title: "Error", description: "Failed to open subscription management", variant: "destructive" });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      toast({ title: "Error", description: "Failed to open portal", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const hasAccess = subscriptionStatus.subscribed || subscriptionStatus.is_trialing || false;
  const applicationLimit = hasAccess ? Infinity : FREE_APPLICATION_LIMIT;
  const remainingApplications = hasAccess ? Infinity : Math.max(0, FREE_APPLICATION_LIMIT - applicationCount);
  const canAddApplication = hasAccess || applicationCount < FREE_APPLICATION_LIMIT;
  const canUseAI = hasAccess;

  return (
    <SubscriptionContext.Provider value={{
      subscriptionStatus,
      checking,
      checkSubscription,
      handleUpgrade,
      handleManageSubscription,
      applicationCount,
      applicationLimit,
      canAddApplication,
      canUseAI,
      remainingApplications,
      limitsLoading,
      refreshLimits: checkSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
};

export const FREE_APP_LIMIT = FREE_APPLICATION_LIMIT;
