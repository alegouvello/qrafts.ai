import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Linkedin, Briefcase, Bell, BellOff, Loader2 } from "lucide-react";

interface CompanyHeroProps {
  decodedCompany: string;
  companyDomain: string;
  companyProfileData: any;
  metricsTotal: number;
  communityTotal?: number;
  isWatching: boolean;
  togglingWatch: boolean;
  onToggleWatch: () => void;
}

export const CompanyHero = ({
  decodedCompany,
  companyDomain,
  companyProfileData,
  metricsTotal,
  communityTotal,
  isWatching,
  togglingWatch,
  onToggleWatch,
}: CompanyHeroProps) => {
  const [logoError, setLogoError] = useState(false);
  const [logoFallback, setLogoFallback] = useState(false);

  const getCompanyLogo = () => `https://logo.clearbit.com/${companyDomain}`;

  return (
    <div className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 py-5 max-w-7xl">
        <div className="flex items-center gap-5">
          {!logoError ? (
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-background flex items-center justify-center border border-border/50 shadow-md shrink-0">
              <img
                src={logoFallback ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=256` : getCompanyLogo()}
                alt={decodedCompany}
                className="w-full h-full object-contain p-2"
                onError={() => { if (!logoFallback) setLogoFallback(true); else setLogoError(true); }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border/50 shadow-md shrink-0">
              <span className="text-xl font-bold text-primary">{decodedCompany.charAt(0).toUpperCase()}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{decodedCompany}</h1>
              {companyProfileData?.industry && (
                <Badge variant="secondary" className="text-[11px]">{companyProfileData.industry}</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {metricsTotal} application{metricsTotal !== 1 ? 's' : ''} tracked
                {communityTotal != null && communityTotal > metricsTotal && (
                  <> · {communityTotal} community</>
                )}
              </span>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <a href={companyProfileData?.website_url || `https://${companyDomain}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                  <Globe className="h-3 w-3" /> Website
                </a>
                {companyProfileData?.linkedin_url && (
                  <>
                    <span className="text-border">·</span>
                    <a href={companyProfileData.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                      <Linkedin className="h-3 w-3" /> LinkedIn
                    </a>
                  </>
                )}
                {companyProfileData?.careers_url && (
                  <>
                    <span className="text-border">·</span>
                    <a href={companyProfileData.careers_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                      <Briefcase className="h-3 w-3" /> Careers
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button
            variant={isWatching ? "default" : "outline"}
            size="sm"
            className="shrink-0 h-8 text-xs gap-1.5"
            onClick={onToggleWatch}
            disabled={togglingWatch}
          >
            {togglingWatch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isWatching ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {isWatching ? "Watching" : "Watch"}
          </Button>
        </div>
      </div>
    </div>
  );
};
