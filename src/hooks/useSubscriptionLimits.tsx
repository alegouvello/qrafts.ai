import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const FREE_APPLICATION_LIMIT = 10;

interface SubscriptionLimits {
  isSubscribed: boolean;
  isTrialing: boolean;
  applicationCount: number;
  applicationLimit: number;
  canAddApplication: boolean;
  canUseAI: boolean;
  remainingApplications: number;
  loading: boolean;
}

export const useSubscriptionLimits = () => {
  const [limits, setLimits] = useState<SubscriptionLimits>({
    isSubscribed: false,
    isTrialing: false,
    applicationCount: 0,
    applicationLimit: FREE_APPLICATION_LIMIT,
    canAddApplication: true,
    canUseAI: false,
    remainingApplications: FREE_APPLICATION_LIMIT,
    loading: true,
  });

  const checkLimits = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLimits(prev => ({ ...prev, loading: false }));
        return;
      }

      // Check subscription status
      const { data: subData } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const isSubscribed = subData?.subscribed || false;
      const isTrialing = subData?.is_trialing || false;
      const hasAccess = isSubscribed || isTrialing;

      // Count user's applications
      const { count, error } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true });

      const applicationCount = count || 0;
      const applicationLimit = hasAccess ? Infinity : FREE_APPLICATION_LIMIT;
      const remainingApplications = hasAccess ? Infinity : Math.max(0, FREE_APPLICATION_LIMIT - applicationCount);
      const canAddApplication = hasAccess || applicationCount < FREE_APPLICATION_LIMIT;
      const canUseAI = hasAccess;

      setLimits({
        isSubscribed,
        isTrialing,
        applicationCount,
        applicationLimit,
        canAddApplication,
        canUseAI,
        remainingApplications,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking subscription limits:", error);
      setLimits(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkLimits();
  }, [checkLimits]);

  return { ...limits, refreshLimits: checkLimits };
};

export const FREE_APP_LIMIT = FREE_APPLICATION_LIMIT;
