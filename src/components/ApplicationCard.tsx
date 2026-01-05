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
import { useEffect, useMemo, useState } from "react";
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

// Common job board hostnames to ignore when deriving company domain
const JOB_BOARD_PATTERNS = [
  // ATS platforms
  /lever\.co$/i,
  /greenhouse\.io$/i,
  /workday\.com$/i,
  /myworkdayjobs\.com$/i,
  /ashbyhq\.com$/i,
  /icims\.com$/i,
  /smartrecruiters\.com$/i,
  /jobvite\.com$/i,
  /applytojob\.com$/i,
  /breezy\.hr$/i,
  /recruitee\.com$/i,
  /bamboohr\.com$/i,
  /jazz\.co$/i,
  /jazzhq\.com$/i,
  /workable\.com$/i,
  /taleo\.net$/i,
  /oraclecloud\.com$/i,
  /successfactors\.com$/i,
  /ultipro\.com$/i,
  /paylocity\.com$/i,
  /paycom\.com$/i,
  /adp\.com$/i,
  /wd5\.myworkdayjobs\.com$/i,
  /wd1\.myworkdayjobs\.com$/i,
  /phenom\.com$/i,
  /eightfold\.ai$/i,
  /avature\.net$/i,
  /cornerstoneondemand\.com$/i,
  /pinpointhq\.com$/i,
  /teamtailor\.com$/i,
  /personio\.de$/i,
  /personio\.com$/i,
  /gem\.com$/i,
  /wellfound\.com$/i,
  /angel\.co$/i,
  /ycombinator\.com$/i,
  /workatastartup\.com$/i,
  /dover\.com$/i,
  /rippling\.com$/i,
  /gusto\.com$/i,
  /deel\.com$/i,
  /remote\.com$/i,
  /oysterhr\.com$/i,
  // Job boards
  /linkedin\.com$/i,
  /indeed\.com$/i,
  /ziprecruiter\.com$/i,
  /glassdoor\.com$/i,
  /monster\.com$/i,
  /careerbuilder\.com$/i,
  /dice\.com$/i,
  /simplyhired\.com$/i,
  /snagajob\.com$/i,
  /flexjobs\.com$/i,
  /builtin\.com$/i,
  /themuse\.com$/i,
  /hired\.com$/i,
  /triplebyte\.com$/i,
  /otta\.com$/i,
  /cord\.co$/i,
  /getro\.com$/i,
  /jobs\.ashbyhq\.com$/i,
];

function isJobBoardHost(hostname: string): boolean {
  return JOB_BOARD_PATTERNS.some((pattern) => pattern.test(hostname));
}

function deriveCompanyDomain(url: string, companyName: string): string {
  try {
    const u = new URL(url);
    const hostname = u.hostname.replace(/^www\./, "");

    // If the hostname looks like it belongs to a job board, fall back to company name
    if (isJobBoardHost(hostname)) {
      return companyName.toLowerCase().replace(/\s+/g, "") + ".com";
    }

    // Otherwise use the job URL's domain directly (e.g. openai.com/careers)
    return hostname;
  } catch {
    return companyName.toLowerCase().replace(/\s+/g, "") + ".com";
  }
}

export const ApplicationCard = ({ application, onDelete }: ApplicationCardProps) => {
  const { t } = useTranslation();
  const statusInfo = {
    pending: { label: t("application.status.pending"), variant: "secondary" as const },
    interview: { label: t("application.status.interview"), variant: "default" as const },
    rejected: { label: t("application.status.rejected"), variant: "destructive" as const },
    accepted: { label: t("application.status.accepted"), variant: "outline" as const },
  }[application.status];
  const progress = application.questions > 0 ? (application.answersCompleted / application.questions) * 100 : 0;
  const [isDeleting, setIsDeleting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(application.id);
    setIsDeleting(false);
  };

  const logoDomain = useMemo(() => {
    return deriveCompanyDomain(application.url, application.company);
  }, [application.company, application.url]);

  // Prefer Clearbit, but fall back to Google's favicon service (much more reliable).
  const [logoSrc, setLogoSrc] = useState<string>(`https://logo.clearbit.com/${logoDomain}`);

  useEffect(() => {
    setLogoError(false);
    setLogoSrc(`https://logo.clearbit.com/${logoDomain}`);
  }, [logoDomain]);

  const handleLogoError = () => {
    const googleFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(logoDomain)}&sz=128`;
    if (logoSrc !== googleFavicon) {
      setLogoSrc(googleFavicon);
      return;
    }
    setLogoError(true);
  };

  return (
    <Card className="group relative overflow-hidden border-border/40 bg-card hover:border-border hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <div className="p-5">
        {/* Company Logo */}
        <div className="mb-4">
          {!logoError ? (
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted/20 flex items-center justify-center border border-border/30 transition-transform group-hover:scale-105">
              <img
                src={logoSrc}
                alt={`${application.company} logo`}
                className="w-full h-full object-contain p-2"
                loading="lazy"
                onError={handleLogoError}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border/30 transition-transform group-hover:scale-105">
              <span className="text-xl font-bold text-primary">{application.company.charAt(0).toUpperCase()}</span>
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
              {application.status !== "pending" && application.avgResponseDays !== null && application.avgResponseDays !== undefined && (
                <div className="flex items-center gap-1.5 text-primary/80">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {application.avgResponseDays === 0 
                      ? "Same day" 
                      : application.avgResponseDays === 1
                      ? "1 day"
                      : `${Math.round(application.avgResponseDays)} days`}
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
