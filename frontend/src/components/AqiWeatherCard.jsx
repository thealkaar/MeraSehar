import React from 'react';
import { CloudSun, Wind } from 'lucide-react';

export default function AqiWeatherCard({ city = 'Lucknow' }) {
  // Simulated location-based AQI values
  const getCityData = (cityName) => {
    switch (cityName.toLowerCase()) {
      case 'jaipur':
        return { temp: '34°C', condition: 'Sunny', aqi: 158, status: 'Unhealthy for Sensitive', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
      case 'pune':
        return { temp: '27°C', condition: 'Partly Cloudy', aqi: 72, status: 'Satisfactory', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' };
      case 'thane':
      case 'mumbai':
        return { temp: '31°C', condition: 'Humid & Hazy', aqi: 110, status: 'Moderate', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' };
      default: // Lucknow
        return { temp: '32°C', condition: 'Hazy Sun', aqi: 135, status: 'Moderate Air', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
    }
  };

  const data = getCityData(city);

  return (
    <div className="mx-4 mt-4 mb-2 p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
      {/* Weather */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
          <CloudSun className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{data.temp}</span>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{data.condition}</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {city} Weather
          </p>
        </div>
      </div>

      {/* AQI Badge */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-200 dark:border-zinc-800">
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Wind className="w-3 h-3 text-zinc-400" />
            <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">AQI {data.aqi}</span>
          </div>
          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider ${data.color}`}>
            {data.status}
          </span>
        </div>
      </div>
    </div>
  );
}
