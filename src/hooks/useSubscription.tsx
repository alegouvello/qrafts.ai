import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  is_trialing?: boolean;
  trial_end?: string | null;
}

export const useSubscription = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    product_id: null,
    subscription_end: null,
  });
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const checkSubscription = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session, skipping subscription check');
        setChecking(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('Error checking subscription:', error);
        toast({
          title: "Subscription Check Failed",
          description: "Unable to verify your subscription status. Some features may be unavailable.",
          variant: "destructive",
          action: (
            <Button onClick={checkSubscription} size="sm" variant="outline">
              Retry
            </Button>
          ),
        });
      } else if (data) {
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Connection Error",
        description: "Failed to check subscription status. Please try again later.",
        variant: "destructive",
        action: (
          <Button onClick={checkSubscription} size="sm" variant="outline">
            Retry
          </Button>
        ),
      });
    } finally {
      setChecking(false);
    }
  };

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

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) {
        toast({
          title: "Error",
          description: "Failed to open subscription management",
          variant: "destructive",
        });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open portal",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  return {
    subscriptionStatus,
    checking,
    checkSubscription,
    handleUpgrade,
    handleManageSubscription,
  };
};
