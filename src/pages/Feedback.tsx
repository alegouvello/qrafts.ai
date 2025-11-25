import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MessageSquare, Sparkles, Mail, Shield } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { z } from "zod";
import feedbackHero from "@/assets/feedback-hero.jpg";

const feedbackSchema = z.object({
  name: z.string().trim().max(100, "Name must be less than 100 characters").optional(),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  category: z.enum(["feature", "bug", "improvement", "other"], {
    required_error: "Please select a category",
  }),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

const Feedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FeedbackFormData>({
    name: "",
    email: "",
    category: "feature",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FeedbackFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      const validatedData = feedbackSchema.parse(formData);

      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Insert feedback into database
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id || null,
        name: validatedData.name || null,
        email: validatedData.email || null,
        category: validatedData.category,
        message: validatedData.message,
      });

      if (error) throw error;

      toast({
        title: "Feedback Submitted!",
        description: "Thank you for helping us improve Qrafts. We appreciate your input!",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        category: "feature",
        message: "",
      });

      // Navigate back after a short delay
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof FeedbackFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof FeedbackFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error",
          description: "Failed to submit feedback. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formRef = useScrollAnimation({ threshold: 0.2 });
  const featuresRef = useScrollAnimation({ threshold: 0.2 });

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Feedback - QRAFTS"
        description="Share your feedback and suggestions to help us improve QRAFTS. We value your input!"
        canonicalUrl={`${window.location.origin}/feedback`}
      />

      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2 hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Hero Section with Background */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${feedbackHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 backdrop-blur-sm mb-6 animate-fade-in">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 animate-fade-in">
              Share Your Feedback
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
              Your insights shape the future of Qrafts. Every suggestion, bug report, and idea helps us build a better experience.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-5xl">
        
        {/* Form Card */}
        <div ref={formRef.ref} className={`transition-all duration-700 ${formRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <Card className="border-border/50 shadow-2xl backdrop-blur-sm bg-card/50">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base">Name (Optional)</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={loading}
                      maxLength={100}
                      className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  {/* Email (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={loading}
                      maxLength={255}
                      className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-base">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as FeedbackFormData["category"] })}
                    disabled={loading}
                  >
                    <SelectTrigger id="category" className="h-12 bg-background/50 border-border/50">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">✨ Feature Request</SelectItem>
                      <SelectItem value="bug">🐛 Bug Report</SelectItem>
                      <SelectItem value="improvement">🚀 Improvement</SelectItem>
                      <SelectItem value="other">💭 Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category}</p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-base">Your Feedback *</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what's on your mind..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    disabled={loading}
                    rows={8}
                    maxLength={2000}
                    className="resize-none bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimum 10 characters</span>
                    <span className={formData.message.length >= 2000 ? "text-destructive" : ""}>{formData.message.length}/2000</span>
                  </div>
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Submit Feedback
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div ref={featuresRef.ref} className={`mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 delay-200 ${featuresRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Direct Impact</h3>
            <p className="text-sm text-muted-foreground">Your feedback directly influences our product roadmap</p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Stay Updated</h3>
            <p className="text-sm text-muted-foreground">Get notified when we implement your suggestions</p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Private & Secure</h3>
            <p className="text-sm text-muted-foreground">Your information is safe and never shared</p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            For security issues, please email{" "}
            <a 
              href="mailto:security@qrafts.ai" 
              className="text-primary hover:underline font-medium transition-colors"
            >
              security@qrafts.ai
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Feedback;
