import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageTitle';

const LOGO = "/icons/icon-192.png";

// Bump this by hand whenever the document text changes. Never compute it:
// a legal document's revision date must not move on its own.
const LAST_UPDATED = 'July 28, 2026';

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
        <p className="text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Contraya ("the Service"), operated by Renovatio, LLC, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. You must be at least 13 years old and have the legal capacity to enter into a binding agreement to use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>Contraya is a contract organizer that reads documents you upload, describes what they say in plain English, and reminds you about the dates they contain. The Service is provided "as is" and is subject to change at any time.</p>

        <h2>3. Not Legal Advice</h2>
        <p>Contraya describes what your documents say. It is an informational tool, not a law firm, and nothing in the Service is legal advice. Summaries do not tell you what you should do, whether an agreement is favorable, or whether a clause is enforceable in your jurisdiction. No attorney-client relationship is created by using the Service. For legal advice, consult a licensed attorney.</p>

        <h2>4. User Accounts</h2>
        <p>You must create an account to use Contraya. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

        <h2>5. Subscriptions and Billing</h2>
        <p>Contraya offers a free tier and a paid Premium subscription. The free tier includes a limited number of contract readings; we may adjust what the free tier includes over time.</p>
        <p>Premium is an auto-renewing subscription billed through your Apple ID. It renews automatically at the end of each billing period unless you cancel at least 24 hours before the period ends. You can manage or cancel the subscription at any time in your device's App Store subscription settings; deleting the app does not cancel a subscription. Billing, receipts, and refunds are handled by Apple under Apple's terms.</p>
        <p>Subscription prices may change. If they do, the change applies to future billing periods and you will be able to review it before it takes effect, following Apple's subscription rules.</p>

        <h2>6. User Content</h2>
        <p>You retain ownership of all content you upload to Contraya, including contracts and related documents. By uploading content, you grant Contraya a non-exclusive license to process and store that content solely for the purpose of providing the Service to you. You are responsible for having the right to upload the documents you add, including documents you receive by email and forward to the Service.</p>

        <h2>7. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Upload malicious files or content</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
        </ul>

        <h2>8. Data Accuracy</h2>
        <p>Contraya reads your documents to produce summaries, dates, and reminders. Extracted information may not always be accurate or complete. You are responsible for reviewing every date and detail against your original document before relying on it. The original document is the only version that counts. Contraya is not liable for missed deadlines, payments, renewals, or any consequence of inaccurate or missing data.</p>

        <h2>9. Notifications</h2>
        <p>Contraya can send you reminders about contract dates as push notifications. These are optional and only sent if you enable them on your device. You can turn them off at any time in the app settings or in your device settings.</p>

        <h2>10. Termination</h2>
        <p>You may delete your account at any time from the app settings. When you do, your data is deleted promptly, and any residual copies are removed from our systems within 30 days. We reserve the right to terminate accounts that violate these Terms.</p>

        <h2>11. Disclaimer of Warranties</h2>
        <p>The Service is provided "as is" without warranties of any kind, either express or implied. Contraya does not warrant that the Service will be uninterrupted, error-free, or completely secure.</p>

        <h2>12. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, Contraya shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.</p>

        <h2>13. Indemnification</h2>
        <p>You agree to indemnify and hold harmless Renovatio, LLC and its officers and employees from any claims, damages, or expenses arising from your violation of these Terms or your misuse of the Service.</p>

        <h2>14. Governing Law</h2>
        <p>These Terms are governed by the laws of the Commonwealth of Puerto Rico, without regard to its conflict of law provisions. Any dispute arising from these Terms or the Service shall be brought in the courts located in Puerto Rico, and you consent to their jurisdiction.</p>

        <h2>15. Severability</h2>
        <p>If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.</p>

        <h2>16. Changes to Terms</h2>
        <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will notify users of material changes via email or in-app notification.</p>

        <h2>17. Contact</h2>
        <p>If you have questions about these Terms, contact us at <a href="mailto:hello@usecontraya.com">hello@usecontraya.com</a>.</p>
      </main>

      <footer className="border-t py-8 px-5 text-center text-sm text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground transition-colors mr-6">Privacy Policy</Link>
        <Link to="/" className="hover:text-foreground transition-colors">Back to Home</Link>
      </footer>
    </div>
  );
}
