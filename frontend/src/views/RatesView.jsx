import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, HelpCircle, Loader2, TrendingUp } from 'lucide-react';

export default function RatesView({ user }) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commoditySearch, setCommoditySearch] = useState('');
  const [sortField, setSortField] = useState('commodity_name');
  const [sortOrder, setSortOrder] = useState('asc');

  const fetchRates = async () => {
    setLoading(true);
    try {
      const list = await api.getRates({ commodity: commoditySearch.trim() });
      setRates(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRates();
    }, 300);
    return () => clearTimeout(timer);
  }, [commoditySearch]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedRates = [...rates].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="w-full px-4 pt-4 pb-24">
      {/* Page Header */}
      <div className="mb-5 animate-fadeIn">
        <div className="flex items-center gap-2.5 mb-1">
          <TrendingUp className="w-5 h-5 text-black dark:text-white stroke-[2.5px]" />
          <h1 className="text-lg font-black text-black dark:text-white uppercase tracking-wider">Market Rates</h1>
        </div>
        <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 ml-7.5">
          Daily commodity prices for <span className="text-black dark:text-white font-black">{user?.district}</span> district
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4 animate-fadeIn">
        <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search commodity (Potato, Wheat, Onion...)"
          value={commoditySearch}
          onChange={(e) => setCommoditySearch(e.target.value)}
          className="w-full premium-input rounded-xl py-3 pl-11 pr-4 text-xs placeholder-zinc-400 dark:placeholder-zinc-600 font-semibold"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-5 animate-fadeIn">
        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1">Sort:</span>
        <button
          onClick={() => toggleSort('commodity_name')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all duration-300 ${
            sortField === 'commodity_name'
              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
              : 'border-line text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <span>Name</span>
          {sortField === 'commodity_name' ? (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </button>
        <button
          onClick={() => toggleSort('modal_price')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all duration-300 ${
            sortField === 'modal_price'
              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
              : 'border-line text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <span>Price</span>
          {sortField === 'modal_price' ? (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fadeIn">
          <Loader2 className="w-7 h-7 animate-spin text-black dark:text-white" />
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">Fetching market prices...</span>
        </div>
      ) : sortedRates.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-line border-dashed animate-fadeIn">
          <HelpCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-zinc-700 dark:text-zinc-400 font-bold text-sm uppercase tracking-wider">No prices available</h3>
          <p className="text-xs text-zinc-500 mt-1.5 px-4 font-semibold">No market rates found for {user?.district} today.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
          {sortedRates.map((rate) => (
            <div key={rate.id} className="premium-card p-4 flex flex-col gap-3">
              {/* Top row: commodity + market */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-black dark:text-white leading-snug truncate">
                    {rate.commodity_name}
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5 truncate uppercase tracking-wider">
                    {rate.market_name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-black dark:text-white leading-none tabular-nums">
                    ₹{rate.modal_price.toFixed(0)}
                  </p>
                  <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider">
                    per qtl
                  </p>
                </div>
              </div>

              {/* Price range bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                  <span>₹{rate.min_price.toFixed(0)}</span>
                  <span>₹{rate.max_price.toFixed(0)}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                  {/* Filled portion showing where modal sits between min and max */}
                  <div
                    className="h-full bg-black dark:bg-white rounded-full transition-all duration-500"
                    style={{
                      width: rate.max_price > rate.min_price
                        ? `${((rate.modal_price - rate.min_price) / (rate.max_price - rate.min_price)) * 100}%`
                        : '50%'
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
                  <span>Min</span>
                  <span>Max</span>
                </div>
              </div>

              {/* Date */}
              <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider pt-1 border-t border-line">
                {new Date(rate.price_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {rates.length > 0 && (
        <div className="flex items-center justify-between mt-5 text-[10px] text-zinc-400 dark:text-zinc-500 px-1 font-bold">
          <span>Updated: {new Date(rates[0].price_date).toLocaleDateString()}</span>
          <span>1 Quintal = 100 kg</span>
        </div>
      )}
    </div>
  );
}
