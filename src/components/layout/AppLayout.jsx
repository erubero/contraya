import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import BottomNav from './BottomNav';
import SettingsModal from './SettingsModal';

export default function AppLayout() {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isHome = location.pathname === '/dashboard';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b select-none"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          {isHome ? (
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <img
                src="/icons/icon-192.png"
                alt="Warraya"
                className="w-8 h-8 rounded-xl object-cover"
              />
              <span className="text-lg font-bold tracking-tight">Warraya</span>
            </Link>
          ) : (
            <>
              <Link to={-1}>
                <Button variant="ghost" size="icon" className="rounded-xl -ml-2 select-none">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <span className="font-semibold">
                {location.pathname === '/add' ? 'Add Warranty' : 'Warranty Details'}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        <Outlet />
      </main>

      <BottomNav onSettingsOpen={() => setSettingsOpen(true)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}