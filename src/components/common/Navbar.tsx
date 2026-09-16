import { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { auth } from '../../services/auth';
import { toast } from './ToastContainer';
import {
  Car,
  CalendarDays,
  PlusCircle,
  LayoutDashboard,
  DollarSign,
  ShieldCheck,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Compass,
  Menu,
  X,
  Bell
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAddVehicle: () => void;
  onOpenAuthModal: () => void;
  pendingRequestsCount?: number;
}

export function Navbar({
  currentUser,
  currentView,
  onNavigate,
  onOpenAddVehicle,
  onOpenAuthModal,
  pendingRequestsCount = 0,
}: NavbarProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleBadge = {
    customer: { label: 'Customer', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    owner: { label: 'Car Host', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    admin: { label: 'Platform Admin', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  }[currentUser?.role || 'customer'];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-[37px] z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 group text-left focus:outline-hidden"
              id="autogo-logo-btn"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Auto<span className="text-blue-600">GO</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  Peer-to-Peer Car Rental
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('browse')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  currentView === 'browse' || currentView === 'home'
                    ? 'text-blue-600 bg-blue-50/70 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                id="nav-browse-cars"
              >
                <Compass className="w-4 h-4" />
                Browse Cars
              </button>

              {/* Customer Navigation */}
              {currentUser?.role === 'customer' && (
                <>
                  <button
                    onClick={() => onNavigate('customer-dashboard')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      currentView === 'customer-dashboard'
                        ? 'text-blue-600 bg-blue-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    id="nav-customer-dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => onNavigate('customer-bookings')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      currentView === 'customer-bookings'
                        ? 'text-blue-600 bg-blue-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    id="nav-my-bookings"
                  >
                    <CalendarDays className="w-4 h-4" />
                    My Bookings
                  </button>
                </>
              )}

              {/* Owner Navigation */}
              {currentUser?.role === 'owner' && (
                <>
                  <button
                    onClick={() => onNavigate('owner-dashboard')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      currentView === 'owner-dashboard'
                        ? 'text-blue-600 bg-blue-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    id="nav-owner-dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => onNavigate('owner-vehicles')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      currentView === 'owner-vehicles'
                        ? 'text-blue-600 bg-blue-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    id="nav-my-vehicles"
                  >
                    <Car className="w-4 h-4" />
                    My Vehicles
                  </button>
                  <button
                    onClick={() => onNavigate('owner-bookings')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 relative ${
                      currentView === 'owner-bookings'
                        ? 'text-blue-600 bg-blue-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    id="nav-owner-bookings"
                  >
                    <CalendarDays className="w-4 h-4" />
                    Bookings
                    {pendingRequestsCount > 0 && (
                      <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onNavigate('owner-earnings')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      currentView === 'owner-earnings'
                        ? 'text-blue-600 bg-blue-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    id="nav-owner-earnings"
                  >
                    <DollarSign className="w-4 h-4" />
                    Earnings
                  </button>
                </>
              )}

              {/* Admin Navigation */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => onNavigate('admin-dashboard')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    currentView === 'admin-dashboard'
                      ? 'text-purple-600 bg-purple-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  id="nav-admin-dashboard"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Console
                </button>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Host Car CTA button if Owner */}
            {currentUser?.role === 'owner' && (
              <button
                onClick={onOpenAddVehicle}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md"
                id="btn-add-vehicle-nav"
              >
                <PlusCircle className="w-4 h-4" />
                Add Vehicle
              </button>
            )}

            {/* Quick Role Switch Indicator & User Menu */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                  id="user-profile-menu-btn"
                >
                  <img
                    src={currentUser.profileImage}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                  />
                  <div className="hidden sm:block text-left text-xs">
                    <p className="font-semibold text-slate-800 leading-tight">{currentUser.name}</p>
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleBadge.bg}`}>
                      {roleBadge.label}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${roleBadge.bg}`}>
                          {roleBadge.label}
                        </span>
                        <span className="text-[11px] text-slate-400">Rating: ★ {currentUser.rating || '5.0'}</span>
                      </div>
                    </div>

                    <div className="py-1 text-sm text-slate-700">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        My Profile & Verification
                      </button>

                      {currentUser.role === 'customer' && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onNavigate('customer-bookings');
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                        >
                          <CalendarDays className="w-4 h-4 text-slate-400" />
                          My Bookings & Receipts
                        </button>
                      )}

                      {currentUser.role === 'owner' && (
                        <>
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              onNavigate('owner-vehicles');
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Car className="w-4 h-4 text-slate-400" />
                            Manage Vehicle Inventory
                          </button>
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              onNavigate('owner-earnings');
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            Payouts & Earnings
                          </button>
                        </>
                      )}
                    </div>

                    {auth.isDemoMode() && (
                      <div className="border-t border-slate-100 pt-1">
                        <div className="px-4 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Switch Demo Persona
                        </div>
                        <button
                          onClick={async () => {
                            await auth.switchUser('user_alex_renter');
                            setProfileDropdownOpen(false);
                            toast.info('Switched to Alex Rivera (Customer / Renter)');
                          }}
                          className="w-full px-4 py-1.5 text-xs text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between"
                        >
                          <span>Alex Rivera</span>
                          <span className="text-[10px] text-blue-600 font-medium">Customer</span>
                        </button>
                        <button
                          onClick={async () => {
                            await auth.switchUser('user_marcus_owner');
                            setProfileDropdownOpen(false);
                            toast.info('Switched to Marcus Chen (Car Host)');
                          }}
                          className="w-full px-4 py-1.5 text-xs text-left hover:bg-emerald-50 text-slate-700 flex items-center justify-between"
                        >
                          <span>Marcus Chen</span>
                          <span className="text-[10px] text-emerald-600 font-medium">Car Host</span>
                        </button>
                        <button
                          onClick={async () => {
                            await auth.switchUser('user_admin');
                            setProfileDropdownOpen(false);
                            toast.info('Switched to AutoGO Admin');
                          }}
                          className="w-full px-4 py-1.5 text-xs text-left hover:bg-purple-50 text-slate-700 flex items-center justify-between"
                        >
                          <span>AutoGO Admin</span>
                          <span className="text-[10px] text-purple-600 font-medium">Platform Admin</span>
                        </button>
                      </div>
                    )}

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          auth.logout();
                          setProfileDropdownOpen(false);
                          toast.info('Signed out successfully.');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs"
                id="btn-login-nav"
              >
                Sign In / Register
              </button>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2">
          <button
            onClick={() => {
              onNavigate('browse');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Compass className="w-4 h-4" /> Browse Cars
          </button>

          {currentUser?.role === 'customer' && (
            <>
              <button
                onClick={() => {
                  onNavigate('customer-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" /> Customer Dashboard
              </button>
              <button
                onClick={() => {
                  onNavigate('customer-bookings');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" /> My Bookings
              </button>
            </>
          )}

          {currentUser?.role === 'owner' && (
            <>
              <button
                onClick={() => {
                  onNavigate('owner-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" /> Owner Dashboard
              </button>
              <button
                onClick={() => {
                  onNavigate('owner-vehicles');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <Car className="w-4 h-4" /> My Vehicles
              </button>
              <button
                onClick={() => {
                  onNavigate('owner-bookings');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" /> Booking Requests ({pendingRequestsCount})
              </button>
              <button
                onClick={() => {
                  onNavigate('owner-earnings');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" /> Earnings & Payouts
              </button>
              <button
                onClick={() => {
                  onOpenAddVehicle();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Add Vehicle
              </button>
            </>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                onNavigate('admin-dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Admin Console
            </button>
          )}

          <button
            onClick={() => {
              onNavigate('profile');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <UserIcon className="w-4 h-4" /> Profile
          </button>
        </div>
      )}
    </nav>
  );
}
