import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Bell, ChevronDown, Menu, X, ScanLine, Archive, Receipt, Clock, Search } from 'lucide-react';

const LOGO = "/icons/icon-192.png";

const faqs = [
  { q: "How does the receipt scanner work?", a: "Snap a photo of any receipt and Warraya reads the product, store, purchase date, and price for you. You glance, confirm, and save. The whole thing takes about thirty seconds." },
  { q: "How does Warraya save me money?", a: "A warranty is a refund you already paid for. Show the receipt, act before the deadline, and a repair or replacement that would cost real money is covered instead. Warraya keeps the proof and makes sure you never miss that window." },
  { q: "Is Warraya a warranty tracker or a receipt organizer?", a: "Both. Every warranty you track keeps its receipt attached as proof of purchase, so the coverage and the evidence live together. When you need one, you always have the other." },
  { q: "When will I hear from you about an expiring warranty?", a: "We send you a notification 30 days before any of your warranties run out, and again 7 days before. That is plenty of time to test the product, find your receipt, and file a claim if something is off." },
  { q: "Is my information private?", a: "Yes. Your receipts and product details are stored securely and never sold or shared. You can delete your account and everything in it whenever you like." },
  { q: "Can I use it on my phone?", a: "Yes. Warraya is an iPhone app, available on the App Store today. Android is next." },
];

// Live on the App Store since 2026-07 (id6792513985). This badge is the only
// CTA on the page; the landing has no sign-in.
const APP_STORE_URL = 'https://apps.apple.com/us/app/warraya-warranty-tracker/id6792513985';

