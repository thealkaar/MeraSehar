import React, { useState } from 'react';
import { MapPin, Shield, Edit2, Check, Menu } from 'lucide-react';
import { api } from '../api';

export default function Header({ user, onUserUpdate, onMenuOpen }) {
  const [isEditing, setIsEditing] = useState(false);
  const [city, setCity] = useState(user?.city || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!city.trim() || !district.trim()) return;
    setLoading(true);
    try {
      const updated = await api.updateMe({ city: city.trim(), district: district.trim() });
      localStorage.setItem('user', JSON.stringify(updated));
      onUserUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to update city');
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 premium-header px-4 py-3.5 flex items-center justify-between transition-colors duration-300">
      {/* Desktop: Page title */}
      <div className="hidden lg:flex items-center gap-2">
        <h1 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Home</h1>
      </div>

      {/* Mobile: Location only (no logo) */}
      <div className="flex items-center gap-2 lg:hidden">
        {/* Location display */}
        {isEditing ? (
          <form onSubmit={handleSave} className="flex items-center gap-1 bg-zinc-100 dark:bg-white/[0.05] rounded-full p-1 border border-line">
            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-transparent text-[11px] w-14 focus:outline-none px-1.5 text-black dark:text-white placeholder-zinc-400 font-bold"
              required
            />
            <input
              type="text"
              placeholder="District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="bg-transparent text-[11px] w-14 focus:outline-none px-1.5 text-black dark:text-white placeholder-zinc-400 font-bold"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="p-1 bg-black dark:bg-white rounded-full text-white dark:text-black hover:opacity-80 disabled:opacity-50 transition shrink-0"
            >
              <Check className="w-3 h-3" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-black dark:text-white px-3 py-1.5 rounded-full text-xs font-bold border border-line transition duration-300"
          >
            <MapPin className="w-4 h-4 text-black dark:text-white shrink-0" />
            <span>{user?.city || 'Set Location'}</span>
            <Edit2 className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Authority indicator badge — desktop only */}
        {user?.is_authority && (
          <div className="hidden sm:flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 text-black dark:text-white bg-zinc-50 dark:bg-zinc-950 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Supervisor</span>
          </div>
        )}

        {/* Desktop: Location editor */}
        <div className="hidden lg:flex">
          {isEditing ? (
            <form onSubmit={handleSave} className="flex items-center gap-1 bg-zinc-100 dark:bg-white/[0.05] rounded-full p-1 border border-line">
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-transparent text-[11px] w-14 focus:outline-none px-1.5 text-black dark:text-white placeholder-zinc-400 font-bold"
                required
              />
              <input
                type="text"
                placeholder="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="bg-transparent text-[11px] w-14 focus:outline-none px-1.5 text-black dark:text-white placeholder-zinc-400 font-bold"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="p-1 bg-black dark:bg-white rounded-full text-white dark:text-black hover:opacity-80 disabled:opacity-50 transition shrink-0"
              >
                <Check className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-black dark:text-white px-3.5 py-1.5 rounded-full text-xs font-bold border border-line transition duration-300"
            >
              <MapPin className="w-4 h-4 text-black dark:text-white shrink-0" />
              <span>{user?.city || 'Set Location'}</span>
              <Edit2 className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
            </button>
          )}
        </div>

        {/* Mobile: Menu button to open drawer */}
        <button
          onClick={onMenuOpen}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/[0.05] border border-line transition duration-300 lg:hidden shrink-0 text-black dark:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}
