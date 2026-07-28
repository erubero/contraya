import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import AddWarranty from './pages/AddWarranty';
import WarrantyDetail from './pages/WarrantyDetail';
import SignIn from './pages/SignIn';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{ minHeight: '100%' }}
      >
        <Routes location={location}>
          <Route path="/login" element={<SignIn />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/add" element={<AddWarranty />} />
              <Route path="/warranty/:id" element={<WarrantyDetail />} />
            </Route>
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

// Everything that needs auth, data fetching, or page transitions lives in this
// lazy-loaded subtree, so the marketing pages ship none of its code.
export default function AuthedApp() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <AnimatedRoutes />
      </QueryClientProvider>
    </AuthProvider>
  );
}
