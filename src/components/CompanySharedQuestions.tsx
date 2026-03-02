import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";

interface SharedQuestion {
  id: string;
  company: string;
  position: string;
  question_text: string;
  created_at: string;
}

interface CompanySharedQuestionsProps {
  companyName: string;
  questions: SharedQuestion[];
}

export const CompanySharedQuestions = ({ companyName, questions }: CompanySharedQuestionsProps) => {
  const grouped = questions.reduce((acc, q) => {
    if (!acc[q.position]) acc[q.position] = [];
    acc[q.position].push(q);
    return acc;
  }, {} as Record<string, SharedQuestion[]>);

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5 text-primary" />
        Community Interview Questions
        {questions.length > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-1 font-normal">{questions.length}</Badge>
        )}
      </h2>

      {questions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-5">
          No interview questions shared yet for {companyName}. Questions are automatically shared when applications are added.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([position, qs]) => (
            <div key={position}>
              <h3 className="text-[11px] font-medium text-muted-foreground mb-1.5">{position}</h3>
              <div className="space-y-1">
                {qs.map((q, i) => (
                  <div key={q.id} className="flex gap-2 px-3 py-2 rounded-lg bg-muted/30">
                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5 shrink-0">{i + 1}.</span>
                    <p className="text-[13px]">{q.question_text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
