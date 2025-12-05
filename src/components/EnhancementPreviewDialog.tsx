import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import DOMPurify from "dompurify";

interface ResumeItem {
  [key: string]: string | string[] | undefined;
  title?: string;
  position?: string;
  company?: string;
  description?: string;
  duration?: string;
  start_date?: string;
  end_date?: string;
  degree?: string;
  school?: string;
  institution?: string;
  year?: string;
  field?: string;
  name?: string;
  issuer?: string;
  publisher?: string;
  date?: string;
  url?: string;
  language?: string;
  proficiency?: string;
  role?: string;
  organization?: string;
}

interface ResumeData {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  website_url?: string;
  summary?: string;
  skills?: string[];
  experience?: ResumeItem[];
  education?: ResumeItem[];
  certifications?: (string | ResumeItem)[];
  projects?: ResumeItem[];
  publications?: (string | ResumeItem)[];
  awards?: (string | ResumeItem)[];
  languages?: (string | ResumeItem)[];
  volunteer_work?: ResumeItem[];
  volunteer?: ResumeItem[];
}

interface EnhancementPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentData: ResumeData;
  enhancedData: ResumeData;
  onApprove: (selectedSections: string[]) => void;
  onReject: () => void;
  loading?: boolean;
}

export function EnhancementPreviewDialog({
  open,
  onOpenChange,
  currentData,
  enhancedData,
  onApprove,
  onReject,
  loading = false
}: EnhancementPreviewDialogProps) {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  // Auto-select sections with changes when dialog opens
  useEffect(() => {
    if (open && currentData && enhancedData) {
      const sectionsWithChanges = new Set<string>();
      
      // Check each section for changes
      if (currentData?.summary !== enhancedData?.summary) sectionsWithChanges.add('summary');
      if (JSON.stringify(currentData?.skills) !== JSON.stringify(enhancedData?.skills)) sectionsWithChanges.add('skills');
      if (JSON.stringify(currentData?.experience) !== JSON.stringify(enhancedData?.experience)) sectionsWithChanges.add('experience');
      if (JSON.stringify(currentData?.education) !== JSON.stringify(enhancedData?.education)) sectionsWithChanges.add('education');
      if (JSON.stringify(currentData?.certifications) !== JSON.stringify(enhancedData?.certifications)) sectionsWithChanges.add('certifications');
      if (JSON.stringify(currentData?.projects) !== JSON.stringify(enhancedData?.projects)) sectionsWithChanges.add('projects');
      if (JSON.stringify(currentData?.publications) !== JSON.stringify(enhancedData?.publications)) sectionsWithChanges.add('publications');
      if (JSON.stringify(currentData?.awards) !== JSON.stringify(enhancedData?.awards)) sectionsWithChanges.add('awards');
      if (JSON.stringify(currentData?.languages) !== JSON.stringify(enhancedData?.languages)) sectionsWithChanges.add('languages');
      if (JSON.stringify(currentData?.volunteer_work) !== JSON.stringify(enhancedData?.volunteer_work)) sectionsWithChanges.add('volunteer_work');
      
      setSelectedSections(sectionsWithChanges);
    }
  }, [open, currentData, enhancedData]);

  const toggleSection = (section: string) => {
    setSelectedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleApprove = () => {
    onApprove(Array.from(selectedSections));
  };
  
  const renderArrayComparison = (label: string, sectionKey: string, current: (string | ResumeItem)[], enhanced: (string | ResumeItem)[]) => {
    const currentItems = current || [];
    const enhancedItems = enhanced || [];
    
    // Always show section if either has content OR if both are empty (to show no changes)
    const hasChanges = JSON.stringify(currentItems) !== JSON.stringify(enhancedItems);
    const hasContent = currentItems.length > 0 || enhancedItems.length > 0;
    
    // Only hide if both sides are completely empty in a way that suggests the section doesn't apply
    if (!hasContent && label !== "Experience" && label !== "Education") {
      return null;
    }

    // Helper to format objects in a readable way
    const formatItem = (item: string | ResumeItem): string | { title: string; description: string; isHTML: boolean } => {
      if (typeof item === 'string') return item;
      
      // Format experience/work items (handle both title/position fields)
      if ((item.title || item.position) && item.company) {
        const jobTitle = item.title || item.position;
        const duration = item.duration || 
          (item.start_date ? `${item.start_date} - ${item.end_date || 'Present'}` : '');
        return {
          title: `${jobTitle} at ${item.company}${duration ? ` (${duration})` : ''}`,
          description: item.description || '',
          isHTML: item.description?.includes('<ul>') || item.description?.includes('<li>') || false
        };
      }
      
      // Format education items (handle both school/institution fields)
      if (item.degree && (item.school || item.institution)) {
        const schoolName = item.school || item.institution;
        const yearInfo = item.year || 
          (item.start_date && item.end_date ? `${item.start_date} - ${item.end_date}` : '');
        let text = `${item.degree}\n${schoolName}`;
        if (yearInfo) text += ` (${yearInfo})`;
        if (item.field) text += `\nField: ${item.field}`;
        return text;
      }
      
      // Format certification/publication/award items
      if (item.name || item.title) {
        let text = item.name || item.title;
        if (item.issuer || item.publisher) text += `\n${item.issuer || item.publisher}`;
        if (item.date) text += ` (${item.date})`;
        return text;
      }
      
      // Format project items
      if (item.name && item.description) {
        return `${item.name}\n${item.description}${item.url ? `\n${item.url}` : ''}`;
      }
      
      // Format language items
      if (item.language && item.proficiency) {
        return `${item.language} (${item.proficiency})`;
      }
      
      // Format volunteer work
      if (item.role && item.organization) {
        return `${item.role} at ${item.organization}${item.description ? `\n${item.description}` : ''}`;
      }
      
      // Fallback to JSON for other objects
      return JSON.stringify(item, null, 2);
    };
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Checkbox
            checked={selectedSections.has(sectionKey)}
            onCheckedChange={() => toggleSection(sectionKey)}
            disabled={!hasChanges}
          />
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {label}
            {hasChanges && <Badge variant="secondary" className="text-xs">Updated</Badge>}
            {!hasChanges && hasContent && <Badge variant="outline" className="text-xs">No Changes</Badge>}
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Current */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Current</p>
            <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
              {currentItems.length === 0 ? (
                <p className="text-muted-foreground italic p-2">No items</p>
              ) : (
                currentItems.map((item, idx) => {
                  const formatted = formatItem(item);
                  const isComplex = typeof formatted === 'object' && 'title' in formatted;
                  
                  return (
                    <div key={idx} className="p-3 bg-muted/30 rounded text-xs">
                      {isComplex && typeof formatted === 'object' && 'title' in formatted ? (
                        <>
                          <div className="font-semibold mb-2">{formatted.title}</div>
                          {formatted.isHTML ? (
                            <div 
                              className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2 [&_li]:my-1 [&_ul_ul]:list-circle [&_ul_ul]:ml-6"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatted.description) }}
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap font-sans">{formatted.description}</pre>
                          )}
                        </>
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans">{typeof formatted === 'string' ? formatted : JSON.stringify(formatted)}</pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Enhanced */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Enhanced</p>
            <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
              {enhancedItems.length === 0 ? (
                <p className="text-muted-foreground italic p-2">No items</p>
              ) : (
                enhancedItems.map((item, idx) => {
                  const formatted = formatItem(item);
                  const isComplex = typeof formatted === 'object' && 'title' in formatted;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded border text-xs ${
                        selectedSections.has(sectionKey) 
                          ? 'bg-primary/10 border-primary/20' 
                          : 'bg-muted/30 border-muted'
                      }`}
                    >
                      {isComplex && typeof formatted === 'object' && 'title' in formatted ? (
                        <>
                          <div className="font-semibold mb-2">{formatted.title}</div>
                          {formatted.isHTML ? (
                            <div 
                              className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2 [&_li]:my-1 [&_ul_ul]:list-circle [&_ul_ul]:ml-6"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatted.description) }}
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap font-sans">{formatted.description}</pre>
                          )}
                        </>
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans">{typeof formatted === 'string' ? formatted : JSON.stringify(formatted)}</pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTextComparison = (label: string, sectionKey: string, current: string, enhanced: string) => {
    const hasChanges = current !== enhanced;
    const hasContent = current || enhanced;
    
    // Always show Professional Summary
    if (!hasContent && label !== "Professional Summary") return null;
    
    // Check if content contains HTML
    const currentIsHTML = current?.includes('<ul>') || current?.includes('<li>') || current?.includes('<p>');
    const enhancedIsHTML = enhanced?.includes('<ul>') || enhanced?.includes('<li>') || enhanced?.includes('<p>');
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Checkbox
            checked={selectedSections.has(sectionKey)}
            onCheckedChange={() => toggleSection(sectionKey)}
            disabled={!hasChanges}
          />
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {label}
            {hasChanges && <Badge variant="secondary" className="text-xs">Updated</Badge>}
            {!hasChanges && hasContent && <Badge variant="outline" className="text-xs">No Changes</Badge>}
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Current */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Current</p>
            <div className="text-sm p-3 bg-muted/30 rounded max-h-96 overflow-y-auto">
              {current ? (
                currentIsHTML ? (
                  <div 
                    className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2 [&_li]:my-1 [&_ul_ul]:list-circle [&_ul_ul]:ml-6 [&_p]:my-2"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{current}</pre>
                )
              ) : (
                <span className="text-muted-foreground italic">No content</span>
              )}
            </div>
          </div>
          
          {/* Enhanced */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Enhanced</p>
            <div 
              className={`text-sm p-3 rounded border max-h-96 overflow-y-auto ${
                selectedSections.has(sectionKey) 
                  ? 'bg-primary/10 border-primary/20' 
                  : 'bg-muted/30 border-muted'
              }`}
            >
              {enhanced ? (
                enhancedIsHTML ? (
                  <div 
                    className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2 [&_li]:my-1 [&_ul_ul]:list-circle [&_ul_ul]:ml-6 [&_p]:my-2"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(enhanced) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{enhanced}</pre>
                )
              ) : (
                <span className="text-muted-foreground italic">No content</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Review Profile Enhancements
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 min-h-0">
          <div className="space-y-6 py-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-foreground/80">
                Review the changes below. Changes are highlighted with an "Updated" badge. 
                Click <strong>Approve</strong> to apply these enhancements or <strong>Reject</strong> to discard them.
              </p>
            </div>

            {renderTextComparison("Professional Summary", "summary", currentData?.summary || "", enhancedData?.summary || "")}
            
            {renderArrayComparison("Skills", "skills", currentData?.skills || [], enhancedData?.skills || [])}
            
            {renderArrayComparison("Experience", "experience", currentData?.experience || [], enhancedData?.experience || [])}
            
            {renderArrayComparison("Education", "education", currentData?.education || [], enhancedData?.education || [])}
            
            {renderArrayComparison("Certifications", "certifications", currentData?.certifications || [], enhancedData?.certifications || [])}
            
            {renderArrayComparison("Projects", "projects", currentData?.projects || [], enhancedData?.projects || [])}
            
            {renderArrayComparison("Publications", "publications", currentData?.publications || [], enhancedData?.publications || [])}
            
            {renderArrayComparison("Awards", "awards", currentData?.awards || [], enhancedData?.awards || [])}
            
            {renderArrayComparison("Languages", "languages", currentData?.languages || [], enhancedData?.languages || [])}
            
            {renderArrayComparison("Volunteer Work", "volunteer_work", currentData?.volunteer_work || currentData?.volunteer || [], enhancedData?.volunteer_work || enhancedData?.volunteer || [])}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-3 flex-shrink-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={loading}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject Changes
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading || selectedSections.size === 0}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {loading ? "Applying..." : `Apply ${selectedSections.size} Section${selectedSections.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}