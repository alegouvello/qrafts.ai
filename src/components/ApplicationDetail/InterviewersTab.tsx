import { Card } from "@/components/ui/card";
import { AddInterviewerDialog } from "@/components/AddInterviewerDialog";
import { InterviewPrepCard } from "@/components/InterviewPrepCard";

interface Interviewer {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  notes: string | null;
  extracted_data: any;
  interview_prep: any;
}

interface InterviewersTabProps {
  applicationId: string;
  applicationCompany: string;
  interviewers: Interviewer[];
  onInterviewersRefresh: () => void;
}

export const InterviewersTab = ({
  applicationId,
  applicationCompany,
  interviewers,
  onInterviewersRefresh,
}: InterviewersTabProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Interview Preparation</h2>
        <AddInterviewerDialog
          applicationId={applicationId}
          applicationCompany={applicationCompany}
          onInterviewerAdded={onInterviewersRefresh}
        />
      </div>

      {interviewers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-lg mb-2">No interviewers added yet</p>
          <p className="text-muted-foreground text-sm">
            Add interviewers to get AI-powered interview prep based on their background and your
            resume
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {interviewers.map((interviewer) => (
            <InterviewPrepCard
              key={interviewer.id}
              interviewer={interviewer}
              onDelete={onInterviewersRefresh}
              onPrepGenerated={onInterviewersRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
};
