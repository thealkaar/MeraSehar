import React, { useState } from 'react';
import { api, reverseGeocode } from '../api';
import { Loader2, Sun, Moon, ShieldCheck, Navigation, ArrowRight, LockKeyhole } from 'lucide-react';
import { useTheme } from '../context/useTheme';
import Logo from '../components/Logo';

export default function AuthView({ onAuthSuccess, isAdmin = false }) {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authorityCode, setAuthorityCode] = useState('');
  const [city, setCity] = useState('Lucknow');
  const [district, setDistrict] = useState('Lucknow');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [detecting, setDetecting] = useState(false);
  const [detectedMsg, setDetectedMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please type your city.');
      return;
    }

    setDetecting(true);
    setError('');
    setDetectedMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });

        try {
          const locInfo = await reverseGeocode(lat, lng);
          if (locInfo.city) setCity(locInfo.city);
          if (locInfo.district) setDistrict(locInfo.district);
          if (locInfo.address) setAddress(locInfo.address);
          setDetectedMsg(`Location detected: ${locInfo.city || locInfo.district} (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
        } catch {
          setDetectedMsg(`Location pinned at ${lat.toFixed(3)}, ${lng.toFixed(3)}`);
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        console.warn("Geolocation permission error:", err);
        setDetecting(false);
        setError('Could not get automatic location. Please enter your city and district below.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'register' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credentials = {
        username: username.trim(),
        password,
      };
      const response = mode === 'login'
        ? (isAdmin
          ? await api.authorityLogin({ ...credentials, authority_code: authorityCode })
          : await api.login(credentials))
        : (isAdmin
          ? await api.authorityRegister({
            ...credentials,
            full_name: fullName.trim(),
            city: city.trim(),
            district: district.trim(),
            authority_code: authorityCode,
            address: address.trim(),
            latitude: coords.latitude,
            longitude: coords.longitude
          })
          : await api.register({
            ...credentials,
            full_name: fullName.trim(),
            city: city.trim(),
            district: district.trim(),
            address: address.trim(),
            latitude: coords.latitude,
            longitude: coords.longitude
          }));

      if (response.token && response.user) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        onAuthSuccess(response.user);
      } else {
        throw new Error('Sign-in failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen w-full relative transition-colors duration-300 overflow-x-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
      {/* Floating Theme Toggle */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20">
        <button
          onClick={toggleTheme}
          className="w-11 h-11 flex items-center justify-center rounded-2xl border border-line bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-lg transition hover:scale-105"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-zinc-800" />
          )}
        </button>
      </div>

      <div className="relative z-10 min-h-screen w-full max-w-7xl mx-auto grid lg:grid-cols-[minmax(380px,0.85fr)_minmax(500px,1.15fr)] items-center gap-10 px-5 sm:px-8 lg:px-12 py-12 lg:py-8">

        {/* Onboarding Box */}
        <div className="w-full max-w-[480px] mx-auto lg:mx-0 lg:justify-self-start space-y-6">

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Verified Hyperlocal Access & Live Mandi
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Logo className="w-14 h-14" />
              <div>
                <h1 className="text-4xl sm:text-[3.5rem] font-black text-black dark:text-white tracking-[-0.06em] leading-none uppercase font-sans">
                  MERA<span className="text-emerald-600 dark:text-emerald-400">SHEHAR</span>
                </h1>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pt-1">
                  {isAdmin ? 'Secure administration portal' : 'Hyperlocal Civic & Agriculture Platform'}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-4 rounded-2xl text-xs font-bold leading-relaxed animate-fadeIn">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-line bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-6 sm:p-7 shadow-2xl shadow-emerald-950/5 dark:shadow-black/40">
            <div className="border-b border-line pb-3">
              <h2 className="text-lg font-black text-black dark:text-white tracking-tight">
                {isAdmin ? 'Administrator access' : mode === 'login' ? 'Sign in to your city hub' : 'Create your account'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-0.5">
                {isAdmin
                  ? 'Authorized administrators sign in with their account and authority access code.'
                  : mode === 'login'
                    ? 'Use your username and password to continue.'
                    : 'Create secure credentials to access local news, civic issues, and market rates.'}
              </p>
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Full name</label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-950 px-4 py-3.5 text-sm font-bold text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Username</label>
              <input
                type="text"
                autoComplete="username"
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-950 px-4 py-3.5 text-sm font-bold text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Password</label>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={10}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm font-bold text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                required
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Confirm password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm font-bold text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">City / Town</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Optional location</label>
                    {coords.latitude !== null && (
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">Coordinates tagged</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detecting}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-4 py-3 text-xs font-black text-emerald-800 dark:text-emerald-200 transition"
                  >
                    {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    <span>{detecting ? 'Detecting location…' : 'Detect my location'}</span>
                  </button>
                  {detectedMsg && <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{detectedMsg}</p>}
                </div>
              </>
            )}

            {isAdmin && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Authority access code
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={authorityCode}
                  onChange={(e) => setAuthorityCode(e.target.value)}
                  className="w-full rounded-2xl border border-line bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm font-bold text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-black py-4 text-sm tracking-wide transition shadow-xl shadow-emerald-600/25 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <span>
                    {isAdmin
                      ? mode === 'login' ? 'Sign in as administrator' : 'Create administrator account'
                      : mode === 'login' ? 'Sign in' : 'Create account'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                }}
                className="font-black text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                {mode === 'login' ? 'Create an account' : 'Sign in instead'}
              </button>
            </p>
          </form>

          {isAdmin && (
            <a href="/" className="block text-center text-xs font-bold text-zinc-500 hover:text-emerald-600">
              Return to citizen sign in
            </a>
          )}

          {!isAdmin && (
            <a
              href="/admin"
              className="fixed bottom-5 right-5 z-20 inline-flex items-center gap-2 rounded-xl border border-line bg-white/90 dark:bg-zinc-900/90 px-3 py-2 text-[11px] font-bold text-zinc-500 shadow-lg backdrop-blur hover:text-emerald-600"
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              Administration portal
            </a>
          )}
        </div>

        {/* Right Stage Showcase */}
        <div className="hidden lg:flex auth-stage relative min-h-[600px] items-center justify-center rounded-3xl border border-line bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 p-8">
          <div className="brand-orbit desktop-premium-motion" aria-hidden="true">
            <div className="orbit-ring orbit-ring-one border-emerald-500/20" />
            <div className="orbit-ring orbit-ring-two border-emerald-500/10" />
            <div className="orbit-ring orbit-ring-three border-emerald-500/5" />
            <div className="signal-dot signal-dot-one bg-emerald-500" />
            <div className="signal-dot signal-dot-two bg-emerald-400" />
            <div className="signal-dot signal-dot-three bg-emerald-600" />
            <div className="brand-core bg-white dark:bg-zinc-950 border border-emerald-500/30 shadow-2xl">
              <Logo className="w-24 h-24 auth-logo-shine" />
              <div className="brand-wordmark font-black tracking-wider text-black dark:text-white uppercase">
                MERA<span className="text-emerald-600 dark:text-emerald-400">SEHAR</span>
              </div>
            </div>
          </div>

          <div className="absolute top-10 left-10 rounded-2xl border border-line bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 shadow-lg space-y-1">
            <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Live Agmarknet Mandi</div>
            <div className="text-sm font-black text-black dark:text-white">Daily Commodity Rates</div>
          </div>

          <div className="absolute bottom-10 right-10 rounded-2xl border border-line bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 shadow-lg space-y-1">
            <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Hyperlocal Grievances</div>
            <div className="text-sm font-black text-black dark:text-white">Direct Municipal Sync</div>
          </div>
        </div>

      </div>
    </div>
  );
}
