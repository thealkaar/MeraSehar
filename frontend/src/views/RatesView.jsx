import React, { useCallback, useState, useEffect } from 'react';
import { api } from '../api';
import { Search, ArrowUp, ArrowDown, HelpCircle, Loader2, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';

const DISTRICT_STATES = {
  bhopal: 'Madhya Pradesh',
  indore: 'Madhya Pradesh',
  lucknow: 'Uttar Pradesh',
  kanpur: 'Uttar Pradesh',
  jaipur: 'Rajasthan',
  pune: 'Maharashtra',
  thane: 'Maharashtra',
  delhi: 'Delhi',
  patna: 'Bihar',
  varanasi: 'Uttar Pradesh',
};

export default function RatesView({ user }) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rateError, setRateError] = useState('');
  const [commoditySearch, setCommoditySearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(user?.district || 'all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [unit, setUnit] = useState('kg');
  const [lastUpdated, setLastUpdated] = useState('');

  const currentDistrict = user?.district || 'Lucknow';
  const DISTRICT_OPTIONS = [
    {
      label: `Current (${currentDistrict})`,
      value: currentDistrict,
      state: DISTRICT_STATES[currentDistrict.toLowerCase().replace(/\s+district$/i, '')] || '',
    },
    { label: 'All India Mandis', value: 'all' },
    { label: 'Bhopal (MP)', value: 'Bhopal', state: 'Madhya Pradesh' },
    { label: 'Lucknow (UP)', value: 'Lucknow', state: 'Uttar Pradesh' },
    { label: 'Kanpur (UP)', value: 'Kanpur', state: 'Uttar Pradesh' },
    { label: 'Jaipur (RJ)', value: 'Jaipur', state: 'Rajasthan' },
    { label: 'Pune (MH)', value: 'Pune', state: 'Maharashtra' },
    { label: 'Delhi Mandi', value: 'Delhi', state: 'Delhi' },
    { label: 'Indore (MP)', value: 'Indore', state: 'Madhya Pradesh' },
  ].filter((option, index) => (
    index === 0 || option.value.toLowerCase() !== (user?.district || 'Lucknow').toLowerCase()
  ));
  const selectedState = DISTRICT_OPTIONS.find((option) => (
    option.value.toLowerCase() === selectedDistrict.toLowerCase()
  ))?.state || '';

  const CATEGORIES = ['All', 'Vegetables', 'Grains', 'Spices', 'Fruits', 'Oilseeds'];

  useEffect(() => {
    if (user?.district) setSelectedDistrict(user.district);
  }, [user?.district]);

  const fetchRates = useCallback(async ({ refresh = false } = {}) => {
    setLoading(true);
    setRateError('');
    try {
      const list = await api.getRates({
        commodity: commoditySearch.trim(),
        district: selectedDistrict,
        state: selectedState,
        refresh,
      });
      setRates(list);
      if (list && list.length > 0) {
        setLastUpdated(new Date(list[0].price_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
      } else {
        setLastUpdated('');
      }
    } catch (err) {
      console.error("Rates fetch error:", err);
      setRates([]);
      setLastUpdated('');
      setRateError(err.message || 'Could not load rates for this district.');
    } finally {
      setLoading(false);
    }
  }, [commoditySearch, selectedDistrict, selectedState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRates();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchRates]);

  // Commodity Category Classifier helper
  const getCommodityCategory = (name) => {
    const n = name.toLowerCase();
    if (n.includes('potato') || n.includes('tomato') || n.includes('onion') || n.includes('chilli') || n.includes('cauliflower') || n.includes('gobhi')) return 'Vegetables';
    if (n.includes('wheat') || n.includes('rice') || n.includes('gehun') || n.includes('chawal') || n.includes('gram') || n.includes('chana')) return 'Grains';
    if (n.includes('garlic') || n.includes('ginger') || n.includes('lahsun') || n.includes('adrak')) return 'Spices';
    if (n.includes('apple') || n.includes('banana') || n.includes('seb') || n.includes('kela')) return 'Fruits';
    if (n.includes('mustard') || n.includes('sarson') || n.includes('cotton') || n.includes('kapas')) return 'Oilseeds';
    return 'Vegetables';
  };

  const filteredRates = rates.filter(rate => {
    if (categoryFilter === 'All') return true;
    return getCommodityCategory(rate.commodity_name) === categoryFilter;
  });

  const formatPrice = (val) => {
    if (unit === 'kg') {
      const perKg = val / 100;
      return `₹${perKg.toFixed(1)}`;
    }
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getTrend = (rate) => {
    const previous = rates
      .filter((item) => (
        item.commodity_name === rate.commodity_name
        && item.market_name === rate.market_name
        && item.price_date < rate.price_date
      ))
      .sort((left, right) => right.price_date.localeCompare(left.price_date))[0];
    if (!previous || previous.modal_price <= 0) {
      return {
        direction: 'stable',
        pct: 'No prior data',
        color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900',
      };
    }
    const change = ((rate.modal_price - previous.modal_price) / previous.modal_price) * 100;
    const roundedChange = Math.round(change * 10) / 10;
    if (roundedChange > 0) {
      return {
        direction: 'up',
        pct: `+${roundedChange}%`,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
      };
    }
    if (roundedChange < 0) {
      return {
        direction: 'down',
        pct: `${roundedChange}%`,
        color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50',
      };
    }
    return {
      direction: 'stable',
      pct: '0.0%',
      color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900',
    };
  };

  return (
    <div className="w-full px-4 pt-4 pb-24 space-y-4">

      {/* ═══ Header Ticker Bar ═══ */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950 text-white p-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Mandi Rates</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-300">
                  <Sparkles className="w-2.5 h-2.5" /> Database rates
                </span>
              </div>
              <h1 className="text-xl font-black tracking-tight pt-0.5">Daily Mandi Commodity Prices</h1>
            </div>
          </div>

          <button
            onClick={() => fetchRates({ refresh: true })}
            disabled={loading}
            className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-900/40 hover:bg-emerald-800/60 transition text-emerald-300 shrink-0"
            title="Refresh Mandi Rates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Live Top Commodity Rate Pill Ticker */}
        {rates.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-emerald-800/60 flex items-center gap-3 overflow-x-auto no-scrollbar text-xs">
            {rates.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center gap-2 shrink-0 bg-emerald-900/60 border border-emerald-700/50 rounded-xl px-3 py-1.5 font-bold">
                <span className="text-emerald-200">{item.commodity_name.split(' ')[0]}</span>
                <span className="text-white font-black">₹{(item.modal_price / 100).toFixed(0)}/kg</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Controls: District Selector & Search ═══ */}
      <div className="space-y-3">
        {/* District Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 shrink-0">District:</span>
          {DISTRICT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedDistrict(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition ${
                selectedDistrict.toLowerCase() === opt.value.toLowerCase()
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-line'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search & Unit Switcher Row */}
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-center">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search commodity (Potato, Wheat, Tomato, Onion...)"
              value={commoditySearch}
              onChange={(e) => setCommoditySearch(e.target.value)}
              className="w-full rounded-2xl border border-line bg-white dark:bg-zinc-950 py-3 pl-10 pr-4 text-xs font-bold text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-sm"
            />
          </div>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-line justify-self-end">
            <button
              onClick={() => setUnit('qtl')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition ${
                unit === 'qtl'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500'
              }`}
            >
              ₹ / Quintal
            </button>
            <button
              onClick={() => setUnit('kg')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition ${
                unit === 'kg'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-zinc-500'
              }`}
            >
              ₹ / Kg
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition ${
                categoryFilter === cat
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-line'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Commodity Cards Grid ═══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs text-zinc-500 font-bold">Loading government rates for {selectedDistrict}...</span>
        </div>
      ) : rateError ? (
        <div role="alert" className="text-center py-16 bg-rose-50/60 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900">
          <h3 className="text-rose-800 dark:text-rose-200 font-black text-sm">Mandi rates could not be loaded</h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-2 px-4 font-bold">{rateError}</p>
          <button
            type="button"
            onClick={() => fetchRates({ refresh: true })}
            className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-xs font-black text-white"
          >
            Retry
          </button>
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-3xl border border-line border-dashed">
          <HelpCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-zinc-800 dark:text-zinc-300 font-black text-sm uppercase tracking-wider">No Mandi rates matched</h3>
          <p className="text-xs text-zinc-500 mt-1.5 px-4 font-bold">Try searching another commodity or select "All India Mandis".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredRates.map((rate) => {
            const trend = getTrend(rate);
            return (
              <div
                key={rate.id}
                className="rounded-3xl border border-line bg-white dark:bg-zinc-900 p-4 shadow-xl shadow-black/[0.02] flex flex-col justify-between gap-3 hover:border-emerald-500/40 transition group"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                        {getCommodityCategory(rate.commodity_name)}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-black dark:text-white leading-tight truncate pt-0.5">
                      {rate.commodity_name}
                    </h3>
                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      {rate.market_name} &bull; <span className="text-black dark:text-white font-extrabold">{rate.district}</span> ({rate.state})
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${trend.color} mb-1`}>
                      {trend.direction === 'up' && <ArrowUp className="w-2.5 h-2.5" />}
                      {trend.direction === 'down' && <ArrowDown className="w-2.5 h-2.5" />}
                      {trend.pct}
                    </span>
                    <p className="text-xl font-black text-black dark:text-white leading-none tracking-tight">
                      {formatPrice(rate.modal_price)}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">
                      Modal Rate / {unit === 'qtl' ? 'Quintal' : 'Kg'}
                    </p>
                  </div>
                </div>

                {/* Range bar */}
                <div className="space-y-1.5 pt-2 border-t border-line/60">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                    <span>Min: {formatPrice(rate.min_price)}</span>
                    <span>Max: {formatPrice(rate.max_price)}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: rate.max_price > rate.min_price
                          ? `${Math.max(12, Math.min(100, ((rate.modal_price - rate.min_price) / (rate.max_price - rate.min_price)) * 100))}%`
                          : '50%'
                      }}
                    />
                  </div>
                </div>

                {/* Conversions & Date */}
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 dark:text-zinc-500 pt-1 border-t border-line uppercase">
                  <span>
                    {unit === 'qtl'
                      ? `Retail approx: ₹${(rate.modal_price / 100).toFixed(1)} / kg`
                      : `Wholesale approx: ₹${rate.modal_price.toLocaleString()} / quintal`}
                  </span>
                  <span>{new Date(rate.price_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer statistics */}
      {rates.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 text-[10px] text-zinc-400 dark:text-zinc-500 px-2 font-bold border-t border-line pt-3">
          <span>Source: Government of India Agmarknet data</span>
          <span>Last Updated: {lastUpdated || 'Today'}</span>
        </div>
      )}

    </div>
  );
}
