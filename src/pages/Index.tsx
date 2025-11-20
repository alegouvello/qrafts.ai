import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";
import heroWorkspace from "@/assets/hero-workspace.jpg";
import featureOrganize from "@/assets/feature-organize.jpg";
import featureAutomate from "@/assets/feature-automate.jpg";
import qraftLogo from "@/assets/qraft-logo.png";


const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={qraftLogo} alt="QRAFT.AI" className="h-12" />
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm" className="rounded-full border-border/60 hover:border-primary/50 transition-all">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              ✨ Your Job Search Assistant
            </div>
            <h2 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
              Land Your
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-2">
                Dream Job
              </span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
              The beautiful, minimalist platform that organizes your applications, 
              tracks your progress, and helps you stand out.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/auth">
                <Button size="lg" className="rounded-full group shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-full border-border/60 hover:border-primary/50 transition-all">
                See How It Works
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
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
          <div className="relative animate-slide-in-right">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl opacity-50" />
            <img 
              src={heroWorkspace} 
              alt="Professional workspace with laptop and coffee" 
              className="relative rounded-3xl shadow-2xl w-full border border-border/50"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative container mx-auto px-6 py-24">
        <div className="text-center mb-20 space-y-4 animate-fade-in-up">
          <div className="inline-block px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-4">
            Everything You Need
          </div>
          <h3 className="text-4xl md:text-5xl font-bold tracking-tight">Simple. Beautiful. Effective.</h3>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for modern job seekers who value clarity and organization
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl transition-all group-hover:from-primary/10" />
            <div className="relative p-8 space-y-6">
              <div className="relative h-48 rounded-2xl overflow-hidden">
                <img 
                  src={featureOrganize} 
                  alt="Organization dashboard" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-bold">Stay Organized</h4>
                <p className="text-muted-foreground leading-relaxed">
                  One dashboard for all your applications. Track progress, deadlines, 
                  and responses in a beautiful, clutter-free interface.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl transition-all group-hover:from-accent/10" />
            <div className="relative p-8 space-y-6">
              <div className="relative h-48 rounded-2xl overflow-hidden">
                <img 
                  src={featureAutomate} 
                  alt="Smart automation" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-bold">Smart Automation</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Paste any job URL and watch as questions are automatically extracted. 
                  Spend less time copying, more time crafting perfect answers.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent rounded-3xl transition-all group-hover:from-success/10" />
            <div className="relative p-8 space-y-6">
              <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-success/10 via-primary/5 to-accent/10 flex items-center justify-center">
                <TrendingUp className="h-32 w-32 text-primary/30" />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-bold">Get Better Fast</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Build a library of your best answers. Reuse and refine them across 
                  applications to continuously improve your response quality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-6 py-24">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-90" />
          <div className="relative px-12 py-20 text-center text-white">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Job Search?
            </h3>
            <p className="text-xl mb-10 opacity-95 max-w-2xl mx-auto">
              Join thousands of professionals who landed their dream jobs with QRAFT.AI
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="rounded-full group shadow-2xl hover:scale-105 transition-all">
                Start Tracking for Free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/40 mt-20">
        <div className="container mx-auto px-6 py-12 text-center space-y-4">
          <img src={qraftLogo} alt="QRAFT.AI" className="h-10 mx-auto opacity-60" />
          <p className="text-muted-foreground">© 2024 QRAFT.AI. Built for ambitious job seekers.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
