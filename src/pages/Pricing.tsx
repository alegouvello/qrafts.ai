import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Check, X, Crown, Sparkles, ArrowLeft, Zap, Brain, FileText, BarChart3, MessageSquare, Calendar, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import qraftLogo from "@/assets/qrafts-logo.png";

interface FeatureItem {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  icon: React.ReactNode;
}

const features: FeatureItem[] = [
  { name: "Track Applications", free: "Up to 10", pro: "Unlimited", icon: <FileText className="h-4 w-4" /> },
  { name: "Application Status Tracking", free: true, pro: true, icon: <BarChart3 className="h-4 w-4" /> },
  { name: "Calendar & Timeline View", free: true, pro: true, icon: <Calendar className="h-4 w-4" /> },
  { name: "Company Notes", free: true, pro: true, icon: <FileText className="h-4 w-4" /> },
  { name: "AI Answer Suggestions", free: false, pro: true, icon: <Brain className="h-4 w-4" /> },
  { name: "AI Answer Improvements", free: false, pro: true, icon: <Sparkles className="h-4 w-4" /> },
  { name: "Resume Tailoring", free: false, pro: true, icon: <FileText className="h-4 w-4" /> },
  { name: "Role Fit Analysis", free: false, pro: true, icon: <BarChart3 className="h-4 w-4" /> },
  { name: "Confidence Analysis", free: false, pro: true, icon: <Zap className="h-4 w-4" /> },
  { name: "Profile Review & Enhancement", free: false, pro: true, icon: <Shield className="h-4 w-4" /> },
  { name: "AI Chat Assistant", free: false, pro: true, icon: <MessageSquare className="h-4 w-4" /> },
  { name: "Interview Prep Generation", free: false, pro: true, icon: <Brain className="h-4 w-4" /> },
];

const Pricing = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    
    if (user) {
      const { data } = await supabase.functions.invoke('check-subscription');
      setIsSubscribed(data?.subscribed || data?.is_trialing);
    }
  };

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) {
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate checkout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderFeatureValue = (value: boolean | string, isPro: boolean) => {
    if (typeof value === 'string') {
      return <span className={isPro ? "text-primary font-medium" : "text-muted-foreground"}>{value}</span>;
    }
    return value ? (
      <Check className={`h-5 w-5 ${isPro ? 'text-primary' : 'text-green-500'}`} />
    ) : (
      <X className="h-5 w-5 text-muted-foreground/50" />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Pricing - Qrafts"
        description="Compare Qrafts Free and Pro plans. Unlock unlimited applications and AI-powered features to supercharge your job search."
      />
      
      {/* Decorative background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={qraftLogo} alt="Qrafts" className="h-12 sm:h-14 dark:invert" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="rounded-full">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="rounded-full">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-12 sm:mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            Simple Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Plan
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade when you're ready for unlimited applications and AI-powered features
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-16 sm:mb-20">
          {/* Free Plan */}
          <Card className="relative border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Up to 10 applications</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Status tracking & timeline</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Calendar view</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Company notes</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <X className="h-5 w-5 flex-shrink-0 opacity-50" />
                  <span>AI-powered features</span>
                </li>
              </ul>
              {isAuthenticated ? (
                <Button variant="outline" className="w-full rounded-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full rounded-full">
                    Get Started Free
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-primary/50 bg-gradient-to-b from-primary/5 to-transparent shadow-lg shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold rounded-full">
                Most Popular
              </span>
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Pro
              </CardTitle>
              <CardDescription>For serious job seekers</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">$29.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium rounded-full">
                  <Zap className="h-3.5 w-3.5" />
                  7-day free trial
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium">Unlimited applications</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>AI answer suggestions</span>
                </li>
                <li className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Resume tailoring</span>
                </li>
                <li className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Role fit analysis</span>
                </li>
                <li className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>AI chat assistant</span>
                </li>
              </ul>
              {isSubscribed ? (
                <Button className="w-full rounded-full" disabled>
                  <Crown className="h-4 w-4 mr-2" />
                  Current Plan
                </Button>
              ) : isAuthenticated ? (
                <Button 
                  className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  onClick={handleUpgrade}
                  disabled={isLoading}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {isLoading ? "Loading..." : "Upgrade to Pro"}
                </Button>
              ) : (
                <Link to="/auth" className="block w-full">
                  <Button className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                    Get Started with Pro
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Satisfaction Guarantee */}
        <div className="max-w-2xl mx-auto mb-16 sm:mb-20">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 rounded-2xl bg-muted/30 border border-border/50 backdrop-blur">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex-shrink-0">
              <Shield className="h-7 w-7 text-green-500" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-lg mb-1">30-Day Money-Back Guarantee</h3>
              <p className="text-sm text-muted-foreground">
                Not satisfied? Get a full refund within 30 days, no questions asked. We're confident you'll love Qrafts.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Feature Comparison
          </h2>
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 border-b border-border/50 font-medium">
              <div>Feature</div>
              <div className="text-center">Free</div>
              <div className="text-center text-primary">Pro</div>
            </div>
            <div className="divide-y divide-border/50">
              {features.map((feature, index) => (
                <div 
                  key={feature.name} 
                  className={`grid grid-cols-3 gap-4 p-4 items-center ${
                    index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{feature.icon}</span>
                    <span className="text-sm sm:text-base">{feature.name}</span>
                  </div>
                  <div className="flex justify-center">
                    {renderFeatureValue(feature.free, false)}
                  </div>
                  <div className="flex justify-center">
                    {renderFeatureValue(feature.pro, true)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 sm:mt-20 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Ready to supercharge your job search?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join thousands of job seekers using Qrafts to land their dream jobs faster
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              isSubscribed ? (
                <Link to="/dashboard">
                  <Button size="lg" className="rounded-full">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="lg" 
                  className="rounded-full bg-gradient-to-r from-primary to-accent"
                  onClick={handleUpgrade}
                  disabled={isLoading}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {isLoading ? "Loading..." : "Upgrade to Pro - $29.99/month"}
                </Button>
              )
            ) : (
              <Link to="/auth">
                <Button size="lg" className="rounded-full">
                  Get Started Free
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
