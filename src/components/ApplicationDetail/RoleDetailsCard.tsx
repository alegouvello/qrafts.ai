import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RoleFitAnalysis, RoleFitAnalysisRef } from "@/components/RoleFitAnalysis";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { RefObject } from "react";

interface RoleSummary {
  location?: string;
  salary_range?: string;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
}

interface RoleDetailsCardProps {
  roleSummary: RoleSummary;
  company: string;
  position: string;
  roleDetailsOpen: boolean;
  onRoleDetailsOpenChange: (open: boolean) => void;
  roleFitRef: RefObject<RoleFitAnalysisRef>;
  resumeText: string | null;
  subscribed: boolean;
  onUpgrade: () => void;
  refreshingDescription: boolean;
  onRefreshJobDescription: () => void;
}

export const RoleDetailsCard = ({
  roleSummary,
  company,
  position,
  roleDetailsOpen,
  onRoleDetailsOpenChange,
  roleFitRef,
  resumeText,
  subscribed,
  onUpgrade,
  refreshingDescription,
  onRefreshJobDescription,
}: RoleDetailsCardProps) => {
  return (
    <>
      <Card className="p-6 bg-card/30 backdrop-blur-sm border-border/50">
        <Collapsible open={roleDetailsOpen} onOpenChange={onRoleDetailsOpenChange}>
          <div className="flex items-center justify-between mb-4">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:text-primary transition-colors">
                <h3 className="font-semibold text-lg">Role Details</h3>
                {roleDetailsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => roleFitRef.current?.analyzeRoleFit()}
                disabled={roleFitRef.current?.loading || !resumeText}
                variant="outline"
                size="sm"
              >
                {roleFitRef.current?.loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Role Fit
                  </>
                )}
              </Button>
              <Button
                onClick={onRefreshJobDescription}
                disabled={refreshingDescription}
                variant="outline"
                size="sm"
              >
                {refreshingDescription ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Refresh Description
                  </>
                )}
              </Button>
            </div>
          </div>
          <CollapsibleContent className="animate-accordion-down">
            <div className="grid gap-4">
              {(roleSummary.location || roleSummary.salary_range) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {roleSummary.location && (
                    <div>
                      <span className="text-sm text-muted-foreground">Location</span>
                      <p className="font-medium">{roleSummary.location}</p>
                    </div>
                  )}
                  {roleSummary.salary_range && (
                    <div>
                      <span className="text-sm text-muted-foreground">Salary Range</span>
                      <p className="font-medium">{roleSummary.salary_range}</p>
                    </div>
                  )}
                </div>
              )}
              {roleSummary.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Description</span>
                  <p className="text-sm mt-1 leading-relaxed">{roleSummary.description}</p>
                </div>
              )}
              {roleSummary.responsibilities && roleSummary.responsibilities.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Key Responsibilities</span>
                  <ul className="mt-2 space-y-1">
                    {roleSummary.responsibilities.map((item, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {roleSummary.requirements && roleSummary.requirements.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Requirements</span>
                  <ul className="mt-2 space-y-1">
                    {roleSummary.requirements.map((item, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {roleSummary.benefits && roleSummary.benefits.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Benefits</span>
                  <ul className="mt-2 space-y-1">
                    {roleSummary.benefits.map((item, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* AI Role Fit Analysis */}
      <RoleFitAnalysis
        ref={roleFitRef}
        company={company}
        position={position}
        roleDetails={roleSummary}
        resumeText={resumeText}
        subscribed={subscribed}
        onUpgrade={onUpgrade}
        hideButton={true}
      />
    </>
  );
};
