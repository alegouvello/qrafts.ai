import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const urlSchema = z.object({
  url: z.string()
    .trim()
    .url("Please enter a valid URL")
    .max(2000, "URL too long")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return !['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
        } catch {
          return false;
        }
      },
      "Invalid job posting URL"
    ),
});

interface AddApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { company?: string; position?: string; url: string }) => void;
}

export const AddApplicationDialog = ({
  open,
  onOpenChange,
  onAdd,
}: AddApplicationDialogProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate URL
    const result = urlSchema.safeParse({ url });
    if (!result.success) {
      setError(result.error.errors[0]?.message || t('application.invalidUrl'));
      toast({
        title: t('application.invalidUrl'),
        description: result.error.errors[0]?.message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    onAdd({ url: result.data.url });
    setUrl("");
    setError("");
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('application.addNew')}</DialogTitle>
          <DialogDescription>
            {t('application.urlDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">{t('application.jobPostingUrl')}</Label>
              <Input
                id="url"
                type="url"
                placeholder={t('application.urlPlaceholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('application.urlDescription')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('application.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
