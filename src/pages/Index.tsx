import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, TrendingUp, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Footer } from "@/components/Footer";
import heroWorkspace from "@/assets/hero-workspace.jpg";
import featureOrganize from "@/assets/feature-organize.jpg";
import featureAutomate from "@/assets/feature-automate.jpg";
import qraftLogo from "@/assets/qrafts-logo.png";


const Index = () => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get the appropriate video based on current language
  const getVideoSource = () => {
    switch (i18n.language) {
      case 'fr':
        return '/qrafts-demo-fr.mp4';
      case 'en':
      default:
        return '/qrafts-demo.mp4';
    }
  };
  
  // Scroll animations for different sections
  const videoSection = useScrollAnimation({ threshold: 0.2 });
  const featuresSection = useScrollAnimation({ threshold: 0.1 });
  const feature1 = useScrollAnimation({ threshold: 0.3 });
  const feature2 = useScrollAnimation({ threshold: 0.3 });
  const feature3 = useScrollAnimation({ threshold: 0.3 });
  const ctaSection = useScrollAnimation({ threshold: 0.3 });

  const scrollToVideo = () => {
    document.getElementById('video')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  const scrollToCTA = () => {
    document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 py-0 flex items-center justify-between" aria-label="Main navigation">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={qraftLogo} alt="QRAFTS logo" className="h-24 sm:h-28 md:h-32 dark:invert" />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" onClick={scrollToFeatures} className="rounded-full min-h-[44px]">
              {t('landing.features.title')}
            </Button>
            <LanguageSwitcher />
            <Link to="/auth">
              <Button variant="outline" size="sm" className="rounded-full border-border/60 hover:border-primary/50 transition-all min-h-[44px]">
                {t('auth.signIn')}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full min-w-[44px] min-h-[44px]" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={qraftLogo} alt="QRAFTS logo" className="h-8 dark:invert" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                <Button 
                  variant="ghost" 
                  onClick={scrollToFeatures}
                  className="w-full justify-start text-lg rounded-full min-h-[48px]"
                >
                  <Sparkles className="h-5 w-5 mr-3" />
                  {t('landing.features.title')}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={scrollToCTA}
                  className="w-full justify-start text-lg rounded-full min-h-[48px]"
                >
                  <ArrowRight className="h-5 w-5 mr-3" />
                  {t('landing.hero.cta')}
                </Button>
                <div className="h-px bg-border my-2" />
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full rounded-full shadow-lg shadow-primary/20 min-h-[48px]">
                    {t('auth.signIn')}
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32 overflow-hidden" aria-labelledby="hero-heading">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="space-y-6 sm:space-y-8 text-center md:text-left">
            <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium animate-fade-in-down">
              ✨ {t('landing.hero.assistant')}
            </div>
            <h2 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {t('landing.hero.stayOrganized')}
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-2">
                {t('landing.hero.getBetter')}
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-4 justify-center md:justify-start animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-full group shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300 min-h-[48px]">
                  {t('landing.hero.cta')}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto rounded-full border-border/60 hover:border-primary/50 hover:scale-105 transition-all duration-300 min-h-[48px]"
                onClick={scrollToVideo}
              >
                {t('landing.hero.demo')}
              </Button>
            </div>
          </div>
          <div className="relative order-first md:order-last animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl opacity-50 animate-glow-pulse" />
            <img 
              src={heroWorkspace} 
              alt="Professional workspace with laptop and coffee" 
              className="relative rounded-2xl sm:rounded-3xl shadow-2xl w-full border border-border/50 hover:scale-105 transition-transform duration-500"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section 
        id="video"
        ref={videoSection.ref}
        className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24" 
        aria-labelledby="video-heading"
      >
        <div className={`text-center mb-12 sm:mb-16 space-y-4 transition-all duration-1000 ${
          videoSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-4 animate-glow-pulse">
            {t('landing.video.badge')}
          </div>
          <h3 id="video-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">{t('landing.video.title')}</h3>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            {t('landing.video.description')}
          </p>
        </div>
        
        <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-300 ${
          videoSection.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-border/50 bg-card hover:shadow-primary/20 hover:shadow-3xl transition-shadow duration-500">
            <div className="aspect-video bg-black">
              <video
                key={i18n.language}
                src={getVideoSource()}
                className="w-full h-full object-contain"
                controls
                muted
                loop
                playsInline
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features" 
        ref={featuresSection.ref}
        className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24" 
        aria-labelledby="features-heading"
      >
        <div className={`text-center mb-16 sm:mb-20 space-y-4 transition-all duration-1000 ${
          featuresSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs sm:text-sm font-medium mb-4">
            {t('landing.features.badge')}
          </div>
          <h3 id="features-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">{t('landing.features.title')}</h3>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            {t('landing.hero.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div 
            ref={feature1.ref}
            className={`group relative transition-all duration-1000 ${
              feature1.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-primary/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden">
                <img 
                  src={featureOrganize} 
                  alt="Organization dashboard" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold">{t('landing.features.organize.title')}</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.features.organize.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div 
            ref={feature2.ref}
            className={`group relative transition-all duration-1000 delay-200 ${
              feature2.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-accent/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden">
                <img 
                  src={featureAutomate} 
                  alt="Smart automation" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold">{t('landing.features.analyze.title')}</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.features.analyze.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div 
            ref={feature3.ref}
            className={`group relative sm:col-span-2 md:col-span-1 transition-all duration-1000 delay-400 ${
              feature3.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-success/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-success/10 via-primary/5 to-accent/10 flex items-center justify-center">
                <TrendingUp className="h-24 w-24 sm:h-32 sm:w-32 text-primary/30" />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold">{t('landing.features.automate.title')}</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.features.automate.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta" 
        ref={ctaSection.ref}
        className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24" 
        aria-labelledby="cta-heading"
      >
        <div className={`relative rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-1000 ${
          ctaSection.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-90 animate-glow-pulse" />
          <div className="relative px-6 sm:px-12 py-16 sm:py-20 text-center text-white">
            <h3 id="cta-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              {t('landing.cta.title')}
            </h3>
            <p className="text-lg sm:text-xl mb-8 sm:mb-10 opacity-95 max-w-2xl mx-auto px-4">
              {t('landing.cta.description')}
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto rounded-full group shadow-2xl hover:scale-110 hover:shadow-primary/30 transition-all duration-300 min-h-[48px]">
                {t('landing.cta.button')}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
