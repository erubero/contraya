import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageTitle';

const LOGO = "/icons/icon-192.png";

// Bump this by hand whenever the document text changes. Never compute it:
// a legal document's revision date must not move on its own.
const LAST_UPDATED = 'July 29, 2026';

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
        <p className="text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>

        <p>Your privacy matters to us. This policy explains what data Contraya collects, how we use it, and your rights as a user.</p>

        <h2>1. Information We Collect</h2>
        <h3>Account Information</h3>
        <p>When you sign up, we collect your email address. This is used to identify your account and sign you in. If you sign in with Apple, we receive the account identifier and the email address Apple shares with us, which may be a private relay address if you choose to hide your email.</p>

        <h3>Contract Data</h3>
        <p>We store the contract records you create, including titles, party names, dates, summaries, obligations, and notes.</p>

        <h3>Uploaded Files</h3>
        <p>Contracts and documents you upload are stored in private storage that only your account can access. When you add a contract, the document is sent to a third-party AI provider we use to produce the plain-English summary, dates, and highlights for you. That provider processes documents under confidentiality obligations, does not use them to train any model, and retains them only for a limited period.</p>
        <p>Because a summary is produced by an AI model rather than by a person, nothing you upload is covered by attorney-client privilege, and using Contraya does not create an attorney-client relationship. Treat what you send here the way you would treat any document held by a service provider, not the way you would treat a file with your own attorney.</p>

        <h3>Notification Data</h3>
        <p>If you enable reminders, we store your device's push notification token so we can deliver them. The token is removed when you sign out of that device or delete your account.</p>

        <h3>Usage Data</h3>
        <p>We may collect basic usage analytics (e.g., which features are used) to improve the app. This data is anonymized and never sold.</p>

        <h2>2. Email Forwarding</h2>
        <p>Contraya can give you a personal forwarding address so you can email contracts into the app. If you use this optional feature:</p>
        <ul>
          <li>Messages sent to your address are processed automatically to extract PDF attachments, which are stored in your private storage.</li>
          <li>We keep the sender's email address, the subject line, and the time received so you can recognize each item. The message body is not stored.</li>
          <li>Anything sent to your address lands in your inbox, including mail from people who are not Contraya users. Treat the address like a password and share it only with senders you trust.</li>
          <li>You can delete received items at any time, and deleting your account deletes them all.</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To provide and operate the contract organizing service</li>
          <li>To send contract date reminders, if you enable notifications</li>
          <li>To read your document and produce its summary when you add a contract</li>
          <li>To respond to support requests</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p>We do not sell, rent, or share your personal data with third parties for marketing purposes. We may share data only:</p>
        <ul>
          <li>With service providers that help us operate the platform, such as cloud hosting and storage, the document-processing provider that produces your summaries, and subscription billing through Apple</li>
          <li>If required by law or valid legal process</li>
          <li>To protect the rights and safety of users and the platform</li>
        </ul>

        <h2>5. Data Retention</h2>
        <p>Your data is retained as long as your account is active. If you delete your account, your personal data, contract records, and uploaded files are deleted promptly, and any residual copies are removed from our systems within 30 days.</p>

        <h2>6. Your Rights</h2>
        <p>Depending on your location, you may have the following rights:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
          <li><strong>Correction:</strong> Update inaccurate personal information</li>
          <li><strong>Deletion:</strong> Delete your account and all associated data at any time from the app settings</li>
          <li><strong>Portability:</strong> Request your data in a portable format</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>Contraya uses only essential session cookies required for authentication. We do not use tracking or advertising cookies.</p>

        <h2>8. Security</h2>
        <p>We use industry-standard security measures. Your data is encrypted in transit (HTTPS) and at rest, and your documents live in private storage that only your account can access. However, no method of transmission over the internet is 100% secure.</p>

        <h2>9. Children's Privacy</h2>
        <p>Contraya is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>

        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance.</p>

        <h2>11. Contact</h2>
        <p>If you have questions or concerns about this Privacy Policy or wish to exercise your data rights, contact us at <a href="mailto:hello@usecontraya.com">hello@usecontraya.com</a>.</p>
      </main>

      <footer className="border-t py-8 px-5 text-center text-sm text-muted-foreground">
        <Link to="/terms" className="hover:text-foreground transition-colors mr-6">Terms of Service</Link>
        <Link to="/" className="hover:text-foreground transition-colors">Back to Home</Link>
      </footer>
    </div>
  );
}
