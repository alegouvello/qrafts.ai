import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import featureOrganize from "@/assets/feature-organize.jpg";
import featureAutomate from "@/assets/feature-automate.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ApplicationTracker
          </h1>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-5xl md:text-6xl font-bold leading-tight">
              Your Job Search,
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Finally Organized
              </span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Track applications, manage answers, and refine your responses over time. 
              The simple, beautiful platform that makes job hunting less overwhelming.
            </p>
            <div className="flex gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="group">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
          <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
            <img 
              src={heroImage} 
              alt="Professional working on career" 
              className="rounded-2xl shadow-strong w-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 space-y-4">
          <h3 className="text-3xl md:text-4xl font-bold">Why You'll Love It</h3>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to stay organized and confident during your job search.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="group p-8 rounded-2xl bg-gradient-to-br from-card to-secondary/30 shadow-soft hover:shadow-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-6 h-48 rounded-xl overflow-hidden">
              <img 
                src={featureOrganize} 
                alt="Organization" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <FileText className="h-12 w-12 text-primary mb-4" />
            <h4 className="text-2xl font-bold mb-3">Stay Organized</h4>
            <p className="text-muted-foreground leading-relaxed">
              Upload your resume once and track every application in one beautiful dashboard. 
              No more scattered documents or forgotten deadlines.
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-gradient-to-br from-card to-secondary/30 shadow-soft hover:shadow-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="mb-6 h-48 rounded-xl overflow-hidden">
              <img 
                src={featureAutomate} 
                alt="Automation" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <Sparkles className="h-12 w-12 text-accent mb-4" />
            <h4 className="text-2xl font-bold mb-3">Smart Automation</h4>
            <p className="text-muted-foreground leading-relaxed">
              Paste a job posting URL and we'll automatically extract the questions you need to answer. 
              Save hours of manual work.
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-gradient-to-br from-card to-secondary/30 shadow-soft hover:shadow-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="mb-6 h-48 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <TrendingUp className="h-24 w-24 text-primary" />
            </div>
            <TrendingUp className="h-12 w-12 text-success mb-4" />
            <h4 className="text-2xl font-bold mb-3">Improve Over Time</h4>
            <p className="text-muted-foreground leading-relaxed">
              Track your answers across applications and refine them as you learn. 
              Get better at answering common questions with every application.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-3xl bg-gradient-to-r from-primary to-accent p-12 md:p-16 text-center text-primary-foreground shadow-strong">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Job Search?
          </h3>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of job seekers who are staying organized and landing their dream jobs faster.
          </p>
          <Link to="/dashboard">
            <Button size="lg" variant="secondary" className="group">
              Start Tracking Applications
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2024 ApplicationTracker. Making job hunting simple.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
