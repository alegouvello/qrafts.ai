import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Upload, Image as ImageIcon } from "lucide-react";

interface AddInterviewerDialogProps {
  applicationId: string;
  applicationCompany: string;
  onInterviewerAdded: () => void;
}

export const AddInterviewerDialog = ({ applicationId, applicationCompany, onInterviewerAdded }: AddInterviewerDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extractingScreenshot, setExtractingScreenshot] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState(applicationCompany);
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 20MB",
        variant: "destructive",
      });
      return;
    }

    setExtractingScreenshot(true);
    toast({
      title: "Processing Screenshot",
      description: "Extracting LinkedIn profile information...",
    });

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        setUploadedImage(base64Data);

        // Call edge function to extract info
        const { data, error } = await supabase.functions.invoke('extract-linkedin-screenshot', {
          body: { imageData: base64Data }
        });

        if (error || data?.error) {
          throw new Error(data?.error || error.message);
        }

        if (data?.success && data?.extractedInfo) {
          setNotes(data.extractedInfo);
          toast({
            title: "Success",
            description: "LinkedIn profile information extracted successfully",
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error extracting screenshot:', error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Could not extract information from the screenshot",
        variant: "destructive",
      });
    } finally {
      setExtractingScreenshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate email if provided
      if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error("Invalid email address");
      }

      // Create interviewer record
      const { data: interviewer, error: insertError } = await supabase
        .from("interviewers")
        .insert({
          application_id: applicationId,
          user_id: user.id,
          name,
          role: role || null,
          company: company || null,
          email: email || null,
          linkedin_url: linkedinUrl || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If LinkedIn URL provided, trigger extraction (but it's optional)
      if (linkedinUrl && interviewer) {
        toast({
          title: t("toast.success"),
          description: "Interviewer added successfully",
        });

        // Try to extract LinkedIn profile, but don't fail if it doesn't work
        supabase.functions
          .invoke("extract-linkedin-profile", {
            body: { interviewerId: interviewer.id, linkedinUrl },
          })
          .then(({ data, error }) => {
            if (error || data?.error) {
              console.log("LinkedIn extraction not available:", error || data?.error);
              // Don't show error toast - LinkedIn extraction is optional
            } else {
              toast({
                title: t("toast.success"),
                description: "LinkedIn profile extracted successfully",
              });
              onInterviewerAdded();
            }
          });
      } else {
        toast({
          title: t("toast.success"),
          description: "Interviewer added successfully",
        });
      }

      setOpen(false);
      setName("");
      setRole("");
      setCompany(applicationCompany);
      setEmail("");
      setLinkedinUrl("");
      setNotes("");
      setUploadedImage(null);
      onInterviewerAdded();
    } catch (error: any) {
      console.error("Error adding interviewer:", error);
      toast({
        title: t("toast.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Interviewer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Interviewer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <Label htmlFor="role">Role/Title</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Hiring Manager"
            />
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="interviewer@company.com"
            />
          </div>
          <div>
            <Label htmlFor="linkedinUrl">LinkedIn URL (Optional)</Label>
            <Input
              id="linkedinUrl"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
            />
            <p className="text-xs text-muted-foreground mt-1">
              LinkedIn profile reference (extraction may not be available)
            </p>
          </div>
          <div>
            <Label htmlFor="notes">Notes/Bio</Label>
            <div className="mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={extractingScreenshot}
                className="w-full mb-2"
              >
                {extractingScreenshot ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload LinkedIn Screenshot
                  </>
                )}
              </Button>
              {uploadedImage && (
                <div className="mt-2 p-2 bg-muted rounded-md flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Screenshot uploaded
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedImage(null)}
                    className="h-6 px-2"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add relevant background, shared connections, conversation topics, or research notes..."
              rows={12}
              className="text-base leading-relaxed font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a LinkedIn screenshot or manually add information from LinkedIn, research, or prep notes
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};