import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, FileText, Loader2, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TailoredResume {
  id: string;
  version_name: string;
  resume_text: string;
  position: string | null;
  company: string | null;
  created_at: string;
}

interface ResumeComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Simple word-level diff
interface DiffSegment {
  type: "same" | "added" | "removed";
  text: string;
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // LCS-based diff for reasonable-length texts
  const m = oldWords.length;
  const n = newWords.length;

  // For very long texts, fall back to line-level diff
  if (m * n > 500000) {
    return computeLineDiff(oldText, newText);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const segments: DiffSegment[] = [];
  let i = m,
    j = n;

  const result: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.push({ type: "same", text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "added", text: newWords[j - 1] });
      j--;
    } else {
      result.push({ type: "removed", text: oldWords[i - 1] });
      i--;
    }
  }

  result.reverse();

  // Merge consecutive same-type segments
  const merged: DiffSegment[] = [];
  for (const seg of result) {
    if (merged.length > 0 && merged[merged.length - 1].type === seg.type) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

function computeLineDiff(oldText: string, newText: string): DiffSegment[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const segments: DiffSegment[] = [];

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let oi = 0,
    ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      segments.push({ type: "same", text: oldLines[oi] + "\n" });
      oi++;
      ni++;
    } else if (oi < oldLines.length && !newSet.has(oldLines[oi])) {
      segments.push({ type: "removed", text: oldLines[oi] + "\n" });
      oi++;
    } else if (ni < newLines.length && !oldSet.has(newLines[ni])) {
      segments.push({ type: "added", text: newLines[ni] + "\n" });
      ni++;
    } else {
      // Mismatch - treat as remove + add
      if (oi < oldLines.length) {
        segments.push({ type: "removed", text: oldLines[oi] + "\n" });
        oi++;
      }
      if (ni < newLines.length) {
        segments.push({ type: "added", text: newLines[ni] + "\n" });
        ni++;
      }
    }
  }

  return segments;
}

export const ResumeComparisonDialog = ({
  open,
  onOpenChange,
}: ResumeComparisonDialogProps) => {
  const { toast } = useToast();
  const [resumes, setResumes] = useState<TailoredResume[]>([]);
  const [loading, setLoading] = useState(false);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchResumes();
    }
  }, [open]);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tailored_resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes(data || []);

      // Auto-select first two if available
      if (data && data.length >= 2) {
        setLeftId(data[1].id);
        setRightId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
      toast({
        title: "Error",
        description: "Failed to load resumes for comparison",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const leftResume = resumes.find((r) => r.id === leftId);
  const rightResume = resumes.find((r) => r.id === rightId);

  const diffSegments = useMemo(() => {
    if (!leftResume || !rightResume) return null;
    return computeWordDiff(leftResume.resume_text, rightResume.resume_text);
  }, [leftResume, rightResume]);

  const diffStats = useMemo(() => {
    if (!diffSegments) return { added: 0, removed: 0 };
    let added = 0,
      removed = 0;
    for (const seg of diffSegments) {
      const words = seg.text.trim().split(/\s+/).filter(Boolean).length;
      if (seg.type === "added") added += words;
      if (seg.type === "removed") removed += words;
    }
    return { added, removed };
  }, [diffSegments]);

  const getResumeLabel = (resume: TailoredResume) => {
    const parts = [];
    if (resume.position) parts.push(resume.position);
    if (resume.company) parts.push(resume.company);
    if (parts.length === 0) parts.push(resume.version_name);
    return parts.join(" — ");
  };

  const handleSwap = () => {
    setLeftId(rightId);
    setRightId(leftId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Compare Resumes
          </DialogTitle>
          <DialogDescription>
            Select two tailored resumes to see differences highlighted side by side
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : resumes.length < 2 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              You need at least 2 tailored resumes to compare. Create tailored
              versions from your application pages first.
            </p>
          </Card>
        ) : (
          <>
            {/* Selectors */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Original / Before
                </label>
                <Select value={leftId} onValueChange={setLeftId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resume..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes
                      .filter((r) => r.id !== rightId)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="truncate">{getResumeLabel(r)}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(new Date(r.created_at), "MMM d, yyyy")}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="mt-5 flex-shrink-0"
                onClick={handleSwap}
                title="Swap sides"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>

              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Updated / After
                </label>
                <Select value={rightId} onValueChange={setRightId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resume..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes
                      .filter((r) => r.id !== leftId)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="truncate">{getResumeLabel(r)}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(new Date(r.created_at), "MMM d, yyyy")}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Diff stats */}
            {diffSegments && (
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  <Plus className="h-3 w-3" />
                  {diffStats.added} words added
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-1.5 border-red-500/30 text-red-600 dark:text-red-400"
                >
                  <Minus className="h-3 w-3" />
                  {diffStats.removed} words removed
                </Badge>
              </div>
            )}

            {/* Unified diff view */}
            {leftResume && rightResume && diffSegments && (
              <ScrollArea className="flex-1 min-h-0 border rounded-xl">
                <div className="p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {diffSegments.map((seg, i) => {
                    if (seg.type === "same") {
                      return <span key={i}>{seg.text}</span>;
                    }
                    if (seg.type === "added") {
                      return (
                        <span
                          key={i}
                          className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-sm px-0.5"
                        >
                          {seg.text}
                        </span>
                      );
                    }
                    if (seg.type === "removed") {
                      return (
                        <span
                          key={i}
                          className="bg-red-500/15 text-red-700 dark:text-red-300 line-through rounded-sm px-0.5"
                        >
                          {seg.text}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
