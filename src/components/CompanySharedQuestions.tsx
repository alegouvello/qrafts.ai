import { Card } from "@/components/ui/card";
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
  // Group questions by position
  const grouped = questions.reduce((acc, q) => {
    if (!acc[q.position]) acc[q.position] = [];
    acc[q.position].push(q);
    return acc;
  }, {} as Record<string, SharedQuestion[]>);

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="p-8">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          Community Interview Questions
          {questions.length > 0 && (
            <Badge variant="secondary" className="ml-2">{questions.length}</Badge>
          )}
        </h2>

        {questions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No interview questions shared yet for {companyName}. Questions are automatically shared when applications are added.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([position, qs]) => (
              <div key={position}>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">{position}</h3>
                <div className="space-y-2">
                  {qs.map((q, i) => (
                    <div key={q.id} className="flex gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
                      <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">{i + 1}.</span>
                      <p className="text-sm">{q.question_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
