import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, Shield, X, PhoneCall } from 'lucide-react';
import { useTheme } from '../context/useTheme';
import Logo from './Logo';

export default function MobileDrawer({ isOpen, onClose, user, onLogout, onViewAuthority, onEmergencyOpen }) {
  const { theme, toggleTheme } = useTheme();
  const drawerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragging, setDragging] = useState(false);

  // Swipe-to-close: track touch on the drawer panel
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = Math.max(0, delta);
    if (drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${touchDeltaX.current}px)`;
      drawerRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      if (touchDeltaX.current > 80) {
        drawerRef.current.style.transform = 'translateX(100%)';
        setTimeout(onClose, 300);
      } else {
        drawerRef.current.style.transform = 'translateX(0)';
      }
    }
    touchDeltaX.current = 0;
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute top-0 right-0 h-full flex flex-col animate-slideInRight"
        style={{
          width: '75vw',
          maxWidth: '300px',
          backgroundColor: 'var(--bg-app)',
          borderLeft: '1px solid var(--border-main)',
          transform: 'translateX(0)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <Logo className="w-7 h-7 shrink-0" />
            <span className="font-black text-sm tracking-wider text-black dark:text-white uppercase">
              MERA<span className="text-emerald-600 dark:text-emerald-400">SEHAR</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-5 py-5 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-black dark:bg-white flex items-center justify-center font-black text-white dark:text-black text-sm shrink-0">
              {user?.full_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-black dark:text-white truncate leading-snug">
                {user?.full_name}
              </p>
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate leading-snug mt-0.5">
                {user?.city}, {user?.district}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 px-4 py-4 space-y-1.5">
          {/* Emergency Helplines */}
          <button
            onClick={() => { onEmergencyOpen(); onClose(); }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 transition-all duration-300"
          >
            <PhoneCall className="w-5 h-5 shrink-0" />
            <span>Emergency Helplines</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white transition-all duration-300"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-white" />
              ) : (
                <Moon className="w-5 h-5 text-black" />
              )}
            </div>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Authority Panel */}
          {user?.is_authority && (
            <button
              onClick={() => { onViewAuthority(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white transition-all duration-300"
            >
              <Shield className="w-5 h-5 shrink-0" />
              <span>Authority Panel</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white transition-all duration-300"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-line">
          <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest text-center">
            MeraShehar &middot; Your City Platform
          </p>
        </div>
      </div>
    </div>
  );
}
