import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: November 21, 2025</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing and using Qraft ("the Service"), you accept and agree to be bound by these Terms of 
              Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="leading-relaxed">
              Qraft is a job application tracking and management platform that helps users organize their job 
              search, track applications, manage timelines, and gain insights into their job search progress. 
              The Service includes AI-powered features to assist with application materials and job search strategy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="leading-relaxed mb-4">To use the Service, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be at least 16 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to the Service or its related systems</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              <li>Upload or transmit viruses or malicious code</li>
              <li>Collect or harvest any personally identifiable information from other users</li>
              <li>Impersonate another person or entity</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Content</h2>
            <p className="leading-relaxed mb-4">
              You retain ownership of all content you submit to the Service, including application data, 
              resumes, and notes. By submitting content, you grant us a license to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Store and process your content to provide the Service</li>
              <li>Use aggregated, anonymized data for analytics and service improvement</li>
              <li>Display your content back to you through the Service interface</li>
            </ul>
            <p className="leading-relaxed mt-4">
              You are responsible for the accuracy and legality of all content you submit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="leading-relaxed">
              The Service, including its design, functionality, text, graphics, logos, and software, is owned 
              by Qraft and protected by copyright, trademark, and other intellectual property laws. You may not 
              copy, modify, distribute, or reverse engineer any part of the Service without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Subscription and Payments</h2>
            <p className="leading-relaxed mb-4">
              Some features of the Service may require a paid subscription. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pay all applicable fees as described at the time of purchase</li>
              <li>Provide accurate billing information</li>
              <li>Automatic renewal of your subscription unless cancelled</li>
              <li>Our right to change pricing with advance notice</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Refunds are provided according to our refund policy. You may cancel your subscription at any time 
              through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. AI-Generated Content</h2>
            <p className="leading-relaxed">
              The Service includes AI-powered features that generate suggestions and content. This AI-generated 
              content is provided as-is and should be reviewed and edited by you before use. We do not guarantee 
              the accuracy, completeness, or suitability of AI-generated content for any specific purpose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
            <p className="leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
              OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. WE 
              DO NOT GUARANTEE EMPLOYMENT OUTCOMES OR JOB PLACEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, QRAFT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED 
              DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR GOODWILL.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="leading-relaxed">
              You agree to indemnify and hold harmless Qraft from any claims, damages, losses, liabilities, and 
              expenses arising from your use of the Service, your violation of these Terms, or your violation of 
              any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, 
              for any reason, including breach of these Terms. Upon termination, your right to use the Service 
              will immediately cease. You may terminate your account at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of any material changes 
              by posting the new Terms on this page and updating the "Last updated" date. Your continued use of 
              the Service after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p className="leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in 
              which Qraft operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <p className="leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at legal@qraft.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
