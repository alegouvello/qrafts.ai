import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Mail, Phone, MapPin, Linkedin, Briefcase, GraduationCap, Award, ArrowLeft, Upload, Edit, Sparkles, BookOpen, Trophy, BookMarked, Lightbulb, Globe, Heart, Settings, Camera, Image as ImageIcon, ExternalLink, FileDown, MoreHorizontal, ArrowLeftRight, RefreshCw } from "lucide-react";
import { UploadResumeDialog } from "@/components/UploadResumeDialog";
import { MyResumesSection } from "@/components/MyResumesSection";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { ProfileReviewDialog } from "@/components/ProfileReviewDialog";
import { MasterAnswersDialog } from "@/components/MasterAnswersDialog";
import { EnhancementPreviewDialog } from "@/components/EnhancementPreviewDialog";
import { ManualEnhancementDialog } from "@/components/ManualEnhancementDialog";
import { ExportPDFDialog } from "@/components/ExportPDFDialog";
import { ResumeOrderAnalysisDialog } from "@/components/ResumeOrderAnalysisDialog";
import { ResumeComparisonDialog } from "@/components/ResumeComparisonDialog";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { convertBulletsToHTML } from "@/utils/bulletFormatter";
import { generateResumePDF, generatePDFPreview } from "@/utils/generateResumePDF";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import qraftLogo from "@/assets/qrafts-logo.png";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEO } from "@/components/SEO";

interface ProfileData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  location: string | null;
  resume_text: string | null;
  avatar_url: string | null;
}

