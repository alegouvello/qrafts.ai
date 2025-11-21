import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Hero Section */}
      <div className="relative border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-8 rounded-full hover:scale-105 transition-transform"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Privacy Policy
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">Last updated: November 21, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
        <div className="space-y-6">

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              1. Introduction
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Welcome to Qraft. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you about how we look after your personal data when you use our 
              job application tracking service and tell you about your privacy rights.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              2. Information We Collect
            </h2>
            <p className="leading-relaxed text-muted-foreground mb-6">We collect the following types of information:</p>
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <strong className="text-foreground">Account Information:</strong>
                <span className="text-muted-foreground"> Name, email address, and authentication credentials</span>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <strong className="text-foreground">Profile Information:</strong>
                <span className="text-muted-foreground"> Phone number, location, LinkedIn URL, and resume data</span>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <strong className="text-foreground">Application Data:</strong>
                <span className="text-muted-foreground"> Job applications, company names, positions, URLs, and status updates</span>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <strong className="text-foreground">Timeline Events:</strong>
                <span className="text-muted-foreground"> Interview dates, follow-ups, and other application-related events</span>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <strong className="text-foreground">Usage Data:</strong>
                <span className="text-muted-foreground"> How you interact with our service, including pages visited and features used</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              3. How We Use Your Information
            </h2>
            <p className="leading-relaxed text-muted-foreground mb-4">We use your information to:</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Provide and maintain our job tracking service</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Manage your account and provide customer support</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Send you important updates about your applications and account</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Analyze and improve our services</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Generate insights and statistics about job applications</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Provide AI-powered features to enhance your job search</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              4. Data Security
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              We implement appropriate technical and organizational security measures to protect your personal 
              data against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted 
              in transit and at rest, and we use industry-standard authentication practices.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              5. Data Sharing
            </h2>
            <p className="leading-relaxed text-muted-foreground mb-4">
              We do not sell your personal data. We may share your information only in the following circumstances:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>With your explicit consent</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>To comply with legal obligations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>With service providers who assist in operating our platform (under strict confidentiality agreements)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>To protect the rights, property, or safety of Qraft, our users, or others</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              6. Your Rights
            </h2>
            <p className="leading-relaxed text-muted-foreground mb-4">You have the right to:</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Access your personal data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Correct inaccurate or incomplete data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Delete your account and associated data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Export your data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Opt-out of marketing communications</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Object to processing of your data</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              7. Data Retention
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              We retain your personal data only for as long as necessary to provide our services and fulfill 
              the purposes outlined in this privacy policy. You may request deletion of your account at any time 
              through your account settings.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              8. Cookies and Tracking
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              We use essential cookies to maintain your session and remember your preferences. We do not use 
              third-party advertising or tracking cookies. You can control cookies through your browser settings.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              9. Third-Party Services
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Our service integrates with third-party authentication providers (Google) and AI services to 
              enhance functionality. These services have their own privacy policies, and we encourage you to 
              review them.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              10. Children's Privacy
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Our service is not intended for users under the age of 16. We do not knowingly collect personal 
              information from children under 16. If you become aware that a child has provided us with personal 
              data, please contact us.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              11. Changes to This Policy
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              We may update this privacy policy from time to time. We will notify you of any changes by posting 
              the new privacy policy on this page and updating the "Last updated" date.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow bg-gradient-to-br from-primary/5 to-accent/5">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              12. Contact Us
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              If you have any questions about this privacy policy or our data practices, please contact us at{" "}
              <a href="mailto:privacy@qraft.app" className="text-primary hover:underline font-medium">
                privacy@qraft.app
              </a>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
