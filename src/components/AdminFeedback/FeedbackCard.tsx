import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, XCircle, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Feedback {
  id: string;
  created_at: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  category: string;
  message: string;
  status: string;
  internal_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface FeedbackCardProps {
  item: Feedback;
  index: number;
  updatingStatus: boolean;
  internalNotes: string;
  onInternalNotesChange: (val: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onSaveNotes: (id: string) => void;
  onSelectFeedback: (item: Feedback) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "resolved": return <CheckCircle2 className="h-4 w-4" />;
    case "in_progress": return <Clock className="h-4 w-4" />;
    case "closed": return <XCircle className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "resolved": return "bg-success/10 text-success border-success/20";
    case "in_progress": return "bg-primary/10 text-primary border-primary/20";
    case "closed": return "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20";
    default: return "bg-warning/10 text-warning border-warning/20";
  }
};

export const FeedbackCardItem = ({
  item,
  index,
  updatingStatus,
  internalNotes,
  onInternalNotesChange,
  onStatusChange,
  onSaveNotes,
  onSelectFeedback,
}: FeedbackCardProps) => (
  <Card
    className="relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group animate-fade-in-up"
    style={{ animationDelay: `${index * 0.05}s` }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <CardHeader className="relative">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" className={`flex items-center gap-1.5 ${getStatusColor(item.status)}`}>
              {getStatusIcon(item.status)}
              <span className="capitalize font-medium">{item.status.replace("_", " ")}</span>
            </Badge>
            <Badge variant="secondary" className="capitalize bg-accent/10 text-accent border-accent/20">
              {item.category === "feature" && "✨ "}
              {item.category === "bug" && "🐛 "}
              {item.category === "improvement" && "🚀 "}
              {item.category === "other" && "💭 "}
              {item.category}
            </Badge>
          </div>
          <CardTitle className="text-base font-semibold mb-2">
            {item.name || "Anonymous User"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {item.email && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {item.email}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(item.created_at), "PPpp")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <Select
            value={item.status}
            onValueChange={(value) => onStatusChange(item.id, value)}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-full sm:w-[140px] rounded-full border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectFeedback(item);
                  onInternalNotesChange(item.internal_notes || "");
                }}
                className="rounded-full border-border/60 hover:border-primary/50"
              >
                Notes
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Internal Notes</DialogTitle>
                <DialogDescription>
                  Add private notes for team members (not visible to users)
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={internalNotes}
                onChange={(e) => onInternalNotesChange(e.target.value)}
                placeholder="Add your notes here..."
                rows={6}
                className="resize-none"
              />
              <Button onClick={() => onSaveNotes(item.id)} className="rounded-full">
                Save Notes
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </CardHeader>
    <CardContent className="relative">
      <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4 text-foreground/90">
        {item.message}
      </p>
      {item.internal_notes && (
        <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Internal Notes
            </p>
          </div>
          <p className="text-sm leading-relaxed">{item.internal_notes}</p>
        </div>
      )}
    </CardContent>
  </Card>
);
