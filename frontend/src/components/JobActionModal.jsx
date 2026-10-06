import React from 'react';
import { Phone, MessageCircle, Share2, X, MapPin, Building, Briefcase } from 'lucide-react';

export default function JobActionModal({ job, onClose }) {
  if (!job) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job.title,
        text: `Check out this job opening for ${job.title} in ${job.location_area}, ${job.city} on MeraShehar!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`Job: ${job.title} - Contact: ${job.contact_number}`);
      alert('Job details copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-[9px] font-black uppercase tracking-wider">
                {job.category}
              </span>
              <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-1 leading-snug">
                {job.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-bold">{job.contact_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>{job.location_area}, {job.city} ({job.district})</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 font-medium">
            <p className="font-bold uppercase text-[9px] text-zinc-400 tracking-wider mb-1">Job Description</p>
            {job.description}
          </div>

          {job.salary_range && (
            <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black">
              Salary: {job.salary_range}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href={`tel:${job.contact_number}`}
              className="flex items-center justify-center gap-2 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-extrabold text-xs hover:opacity-90 transition-opacity"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Call Now</span>
            </a>
            <a
              href={`https://wa.me/91${job.contact_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${job.contact_name}, I am reaching out regarding the ${job.title} job posted on MeraShehar.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-extrabold text-xs hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </a>
          </div>

          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors mt-2"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Job Listing</span>
          </button>
        </div>
      </div>
    </div>
  );
}