interface ParsedResume {
  full_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  website_url?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    position: string;
    company: string;
    location?: string;
    start_date: string;
    end_date: string;
    description: string;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field?: string;
    start_date: string;
    end_date: string;
    location?: string;
    gpa?: string;
    honors?: string[];
    thesis?: string;
    achievements?: string[];
  }>;
  certifications?: (string | { name: string; issuer: string; date: string })[];
  publications?: (string | { title: string; publisher: string; date: string; url?: string })[];
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
  awards?: (string | { title: string; issuer: string; date: string })[];
  languages?: (string | { language: string; proficiency: string })[];
  volunteer_work?: Array<{
    role: string;
    organization: string;
    description: string;
  }>;
  interests?: string[];
  additional_skills?: string[];
  _sectionOrder?: string[];
}

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showMasterAnswersDialog, setShowMasterAnswersDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showEnhancementPreview, setShowEnhancementPreview] = useState(false);
  const [showManualEnhancementDialog, setShowManualEnhancementDialog] = useState(false);
  const [showTargetRoleDialog, setShowTargetRoleDialog] = useState(false);
  const [showExportPDFDialog, setShowExportPDFDialog] = useState(false);
  const [showOrderAnalysis, setShowOrderAnalysis] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [orderAnalysis, setOrderAnalysis] = useState<any>(null);
  const [analyzingOrder, setAnalyzingOrder] = useState(false);
  const [applyingOrder, setApplyingOrder] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [enhancingProfile, setEnhancingProfile] = useState(false);
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [applyingEnhancement, setApplyingEnhancement] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [reparsingResumes, setReparsingResumes] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscribed: boolean;
    product_id: string | null;
    is_trialing?: boolean;
  }>({ subscribed: false, product_id: null, is_trialing: false });

  useEffect(() => {
    checkAuth();
    fetchProfile();
    checkSubscription();
  }, []);

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
        console.error('Error creating checkout:', error);
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
      if (data.resume_text) {
        try {
          const parsed = JSON.parse(data.resume_text);
          
          // Convert plain text bullet points to HTML if needed for summary
          if (parsed.summary && !parsed.summary.includes('<')) {
            parsed.summary = convertBulletsToHTML(parsed.summary);
          }
          
          // Convert plain text bullet points to HTML if needed for experience
          if (parsed.experience) {
            parsed.experience = parsed.experience.map((exp: any) => {
              if (exp.description && !exp.description.includes('<')) {
                exp.description = convertBulletsToHTML(exp.description);
              }
              return exp;
            });
          }
          
          setParsedData(parsed);
        } catch (e) {
          console.error("Error parsing resume data:", e);
        }
      }
    }
    setLoading(false);
  };

  const handleResumeUpdate = async () => {
    await fetchProfile();
  };

  const handleManualEnhancement = async (content: string, targetRole?: string) => {
    setEnhancingProfile(true);
    setShowManualEnhancementDialog(false);
    toast({
      title: "Enhancing Profile",
      description: targetRole 
        ? `Tailoring profile for ${targetRole} role...` 
        : "Processing your content...",
    });

    try {
      const { data: enhanceData, error: enhanceError } = await supabase.functions.invoke('enhance-profile', {
        body: { 
          manualContent: content,
          targetRole: targetRole || null
        }
      });

      if (enhanceError) {
        console.error('Enhancement error:', enhanceError);
        toast({
          title: "Enhancement Failed",
          description: "Could not process the provided content",
          variant: "destructive",
        });
      } else if (enhanceData?.success && enhanceData?.enhancedResume) {
        setEnhancedData(enhanceData.enhancedResume);
        setShowEnhancementPreview(true);
        toast({
          title: "Enhancement Ready",
          description: "Review the changes before applying them",
        });
      } else {
        toast({
          title: "No Updates Found",
          description: enhanceData?.message || "No additional information could be extracted",
        });
      }
    } catch (enhanceError) {
      console.error('Error enhancing profile:', enhanceError);
      toast({
        title: "Enhancement Error",
        description: "An unexpected error occurred while enhancing your profile",
        variant: "destructive",
      });
    } finally {
      setEnhancingProfile(false);
    }
  };

  const handleApproveEnhancement = async (selectedSections: string[]) => {
    if (!enhancedData) return;

    setApplyingEnhancement(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Merge only selected sections
      const mergedData = { ...parsedData };
      
      selectedSections.forEach(section => {
        if (enhancedData[section]) {
          mergedData[section] = enhancedData[section];
        }
      });

      const { error } = await supabase
        .from('user_profiles')
        .update({
          resume_text: JSON.stringify(mergedData),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Enhancement Applied!",
        description: `Updated ${selectedSections.length} section${selectedSections.length > 1 ? 's' : ''}`,
      });

      // Refresh the profile to show updated data
      await fetchProfile();
      setShowEnhancementPreview(false);
      setEnhancedData(null);
    } catch (error) {
      console.error('Error applying enhancement:', error);
      toast({
        title: "Failed to Apply",
        description: "Could not save the enhanced profile",
        variant: "destructive",
      });
    } finally {
      setApplyingEnhancement(false);
    }
  };

  const handleRejectEnhancement = () => {
    setShowEnhancementPreview(false);
    setEnhancedData(null);
    toast({
      title: "Changes Rejected",
      description: "Your profile remains unchanged",
    });
  };

  const handleUploadResume = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const filePath = `${user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return false;
    }

    const { error: dbError } = await supabase.from("resumes").insert({
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    });

    if (dbError) {
      return false;
    }

    return true;
  };

  const getInitials = () => {
    const name = parsedData?.full_name || profile?.full_name || "User";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to upload an avatar",
          variant: "destructive",
        });
        return;
      }

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });

      await fetchProfile();
      setShowAvatarDialog(false);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      handleAvatarUpload(file);
    }
  };

  const handleExportPDF = (layout: 'single' | 'two-column') => {
    if (!parsedData) {
      toast({
        title: "No Profile Data",
        description: "Please upload or add your profile information first",
        variant: "destructive",
      });
      return;
    }

    try {
      generateResumePDF(parsedData, layout);
      toast({
        title: "PDF Generated",
        description: `Your professional ${layout === 'two-column' ? 'two-column' : 'single-column'} resume has been downloaded`,
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzeOrder = async () => {
    if (!parsedData) {
      toast({
        title: "No Profile Data",
        description: "Please upload your resume first to analyze section order",
        variant: "destructive",
      });
      return;
    }

    setAnalyzingOrder(true);
    toast({
      title: "Analyzing Resume",
      description: "AI is analyzing your resume structure...",
    });

    try {
      const { data, error } = await supabase.functions.invoke('analyze-resume-order', {
        body: { resumeData: parsedData }
      });

      if (error) throw error;

      if (data?.success && data?.analysis) {
        setOrderAnalysis(data.analysis);
        setShowOrderAnalysis(true);
        toast({
          title: "Analysis Complete",
          description: "Review the AI-powered recommendations",
        });
      } else {
        throw new Error('Invalid response from analysis');
      }
    } catch (error: any) {
      console.error('Error analyzing resume order:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze resume structure",
        variant: "destructive",
      });
    } finally {
      setAnalyzingOrder(false);
    }
  };

  const getCurrentSectionOrder = () => {
    const order: string[] = [];
    if (parsedData?.summary) order.push('summary');
    if (parsedData?.experience?.length) order.push('experience');
    if (parsedData?.education?.length) order.push('education');
    if (parsedData?.skills?.length) order.push('skills');
    if (parsedData?.publications?.length) order.push('publications');
    if (parsedData?.certifications?.length) order.push('certifications');
    if (parsedData?.awards?.length) order.push('awards');
    if (parsedData?.projects?.length) order.push('projects');
    if (parsedData?.languages?.length) order.push('languages');
    if (parsedData?.volunteer_work?.length) order.push('volunteer_work');
    if (parsedData?.interests?.length || parsedData?.additional_skills?.length) order.push('interests');
    return order;
  };

  const handleApplyOrder = async (recommendedOrder: string[]) => {
    if (!parsedData) return;

    setApplyingOrder(true);
    toast({
      title: "Applying New Order",
      description: "Reordering your resume sections...",
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // The parsedData already contains all the data, we don't need to reorder it
      // The display order is controlled by the component rendering
      // We just save a metadata field to remember the preferred order
      const updatedData = {
        ...parsedData,
        _sectionOrder: recommendedOrder // Store preferred order
      };

      const { error } = await supabase
        .from('user_profiles')
        .update({
          resume_text: JSON.stringify(updatedData),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Order Applied!",
        description: "Your resume sections have been reordered based on AI recommendations",
      });

      await fetchProfile();
      setShowOrderAnalysis(false);
      setOrderAnalysis(null);
    } catch (error) {
      console.error('Error applying order:', error);
      toast({
        title: "Failed to Apply Order",
        description: "Could not save the new section order",
        variant: "destructive",
      });
    } finally {
      setApplyingOrder(false);
    }
  };

  const handleResetOrder = async () => {
    if (!parsedData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Remove _sectionOrder from the parsed resume data
      const updatedData = { ...parsedData };
      delete updatedData._sectionOrder;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          resume_text: JSON.stringify(updatedData),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Order Reset!",
        description: "Resume sections restored to default order",
      });

      await fetchProfile();
    } catch (error) {
      console.error('Error resetting order:', error);
      toast({
        title: "Failed to Reset Order",
        description: "Could not reset the section order",
        variant: "destructive",
      });
    }
  };

  const handleReparseResumes = async () => {
    setReparsingResumes(true);
    toast({
      title: "Re-parsing Resumes",
      description: "Fetching all uploaded resumes and re-processing them with improved parsing...",
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Fetch all uploaded resumes
      const { data: resumes, error: resumesError } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (resumesError) throw resumesError;

      if (!resumes || resumes.length === 0) {
        toast({
          title: "No Resumes Found",
          description: "Upload a resume first before re-parsing",
          variant: "destructive",
        });
        setReparsingResumes(false);
        return;
      }

      // Re-parse each resume file through the parse-resume function
      for (const resume of resumes) {
        // Download the file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("resumes")
          .download(resume.file_path);

        if (downloadError) {
          console.error(`Error downloading ${resume.file_name}:`, downloadError);
          continue;
        }

        // Convert to base64
        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const fileType = resume.file_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                         resume.file_name.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 
                         'application/octet-stream';

        // Call parse-resume with the file data
        const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-resume', {
          body: {
            fileBase64: base64,
            fileName: resume.file_name,
            fileType: fileType,
          }
        });

        if (parseError) {
          console.error(`Error parsing ${resume.file_name}:`, parseError);
          continue;
        }

        if (parseResult?.success) {
          toast({
            title: `Parsed: ${resume.file_name}`,
            description: "Successfully re-processed",
          });
        }
      }

      // Refresh profile to show merged results
      await fetchProfile();
      toast({
        title: "Re-parse Complete!",
        description: `Successfully re-processed ${resumes.length} resume${resumes.length > 1 ? 's' : ''} with improved parsing`,
      });
    } catch (error: any) {
      console.error('Error re-parsing resumes:', error);
      toast({
        title: "Re-parse Failed",
        description: error.message || "Could not re-parse resumes",
        variant: "destructive",
      });
    } finally {
      setReparsingResumes(false);
    }
  };

  const renderSection = (sectionKey: string) => {
    if (!parsedData) return null;

    switch (sectionKey) {
      case 'summary':
        if (!parsedData.summary) return null;
        return (
          <Card key="summary" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold">Professional Summary</h2>
              </div>
              <div 
                className="prose prose-sm max-w-none text-foreground/80 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80 [&_p]:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedData.summary) }}
              />
            </CardContent>
          </Card>
        );

      case 'experience':
        if (!parsedData.experience?.length) return null;
        return (
          <Card key="experience" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Experience</h2>
              </div>
              <div className="space-y-8">
                {parsedData.experience.map((exp, index) => (
                  <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-primary before:to-transparent">
                    <div className="absolute left-0 top-1 w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground">{exp.position}</h3>
                      <p className="text-primary font-medium">{exp.company}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {(exp.start_date || exp.end_date) && (
                          <span>
                            {exp.start_date} {exp.start_date && exp.end_date && '- '} {exp.end_date}
                          </span>
                        )}
                        {(exp.start_date || exp.end_date) && exp.location && <span>•</span>}
                        {exp.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {exp.location}
                          </span>
                        )}
                      </div>
                      <div 
                        className="prose prose-sm max-w-none text-foreground/80 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1 [&_ul_ul]:list-circle [&_ul_ul]:ml-6 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(exp.description) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'education':
        if (!parsedData.education?.length) return null;
        return (
          <Card key="education" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Education</h2>
              </div>
              <div className="space-y-6">
                {parsedData.education.map((edu, index) => (
                  <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:w-0.5 before:h-full before:bg-gradient-to-b before:from-primary before:to-transparent">
                    <div className="absolute left-0 top-1 w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground">{edu.institution}</h3>
                      <p className="text-primary font-medium">
                        {edu.degree}{edu.field && ` in ${edu.field}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {(edu.start_date || edu.end_date) && (
                          <span>
                            {edu.start_date} {edu.start_date && edu.end_date && '- '} {edu.end_date}
                          </span>
                        )}
                        {(edu.start_date || edu.end_date) && edu.gpa && <span>•</span>}
                        {edu.gpa && <span className="font-medium">GPA: {edu.gpa}</span>}
                        {((edu.start_date || edu.end_date || edu.gpa) && edu.location) && <span>•</span>}
                        {edu.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {edu.location}
                          </span>
                        )}
                      </div>
                      
                      {edu.honors && edu.honors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {edu.honors.map((honor, honorIndex) => (
                            <span
                              key={honorIndex}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-success/10 to-success/5 text-success rounded-full text-xs font-medium border border-success/20"
                            >
                              <Trophy className="h-3 w-3" />
                              {honor}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {edu.thesis && (
                        <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                          <div className="flex items-start gap-2">
                            <BookMarked className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">Thesis</div>
                              <div className="text-sm text-foreground">{edu.thesis}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {edu.achievements && edu.achievements.length > 0 && (
                        <div className="mt-3">
                          <ul className="space-y-1 text-sm text-foreground/80">
                            {edu.achievements.map((achievement, achievementIndex) => (
                              <li key={achievementIndex} className="pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full">
                                {achievement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'skills':
        if (!parsedData.skills?.length) return null;
        return (
          <Card key="skills" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Skills</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {parsedData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'publications':
        if (!parsedData.publications?.length) return null;
        return (
          <Card key="publications" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookMarked className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Publications</h2>
              </div>
              <div className="grid gap-4">
                {parsedData.publications.map((pub, index) => {
                  const pubData = typeof pub === 'string' ? { title: pub } : pub;
                  return (
                    <div 
                      key={index} 
                      className="group relative p-5 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-primary/20 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {pubData.title}
                          </h3>
                          {typeof pub !== 'string' && (pub.publisher || pub.date) && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {pub.publisher && <span>{pub.publisher}</span>}
                              {pub.publisher && pub.date && <span>•</span>}
                              {pub.date && <span>{pub.date}</span>}
                            </div>
                          )}
                        </div>
                        {typeof pub !== 'string' && pub.url && (
                          <a
                            href={pub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-2 rounded-lg hover:bg-primary/10 transition-colors group/link"
                            aria-label={`View ${pubData.title}`}
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/link:text-primary transition-colors" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );

      case 'certifications':
        if (!parsedData.certifications?.length) return null;
        return (
          <Card key="certifications" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Certifications</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {parsedData.certifications.map((cert, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    {typeof cert === 'string' ? cert : (
                      <span>
                        <span className="font-medium">{cert.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({cert.issuer}, {cert.date})</span>
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'awards':
        if (!parsedData.awards?.length) return null;
        return (
          <Card key="awards" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Awards & Honors</h2>
              </div>
              <ul className="space-y-3">
                {parsedData.awards.map((award, index) => (
                  <li key={index} className="text-foreground/80 leading-relaxed pl-6 relative before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-primary before:rounded-full">
                    {typeof award === 'string' ? award : (
                      <div>
                        <div className="font-medium">{award.title}</div>
                        <div className="text-sm text-muted-foreground">{award.issuer} • {award.date}</div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );

      case 'projects':
        if (!parsedData.projects?.length) return null;
        return (
          <Card key="projects" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Projects</h2>
              </div>
              <div className="space-y-6">
                {parsedData.projects.map((project, index) => (
                  <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:w-0.5 before:h-full before:bg-gradient-to-b before:from-primary before:to-transparent">
                    <div className="absolute left-0 top-1 w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                    <h3 className="text-lg font-semibold mb-2">
                      {project.name}
                      {project.url && (
                        <a 
                          href={project.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-sm text-primary hover:underline"
                        >
                          (View)
                        </a>
                      )}
                    </h3>
                    <p className="text-foreground/80 leading-relaxed">{project.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'languages':
        if (!parsedData.languages?.length) return null;
        return (
          <Card key="languages" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Languages</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {parsedData.languages.map((lang, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    {typeof lang === 'string' ? lang : (
                      <span>
                        <span className="font-medium">{lang.language}</span>
                        <span className="text-xs text-muted-foreground ml-2">({lang.proficiency})</span>
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'volunteer_work':
        if (!parsedData.volunteer_work?.length) return null;
        return (
          <Card key="volunteer_work" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Volunteer Work</h2>
              </div>
              <div className="space-y-6">
                {parsedData.volunteer_work.map((work, index) => (
                  <div key={index} className="relative pl-8 before:absolute before:left-0 before:top-2 before:w-0.5 before:h-full before:bg-gradient-to-b before:from-primary before:to-transparent">
                    <div className="absolute left-0 top-1 w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                    <h3 className="text-lg font-semibold">{work.role}</h3>
                    <p className="text-primary font-medium">{work.organization}</p>
                    <p className="text-foreground/80 leading-relaxed mt-2">{work.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'interests':
        if (!parsedData.interests?.length && !parsedData.additional_skills?.length) return null;
        return (
          <Card key="interests" className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="space-y-8">
                {parsedData.interests && parsedData.interests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-semibold">Interests</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {parsedData.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {parsedData.additional_skills && parsedData.additional_skills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-semibold">Additional Skills</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {parsedData.additional_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderSectionsInOrder = () => {
    if (!parsedData) return null;

    // Use saved section order if available, otherwise use current order
    const sectionOrder = parsedData._sectionOrder || getCurrentSectionOrder();
    
    return sectionOrder.map(sectionKey => renderSection(sectionKey));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <SEO 
        title="Your Profile"
        description="Manage your professional profile, resume, skills, and experience. Upload your resume, enhance it with AI, and export it as a professional PDF document."
        keywords="professional profile, resume manager, CV editor, profile enhancement, AI resume"
        noindex={true}
      />
      {/* Header with gradient background */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto px-4 py-4 sm:py-8 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="gap-2 hover:bg-background/50 rounded-full flex-shrink-0"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <img src={qraftLogo} alt="Qrafts" className="h-20 opacity-80 transition-all duration-300 hover:scale-105 hover:opacity-100 hover:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] dark:invert" />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Primary Actions */}
              <Button
                onClick={() => setShowEditDialog(true)}
                size="sm"
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
              
              <Button
                onClick={() => setShowUploadDialog(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Resume</span>
              </Button>

              <Button
                onClick={() => setShowReviewDialog(true)}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI Review</span>
                <span className="sm:hidden">Review</span>
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowManualEnhancementDialog(true)} disabled={enhancingProfile}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {enhancingProfile ? "Enhancing..." : "Enhance Profile"}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleAnalyzeOrder} disabled={analyzingOrder || !parsedData}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {analyzingOrder ? "Analyzing..." : "Analyze Order"}
                  </DropdownMenuItem>

                  {parsedData?._sectionOrder && (
                    <DropdownMenuItem onClick={handleResetOrder}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Reset Order
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setShowMasterAnswersDialog(true)}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Master Answers
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowExportPDFDialog(true)}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowComparisonDialog(true)}>
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Compare Resumes
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handleReparseResumes} disabled={reparsingResumes}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${reparsingResumes ? 'animate-spin' : ''}`} />
                    {reparsingResumes ? "Re-parsing..." : "Re-parse Resumes"}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
        <div className="space-y-8">
          {/* Profile Header Card with Avatar */}
          <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="relative h-24 sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
            <CardContent className="relative pt-0 pb-6 sm:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-6 -mt-12 sm:-mt-16 md:-mt-12">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl border-4 border-background overflow-hidden">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-bold text-primary-foreground">
                        {getInitials()}
                      </span>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setShowAvatarDialog(true)}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Name and Location */}
                <div className="flex-1 space-y-2 md:mb-2 text-center md:text-left">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {parsedData?.full_name || profile?.full_name || "Your Name"}
                  </h1>
                  {parsedData?.location && (
                    <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-2 justify-center md:justify-start">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {parsedData.location}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information - Minimalist Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {parsedData?.email && (
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                      <a href={`mailto:${parsedData.email}`} className="text-sm sm:text-base font-medium hover:text-primary transition-colors truncate block">
                        {parsedData.email}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {parsedData?.phone && (
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
                      <a href={`tel:${parsedData.phone}`} className="text-sm sm:text-base font-medium hover:text-primary transition-colors truncate block">
                        {parsedData.phone}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {parsedData?.linkedin_url && (
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm sm:col-span-2">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Linkedin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">LinkedIn</p>
                      <a
                        href={parsedData.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm sm:text-base font-medium text-primary hover:underline truncate block"
                      >
                        {parsedData.linkedin_url}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {parsedData?.website_url && (
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm sm:col-span-2">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Website</p>
                      <a
                        href={parsedData.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm sm:text-base font-medium text-primary hover:underline truncate block"
                      >
                        {parsedData.website_url}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Render sections dynamically based on saved order */}
          {renderSectionsInOrder()}

          {/* My Resumes Library */}
          <MyResumesSection onUploadClick={() => setShowUploadDialog(true)} />


          {/* Empty State */}
          {!parsedData && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">No Profile Data Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Upload your resume or manually add your information to create your professional profile.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Resume
                  </Button>
                  <Button onClick={() => setShowEditDialog(true)} variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Add Manually
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <UploadResumeDialog
        open={showUploadDialog}
        onOpenChange={(open) => {
          setShowUploadDialog(open);
          if (!open) {
            handleResumeUpdate();
          }
        }}
        onUpload={handleUploadResume}
      />

      <EditProfileDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSaved={fetchProfile}
      />

      <ProfileReviewDialog 
        open={showReviewDialog} 
        onOpenChange={setShowReviewDialog}
        onProfileUpdate={fetchProfile}
        subscribed={subscriptionStatus.subscribed || subscriptionStatus.is_trialing}
        onUpgrade={handleUpgrade}
      />

      <MasterAnswersDialog
        open={showMasterAnswersDialog}
        onOpenChange={setShowMasterAnswersDialog}
      />

      <EnhancementPreviewDialog
        open={showEnhancementPreview}
        onOpenChange={setShowEnhancementPreview}
        currentData={parsedData}
        enhancedData={enhancedData}
        onApprove={handleApproveEnhancement}
        onReject={handleRejectEnhancement}
        loading={applyingEnhancement}
      />

      <ExportPDFDialog
        open={showExportPDFDialog}
        onOpenChange={setShowExportPDFDialog}
        onExport={handleExportPDF}
      />

      <ManualEnhancementDialog
        open={showManualEnhancementDialog}
        onOpenChange={setShowManualEnhancementDialog}
        onSubmit={handleManualEnhancement}
        isLoading={enhancingProfile}
      />

      {/* Target Role Dialog - Kept for backward compatibility */}
      <Dialog open={showTargetRoleDialog} onOpenChange={setShowTargetRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enhance Profile for Target Role</DialogTitle>
            <DialogDescription>
              Specify a target role to tailor your profile enhancement. For example: "Partner at Consulting Firm", "Senior Software Engineer", or "VP of Product". Leave empty for general enhancement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const targetRole = formData.get('targetRole') as string;
            setShowTargetRoleDialog(false);
            handleManualEnhancement(targetRole || undefined);
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="targetRole" className="text-sm font-medium">
                  Target Role
                </label>
                <Input
                  id="targetRole"
                  name="targetRole"
                  type="text"
                  placeholder="e.g., Partner at Consulting Firm"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTargetRoleDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Enhance Profile
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Avatar Upload Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
            <DialogDescription>
              Choose a photo from your device or take a new one with your camera.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Options */}
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Camera className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Take Photo</div>
                  <div className="text-xs text-muted-foreground">Use your camera</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <ImageIcon className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Choose from Gallery</div>
                  <div className="text-xs text-muted-foreground">Select an existing photo</div>
                </div>
              </Button>
            </div>

            {uploadingAvatar && (
              <div className="text-center text-sm text-muted-foreground py-2">
                Uploading...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ResumeOrderAnalysisDialog
        open={showOrderAnalysis}
        onOpenChange={setShowOrderAnalysis}
        analysis={orderAnalysis}
        currentOrder={getCurrentSectionOrder()}
        onApplyOrder={handleApplyOrder}
        isApplying={applyingOrder}
      />

      <ResumeComparisonDialog
        open={showComparisonDialog}
        onOpenChange={setShowComparisonDialog}
      />
      
      <Footer />
    </div>
  );
}
