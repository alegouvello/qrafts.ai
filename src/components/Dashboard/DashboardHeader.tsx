import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Plus, BarChart3, Crown, Settings, LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import qraftLogo from "@/assets/qrafts-logo.png";

interface SubscriptionStatus {
  subscribed: boolean;
  is_trialing?: boolean;
}

interface DashboardHeaderProps {
  userProfile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  subscriptionStatus: SubscriptionStatus;
  applicationsCount: number;
  onAddApplication: () => void;
  onSignOut: () => void;
}

export const DashboardHeader = ({
  userProfile,
  subscriptionStatus,
  applicationsCount,
  onAddApplication,
  onSignOut,
}: DashboardHeaderProps) => {
  return (
    <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Link to="/">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full flex-shrink-0"
                aria-label="Go back to home"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <img 
              src={qraftLogo} 
              alt="Qrafts logo" 
              className="h-14 sm:h-20 transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] dark:invert" 
            />
          </div>
          
          <nav className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto" role="navigation" aria-label="Main navigation">
            <Button 
              onClick={onAddApplication}
              className="flex-1 sm:flex-none rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all text-sm sm:flex hidden"
              aria-label="Add new application"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add
            </Button>
            
            <Link to="/profile" className="hidden sm:block">
              <Button 
                variant="ghost" 
                className="rounded-full hover:bg-primary/5 transition-all text-sm flex items-center justify-center gap-2"
                aria-label={`View profile${userProfile?.full_name ? ` for ${userProfile.full_name}` : ''}`}
              >
                {userProfile?.avatar_url ? (
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage 
                      src={userProfile.avatar_url} 
                      alt={userProfile.full_name || "Profile"}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-base font-semibold">
                      {userProfile.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  "Profile"
                )}
              </Button>
            </Link>
            
            <Link to="/comparison" className="hidden sm:block">
              <Button 
                variant="ghost" 
                className="rounded-full hover:bg-accent/5 transition-all text-sm"
                aria-label="View comparison and statistics"
              >
                <BarChart3 className="h-4 w-4 mr-2" aria-hidden="true" />
                Compare
              </Button>
            </Link>
            
            {subscriptionStatus.subscribed && (
              <Link to="/settings">
                <Button 
                  variant="ghost" 
                  className="rounded-full hover:bg-success/10 transition-all px-3 border border-success/20 bg-success/5"
                  size="sm"
                  aria-label="Pro subscription settings"
                >
                  <Crown className="h-3.5 w-3.5 mr-1.5 text-success" aria-hidden="true" />
                  <span className="text-xs font-medium text-success">Pro</span>
                  {subscriptionStatus.is_trialing && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary border border-primary/30">
                      Trial
                    </span>
                  )}
                </Button>
              </Link>
            )}
            
            <LanguageSwitcher />
            <ThemeToggle />
            
            <Link to="/settings" className="hidden sm:block">
              <Button 
                variant="ghost" 
                className="rounded-full hover:bg-primary/5 transition-all" 
                size="icon"
                aria-label="Open settings"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              onClick={onSignOut} 
              className="rounded-full hover:bg-destructive/5 transition-all hidden sm:flex" 
              size="icon"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};
