import React, { useState } from 'react';
import { MapPin, Shield, Check, Menu, PhoneCall, ChevronDown, Sparkles } from 'lucide-react';
import { api, reverseGeocode } from '../api';

export default function Header({ user, onUserUpdate, onMenuOpen, onEmergencyOpen }) {
  const [isEditing, setIsEditing] = useState(false);
  const [city, setCity] = useState(user?.city || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const POPULAR_CITIES = [
    { city: 'Lucknow', district: 'Lucknow' },
    { city: 'Jaipur', district: 'Jaipur' },
    { city: 'Pune', district: 'Pune' },
    { city: 'Delhi', district: 'Delhi' },
    { city: 'Kanpur', district: 'Kanpur' },
  ];

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!city.trim() || !district.trim()) return;
    setLoading(true);
    try {
      const updated = await api.updateMe({ city: city.trim(), district: district.trim() });
      localStorage.setItem('user', JSON.stringify(updated));
      onUserUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (preset) => {
    setCity(preset.city);
    setDistrict(preset.district);
    setLoading(true);
    try {
      const updated = await api.updateMe({ city: preset.city, district: preset.district });
      localStorage.setItem('user', JSON.stringify(updated));
      onUserUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to switch location');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectCurrent = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (loc.city && loc.district) {
            handleSelectPreset({ city: loc.city, district: loc.district });
          }
        } catch (e) {
          console.warn("Header location detect failed", e);
        } finally {
          setDetecting(false);
        }
      },
      () => setDetecting(false)
    );
  };

  return (
    <header className="sticky top-0 z-40 px-4 py-3 border-b border-line bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between transition-colors duration-300">
      
      {/* Location selector / Header left */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1.5 border border-emerald-500/30">
            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-transparent text-xs w-24 focus:outline-none px-2 text-black dark:text-white font-bold"
            />
            <input
              type="text"
              placeholder="District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="bg-transparent text-xs w-24 focus:outline-none px-2 text-black dark:text-white font-bold"
            />
            <button
              onClick={handleSave}
              disabled={loading}
              className="p-1.5 bg-emerald-600 dark:bg-emerald-500 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-black border border-emerald-500/20 transition shadow-sm"
            >
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{user?.city || 'Set City'}, {user?.district || ''}</span>
              <ChevronDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </button>

            <button
              onClick={handleDetectCurrent}
              disabled={detecting}
              title="Detect GPS location"
              className="p-1.5 rounded-full border border-line bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 transition text-[10px] font-extrabold flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span className="hidden sm:inline">GPS</span>
            </button>
          </div>
        )}

        {/* Quick Presets */}
        <div className="hidden md:flex items-center gap-1 pl-1">
          {POPULAR_CITIES.filter(c => c.city.toLowerCase() !== user?.city?.toLowerCase()).slice(0, 2).map((preset) => (
            <button
              key={preset.city}
              onClick={() => handleSelectPreset(preset)}
              className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-[10px] font-bold transition"
            >
              + {preset.city}
            </button>
          ))}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Emergency Helpline button */}
        <button
          onClick={onEmergencyOpen}
          className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-full text-xs font-black transition shadow-sm"
        >
          <PhoneCall className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Emergency</span>
        </button>

        {/* Authority indicator badge */}
        {user?.is_authority && (
          <div className="hidden md:flex items-center gap-1.5 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supervisor</span>
          </div>
        )}

        {/* Mobile: Menu button */}
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
