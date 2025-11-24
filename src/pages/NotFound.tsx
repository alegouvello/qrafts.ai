import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";
import qraftLogo from "@/assets/qrafts-logo.png";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SEO 
        title="Page Not Found - 404"
        description="The page you're looking for doesn't exist. Return to QRAFTS homepage to continue tracking your job applications."
        noindex={true}
      />
      <div className="text-center space-y-6">
        <img src={qraftLogo} alt="Qrafts" className="h-12 mx-auto opacity-60 dark:invert" />
        <div>
          <h1 className="mb-2 text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{t('notFound.title')}</h1>
          <p className="mb-6 text-xl text-muted-foreground">{t('notFound.message')}</p>
          <a 
            href="/" 
            className="inline-block px-6 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
          >
            {t('notFound.returnHome')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
