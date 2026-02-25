import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ParseProgressStepper, ParseStep } from "./ParseProgressStepper";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UploadResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<boolean>;
}

type FileStatus = "pending" | "uploading" | "parsing" | "ocr" | "complete" | "error";

interface FileEntry {
  file: File;
  status: FileStatus;
  error?: string;
  usedOcr?: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const UploadResumeDialog = ({
  open,
  onOpenChange,
  onUpload,
}: UploadResumeDialogProps) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setFiles([]);
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

  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
      return "Unsupported format. Use PDF, DOC, or DOCX.";
    }
    if (file.size > MAX_SIZE) {
      return "File exceeds 10MB limit.";
    }
    return null;
  };

  const addFiles = useCallback((incoming: FileList) => {
    const newEntries: FileEntry[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      const error = validateFile(file);
      if (error) {
        toast({ title: file.name, description: error, variant: "destructive" });
      } else {
        // Avoid duplicates by name
        newEntries.push({ file, status: "pending" });
      }
    }
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.file.name));
      const unique = newEntries.filter((e) => !existingNames.has(e.file.name));
      return [...prev, ...unique];
    });
  }, [toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files);
      // Reset input so re-selecting same files works
      e.target.value = "";
    }
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.file.name !== name));
  };

  const updateFileStatus = (name: string, update: Partial<FileEntry>) => {
    setFiles((prev) =>
      prev.map((f) => (f.file.name === name ? { ...f, ...update } : f))
    );
  };

  const processFile = async (entry: FileEntry) => {
    const { file } = entry;
    updateFileStatus(file.name, { status: "uploading" });

    const success = await onUpload(file);
    if (!success) {
      updateFileStatus(file.name, { status: "error", error: "Upload failed" });
      return;
    }

    try {
      updateFileStatus(file.name, { status: "parsing" });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${file.name}`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke("parse-resume", {
        body: { resumeUrl: filePath },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) throw new Error(response.error.message || "Parse failed");

      if (response.data?.usedOcr) {
        updateFileStatus(file.name, { status: "ocr", usedOcr: true });
        await new Promise((r) => setTimeout(r, 400));
      }

      if (response.data?.success) {
        updateFileStatus(file.name, { status: "complete", usedOcr: response.data.usedOcr });
      } else {
        throw new Error(response.data?.error || "Unknown error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parse failed";
      updateFileStatus(file.name, { status: "error", error: msg });
    }
  };

  const handleSubmit = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    setIsProcessing(true);

    // Process sequentially so profile updates don't conflict
    for (const entry of pending) {
      await processFile(entry);
    }

    setIsProcessing(false);

    // Check if all done
    const updatedFiles = files; // state may lag, but toast is best-effort
    const allComplete = updatedFiles.every((f) => f.status === "complete" || f.status === "error");
    if (allComplete) {
      const successCount = updatedFiles.filter((f) => f.status === "complete").length;
      if (successCount > 0) {
        toast({
          title: "Resumes Uploaded",
          description: `${successCount} resume${successCount > 1 ? "s" : ""} parsed successfully.`,
        });
        setTimeout(() => {
          resetState();
          onOpenChange(false);
        }, 1200);
      }
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const hasFiles = files.length > 0;

  const statusIcon = (status: FileStatus) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
      case "pending":
        return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />;
    }
  };

  const statusLabel = (entry: FileEntry) => {
    switch (entry.status) {
      case "uploading":
        return "Uploading…";
      case "parsing":
        return "Extracting text…";
      case "ocr":
        return "OCR processing…";
      case "complete":
        return entry.usedOcr ? "Parsed (OCR)" : "Parsed";
      case "error":
        return entry.error || "Failed";
      default:
        return `${(entry.file.size / 1024 / 1024).toFixed(1)} MB`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>
            Upload your resume to use across all your job applications.
            Supported formats: PDF, DOC, DOCX (max 10MB each)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("resume-upload-multi")?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Drag and drop your resume{files.length > 0 ? "s" : ""} here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOC, or DOCX (max 10MB) — select multiple files
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleChange}
              className="hidden"
              id="resume-upload-multi"
              multiple
            />
          </div>

          {/* File list */}
          {hasFiles && (
            <ScrollArea className={files.length > 3 ? "h-48" : ""}>
              <div className="space-y-2">
                {files.map((entry) => (
                  <div
                    key={entry.file.name}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
                  >
                    {statusIcon(entry.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.file.name}</p>
                      <p className={`text-xs ${entry.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                        {statusLabel(entry)}
                      </p>
                    </div>
                    {entry.status === "pending" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => removeFile(entry.file.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
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
          <Button
            onClick={handleSubmit}
            disabled={pendingCount === 0 || isProcessing}
          >
            {isProcessing
              ? "Processing…"
              : `Upload ${pendingCount > 0 ? pendingCount : ""} Resume${pendingCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
