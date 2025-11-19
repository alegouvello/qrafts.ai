import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, User, Mail, Phone, MapPin, Linkedin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  location: string | null;
  resume_text: string | null;
}

interface ViewProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateClick: () => void;
}

export function ViewProfileDialog({ open, onOpenChange, onUpdateClick }: ViewProfileDialogProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open]);

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
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Resume Profile
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : !profile || (!profile.full_name && !profile.email && !profile.phone && !profile.linkedin_url && !profile.location) ? (
          <div className="py-8 text-center space-y-4">
            <div className="bg-muted/50 p-6 rounded-lg">
              <p className="text-muted-foreground mb-2">Resume uploaded successfully!</p>
              <p className="text-sm text-muted-foreground">
                Please update your profile information manually or upload a new resume for automatic parsing.
              </p>
            </div>
            <Button onClick={onUpdateClick}>
              <Upload className="h-4 w-4 mr-2" />
              Update Resume & Profile
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
              
              {profile.full_name && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{profile.full_name}</p>
                  </div>
                </div>
              )}

              {profile.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile.phone}</p>
                  </div>
                </div>
              )}

              {profile.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{profile.location}</p>
                  </div>
                </div>
              )}

              {profile.linkedin_url && (
                <div className="flex items-start gap-3">
                  <Linkedin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">LinkedIn</p>
                    <a 
                      href={profile.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {profile.linkedin_url}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Resume Summary */}
            {profile.resume_text && (() => {
              try {
                const parsed = JSON.parse(profile.resume_text);
                if (parsed.summary && parsed.summary !== 'Resume uploaded successfully. Please update your profile information.') {
                  return (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg border-b pb-2">Professional Summary</h3>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{parsed.summary}</p>
                      </div>
                    </div>
                  );
                }
              } catch (e) {
                // If it's not JSON, display as-is
                return (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg border-b pb-2">Professional Summary</h3>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{profile.resume_text}</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={() => {
                  onOpenChange(false);
                  onUpdateClick();
                }}
                variant="outline"
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Update Resume
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
