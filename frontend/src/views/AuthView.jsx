import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Phone, Lock, User, MapPin, Loader2, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Logo from '../components/Logo';

export default function AuthView({ onAuthSuccess }) {
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState('phone'); // phone -> otp -> register
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Fetch coordinates on mount for tagging if allowed
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn("Geolocation denied or unavailable", err);
        }
      );
    }
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!mobileNumber) return;
    setLoading(true);
    setError('');
    setInfoMsg('');
    try {
      await api.sendOtp(mobileNumber);
      setStep('otp');
      setInfoMsg('Verification code sent! (Check your developer terminal console for the mock OTP code)');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Ensure mobile matches +91XXXXXXXXXX format.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.verifyOtp(mobileNumber, otp);
      if (response.is_registered) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        onAuthSuccess(response.user);
      } else {
        setStep('register');
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !city || !district) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.register({
        full_name: fullName,
        mobile_number: mobileNumber,
        address,
        city: city.trim(),
        district: district.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      onAuthSuccess(response.user);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-6 py-12 relative transition-colors duration-300" style={{ backgroundColor: 'var(--bg-app)' }}>
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/[0.05] border border-line transition duration-300"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-white" />
          ) : (
            <Moon className="w-5 h-5 text-black" />
          )}
        </button>
      </div>

      <div className="w-full max-w-[440px] space-y-8 animate-scaleIn">
        {/* Header Title with Logo */}
        <div className="space-y-4">
          <Logo className="w-12 h-12 shrink-0" />
          <h1 className="text-4xl md:text-5xl font-black text-black dark:text-white tracking-tight leading-none pt-2 uppercase">
            MeraShehar
          </h1>
          <p className="text-sm font-bold text-zinc-550 dark:text-zinc-400 tracking-tight">
            Join the hyperlocal community super-app today.
          </p>
        </div>

        {error && (
          <div className="bg-zinc-50 dark:bg-zinc-950 border-2 border-black dark:border-white text-black dark:text-white p-4.5 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {infoMsg && (
          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-250 p-4.5 rounded-xl text-xs font-bold leading-relaxed">
            {infoMsg}
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <div className="relative">
                <span className="absolute left-4 top-4 text-zinc-500 dark:text-zinc-500 text-sm font-bold">+91</span>
                <input
                  type="tel"
                  placeholder="Enter mobile number"
                  value={mobileNumber.startsWith("+91") ? mobileNumber.slice(3) : mobileNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setMobileNumber(val ? `+91${val}` : '');
                  }}
                  className="w-full twitter-input py-4 pl-14 pr-4 text-sm font-bold"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full pill-button-primary py-3.5 flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Continue with phone</span>}
            </button>
            
            <p className="text-[10px] text-zinc-400 dark:text-zinc-650 leading-normal text-center pt-2 font-semibold">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1">
                Enter Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full twitter-input py-4 px-4 text-sm font-bold tracking-widest placeholder-zinc-400"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-1/3 pill-button-secondary py-3.5 text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 pill-button-primary py-3.5 flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify OTP</span>}
              </button>
            </div>
            
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal text-center pt-2 font-semibold">
              Enter the mock code <code className="font-bold text-black dark:text-white underline">123456</code> to bypass verification.
            </p>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
            <h2 className="text-xl font-black text-black dark:text-white tracking-tight uppercase">Create your account</h2>
            
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  placeholder="Ramesh Singh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full twitter-input py-3.5 px-4 text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Address</label>
                <input
                  type="text"
                  placeholder="Flat, Street, Area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full twitter-input py-3.5 px-4 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Lucknow"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full twitter-input py-3.5 px-4 text-xs font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Lucknow"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full twitter-input py-3.5 px-4 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              {coords.latitude && (
                <div className="flex items-center gap-2 text-[10px] text-black dark:text-white bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-line font-bold">
                  <MapPin className="w-4 h-4 shrink-0 text-black dark:text-white" />
                  <span>Geotagging captured: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full pill-button-primary py-3.5 flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm mt-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Complete Onboarding</span>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
