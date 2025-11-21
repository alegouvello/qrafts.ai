import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/5 via-background to-background pointer-events-none" />
      
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
            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <FileText className="h-7 w-7 text-accent" />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Terms of Service
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">Last updated: November 21, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
        <div className="space-y-6">

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              1. Acceptance of Terms
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              By accessing and using Qraft ("the Service"), you accept and agree to be bound by these Terms of 
              Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              2. Description of Service
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Qraft is a job application tracking and management platform that helps users organize their job 
              search, track applications, manage timelines, and gain insights into their job search progress. 
              The Service includes AI-powered features to assist with application materials and job search strategy.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              3. User Accounts
            </h2>
            <p className="leading-relaxed text-muted-foreground mb-4">To use the Service, you must:</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Be at least 16 years of age</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Provide accurate and complete registration information</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Maintain the security of your account credentials</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Notify us immediately of any unauthorized access to your account</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Be responsible for all activities that occur under your account</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              4. Acceptable Use
            </h2>
            <p className="leading-relaxed text-muted-foreground mb-4">You agree not to:</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Use the Service for any illegal purpose or in violation of any laws</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Attempt to gain unauthorized access to the Service or its related systems</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Interfere with or disrupt the Service or servers connected to the Service</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Upload or transmit viruses or malicious code</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Collect or harvest any personally identifiable information from other users</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Impersonate another person or entity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Use automated systems to access the Service without permission</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              5. User Content
            </h2>
            <p className="leading-relaxed text-muted-foreground mb-4">
              You retain ownership of all content you submit to the Service, including application data, 
              resumes, and notes. By submitting content, you grant us a license to:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Store and process your content to provide the Service</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Use aggregated, anonymized data for analytics and service improvement</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Display your content back to you through the Service interface</span>
              </li>
            </ul>
            <p className="leading-relaxed text-muted-foreground mt-4">
              You are responsible for the accuracy and legality of all content you submit.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              6. Intellectual Property
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              The Service, including its design, functionality, text, graphics, logos, and software, is owned 
              by Qraft and protected by copyright, trademark, and other intellectual property laws. You may not 
              copy, modify, distribute, or reverse engineer any part of the Service without our written permission.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              7. Subscription and Payments
            </h2>
            <p className="leading-relaxed text-muted-foreground mb-4">
              Some features of the Service may require a paid subscription. By subscribing, you agree to:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Pay all applicable fees as described at the time of purchase</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Provide accurate billing information</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Automatic renewal of your subscription unless cancelled</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span>Our right to change pricing with advance notice</span>
              </li>
            </ul>
            <p className="leading-relaxed text-muted-foreground mt-4">
              Refunds are provided according to our refund policy. You may cancel your subscription at any time 
              through your account settings.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              8. AI-Generated Content
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              The Service includes AI-powered features that generate suggestions and content. This AI-generated 
              content is provided as-is and should be reviewed and edited by you before use. We do not guarantee 
              the accuracy, completeness, or suitability of AI-generated content for any specific purpose.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow bg-destructive/5">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              9. Disclaimer of Warranties
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
              OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. WE 
              DO NOT GUARANTEE EMPLOYMENT OUTCOMES OR JOB PLACEMENT.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow bg-destructive/5">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              10. Limitation of Liability
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, QRAFT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED 
              DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR GOODWILL.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              11. Indemnification
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              You agree to indemnify and hold harmless Qraft from any claims, damages, losses, liabilities, and 
              expenses arising from your use of the Service, your violation of these Terms, or your violation of 
              any rights of another party.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              12. Termination
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, 
              for any reason, including breach of these Terms. Upon termination, your right to use the Service 
              will immediately cease. You may terminate your account at any time through your account settings.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              13. Changes to Terms
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify you of any material changes 
              by posting the new Terms on this page and updating the "Last updated" date. Your continued use of 
              the Service after such changes constitutes acceptance of the new Terms.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              14. Governing Law
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in 
              which Qraft operates, without regard to its conflict of law provisions.
            </p>
          </Card>

          <Card className="p-6 sm:p-8 border-border/50 hover:shadow-lg transition-shadow bg-gradient-to-br from-accent/5 to-primary/5">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              15. Contact Information
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              If you have any questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:legal@qraft.app" className="text-accent hover:underline font-medium">
                legal@qraft.app
              </a>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Terms;
