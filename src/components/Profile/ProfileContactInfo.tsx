import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Linkedin, Globe, MapPin } from "lucide-react";

interface ProfileContactInfoProps {
  email?: string;
  phone?: string;
  linkedin_url?: string;
  website_url?: string;
}

export const ProfileContactInfo = ({
  email,
  phone,
  linkedin_url,
  website_url,
}: ProfileContactInfoProps) => {
  if (!email && !phone && !linkedin_url && !website_url) return null;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {email && (
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                <a href={`mailto:${email}`} className="text-sm sm:text-base font-medium hover:text-primary transition-colors truncate block">
                  {email}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {phone && (
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
                <a href={`tel:${phone}`} className="text-sm sm:text-base font-medium hover:text-primary transition-colors truncate block">
                  {phone}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {linkedin_url && (
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm sm:col-span-2">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Linkedin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">LinkedIn</p>
                <a href={linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm sm:text-base font-medium text-primary hover:underline truncate block">
                  {linkedin_url}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {website_url && (
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur-sm sm:col-span-2">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Website</p>
                <a href={website_url} target="_blank" rel="noopener noreferrer" className="text-sm sm:text-base font-medium text-primary hover:underline truncate block">
                  {website_url}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
