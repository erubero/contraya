import { Link } from 'react-router-dom';
import { FileText, Bell, Search, CalendarClock } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageTitle';

const LOGO = '/icons/icon-192.png';
const SUPPORT_EMAIL = 'hello@usecontraya.com';

// One-page pre-launch landing. Follows the Contraya landing playbook (single
// message, pain -> fix rows, no stock photos) but stays minimal until the app
// is on the App Store: the CTA is the waitlist mailto, swapped for the App
// Store badge on launch day.
export default function Landing() {
  usePageMeta({
    title: 'Contraya — Your contracts, in plain English',
    description:
      'Contraya reads the contracts you sign, puts them in plain English, and reminds you before payments, renewals, and notice deadlines.',
    canonicalPath: '/',
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 select-none">
            <img src={LOGO} alt="Contraya" className="w-7 h-7 rounded-xl object-cover" />
            <span className="font-bold tracking-tight">Contraya</span>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Contraya%20early%20access`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Get early access
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-5 pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            You signed it.
            <br />
            <span className="text-blue-600">Do you know what it says?</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Contraya reads your lease, your vendor contract, your phone plan — and puts it in plain
            English. Then it keeps working: reminders before every payment, renewal, and notice
            deadline the contract hides.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Contraya%20early%20access`}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Get early access
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Coming to the App Store. From the makers of Warraya.
          </p>
        </section>

        {/* Pain -> fix rows */}
        <section className="bg-blue-50 dark:bg-slate-900 py-16">
          <div className="max-w-3xl mx-auto px-5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
              The fine print works for them.
              <br />
              <span className="text-blue-600">Contraya makes it work for you.</span>
            </h2>
            <div className="mt-10 bg-white dark:bg-slate-950 rounded-2xl border divide-y">
              <Row
                icon={<FileText className="w-5 h-5 text-blue-600" />}
                title="Contraya reads the contract for you"
                text="Upload the PDF or photograph the pages. You get the whole thing in everyday words: what you pay, what you get, what you promised."
              />
              <Row
                icon={<Search className="w-5 h-5 text-blue-600" />}
                title="Contraya points at the clauses worth a close look"
                text="Auto-renewals, late fees, deposit rules, cancellation windows. Each one quoted from your document and explained."
              />
              <Row
                icon={<CalendarClock className="w-5 h-5 text-blue-600" />}
                title="Contraya finds every date that matters"
                text="Payments, renewals, notice deadlines, end dates. All of them on one calendar."
              />
              <Row
                icon={<Bell className="w-5 h-5 text-blue-600" />}
                title="Contraya reminds you before it costs you"
                text="A heads up before the rent is due, before the gym renews for a year, before the cancellation window closes."
              />
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Contraya explains what your contracts say. It is not legal advice.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-5 text-center text-sm text-muted-foreground">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground transition-colors mr-6">
          Contact
        </a>
        <Link to="/terms" className="hover:text-foreground transition-colors mr-6">
          Terms of Service
        </Link>
        <Link to="/privacy" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}

function Row({ icon, title, text }) {
  return (
    <div className="flex items-start gap-4 p-5">
      <div className="mt-0.5 shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-900 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
