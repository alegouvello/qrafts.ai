import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

interface ManualEnhancementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (content: string, targetRole?: string) => void;
  isLoading?: boolean;
}

export function ManualEnhancementDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: ManualEnhancementDialogProps) {
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content, targetRole || undefined);
    setContent("");
    setTargetRole("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Manual Profile Enhancement
          </DialogTitle>
          <DialogDescription>
            Paste content from your LinkedIn profile or any additional information to enhance your profile
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="content">Content to Add</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your LinkedIn profile content, additional work experience, projects, publications, or any other information you'd like to add to your profile..."
              rows={12}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Copy text from your LinkedIn profile, personal website, or manually type additional information
            </p>
          </div>

          <div>
            <Label htmlFor="targetRole">Target Role (Optional)</Label>
            <Input
              id="targetRole"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., Senior Software Engineer, Product Manager"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Specify a role to optimize your profile for that position
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isLoading ? "Enhancing..." : "Enhance Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
