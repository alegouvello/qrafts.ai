import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AddTimelineEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (event: {
    eventType: string;
    title: string;
    description: string;
    eventDate: Date;
  }) => Promise<void>;
}

const eventTypes = [
  { value: "note", label: "Note" },
  { value: "interview", label: "Interview" },
  { value: "follow_up", label: "Follow-up" },
  { value: "deadline", label: "Deadline" },
  { value: "offer", label: "Offer" },
  { value: "rejection", label: "Rejection" },
  { value: "other", label: "Other" },
];

export const AddTimelineEventDialog = ({
  open,
  onOpenChange,
  onAdd,
}: AddTimelineEventDialogProps) => {
  const { t } = useTranslation();
  const [eventType, setEventType] = useState("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  
  const eventTypes = [
    { value: "note", label: t('calendar.eventTypes.note') },
    { value: "interview", label: t('calendar.eventTypes.interview') },
    { value: "follow_up", label: t('calendar.eventTypes.follow_up') },
    { value: "deadline", label: t('calendar.eventTypes.deadline') },
    { value: "offer", label: t('calendar.eventTypes.offer') },
    { value: "rejection", label: t('calendar.eventTypes.rejection') },
    { value: "other", label: t('calendar.eventTypes.other') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await onAdd({
      eventType,
      title,
      description,
      eventDate,
    });

    // Reset form
    setEventType("note");
    setTitle("");
    setDescription("");
    setEventDate(new Date());
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('calendar.addEvent')}</DialogTitle>
          <DialogDescription>
            {t('application.timelineDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">{t('calendar.eventType')}</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">{t('calendar.eventTitle')}</Label>
              <Input
                id="title"
                placeholder={t('calendar.eventTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('calendar.eventDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('calendar.eventDescriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('calendar.eventDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !eventDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, "PPP p") : <span>{t('calendar.pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={(date) => date && setEventDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  <div className="p-3 border-t">
                    <Label className="text-xs">{t('calendar.time')}</Label>
                    <Input
                      type="time"
                      value={format(eventDate, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":");
                        const newDate = new Date(eventDate);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setEventDate(newDate);
                      }}
                      className="mt-1"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('calendar.addEvent')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
