import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { downloadSitemap } from "@/utils/generateSitemap";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Search, Filter, FileText, MessageSquare, Sparkles } from "lucide-react";
import { SEO } from "@/components/SEO";
import { format } from "date-fns";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import feedbackHero from "@/assets/feedback-hero.jpg";
import { FeedbackStatsCards } from "@/components/AdminFeedback/FeedbackStatsCards";
import { FeedbackCharts } from "@/components/AdminFeedback/FeedbackCharts";
import { FeedbackCardItem } from "@/components/AdminFeedback/FeedbackCard";

interface Feedback {
  id: string; created_at: string; user_id: string | null;
  name: string | null; email: string | null; category: string;
  message: string; status: string; internal_notes: string | null;
  resolved_at: string | null; resolved_by: string | null;
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

  const handleBack = () => { window.history.length > 1 ? navigate(-1) : navigate('/'); };

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({ title: "Access Denied", description: "You don't have permission to access this page.", variant: "destructive" });
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  useEffect(() => { if (isAdmin) fetchFeedback(); }, [isAdmin]);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load feedback", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updates: any = { status: newStatus };
      if (newStatus === "resolved" || newStatus === "closed") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }
      const { error } = await supabase.from("feedback").update(updates).eq("id", feedbackId);
      if (error) throw error;
      await fetchFeedback();
      toast({ title: "Success", description: "Feedback status updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally { setUpdatingStatus(false); }
  };

  const saveInternalNotes = async (feedbackId: string) => {
    try {
      const { error } = await supabase.from("feedback").update({ internal_notes: internalNotes }).eq("id", feedbackId);
      if (error) throw error;
      await fetchFeedback();
      setSelectedFeedback(null);
      toast({ title: "Success", description: "Internal notes saved" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Name", "Email", "Category", "Status", "Message", "Internal Notes"];
    const rows = filteredFeedback.map(f => [
      format(new Date(f.created_at), "yyyy-MM-dd HH:mm"), f.name || "Anonymous", f.email || "N/A",
      f.category, f.status, f.message.replace(/"/g, '""'), f.internal_notes?.replace(/"/g, '""') || ""
    ]);
    const csv = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `feedback-export-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredFeedback = feedback.filter(f => {
    const matchesSearch = f.message.toLowerCase().includes(searchTerm.toLowerCase()) || f.name?.toLowerCase().includes(searchTerm.toLowerCase()) || f.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (statusFilter === "all" || f.status === statusFilter) && (categoryFilter === "all" || f.category === categoryFilter);
  });

  const stats = {
    total: feedback.length,
    pending: feedback.filter(f => f.status === "pending").length,
    inProgress: feedback.filter(f => f.status === "in_progress").length,
    resolved: feedback.filter(f => f.status === "resolved").length,
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

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin Feedback Dashboard - QRAFTS" description="Manage user feedback and suggestions" canonicalUrl={`${window.location.origin}/admin/feedback`} />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 rounded-full hover:bg-accent/10"><ArrowLeft className="h-4 w-4" />Back</Button>
          <div className="flex gap-2">
            <Button onClick={() => { downloadSitemap(); toast({ title: "Success", description: "Sitemap generated" }); }} variant="outline" className="gap-2 rounded-full border-border/60"><Download className="h-4 w-4" /><span className="hidden sm:inline">Sitemap</span></Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2 rounded-full border-border/60"><Download className="h-4 w-4" /><span className="hidden sm:inline">Export CSV</span></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroSection.ref} className={`relative container mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden ${feedback.length === 0 ? 'py-8 sm:py-12' : 'py-16 sm:py-20'}`}>
        {feedback.length > 0 && (
          <>
            <div className="absolute top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          </>
        )}
        <div className={`${feedback.length === 0 ? 'text-center max-w-2xl mx-auto' : 'grid md:grid-cols-2 gap-12 items-center'} transition-all duration-1000 ${heroSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4 animate-glow-pulse"><Sparkles className="inline h-4 w-4 mr-2" />Admin Dashboard</div>
            <h1 className={`font-bold leading-tight tracking-tight ${feedback.length === 0 ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl md:text-6xl'}`}>
              Feedback<span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-2">Dashboard</span>
            </h1>
            <p className={`text-lg text-muted-foreground leading-relaxed ${feedback.length === 0 ? 'mx-auto' : 'max-w-lg'}`}>Manage and respond to user feedback, track suggestions, and improve your product based on real user insights.</p>
          </div>
          {feedback.length > 0 && (
            <div className="relative animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl opacity-50 animate-glow-pulse" />
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-border/50 hover:scale-105 transition-transform duration-500">
                <img src={feedbackHero} alt="Feedback management dashboard" className="relative w-full" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      {feedback.length > 0 && (
        <section ref={statsSection.ref} className="relative container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className={`transition-all duration-1000 ${statsSection.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <FeedbackStatsCards {...stats} />
          </div>
        </section>
      )}

      {/* Charts */}
      {feedback.length > 0 && (
        <section ref={chartsSection.ref} className="relative container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className={`transition-all duration-1000 ${chartsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <FeedbackCharts feedback={feedback} />
          </div>
        </section>
      )}

      <main className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {feedback.length === 0 ? (
          <Card className="border-border/50 shadow-xl max-w-2xl mx-auto">
            <CardContent className="py-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-glow-pulse" />
                <MessageSquare className="relative h-20 w-20 mx-auto text-muted-foreground/30" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No feedback yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">Once users start submitting feedback, it will appear here.</p>
              <Button onClick={() => navigate('/feedback')} className="rounded-full">View Feedback Form</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <Card className="mb-8 border-border/50 shadow-lg">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search feedback..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full border-border/60 focus:border-primary/50" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="rounded-full border-border/60"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="rounded-full border-border/60"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setCategoryFilter("all"); }} className="gap-2 rounded-full border-border/60">
                    <Filter className="h-4 w-4" /><span className="hidden sm:inline">Clear Filters</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback List */}
            <div className="space-y-4">
              {filteredFeedback.map((item, index) => (
                <FeedbackCardItem
                  key={item.id}
                  item={item}
                  index={index}
                  updatingStatus={updatingStatus}
                  internalNotes={internalNotes}
                  onInternalNotesChange={setInternalNotes}
                  onStatusChange={updateFeedbackStatus}
                  onSaveNotes={saveInternalNotes}
                  onSelectFeedback={setSelectedFeedback}
                />
              ))}
              {filteredFeedback.length === 0 && (
                <Card className="border-border/50">
                  <CardContent className="py-20 text-center">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">Try adjusting your filters or search terms.</p>
                    <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setCategoryFilter("all"); }} className="mt-4 rounded-full gap-2">
                      <Filter className="h-4 w-4" />Clear all filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminFeedback;
