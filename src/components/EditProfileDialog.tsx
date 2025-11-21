import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, X, Plus } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { convertBulletsToHTML } from "@/utils/bulletFormatter";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface Experience {
  position: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
}

interface Education {
  degree: string;
  school: string;
  year: string;
}

export function EditProfileDialog({ open, onOpenChange, onSaved }: EditProfileDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [existingResumeData, setExistingResumeData] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setLinkedinUrl(data.linkedin_url || "");
      setWebsiteUrl(data.website_url || "");
      setLocation(data.location || "");
      
      if (data.resume_text) {
        try {
          const parsed = JSON.parse(data.resume_text);
          setExistingResumeData(parsed);
          
          // Convert plain text with bullet points to proper HTML for summary
          let processedSummary = parsed.summary || "";
          if (processedSummary && !processedSummary.includes('<')) {
            processedSummary = convertBulletsToHTML(processedSummary);
          }
          setSummary(processedSummary);
          setSkills(parsed.skills || []);
          
          // Convert plain text with bullet points to proper HTML for experience
          const processedExperience = (parsed.experience || []).map((exp: any) => {
            if (exp.description && !exp.description.includes('<')) {
              exp.description = convertBulletsToHTML(exp.description);
            }
            return exp;
          });
          
          setExperience(processedExperience);
          setEducation(parsed.education || []);
        } catch (e) {
          console.error("Error parsing resume data:", e);
        }
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Preserve all existing resume data and only update the edited fields
    const resumeData = {
      ...existingResumeData, // Keep all existing fields (interests, certifications, etc.)
      full_name: fullName,
      email,
      phone,
      linkedin_url: linkedinUrl,
      website_url: websiteUrl,
      location,
      summary,
      skills,
      experience,
      education,
    };

    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: user.id,
        full_name: fullName,
        email,
        phone,
        linkedin_url: linkedinUrl,
        website_url: websiteUrl,
        location,
        resume_text: JSON.stringify(resumeData),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Profile Saved",
      description: "Your profile has been updated successfully",
    });

    // Notify about manual enhancement option if URLs were added
    if (linkedinUrl || websiteUrl) {
      toast({
        title: "Enhancement Available",
        description: "Click 'Enhance Profile' to extract information from your links",
      });
    }

    setLoading(false);
    onSaved();
    onOpenChange(false);
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const addExperience = () => {
    setExperience([...experience, { position: "", company: "", location: "", start_date: "", end_date: "", description: "" }]);
  };

  const updateExperience = (index: number, field: keyof Experience, value: string) => {
    const updated = [...experience];
    updated[index][field] = value;
    setExperience(updated);
  };

  const removeExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    setEducation([...education, { degree: "", school: "", year: "" }]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Contact Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Professional Summary</Label>
            <RichTextEditor
              content={summary}
              onChange={setSummary}
              placeholder="Brief professional summary..."
            />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Add a skill..."
              />
              <Button type="button" onClick={addSkill} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                >
                  {skill}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeSkill(index)}
                  />
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Experience</Label>
              <Button type="button" onClick={addExperience} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Experience
              </Button>
            </div>
            {experience.map((exp, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <Input
                      value={exp.position}
                      onChange={(e) => updateExperience(index, 'position', e.target.value)}
                      placeholder="Job Title"
                    />
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      placeholder="Company"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExperience(index)}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={exp.location}
                  onChange={(e) => updateExperience(index, 'location', e.target.value)}
                  placeholder="Location (e.g., New York, NY)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={exp.start_date}
                    onChange={(e) => updateExperience(index, 'start_date', e.target.value)}
                    placeholder="Start Date (e.g., Jan 2020)"
                  />
                  <Input
                    value={exp.end_date}
                    onChange={(e) => updateExperience(index, 'end_date', e.target.value)}
                    placeholder="End Date (e.g., Dec 2023)"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Description</Label>
                  <RichTextEditor
                    content={exp.description}
                    onChange={(content) => updateExperience(index, 'description', content)}
                    placeholder="Describe your role and achievements..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Education</Label>
              <Button type="button" onClick={addEducation} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Education
              </Button>
            </div>
            {education.map((edu, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      placeholder="Degree"
                    />
                    <Input
                      value={edu.school}
                      onChange={(e) => updateEducation(index, 'school', e.target.value)}
                      placeholder="School"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEducation(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={edu.year}
                  onChange={(e) => updateEducation(index, 'year', e.target.value)}
                  placeholder="Year (e.g., 2020)"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
