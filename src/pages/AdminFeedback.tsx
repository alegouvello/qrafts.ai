import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { downloadSitemap } from "@/utils/generateSitemap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import feedbackHero from "@/assets/feedback-hero.jpg";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Feedback {
  id: string;
  created_at: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  category: string;
  message: string;
  status: string;
  internal_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

const AdminFeedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const heroSection = useScrollAnimation({ threshold: 0.2 });
  const statsSection = useScrollAnimation({ threshold: 0.3 });
  const chartsSection = useScrollAnimation({ threshold: 0.3 });

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchFeedback();
    }
  }, [isAdmin]);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast({
        title: "Error",
        description: "Failed to load feedback",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: {
        status: string;
        resolved_at?: string;
        resolved_by?: string;
      } = {
        status: newStatus,
      };

      if (newStatus === "resolved" || newStatus === "closed") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from("feedback")
        .update(updates)
        .eq("id", feedbackId);

      if (error) throw error;

      await fetchFeedback();
      toast({
        title: "Success",
        description: "Feedback status updated",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const saveInternalNotes = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from("feedback")
        .update({ internal_notes: internalNotes })
        .eq("id", feedbackId);

      if (error) throw error;

      await fetchFeedback();
      setSelectedFeedback(null);
      toast({
        title: "Success",
        description: "Internal notes saved",
      });
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Name", "Email", "Category", "Status", "Message", "Internal Notes"];
    const rows = filteredFeedback.map(f => [
      format(new Date(f.created_at), "yyyy-MM-dd HH:mm"),
      f.name || "Anonymous",
      f.email || "N/A",
      f.category,
      f.status,
      f.message.replace(/"/g, '""'),
      f.internal_notes?.replace(/"/g, '""') || ""
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredFeedback = feedback.filter(f => {
    const matchesSearch = 
      f.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || f.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "closed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-success/10 text-success border-success/20";
      case "in_progress":
        return "bg-primary/10 text-primary border-primary/20";
      case "closed":
        return "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20";
      default:
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  const stats = {
    total: feedback.length,
    pending: feedback.filter(f => f.status === "pending").length,
    inProgress: feedback.filter(f => f.status === "in_progress").length,
    resolved: feedback.filter(f => f.status === "resolved").length,
  };

  // Prepare chart data - feedback over last 30 days
  const getFeedbackTrendData = () => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayFeedback = feedback.filter(f => {
        const feedbackDate = startOfDay(new Date(f.created_at));
        return feedbackDate.getTime() === dayStart.getTime();
      });

      return {
        date: format(day, "MMM dd"),
        total: dayFeedback.length,
        pending: dayFeedback.filter(f => f.status === "pending").length,
        resolved: dayFeedback.filter(f => f.status === "resolved").length,
        inProgress: dayFeedback.filter(f => f.status === "in_progress").length,
      };
    });
  };

  // Category distribution data
  const getCategoryData = () => {
    const categories = ["feature", "bug", "improvement", "other"];
    return categories.map(cat => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: feedback.filter(f => f.category === cat).length,
    }));
  };

  // Status distribution over time
  const getStatusTrendData = () => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    const cumulativeData = days.map(day => {
      const dayStart = startOfDay(day);
      const feedbackUpToDay = feedback.filter(f => {
        const feedbackDate = startOfDay(new Date(f.created_at));
        return feedbackDate <= dayStart;
      });

      return {
        date: format(day, "MMM dd"),
        pending: feedbackUpToDay.filter(f => f.status === "pending").length,
        inProgress: feedbackUpToDay.filter(f => f.status === "in_progress").length,
        resolved: feedbackUpToDay.filter(f => f.status === "resolved").length,
        closed: feedbackUpToDay.filter(f => f.status === "closed").length,
      };
    });

    return cumulativeData;
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin Feedback Dashboard - QRAFTS"
        description="Manage user feedback and suggestions"
        canonicalUrl={`${window.location.origin}/admin/feedback`}
      />

      {/* Decorative background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2 rounded-full hover:bg-accent/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                downloadSitemap();
                toast({
                  title: "Success",
                  description: "Sitemap generated and downloaded",
                });
              }} 
              variant="outline" 
              className="gap-2 rounded-full border-border/60 hover:border-primary/50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Sitemap</span>
            </Button>
            <Button 
              onClick={exportToCSV} 
              variant="outline" 
              className="gap-2 rounded-full border-border/60 hover:border-primary/50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        ref={heroSection.ref}
        className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 overflow-hidden"
      >
        {/* Animated gradient orbs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        
        <div className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-1000 ${
          heroSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4 animate-glow-pulse">
              <Sparkles className="inline h-4 w-4 mr-2" />
              Admin Dashboard
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
              Feedback
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-2">
                Dashboard
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Manage and respond to user feedback, track suggestions, and improve your product based on real user insights.
            </p>
          </div>
          <div className="relative animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl opacity-50 animate-glow-pulse" />
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-border/50 hover:scale-105 transition-transform duration-500">
              <img 
                src={feedbackHero}
                alt="Feedback management dashboard illustration"
                className="relative w-full"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        ref={statsSection.ref}
        className="relative container mx-auto px-4 sm:px-6 lg:px-8 pb-8"
      >
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-1000 ${
          statsSection.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <Card className="relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative">
              <div className="flex items-start justify-between mb-2">
                <MessageSquare className="h-8 w-8 text-primary opacity-80" />
              </div>
              <p className="text-3xl font-bold mb-1">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Feedback</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-border/50 hover:border-warning/50 transition-all duration-300 hover:shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative">
              <div className="flex items-start justify-between mb-2">
                <AlertCircle className="h-8 w-8 text-warning opacity-80" />
              </div>
              <p className="text-3xl font-bold mb-1">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative">
              <div className="flex items-start justify-between mb-2">
                <Clock className="h-8 w-8 text-primary opacity-80" />
              </div>
              <p className="text-3xl font-bold mb-1">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-border/50 hover:border-success/50 transition-all duration-300 hover:shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative">
              <div className="flex items-start justify-between mb-2">
                <CheckCircle2 className="h-8 w-8 text-success opacity-80" />
              </div>
              <p className="text-3xl font-bold mb-1">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Charts Section */}
      <section 
        ref={chartsSection.ref}
        className="relative container mx-auto px-4 sm:px-6 lg:px-8 pb-8"
      >
        <div className={`transition-all duration-1000 ${
          chartsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Feedback Trends</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Feedback Over Time */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Feedback Submissions (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={getFeedbackTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Total Feedback"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Feedback by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getCategoryData()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--accent))" 
                      radius={[8, 8, 0, 0]}
                      name="Count"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status Trends Over Time */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Cumulative Status Distribution (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getStatusTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="resolved" 
                    stackId="1"
                    stroke="hsl(var(--success))" 
                    fill="hsl(var(--success))"
                    fillOpacity={0.6}
                    name="Resolved"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="inProgress" 
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                    name="In Progress"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pending" 
                    stackId="1"
                    stroke="hsl(var(--warning))" 
                    fill="hsl(var(--warning))"
                    fillOpacity={0.6}
                    name="Pending"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="closed" 
                    stackId="1"
                    stroke="hsl(var(--muted-foreground))" 
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.6}
                    name="Closed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <main className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-8 border-border/50 shadow-lg">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-full border-border/60 focus:border-primary/50"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-full border-border/60">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="rounded-full border-border/60">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="gap-2 rounded-full border-border/60 hover:border-primary/50"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Clear Filters</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedback.map((item, index) => (
            <Card 
              key={item.id} 
              className="relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="outline" className={`flex items-center gap-1.5 ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="capitalize font-medium">{item.status.replace("_", " ")}</span>
                      </Badge>
                      <Badge variant="secondary" className="capitalize bg-accent/10 text-accent border-accent/20">
                        {item.category === "feature" && "✨ "}
                        {item.category === "bug" && "🐛 "}
                        {item.category === "improvement" && "🚀 "}
                        {item.category === "other" && "💭 "}
                        {item.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-semibold mb-2">
                      {item.name || "Anonymous User"} 
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {item.email && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {item.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.created_at), "PPpp")}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                    <Select
                      value={item.status}
                      onValueChange={(value) => updateFeedbackStatus(item.id, value)}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className="w-full sm:w-[140px] rounded-full border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFeedback(item);
                            setInternalNotes(item.internal_notes || "");
                          }}
                          className="rounded-full border-border/60 hover:border-primary/50"
                        >
                          Notes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Internal Notes</DialogTitle>
                          <DialogDescription>
                            Add private notes for team members (not visible to users)
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          value={internalNotes}
                          onChange={(e) => setInternalNotes(e.target.value)}
                          placeholder="Add your notes here..."
                          rows={6}
                          className="resize-none"
                        />
                        <Button 
                          onClick={() => saveInternalNotes(item.id)}
                          className="rounded-full"
                        >
                          Save Notes
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4 text-foreground/90">
                  {item.message}
                </p>
                {item.internal_notes && (
                  <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Internal Notes
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed">{item.internal_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredFeedback.length === 0 && (
            <Card className="border-border/50">
              <CardContent className="py-20 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-glow-pulse" />
                  <FileText className="relative h-16 w-16 mx-auto text-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your filters or search terms to find what you're looking for.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                  }}
                  className="mt-6 rounded-full"
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminFeedback;
