import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, X, Tag } from "lucide-react";

interface MasterAnswer {
  id: string;
  question_pattern: string;
  answer_text: string;
  tags: string[] | null;
}

const SUGGESTED_TAGS = [
  "motivation",
  "technical",
  "culture fit",
  "leadership",
  "teamwork",
  "problem solving",
  "experience",
  "goals",
];

interface MasterAnswersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MasterAnswersDialog = ({ open, onOpenChange }: MasterAnswersDialogProps) => {
  const { toast } = useToast();
  const [masterAnswers, setMasterAnswers] = useState<MasterAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAnswer, setNewAnswer] = useState({ question_pattern: "", answer_text: "", tags: [] as string[] });
  const [showAddForm, setShowAddForm] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      fetchMasterAnswers();
    }
  }, [open]);

  const fetchMasterAnswers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("master_answers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load master answers",
        variant: "destructive",
      });
    } else {
      setMasterAnswers(data || []);
    }
    setLoading(false);
  };

  const handleAddAnswer = async () => {
    if (!newAnswer.question_pattern.trim() || !newAnswer.answer_text.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both question pattern and answer",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("master_answers")
      .insert({
        user_id: user.id,
        question_pattern: newAnswer.question_pattern,
        answer_text: newAnswer.answer_text,
        tags: newAnswer.tags.length > 0 ? newAnswer.tags : null,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add master answer",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Master answer added",
      });
      setNewAnswer({ question_pattern: "", answer_text: "", tags: [] });
      setTagInput("");
      setShowAddForm(false);
      fetchMasterAnswers();
    }
  };

  const handleUpdateAnswer = async (id: string, question_pattern: string, answer_text: string, tags: string[]) => {
    const { error } = await supabase
      .from("master_answers")
      .update({ question_pattern, answer_text, tags: tags.length > 0 ? tags : null })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update master answer",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Master answer updated",
      });
      setEditingId(null);
      fetchMasterAnswers();
    }
  };

  const handleDeleteAnswer = async (id: string) => {
    const { error } = await supabase
      .from("master_answers")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete master answer",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Master answer deleted",
      });
      fetchMasterAnswers();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Master Answers Library</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pre-write answers for common questions. These will automatically appear when you encounter similar questions.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Answer Button */}
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Master Answer
            </Button>
          )}

          {/* Add New Answer Form */}
          {showAddForm && (
            <Card className="p-4 space-y-3 border-primary/50">
              <div className="space-y-2">
                <label className="text-sm font-medium">Question Pattern</label>
                <Input
                  placeholder="e.g., Why do you want to work here?"
                  value={newAnswer.question_pattern}
                  onChange={(e) => setNewAnswer({ ...newAnswer, question_pattern: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Keywords from this will match similar questions
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Answer</label>
                <Textarea
                  placeholder="Write your master answer here..."
                  value={newAnswer.answer_text}
                  onChange={(e) => setNewAnswer({ ...newAnswer, answer_text: e.target.value })}
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SUGGESTED_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={newAnswer.tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (newAnswer.tags.includes(tag)) {
                          setNewAnswer({ ...newAnswer, tags: newAnswer.tags.filter(t => t !== tag) });
                        } else {
                          setNewAnswer({ ...newAnswer, tags: [...newAnswer.tags, tag] });
                        }
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        if (!newAnswer.tags.includes(tagInput.trim())) {
                          setNewAnswer({ ...newAnswer, tags: [...newAnswer.tags, tagInput.trim()] });
                        }
                        setTagInput("");
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (tagInput.trim() && !newAnswer.tags.includes(tagInput.trim())) {
                        setNewAnswer({ ...newAnswer, tags: [...newAnswer.tags, tagInput.trim()] });
                        setTagInput("");
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                {newAnswer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newAnswer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={() => setNewAnswer({ ...newAnswer, tags: newAnswer.tags.filter(t => t !== tag) })}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddAnswer} size="sm">
                  <Save className="h-3 w-3 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAnswer({ question_pattern: "", answer_text: "", tags: [] });
                    setTagInput("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-3 w-3 mr-2" />
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {/* List of Master Answers */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : masterAnswers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No master answers yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first master answer to get started
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {masterAnswers.map((answer) => (
                <Card key={answer.id} className="p-4">
                  {editingId === answer.id ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Question Pattern</label>
                        <Input
                          defaultValue={answer.question_pattern}
                          id={`pattern-${answer.id}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Your Answer</label>
                        <Textarea
                          defaultValue={answer.answer_text}
                          id={`answer-${answer.id}`}
                          className="min-h-[120px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {SUGGESTED_TAGS.map((tag) => {
                            const currentTags = answer.tags || [];
                            const isSelected = currentTags.includes(tag);
                            return (
                              <Badge
                                key={tag}
                                variant={isSelected ? "default" : "outline"}
                                className="cursor-pointer"
                                data-tag={tag}
                                data-selected={isSelected}
                              >
                                {tag}
                              </Badge>
                            );
                          })}
                        </div>
                        <Input
                          placeholder="Current tags (comma separated)"
                          defaultValue={answer.tags?.join(", ") || ""}
                          id={`tags-${answer.id}`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const pattern = (document.getElementById(`pattern-${answer.id}`) as HTMLInputElement)?.value;
                            const text = (document.getElementById(`answer-${answer.id}`) as HTMLTextAreaElement)?.value;
                            const tagsStr = (document.getElementById(`tags-${answer.id}`) as HTMLInputElement)?.value;
                            const tags = tagsStr.split(",").map(t => t.trim()).filter(Boolean);
                            handleUpdateAnswer(answer.id, pattern, text, tags);
                          }}
                          size="sm"
                        >
                          <Save className="h-3 w-3 mr-2" />
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-3 w-3 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{answer.question_pattern}</h4>
                          </div>
                          {answer.tags && answer.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {answer.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {answer.answer_text}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            onClick={() => setEditingId(answer.id)}
                            variant="ghost"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteAnswer(answer.id)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
