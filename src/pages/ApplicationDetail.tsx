import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { deriveCompanyDomain } from "@/utils/jobBoardPatterns";
import { useAuthGuard } from "@/hooks/useAuthGuard";
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
import { RoleFitAnalysis, RoleFitAnalysisRef } from "@/components/RoleFitAnalysis";
import { AddQuestionDialog } from "@/components/AddQuestionDialog";
import { ResumeTailorDialog } from "@/components/ResumeTailorDialog";
import { SavedResumesDialog } from "@/components/SavedResumesDialog";
import { UploadCustomResumeDialog } from "@/components/UploadCustomResumeDialog";
import { NaturalToneDialog } from "@/components/NaturalToneDialog";
import { QuestionCard } from "@/components/ApplicationDetail/QuestionCard";
import { ResumeTab } from "@/components/ApplicationDetail/ResumeTab";
import { InterviewersTab } from "@/components/ApplicationDetail/InterviewersTab";
import { TimelineTab } from "@/components/ApplicationDetail/TimelineTab";
import { RoleDetailsCard } from "@/components/ApplicationDetail/RoleDetailsCard";
import { useToast } from "@/hooks/use-toast";
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
  Upload,
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
  company_domain?: string | null;
  role_summary?: {
    location?: string;
    salary_range?: string;
    description?: string;
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
  };
}

