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
      setError(result.error.errors[0]?.message || "Invalid URL");
      toast({
        title: "Invalid URL",
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
          <DialogTitle>Add New Application</DialogTitle>
          <DialogDescription>
            Paste the job posting URL and we'll automatically extract all the details for you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Job Posting URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://company.com/careers/job-id"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <p className="text-sm text-muted-foreground">
                We'll extract the company, position, application questions, and key details automatically
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
