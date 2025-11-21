import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus } from "lucide-react";

interface AddInterviewerDialogProps {
  applicationId: string;
  applicationCompany: string;
  onInterviewerAdded: () => void;
}

export const AddInterviewerDialog = ({ applicationId, applicationCompany, onInterviewerAdded }: AddInterviewerDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState(applicationCompany);
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [notes, setNotes] = useState("");

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
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add relevant background, shared connections, conversation topics, or research notes..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Manually add information from LinkedIn, research, or prep notes
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