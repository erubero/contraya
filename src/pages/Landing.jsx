import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScrollText, Bell, ChevronDown, Menu, X, Upload, FileSearch,
  FileText, CalendarClock, AlertTriangle, MessageCircle, Mail,
} from 'lucide-react';
import { usePageMeta } from '@/lib/usePageTitle';

const LOGO = "/icons/icon-192.png";

const faqs = [
  { q: "How does Contraya work?", a: "Add a contract as a photo or a PDF, or forward the email it arrived in. Contry uses AI to read it and give you a plain-English summary, every key date, and any clauses worth a second look, each one quoted straight from the document. You confirm the dates, and Contraya reminds you before each one." },
  { q: "Is this legal advice?", a: "No. Contraya describes what is written in your document and quotes the lines it came from, so you can check every word yourself. It never tells you whether something is legal, whether you would win a dispute, or what you should do. Using Contraya does not create an attorney-client relationship, and nothing you put here is protected by attorney-client privilege. Those are questions for a licensed attorney of your own." },
  { q: "Who built this?", a: "A lawyer, for people who are not lawyers. Contraya exists because the person who built it kept watching friends sign things they had not read. That is who designed it, not an offer of legal services, and nobody at Contraya becomes your attorney." },
  { q: "Does AI read my contract?", a: "Yes. An AI model reads the document and writes the summary, and no person reviews it before you see it. That is why every clause it flags is quoted word for word: so you can check it against the original yourself. AI can miss things and can get a date wrong, so the original document is always the one that counts." },
  { q: "What kinds of contracts can it read?", a: "Apartment leases, phone and internet plans, gym memberships, wedding and event vendor agreements, freelance client contracts, loans, storage units, contractor bids. If it is a PDF or a clear photo of a document, Contry can read it." },
  { q: "When will I hear about a deadline?", a: "Every date you confirm gets reminders before it arrives, with enough lead time to actually act on it: give the notice, make the payment, or cancel before the renewal locks in. Recurring dates, like monthly rent, repeat on their own." },
  { q: "Is my information private?", a: "Your contracts are stored in private storage only you can access, encrypted in transit and at rest, and never sold or shared. You can delete your account and everything in it whenever you like." },
  { q: "Can I use it on my phone?", a: "Contraya is an iPhone app, currently in early access. Email hello@usecontraya.com and you will be first in line when it launches. Android is next." },
];

// Pre-launch: no App Store listing yet, so the only CTA is the early
// access mailto. Swap for an App Store badge at launch.
const EARLY_ACCESS_URL = 'mailto:hello@usecontraya.com?subject=Contraya%20early%20access';

function EarlyAccessButton({ small = false }) {
  return (
    <a
      href={EARLY_ACCESS_URL}
      aria-label="Join the Contraya early access list by email"
      // Dark ink on lime, never white: white on this lime is 1.5:1, dark ink
      // is 11.5:1. The lime fill is what makes the button the loudest thing
      // on a navy hero.
      className={`inline-flex items-center rounded-xl select-none transition-transform hover:scale-105 font-bold ${small ? 'gap-2 px-3.5 py-2 text-sm' : 'gap-3 px-6 py-3.5'}`}
      style={{ background: 'linear-gradient(90deg,#A3E635,#BEF264)', color: '#0F1A2E' }}
    >
      <Mail className={small ? 'w-4 h-4' : 'w-5 h-5'} aria-hidden="true" />
      <span>Join the early access</span>
    </a>
  );
}

