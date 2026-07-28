import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { isConfigured } from '@/api/supabase';
import {
  initPurchases, fetchProStatus, hasSellableOffering, addProListener, purchasesConfigured,
} from './purchases';

type PurchasesValue = {
  isPro: boolean;
  ready: boolean;          // Pro status has been resolved at least once
  offeringReady: boolean;  // a sellable offering exists (so the gate can block)
  refresh: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesValue | null>(null);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { userId, status } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(false);
  const [offeringReady, setOfferingReady] = useState(false);

  const refresh = async () => {
    const [pro, offering] = await Promise.all([fetchProStatus(), hasSellableOffering()]);
    setIsPro(pro);
    setOfferingReady(offering);
    setReady(true);
  };

  // Configure + bind to the user on sign-in, then resolve status. In demo mode
  // or signed out, mark ready without gating so nothing is blocked.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!isConfigured || !purchasesConfigured || status !== 'signedIn') {
        setReady(true);
        return;
      }
      await initPurchases(userId);
      if (active) await refresh();
    })();
    return () => { active = false; };
  }, [status, userId]);

  // Push-through updates when a purchase completes on the paywall.
  useEffect(() => addProListener(setIsPro), []);

  // Re-check on foreground so trial expiry and cross-device changes take effect.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && isConfigured && purchasesConfigured && status === 'signedIn') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [status]);

  return (
    <PurchasesContext.Provider value={{ isPro, ready, offeringReady, refresh }}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases(): PurchasesValue {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error('usePurchases must be used within PurchasesProvider');
  return ctx;
}
