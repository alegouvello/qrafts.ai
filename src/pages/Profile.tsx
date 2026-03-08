import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { ProfileSections } from "@/components/Profile/ProfileSections";
import { ProfileContactInfo } from "@/components/Profile/ProfileContactInfo";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
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
  useAuthGuard();
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
  const [reparseProgress, setReparseProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscribed: boolean;
    product_id: string | null;
    is_trialing?: boolean;
  }>({ subscribed: false, product_id: null, is_trialing: false });

  useEffect(() => {
    fetchProfile();
    checkSubscription();
  }, []);




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
          
          // Convert summary to HTML safely
          if (parsed.summary) {
            if (Array.isArray(parsed.summary)) {
              parsed.summary = '<ul>' + parsed.summary.map((item: string) => `<li>${String(item)}</li>`).join('') + '</ul>';
            } else if (typeof parsed.summary === 'string' && !parsed.summary.includes('<')) {
              parsed.summary = convertBulletsToHTML(parsed.summary);
            }
          }
          
          // Convert experience descriptions to HTML safely
          if (parsed.experience && Array.isArray(parsed.experience)) {
            parsed.experience = parsed.experience.map((exp: any) => {
              if (Array.isArray(exp.description)) {
                exp.description = '<ul>' + exp.description.map((item: any) => `<li>${String(item)}</li>`).join('') + '</ul>';
              } else if (exp.description && typeof exp.description === 'string' && !exp.description.includes('<')) {
                exp.description = convertBulletsToHTML(exp.description);
              } else if (exp.description && typeof exp.description !== 'string') {
                exp.description = String(exp.description);
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
      for (let i = 0; i < resumes.length; i++) {
        const resume = resumes[i];
        setReparseProgress({ current: i + 1, total: resumes.length, fileName: resume.file_name });
        toast({
          title: `Processing ${i + 1} of ${resumes.length}`,
          description: resume.file_name,
        });

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
                    {reparsingResumes 
                      ? `Re-parsing ${reparseProgress.current}/${reparseProgress.total}...` 
                      : "Re-parse Resumes"}
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

          {/* Contact Information */}
          {parsedData && (
            <ProfileContactInfo
              email={parsedData.email}
              phone={parsedData.phone}
              linkedin_url={parsedData.linkedin_url}
              website_url={parsedData.website_url}
            />
          )}

          {/* Render sections dynamically based on saved order */}
          {parsedData && <ProfileSections parsedData={parsedData} />}

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
