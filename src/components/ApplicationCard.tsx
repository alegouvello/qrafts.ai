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
import { Calendar, ExternalLink, MessageSquare, Trash2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
    avgResponseDays?: number;
    fastestResponseDays?: number;
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
  const { t } = useTranslation();
  const statusInfo = {
    pending: { label: t('application.status.pending'), variant: "secondary" as const },
    interview: { label: t('application.status.interview'), variant: "default" as const },
    rejected: { label: t('application.status.rejected'), variant: "destructive" as const },
    accepted: { label: t('application.status.accepted'), variant: "outline" as const },
  }[application.status];
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
    <Card className="group relative overflow-hidden border-border/40 bg-card hover:border-border hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <div className="p-5">
        {/* Company Logo */}
        <div className="mb-4">
          {!logoError ? (
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted/20 flex items-center justify-center border border-border/30 transition-transform group-hover:scale-105">
              <img 
                src={getCompanyLogo(application.company)}
                alt={application.company}
                className="w-full h-full object-contain p-2"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border/30 transition-transform group-hover:scale-105">
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
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem]">
                {application.position}
              </h3>
              <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{application.appliedDate}</span>
              </div>
              {application.avgResponseDays !== null && application.avgResponseDays !== undefined && (
                <div className="flex items-center gap-1.5 text-primary/80">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {application.avgResponseDays === 0 
                      ? "Same day" 
                      : `${Math.round(application.avgResponseDays)}d avg`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {application.questions > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t('application.answeredCount', { completed: application.answersCompleted, total: application.questions })}
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
                {t('application.viewDetails')}
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
                  <AlertDialogTitle>{t('application.deleteConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('application.deleteMessage', { position: application.position, company: application.company })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('common.delete')}
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
