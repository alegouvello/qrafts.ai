import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, TrendingUp, Menu, MessageSquare, Zap, Brain } from "lucide-react";
import TryChatWidget from "@/components/TryChatWidget";
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
import { SocialProof } from "@/components/SocialProof";
import heroWorkspace from "@/assets/hero-workspace.jpg";
import heroProfessional from "@/assets/hero-realistic.jpg";
import featureOrganize from "@/assets/feature-organize-realistic.jpg";
import featureAnalyze from "@/assets/feature-analyze-realistic.jpg";
import featureAutomate from "@/assets/feature-automate-realistic.jpg";
import qraftLogo from "@/assets/qrafts-logo.png";


const Index = () => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Get the appropriate video based on current language
  const getVideoSource = () => {
    switch (i18n.language) {
      case 'fr':
        return '/qrafts-demo-fr.mp4';
      case 'es':
        return '/qrafts-demo-es.mp4';
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
  const aiAssistantSection = useScrollAnimation({ threshold: 0.2 });
  const aiFeature1 = useScrollAnimation({ threshold: 0.3 });
  const aiFeature2 = useScrollAnimation({ threshold: 0.3 });
  const aiFeature3 = useScrollAnimation({ threshold: 0.3 });
  const tryChatSection = useScrollAnimation({ threshold: 0.3 });
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

  // Autoplay video when it comes into view
  useEffect(() => {
    if (videoSection.isVisible && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay was prevented, user needs to interact first
      });
    }
  }, [videoSection.isVisible]);

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between" aria-label="Main navigation">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={qraftLogo} alt="Qrafts logo" className="h-12 sm:h-14 md:h-16 dark:invert" />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <LanguageSwitcher />
            <Link to="/auth">
              <Button variant="outline" size="sm" className="rounded-full border-border/60 hover:border-primary/50 transition-all min-h-[44px] md:min-h-[48px] px-6 text-base">
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
            <SheetContent side="right" className="w-[280px] sm:w-[350px] md:w-[400px]">
              <SheetHeader className="py-3 sm:py-4">
                <SheetTitle className="flex items-center gap-2">
                  <img src={qraftLogo} alt="Qrafts logo" className="h-8 dark:invert" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                <Button 
                  variant="ghost" 
                  onClick={scrollToFeatures}
                  className="w-full justify-start text-base rounded-full min-h-[48px] whitespace-normal text-left h-auto py-3"
                >
                  <Sparkles className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="flex-1">{t('landing.features.title')}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={scrollToCTA}
                  className="w-full justify-start text-base rounded-full min-h-[48px]"
                >
                  <ArrowRight className="h-5 w-5 mr-3 flex-shrink-0" />
                  {t('landing.hero.cta')}
                </Button>
                <div className="h-px bg-border my-2" />
                <LanguageSwitcher />
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
          <div className="space-y-8 sm:space-y-10 text-center md:text-left">
            <h2 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight animate-fade-in-up">
              {t('landing.hero.stayOrganized')}
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-3">
                {t('landing.hero.getBetter')}
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center md:justify-start animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
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
            
            {/* Social Proof */}
            <SocialProof />
          </div>
          <div className="relative order-first md:order-last animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl opacity-50 animate-glow-pulse" />
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-border/50 hover:scale-105 transition-transform duration-500">
              <img 
                src={heroProfessional} 
                alt="Professional organizing job applications with confidence" 
                className="relative w-full"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.15)_100%)] pointer-events-none" />
            </div>
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
                ref={videoRef}
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
          <h3 id="features-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('landing.features.title')}
            </span>
          </h3>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            {t('landing.hero.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div 
            ref={feature1.ref}
            className={`group relative transition-all duration-1000 ${
              feature1.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-primary/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src={featureOrganize} 
                  alt="Organization dashboard" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.2)_100%)] pointer-events-none" />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:rotate-6 transition-transform duration-300">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold group-hover:text-primary transition-colors duration-300">{t('landing.features.organize.title')}</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.features.organize.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div 
            ref={feature2.ref}
            className={`group relative transition-all duration-1000 delay-100 ${
              feature2.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-accent/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src={featureAnalyze} 
                  alt="AI-powered analysis dashboard" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.2)_100%)] pointer-events-none" />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 group-hover:rotate-6 transition-transform duration-300">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold group-hover:text-accent transition-colors duration-300">{t('landing.features.analyze.title')}</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.features.analyze.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div 
            ref={feature3.ref}
            className={`group relative sm:col-span-2 md:col-span-1 transition-all duration-1000 delay-200 ${
              feature3.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-success/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src={featureAutomate} 
                  alt="Automated follow-up notifications" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.2)_100%)] pointer-events-none" />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20 group-hover:rotate-6 transition-transform duration-300">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold group-hover:text-success transition-colors duration-300">{t('landing.features.automate.title')}</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.features.automate.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Showcase Section */}
      <section 
        ref={aiAssistantSection.ref}
        className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24 overflow-hidden" 
        aria-labelledby="ai-assistant-heading"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        <div className={`text-center mb-16 sm:mb-20 space-y-4 transition-all duration-1000 ${
          aiAssistantSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-4 animate-glow-pulse">
            {t('landing.aiAssistant.badge')}
          </div>
          <h3 id="ai-assistant-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {t('landing.aiAssistant.title')}
            </span>
          </h3>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            {t('landing.aiAssistant.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {/* AI Feature 1 */}
          <div 
            ref={aiFeature1.ref}
            className={`group relative transition-all duration-1000 ${
              aiFeature1.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-primary/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 flex flex-col h-full">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:rotate-6 transition-transform duration-300">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-3 mt-6">
                <h4 className="text-xl sm:text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                  {t('landing.aiAssistant.features.smart.title')}
                </h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.aiAssistant.features.smart.description')}
                </p>
              </div>
              {/* Demo interaction */}
              <div className="relative mt-auto pt-6">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm text-foreground italic">
                      {t('landing.aiAssistant.features.smart.demo')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 pl-8">
                    <div className="flex-1">
                      <div className="h-2 bg-primary/20 rounded-full mb-2 animate-pulse" />
                      <div className="h-2 bg-primary/10 rounded-full w-3/4 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Feature 2 */}
          <div 
            ref={aiFeature2.ref}
            className={`group relative transition-all duration-1000 delay-100 ${
              aiFeature2.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-accent/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 flex flex-col h-full">
              <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 group-hover:rotate-6 transition-transform duration-300">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <div className="space-y-3 mt-6">
                <h4 className="text-xl sm:text-2xl font-bold group-hover:text-accent transition-colors duration-300">
                  {t('landing.aiAssistant.features.instant.title')}
                </h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.aiAssistant.features.instant.description')}
                </p>
              </div>
              {/* Demo interaction */}
              <div className="relative mt-auto pt-6">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <MessageSquare className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <p className="text-sm text-foreground italic">
                      {t('landing.aiAssistant.features.instant.demo')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 pl-8">
                    <div className="flex-1">
                      <div className="h-2 bg-accent/20 rounded-full mb-2 animate-pulse" />
                      <div className="h-2 bg-accent/10 rounded-full w-2/3 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Feature 3 */}
          <div 
            ref={aiFeature3.ref}
            className={`group relative transition-all duration-1000 delay-200 ${
              aiFeature3.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl transition-all duration-500 group-hover:from-primary/10 group-hover:scale-105" />
            <div className="relative p-6 sm:p-8 flex flex-col h-full">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:rotate-6 transition-transform duration-300">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-3 mt-6">
                <h4 className="text-xl sm:text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                  {t('landing.aiAssistant.features.contextual.title')}
                </h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t('landing.aiAssistant.features.contextual.description')}
                </p>
              </div>
              {/* Demo interaction */}
              <div className="relative mt-auto pt-6">
                <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm text-foreground italic">
                      {t('landing.aiAssistant.features.contextual.demo')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 pl-8">
                    <div className="flex-1">
                      <div className="h-2 bg-primary/20 rounded-full mb-2 animate-pulse" />
                      <div className="h-2 bg-primary/10 rounded-full w-4/5 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Try Chat Widget Section */}
      <section 
        ref={tryChatSection.ref}
        className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24" 
      >
        <div className={`transition-all duration-1000 ${
          tryChatSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <TryChatWidget />
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
            <p className="text-lg sm:text-xl mb-3 opacity-95 max-w-2xl mx-auto px-4">
              {t('landing.cta.description')}
            </p>
            <p className="text-sm sm:text-base mb-8 sm:mb-10 opacity-90 max-w-xl mx-auto px-4">
              {t('landing.cta.assistantNote')}
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
