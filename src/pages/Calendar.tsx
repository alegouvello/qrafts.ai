import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Calendar as CalendarIcon, Filter, Search, Grid, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isSameDay, startOfWeek, endOfWeek, addDays, isSameWeek, startOfDay, endOfDay } from "date-fns";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [filters, setFilters] = useState(() => {
    // Load filters from localStorage on initial render
    const savedFilters = localStorage.getItem("calendarFilters");
    if (savedFilters) {
      try {
        return JSON.parse(savedFilters);
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
    // Default filters
    return {
      interview: true,
      deadline: true,
      offer: true,
      rejection: true,
      other: true,
    };
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("calendarFilters", JSON.stringify(filters));
  }, [filters]);

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

  const handleFilterChange = (eventType: string, checked: boolean) => {
    setFilters((prev) => ({ ...prev, [eventType]: checked }));
  };

  const handleSelectAll = () => {
    setFilters({
      interview: true,
      deadline: true,
      offer: true,
      rejection: true,
      other: true,
    });
  };

  const handleClearAll = () => {
    setFilters({
      interview: false,
      deadline: false,
      offer: false,
      rejection: false,
      other: false,
    });
  };

  // Filter events based on selected filters
  const filteredEvents = events.filter((event) => {
    const eventType = event.event_type === "interview" || 
                      event.event_type === "deadline" || 
                      event.event_type === "offer" || 
                      event.event_type === "rejection"
      ? event.event_type
      : "other";
    
    // Check if event type is selected
    const typeMatch = filters[eventType as keyof typeof filters];
    
    // Check if search query matches
    const searchLower = searchQuery.toLowerCase();
    const searchMatch = !searchQuery || 
      event.title.toLowerCase().includes(searchLower) ||
      event.company?.toLowerCase().includes(searchLower) ||
      event.position?.toLowerCase().includes(searchLower);
    
    return typeMatch && searchMatch;
  });

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? filteredEvents.filter((event) =>
        isSameDay(new Date(event.event_date), selectedDate)
      )
    : [];

  // Get events with dates for calendar highlighting
  const eventDates = filteredEvents.map((event) => new Date(event.event_date));

  // Calculate statistics
  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date()).length;
  const eventStats = {
    interview: events.filter(e => e.event_type === "interview").length,
    deadline: events.filter(e => e.event_type === "deadline").length,
    offer: events.filter(e => e.event_type === "offer").length,
    rejection: events.filter(e => e.event_type === "rejection").length,
    other: events.filter(e => !["interview", "deadline", "offer", "rejection"].includes(e.event_type)).length,
  };

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
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <h1 className="text-base sm:text-xl font-bold truncate">Event Calendar</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-shrink-0">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-8">
        {/* Statistics Card */}
        <Card className="p-4 sm:p-6 mb-4">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Event Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Events</p>
              <p className="text-2xl sm:text-3xl font-bold">{totalEvents}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Upcoming</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary">{upcomingEvents}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Past Events</p>
              <p className="text-2xl sm:text-3xl font-bold text-muted-foreground">{totalEvents - upcomingEvents}</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold mb-3">Breakdown by Type</h3>
            
            {/* Interview */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">Interview</Badge>
                </div>
                <span className="font-semibold">{eventStats.interview}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalEvents > 0 ? (eventStats.interview / totalEvents) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-destructive text-destructive-foreground">Deadline</Badge>
                </div>
                <span className="font-semibold">{eventStats.deadline}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-destructive h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalEvents > 0 ? (eventStats.deadline / totalEvents) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Offer */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500 text-white">Offer</Badge>
                </div>
                <span className="font-semibold">{eventStats.offer}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalEvents > 0 ? (eventStats.offer / totalEvents) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Rejection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-muted text-muted-foreground">Rejection</Badge>
                </div>
                <span className="font-semibold">{eventStats.rejection}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-muted-foreground h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalEvents > 0 ? (eventStats.rejection / totalEvents) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Other */}
            {eventStats.other > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-secondary text-secondary-foreground">Other</Badge>
                  </div>
                  <span className="font-semibold">{eventStats.other}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-secondary-foreground h-2 rounded-full transition-all duration-300"
                    style={{ width: `${totalEvents > 0 ? (eventStats.other / totalEvents) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Search Bar */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by company, position, or event title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Clear
              </Button>
            )}
          </div>
        </Card>

        {/* Filters Section */}
        <Card className="p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-sm sm:text-base">Filter Events</h3>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex-1 sm:flex-none"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="flex-1 sm:flex-none"
              >
                Clear All
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="interview"
                checked={filters.interview}
                onCheckedChange={(checked) =>
                  handleFilterChange("interview", checked as boolean)
                }
              />
              <Label htmlFor="interview" className="cursor-pointer">
                <Badge className="bg-primary text-primary-foreground">
                  Interview
                </Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deadline"
                checked={filters.deadline}
                onCheckedChange={(checked) =>
                  handleFilterChange("deadline", checked as boolean)
                }
              />
              <Label htmlFor="deadline" className="cursor-pointer">
                <Badge className="bg-destructive text-destructive-foreground">
                  Deadline
                </Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="offer"
                checked={filters.offer}
                onCheckedChange={(checked) =>
                  handleFilterChange("offer", checked as boolean)
                }
              />
              <Label htmlFor="offer" className="cursor-pointer">
                <Badge className="bg-green-500 text-white">Offer</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rejection"
                checked={filters.rejection}
                onCheckedChange={(checked) =>
                  handleFilterChange("rejection", checked as boolean)
                }
              />
              <Label htmlFor="rejection" className="cursor-pointer">
                <Badge className="bg-muted text-muted-foreground">
                  Rejection
                </Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="other"
                checked={filters.other}
                onCheckedChange={(checked) =>
                  handleFilterChange("other", checked as boolean)
                }
              />
              <Label htmlFor="other" className="cursor-pointer">
                <Badge className="bg-secondary text-secondary-foreground">
                  Other
                </Badge>
              </Label>
            </div>
          </div>
        </Card>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="inline-flex rounded-lg border border-border p-1 bg-card w-full sm:w-auto">
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="gap-2 flex-1 sm:flex-none"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden xs:inline">Month View</span>
              <span className="xs:hidden">Month</span>
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Grid className="h-4 w-4" />
              <span className="hidden xs:inline">Week View</span>
              <span className="xs:hidden">Week</span>
            </Button>
          </div>
        </div>

        {viewMode === "month" ? (
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
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
              <h3 className="text-sm font-medium text-muted-foreground">
                Dates with events are highlighted
              </h3>
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
        ) : (
          /* Week View */
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Week of {selectedDate && format(startOfWeek(selectedDate, { weekStartsOn: 0 }), "MMMM d, yyyy")}
                </h2>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addDays(selectedDate || new Date(), -7))}
                >
                  Previous Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(addDays(selectedDate || new Date(), 7))}
                >
                  Next Week
                </Button>
              </div>
            </div>
            
            {/* Week Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Days Header */}
                <div className="grid grid-cols-8 gap-2 mb-2">
                  <div className="text-sm font-medium text-muted-foreground p-2">Time</div>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const day = addDays(startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 }), i);
                    const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.event_date), day));
                    return (
                      <div key={i} className="text-center">
                        <div className="text-sm font-medium">{format(day, "EEE")}</div>
                        <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
                        {dayEvents.length > 0 && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {dayEvents.length}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots */}
                <div className="space-y-1">
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="grid grid-cols-8 gap-2">
                      <div className="text-xs text-muted-foreground p-2 border-r">
                        {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
                      </div>
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const day = addDays(startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 }), dayIndex);
                        const dayEvents = filteredEvents.filter(e => {
                          const eventDate = new Date(e.event_date);
                          return isSameDay(eventDate, day) && eventDate.getHours() === hour;
                        });

                        return (
                          <div
                            key={dayIndex}
                            className="min-h-[60px] p-1 border rounded-md hover:bg-accent/50 transition-colors"
                          >
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                className={`text-xs p-2 rounded mb-1 cursor-pointer ${getEventColor(event.event_type)}`}
                                onClick={() => navigate(`/application/${event.application_id}`)}
                              >
                                <div className="font-semibold truncate">{event.title}</div>
                                <div className="truncate">{event.company}</div>
                                <div>{format(new Date(event.event_date), "h:mm a")}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Upcoming Events Section */}
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold mb-4">All Upcoming Events</h2>
          {loading ? (
            <p className="text-muted-foreground">Loading events...</p>
          ) : filteredEvents.filter(e => new Date(e.event_date) >= new Date()).length === 0 ? (
            <p className="text-muted-foreground">No upcoming events match your filters.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents
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
