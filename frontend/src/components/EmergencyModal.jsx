import React from 'react';
import { Phone, Shield, Flame, HeartPulse, Zap, X, AlertTriangle } from 'lucide-react';

export default function EmergencyModal({ isOpen, onClose, city = 'Lucknow' }) {
  if (!isOpen) return null;

  const helplines = [
    { title: 'Police Emergency', number: '112', icon: Shield, desc: 'Immediate police assistance & PCR' },
    { title: 'Medical Ambulance', number: '108', icon: HeartPulse, desc: 'Free emergency medical transport' },
    { title: 'Women Helpline', number: '1090', icon: Phone, desc: '24/7 dedicated support & safety' },
    { title: 'Nagar Nigam / Civic Helpline', number: '1912', icon: Zap, desc: 'Electricity, water & municipal emergencies' },
    { title: 'Fire Department', number: '101', icon: Flame, desc: 'Fire outbreak & rescue ops' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 dark:bg-red-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider leading-none">Emergency Contacts</h2>
              <p className="text-[10px] opacity-90 font-bold mt-1 uppercase tracking-wider">
                Hyperlocal Helplines &bull; {city}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5 max-h-[75vh] overflow-y-auto">
          {helplines.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={`tel:${item.number}`}
                className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-zinc-200/70 dark:bg-zinc-700/60 group-hover:bg-red-600 group-hover:text-white rounded-lg transition-colors">
                    <Icon className="w-4 h-4 text-zinc-700 dark:text-zinc-200 group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg font-black text-xs shadow-sm group-hover:scale-105 transition-transform">
                  <Phone className="w-3 h-3 fill-current" />
                  <span>{item.number}</span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-100 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Tap any row to dial immediately from your device
          </p>
        </div>
      </div>
    </div>
  );
}
