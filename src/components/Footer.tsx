import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { Linkedin } from "lucide-react";

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Qrafts. {t('footer.allRightsReserved')}.
            </p>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <a 
              href="https://www.linkedin.com/company/qrafts-ai/" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Linkedin className="h-4 w-4 group-hover:text-[#0A66C2] transition-colors" />
              <span>Follow us</span>
            </a>
          </div>
          <nav className="flex gap-6">
            <Link 
              to="/privacy" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('footer.privacyPolicy')}
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <Link 
              to="/terms" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('footer.termsOfService')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};
