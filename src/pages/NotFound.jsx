import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/usePageTitle';

// A real 404 page instead of silently serving the landing with a 200 (a
// "soft 404" search engines penalize). Static hosting cannot send a 404
// status, so noindex is the honest signal here.
export default function NotFound() {
  usePageMeta({ title: 'Page not found', canonicalPath: '/', noindex: true });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#01132F' }}
    >
      <img src="/icons/icon-192.png" alt="Contraya" className="w-14 h-14 rounded-2xl mb-6" />
      <h1 className="text-3xl font-extrabold text-white mb-3">This page does not exist</h1>
      <p className="text-slate-300 mb-8 max-w-md">
        The link may be old or mistyped. Everything Contraya lives on the home page.
      </p>
      <Link
        to="/"
        className="font-bold px-6 py-3 rounded-xl"
        style={{ background: 'linear-gradient(90deg,#A3E635,#BEF264)', color: '#0F1A2E' }}
      >
        Go to the home page
      </Link>
    </div>
  );
}
