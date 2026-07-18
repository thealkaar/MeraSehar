import React from 'react';
import { MapPin, Shield, Info, Compass, TrendingUp } from 'lucide-react';

export default function RightPanel({ user, onViewAuthority }) {
  return (
    <div className="flex flex-col h-full py-6 pr-2 space-y-4 justify-between transition-colors duration-300">
      <div className="space-y-4.5">
        
        {/* Search Bar Placeholder */}
        <div className="relative">
          <input
            type="text"
            disabled
            placeholder="Search MeraShehar"
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl py-3 px-5 text-xs text-zinc-400 placeholder-zinc-400 dark:placeholder-zinc-700 font-semibold focus:outline-none"
          />
        </div>

        {/* Location Info Widget */}
        <div className="sidebar-widget p-4 space-y-3.5">
          <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">Hyperlocal Location</h3>
          <div className="space-y-2.5 text-xs font-semibold">
            <div className="flex justify-between items-center">
              <span className="text-zinc-450 dark:text-zinc-500">Current City</span>
              <span className="text-black dark:text-white font-black">{user?.city || '—'}</span>
            </div>
            <div className="h-px bg-zinc-200/60 dark:bg-zinc-850" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-450 dark:text-zinc-500">District Boundary</span>
              <span className="text-black dark:text-white font-black">{user?.district || '—'}</span>
            </div>
          </div>
        </div>

        {/* Authority Quick Access Widget */}
        {user?.is_authority && (
          <div className="sidebar-widget p-4 space-y-3.5 border border-black/10 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-black dark:text-white shrink-0" />
              <span className="text-xs font-black text-black dark:text-white uppercase tracking-wider">Supervisor Portal</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
              Manage local incidents and complaints in <strong className="text-black dark:text-white font-bold">{user.city}</strong>.
            </p>
            <button
              onClick={onViewAuthority}
              className="w-full pill-button-primary text-xs font-bold py-2.5 transition"
            >
              Open Manager Panel
            </button>
          </div>
        )}

        {/* Modules widget (Twitter "What's Happening" style) */}
        <div className="sidebar-widget p-4 space-y-3.5">
          <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">What's happening</h3>
          <div className="space-y-3.5">
            <div className="space-y-0.5">
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider">LATEST UPDATES</p>
              <p className="text-xs font-bold text-black dark:text-zinc-200">Hyperlocal News Incident Feed</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold">Live alerts in {user?.city}</p>
            </div>
            <div className="h-px bg-zinc-250/60 dark:bg-zinc-850" />
            <div className="space-y-0.5">
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider">CIVIC SERVICES</p>
              <p className="text-xs font-bold text-black dark:text-zinc-200">Automatic GPS Geo-Complaints</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold">Fast redressal directly to authorities</p>
            </div>
            <div className="h-px bg-zinc-250/60 dark:bg-zinc-850" />
            <div className="space-y-0.5">
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider">COMMODITY PRICES</p>
              <p className="text-xs font-bold text-black dark:text-zinc-200">Live Mandi Market Rates</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold">Updated Agmarknet pricing feed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-[10px] text-zinc-400 dark:text-zinc-600 space-y-1.5 px-1 font-semibold">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>MeraShehar City App</span>
        </div>
        <p className="pl-[20px]">© 2026 · Hyperlocal Super-App</p>
      </div>
    </div>
  );
}
