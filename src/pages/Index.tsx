import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, TrendingUp, CheckCircle2, Menu, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import heroWorkspace from "@/assets/hero-workspace.jpg";
import featureOrganize from "@/assets/feature-organize.jpg";
import featureAutomate from "@/assets/feature-automate.jpg";
import qraftLogo from "@/assets/qraft-logo-clean.png";


const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={qraftLogo} alt="QRAFT.AI" className="h-16 sm:h-20 md:h-24" />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" onClick={scrollToFeatures} className="rounded-full">
              Features
            </Button>
            <Link to="/auth">
              <Button variant="outline" size="sm" className="rounded-full border-border/60 hover:border-primary/50 transition-all">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={qraftLogo} alt="QRAFT.AI" className="h-8" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                <Button 
                  variant="ghost" 
                  onClick={scrollToFeatures}
                  className="w-full justify-start text-lg rounded-full"
                >
                  <Sparkles className="h-5 w-5 mr-3" />
                  Features
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={scrollToCTA}
                  className="w-full justify-start text-lg rounded-full"
                >
                  <ArrowRight className="h-5 w-5 mr-3" />
                  Get Started
                </Button>
                <div className="h-px bg-border my-2" />
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full rounded-full shadow-lg shadow-primary/20">
                    Sign In
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="space-y-6 sm:space-y-8 animate-fade-in-up text-center md:text-left">
            <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium">
              ✨ Your Job Search Assistant
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
              Stay Organized.
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-2">
                Get Better.
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0">
              Keep all your applications organized in one place. Build a library of your best answers 
              and improve them over time. Learn what works and refine your approach with every application.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-4 justify-center md:justify-start">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-full group shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto rounded-full border-border/60 hover:border-primary/50 transition-all"
                onClick={scrollToFeatures}
              >
                See How It Works
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 sm:gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>No credit card</span>
              </div>
            </div>
          </div>
          <div className="relative animate-slide-in-right order-first md:order-last">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl opacity-50" />
            <img 
              src={heroWorkspace} 
              alt="Professional workspace with laptop and coffee" 
              className="relative rounded-2xl sm:rounded-3xl shadow-2xl w-full border border-border/50"
            />
          </div>
        </div>
      </section>

      {/* How It Works Video Section */}
      <section className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-8 sm:mb-12 space-y-4 animate-fade-in-up">
          <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium">
            See It In Action
          </div>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">How It Works</h3>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Watch how QRAFT.AI helps you organize applications and build better answers
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-border/50 bg-muted/30">
            <div className="aspect-video relative">
              {/* Placeholder - Replace the src with your actual video URL */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
                <div className="text-center space-y-4 px-4">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto border-2 border-primary/30">
                    <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Demo video coming soon
                  </p>
                </div>
              </div>
              {/* Uncomment and add your video URL when ready:
              <iframe 
                className="absolute inset-0 w-full h-full"
                src="YOUR_VIDEO_URL_HERE"
                title="How QRAFT.AI Works"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              */}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-16 sm:mb-20 space-y-4 animate-fade-in-up">
          <div className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs sm:text-sm font-medium mb-4">
            Everything You Need
          </div>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Organize. Learn. Improve.</h3>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Manage all your applications and answers in one place, then get better with every submission
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl transition-all group-hover:from-primary/10" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden">
                <img 
                  src={featureOrganize} 
                  alt="Organization dashboard" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold">Stay Organized</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Track all your applications in one dashboard. Keep every question, answer, 
                  and deadline organized so you never lose track of where you stand.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl transition-all group-hover:from-accent/10" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden">
                <img 
                  src={featureAutomate} 
                  alt="Smart automation" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold">Save Your Best Answers</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Build a library of your strongest responses. Save answers that work well 
                  and reuse them across applications to maintain consistency and quality.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group relative sm:col-span-2 md:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent rounded-3xl transition-all group-hover:from-success/10" />
            <div className="relative p-6 sm:p-8 space-y-4 sm:space-y-6">
              <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-success/10 via-primary/5 to-accent/10 flex items-center justify-center">
                <TrendingUp className="h-24 w-24 sm:h-32 sm:w-32 text-primary/30" />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl sm:text-2xl font-bold">Learn and Improve</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  See what works across your applications. Refine your answers over time, 
                  track patterns, and continuously improve your response quality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-90" />
          <div className="relative px-6 sm:px-12 py-16 sm:py-20 text-center text-white">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              Ready to Transform Your Job Search?
            </h3>
            <p className="text-lg sm:text-xl mb-8 sm:mb-10 opacity-95 max-w-2xl mx-auto px-4">
              Join thousands of professionals who landed their dream jobs with QRAFT.AI
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto rounded-full group shadow-2xl hover:scale-105 transition-all">
                Start Tracking for Free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/40 mt-12 sm:mt-20">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 text-center space-y-4">
          <img src={qraftLogo} alt="QRAFT.AI" className="h-8 sm:h-10 md:h-12 mx-auto opacity-60" />
          <p className="text-sm sm:text-base text-muted-foreground">© 2025 QRAFT.AI. Built for ambitious job seekers.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
