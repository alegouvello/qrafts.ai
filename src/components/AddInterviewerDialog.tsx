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
  onInterviewerAdded: () => void;
}

export const AddInterviewerDialog = ({ applicationId, onInterviewerAdded }: AddInterviewerDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create interviewer record
      const { data: interviewer, error: insertError } = await supabase
        .from("interviewers")
        .insert({
          application_id: applicationId,
          user_id: user.id,
          name,
          role: role || null,
          company: company || null,
          linkedin_url: linkedinUrl || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If LinkedIn URL provided, trigger extraction
      if (linkedinUrl && interviewer) {
        toast({
          title: t("toast.success"),
          description: "Interviewer added. Extracting LinkedIn profile...",
        });

        supabase.functions
          .invoke("extract-linkedin-profile", {
            body: { interviewerId: interviewer.id, linkedinUrl },
          })
          .then(({ error }) => {
            if (error) {
              console.error("LinkedIn extraction error:", error);
              toast({
                title: t("toast.warning"),
                description: "Failed to extract LinkedIn profile",
                variant: "destructive",
              });
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
      setCompany("");
      setLinkedinUrl("");
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
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
            />
            <p className="text-xs text-muted-foreground mt-1">
              We'll automatically extract their profile information
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