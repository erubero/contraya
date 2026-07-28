import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import { usePageMeta } from '@/lib/usePageTitle';

const LOGO = "/icons/icon-192.png";

export const GUIDES = [
  { path: '/guides/track-product-warranties', title: 'How to Keep Track of Product Warranties' },
  { path: '/guides/organize-receipts-and-warranties', title: 'How to Organize Receipts and Warranties' },
  { path: '/guides/store-receipts-digitally', title: 'How to Store Receipts Digitally' },
  { path: '/guides/track-warranty-expiration-dates', title: 'How to Track Warranty Expiration Dates' },
];

export default function GuideLayout({ path, title, description, children }) {
  usePageMeta({ title, description, canonicalPath: path });

  const otherGuides = GUIDES.filter((g) => g.path !== path);

  return (
    <div className="min-h-screen bg-background text-foreground font-inter">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description,
          author: { '@type': 'Organization', name: 'Warraya', url: 'https://warraya.com/' },
          publisher: { '@type': 'Organization', name: 'Warraya', url: 'https://warraya.com/' },
          datePublished: '2026-07-10',
          mainEntityOfPage: `https://warraya.com${path}`,
        }}
      />

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors select-none">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <img src={LOGO} alt="Warraya logo" className="w-7 h-7 rounded-xl object-cover" />
            <span className="font-bold tracking-tight">Warraya</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-16">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>{title}</h1>
          {children}
        </article>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border bg-accent/40 p-6 sm:p-8 text-center">
          <h2 className="text-xl font-bold tracking-tight">Let Warraya keep track for you</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Snap a receipt, and Warraya files the details, watches every warranty deadline, and reminds you in time to claim.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              className="px-6 py-3 rounded-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/"
              className="px-6 py-3 rounded-full font-semibold border text-foreground hover:bg-accent transition-colors"
            >
              See how Warraya works
            </Link>
          </div>
        </div>

        {/* More guides */}
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">More guides</h2>
          <ul className="space-y-3">
            {otherGuides.map((g) => (
              <li key={g.path}>
                <Link to={g.path} className="inline-flex items-center gap-2 text-primary hover:underline font-medium">
                  {g.title}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t py-8 px-5 text-center text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors mr-6">Home</Link>
        <Link to="/terms" className="hover:text-foreground transition-colors mr-6">Terms of Service</Link>
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
      </footer>
    </div>
  );
}