// FAQPage structured data, generated from the same array the visible FAQ
// renders, so the two can never drift. type="application/ld+json" is inert
// data (never executed), so the strict script-src CSP does not apply to it.
function FaqSchema() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-5 text-left font-medium gap-4 select-none text-slate-800"
      >
        <span>{q}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-lime-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-5 text-slate-500 leading-relaxed text-sm">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  usePageMeta({
    description: 'Contraya reads your contracts, explains them in plain English, and reminds you before every deadline: renewal notices, payments, notice windows, and end dates.',
    canonicalPath: '/',
  });

  return (
    <div className="min-h-screen font-inter" style={{ background: '#F8FAFC', color: '#0f172a' }}>

      {/* NAV */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(10,20,60,0.97)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 select-none">
            <img src={LOGO} alt="Contraya" className="w-8 h-8 rounded-xl object-cover" />
            <span className="text-lg font-bold tracking-tight text-white">Contraya</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <EarlyAccessButton small />
          </nav>

          <button className="md:hidden text-white select-none" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-700 px-6 py-4 space-y-3" style={{ background: '#0a1440' }}>
            {[['#features','Features'],['#how','How it works'],['#pricing','Pricing'],['#faq','FAQ']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                className="block text-sm text-slate-300 hover:text-white py-1">{label}</a>
            ))}
            <div className="pt-2">
              <EarlyAccessButton small />
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #0a1440 0%, #0f2060 60%, #1a3a8f 100%)', minHeight: '88vh' }}
        className="relative overflow-hidden flex flex-col justify-center px-6 py-24 md:py-36">

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #A3E635 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #A3E635 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        <div className="max-w-7xl mx-auto w-full relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 select-none"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#BEF264', border: '1px solid rgba(59,130,246,0.3)' }}>
              <ScrollText className="w-3.5 h-3.5" /> Contract reader and deadline reminders
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-white mb-6">
              You signed it.<br />
              <span style={{ color: '#A3E635' }}>Do you know what it says?</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 max-w-xl leading-relaxed mb-10">
              The lease renews itself unless you give notice by a date buried in clause 14. The venue keeps your deposit if you cancel after a date you never wrote down. Contraya reads the contract, explains it in plain English, and reminds you before every deadline.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <EarlyAccessButton />
            </div>

            <p className="text-xs text-slate-400 mt-6 max-w-xl">
              Contry uses AI to explain what your contract says. It is not legal advice, and using
              Contraya does not create an attorney-client relationship.
            </p>

          </div>

          {/* Floating UI card */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-80">
            <div className="rounded-3xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.25)' }}>
                  <ScrollText className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Apartment lease</p>
                  <p className="text-slate-400 text-xs">Palm Grove LLC · Lease</p>
                </div>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac' }}>Active</span>
              </div>
              {[
                { label: 'Renewal notice due', value: 'Sep 1, 2026' },
                { label: 'Lease ends', value: 'Oct 31, 2026' },
                { label: 'Rent due', value: 'Monthly, the 1st' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
              <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <p className="text-xs leading-relaxed flex items-start gap-1.5" style={{ color: '#fcd34d' }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Renews for 12 months unless you give 60 days written notice
                </p>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> Reminder set for Aug 2, 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CONTRAYA + FEATURES */}
      <section id="features" className="py-24 px-6" style={{ background: '#ECFCCB' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">

          <div className="lg:col-span-2 lg:sticky lg:top-24">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-700 mb-2">Features</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
              You already agreed to it.<br />
              <span style={{ color: '#84CC16' }}>Contraya makes sure you know what it was.</span>
            </h2>
            <p className="text-slate-600 mt-4 max-w-md leading-relaxed">
              Every lease, plan, and vendor agreement is full of dates, obligations, and clauses that cost real money when they catch you off guard. Here is exactly what Contraya does about each one.
            </p>
          </div>

          <div className="lg:col-span-3 rounded-3xl overflow-hidden" style={{ background: '#fff' }}>
            {[
              {
                icon: FileText,
                problem: "It is 18 pages of dense legal language. You skimmed it, signed it, and hoped for the best.",
                title: "Contry explains your contract in plain English",
                desc: "Add the contract as a photo or a PDF and Contry reads the whole thing. You get a short summary of what you are agreeing to, what you pay, and what happens if you want out, in words you would use with a friend.",
              },
              {
                icon: CalendarClock,
                problem: "The renewal deadline was in clause 14.3. You found out when the charge hit your card.",
                title: "Every date gets pulled out and put on your calendar",
                desc: "Payment deadlines, notice windows, renewal dates, end dates. Contry extracts each one from the document, you confirm it, and it lands on your calendar with reminders attached.",
              },
              {
                icon: AlertTriangle,
                problem: "Auto-renewals, penalties, and fees hide in the paragraphs nobody reads.",
                title: "Risky clauses get flagged, with the exact quote",
                desc: "Anything that locks you in, charges you extra, or takes away an option gets flagged and quoted word for word, so you can find it in the document and read it yourself.",
              },
              {
                icon: MessageCircle,
                problem: "A month later you have a question, and the answer is somewhere in those 18 pages.",
                title: "Ask Contry anything about your contract",
                desc: "Can I have a cat? What happens if I pay late? Can I break the lease early? Contry answers from your document and quotes the lines the answer came from.",
              },
            ].map(({ icon: Icon, problem, title, desc }) => (
              <div key={title} className="group flex gap-4 sm:gap-5 p-6 sm:p-8 border-b border-slate-200 transition-colors hover:bg-lime-50">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ background: '#ECFCCB' }}>
                  <Icon className="w-5 h-5 text-lime-700" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 leading-relaxed">{problem}</p>
                  <h3 className="font-bold text-slate-900 text-lg mt-1.5">{title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}

            <div className="flex gap-4 sm:gap-5 p-6 sm:p-8" style={{ background: '#F7FEE7' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#ECFCCB' }}>
                <ScrollText className="w-5 h-5 text-lime-700" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">Everything comes from your document</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Contry uses AI to describe what the contract says and shows you where it says it. It never tells you what to do, and it is not legal advice. Because a model wrote it, every flagged clause is quoted word for word, so you can check it against the original yourself.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6" style={{ background: '#0f2060' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-400 mb-2">How it works</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Three steps. Then you can relax.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Upload, title: 'Add the contract', desc: 'Snap a photo, upload the PDF, or forward the email it came in. Signed yesterday or three years ago, it all works.' },
              { step: '02', icon: FileSearch, title: 'Contry reads it', desc: 'You get a plain-English summary, every key date, and the clauses worth a second look, each one quoted from the document. You confirm the dates before anything is saved.' },
              { step: '03', icon: Bell, title: 'We tap you on the shoulder', desc: 'Before every deadline, a reminder taps you on the shoulder. Give the notice, make the payment, or cancel in time, and keep your money.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center space-y-4">
                <div className="relative inline-flex">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <Icon className="w-7 h-7 text-slate-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-bold text-lime-400">{step}</span>
                </div>
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT TO TRACK */}
      <section className="py-24 px-6" style={{ background: '#F8FAFC' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-700 mb-2">What to keep in Contraya</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900">Anything you signed</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Big or small, one page or forty. If it has deadlines, payments, or fine print, Contraya keeps you ahead of it.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              'Apartment leases', 'Phone and internet plans', 'Gym memberships',
              'Wedding and event vendors', 'Freelance client contracts', 'Contractors and home repairs',
              'Storage units', 'Auto loans and leases',
            ].map((label) => (
              <div key={label} className="rounded-2xl px-4 py-5 text-center text-sm font-medium text-slate-700" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#F7FEE7' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-700 mb-2">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900">Start free. Upgrade when you need more.</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Your first two contracts are on us. Upgrade when you want Contraya reading everything you sign.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            {/* Free */}
            <div className="rounded-3xl p-8 flex flex-col" style={{ background: '#fff', border: '1px solid #ECFCCB' }}>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Free</p>
              <div className="mt-4 mb-1">
                <span className="text-4xl font-extrabold text-slate-900">$0</span>
                <span className="text-slate-500"> forever</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">Everything you need to try it on a real contract.</p>
              <ul className="space-y-3 text-slate-700 text-sm flex-1">
                {['Contry reads 2 contracts, on us', 'Plain-English summary of each one', 'Every date on your calendar, with reminders', 'Forward contracts straight from your email', 'Risky clauses flagged with the exact quote'].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <ScrollText className="w-4 h-4 text-lime-700 flex-shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium */}
            <div className="rounded-3xl p-8 flex flex-col relative" style={{ background: 'linear-gradient(135deg, #0F2060 0%, #1A3A8F 100%)' }}>
              <span className="absolute top-6 right-6 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                Early access
              </span>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-300">Premium</p>
              <div className="mt-4 mb-1">
                <span className="text-4xl font-extrabold text-white">$7.99</span>
                <span className="text-slate-300"> / month</span>
              </div>
              <p className="text-slate-300 text-sm mb-6">or $49.99 / year, saving 48%.</p>
              <ul className="space-y-3 text-slate-50 text-sm flex-1">
                {['Contry reads up to 15 contracts a month', 'Ask Contry up to 50 questions a month', 'Everything in Free'].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <ScrollText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <EarlyAccessButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6" style={{ background: '#ECFCCB' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-700 mb-2">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Good question. Here is the answer.</h2>
          </div>
          <div className="rounded-3xl px-8 py-2" style={{ background: '#fff' }}>
            {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
        <FaqSchema />
      </section>

      {/* CTA */}
      <section className="py-28 px-6" style={{ background: 'linear-gradient(135deg, #0F2060 0%, #1A3A8F 100%)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-5">
            Know what you signed.<br />Before it costs you.
          </h2>
          <p className="text-slate-300 text-lg mb-10">Contraya is launching soon on iPhone. Join the early access list and be first in line.</p>
          <EarlyAccessButton />
          <p className="text-xs text-slate-400 mt-8">From the makers of Warraya.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-10 px-6" style={{ background: '#0a1440', borderColor: '#0F2060' }}>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2.5 select-none">
              <img src={LOGO} alt="Contraya logo" className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-semibold text-white">Contraya</span>
            </div>
            <div className="flex gap-6">
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <a href="mailto:hello@usecontraya.com" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p>© {new Date().getFullYear()} Contraya. All rights reserved.</p>
          </div>
          <p className="text-center text-xs text-slate-400">
            Built by a lawyer, for everyday people. Contry uses AI to explain what your contracts
            say. It is not legal advice, and using Contraya does not create an attorney-client
            relationship or attorney-client privilege.
          </p>
        </div>
      </footer>
    </div>
  );
}
