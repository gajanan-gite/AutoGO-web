import { useState, FormEvent } from 'react';
import { UserRole } from '../../types';
import { auth } from '../../services/auth';
import { toast } from '../common/ToastContainer';
import { X, User, Car, Shield, Mail, Phone, Lock, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  defaultRole?: UserRole;
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login', defaultRole = 'customer' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isDemo = auth.isDemoMode();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim()) {
          toast.error('Please enter your email address.');
          setLoading(false);
          return;
        }
        const res = await auth.login(email, password);
        if (res.success && res.user) {
          toast.success(`Welcome back, ${res.user.name}!`);
          onClose();
        } else {
          toast.error(res.error || 'Account not found. Select a demo persona or register below.');
        }
      } else {
        if (!name.trim() || !email.trim()) {
          toast.error('Please provide your name and email address.');
          setLoading(false);
          return;
        }
        if (password && password.length < 6) {
          toast.error('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const res = await auth.register({
          name,
          email,
          phone: phone || '+1 (555) 012-3456',
          role,
          password: password || 'password123',
        });

        if (res.success && res.user) {
          toast.success(`Account created! Logged in as ${res.user.name} (${res.user.role}).`);
          onClose();
        } else {
          toast.error(res.error || 'Failed to create account.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const selectDemoPersona = async (userId: string, label: string) => {
    await auth.switchUser(userId);
    toast.info(`Switched active user to ${label}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative my-auto p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-lg">
              {mode === 'login' ? 'Sign In to AutoGO' : 'Create an AutoGO Account'}
            </h3>
            <p className="text-xs text-slate-400">
              {mode === 'login' ? 'Access your bookings and vehicles' : 'Start renting or hosting vehicles in minutes'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Switcher Buttons - Only shown when demo mode is active */}
        {isDemo && (
          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-2">
            <span className="text-[11px] font-bold text-blue-950 block">Quick Demo 1-Click Access:</span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => selectDemoPersona('user_alex_renter', 'Alex Rivera (Customer)')}
                className="p-2 bg-white hover:bg-blue-100/70 border border-blue-200 rounded-xl text-left font-semibold text-slate-800 transition-colors"
              >
                <div className="font-bold text-blue-700">Alex Rivera</div>
                <div className="text-[10px] text-slate-400">Customer / Renter</div>
              </button>
              <button
                type="button"
                onClick={() => selectDemoPersona('user_marcus_owner', 'Marcus Chen (Car Host)')}
                className="p-2 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-xl text-left font-semibold text-slate-800 transition-colors"
              >
                <div className="font-bold text-emerald-700">Marcus Chen</div>
                <div className="text-[10px] text-slate-400">Owner (Tesla, Bronco)</div>
              </button>
              <button
                type="button"
                onClick={() => selectDemoPersona('user_sarah_owner', 'Sarah Jenkins (Car Host)')}
                className="p-2 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-xl text-left font-semibold text-slate-800 transition-colors"
              >
                <div className="font-bold text-emerald-700">Sarah Jenkins</div>
                <div className="text-[10px] text-slate-400">Owner (BMW M3, Porsche)</div>
              </button>
              <button
                type="button"
                onClick={() => selectDemoPersona('user_admin', 'AutoGO Admin')}
                className="p-2 bg-white hover:bg-purple-100/70 border border-purple-200 rounded-xl text-left font-semibold text-slate-800 transition-colors"
              >
                <div className="font-bold text-purple-700">AutoGO Admin</div>
                <div className="text-[10px] text-slate-400">Platform Manager</div>
              </button>
            </div>
          </div>
        )}

        {/* Custom Login / Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'register' && (
            <>
              {/* Role Picker */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  I want to:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`p-2.5 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                      role === 'customer'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Rent Cars (Customer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('owner')}
                    className={`p-2.5 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                      role === 'owner'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    List Cars (Host)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/30 text-xs mt-2 transition-colors"
          >
            {mode === 'login' ? 'Sign In' : `Register as ${role === 'owner' ? 'Car Host' : 'Customer'}`}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-blue-600 font-bold hover:underline"
              >
                Register here
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-blue-600 font-bold hover:underline"
              >
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
