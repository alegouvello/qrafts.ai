import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";

interface EnhancementPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentData: any;
  enhancedData: any;
  onApprove: () => void;
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
  
  const renderArrayComparison = (label: string, current: any[], enhanced: any[]) => {
    const currentItems = current || [];
    const enhancedItems = enhanced || [];
    
    if (currentItems.length === 0 && enhancedItems.length === 0) return null;
    
    const hasChanges = JSON.stringify(currentItems) !== JSON.stringify(enhancedItems);
    
    return (
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          {label}
          {hasChanges && <Badge variant="secondary" className="text-xs">Updated</Badge>}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Current */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Current</p>
            <div className="space-y-2 text-sm">
              {currentItems.length === 0 ? (
                <p className="text-muted-foreground italic">No items</p>
              ) : (
                currentItems.map((item, idx) => (
                  <div key={idx} className="p-2 bg-muted/30 rounded">
                    {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Enhanced */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Enhanced</p>
            <div className="space-y-2 text-sm">
              {enhancedItems.length === 0 ? (
                <p className="text-muted-foreground italic">No items</p>
              ) : (
                enhancedItems.map((item, idx) => (
                  <div key={idx} className="p-2 bg-primary/10 rounded border border-primary/20">
                    {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTextComparison = (label: string, current: string, enhanced: string) => {
    if (!current && !enhanced) return null;
    
    const hasChanges = current !== enhanced;
    
    return (
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          {label}
          {hasChanges && <Badge variant="secondary" className="text-xs">Updated</Badge>}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Current */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Current</p>
            <div className="text-sm p-3 bg-muted/30 rounded">
              {current || <span className="text-muted-foreground italic">No content</span>}
            </div>
          </div>
          
          {/* Enhanced */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Enhanced</p>
            <div className="text-sm p-3 bg-primary/10 rounded border border-primary/20">
              {enhanced || <span className="text-muted-foreground italic">No content</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Review Profile Enhancements
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-foreground/80">
                Review the changes below. Changes are highlighted with an "Updated" badge. 
                Click <strong>Approve</strong> to apply these enhancements or <strong>Reject</strong> to discard them.
              </p>
            </div>

            {renderTextComparison("Professional Summary", currentData?.summary || "", enhancedData?.summary || "")}
            
            {renderArrayComparison("Skills", currentData?.skills || [], enhancedData?.skills || [])}
            
            {renderArrayComparison("Experience", currentData?.experience || [], enhancedData?.experience || [])}
            
            {renderArrayComparison("Education", currentData?.education || [], enhancedData?.education || [])}
            
            {renderArrayComparison("Certifications", currentData?.certifications || [], enhancedData?.certifications || [])}
            
            {renderArrayComparison("Projects", currentData?.projects || [], enhancedData?.projects || [])}
            
            {renderArrayComparison("Publications", currentData?.publications || [], enhancedData?.publications || [])}
            
            {renderArrayComparison("Awards", currentData?.awards || [], enhancedData?.awards || [])}
            
            {renderArrayComparison("Languages", currentData?.languages || [], enhancedData?.languages || [])}
            
            {renderArrayComparison("Volunteer Work", currentData?.volunteer || [], enhancedData?.volunteer || [])}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-3">
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
            onClick={onApprove}
            disabled={loading}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {loading ? "Applying..." : "Approve & Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
