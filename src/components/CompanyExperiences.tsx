import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Star,
  Send,
  User,
  EyeOff,
  Trash2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface Experience {
  id: string;
  company_name: string;
  user_id: string;
  title: string;
  experience_text: string;
  experience_type: string;
  rating: number | null;
  is_anonymous: boolean;
  created_at: string;
}

interface CompanyExperiencesProps {
  companyName: string;
  experiences: Experience[];
  currentUserId: string | null;
  onRefresh: () => void;
}

const typeConfig: Record<string, { label: string; color: string }> = {
  interview: { label: "Interview", color: "bg-primary/10 text-primary" },
  culture: { label: "Culture", color: "bg-green-500/10 text-green-500" },
  process: { label: "Process", color: "bg-amber-500/10 text-amber-500" },
  tip: { label: "Tip", color: "bg-blue-500/10 text-blue-500" },
};

export const CompanyExperiences = ({
  companyName,
  experiences,
  currentUserId,
  onRefresh,
}: CompanyExperiencesProps) => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState("interview");
  const [rating, setRating] = useState<number>(0);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !text.trim()) {
      toast({ title: "Required", description: "Please fill in title and experience", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any).from("company_experiences").insert({
        company_name: companyName,
        user_id: user.id,
        title: title.trim(),
        experience_text: text.trim(),
        experience_type: type,
        rating: rating > 0 ? rating : null,
        is_anonymous: isAnonymous,
      });

      if (error) throw error;

      toast({ title: "Shared!", description: "Your experience has been shared with the community" });
      setTitle("");
      setText("");
      setRating(0);
      setShowForm(false);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to share experience", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("company_experiences").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted" });
      onRefresh();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Community Experiences
          </h2>
          <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm" className="h-7 text-[11px]">
            {showForm ? "Cancel" : "Share Experience"}
          </Button>
        </div>

        {showForm && (
          <div className="space-y-3 mb-4 p-3 rounded-lg bg-muted/30 border border-border/30">
            <Input
              placeholder="Title (e.g., 'Phone screen with recruiter')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex gap-3 flex-wrap">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="culture">Culture</SelectItem>
                  <SelectItem value="process">Process</SelectItem>
                  <SelectItem value="tip">Tip</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rating:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    className="transition-colors"
                  >
                    <Star
                      className={`h-5 w-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              placeholder="Share your experience... What was the interview process like? Any tips for future applicants?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-24"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} id="anonymous" />
                <Label htmlFor="anonymous" className="text-sm text-muted-foreground flex items-center gap-1">
                  <EyeOff className="h-3.5 w-3.5" /> Post anonymously
                </Label>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} size="sm">
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Sharing..." : "Share"}
              </Button>
            </div>
          </div>
        )}

        {experiences.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-5">
            No experiences shared yet. Be the first to share your experience with {companyName}!
          </p>
        ) : (
          <div className="space-y-1.5">
            {experiences.map((exp) => (
              <div key={exp.id} className="px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-[13px] font-medium">{exp.title}</h3>
                      <Badge variant="secondary" className={`text-[10px] ${typeConfig[exp.experience_type]?.color || ""}`}>
                        {typeConfig[exp.experience_type]?.label || exp.experience_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5">
                        {exp.is_anonymous ? <EyeOff className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                        {exp.is_anonymous ? "Anonymous" : "Member"}
                      </span>
                      <span>{format(new Date(exp.created_at), "MMM d, yyyy")}</span>
                      {exp.rating && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: exp.rating }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  {currentUserId === exp.user_id && (
                    <Button variant="ghost" size="icon" className="shrink-0 h-6 w-6" onClick={() => handleDelete(exp.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {exp.experience_text}
                </p>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};
