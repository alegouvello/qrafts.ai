import { ApplicationCard } from "@/components/ApplicationCard";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Application {
  id: string;
  company: string;
  position: string;
  status: "pending" | "interview" | "rejected" | "accepted";
  appliedDate: string;
  url: string;
  questions: number;
  answersCompleted: number;
  avgResponseDays?: number;
  fastestResponseDays?: number;
  companyDomain?: string | null;
}

interface ApplicationsListProps {
  groupedApplications: Record<string, Application[]>;
  groupDomains?: Record<string, string>;
  onDelete: (id: string) => void;
}

export const ApplicationsList = ({ groupedApplications, groupDomains = {}, onDelete }: ApplicationsListProps) => {
  return (
    <div className="space-y-6" role="list" aria-label="Job applications grouped by company">
      {Object.entries(groupedApplications).map(([company, apps]) => (
        <div key={company} className="space-y-4">
          <Link 
            to={`/company/${encodeURIComponent(company)}`}
            className="group inline-flex items-center gap-2 px-2 hover:text-primary transition-colors"
          >
            <h2 className="text-lg font-semibold text-foreground/80 group-hover:text-primary transition-colors">{company}</h2>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                overrideDomain={groupDomains[company]}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
