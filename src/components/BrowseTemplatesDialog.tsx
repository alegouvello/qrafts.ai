import { useState, useEffect } from "react";
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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, FileText, Trash2, Loader2 } from "lucide-react";

interface Template {
  id: string;
  title: string;
  template_text: string;
  category: string | null;
  tags: string[] | null;
  created_at: string;
}

interface BrowseTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (templateText: string) => void;
}

export const BrowseTemplatesDialog = ({
  open,
  onOpenChange,
  onApply,
}: BrowseTemplatesDialogProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTemplates(templates);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = templates.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
      setFilteredTemplates(filtered);
    }
  }, [searchQuery, templates]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("answer_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } else {
      setTemplates(data || []);
      setFilteredTemplates(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(templateId);

    const { error } = await supabase
      .from("answer_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Template removed successfully",
      });
      fetchTemplates();
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    }
    setDeleting(null);
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onApply(selectedTemplate.template_text);
      onOpenChange(false);
      setSelectedTemplate(null);
      setSearchQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Browse Answer Templates</DialogTitle>
          <DialogDescription>
            Select a template to apply to your answer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by title, category, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Templates List */}
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No templates match your search"
                      : "No templates saved yet"}
                  </p>
                  {!searchQuery && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Save your best answers as templates to reuse them
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate?.id === template.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">{template.title}</h4>
                          {template.category && (
                            <Badge variant="secondary" className="mb-2">
                              {template.category}
                            </Badge>
                          )}
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(template.id, e)}
                          disabled={deleting === template.id}
                        >
                          {deleting === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Preview */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Preview</h4>
              {selectedTemplate ? (
                <ScrollArea className="h-[350px]">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedTemplate.template_text}
                  </p>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">
                  Select a template to preview
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedTemplate}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
