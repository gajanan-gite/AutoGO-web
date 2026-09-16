import { useState, FormEvent } from 'react';
import { Search, MapPin, Calendar, Clock, Sparkles, Shield, Key } from 'lucide-react';
import { SearchFilterState } from '../../types';

interface HeroSectionProps {
  onSearch: (criteria: Partial<SearchFilterState>) => void;
  availableCount: number;
}

export function HeroSection({ onSearch, availableCount }: HeroSectionProps) {
  // Current simulated local time is Sep 15, 2026
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('2026-09-18');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('2026-09-20');
  const [endTime, setEndTime] = useState('18:00');
  const [type, setType] = useState('all');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch({
      location,
      startDate,
      startTime,
      endDate,
      endTime,
      type: type === 'all' ? '' : type,
    });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
      {/* Subtle ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.18),transparent_60%)] pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Main Hero Copy */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Peer-to-Peer Mobility Platform
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Find the perfect car <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              for your journey
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Rent extraordinary cars from trusted local hosts in San Francisco, Los Angeles, and beyond.
            Transparent pricing, zero hidden fees, and verified instant bookings.
          </p>
        </div>

        {/* Hero Search Box Card */}
        <div className="max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/20 text-slate-900">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Where / Location */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Where
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, airport or address (e.g. San Francisco)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  id="hero-location-input"
                />
              </div>
            </div>

            {/* Rental Start Date & Time */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Trip Starts
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="col-span-3 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  id="hero-start-date-input"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  id="hero-start-time-input"
                />
              </div>
            </div>

            {/* Rental End Date & Time */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Trip Ends
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="col-span-3 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  id="hero-end-date-input"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                  id="hero-end-time-input"
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
                id="hero-search-btn"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </form>

          {/* Quick Category Chips under search box */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-slate-600">Quick category:</span>
              {['all', 'Electric', 'SUV', 'Luxury', 'Sedan', 'Convertible'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setType(cat);
                    onSearch({ type: cat === 'all' ? '' : cat });
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                    type === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'All Types' : cat}
                </button>
              ))}
            </div>
            <div className="text-slate-500 font-medium">
              <span className="text-blue-600 font-bold">{availableCount}</span> vehicles ready for instant booking
            </div>
          </div>
        </div>

        {/* Value Highlights */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-slate-300 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white">Full Protection</p>
              <p className="text-xs text-slate-400">Verified insurance coverage and 24/7 roadside assistance.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white">Seamless Check-in</p>
              <p className="text-xs text-slate-400">Keyless contactless unlock or easy host handoff.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white">Zero Counter Waits</p>
              <p className="text-xs text-slate-400">Skip standard rental lines. Book directly with local hosts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
