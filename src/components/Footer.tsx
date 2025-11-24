import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { Linkedin } from "lucide-react";

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          {/* Brand & Social */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <h3 className="text-base font-semibold">{t('footer.followUs')}</h3>
            <div className="flex gap-2">
              <a 
                href="https://www.linkedin.com/company/qrafts-ai/" 
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-full bg-muted hover:bg-[#0A66C2] flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                aria-label="Follow us on LinkedIn"
              >
                <Linkedin className="h-5 w-5 text-foreground group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-base font-semibold">{t('footer.quickLinks')}</h3>
            <nav className="flex flex-col gap-1 text-center">
              <Link 
                to="/blog" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Blog
              </Link>
              <Link 
                to="/privacy" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.privacyPolicy')}
              </Link>
              <Link 
                to="/terms" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.termsOfService')}
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-center md:items-end gap-2">
            <h3 className="text-base font-semibold">{t('footer.company')}</h3>
            <p className="text-sm text-muted-foreground text-center md:text-right">
              Qrafts
            </p>
          </div>
        </div>

        <Separator className="mb-3" />
        
        <div className="text-center text-sm text-muted-foreground">
          © {currentYear} Qrafts. {t('footer.allRightsReserved')}.
        </div>
      </div>
    </footer>
  );
};