function AppStoreBadge({ small = false }) {
  return (
    <a
      href={APP_STORE_URL}
      aria-label="Download Warraya on the App Store"
      className={`inline-flex items-center rounded-xl select-none transition-transform hover:scale-105 ${small ? 'gap-2 px-3.5 py-1.5' : 'gap-3 px-6 py-3'}`}
      style={{ background: '#000', border: '1px solid rgba(255,255,255,0.3)' }}
    >
      <svg viewBox="0 0 24 24" fill="#fff" className={small ? 'w-4 h-4' : 'w-7 h-7'} aria-hidden="true">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.03 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
      <span className="flex flex-col leading-none text-left">
        <span className={`text-white font-medium opacity-80 ${small ? 'text-[8px]' : 'text-[11px]'}`}>Download on the</span>
        <span className={`text-white font-semibold mt-0.5 ${small ? 'text-sm' : 'text-xl'}`}>App Store</span>
      </span>
    </a>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-blue-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-5 text-left font-medium gap-4 select-none text-slate-800"
      >
        <span>{q}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-5 text-slate-500 leading-relaxed text-sm">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-inter" style={{ background: '#f8faff', color: '#0f172a' }}>

      {/* NAV */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(10,20,60,0.97)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 select-none">
            <img src={LOGO} alt="Warraya" className="w-8 h-8 rounded-xl object-cover" />
            <span className="text-lg font-bold tracking-tight text-white">Warraya</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-blue-200">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <AppStoreBadge small />
          </nav>

          <button className="md:hidden text-white select-none" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-blue-900 px-6 py-4 space-y-3" style={{ background: '#0a1440' }}>
            {[['#features','Features'],['#how','How it works'],['#pricing','Pricing'],['#faq','FAQ']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                className="block text-sm text-blue-200 hover:text-white py-1">{label}</a>
            ))}
            <div className="pt-2">
              <AppStoreBadge small />
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #0a1440 0%, #0f2060 60%, #1a3a8f 100%)', minHeight: '88vh' }}
        className="relative overflow-hidden flex flex-col justify-center px-6 py-24 md:py-36">

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        <div className="max-w-7xl mx-auto w-full relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 select-none"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>
              <Shield className="w-3.5 h-3.5" /> Warranty reminders and receipt scanner
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-white mb-6">
              The warranty tracker<br />
              <span style={{ color: '#60a5fa' }}>that saves you money.</span>
            </h1>

            <p className="text-lg md:text-xl text-blue-200 max-w-xl leading-relaxed mb-10">
              Your fridge dies. Your headphones stop charging. The repair would have been free, but the receipt is gone and the deadline slipped by, so you pay full price twice. Warraya remembers the coverage you already paid for and reminds you in time to claim it.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <AppStoreBadge />
            </div>

          </div>

          {/* Floating UI card */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-80">
            <div className="rounded-3xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.25)' }}>
                  <Shield className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">MacBook Pro</p>
                  <p className="text-blue-300 text-xs">Apple · Electronics</p>
                </div>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac' }}>Active</span>
              </div>
              {[
                { label: 'Purchase date', value: 'Jan 12, 2024' },
                { label: 'Expires', value: 'Jan 12, 2026' },
                { label: 'Days remaining', value: '247 days' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-blue-300">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full" style={{ width: '68%', background: 'linear-gradient(90deg,#3b82f6,#60a5fa)' }} />
              </div>
              <p className="text-xs text-blue-300 text-right">68% used</p>
              <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs text-blue-200 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> Alert set for Dec 13, 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY WARRAYA + FEATURES */}
      <section id="features" className="py-24 px-6" style={{ background: '#dbeafe' }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">

          <div className="lg:col-span-2 lg:sticky lg:top-24">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-2">Features</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
              You already paid for protection.<br />
              <span style={{ color: '#2563eb' }}>Warraya makes sure you use it.</span>
            </h2>
            <p className="text-slate-600 mt-4 max-w-md leading-relaxed">
              Almost everything you buy comes with a warranty: a built-in promise of free repair or replacement. Most go unused because the receipt is gone or the deadline passed. Here is exactly what Warraya does about each one.
            </p>
          </div>

          <div className="lg:col-span-3 rounded-3xl overflow-hidden" style={{ background: '#fff' }}>
            {[
              {
                icon: Receipt,
                problem: "The paper fades. The email gets archived. The proof is gone right when you need it.",
                title: "Warraya scans your receipt from a photo",
                desc: "Take a photo of a paper receipt or upload one from your files. Warraya pulls out the product, store, purchase date, and price, then files it all in about thirty seconds. No typing, no folders.",
              },
              {
                icon: Clock,
                problem: "You meant to test it. Then life happened, and the coverage quietly ran out.",
                title: "Warraya reminds you 30 days before coverage ends",
                desc: "A notification lands 30 days before the warranty expires, and again at 7 days. That is enough time to test the product and file a claim while the repair is still the manufacturer's problem.",
              },
              {
                icon: Search,
                problem: "Something breaks, and you lose an hour digging through drawers and old emails.",
                title: "Warraya finds any receipt in one search",
                desc: "Every warranty keeps its receipt attached, so the coverage and the proof stay together. Type the product name and the document is right there, ready to send with the claim.",
              },
            ].map(({ icon: Icon, problem, title, desc }) => (
              <div key={title} className="group flex gap-4 sm:gap-5 p-6 sm:p-8 border-b border-blue-100 transition-colors hover:bg-blue-50">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ background: '#dbeafe' }}>
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 leading-relaxed">{problem}</p>
                  <h3 className="font-bold text-slate-900 text-lg mt-1.5">{title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}

            <div className="flex gap-4 sm:gap-5 p-6 sm:p-8" style={{ background: '#eff6ff' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">Most warranties expire without ever being used</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  That is a repair or a replacement you already paid for and never collected. Warraya exists so that stops happening to you.
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
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400 mb-2">How it works</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Three steps. Then you can relax.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: ScanLine, title: 'Snap your receipt', desc: 'Just got home with a new purchase? Take a photo. We will pull out the product, price, store, and coverage in seconds.' },
              { step: '02', icon: Archive, title: 'We watch the clock', desc: 'Your warranty quietly lives in your vault. No spreadsheets. No reminders to set. No mental load.' },
              { step: '03', icon: Bell, title: 'We tap you on the shoulder', desc: 'Before your coverage ends, a friendly notification taps you on the shoulder. Test the product, file the claim, and keep your money.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center space-y-4">
                <div className="relative inline-flex">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <Icon className="w-7 h-7 text-blue-300" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-bold text-blue-400">{step}</span>
                </div>
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <p className="text-sm text-blue-200 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT TO TRACK */}
      <section className="py-24 px-6" style={{ background: '#f8faff' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-500 mb-2">What to keep in Warraya</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900">Anything that came with a warranty</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Big or small, expensive or everyday. Keep track of the warranties you already paid for, and do not let them expire unused.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              'Phones and laptops', 'TVs and headphones', 'Kitchen appliances',
              'Washers and dryers', 'Furniture', 'Power tools',
              'Strollers and car seats', 'Bikes and e-scooters',
            ].map((label) => (
              <div key={label} className="rounded-2xl px-4 py-5 text-center text-sm font-medium text-slate-700" style={{ background: '#fff', border: '1px solid #e0ecff' }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#eff6ff' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-2">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900">Start free. Upgrade when you need more.</h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Try Warraya for free, then unlock unlimited warranties and receipt scans whenever you are ready.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            {/* Free */}
            <div className="rounded-3xl p-8 flex flex-col" style={{ background: '#fff', border: '1px solid #dbeafe' }}>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Free</p>
              <div className="mt-4 mb-1">
                <span className="text-4xl font-extrabold text-slate-900">$0</span>
                <span className="text-slate-500"> forever</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">Everything you need to get started.</p>
              <ul className="space-y-3 text-slate-700 text-sm flex-1">
                {['Track up to 5 warranties', 'Scan 3 receipts', 'Reminders before every warranty expires', 'Keep every receipt attached as proof'].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium */}
            <div className="rounded-3xl p-8 flex flex-col relative" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)' }}>
              <span className="absolute top-6 right-6 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                3-day free trial
              </span>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">Premium</p>
              <div className="mt-4 mb-1">
                <span className="text-4xl font-extrabold text-white">$4.99</span>
                <span className="text-blue-200"> / month</span>
              </div>
              <p className="text-blue-200 text-sm mb-6">or $29.99 / year, saving 50%.</p>
              <ul className="space-y-3 text-blue-50 text-sm flex-1">
                {['Unlimited warranties', 'Unlimited receipt scans', 'Reminders before every warranty expires', 'Everything in Free'].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <AppStoreBadge />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6" style={{ background: '#dbeafe' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-2">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Good question. Here is the answer.</h2>
          </div>
          <div className="rounded-3xl px-8 py-2" style={{ background: '#fff' }}>
            {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-5">
            Your next claim<br />is already paid for.
          </h2>
          <p className="text-blue-200 text-lg mb-10">Spend one minute today. Save hundreds the next time something breaks.</p>
          <AppStoreBadge />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-10 px-6" style={{ background: '#0a1440', borderColor: '#1e3a8a' }}>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-sm text-blue-300">
            <span className="font-semibold text-blue-200 uppercase tracking-widest text-xs">Guides</span>
            <Link to="/guides/track-product-warranties" className="hover:text-white transition-colors">Keep Track of Product Warranties</Link>
            <Link to="/guides/organize-receipts-and-warranties" className="hover:text-white transition-colors">Organize Receipts and Warranties</Link>
            <Link to="/guides/store-receipts-digitally" className="hover:text-white transition-colors">Store Receipts Digitally</Link>
            <Link to="/guides/track-warranty-expiration-dates" className="hover:text-white transition-colors">Track Warranty Expiration Dates</Link>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-blue-300">
            <div className="flex items-center gap-2.5 select-none">
              <img src={LOGO} alt="Warraya logo" className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-semibold text-white">Warraya</span>
            </div>
            <div className="flex gap-6">
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            </div>
            <p>© {new Date().getFullYear()} Warraya. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}