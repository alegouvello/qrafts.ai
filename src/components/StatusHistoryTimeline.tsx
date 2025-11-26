import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp } from "lucide-react";

interface StatusHistory {
  id: string;
  status: string;
  changed_at: string;
}

interface StatusHistoryTimelineProps {
  history: StatusHistory[];
  appliedDate: string;
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const, color: "bg-secondary" },
  interview: { label: "Interview", variant: "default" as const, color: "bg-primary" },
  rejected: { label: "Rejected", variant: "destructive" as const, color: "bg-destructive" },
  accepted: { label: "Accepted", variant: "outline" as const, color: "bg-accent" },
};

export const StatusHistoryTimeline = ({ history, appliedDate }: StatusHistoryTimelineProps) => {
  if (history.length === 0) {
    return null;
  }

  // Sort by date ascending (oldest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Normalize to compare calendar days, not 24-hour periods
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    const days = differenceInDays(endDay, startDay);
    if (days === 0) return "Same day";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Application Timeline</h3>
      </div>
      
      <div className="space-y-4">
        {/* Applied date */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            {sortedHistory.length > 0 && (
              <div className="w-0.5 h-full bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Applied</span>
              <Badge variant="secondary">Start</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(appliedDate), "MMM d, yyyy 'at' h:mm a")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(appliedDate), { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Status changes */}
        {sortedHistory.map((item, index) => {
          const config = statusConfig[item.status as keyof typeof statusConfig];
          const prevDate = index === 0 ? appliedDate : sortedHistory[index - 1].changed_at;
          const duration = calculateDuration(prevDate, item.changed_at);
          
          return (
            <div key={item.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${config?.color || 'bg-muted-foreground'}`} />
                {index < sortedHistory.length - 1 && (
                  <div className="w-0.5 h-full bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{config?.label || item.status}</span>
                  <Badge variant={config?.variant || "secondary"}>
                    {config?.label || item.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(item.changed_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {duration} after {index === 0 ? 'application' : 'previous status'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary statistics */}
      {sortedHistory.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total time elapsed</div>
              <div className="font-semibold">
                {calculateDuration(appliedDate, sortedHistory[sortedHistory.length - 1].changed_at)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Status changes</div>
              <div className="font-semibold">{sortedHistory.length}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
