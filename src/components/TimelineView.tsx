import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  AlertCircle,
  Gift,
  XCircle,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  created_at: string;
}

interface TimelineViewProps {
  events: TimelineEvent[];
  onDelete: (eventId: string) => void;
}

const eventTypeConfig = {
  note: {
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Note",
  },
  interview: {
    icon: Phone,
    color: "text-primary",
    bgColor: "bg-primary/10",
    label: "Interview",
  },
  follow_up: {
    icon: Mail,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "Follow-up",
  },
  deadline: {
    icon: AlertCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    label: "Deadline",
  },
  offer: {
    icon: Gift,
    color: "text-success",
    bgColor: "bg-success/10",
    label: "Offer",
  },
  rejection: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "Rejection",
  },
  other: {
    icon: Calendar,
    color: "text-muted-foreground",
    bgColor: "bg-secondary",
    label: "Other",
  },
};

export const TimelineView = ({ events, onDelete }: TimelineViewProps) => {
  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg mb-2">No timeline events yet</p>
        <p className="text-muted-foreground text-sm">
          Add interviews, follow-ups, and notes to track your application progress
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const config = eventTypeConfig[event.event_type as keyof typeof eventTypeConfig];
        const Icon = config.icon;
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
            )}

            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{event.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.event_date), "PPP 'at' p")}
                      </p>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onDelete(event.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {event.description}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Added {format(new Date(event.created_at), "PPP")}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
