import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnswerImprovementDialog } from "@/components/AnswerImprovementDialog";
import { SaveTemplateDialog } from "@/components/SaveTemplateDialog";
import { BrowseTemplatesDialog } from "@/components/BrowseTemplatesDialog";
import { AddTimelineEventDialog } from "@/components/AddTimelineEventDialog";
import { TimelineView } from "@/components/TimelineView";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle,
  Sparkles,
  Lightbulb,
  BookmarkPlus,
  Library,
  Clock,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Application {
  id: string;
  company: string;
  position: string;
  status: string;
  applied_date: string;
  url: string;
  role_summary?: {
    location?: string;
    salary_range?: string;
    description?: string;
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
  };
}

interface Question {
  id: string;
  question_text: string;
  question_order: number;
}

interface Answer {
  id: string;
  question_id: string;
  answer_text: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  created_at: string;
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const },
  interview: { label: "Interview", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
  accepted: { label: "Accepted", variant: "outline" as const },
};

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [application, setApplication] = useState<Application | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [suggesting, setSuggesting] = useState<Record<string, boolean>>({});
  const [improving, setImproving] = useState<Record<string, boolean>>({});
  const [reextracting, setReextracting] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [newAppliedDate, setNewAppliedDate] = useState("");
  const [showImprovementDialog, setShowImprovementDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showBrowseTemplatesDialog, setShowBrowseTemplatesDialog] = useState(false);
  const [showAddTimelineDialog, setShowAddTimelineDialog] = useState(false);
  const [currentQuestionForTemplate, setCurrentQuestionForTemplate] = useState<string | null>(null);
  const [currentImprovement, setCurrentImprovement] = useState<{
    questionId: string;
    strengths: string;
    improvements: string;
    improvedVersion: string;
  } | null>(null);

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchApplicationData();
      fetchTimelineEvents();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchApplicationData = async () => {
    setLoading(true);

    // Fetch application
    const { data: appData, error: appError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (appError) {
      toast({
        title: "Error",
        description: "Failed to load application",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setApplication({
      ...appData,
      role_summary: appData.role_summary as Application['role_summary']
    });

    // Fetch questions
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("application_id", id)
      .order("question_order", { ascending: true });

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
    } else {
      setQuestions(questionsData || []);

      // Fetch answers for these questions
      if (questionsData && questionsData.length > 0) {
        const questionIds = questionsData.map((q) => q.id);
        const { data: answersData } = await supabase
          .from("answers")
          .select("*")
          .in("question_id", questionIds);

        if (answersData) {
          const answersMap: Record<string, string> = {};
          answersData.forEach((answer) => {
            answersMap[answer.question_id] = answer.answer_text || "";
          });
          setAnswers(answersMap);
          setSavedAnswers(answersMap);
        }
      }
    }

    setLoading(false);
  };

  const fetchTimelineEvents = async () => {
    const { data, error } = await supabase
      .from("timeline_events")
      .select("*")
      .eq("application_id", id)
      .order("event_date", { ascending: false });

    if (error) {
      console.error("Error fetching timeline events:", error);
    } else {
      setTimelineEvents(data || []);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSaveAnswer = async (questionId: string) => {
    setSaving((prev) => ({ ...prev, [questionId]: true }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const answerText = answers[questionId] || "";

    // Check if answer exists
    const { data: existingAnswer } = await supabase
      .from("answers")
      .select("id")
      .eq("question_id", questionId)
      .eq("user_id", user.id)
      .single();

    let error;
    if (existingAnswer) {
      // Update existing answer
      const result = await supabase
        .from("answers")
        .update({ answer_text: answerText })
        .eq("id", existingAnswer.id);
      error = result.error;
    } else {
      // Insert new answer
      const result = await supabase
        .from("answers")
        .insert({
          question_id: questionId,
          user_id: user.id,
          answer_text: answerText,
        });
      error = result.error;
    }

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save answer",
        variant: "destructive",
      });
    } else {
      setSavedAnswers((prev) => ({ ...prev, [questionId]: answerText }));
      toast({
        title: "Saved",
        description: "Your answer has been saved",
      });
    }

    setSaving((prev) => ({ ...prev, [questionId]: false }));
  };

  const handleGetSuggestion = async (questionId: string, questionText: string) => {
    if (!application) return;
    
    setSuggesting((prev) => ({ ...prev, [questionId]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('suggest-answer', {
        body: {
          questionText: questionText,
          applicationId: application.id,
          company: application.company,
          position: application.position,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        // Set the suggestion as the answer
        setAnswers((prev) => ({ ...prev, [questionId]: response.data.suggestion }));
        toast({
          title: "AI Suggestion Generated",
          description: "Review and customize the suggested answer before saving.",
        });
      } else {
        throw new Error(response.data?.error || 'Failed to generate suggestion');
      }
    } catch (error) {
      console.error('Error getting suggestion:', error);
      toast({
        title: "Suggestion Failed",
        description: error instanceof Error ? error.message : "Could not generate AI suggestion. Please try again.",
        variant: "destructive",
      });
    }

    setSuggesting((prev) => ({ ...prev, [questionId]: false }));
  };

  const handleImproveAnswer = async (questionId: string, questionText: string) => {
    if (!application) return;

    const currentAnswer = answers[questionId];
    if (!currentAnswer || currentAnswer.trim().length < 10) {
      toast({
        title: "No Answer to Improve",
        description: "Please write at least a basic answer first before requesting improvements.",
        variant: "destructive",
      });
      return;
    }
    
    setImproving((prev) => ({ ...prev, [questionId]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('improve-answer', {
        body: {
          questionText: questionText,
          currentAnswer: currentAnswer,
          company: application.company,
          position: application.position,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setCurrentImprovement({
          questionId: questionId,
          strengths: response.data.strengths,
          improvements: response.data.improvements,
          improvedVersion: response.data.improvedVersion,
        });
        setShowImprovementDialog(true);
      } else {
        throw new Error(response.data?.error || 'Failed to improve answer');
      }
    } catch (error) {
      console.error('Error improving answer:', error);
      toast({
        title: "Improvement Failed",
        description: error instanceof Error ? error.message : "Could not generate improvements. Please try again.",
        variant: "destructive",
      });
    }

    setImproving((prev) => ({ ...prev, [questionId]: false }));
  };

  const handleApplyImprovement = () => {
    if (!currentImprovement) return;

    setAnswers((prev) => ({
      ...prev,
      [currentImprovement.questionId]: currentImprovement.improvedVersion,
    }));

    toast({
      title: "Improvement Applied",
      description: "The improved version has been applied. Don't forget to save!",
    });

    setShowImprovementDialog(false);
    setCurrentImprovement(null);
  };

  const handleSaveAsTemplate = async (title: string, category: string, tags: string[]) => {
    if (!currentQuestionForTemplate) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const answerText = answers[currentQuestionForTemplate];
    if (!answerText) return;

    const { error } = await supabase
      .from("answer_templates")
      .insert({
        user_id: user.id,
        title: title,
        template_text: answerText,
        category: category || null,
        tags: tags.length > 0 ? tags : null,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Template Saved",
        description: "Your answer has been saved as a reusable template",
      });
    }
  };

  const handleApplyTemplate = (questionId: string, templateText: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: templateText,
    }));

    toast({
      title: "Template Applied",
      description: "Template has been applied to your answer. Don't forget to save!",
    });
  };

  const handleAddTimelineEvent = async (event: {
    eventType: string;
    title: string;
    description: string;
    eventDate: Date;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;

    const { error } = await supabase
      .from("timeline_events")
      .insert({
        application_id: id,
        user_id: user.id,
        event_type: event.eventType,
        title: event.title,
        description: event.description || null,
        event_date: event.eventDate.toISOString(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add timeline event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Event Added",
        description: "Timeline event has been added successfully",
      });
      fetchTimelineEvents();
    }
  };

  const handleDeleteTimelineEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("timeline_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete timeline event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Timeline event has been removed",
      });
      fetchTimelineEvents();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      setApplication((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast({
        title: "Status Updated",
        description: `Application status changed to ${statusConfig[newStatus as keyof typeof statusConfig]?.label}`,
      });
    }
  };

  const handleReextractQuestions = async () => {
    if (!application) return;

    setReextracting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // First, delete existing questions for this application
      const { error: deleteError } = await supabase
        .from("questions")
        .delete()
        .eq("application_id", application.id);

      if (deleteError) {
        throw new Error("Failed to clear existing questions");
      }

      // Call the edge function to extract questions
      const response = await supabase.functions.invoke('extract-job-questions', {
        body: {
          applicationId: application.id,
          jobUrl: application.url,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        const parts = [];
        if (response.data.company && response.data.position) {
          parts.push(`Updated: ${response.data.company} - ${response.data.position}`);
        }
        if (response.data.roleSummary) {
          parts.push('Role details extracted');
        }
        parts.push(`${response.data.questionsFound} questions found`);
        
        toast({
          title: "Re-extraction Complete",
          description: parts.join('. '),
        });
        
        // Refresh questions list
        await fetchApplicationData();
      } else {
        throw new Error(response.data?.error || 'Failed to extract questions');
      }
    } catch (error) {
      console.error('Error re-extracting questions:', error);
      toast({
        title: "Re-extraction Failed",
        description: error instanceof Error ? error.message : "Could not extract questions. Please try again.",
        variant: "destructive",
      });
    }

    setReextracting(false);
  };

  const handleUpdateAppliedDate = async () => {
    if (!application || !newAppliedDate) return;

    const { error } = await supabase
      .from("applications")
      .update({ applied_date: newAppliedDate })
      .eq("id", application.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update applied date",
        variant: "destructive",
      });
    } else {
      setApplication({ ...application, applied_date: newAppliedDate });
      setEditingDate(false);
      toast({
        title: "Date Updated",
        description: "Applied date has been updated successfully",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return null;
  }

  const answeredCount = questions.filter((q) => savedAnswers[q.id]?.trim()).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(application.url, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Job Posting
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Application Header */}
        <Card className="p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {application.position}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Building2 className="h-5 w-5" />
                <span className="text-xl">{application.company}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {editingDate ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={newAppliedDate}
                      onChange={(e) => setNewAppliedDate(e.target.value)}
                      className="w-40"
                    />
                    <Button size="sm" onClick={handleUpdateAppliedDate}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDate(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span>Applied on {new Date(application.applied_date).toLocaleDateString()}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingDate(true);
                        setNewAppliedDate(application.applied_date);
                      }}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Select value={application.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Role Summary */}
          {application.role_summary && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Role Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {application.role_summary.location && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Location:</span>
                    <p className="mt-1">{application.role_summary.location}</p>
                  </div>
                )}
                {application.role_summary.salary_range && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Salary Range:</span>
                    <p className="mt-1">{application.role_summary.salary_range}</p>
                  </div>
                )}
              </div>
              {application.role_summary.description && (
                <div className="mt-4">
                  <span className="text-sm font-medium text-muted-foreground">Description:</span>
                  <p className="mt-1 text-sm">{application.role_summary.description}</p>
                </div>
              )}
              {application.role_summary.responsibilities && application.role_summary.responsibilities.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm font-medium text-muted-foreground">Key Responsibilities:</span>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {application.role_summary.responsibilities.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {application.role_summary.requirements && application.role_summary.requirements.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm font-medium text-muted-foreground">Requirements:</span>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {application.role_summary.requirements.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {application.role_summary.benefits && application.role_summary.benefits.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm font-medium text-muted-foreground">Benefits:</span>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {application.role_summary.benefits.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {questions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Questions Progress</span>
                <span className="font-medium">
                  {answeredCount} / {questions.length} answered ({Math.round(progress)}%)
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          )}
        </Card>

        {/* Tabs for Questions and Timeline */}
        <Tabs defaultValue="questions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="questions">Questions & Answers</TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Timeline & Notes
            </TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Application Questions</h2>
              <Button
                onClick={handleReextractQuestions}
                disabled={reextracting}
                variant="outline"
                size="sm"
              >
                {reextracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Re-extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Re-extract Questions
                  </>
                )}
              </Button>
            </div>

          {questions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-lg">
                No questions found for this application.
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Questions are automatically extracted when you add the application.
              </p>
              <Button
                onClick={handleReextractQuestions}
                disabled={reextracting}
                variant="default"
                className="mt-4"
              >
                {reextracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Questions
                  </>
                )}
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {questions.map((question, index) => {
                const hasAnswer = savedAnswers[question.id]?.trim();
                const isModified = answers[question.id] !== savedAnswers[question.id];
                const isSaving = saving[question.id];
                const isSuggesting = suggesting[question.id];
                const isImproving = improving[question.id];
                const hasCurrentAnswer = answers[question.id]?.trim();

                return (
                  <Card key={question.id} className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <h3 className="text-lg font-semibold">{question.question_text}</h3>
                          {hasAnswer && !isModified && (
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                          )}
                        </div>
                        <Textarea
                          placeholder="Type your answer here..."
                          value={answers[question.id] || ""}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="min-h-[120px] mb-3"
                        />
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              onClick={() => handleGetSuggestion(question.id, question.question_text)}
                              disabled={isSuggesting}
                              variant="outline"
                              size="sm"
                            >
                              {isSuggesting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  AI Suggest
                                </>
                              )}
                            </Button>
                            {hasCurrentAnswer && (
                              <>
                                <Button
                                  onClick={() => handleImproveAnswer(question.id, question.question_text)}
                                  disabled={isImproving}
                                  variant="outline"
                                  size="sm"
                                >
                                  {isImproving ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <Lightbulb className="h-4 w-4 mr-2" />
                                      Improve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setCurrentQuestionForTemplate(question.id);
                                    setShowSaveTemplateDialog(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  <BookmarkPlus className="h-4 w-4 mr-2" />
                                  Save Template
                                </Button>
                              </>
                            )}
                            <Button
                              onClick={() => {
                                setCurrentQuestionForTemplate(question.id);
                                setShowBrowseTemplatesDialog(true);
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Library className="h-4 w-4 mr-2" />
                              Browse Templates
                            </Button>
                          </div>
                          <Button
                            onClick={() => handleSaveAnswer(question.id)}
                            disabled={isSaving || !isModified}
                            size="sm"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                {hasAnswer && !isModified ? "Saved" : "Save Answer"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Timeline & Notes</h2>
            <Button onClick={() => setShowAddTimelineDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>

          <TimelineView
            events={timelineEvents}
            onDelete={handleDeleteTimelineEvent}
          />
        </TabsContent>
      </Tabs>
    </main>

      {/* Answer Improvement Dialog */}
      {currentImprovement && (
        <AnswerImprovementDialog
          open={showImprovementDialog}
          onOpenChange={setShowImprovementDialog}
          strengths={currentImprovement.strengths}
          improvements={currentImprovement.improvements}
          improvedVersion={currentImprovement.improvedVersion}
          onApply={handleApplyImprovement}
        />
      )}

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={showSaveTemplateDialog}
        onOpenChange={setShowSaveTemplateDialog}
        answerText={currentQuestionForTemplate ? answers[currentQuestionForTemplate] || "" : ""}
        onSave={handleSaveAsTemplate}
      />

      {/* Browse Templates Dialog */}
      <BrowseTemplatesDialog
        open={showBrowseTemplatesDialog}
        onOpenChange={setShowBrowseTemplatesDialog}
        onApply={(templateText) => {
          if (currentQuestionForTemplate) {
            handleApplyTemplate(currentQuestionForTemplate, templateText);
          }
        }}
      />

      {/* Add Timeline Event Dialog */}
      <AddTimelineEventDialog
        open={showAddTimelineDialog}
        onOpenChange={setShowAddTimelineDialog}
        onAdd={handleAddTimelineEvent}
      />
    </div>
  );
};

export default ApplicationDetail;
