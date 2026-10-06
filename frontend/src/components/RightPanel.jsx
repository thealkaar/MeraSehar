import React, { useState } from 'react';
import { Megaphone, Sparkles, Tag, PhoneCall, CheckCircle2, Shield, X } from 'lucide-react';

export default function RightPanel({ user, onViewAuthority }) {
  const [showAdModal, setShowAdModal] = useState(false);
  const [adSubmitted, setAdSubmitted] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState('');
  const [bizPhone, setBizPhone] = useState('');

  const city = user?.city || 'Bhopal';

  // Sample Local Advertisements tailored for Indian cities & Mandis
  const LOCAL_ADS = [
    {
      id: 'ad-1',
      sponsor: 'Kisan Krishi Kendra',
      tagline: '20% OFF Organic Seeds & Fertilizers',
      category: 'Agri Supplies',
      badge: 'SPONSORED',
      location: `${city} Main Market`,
      contact: '+91 98765 12345',
      desc: 'Government verified organic fertilizers, drip irrigation kits, and crop protection sprays available at wholesale rates.',
      bgColor: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      borderColor: 'border-emerald-500/30',
      tagColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'ad-2',
      sponsor: 'Apex Tractor & Agri Spares',
      tagline: 'Free Servicing Checkup This Week',
      category: 'Machinery & Equipment',
      badge: 'FEATURED AD',
      location: `Mandi Bypass Road, ${city}`,
      contact: '+91 98123 45678',
      desc: 'Original spare parts for Mahindra, Swaraj, and Sonalika tractors. Harvester rental services available for current harvest season.',
      bgColor: 'from-amber-500/10 via-amber-500/5 to-transparent',
      borderColor: 'border-amber-500/30',
      tagColor: 'bg-amber-600 text-white',
    },
    {
      id: 'ad-3',
      sponsor: 'City Supermart & Groceries',
      tagline: 'Flat ₹100 Cashback on Home Delivery',
      category: 'Retail & Grocery',
      badge: 'LOCAL OFFER',
      location: `Station Road, ${city}`,
      contact: '+91 99887 76655',
      desc: 'Express 45-minute grocery and fresh produce delivery across all municipal wards in Bhopal.',
      bgColor: 'from-blue-500/10 via-blue-500/5 to-transparent',
      borderColor: 'border-blue-500/30',
      tagColor: 'bg-blue-600 text-white',
    },
  ];

  const handleBookAdSubmit = (e) => {
    e.preventDefault();
    setAdSubmitted(true);
    setTimeout(() => {
      setAdSubmitted(false);
      setShowAdModal(false);
      setBizName('');
      setBizCategory('');
      setBizPhone('');
    }, 2500);
  };

  return (
    <div className="flex flex-col h-full py-5 pr-2 space-y-4 justify-between transition-colors duration-300">
      <div className="space-y-4">

        {/* Supervisor Portal Card (If User is Authority) */}
        {user?.is_authority && (
          <div className="rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/40 space-y-2.5 text-white">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Supervisor Portal</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed font-semibold">
              Manage municipal complaints in <strong className="text-white">{city}</strong>.
            </p>
            <button
              onClick={onViewAuthority}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2.5 rounded-xl transition shadow-md"
            >
              Open Manager Panel &rarr;
            </button>
          </div>
        )}

        {/* ═══ SPONSORED ADVERTISEMENTS HEADER ═══ */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">Local Advertisements</h3>
              <p className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Sponsored in {city}</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAdModal(true)}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <Sparkles className="w-3 h-3" />
            <span>Post Ad</span>
          </button>
        </div>

        {/* ═══ ADVERTISEMENT CARDS LIST ═══ */}
        <div className="space-y-3.5">
          {LOCAL_ADS.map((ad) => (
            <div
              key={ad.id}
              className={`rounded-2xl border ${ad.borderColor} bg-gradient-to-br ${ad.bgColor} p-4 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-300 group`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${ad.tagColor}`}>
                  {ad.badge}
                </span>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                  {ad.category}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-black text-black dark:text-white leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  {ad.sponsor}
                </h4>
                <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 pt-0.5">
                  {ad.tagline}
                </p>
              </div>

              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium line-clamp-2">
                {ad.desc}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-line/60">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 truncate">
                  📍 {ad.location}
                </span>
                <a
                  href={`tel:${ad.contact}`}
                  className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call Now</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ BOOK AD SPACE BANNER ═══ */}
        <div className="rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-center space-y-2">
          <div className="inline-flex p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">Promote Your Local Business</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5 font-bold">Reach thousands of active customers across {city} wards & Mandis daily.</p>
          </div>
          <button
            onClick={() => setShowAdModal(true)}
            className="w-full bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-black py-2.5 rounded-xl transition shadow-md uppercase tracking-wider"
          >
            Advertise in {city} &rarr;
          </button>
        </div>

      </div>

      {/* Footer Info */}
      <div className="text-[10px] text-zinc-400 dark:text-zinc-600 space-y-1 px-1 font-bold border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <span>MeraShehar Ads Platform</span>
          <span>Verified Local Sponsors</span>
        </div>
        <p>© 2026 · All Rights Reserved</p>
      </div>

      {/* ═══ BOOK ADVERTISEMENT MODAL ═══ */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-line rounded-3xl p-6 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-black text-black dark:text-white uppercase tracking-wider">Book Ad Space in {city}</h3>
              </div>
              <button
                onClick={() => setShowAdModal(false)}
                className="text-zinc-400 hover:text-black dark:hover:text-white p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">Ad Request Received!</h4>
                <p className="text-xs text-zinc-500 font-bold px-4">Our local advertisement team in {city} will contact you shortly to activate your promotion.</p>
              </div>
            ) : (
              <form onSubmit={handleBookAdSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Business / Store Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Gupta Agri Traders"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-xs font-bold text-black dark:text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Category *</label>
                  <input
                    type="text"
                    placeholder="e.g. Agri Supplies, Electronics, Retail"
                    value={bizCategory}
                    onChange={(e) => setBizCategory(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-xs font-bold text-black dark:text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Contact Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-xs font-bold text-black dark:text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-3.5 rounded-2xl transition shadow-lg uppercase tracking-wider"
                >
                  Submit Ad Enquiry
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
