import { useEffect, useState } from "react";
import { Users, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export const SocialProof = () => {
  const { t } = useTranslation();
  const [totalUsers, setTotalUsers] = useState(0);
  const [recentUsers, setRecentUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total users count
        const { count: total } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });

        // Get recent users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: recent } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());

        setTotalUsers(total || 0);
        setRecentUsers(recent || 0);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Set up real-time subscription for new users
    const channel = supabase
      .channel('user_profiles_count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_profiles'
        },
        () => {
          setTotalUsers(prev => prev + 1);
          setRecentUsers(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
      {/* Total Users */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Users className="h-3 w-3 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground">{t('landing.socialProof.totalUsers', { defaultValue: 'Active Users' })}</span>
          <span className="text-xs font-bold text-foreground">{totalUsers}+</span>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-sm">
        <div className="relative">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <div className="absolute inset-0 h-2 w-2 rounded-full bg-accent animate-ping" />
        </div>
        <span className="text-[10px] font-medium text-accent">{t('landing.socialProof.liveNow', { defaultValue: 'Live Now' })}</span>
      </div>
    </div>
  );
};
