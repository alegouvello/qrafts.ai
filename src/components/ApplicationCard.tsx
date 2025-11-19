import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, Calendar, ExternalLink, MessageSquare, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

type ApplicationStatus = "pending" | "interview" | "rejected" | "accepted";

interface ApplicationCardProps {
  application: {
    id: string;
    company: string;
    position: string;
    status: ApplicationStatus;
    appliedDate: string;
    url: string;
    questions: number;
    answersCompleted: number;
  };
  onDelete: (id: string) => void;
}

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const },
  interview: { label: "Interview", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
  accepted: { label: "Accepted", variant: "outline" as const },
};

export const ApplicationCard = ({ application, onDelete }: ApplicationCardProps) => {
  const statusInfo = statusConfig[application.status];
  const progress = application.questions > 0 
    ? (application.answersCompleted / application.questions) * 100 
    : 0;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(application.id);
    setIsDeleting(false);
  };

  return (
    <Card className="p-6 hover:shadow-medium transition-all duration-300 group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                {application.position}
              </h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{application.company}</span>
              </div>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Applied {application.appliedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>
                {application.answersCompleted} / {application.questions} questions answered
              </span>
            </div>
          </div>

          {application.questions > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <div className="flex md:flex-col gap-2">
          <Link to={`/application/${application.id}`} className="flex-1 md:flex-none">
            <Button className="w-full" size="sm">
              View Details
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 md:flex-none"
            onClick={() => window.open(application.url, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Job Page
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                className="flex-1 md:flex-none"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 md:mr-0 mr-2" />
                <span className="md:hidden">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this application for {application.position} at {application.company}? This will also delete all associated questions, answers, and timeline events. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
};
