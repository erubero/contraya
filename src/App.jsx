import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import Landing from './pages/Landing';

// Route-level code splitting: the landing page stays in the main bundle;
// everything else loads on demand.
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TrackProductWarranties = lazy(() => import('./pages/guides/TrackProductWarranties'));
const OrganizeReceiptsAndWarranties = lazy(() => import('./pages/guides/OrganizeReceiptsAndWarranties'));
const StoreReceiptsDigitally = lazy(() => import('./pages/guides/StoreReceiptsDigitally'));
const TrackWarrantyExpirationDates = lazy(() => import('./pages/guides/TrackWarrantyExpirationDates'));
const AuthedApp = lazy(() => import('./AuthedApp'));

const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => document.documentElement.classList.toggle('dark', e.matches);
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return children;
};

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<Spinner />}>
          <Routes>
            {/* Public marketing pages — no auth, no app code */}
            <Route path="/" element={<Landing />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/guides/track-product-warranties" element={<TrackProductWarranties />} />
            <Route path="/guides/organize-receipts-and-warranties" element={<OrganizeReceiptsAndWarranties />} />
            <Route path="/guides/store-receipts-digitally" element={<StoreReceiptsDigitally />} />
            <Route path="/guides/track-warranty-expiration-dates" element={<TrackWarrantyExpirationDates />} />
            {/* Sign-in and the authenticated app */}
            <Route path="/*" element={<AuthedApp />} />
          </Routes>
        </Suspense>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App
