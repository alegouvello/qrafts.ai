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
import { Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ParseProgressStepper, ParseStep } from "./ParseProgressStepper";

interface UploadResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<boolean>;
}

export const UploadResumeDialog = ({
  open,
  onOpenChange,
  onUpload,
}: UploadResumeDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseStep, setParseStep] = useState<ParseStep | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setSelectedFile(null);
    setParseStep(null);
    setParseError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFileType = (file: File): boolean => {
    const allowedTypes = [
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];
    const allowedExtensions = ['.doc', '.docx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only DOC or DOCX files. PDF parsing is currently unavailable.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFileType(file)) {
        setSelectedFile(file);
        setParseStep(null);
        setParseError(null);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFileType(file)) {
        setSelectedFile(file);
        setParseStep(null);
        setParseError(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setParseStep('uploading');
    setParseError(null);
    
    const success = await onUpload(selectedFile);
    
    if (success) {
      // Call parse-resume function after successful upload
      try {
        setParseStep('extracting');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const filePath = `${user.id}/${selectedFile.name}`;
          const { data: { session } } = await supabase.auth.getSession();
          
          const response = await supabase.functions.invoke('parse-resume', {
            body: { resumeUrl: filePath },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });

          if (response.error) {
            throw new Error(response.error.message || 'Failed to parse resume');
          }

          if (response.data?.usedOcr) {
            setParseStep('ocr');
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          setParseStep('structuring');
          await new Promise(resolve => setTimeout(resolve, 300));

          if (response.data?.success) {
            setParseStep('complete');
            toast({
              title: "Resume Parsed",
              description: response.data.usedOcr 
                ? "Your scanned resume was processed with OCR. Profile updated!"
                : "Your profile has been updated. Questions will auto-fill!",
            });
            
            // Auto close after success
            setTimeout(() => {
              resetState();
              onOpenChange(false);
            }, 1500);
          } else {
            throw new Error(response.data?.error || 'Unknown parsing error');
          }
        }
      } catch (error) {
        console.error('Error parsing resume:', error);
        const errorMessage = error instanceof Error ? error.message : 'Could not parse the resume';
        setParseStep('error');
        setParseError(errorMessage);
        toast({
          title: "Parse failed",
          description: "See error details below for next steps",
          variant: "destructive",
        });
      }
    } else {
      setParseStep('error');
      setParseError('Failed to upload file. Please try again.');
    }
  };

  const isProcessing = parseStep !== null && parseStep !== 'complete' && parseStep !== 'error';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>
            Upload your resume to use across all your job applications. Supported formats: DOC, DOCX (Word documents only for automatic parsing)
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Drag and drop your resume here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                DOC or DOCX (max 10MB)
              </p>
              <input
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleChange}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 border border-border">
                <FileText className="h-10 w-10 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!isProcessing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => resetState()}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {parseStep && (
                <ParseProgressStepper
                  currentStep={parseStep}
                  errorMessage={parseError || undefined}
                />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedFile || isProcessing}>
            {isProcessing ? "Processing..." : "Upload Resume"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
