import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageTitle';

const LOGO = "/icons/icon-192.png";

export default function PrivacyPolicy() {
  usePageMeta({
    title: 'Privacy Policy',
    description: 'How Contraya handles your data: what is collected, how your documents are stored securely, and the rights you have over your account.',
    canonicalPath: '/privacy',
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
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <p>Your privacy matters to us. This policy explains what data Contraya collects, how we use it, and your rights as a user.</p>

        <h2>1. Information We Collect</h2>
        <h3>Account Information</h3>
        <p>When you sign up, we collect your email address. This is used to identify your account and sign you in.</p>

        <h3>Contract Data</h3>
        <p>We store the contract records you create, including titles, party names, dates, summaries, obligations, and notes.</p>

        <h3>Uploaded Files</h3>
        <p>Contracts and documents you upload are stored securely in private storage and are only accessible to you. When you add a contract, the document is also sent to our document-reading service to produce the plain-English summary, dates, and highlights for you. It is not used to train any model.</p>

        <h3>Usage Data</h3>
        <p>We may collect basic usage analytics (e.g., which features are used) to improve the app. This data is anonymized and never sold.</p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide and operate the contract organizing service</li>
          <li>To send contract date reminders, if you enable notifications</li>
          <li>To read your document and produce its summary when you add a contract</li>
          <li>To respond to support requests</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <p>We do not sell, rent, or share your personal data with third parties for marketing purposes. We may share data only:</p>
        <ul>
          <li>With service providers that help us operate the platform (e.g., cloud hosting and storage)</li>
          <li>If required by law or valid legal process</li>
          <li>To protect the rights and safety of users and the platform</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>Your data is retained as long as your account is active. If you delete your account, all your personal data and contract records are permanently deleted within 30 days.</p>

        <h2>5. Your Rights</h2>
        <p>Depending on your location, you may have the following rights:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
          <li><strong>Correction:</strong> Update inaccurate personal information</li>
          <li><strong>Deletion:</strong> Delete your account and all associated data at any time from the app settings</li>
          <li><strong>Portability:</strong> Request your data in a portable format</li>
        </ul>

        <h2>6. Cookies</h2>
        <p>Contraya uses only essential session cookies required for authentication. We do not use tracking or advertising cookies.</p>

        <h2>7. Security</h2>
        <p>We use industry-standard security measures including encrypted data transmission (HTTPS) and secure cloud storage. However, no method of transmission over the internet is 100% secure.</p>

        <h2>8. Children's Privacy</h2>
        <p>Contraya is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance.</p>

        <h2>10. Contact</h2>
        <p>If you have questions or concerns about this Privacy Policy or wish to exercise your data rights, please contact us through the app's support channel.</p>
      </main>

      <footer className="border-t py-8 px-5 text-center text-sm text-muted-foreground">
        <Link to="/terms" className="hover:text-foreground transition-colors mr-6">Terms of Service</Link>
        <Link to="/" className="hover:text-foreground transition-colors">Back to Home</Link>
      </footer>
    </div>
  );
}