import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Columns2, Rows3, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import jsPDF from 'jspdf';

interface ExportPDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (layout: 'single' | 'two-column') => void;
  profileData: any;
  generatePDFPreview: (data: any, layout: 'single' | 'two-column') => string;
}

export function ExportPDFDialog({ open, onOpenChange, onExport, profileData, generatePDFPreview }: ExportPDFDialogProps) {
  const [selectedLayout, setSelectedLayout] = useState<'single' | 'two-column'>('single');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    let blobUrl: string | null = null;
    
    if (open && profileData) {
      setLoadingPreview(true);
      // Generate preview with a slight delay to ensure smooth UI
      setTimeout(() => {
        try {
          console.log('Generating PDF preview with data:', profileData);
          const dataUrl = generatePDFPreview(profileData, selectedLayout);
          console.log('Generated preview URL:', dataUrl ? 'Success' : 'Empty');
          
          if (dataUrl) {
            // Convert data URL to blob URL for better browser compatibility
            const base64Data = dataUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            blobUrl = URL.createObjectURL(blob);
            setPreviewUrl(blobUrl);
          } else {
            setPreviewUrl('');
          }
        } catch (error) {
          console.error('Error generating PDF preview:', error);
          setPreviewUrl('');
        } finally {
          setLoadingPreview(false);
        }
      }, 100);
    } else if (open && !profileData) {
      console.warn('Cannot generate preview: profileData is null');
      setPreviewUrl('');
      setLoadingPreview(false);
    }
    
    // Cleanup blob URL on unmount or when dependencies change
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [open, selectedLayout, profileData, generatePDFPreview]);

  const handleExport = () => {
    onExport(selectedLayout);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Resume to PDF
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left side - Layout selection */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a layout style for your resume PDF:
            </p>

            <div className="grid grid-cols-2 gap-4">
            {/* Single Column Layout */}
            <button
              onClick={() => setSelectedLayout('single')}
              className={`relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                selectedLayout === 'single'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <Rows3 className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Single Column</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Classic format
                </div>
              </div>
              {selectedLayout === 'single' && (
                <div className="absolute top-2 right-2">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>

            {/* Two Column Layout */}
            <button
              onClick={() => setSelectedLayout('two-column')}
              className={`relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                selectedLayout === 'two-column'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <Columns2 className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Two Column</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Modern layout
                </div>
              </div>
              {selectedLayout === 'two-column' && (
                <div className="absolute top-2 right-2">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          </div>

            <div className={`p-3 rounded-lg border ${
              selectedLayout === 'single' ? 'bg-muted/50' : 'bg-muted/50'
            }`}>
              <p className="text-sm">
                {selectedLayout === 'single' ? (
                  <>
                    <span className="font-semibold">Single Column:</span> Traditional resume format with all content in one column. Best for comprehensive details and ATS compatibility.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Two Column:</span> Modern design with sidebar for contact info and skills. More visually striking and space-efficient.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right side - PDF Preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview:</p>
            <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '500px' }}>
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating preview...</p>
                </div>
              ) : previewUrl ? (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="w-full h-full"
                  aria-label="PDF Preview"
                >
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </object>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                  <p className="text-sm text-muted-foreground">
                    {!profileData ? 'Please complete your profile to generate a preview' : 'Unable to generate preview'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
