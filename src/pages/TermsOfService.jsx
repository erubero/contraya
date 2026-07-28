import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageTitle';

const LOGO = "/icons/icon-192.png";

export default function TermsOfService() {
  usePageMeta({
    title: 'Terms of Service',
    description: 'The terms that govern your use of Contraya, the contract reader and reminder app.',
    canonicalPath: '/terms',
  });
  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors select-none">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <img src={LOGO} alt="Contraya" className="w-7 h-7 rounded-xl object-cover" />
            <span className="font-bold tracking-tight">Contraya</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-16 prose prose-sm prose-slate dark:prose-invert max-w-none">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Contraya ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>Contraya is a contract organizer that reads documents you upload, describes what they say in plain English, and reminds you about the dates they contain. The Service is provided "as is" and is subject to change at any time.</p>

        <h2>3. Not Legal Advice</h2>
        <p>Contraya describes what your documents say. It is an informational tool, not a law firm, and nothing in the Service is legal advice. Summaries do not tell you what you should do, whether an agreement is favorable, or whether a clause is enforceable in your jurisdiction. No attorney-client relationship is created by using the Service. For legal advice, consult a licensed attorney.</p>

        <h2>4. User Accounts</h2>
        <p>You must create an account to use Contraya. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

        <h2>5. User Content</h2>
        <p>You retain ownership of all content you upload to Contraya, including contracts and related documents. By uploading content, you grant Contraya a non-exclusive license to process and store that content solely for the purpose of providing the Service to you.</p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Upload malicious files or content</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
        </ul>

        <h2>7. Data Accuracy</h2>
        <p>Contraya reads your documents to produce summaries, dates, and reminders. Extracted information may not always be accurate or complete. You are responsible for reviewing every date and detail against your original document before relying on it. The original document is the only version that counts. Contraya is not liable for missed deadlines, payments, renewals, or any consequence of inaccurate or missing data.</p>

        <h2>8. Notifications</h2>
        <p>Contraya can send you reminders about contract dates as push notifications. These are optional and only sent if you enable them on your device. You can turn them off at any time in the app settings or in your device settings.</p>

        <h2>9. Termination</h2>
        <p>You may delete your account at any time from the app settings. Upon deletion, all your data will be permanently removed. We reserve the right to terminate accounts that violate these Terms.</p>

        <h2>10. Disclaimer of Warranties</h2>
        <p>The Service is provided "as is" without warranties of any kind, either express or implied. Contraya does not warrant that the Service will be uninterrupted, error-free, or completely secure.</p>

        <h2>11. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, Contraya shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.</p>

        <h2>12. Changes to Terms</h2>
        <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will notify users of material changes via email or in-app notification.</p>

        <h2>13. Contact</h2>
        <p>If you have questions about these Terms, please contact us through the app's support channel.</p>
      </main>

      <footer className="border-t py-8 px-5 text-center text-sm text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground transition-colors mr-6">Privacy Policy</Link>
        <Link to="/" className="hover:text-foreground transition-colors">Back to Home</Link>
      </footer>
    </div>
  );
}