import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, Settings } from 'lucide-react';

export default function BottomNav({ onSettingsOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/dashboard';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t flex items-center justify-around select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button
        onClick={() => navigate('/dashboard')}
        className={`flex flex-col items-center gap-1 py-3 px-6 transition-colors select-none ${
          isHome ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] font-medium">Dashboard</span>
      </button>

      <button
        onClick={() => navigate('/add')}
        className="flex flex-col items-center gap-1 py-3 px-6 transition-colors text-muted-foreground select-none"
      >
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center -mt-5 shadow-lg">
          <Plus className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-[10px] font-medium mt-1">Add</span>
      </button>

      <button
        onClick={onSettingsOpen}
        className="flex flex-col items-center gap-1 py-3 px-6 transition-colors text-muted-foreground select-none"
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </nav>
  );
}