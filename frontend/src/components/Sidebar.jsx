import React from 'react';
import { Megaphone, Briefcase, TrendingUp, Sun, Moon, LogOut, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import ComplaintIcon from './ComplaintIcon';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, onViewAuthority }) {
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: 'news', label: 'News Feed', icon: Megaphone },
    { id: 'complaints', label: 'Complaints', icon: ComplaintIcon },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'rates', label: 'Market Rates', icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col h-full px-4 py-6 justify-between theme-transition" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
      <div className="space-y-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2">
          <Logo className="w-8 h-8 shrink-0" />
          <span className="font-black text-lg tracking-wider text-black dark:text-white uppercase">
            MeraShehar
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-4.5 py-3 rounded-xl text-sm transition-all duration-300 group ${
                  isActive
                    ? 'font-black bg-[var(--text-main)] text-[var(--bg-app)] shadow-sm'
                    : 'font-medium text-zinc-500 dark:text-zinc-450 hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-105 ${isActive ? 'stroke-[2.5px] text-[var(--bg-app)]' : 'stroke-[1.8px] text-zinc-550 dark:text-zinc-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Authority Panel Access */}
        {user?.is_authority && (
          <button
            onClick={onViewAuthority}
            className="w-full flex items-center gap-4 px-4.5 py-3 rounded-xl text-sm font-bold text-black dark:text-white border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-all duration-300"
          >
            <Shield className="w-5 h-5 stroke-[2px] text-black dark:text-white" />
            <span>Authority Panel</span>
          </button>
        )}
      </div>

      {/* Footer controls & user details */}
      <div className="space-y-4">
        <div className="space-y-1 border-t border-line pt-4">
          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-4.5 py-2.5 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-455 hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white transition-all duration-300 group"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-white" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-black" />
              )}
            </div>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4.5 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white transition-all duration-300"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* User Card info */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-all cursor-pointer">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-black dark:bg-white flex items-center justify-center font-bold text-white dark:text-black text-xs shrink-0">
              {user?.full_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-black dark:text-white truncate leading-snug">{user?.full_name}</p>
              <p className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 truncate leading-snug">@{user?.city?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
