import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, Linkedin, Briefcase, GraduationCap, Award, ArrowLeft, Upload, Edit, Sparkles, BookOpen, Trophy, BookMarked, Lightbulb, Globe, Heart } from "lucide-react";
import { UploadResumeDialog } from "@/components/UploadResumeDialog";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { ProfileReviewDialog } from "@/components/ProfileReviewDialog";
import { MasterAnswersDialog } from "@/components/MasterAnswersDialog";
import qraftLogo from "@/assets/qraft-logo-original.png";

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
  certifications?: string[];
  publications?: string[];
  projects?: Array<{
    name: string;
    description: string;
  }>;
  awards?: string[];
  languages?: string[];
  volunteer_work?: Array<{
    role: string;
    organization: string;
    description: string;
  }>;
  interests?: string[];
  additional_skills?: string[];
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
              <img src={qraftLogo} alt="QRAFT.AI" className="h-8 sm:h-9 opacity-80" />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setShowMasterAnswersDialog(true)}
                variant="secondary"
                size="sm"
                className="gap-2 bg-background/50 backdrop-blur-sm flex-1 sm:flex-none"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Master Answers</span>
                <span className="sm:hidden">Answers</span>
              </Button>
              <Button
                onClick={() => setShowReviewDialog(true)}
                variant="secondary"
                size="sm"
                className="gap-2 bg-background/50 backdrop-blur-sm flex-1 sm:flex-none"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI Review</span>
                <span className="sm:hidden">Review</span>
              </Button>
              <Button
                onClick={() => setShowUploadDialog(true)}
                variant="outline"
                size="sm"
                className="gap-2 bg-background/50 backdrop-blur-sm flex-1 sm:flex-none"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">Upload Resume</span>
                <span className="md:hidden">Upload</span>
              </Button>
              <Button
                onClick={() => setShowEditDialog(true)}
                size="sm"
                className="gap-2 flex-1 sm:flex-none"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Button>
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
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl border-4 border-background">
                    <span className="text-3xl sm:text-4xl font-bold text-primary-foreground">
                      {getInitials()}
                    </span>
                  </div>
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
          </div>

          {/* Professional Summary */}
          {parsedData?.summary && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold">Professional Summary</h2>
                </div>
                <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">{parsedData.summary}</p>
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

          {/* Publications */}
          {parsedData?.publications && parsedData.publications.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookMarked className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold">Publications</h2>
                </div>
                <ul className="space-y-3">
                  {parsedData.publications.map((pub, index) => (
                    <li key={index} className="text-foreground/80 leading-relaxed pl-6 relative before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-primary before:rounded-full">
                      {pub}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {parsedData?.certifications && parsedData.certifications.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
                      {cert}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Awards */}
          {parsedData?.awards && parsedData.awards.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
                      {award}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Projects */}
          {parsedData?.projects && parsedData.projects.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
                      <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                      <p className="text-foreground/80 leading-relaxed">{project.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Languages */}
          {parsedData?.languages && parsedData.languages.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
                      {lang}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Volunteer Work */}
          {parsedData?.volunteer_work && parsedData.volunteer_work.length > 0 && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
          )}

          {/* Interests & Additional Skills */}
          {((parsedData?.interests && parsedData.interests.length > 0) || (parsedData?.additional_skills && parsedData.additional_skills.length > 0)) && (
            <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
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