// Common job board hostnames to ignore when deriving company domain
// JOB_BOARD_PATTERNS and deriveCompanyDomain imported from shared utility

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
  useAuthGuard();
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
  const [showUploadResumeDialog, setShowUploadResumeDialog] = useState(false);
  const [showNaturalToneDialog, setShowNaturalToneDialog] = useState(false);
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
  const [currentNaturalPreview, setCurrentNaturalPreview] = useState<{
    questionId: string;
    originalAnswer: string;
    naturalAnswer: string;
  } | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string>("");
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
    is_trialing?: boolean;
  }>({ subscribed: false, product_id: null, is_trialing: false });
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [sharedQuestions, setSharedQuestions] = useState<{ question_text: string; created_at: string }[]>([]);
  const [showSharedQuestions, setShowSharedQuestions] = useState(false);
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
    if (id) {
      fetchUserProfile();
      fetchApplicationData();
      fetchTimelineEvents();
      fetchStatusHistory();
      fetchInterviewers();
      fetchSharedQuestions();
      fetchTailoredResume();
      checkSubscription();
    }
  }, [id]);




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
    
    // Check subscription status (allow if subscribed OR trialing)
    const hasAccess = subscriptionStatus.subscribed || subscriptionStatus.is_trialing;
    if (!hasAccess) {
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

    // Check subscription status (allow if subscribed OR trialing)
    const hasAccess = subscriptionStatus.subscribed || subscriptionStatus.is_trialing;
    if (!hasAccess) {
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
        title: "Add an answer first",
        description: "Please write an answer before making it more natural.",
        variant: "destructive",
      });
      return;
    }

    setMakingNatural((prev) => ({ ...prev, [questionId]: true }));

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('resume_text')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const response = await supabase.functions.invoke('improve-answer', {
        body: {
          questionText: questionText,
          currentAnswer: currentAnswer,
          company: application.company,
          position: application.position,
          resumeText: profile?.resume_text || '',
          userInstructions: "Rewrite this to sound more natural and conversational. Remove any corporate buzzwords, overly formal language, or AI-sounding phrases. Make it sound like a real person wrote it - authentic, direct, and genuine. Keep the same information but make it flow more naturally.",
          formalityLevel: 2, // Default to balanced
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success && response.data.improvedVersion) {
        // Show preview dialog instead of directly applying
        setCurrentNaturalPreview({
          questionId: questionId,
          originalAnswer: currentAnswer,
          naturalAnswer: response.data.improvedVersion,
        });
        setShowNaturalToneDialog(true);
      } else {
        throw new Error(response.data?.error || 'Failed to make answer more natural');
      }
    } catch (error) {
      console.error('Error making answer natural:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to make answer more natural. Please try again.",
        variant: "destructive",
      });
    }

    setMakingNatural((prev) => ({ ...prev, [questionId]: false }));
  };

  const handleRegenerateNaturalTone = async (formalityLevel: number) => {
    if (!application || !currentNaturalPreview) return;

    const questionText = questions.find(q => q.id === currentNaturalPreview.questionId)?.question_text || '';
    
    setMakingNatural((prev) => ({ ...prev, [currentNaturalPreview.questionId]: true }));

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('resume_text')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const formalityInstructions = [
        "Rewrite this in a very casual, friendly tone - like you're talking to a friend. Use contractions, simple words, and a relaxed style.",
        "Rewrite this in a casual but clear tone. Keep it conversational and approachable while staying professional enough for a job application.",
        "Rewrite this to sound natural and conversational. Balance professionalism with authenticity. Remove corporate buzzwords and overly formal language.",
        "Rewrite this in a professional but personable tone. Use clear, direct language with appropriate business terminology while maintaining warmth.",
        "Rewrite this in a very professional, polished tone. Use sophisticated vocabulary and formal structure appropriate for senior positions."
      ];

      const response = await supabase.functions.invoke('improve-answer', {
        body: {
          questionText: questionText,
          currentAnswer: currentNaturalPreview.originalAnswer,
          company: application.company,
          position: application.position,
          resumeText: profile?.resume_text || '',
          userInstructions: formalityInstructions[formalityLevel],
          formalityLevel: formalityLevel,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success && response.data.improvedVersion) {
        setCurrentNaturalPreview({
          ...currentNaturalPreview,
          naturalAnswer: response.data.improvedVersion,
        });
      } else {
        throw new Error(response.data?.error || 'Failed to regenerate with new tone');
      }
    } catch (error) {
      console.error('Error regenerating natural tone:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate with new tone. Please try again.",
        variant: "destructive",
      });
    }

    setMakingNatural((prev) => ({ ...prev, [currentNaturalPreview.questionId]: false }));
  };

  const handleApplyNaturalTone = () => {
    if (!currentNaturalPreview) return;

    setAnswers((prev) => ({
      ...prev,
      [currentNaturalPreview.questionId]: currentNaturalPreview.naturalAnswer,
    }));

    toast({
      title: "Natural Version Applied",
      description: "The more conversational version has been applied. Don't forget to save!",
    });

    setShowNaturalToneDialog(false);
    setCurrentNaturalPreview(null);
  };

  const handleCalculateConfidence = async (questionId: string, questionText: string) => {
    if (!application) return;

    // Check subscription status (allow if subscribed OR trialing)
    const hasAccess = subscriptionStatus.subscribed || subscriptionStatus.is_trialing;
    if (!hasAccess) {
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

  const fetchSharedQuestions = async () => {
    if (!application && !id) return;
    // We need app data; if not loaded yet, fetch it
    const { data: appData } = await supabase
      .from("applications")
      .select("company, position")
      .eq("id", id)
      .single();

    if (!appData) return;

    const { data, error } = await (supabase as any)
      .from("shared_questions")
      .select("question_text, created_at")
      .eq("company", appData.company)
      .eq("position", appData.position)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching shared questions:", error);
    } else {
      // Filter out questions that already exist in this application's questions
      const existingTexts = new Set(questions.map(q => q.question_text.toLowerCase().trim()));
      const unique = (data || []).filter(
        (sq: any) => !existingTexts.has(sq.question_text.toLowerCase().trim())
      );
      setSharedQuestions(unique);
    }
  };

  // Shared questions JSX rendered inside questions tab below

  // Get company logo domain - use stored domain or derive it
  const logoDomain = application?.company_domain || 
    (application ? deriveCompanyDomain(application.url, application.company) : "");

  // Set up logo source when application changes
  useEffect(() => {
    if (logoDomain) {
      setLogoError(false);
      setLogoSrc(`https://logo.clearbit.com/${logoDomain}`);
    }
  }, [logoDomain]);

  // Handle logo error with Google favicon fallback
  const handleLogoError = () => {
    const googleFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(logoDomain)}&sz=128`;
    if (logoSrc !== googleFavicon) {
      setLogoSrc(googleFavicon);
      return;
    }
    setLogoError(true);
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
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
        {/* Application Header */}
        <div className="mb-8">
          <div className="flex items-start gap-3 sm:gap-6 mb-6">
            {/* Company Logo */}
            <div className="shrink-0">
              {!logoError && logoSrc ? (
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted/30 flex items-center justify-center border border-border/50">
                  <img 
                    src={logoSrc}
                    alt={`${application.company} logo`}
                    className="w-full h-full object-contain p-3"
                    loading="lazy"
                    onError={handleLogoError}
                  />
                </div>
              ) : (
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border/50">
                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                    {application.company.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Company & Position Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 truncate">{application.position}</h1>
                  <Link to={`/company/${encodeURIComponent(application.company)}`}>
                    <p className="text-base sm:text-xl text-muted-foreground mb-2 sm:mb-3 hover:text-primary transition-colors">
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
            <RoleDetailsCard
              roleSummary={application.role_summary}
              company={application.company}
              position={application.position}
              roleDetailsOpen={roleDetailsOpen}
              onRoleDetailsOpenChange={setRoleDetailsOpen}
              roleFitRef={roleFitRef}
              resumeText={userProfile?.resume_text || null}
              subscribed={subscriptionStatus.subscribed || subscriptionStatus.is_trialing}
              onUpgrade={handleUpgrade}
              refreshingDescription={refreshingDescription}
              onRefreshJobDescription={handleRefreshJobDescription}
            />
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-muted/30 w-full justify-start overflow-x-auto">
            <TabsTrigger value="questions" className="relative">
              Questions
              {sharedQuestions.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 text-xs">
                  +{sharedQuestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="interviewers">Interviewers</TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Application Questions</h2>
              <div className="flex gap-2 w-full sm:w-auto">
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
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  answer={answers[question.id] || ""}
                  savedAnswer={savedAnswers[question.id] || ""}
                  isMobile={isMobile}
                  isExpanded={!isMobile || expandedQuestions.has(question.id)}
                  confidenceScore={confidenceScores[question.id]}
                  expandedConfidence={expandedConfidence}
                  isAutoPopulated={autoPopulatedAnswers.has(question.id)}
                  isCopied={copiedAnswers[question.id] || false}
                  isSaving={saving[question.id] || false}
                  isSuggesting={suggesting[question.id] || false}
                  isImproving={improving[question.id] || false}
                  isMakingNatural={makingNatural[question.id] || false}
                  isCalculatingConfidence={calculatingConfidence[question.id] || false}
                  isApplyingSuggestion={applyingSuggestion[question.id] || false}
                  editingQuestionId={editingQuestionId}
                  editingQuestionText={editingQuestionText}
                  onToggleQuestion={toggleQuestion}
                  onAnswerChange={handleAnswerChange}
                  onSaveAnswer={handleSaveAnswer}
                  onGetSuggestion={handleGetSuggestion}
                  onImproveAnswer={(qId, qText) => handleImproveAnswer(qId, qText)}
                  onMakeNatural={handleMakeNatural}
                  onCalculateConfidence={handleCalculateConfidence}
                  onQuickApplySuggestion={handleQuickApplySuggestion}
                  onCopyAnswer={handleCopyAnswer}
                  onSaveAsTemplate={(qId) => { setCurrentQuestionForTemplate(qId); setShowSaveTemplateDialog(true); }}
                  onBrowseTemplates={(qId) => { setCurrentQuestionForTemplate(qId); setShowBrowseTemplatesDialog(true); }}
                  onStartEditing={(qId, qText) => { setEditingQuestionId(qId); setEditingQuestionText(qText); }}
                  onConfirmEdit={async (qId, newText) => { await handleEditQuestion(qId, newText); setEditingQuestionId(null); }}
                  onCancelEdit={() => setEditingQuestionId(null)}
                  onDeleteQuestion={handleDeleteQuestion}
                  onSetExpandedConfidence={setExpandedConfidence}
                  onEditingQuestionTextChange={setEditingQuestionText}
                />
              ))}
            </div>
          )}
          </TabsContent>

          {/* Resume Tab */}
          <TabsContent value="resume" className="space-y-6">
            <ResumeTab
              application={application}
              savedTailoredResume={savedTailoredResume}
              loadingTailoredResume={loadingTailoredResume}
              onShowResumeTailorDialog={() => setShowResumeTailorDialog(true)}
              onShowSavedResumesDialog={() => setShowSavedResumesDialog(true)}
              onShowUploadResumeDialog={() => setShowUploadResumeDialog(true)}
            />
          </TabsContent>

          {/* Interviewers Tab */}
          <TabsContent value="interviewers" className="space-y-6">
            <InterviewersTab
              applicationId={application.id}
              applicationCompany={application.company}
              interviewers={interviewers}
              onInterviewersRefresh={fetchInterviewers}
            />
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <TimelineTab
              appliedDate={application.applied_date}
              timelineEvents={timelineEvents}
              statusHistory={statusHistory}
              onShowAddTimelineDialog={() => setShowAddTimelineDialog(true)}
              onDeleteTimelineEvent={handleDeleteTimelineEvent}
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

      {/* Upload Custom Resume Dialog */}
      {application && (
        <UploadCustomResumeDialog
          open={showUploadResumeDialog}
          onOpenChange={setShowUploadResumeDialog}
          applicationId={application.id}
          company={application.company}
          position={application.position}
          onResumeUploaded={() => {
            // Refresh the tailored resume list
            fetchTailoredResume();
          }}
        />
      )}

      {/* Natural Tone Dialog */}
      {currentNaturalPreview && (
        <NaturalToneDialog
          open={showNaturalToneDialog}
          onOpenChange={setShowNaturalToneDialog}
          originalAnswer={currentNaturalPreview.originalAnswer}
          naturalAnswer={currentNaturalPreview.naturalAnswer}
          onApply={handleApplyNaturalTone}
          onRegenerate={handleRegenerateNaturalTone}
          isRegenerating={makingNatural[currentNaturalPreview.questionId] || false}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default ApplicationDetail;
