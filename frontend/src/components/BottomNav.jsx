import React from 'react';
import { Megaphone, Briefcase, TrendingUp } from 'lucide-react';
import ComplaintIcon from './ComplaintIcon';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'news', label: 'News', icon: Megaphone },
    { id: 'complaints', label: 'Complaints', icon: ComplaintIcon },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'rates', label: 'Market', icon: TrendingUp },
  ];


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-premium safe-bottom lg:hidden border-t border-line">
      <div className="max-w-lg mx-auto px-4 flex justify-between items-center py-2 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ${
                isActive
                  ? 'text-black dark:text-white scale-105 font-bold'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="relative flex flex-col items-center justify-center">
                <Icon className={`w-5 h-5 mb-1 transition-transform duration-300 ${isActive ? 'stroke-[2.5px] scale-110 text-black dark:text-white' : 'stroke-[1.8px] text-zinc-450 dark:text-zinc-500'}`} />
                {/* Active pill indicator */}
                {isActive && (
                  <span className="absolute -bottom-1 w-5 h-[3px] bg-black dark:bg-white rounded-full transition-all duration-300" />
                )}
              </div>
              <span className="text-[10px] tracking-wide mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
