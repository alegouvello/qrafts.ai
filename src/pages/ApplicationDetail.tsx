import { useState, useEffect, useRef } from "react";
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
import { RoleFitAnalysis, RoleFitAnalysisRef } from "@/components/RoleFitAnalysis";
import { StatusHistoryTimeline } from "@/components/StatusHistoryTimeline";
import { AddInterviewerDialog } from "@/components/AddInterviewerDialog";
import { InterviewPrepCard } from "@/components/InterviewPrepCard";
import { AddQuestionDialog } from "@/components/AddQuestionDialog";
import { ResumeTailorDialog } from "@/components/ResumeTailorDialog";
import { SavedResumesDialog } from "@/components/SavedResumesDialog";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
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
  Crown,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Edit2,
  Trash2,
  X,
  FileText,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import qraftLogo from "@/assets/qrafts-logo.png";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

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

interface Interviewer {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  notes: string | null;
  extracted_data: any;
  interview_prep: any;
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const },
  interview: { label: "Interview", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
  accepted: { label: "Accepted", variant: "outline" as const },
};

const ApplicationDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [application, setApplication] = useState<Application | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [statusHistory, setStatusHistory] = useState<{ id: string; status: string; changed_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [suggesting, setSuggesting] = useState<Record<string, boolean>>({});
  const [improving, setImproving] = useState<Record<string, boolean>>({});
  const [makingNatural, setMakingNatural] = useState<Record<string, boolean>>({});
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
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false);
  const [showResumeTailorDialog, setShowResumeTailorDialog] = useState(false);
  const [showSavedResumesDialog, setShowSavedResumesDialog] = useState(false);
  const [savedTailoredResume, setSavedTailoredResume] = useState<any>(null);
  const [loadingTailoredResume, setLoadingTailoredResume] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");
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
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscribed: boolean;
    product_id: string | null;
  }>({ subscribed: false, product_id: null });
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [roleDetailsOpen, setRoleDetailsOpen] = useState(() => {
    // Default to open on desktop (width > 768px), closed on mobile
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return false;
  });
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(() => {
    // Default to all expanded on desktop, none on mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return new Set();
    }
    return new Set();
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });
  const roleFitRef = useRef<RoleFitAnalysisRef>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // If switching to desktop, expand all questions
      if (!mobile && expandedQuestions.size === 0) {
        setExpandedQuestions(new Set(questions.map(q => q.id)));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [questions, expandedQuestions.size]);

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchUserProfile();
      fetchApplicationData();
      fetchTimelineEvents();
      fetchStatusHistory();
      fetchInterviewers();
      fetchTailoredResume();
      checkSubscription();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session, skipping subscription check');
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('Error checking subscription:', error);
      } else if (data) {
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) {
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive",
      });
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

  const fetchStatusHistory = async () => {
    const { data, error } = await (supabase as any)
      .from("application_status_history")
      .select("id, status, changed_at")
      .eq("application_id", id)
      .order("changed_at", { ascending: true });

    if (error) {
      console.error("Error fetching status history:", error);
    } else {
      setStatusHistory(data || []);
    }
  };

  const fetchInterviewers = async () => {
    const { data, error } = await supabase
      .from("interviewers")
      .select("*")
      .eq("application_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching interviewers:", error);
    } else {
      setInterviewers(data || []);
    }
  };

  const fetchTailoredResume = async () => {
    if (!id) return;
    
    setLoadingTailoredResume(true);
    try {
      const { data, error } = await supabase
        .from("tailored_resumes")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching tailored resume:", error);
      } else {
        setSavedTailoredResume(data);
      }
    } catch (error) {
      console.error("Error fetching tailored resume:", error);
    } finally {
      setLoadingTailoredResume(false);
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
    
    // Check subscription status
    if (!subscriptionStatus.subscribed) {
      toast({
        title: "Pro Feature",
        description: "AI answer suggestions are available with Qraft Pro. Upgrade to get AI-powered answer suggestions.",
        variant: "destructive",
        action: (
          <Button onClick={handleUpgrade} size="sm" className="ml-auto">
            Upgrade to Pro
          </Button>
        ),
      });
      return;
    }
    
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

    // Check subscription status
    if (!subscriptionStatus.subscribed) {
      toast({
        title: "Pro Feature",
        description: "AI answer improvements are available with Qraft Pro. Upgrade to enhance your answers with AI.",
        variant: "destructive",
        action: (
          <Button onClick={handleUpgrade} size="sm" className="ml-auto">
            Upgrade to Pro
          </Button>
        ),
      });
      return;
    }

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

  const handleMakeNatural = async (questionId: string, questionText: string) => {
    if (!application) return;

    const currentAnswer = answers[questionId];
    if (!currentAnswer || currentAnswer.trim().length < 10) {
      toast({
        title: "No Answer to Rewrite",
        description: "Please write an answer first before making it more natural.",
        variant: "destructive",
      });
      return;
    }
    
    setMakingNatural((prev) => ({ ...prev, [questionId]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('improve-answer', {
        body: {
          questionText: questionText,
          currentAnswer: currentAnswer,
          company: application.company,
          position: application.position,
          resumeText: userProfile?.resume_text || undefined,
          userInstructions: "Rewrite this to sound more natural and conversational. Remove any corporate buzzwords, overly formal language, or AI-sounding phrases. Make it sound like a real person wrote it - authentic, direct, and genuine. Keep the same information but make it flow more naturally.",
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
        
        toast({
          title: "Made More Natural",
          description: "Your answer has been rewritten to sound more conversational.",
        });
      } else {
        throw new Error(response.data?.error || 'Failed to make answer more natural');
      }
    } catch (error) {
      console.error('Error making answer natural:', error);
      toast({
        title: "Rewrite Failed",
        description: error instanceof Error ? error.message : "Could not rewrite answer. Please try again.",
        variant: "destructive",
      });
    }

    setMakingNatural((prev) => ({ ...prev, [questionId]: false }));
  };

  const handleCalculateConfidence = async (questionId: string, questionText: string) => {
    if (!application) return;

    // Check subscription status
    if (!subscriptionStatus.subscribed) {
      toast({
        title: "Pro Feature",
        description: "AI answer confidence scoring is available with Qraft Pro. Upgrade to evaluate your answers.",
        variant: "destructive",
        action: (
          <Button onClick={handleUpgrade} size="sm" className="ml-auto">
            Upgrade to Pro
          </Button>
        ),
      });
      return;
    }

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
          roleDetails: {
            company: application.company,
            position: application.position,
            requirements: application.role_summary?.requirements,
            responsibilities: application.role_summary?.responsibilities,
          },
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;

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
      return;
    }

    // Record status change in history
    await (supabase as any)
      .from("application_status_history")
      .insert({
        application_id: id,
        status: newStatus,
        user_id: user.id,
      });

    setApplication((prev) => (prev ? { ...prev, status: newStatus } : null));
    
    // Refresh status history
    fetchStatusHistory();
    
    toast({
      title: "Status Updated",
      description: `Application status changed to ${statusConfig[newStatus as keyof typeof statusConfig]?.label}`,
    });
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
        toast({
          title: "Re-extraction Complete",
          description: `${response.data.questionsFound} questions found and extracted.`,
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

  const handleAddManualQuestion = async (questionText: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the highest question order
      const maxOrder = questions.length > 0 
        ? Math.max(...questions.map(q => q.question_order))
        : -1;

      // Insert the new question
      const { data: newQuestion, error: questionError } = await supabase
        .from("questions")
        .insert({
          application_id: id,
          question_text: questionText,
          question_order: maxOrder + 1,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create an empty answer for this question
      const { error: answerError } = await supabase
        .from("answers")
        .insert({
          question_id: newQuestion.id,
          user_id: user.id,
          answer_text: "",
        });

      if (answerError) throw answerError;

      // Update local state
      setQuestions([...questions, newQuestion]);
      setAnswers({ ...answers, [newQuestion.id]: "" });
      setSavedAnswers({ ...savedAnswers, [newQuestion.id]: "" });
      
      toast({
        title: "Question Added",
        description: "Your question has been added successfully.",
      });
    } catch (error) {
      console.error("Error adding question:", error);
      toast({
        title: "Error",
        description: "Failed to add question. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEditQuestion = async (questionId: string, newText: string) => {
    try {
      const { error } = await supabase
        .from("questions")
        .update({ question_text: newText })
        .eq("id", questionId);

      if (error) throw error;

      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, question_text: newText } : q
      ));

      toast({
        title: "Question Updated",
        description: "The question has been updated successfully.",
      });
    } catch (error) {
      console.error("Error editing question:", error);
      toast({
        title: "Error",
        description: "Failed to update question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      // Delete the answer first (due to foreign key constraint)
      const { error: answerError } = await supabase
        .from("answers")
        .delete()
        .eq("question_id", questionId);

      if (answerError) throw answerError;

      // Delete the question
      const { error: questionError } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      if (questionError) throw questionError;

      // Update local state
      setQuestions(questions.filter(q => q.id !== questionId));
      const newAnswers = { ...answers };
      const newSavedAnswers = { ...savedAnswers };
      delete newAnswers[questionId];
      delete newSavedAnswers[questionId];
      setAnswers(newAnswers);
      setSavedAnswers(newSavedAnswers);

      toast({
        title: "Question Deleted",
        description: "The question has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({
        title: "Error",
        description: "Failed to delete question. Please try again.",
        variant: "destructive",
      });
    }
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
      <SEO 
        title={`${application?.position || 'Application'} at ${application?.company || 'Company'}`}
        description={`Manage your job application for ${application?.position} position at ${application?.company}. Track answers, prepare for interviews, and manage your application timeline.`}
        keywords="job application details, application tracker, interview questions, job answers"
        noindex={true}
      />
      {/* Header */}
      <header className="border-b bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="rounded-full min-h-[44px]">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <img src={qraftLogo} alt="Qrafts" className="h-20 opacity-70 transition-all duration-300 hover:scale-105 hover:opacity-100 hover:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] dark:invert" />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {editingUrl ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Enter job posting URL"
                    className="w-40 sm:w-60 md:w-80 h-8"
                  />
                  <Button size="sm" onClick={handleUpdateUrl} className="h-8 min-h-[44px]">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingUrl(false)} className="h-8 min-h-[44px]">
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(application.url, "_blank")}
                    className="rounded-full min-h-[44px]"
                  >
                    <ExternalLink className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Job Page</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingUrl(true);
                      setNewUrl(application.url);
                    }}
                    className="rounded-full min-h-[44px]"
                  >
                    <span className="hidden sm:inline">Edit URL</span>
                    <span className="sm:hidden">Edit</span>
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
                  <Link to={`/company/${encodeURIComponent(application.company)}`}>
                    <p className="text-xl text-muted-foreground mb-3 hover:text-primary transition-colors">
                      {application.company}
                    </p>
                  </Link>
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
              <Collapsible open={roleDetailsOpen} onOpenChange={setRoleDetailsOpen}>
                <div className="flex items-center justify-between mb-4">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 hover:text-primary transition-colors">
                      <h3 className="font-semibold text-lg">Role Details</h3>
                      {roleDetailsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => roleFitRef.current?.analyzeRoleFit()}
                      disabled={roleFitRef.current?.loading || !userProfile?.resume_text}
                      variant="outline"
                      size="sm"
                    >
                      {roleFitRef.current?.loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI Role Fit
                        </>
                      )}
                    </Button>
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
                </div>
                <CollapsibleContent className="animate-accordion-down">
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
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* AI Role Fit Analysis */}
          {application.role_summary && (
            <RoleFitAnalysis 
              ref={roleFitRef}
              company={application.company}
              position={application.position}
              roleDetails={application.role_summary} 
              resumeText={userProfile?.resume_text || null}
              subscribed={subscriptionStatus.subscribed}
              onUpgrade={handleUpgrade}
              hideButton={true}
            />
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="interviewers">Interviewers</TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Application Questions</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAddQuestionDialog(true)}
                  variant="default"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
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
                const isMakingNatural = makingNatural[question.id];
                const hasCurrentAnswer = answers[question.id]?.trim();

                const isFileUpload = (() => {
                  const lowerQuestion = question.question_text.toLowerCase();
                  // Only treat as file upload if it explicitly asks to upload/attach
                  const hasUploadKeyword = 
                    lowerQuestion.includes('upload') ||
                    lowerQuestion.includes('attach') ||
                    lowerQuestion.includes('submit a');
                  
                  const hasFileKeyword = 
                    lowerQuestion.includes('resume') ||
                    lowerQuestion.includes('cv') ||
                    lowerQuestion.includes('cover letter');
                  
                  // Must have both upload action and file type to be file upload
                  return hasUploadKeyword && hasFileKeyword;
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

                const isExpanded = !isMobile || expandedQuestions.has(question.id);

                return (
                  <Card key={question.id} className="p-4 bg-card/30 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
                    <Collapsible open={isExpanded} onOpenChange={() => isMobile && toggleQuestion(question.id)}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold mt-0.5">
                          {index + 1}
                        </div>
                         <div className="flex-1 min-w-0 space-y-3">
                           <div className="flex items-start justify-between gap-3">
                             <CollapsibleTrigger asChild className={isMobile ? "cursor-pointer" : "cursor-default"}>
                               <div className="flex items-start gap-2 flex-1 flex-wrap">
                                 <div className="flex items-center gap-2 flex-1 min-w-0">
                                   {editingQuestionId === question.id ? (
                                     <Input
                                       value={editingQuestionText}
                                       onChange={(e) => setEditingQuestionText(e.target.value)}
                                       onClick={(e) => e.stopPropagation()}
                                       className="flex-1"
                                     />
                                   ) : (
                                     <h3 className="font-medium leading-tight flex-1 min-w-0">{question.question_text}</h3>
                                   )}
                                   {editingQuestionId === question.id ? (
                                     <div className="flex gap-1 flex-shrink-0">
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={async (e) => {
                                           e.stopPropagation();
                                           await handleEditQuestion(question.id, editingQuestionText);
                                           setEditingQuestionId(null);
                                         }}
                                       >
                                         <Check className="h-4 w-4" />
                                       </Button>
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setEditingQuestionId(null);
                                         }}
                                       >
                                         <X className="h-4 w-4" />
                                       </Button>
                                     </div>
                                   ) : (
                                     <div className="flex gap-1 flex-shrink-0">
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setEditingQuestionId(question.id);
                                           setEditingQuestionText(question.question_text);
                                         }}
                                       >
                                         <Edit2 className="h-4 w-4" />
                                       </Button>
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           if (confirm("Are you sure you want to delete this question?")) {
                                             handleDeleteQuestion(question.id);
                                           }
                                         }}
                                       >
                                         <Trash2 className="h-4 w-4" />
                                       </Button>
                                     </div>
                                   )}
                                   {isMobile && (
                                     <button className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors">
                                       {isExpanded ? (
                                         <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                       ) : (
                                         <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                       )}
                                     </button>
                                   )}
                                 </div>
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedConfidence(
                                        expandedConfidence === question.id ? null : question.id
                                      );
                                    }}
                                  >
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    ~{confidenceScores[question.id].score}% fit
                                  </Badge>
                                )}
                              </div>
                            </CollapsibleTrigger>
                            {hasAnswer && !isModified && (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                        
                          <CollapsibleContent className="animate-accordion-down">
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
                                onClick={() => handleMakeNatural(question.id, question.question_text)}
                                disabled={isMakingNatural}
                                variant="outline"
                                size="sm"
                              >
                                {isMakingNatural ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                    Rewriting...
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="h-3 w-3 mr-1.5" />
                                    More Natural
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
                          </CollapsibleContent>
                        </div>
                      </div>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
          </TabsContent>

          {/* Resume Tab */}
          <TabsContent value="resume" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Resume Tailoring</h2>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered suggestions to tailor your resume for this specific role
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowSavedResumesDialog(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Library className="h-4 w-4" />
                  View All
                </Button>
                <Button 
                  onClick={() => setShowResumeTailorDialog(true)}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {savedTailoredResume ? 'Update Resume' : 'Tailor Resume'}
                </Button>
              </div>
            </div>

            {loadingTailoredResume ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </Card>
            ) : savedTailoredResume ? (
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Tailored Resume</h3>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(savedTailoredResume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(savedTailoredResume.resume_text);
                        toast({
                          title: "Copied",
                          description: "Resume copied to clipboard",
                        });
                      }}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResumeTailorDialog(true)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert max-h-[600px] overflow-y-auto">
                  <ReactMarkdown>{savedTailoredResume.resume_text}</ReactMarkdown>
                </div>
              </Card>
            ) : (
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">How Resume Tailoring Works</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Our AI analyzes your resume alongside the job description and requirements for {application?.position} at {application?.company}. 
                      It provides specific, actionable suggestions to:
                    </p>
                  </div>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Highlight relevant experience and skills that match the role</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Incorporate keywords from the job description to pass ATS screening</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Quantify your achievements and demonstrate measurable impact</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Restructure sections to emphasize your strongest qualifications</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
            )}
          </TabsContent>

          {/* Interviewers Tab */}
          <TabsContent value="interviewers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Interview Preparation</h2>
              {application && (
                <AddInterviewerDialog 
                  applicationId={application.id}
                  applicationCompany={application.company}
                  onInterviewerAdded={fetchInterviewers}
                />
              )}
            </div>

            {interviewers.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground text-lg mb-2">
                  No interviewers added yet
                </p>
                <p className="text-muted-foreground text-sm">
                  Add interviewers to get AI-powered interview prep based on their background and your resume
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {interviewers.map((interviewer) => (
                  <InterviewPrepCard
                    key={interviewer.id}
                    interviewer={interviewer}
                    onDelete={fetchInterviewers}
                    onPrepGenerated={fetchInterviewers}
                  />
                ))}
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

          {/* Status History Timeline */}
          {application && statusHistory.length > 0 && (
            <StatusHistoryTimeline 
              history={statusHistory}
              appliedDate={application.applied_date}
            />
          )}

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

      {/* Add Question Dialog */}
      <AddQuestionDialog
        open={showAddQuestionDialog}
        onOpenChange={setShowAddQuestionDialog}
        onAdd={handleAddManualQuestion}
      />

      {/* Resume Tailor Dialog */}
      {application && (
        <ResumeTailorDialog
          open={showResumeTailorDialog}
          onOpenChange={(open) => {
            setShowResumeTailorDialog(open);
            if (!open) {
              // Refresh the tailored resume when dialog closes
              fetchTailoredResume();
            }
          }}
          application={application}
        />
      )}

      {/* Saved Resumes Dialog */}
      <SavedResumesDialog
        open={showSavedResumesDialog}
        onOpenChange={setShowSavedResumesDialog}
      />
      
      <Footer />
    </div>
  );
};

export default ApplicationDetail;
