import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, Linkedin, Briefcase, GraduationCap, Award, ArrowLeft, Upload, Edit, Sparkles, BookOpen } from "lucide-react";
import { UploadResumeDialog } from "@/components/UploadResumeDialog";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { ProfileReviewDialog } from "@/components/ProfileReviewDialog";
import { MasterAnswersDialog } from "@/components/MasterAnswersDialog";

interface ProfileData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  location: string | null;
  resume_text: string | null;
}

interface ParsedResume {
  full_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education?: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showMasterAnswersDialog, setShowMasterAnswersDialog] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchProfile();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header with gradient background */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto px-4 py-8 relative">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="gap-2 hover:bg-background/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowMasterAnswersDialog(true)}
                variant="secondary"
                size="sm"
                className="gap-2 bg-background/50 backdrop-blur-sm"
              >
                <BookOpen className="h-4 w-4" />
                Master Answers
              </Button>
              <Button
                onClick={() => setShowReviewDialog(true)}
                variant="secondary"
                size="sm"
                className="gap-2 bg-background/50 backdrop-blur-sm"
              >
                <Sparkles className="h-4 w-4" />
                AI Review
              </Button>
              <Button
                onClick={() => setShowUploadDialog(true)}
                variant="outline"
                size="sm"
                className="gap-2 bg-background/50 backdrop-blur-sm"
              >
                <Upload className="h-4 w-4" />
                Upload Resume
              </Button>
              <Button
                onClick={() => setShowEditDialog(true)}
                size="sm"
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="space-y-8">
          {/* Profile Header Card with Avatar */}
          <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
            <CardContent className="relative pt-0 pb-8">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 md:-mt-12">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl border-4 border-background">
                    <span className="text-4xl font-bold text-primary-foreground">
                      {getInitials()}
                    </span>
                  </div>
                </div>
                
                {/* Name and Location */}
                <div className="flex-1 space-y-2 md:mb-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {parsedData?.full_name || profile?.full_name || "Your Name"}
                  </h1>
                  {parsedData?.location && (
                    <p className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {parsedData.location}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information - Minimalist Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {parsedData?.email && (
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                      <a href={`mailto:${parsedData.email}`} className="font-medium hover:text-primary transition-colors truncate block">
                        {parsedData.email}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {parsedData?.phone && (
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
                      <a href={`tel:${parsedData.phone}`} className="font-medium hover:text-primary transition-colors truncate block">
                        {parsedData.phone}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {parsedData?.linkedin_url && (
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm md:col-span-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Linkedin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">LinkedIn</p>
                      <a
                        href={parsedData.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline truncate block"
                      >
                        {parsedData.linkedin_url}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Professional Summary */}
          {parsedData?.summary && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold">Professional Summary</h2>
                </div>
                <p className="text-foreground/80 leading-relaxed">{parsedData.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {parsedData?.skills && parsedData.skills.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
          )}

          {/* Experience */}
          {parsedData?.experience && parsedData.experience.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">{exp.title}</h3>
                        <p className="text-primary font-medium">{exp.company}</p>
                        <p className="text-sm text-muted-foreground">{exp.duration}</p>
                        <p className="text-foreground/80 leading-relaxed mt-3">{exp.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {parsedData?.education && parsedData.education.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
                      <h3 className="text-lg font-semibold">{edu.degree}</h3>
                      <p className="text-primary font-medium">{edu.school}</p>
                      <p className="text-sm text-muted-foreground">{edu.year}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
      />

      <MasterAnswersDialog
        open={showMasterAnswersDialog}
        onOpenChange={setShowMasterAnswersDialog}
      />
    </div>
  );
}
