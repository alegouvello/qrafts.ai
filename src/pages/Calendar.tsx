import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  application_id: string;
  company?: string;
  position?: string;
}

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data: eventsData, error } = await supabase
      .from("timeline_events")
      .select(`
        id,
        title,
        description,
        event_type,
        event_date,
        application_id
      `)
      .order("event_date", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } else if (eventsData) {
      // Fetch application details for each event
      const eventsWithApps = await Promise.all(
        eventsData.map(async (event) => {
          const { data: app } = await supabase
            .from("applications")
            .select("company, position")
            .eq("id", event.application_id)
            .single();
          
          return {
            ...event,
            company: app?.company,
            position: app?.position,
          };
        })
      );
      setEvents(eventsWithApps);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? events.filter((event) =>
        isSameDay(new Date(event.event_date), selectedDate)
      )
    : [];

  // Get events with dates for calendar highlighting
  const eventDates = events.map((event) => new Date(event.event_date));

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "interview":
        return "bg-primary text-primary-foreground";
      case "deadline":
        return "bg-destructive text-destructive-foreground";
      case "offer":
        return "bg-green-500 text-white";
      case "rejection":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const modifiers = {
    hasEvent: eventDates,
  };

  const modifiersClassNames = {
    hasEvent: "bg-accent text-accent-foreground font-bold",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Event Calendar</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Select a Date</h2>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              className="rounded-md border pointer-events-auto"
            />
            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-medium">Event Types:</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary text-primary-foreground">
                  Interview
                </Badge>
                <Badge className="bg-destructive text-destructive-foreground">
                  Deadline
                </Badge>
                <Badge className="bg-green-500 text-white">Offer</Badge>
                <Badge className="bg-muted text-muted-foreground">
                  Rejection
                </Badge>
                <Badge className="bg-secondary text-secondary-foreground">
                  Other
                </Badge>
              </div>
            </div>
          </Card>

          {/* Events List Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              {selectedDate
                ? `Events on ${format(selectedDate, "MMMM d, yyyy")}`
                : "Select a date"}
            </h2>
            {loading ? (
              <p className="text-muted-foreground">Loading events...</p>
            ) : selectedDateEvents.length === 0 ? (
              <p className="text-muted-foreground">
                No events scheduled for this date.
              </p>
            ) : (
              <div className="space-y-4">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                    onClick={() => navigate(`/application/${event.application_id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge className={getEventColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                    </div>
                    {event.company && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {event.company} - {event.position}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), "h:mm a")}
                    </p>
                    {event.description && (
                      <p className="text-sm mt-2">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Upcoming Events Section */}
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold mb-4">All Upcoming Events</h2>
          {loading ? (
            <p className="text-muted-foreground">Loading events...</p>
          ) : events.filter(e => new Date(e.event_date) >= new Date()).length === 0 ? (
            <p className="text-muted-foreground">No upcoming events.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events
                .filter(e => new Date(e.event_date) >= new Date())
                .slice(0, 9)
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                    onClick={() => navigate(`/application/${event.application_id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getEventColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.event_date), "MMM d")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{event.title}</h3>
                    {event.company && (
                      <p className="text-xs text-muted-foreground">
                        {event.company}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default CalendarPage;
