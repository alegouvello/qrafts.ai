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
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const data: { company?: string; position?: string; url: string } = { url };
    if (company.trim()) data.company = company;
    if (position.trim()) data.position = position;
    
    onAdd(data);
    setCompany("");
    setPosition("");
    setUrl("");
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Application</DialogTitle>
          <DialogDescription>
            Enter the job posting URL. We'll automatically extract the company name, position, and key details from the page.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Job Posting URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://company.com/careers/job-id"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                We'll automatically extract application questions, company, position, and role details
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company Name (Optional)</Label>
              <Input
                id="company"
                placeholder="Auto-extracted from URL"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-extract from the job posting
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position (Optional)</Label>
              <Input
                id="position"
                placeholder="Auto-extracted from URL"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-extract from the job posting
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
