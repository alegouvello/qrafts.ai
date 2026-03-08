import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

interface FeedbackStatsCardsProps {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export const FeedbackStatsCards = ({ total, pending, inProgress, resolved }: FeedbackStatsCardsProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card className="relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="pt-6 relative">
        <div className="flex items-start justify-between mb-2">
          <MessageSquare className="h-8 w-8 text-primary opacity-80" />
        </div>
        <p className="text-3xl font-bold mb-1">{total}</p>
        <p className="text-sm text-muted-foreground">Total Feedback</p>
      </CardContent>
    </Card>

    <Card className="relative overflow-hidden border-border/50 hover:border-warning/50 transition-all duration-300 hover:shadow-lg group">
      <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="pt-6 relative">
        <div className="flex items-start justify-between mb-2">
          <AlertCircle className="h-8 w-8 text-warning opacity-80" />
        </div>
        <p className="text-3xl font-bold mb-1">{pending}</p>
        <p className="text-sm text-muted-foreground">Pending</p>
      </CardContent>
    </Card>

    <Card className="relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="pt-6 relative">
        <div className="flex items-start justify-between mb-2">
          <Clock className="h-8 w-8 text-primary opacity-80" />
        </div>
        <p className="text-3xl font-bold mb-1">{inProgress}</p>
        <p className="text-sm text-muted-foreground">In Progress</p>
      </CardContent>
    </Card>

    <Card className="relative overflow-hidden border-border/50 hover:border-success/50 transition-all duration-300 hover:shadow-lg group">
      <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="pt-6 relative">
        <div className="flex items-start justify-between mb-2">
          <CheckCircle2 className="h-8 w-8 text-success opacity-80" />
        </div>
        <p className="text-3xl font-bold mb-1">{resolved}</p>
        <p className="text-sm text-muted-foreground">Resolved</p>
      </CardContent>
    </Card>
  </div>
);
