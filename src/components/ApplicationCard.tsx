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
import { Calendar, ExternalLink, MessageSquare, Trash2 } from "lucide-react";
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
  const [logoError, setLogoError] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(application.id);
    setIsDeleting(false);
  };

  // Get company logo from Clearbit
  const getCompanyLogo = (company: string) => {
    const domain = company.toLowerCase().replace(/\s+/g, '') + '.com';
    return `https://logo.clearbit.com/${domain}`;
  };

  return (
    <Card className="group relative overflow-hidden border-border/40 bg-card hover:border-border hover:shadow-md transition-all duration-300">
      <div className="p-5">
        {/* Company Logo */}
        <div className="mb-4">
          {!logoError ? (
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted/20 flex items-center justify-center border border-border/30">
              <img 
                src={getCompanyLogo(application.company)}
                alt={application.company}
                className="w-full h-full object-contain p-2"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border/30">
              <span className="text-xl font-bold text-primary">
                {application.company.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {application.position}
              </h3>
              <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{application.appliedDate}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {application.questions > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {application.answersCompleted}/{application.questions} answered
                </span>
                <span className="font-medium text-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Link to={`/application/${application.id}`} className="flex-1">
              <Button variant="default" size="sm" className="w-full rounded-full text-xs h-8">
                View Details
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-full h-8 w-8 p-0"
              onClick={() => window.open(application.url, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-full hover:bg-destructive/10 h-8 w-8 p-0"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
      </div>
    </Card>
  );
};
