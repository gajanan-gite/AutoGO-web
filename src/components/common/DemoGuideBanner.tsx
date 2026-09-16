import { useState } from 'react';
import { User } from '../../types';
import { auth } from '../../services/auth';
import { db } from '../../services/db';
import { toast } from './ToastContainer';
import { PlayCircle, Users, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, ShieldAlert, Car, Calendar, Database } from 'lucide-react';

interface DemoGuideBannerProps {
  currentUser: User | null;
  onOpenVehicleDetails: (vehicleId: string, autoSelectConflictDates?: boolean) => void;
  onNavigate: (view: string) => void;
}

export function DemoGuideBanner({ currentUser, onOpenVehicleDetails, onNavigate }: DemoGuideBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!auth.isDemoMode()) {
    return null;
  }

  const demoUsers = [
    { id: 'user_alex_renter', label: 'Alex (Customer)', role: 'customer' },
    { id: 'user_marcus_owner', label: 'Marcus (Car Host)', role: 'owner' },
    { id: 'user_sarah_owner', label: 'Sarah (Car Host)', role: 'owner' },
    { id: 'user_admin', label: 'Platform Admin', role: 'admin' },
  ];

  const handleResetData = async () => {
    await db.resetToDefault();
    await auth.switchUser('user_alex_renter');
    toast.success('Database has been reset to pristine seed data with realistic cars, hosts, and reservations.', 'Demo Reset Complete');
  };

  const runFlow1 = async () => {
    await auth.switchUser('user_alex_renter');
    onNavigate('browse');
    toast.info('Logged in as Alex (Customer). Browse vehicles below or select one to book.', 'Flow 1 Started');
  };

  const runFlow2 = async () => {
    await auth.switchUser('user_marcus_owner');
    onNavigate('owner-dashboard');
    toast.info('Logged in as Marcus (Host). View your dashboard or click "Add Vehicle".', 'Flow 2 Started');
  };

  const runFlow3 = async () => {
    await auth.switchUser('user_marcus_owner');
    // Marcus owns Tesla Model 3 ('car_tesla_model3')
    onOpenVehicleDetails('car_tesla_model3');
    toast.warning('Switched to Marcus (Owner of this Tesla). Notice the ownership restriction guard preventing Marcus from booking his own vehicle!', 'Flow 3: Owner Self-Booking Guard');
  };

  const runFlow4 = async () => {
    await auth.switchUser('user_alex_renter');
    // BMW M3 ('car_bmw_m3') has confirmed reservation Sep 20 - Sep 22, 2026
    onOpenVehicleDetails('car_bmw_m3', true);
    toast.warning('Opened BMW M3 with overlapping dates (Sep 20–22). Try clicking "Book Now" or checking the live schedule to verify conflict prevention!', 'Flow 4: Overlapping Conflict Detection');
  };

  return (
    <aside aria-label="Demo Testing Bar" className="bg-slate-900 border-b border-slate-800 text-slate-200 text-xs py-2 px-3 sm:px-6 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Active Persona Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-slate-100 uppercase tracking-wider text-[11px]">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Active Persona:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            {demoUsers.map((u) => {
              const isActive = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    auth.switchUser(u.id);
                    toast.info(`Switched role to ${u.label}`);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] font-medium shadow-xs">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>PostgreSQL Active</span>
          </div>
        </div>

        {/* Right: Quick Flow Launcher Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-md transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Core Flows</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={handleResetData}
            title="Reset to default seed data"
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-2 py-1 rounded-md transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Expandable Quick Flow Shortcuts Bar */}
      {isExpanded && (
        <div className="max-w-7xl mx-auto pt-2 pb-1 border-t border-slate-800/80 mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 animate-in fade-in">
          <button
            onClick={runFlow1}
            className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition-colors group"
          >
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-slate-100">Flow 1: Customer Booking</p>
              <p className="text-[11px] text-slate-400">Browse & rent vehicle as customer Alex</p>
            </div>
          </button>

          <button
            onClick={runFlow2}
            className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition-colors group"
          >
            <Car className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-slate-100">Flow 2: Owner Dashboard</p>
              <p className="text-[11px] text-slate-400">List car, accept bookings & view earnings</p>
            </div>
          </button>

          <button
            onClick={runFlow3}
            className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition-colors group"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-slate-100">Flow 3: Self-Booking Guard</p>
              <p className="text-[11px] text-slate-400">Reject owner trying to book own car</p>
            </div>
          </button>

          <button
            onClick={runFlow4}
            className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition-colors group"
          >
            <Calendar className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-slate-100">Flow 4: Overlap Conflict Check</p>
              <p className="text-[11px] text-slate-400">Block conflicting booking on BMW M3</p>
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}
