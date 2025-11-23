import { ApplicationCard } from "@/components/ApplicationCard";

interface Application {
  id: string;
  company: string;
  position: string;
  status: "pending" | "interview" | "rejected" | "accepted";
  appliedDate: string;
  url: string;
  questions: number;
  answersCompleted: number;
}

interface ApplicationsListProps {
  groupedApplications: Record<string, Application[]>;
  onDelete: (id: string) => void;
}

export const ApplicationsList = ({ groupedApplications, onDelete }: ApplicationsListProps) => {
  return (
    <div className="space-y-6" role="list" aria-label="Job applications grouped by company">
      {Object.entries(groupedApplications).map(([company, apps]) => (
        <div key={company} className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground/80 px-2">{company}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
