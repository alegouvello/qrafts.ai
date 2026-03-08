import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Check, X, Crown, Sparkles, ArrowLeft, Zap, Brain, FileText, BarChart3, MessageSquare, Calendar, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import qraftLogo from "@/assets/qrafts-logo.png";

interface FeatureItem {
  nameKey: string;
  free: boolean | string;
  pro: boolean | string;
  icon: React.ReactNode;
}

const Pricing = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const features: FeatureItem[] = [
    { nameKey: "trackApps", free: t("pricing.freeFeatures.apps"), pro: t("pricing.proFeatures.unlimited"), icon: <FileText className="h-4 w-4" /> },
    { nameKey: "statusTracking", free: true, pro: true, icon: <BarChart3 className="h-4 w-4" /> },
    { nameKey: "calendarTimeline", free: true, pro: true, icon: <Calendar className="h-4 w-4" /> },
    { nameKey: "companyNotes", free: true, pro: true, icon: <FileText className="h-4 w-4" /> },
    { nameKey: "aiSuggestions", free: false, pro: true, icon: <Brain className="h-4 w-4" /> },
    { nameKey: "aiImprovements", free: false, pro: true, icon: <Sparkles className="h-4 w-4" /> },
    { nameKey: "resumeTailoring", free: false, pro: true, icon: <FileText className="h-4 w-4" /> },
    { nameKey: "roleFitAnalysis", free: false, pro: true, icon: <BarChart3 className="h-4 w-4" /> },
    { nameKey: "confidenceAnalysis", free: false, pro: true, icon: <Zap className="h-4 w-4" /> },
    { nameKey: "profileReview", free: false, pro: true, icon: <Shield className="h-4 w-4" /> },
    { nameKey: "aiChat", free: false, pro: true, icon: <MessageSquare className="h-4 w-4" /> },
    { nameKey: "interviewPrep", free: false, pro: true, icon: <Brain className="h-4 w-4" /> },
  ];

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
        toast({ title: t("toast.error"), description: "Failed to create checkout session", variant: "destructive" });
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({ title: t("toast.error"), description: "Failed to initiate checkout", variant: "destructive" });
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
      
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      <header className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={qraftLogo} alt="Qrafts" className="h-12 sm:h-14 dark:invert" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("pricing.back")}
              </Button>
            </Link>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="rounded-full">
                  {t("pricing.dashboard")}
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="rounded-full">
                  {t("pricing.getStarted")}
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-12 sm:mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            {t("pricing.simplePricing")}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            {t("pricing.chooseYourPlan").split(" ").slice(0, -1).join(" ")}{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("pricing.chooseYourPlan").split(" ").slice(-1)}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("pricing.heroSubtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-16 sm:mb-20">
          {/* Free Plan */}
          <Card className="relative border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">{t("pricing.free")}</CardTitle>
              <CardDescription>{t("pricing.freeDesc")}</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">{t("pricing.month")}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{t("pricing.freeFeatures.apps")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{t("pricing.freeFeatures.status")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{t("pricing.freeFeatures.calendar")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{t("pricing.freeFeatures.notes")}</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <X className="h-5 w-5 flex-shrink-0 opacity-50" />
                  <span>{t("pricing.freeFeatures.noAi")}</span>
                </li>
              </ul>
              {isAuthenticated ? (
                <Button variant="outline" className="w-full rounded-full" disabled>
                  {t("pricing.currentPlan")}
                </Button>
              ) : (
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full rounded-full">
                    {t("pricing.getStartedFree")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-primary/50 bg-gradient-to-b from-primary/5 to-transparent shadow-lg shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold rounded-full">
                {t("pricing.mostPopular")}
              </span>
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                {t("pricing.pro")}
              </CardTitle>
              <CardDescription>{t("pricing.proDesc")}</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">$29.99</span>
                <span className="text-muted-foreground">{t("pricing.month")}</span>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium rounded-full">
                  <Zap className="h-3.5 w-3.5" />
                  {t("pricing.freeTrialBadge")}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium">{t("pricing.proFeatures.unlimited")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{t("pricing.proFeatures.everything")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{t("pricing.proFeatures.aiSuggestions")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{t("pricing.proFeatures.resume")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{t("pricing.proFeatures.roleFit")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{t("pricing.proFeatures.chatAssistant")}</span>
                </li>
              </ul>
              {isSubscribed ? (
                <Button className="w-full rounded-full" disabled>
                  <Crown className="h-4 w-4 mr-2" />
                  {t("pricing.currentPlan")}
                </Button>
              ) : isAuthenticated ? (
                <Button 
                  className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  onClick={handleUpgrade}
                  disabled={isLoading}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {isLoading ? t("common.loading") : t("pricing.upgradeToPro")}
                </Button>
              ) : (
                <Link to="/auth" className="block w-full">
                  <Button className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                    {t("pricing.getStartedPro")}
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
              <h3 className="font-semibold text-lg mb-1">{t("pricing.guarantee.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("pricing.guarantee.desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            {t("pricing.featureComparison")}
          </h2>
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 border-b border-border/50 font-medium">
              <div>{t("pricing.feature")}</div>
              <div className="text-center">{t("pricing.free")}</div>
              <div className="text-center text-primary">{t("pricing.pro")}</div>
            </div>
            <div className="divide-y divide-border/50">
              {features.map((feature, index) => (
                <div 
                  key={feature.nameKey} 
                  className={`grid grid-cols-3 gap-4 p-4 items-center ${
                    index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{feature.icon}</span>
                    <span className="text-sm sm:text-base">{t(`pricing.featureNames.${feature.nameKey}`)}</span>
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
            {t("pricing.ctaTitle")}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("pricing.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              isSubscribed ? (
                <Link to="/dashboard">
                  <Button size="lg" className="rounded-full">
                    {t("pricing.goToDashboard")}
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
                  {isLoading ? t("common.loading") : t("pricing.upgradePrice")}
                </Button>
              )
            ) : (
              <Link to="/auth">
                <Button size="lg" className="rounded-full">
                  {t("pricing.getStartedFree")}
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
