import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, ThumbsUp, ShieldCheck } from 'lucide-react';
import { api } from '../api';

function formatHours(hours) {
  if (!Number.isFinite(hours)) return 'Not available';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} hours`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}

export default function CivicImpactWidget({ city = 'Lucknow' }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let requestInFlight = false;

    const loadImpact = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const result = await api.getCivicImpact();
        if (active) {
          setImpact(result);
          setError('');
        }
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load civic metrics.');
      } finally {
        requestInFlight = false;
        if (active) setLoading(false);
      }
    };

    loadImpact();
    const intervalId = window.setInterval(loadImpact, 60_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [city]);

  const stats = impact ? [
    {
      label: 'Resolved Issues',
      value: impact.resolution_rate === null ? '—' : `${impact.resolution_rate}%`,
      change: `${impact.resolved_this_month.toLocaleString()} resolved this month`,
      icon: CheckCircle2,
    },
    {
      label: 'Avg Resolution',
      value: impact.avg_resolution_hours === null ? 'Not available' : formatHours(impact.avg_resolution_hours),
      change: impact.resolution_sample_size
        ? `From ${impact.resolution_sample_size.toLocaleString()} recorded resolutions`
        : 'Timing recorded for new status updates',
      icon: Clock,
    },
    {
      label: 'Citizen Upvotes',
      value: impact.citizen_upvotes.toLocaleString(),
      change: 'Votes on city complaints',
      icon: ThumbsUp,
    },
  ] : [];

  return (
    <div className="mx-4 my-3 p-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white rounded-2xl border border-zinc-800 shadow-lg animate-fadeIn">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100">
              Civic Impact &bull; {impact?.city || city}
            </h3>
            <p className="text-[10px] font-semibold text-zinc-400">
              Calculated from recorded city complaints and votes
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider rounded-md">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {loading ? 'Updating' : 'Database'}
        </span>
      </div>

      {loading && !impact ? (
        <div className="flex items-center gap-2 py-4 text-xs font-semibold text-zinc-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          Loading metrics for {city}...
        </div>
      ) : error && !impact ? (
        <p role="alert" className="py-3 text-xs font-semibold text-rose-300">
          Civic metrics could not be loaded: {error}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="min-w-0 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/60 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1 gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                    {item.label}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                </div>
                <p className="text-sm sm:text-base font-black text-white leading-tight tracking-tight truncate">
                  {item.value}
                </p>
                <p className="text-[8px] font-medium text-emerald-400 mt-1 truncate" title={item.change}>
                  {item.change}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {error && impact && (
        <p role="status" className="pt-2 text-[9px] text-amber-300">
          Refresh failed; showing the last successfully loaded database totals.
        </p>
      )}
    </div>
  );
}
