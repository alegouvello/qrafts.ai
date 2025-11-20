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
import { RoleFitAnalysis } from "@/components/RoleFitAnalysis";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
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
  TrendingUp,
  Info,
  Copy,
  Check,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import qraftLogo from "@/assets/qraft-logo-original.png";

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
  const [calculatingConfidence, setCalculatingConfidence] = useState<Record<string, boolean>>({});
  const [confidenceScores, setConfidenceScores] = useState<Record<string, { score: number; reasoning: string; suggestions?: string }>>({});
  const [expandedConfidence, setExpandedConfidence] = useState<string | null>(null);
  const [applyingSuggestion, setApplyingSuggestion] = useState<Record<string, boolean>>({});
  const [copiedAnswers, setCopiedAnswers] = useState<Record<string, boolean>>({});
  const [reextracting, setReextracting] = useState(false);
  const [refreshingDescription, setRefreshingDescription] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [newAppliedDate, setNewAppliedDate] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState("");
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
  const [logoError, setLogoError] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    location?: string;
    resume_text?: string;
  } | null>(null);
  const [autoPopulatedAnswers, setAutoPopulatedAnswers] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchUserProfile();
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

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_profiles")
      .select("full_name, email, phone, linkedin_url, location, resume_text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setUserProfile(data);
    }
  };

  const autoSuggestFromProfile = (questionText: string): string | null => {
    if (!userProfile) return null;

    const lowerQuestion = questionText.toLowerCase();

    // LinkedIn URL
    if (lowerQuestion.includes('linkedin')) {
      return userProfile.linkedin_url || null;
    }

    // Email
    if (lowerQuestion.includes('email') && !lowerQuestion.includes('phone')) {
      return userProfile.email || null;
    }

    // Phone
    if (lowerQuestion.includes('phone') || lowerQuestion.includes('mobile') || 
        lowerQuestion.includes('contact number')) {
      return userProfile.phone || null;
    }

    // Full name
    if (lowerQuestion.includes('full name') || lowerQuestion === 'name') {
      return userProfile.full_name || null;
    }

    // First name
    if (lowerQuestion.includes('first name')) {
      return userProfile.full_name?.split(' ')[0] || null;
    }

    // Last name
    if (lowerQuestion.includes('last name') || lowerQuestion.includes('surname')) {
      const nameParts = userProfile.full_name?.split(' ');
      return nameParts && nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    }

    // Location
    if (lowerQuestion.includes('location') || lowerQuestion.includes('city') || 
        lowerQuestion.includes('where do you live') || lowerQuestion.includes('based')) {
      return userProfile.location || null;
    }

    return null;
  };

  const autoSuggestFromPreviousAnswers = async (questionText: string): Promise<string | null> => {
    if (!questionText) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const lowerQuestion = questionText.toLowerCase().trim();

    // First, check master answers
    const { data: masterAnswers } = await supabase
      .from('master_answers')
      .select('*')
      .eq('user_id', user.id);

    if (masterAnswers && masterAnswers.length > 0) {
      // Try exact match first
      const exactMatch = masterAnswers.find(ma => 
        ma.question_pattern.toLowerCase().trim() === lowerQuestion
      );
      if (exactMatch) return exactMatch.answer_text;

      // Try keyword match
      const keywordMatch = masterAnswers.find(ma => {
        const pattern = ma.question_pattern.toLowerCase();
        const questionWords = lowerQuestion.split(' ').filter(w => w.length > 3);
        const patternWords = pattern.split(' ').filter(w => w.length > 3);
        
        // Check if most key words match
        const matchCount = questionWords.filter(w => patternWords.some(pw => pw.includes(w) || w.includes(pw))).length;
        return matchCount >= Math.min(3, questionWords.length / 2);
      });
      if (keywordMatch) return keywordMatch.answer_text;
    }

    // If no master answer, check previous answers from other applications
    const { data: allAnswers } = await supabase
      .from('answers')
      .select('answer_text, questions!inner(question_text)')
      .eq('user_id', user.id)
      .not('answer_text', 'is', null);

    if (!allAnswers || allAnswers.length === 0) return null;
    
    // Try exact match first
    const exactMatch = allAnswers.find(a => 
      a.questions?.question_text?.toLowerCase().trim() === lowerQuestion
    );
    if (exactMatch?.answer_text) return exactMatch.answer_text;

    // Try fuzzy match - if question texts are very similar
    const similarMatch = allAnswers.find(a => {
      const prevQuestion = a.questions?.question_text?.toLowerCase().trim();
      if (!prevQuestion) return false;
      
      // Check if one contains the other (for minor variations)
      return prevQuestion.includes(lowerQuestion) || lowerQuestion.includes(prevQuestion);
    });
    
    return similarMatch?.answer_text || null;
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

        const answersMap: Record<string, string> = {};
        
        if (answersData) {
          answersData.forEach((answer) => {
            answersMap[answer.question_id] = answer.answer_text || "";
          });
        }

        // Auto-suggest from profile and previous answers for empty answers
        const autoPopulated = new Set<string>();
        
        for (const question of questionsData) {
          if (!answersMap[question.id]) {
            // Try profile first
            let suggestion = autoSuggestFromProfile(question.question_text);
            
            // If no profile match, try previous answers
            if (!suggestion) {
              suggestion = await autoSuggestFromPreviousAnswers(question.question_text);
            }
            
            if (suggestion) {
              answersMap[question.id] = suggestion;
              autoPopulated.add(question.id);
            }
          }
        }
        
        setAutoPopulatedAnswers(autoPopulated);

        setAnswers(answersMap);
        setSavedAnswers(answersData ? answersData.reduce((acc, answer) => {
          acc[answer.question_id] = answer.answer_text || "";
          return acc;
        }, {} as Record<string, string>) : {});
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
    // Remove from auto-populated set when user edits
    if (autoPopulatedAnswers.has(questionId)) {
      setAutoPopulatedAnswers(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
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

  const handleImproveAnswer = async (questionId: string, questionText: string, userInstructions?: string) => {
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
          resumeText: userProfile?.resume_text || undefined,
          userInstructions: userInstructions || undefined,
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

  const handleRegenerateImprovement = async (userInstructions: string) => {
    if (!currentImprovement) return;
    
    await handleImproveAnswer(currentImprovement.questionId, 
      questions.find(q => q.id === currentImprovement.questionId)?.question_text || '', 
      userInstructions
    );
  };

  const handleCalculateConfidence = async (questionId: string, questionText: string) => {
    if (!application) return;

    const currentAnswer = answers[questionId];
    if (!currentAnswer || currentAnswer.trim().length < 10) {
      toast({
        title: "No Answer to Evaluate",
        description: "Please write an answer first before calculating confidence.",
        variant: "destructive",
      });
      return;
    }

    setCalculatingConfidence((prev) => ({ ...prev, [questionId]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('calculate-answer-confidence', {
        body: {
          questionText: questionText,
          answerText: currentAnswer,
          roleDetails: application.role_summary,
          resumeText: userProfile?.resume_text || undefined,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setConfidenceScores((prev) => ({
          ...prev,
          [questionId]: {
            score: response.data.score,
            reasoning: response.data.reasoning,
            suggestions: response.data.suggestions,
          },
        }));
        
        // Auto-expand the confidence details
        setExpandedConfidence(questionId);
        
        toast({
          title: "Confidence Score Calculated",
          description: `Score: ${response.data.score}/100`,
        });
      } else {
        throw new Error(response.data?.error || 'Failed to calculate confidence');
      }
    } catch (error) {
      console.error('Error calculating confidence:', error);
      toast({
        title: "Calculation Failed",
        description: error instanceof Error ? error.message : "Could not calculate confidence. Please try again.",
        variant: "destructive",
      });
    }

    setCalculatingConfidence((prev) => ({ ...prev, [questionId]: false }));
  };

  const handleQuickApplySuggestion = async (questionId: string, questionText: string) => {
    if (!application) return;

    const currentAnswer = answers[questionId];
    const suggestions = confidenceScores[questionId]?.suggestions;
    
    if (!currentAnswer || !suggestions) {
      toast({
        title: "Cannot Apply",
        description: "No suggestions available to apply.",
        variant: "destructive",
      });
      return;
    }

    setApplyingSuggestion((prev) => ({ ...prev, [questionId]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('improve-answer', {
        body: {
          questionText: questionText,
          currentAnswer: currentAnswer,
          company: application.company,
          position: application.position,
          resumeText: userProfile?.resume_text || "",
          userInstructions: `Incorporate these specific improvements:\n${suggestions}`,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success && response.data.improvedVersion) {
        setAnswers((prev) => ({ ...prev, [questionId]: response.data.improvedVersion }));
        // Clear the confidence score so user can re-check after applying
        setConfidenceScores((prev) => {
          const updated = { ...prev };
          delete updated[questionId];
          return updated;
        });
        setExpandedConfidence(null);
        
        toast({
          title: "Suggestions Applied",
          description: "Your answer has been improved. Review and save the changes.",
        });
      } else {
        throw new Error(response.data?.error || 'Failed to apply suggestions');
      }
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast({
        title: "Application Failed",
        description: error instanceof Error ? error.message : "Could not apply suggestions. Please try again.",
        variant: "destructive",
      });
    }

    setApplyingSuggestion((prev) => ({ ...prev, [questionId]: false }));
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

  const handleCopyAnswer = async (questionId: string) => {
    const answerText = answers[questionId];
    if (!answerText) return;

    try {
      await navigator.clipboard.writeText(answerText);
      setCopiedAnswers(prev => ({ ...prev, [questionId]: true }));
      toast({
        title: "Copied to clipboard",
        description: "Answer copied successfully",
      });
      setTimeout(() => {
        setCopiedAnswers(prev => ({ ...prev, [questionId]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy answer",
        variant: "destructive",
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
        
        // Wait a moment for database to fully update, then refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload the entire page data
        window.location.reload();
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

  const handleUpdateUrl = async () => {
    if (!application || !newUrl) return;

    const { error } = await supabase
      .from("applications")
      .update({ url: newUrl })
      .eq("id", application.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update job URL",
        variant: "destructive",
      });
    } else {
      setApplication({ ...application, url: newUrl });
      setEditingUrl(false);
      toast({
        title: "URL Updated",
        description: "Job posting URL has been updated successfully",
      });
    }
  };

  const handleRefreshJobDescription = async () => {
    if (!application) return;

    setRefreshingDescription(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call the edge function to refresh job description only
      const response = await supabase.functions.invoke('refresh-job-description', {
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
        // Update the application with new data
        const updatedApp = { ...application };
        if (response.data.company) updatedApp.company = response.data.company;
        if (response.data.position) updatedApp.position = response.data.position;
        if (response.data.roleSummary) updatedApp.role_summary = response.data.roleSummary;
        
        setApplication(updatedApp);
        
        toast({
          title: "Description Refreshed",
          description: "Job description has been updated from the new URL.",
        });
      } else {
        throw new Error(response.data?.error || 'Failed to refresh description');
      }
    } catch (error) {
      console.error('Error refreshing description:', error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Could not refresh job description. Please try again.",
        variant: "destructive",
      });
    }

    setRefreshingDescription(false);
  };


  // Get company logo
  const getCompanyLogo = (company: string) => {
    const domain = company.toLowerCase().replace(/\s+/g, '') + '.com';
    return `https://logo.clearbit.com/${domain}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return null;
  }

  // Helper to identify file upload questions
  const isFileUploadQuestion = (questionText: string) => {
    const lower = questionText.toLowerCase();
    return lower.includes('resume') || lower.includes('cv') || 
           lower.includes('cover letter') || lower.includes('upload') || 
           lower.includes('attach');
  };

  // Filter out file upload questions from progress tracking
  const textQuestions = questions.filter(q => !isFileUploadQuestion(q.question_text));
  const answeredCount = textQuestions.filter((q) => savedAnswers[q.id]?.trim()).length;
  const progress = textQuestions.length > 0 ? (answeredCount / textQuestions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="rounded-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <img src={qraftLogo} alt="QRAFT.AI" className="h-9 opacity-70" />
            </div>
            <div className="flex items-center gap-2">
              {editingUrl ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Enter job posting URL"
                    className="w-80 h-8"
                  />
                  <Button size="sm" onClick={handleUpdateUrl} className="h-8">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingUrl(false)} className="h-8">
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(application.url, "_blank")}
                    className="rounded-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Job Page
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingUrl(true);
                      setNewUrl(application.url);
                    }}
                    className="rounded-full"
                  >
                    Edit URL
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Application Header */}
        <div className="mb-8">
          <div className="flex items-start gap-6 mb-6">
            {/* Company Logo */}
            <div className="shrink-0">
              {!logoError ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted/30 flex items-center justify-center border border-border/50">
                  <img 
                    src={getCompanyLogo(application.company)}
                    alt={application.company}
                    className="w-full h-full object-contain p-3"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border/50">
                  <span className="text-3xl font-bold text-primary">
                    {application.company.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Company & Position Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold mb-2 truncate">{application.position}</h1>
                  <p className="text-xl text-muted-foreground mb-3">{application.company}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Select value={application.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-32 h-8 text-xs">
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

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {editingDate ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={newAppliedDate}
                      onChange={(e) => setNewAppliedDate(e.target.value)}
                      className="w-40 h-8"
                    />
                    <Button size="sm" onClick={handleUpdateAppliedDate} className="h-8">
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDate(false)} className="h-8">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNewAppliedDate(application.applied_date);
                      setEditingDate(true);
                    }}
                    className="hover:text-foreground transition-colors"
                  >
                    Applied {application.applied_date}
                  </button>
                )}
              </div>

              {/* Progress */}
              {textQuestions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {answeredCount} / {textQuestions.length} answered
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
          </div>

          {/* Role Details */}
          {application.role_summary && (
            <Card className="p-6 bg-card/30 backdrop-blur-sm border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Role Details</h3>
                <Button
                  onClick={handleRefreshJobDescription}
                  disabled={refreshingDescription}
                  variant="outline"
                  size="sm"
                >
                  {refreshingDescription ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Refresh Description
                    </>
                  )}
                </Button>
              </div>
              <div className="grid gap-4">
                {(application.role_summary.location || application.role_summary.salary_range) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {application.role_summary.location && (
                      <div>
                        <span className="text-sm text-muted-foreground">Location</span>
                        <p className="font-medium">{application.role_summary.location}</p>
                      </div>
                    )}
                    {application.role_summary.salary_range && (
                      <div>
                        <span className="text-sm text-muted-foreground">Salary Range</span>
                        <p className="font-medium">{application.role_summary.salary_range}</p>
                      </div>
                    )}
                  </div>
                )}
                {application.role_summary.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="text-sm mt-1 leading-relaxed">{application.role_summary.description}</p>
                  </div>
                )}
                {application.role_summary.responsibilities && application.role_summary.responsibilities.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Key Responsibilities</span>
                    <ul className="mt-2 space-y-1">
                      {application.role_summary.responsibilities.map((item, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {application.role_summary.requirements && application.role_summary.requirements.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Requirements</span>
                    <ul className="mt-2 space-y-1">
                      {application.role_summary.requirements.map((item, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {application.role_summary.benefits && application.role_summary.benefits.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Benefits</span>
                    <ul className="mt-2 space-y-1">
                      {application.role_summary.benefits.map((item, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* AI Role Fit Analysis */}
          {application.role_summary && (
            <RoleFitAnalysis 
              roleDetails={application.role_summary} 
              resumeText={userProfile?.resume_text || null}
            />
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
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

                const isFileUpload = (() => {
                  const lowerQuestion = question.question_text.toLowerCase();
                  return (
                    lowerQuestion.includes('resume') ||
                    lowerQuestion.includes('cv') ||
                    lowerQuestion.includes('cover letter') ||
                    lowerQuestion.includes('upload') ||
                    lowerQuestion.includes('attach')
                  );
                })();

                const isShortAnswer = (() => {
                  const lowerQuestion = question.question_text.toLowerCase();
                  const questionWords = lowerQuestion.split(' ').length;
                  
                  // Yes/no questions and short field questions
                  const isYesNoQuestion = 
                    lowerQuestion.includes('are you') ||
                    lowerQuestion.includes('do you') ||
                    lowerQuestion.includes('will you') ||
                    lowerQuestion.includes('have you') ||
                    lowerQuestion.includes('can you') ||
                    (lowerQuestion.includes('?') && questionWords > 5);
                  
                  const isShortField = 
                    lowerQuestion.includes('first name') ||
                    lowerQuestion.includes('last name') ||
                    lowerQuestion.includes('email') ||
                    lowerQuestion.includes('phone') ||
                    lowerQuestion.includes('linkedin') ||
                    lowerQuestion.includes('github') ||
                    lowerQuestion.includes('portfolio') ||
                    lowerQuestion.includes('website') ||
                    lowerQuestion.includes('location') ||
                    lowerQuestion.includes('city') ||
                    lowerQuestion.includes('office') ||
                    (lowerQuestion === 'name' || lowerQuestion.includes('your name'));
                  
                  return (isYesNoQuestion || isShortField) && (answers[question.id] || '').length < 150;
                })();

                return (
                  <Card key={question.id} className="p-4 bg-card/30 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1 flex-wrap">
                            <h3 className="font-medium leading-tight flex-1 min-w-0">{question.question_text}</h3>
                            {autoPopulatedAnswers.has(question.id) && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Auto-filled
                              </Badge>
                            )}
                            {confidenceScores[question.id] && (
                              <Badge 
                                variant={
                                  confidenceScores[question.id].score >= 80 ? "default" :
                                  confidenceScores[question.id].score >= 60 ? "secondary" :
                                  "destructive"
                                }
                                className="text-xs flex-shrink-0 cursor-pointer"
                                onClick={() => setExpandedConfidence(
                                  expandedConfidence === question.id ? null : question.id
                                )}
                              >
                                <TrendingUp className="w-3 h-3 mr-1" />
                                ~{confidenceScores[question.id].score}% fit
                              </Badge>
                            )}
                          </div>
                          {hasAnswer && !isModified && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        
                        {/* Confidence Score Details */}
                        {confidenceScores[question.id] && expandedConfidence === question.id && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <div className="space-y-2 flex-1">
                                <p className="text-sm text-foreground">
                                  <span className="font-medium">Analysis:</span> {confidenceScores[question.id].reasoning}
                                </p>
                                {confidenceScores[question.id].suggestions && confidenceScores[question.id].score < 100 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-foreground">Suggestions to improve:</p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleQuickApplySuggestion(question.id, question.question_text)}
                                        disabled={applyingSuggestion[question.id]}
                                        className="h-7 text-xs"
                                      >
                                        {applyingSuggestion[question.id] ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            Applying...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Quick Apply
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                                      {confidenceScores[question.id].suggestions}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Your Answer</span>
                            {hasCurrentAnswer && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyAnswer(question.id)}
                                className="h-8"
                              >
                                {copiedAnswers[question.id] ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                          {isFileUpload ? (
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">
                                File upload - Please upload directly on the application form
                              </div>
                              <Input
                                placeholder="Or paste file URL here..."
                                value={answers[question.id] || ""}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              />
                            </div>
                          ) : isShortAnswer ? (
                            <Input
                              placeholder="Type your answer here..."
                              value={answers[question.id] || ""}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            />
                          ) : (
                            <Textarea
                              placeholder="Type your answer here..."
                              value={answers[question.id] || ""}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="min-h-[100px]"
                            />
                          )}
                        </div>
                        {!isFileUpload && (
                        <div className="flex gap-2 flex-wrap items-center">
                          <Button
                            onClick={() => handleGetSuggestion(question.id, question.question_text)}
                            disabled={isSuggesting}
                            variant="outline"
                            size="sm"
                          >
                            {isSuggesting ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1.5" />
                                AI Suggest
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setCurrentQuestionForTemplate(question.id);
                              setShowBrowseTemplatesDialog(true);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Library className="h-3 w-3 mr-1.5" />
                            Templates
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
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    <Lightbulb className="h-3 w-3 mr-1.5" />
                                    Improve
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleCalculateConfidence(question.id, question.question_text)}
                                disabled={calculatingConfidence[question.id]}
                                variant="outline"
                                size="sm"
                              >
                                {calculatingConfidence[question.id] ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                    Calculating...
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="h-3 w-3 mr-1.5" />
                                    Check Fit
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
                                <BookmarkPlus className="h-3 w-3 mr-1.5" />
                                Save
                              </Button>
                            </>
                          )}
                          <Button
                            onClick={() => handleSaveAnswer(question.id)}
                            disabled={isSaving || !isModified}
                            size="sm"
                            className="ml-auto"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3 mr-1.5" />
                                Save Answer
                              </>
                            )}
                          </Button>
                         </div>
                        )}
                       </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Timeline & Notes</h2>
              <Button onClick={() => setShowAddTimelineDialog(true)} className="rounded-full">
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
          onRegenerate={handleRegenerateImprovement}
          isRegenerating={improving[currentImprovement.questionId]}
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
