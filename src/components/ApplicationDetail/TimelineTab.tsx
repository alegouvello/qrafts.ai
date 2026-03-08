import { Button } from "@/components/ui/button";
import { TimelineView } from "@/components/TimelineView";
import { StatusHistoryTimeline } from "@/components/StatusHistoryTimeline";
import { Plus } from "lucide-react";

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  created_at: string;
}

interface TimelineTabProps {
  appliedDate: string;
  timelineEvents: TimelineEvent[];
  statusHistory: { id: string; status: string; changed_at: string }[];
  onShowAddTimelineDialog: () => void;
  onDeleteTimelineEvent: (eventId: string) => void;
}

export const TimelineTab = ({
  appliedDate,
  timelineEvents,
  statusHistory,
  onShowAddTimelineDialog,
  onDeleteTimelineEvent,
}: TimelineTabProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Timeline & Notes</h2>
        <Button onClick={onShowAddTimelineDialog} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {statusHistory.length > 0 && (
        <StatusHistoryTimeline history={statusHistory} appliedDate={appliedDate} />
      )}

      <TimelineView events={timelineEvents} onDelete={onDeleteTimelineEvent} />
    </div>
  );
};
