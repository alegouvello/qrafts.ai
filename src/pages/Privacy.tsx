import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
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

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: November 21, 2025</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="leading-relaxed">
              Welcome to Qraft. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you about how we look after your personal data when you use our 
              job application tracking service and tell you about your privacy rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="leading-relaxed mb-4">We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, and authentication credentials</li>
              <li><strong>Profile Information:</strong> Phone number, location, LinkedIn URL, and resume data</li>
              <li><strong>Application Data:</strong> Job applications, company names, positions, URLs, and status updates</li>
              <li><strong>Timeline Events:</strong> Interview dates, follow-ups, and other application-related events</li>
              <li><strong>Usage Data:</strong> How you interact with our service, including pages visited and features used</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our job tracking service</li>
              <li>Manage your account and provide customer support</li>
              <li>Send you important updates about your applications and account</li>
              <li>Analyze and improve our services</li>
              <li>Generate insights and statistics about job applications</li>
              <li>Provide AI-powered features to enhance your job search</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal 
              data against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted 
              in transit and at rest, and we use industry-standard authentication practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
            <p className="leading-relaxed mb-4">
              We do not sell your personal data. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li>
              <li>To protect the rights, property, or safety of Qraft, our users, or others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Object to processing of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="leading-relaxed">
              We retain your personal data only for as long as necessary to provide our services and fulfill 
              the purposes outlined in this privacy policy. You may request deletion of your account at any time 
              through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p className="leading-relaxed">
              We use essential cookies to maintain your session and remember your preferences. We do not use 
              third-party advertising or tracking cookies. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Third-Party Services</h2>
            <p className="leading-relaxed">
              Our service integrates with third-party authentication providers (Google) and AI services to 
              enhance functionality. These services have their own privacy policies, and we encourage you to 
              review them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
            <p className="leading-relaxed">
              Our service is not intended for users under the age of 16. We do not knowingly collect personal 
              information from children under 16. If you become aware that a child has provided us with personal 
              data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes by posting 
              the new privacy policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions about this privacy policy or our data practices, please contact us at 
              privacy@qraft.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
