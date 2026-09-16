import { useState, useEffect, useMemo } from 'react';
import { User, Vehicle, SearchFilterState } from './types';
import { auth } from './services/auth';
import { db } from './services/db';
import { Navbar } from './components/common/Navbar';
import { DemoGuideBanner } from './components/common/DemoGuideBanner';
import { ToastContainer } from './components/common/ToastContainer';
import { HeroSection } from './components/marketplace/HeroSection';
import { BrowseFilters } from './components/marketplace/BrowseFilters';
import { VehicleCard } from './components/marketplace/VehicleCard';
import { VehicleDetailsModal } from './components/marketplace/VehicleDetailsModal';
import { AddVehicleModal } from './components/owner/AddVehicleModal';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { MyVehiclesView } from './components/owner/MyVehiclesView';
import { OwnerBookingsView } from './components/owner/OwnerBookingsView';
import { OwnerEarningsView } from './components/owner/OwnerEarningsView';
import { CustomerDashboard } from './components/customer/CustomerDashboard';
import { MyBookingsView } from './components/customer/MyBookingsView';
import { CustomerProfileView } from './components/customer/CustomerProfileView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import {
  Car,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';

const INITIAL_FILTERS: SearchFilterState = {
  location: '',
  type: '',
  minPrice: 0,
  maxPrice: 350,
  seatingCapacity: 'any',
  availability: 'all',
  searchQuery: '',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.getCurrentUser());
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [autoConflictDates, setAutoConflictDates] = useState(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultMode, setAuthDefaultMode] = useState<'login' | 'register'>('login');
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);

  // Filter state for marketplace
  const [filters, setFilters] = useState<SearchFilterState>(INITIAL_FILTERS);

  // Database reactivity subscription
  const [, setDbVersion] = useState(0);

  useEffect(() => {
    const unsubAuth = auth.subscribe((user) => {
      setCurrentUser(user);
    });

    const unsubDb = db.subscribe(() => {
      setDbVersion((v) => v + 1);
    });

    return () => {
      unsubAuth();
      unsubDb();
    };
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthDefaultMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenAddVehicle = (vehicle?: Vehicle) => {
    setVehicleToEdit(vehicle || null);
    setIsAddVehicleModalOpen(true);
  };

  // Vehicles from database
  const allVehicles = db.getVehicles();

  // Pending count for owner
  const pendingRequestsCount = currentUser?.role === 'owner'
    ? db.getBookingsByOwner(currentUser.id).filter((b) => b.status === 'pending').length
    : 0;

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((car) => {
      // Must not be unlisted in public marketplace
      if (car.status === 'unlisted') return false;

      // Type filter
      if (filters.type && filters.type !== 'All' && car.type.toLowerCase() !== filters.type.toLowerCase()) {
        return false;
      }

      // Max price filter
      if (filters.maxPrice && car.pricePerDay > filters.maxPrice) {
        return false;
      }

      // Min price filter
      if (filters.minPrice && car.pricePerDay < filters.minPrice) {
        return false;
      }

      // Seating capacity
      if (filters.seatingCapacity !== 'any' && car.seatingCapacity < filters.seatingCapacity) {
        return false;
      }

      // Availability filter
      if (filters.availability === 'available_only' && car.status !== 'available') {
        return false;
      }

      // Search query (make, model, location)
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const full = `${car.make} ${car.model} ${car.location}`.toLowerCase();
        if (!full.includes(q)) return false;
      }

      // Location filter
      if (filters.location && filters.location.trim()) {
        const q = filters.location.toLowerCase();
        if (!car.location.toLowerCase().includes(q) && !car.make.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Date conflict check if dates specified
      if (filters.startDate && filters.endDate) {
        const conflict = db.checkBookingConflict(car.id, filters.startDate, filters.endDate);
        if (conflict.hasConflict) {
          return false;
        }
      }

      return true;
    });
  }, [allVehicles, filters]);

  const availableCarsCount = allVehicles.filter((v) => v.status === 'available').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Demo Guide Banner (Tests 4 core business flows) */}
      <DemoGuideBanner
        currentUser={currentUser}
        onOpenVehicleDetails={(vId, conflict) => {
          setSelectedVehicleId(vId);
          setAutoConflictDates(!!conflict);
        }}
        onNavigate={setCurrentView}
      />

      {/* Primary Navigation */}
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenAddVehicle={() => handleOpenAddVehicle()}
        onOpenAuthModal={() => handleOpenAuth('login')}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* Main Content Router */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW: HOME */}
        {currentView === 'home' && (
          <div className="space-y-12 animate-in fade-in">
            <HeroSection
              onSearch={(criteria) => {
                setFilters((prev) => ({
                  ...prev,
                  ...criteria,
                }));
                setCurrentView('browse');
              }}
              availableCount={availableCarsCount}
            />

            {/* Value Proposition Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Full Coverage & Roadside</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Every trip is protected with $1,000,000 in liability coverage and 24/7 complimentary nationwide roadside assistance.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Instant Keyless Booking</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Unlock vehicles directly from the AutoGO app. Skip the airport rental counters and tedious paperwork.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Conflict-Free Schedule</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Real-time interval collision prevention ensures cars can never be double-booked for overlapping hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Featured Vehicles Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Featured Vehicles Near You</h2>
                  <p className="text-xs text-slate-500">Hand-picked, highly rated cars ready for your weekend trip</p>
                </div>
                <button
                  onClick={() => setCurrentView('browse')}
                  className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span>Explore All ({allVehicles.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {allVehicles.slice(0, 4).map((car) => (
                  <VehicleCard
                    key={car.id}
                    vehicle={car}
                    currentUser={currentUser}
                    onViewDetails={(id) => setSelectedVehicleId(id)}
                  />
                ))}
              </div>
            </div>

            {/* Host Call-to-Action Banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 max-w-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Earn with your car
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Turn your idle vehicle into passive income
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  List your car on AutoGO and keep 90% of your rental earnings. You choose your rates, availability schedule, and accept or reject bookings with total control.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  onClick={() => {
                    if (currentUser?.role === 'owner') {
                      handleOpenAddVehicle();
                    } else {
                      auth.switchUser('user_marcus_owner');
                      setCurrentView('owner-dashboard');
                    }
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <Car className="w-4 h-4" />
                  <span>Start Hosting on AutoGO</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: BROWSE / MARKETPLACE */}
        {currentView === 'browse' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Browse All Vehicles</h1>
              <p className="text-xs text-slate-500">
                Showing {filteredVehicles.length} available vehicles ready for booking
              </p>
            </div>

            {/* Filter Bar */}
            <BrowseFilters
              filters={filters}
              onChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
              onReset={() => setFilters(INITIAL_FILTERS)}
              totalMatches={filteredVehicles.length}
            />

            {/* Vehicle Grid */}
            {filteredVehicles.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-3">
                <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-base">No vehicles match your search</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your price range, car type, or date filters to view more vehicles.
                </p>
                <button
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredVehicles.map((car) => (
                  <VehicleCard
                    key={car.id}
                    vehicle={car}
                    currentUser={currentUser}
                    onViewDetails={(id) => setSelectedVehicleId(id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: OWNER DASHBOARD */}
        {currentView === 'owner-dashboard' && (
          currentUser?.role === 'owner' ? (
            <OwnerDashboard
              currentUser={currentUser}
              onNavigate={setCurrentView}
              onOpenAddVehicle={() => handleOpenAddVehicle()}
              onEditVehicle={(vehicle) => handleOpenAddVehicle(vehicle)}
            />
          ) : (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3 max-w-md mx-auto">
              <Lock className="w-10 h-10 text-amber-500 mx-auto" />
              <h2 className="font-bold text-slate-900 text-base">Owner Access Required</h2>
              <p className="text-xs text-slate-500">
                You are currently signed in as a Customer. Switch to an Owner persona to view your host dashboard.
              </p>
              <button
                onClick={() => auth.switchUser('user_marcus_owner')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Switch to Marcus (Host)
              </button>
            </div>
          )
        )}

        {/* VIEW: OWNER VEHICLES */}
        {currentView === 'owner-vehicles' && (
          currentUser?.role === 'owner' ? (
            <MyVehiclesView
              currentUser={currentUser}
              onOpenAddVehicle={() => handleOpenAddVehicle()}
              onEditVehicle={(vehicle) => handleOpenAddVehicle(vehicle)}
              onViewVehicle={(id) => setSelectedVehicleId(id)}
            />
          ) : null
        )}

        {/* VIEW: OWNER BOOKINGS */}
        {currentView === 'owner-bookings' && (
          currentUser?.role === 'owner' ? (
            <OwnerBookingsView currentUser={currentUser} />
          ) : null
        )}

        {/* VIEW: OWNER EARNINGS */}
        {currentView === 'owner-earnings' && (
          currentUser?.role === 'owner' ? (
            <OwnerEarningsView currentUser={currentUser} />
          ) : null
        )}

        {/* VIEW: CUSTOMER DASHBOARD */}
        {currentView === 'customer-dashboard' && (
          currentUser ? (
            <CustomerDashboard
              currentUser={currentUser}
              onNavigate={setCurrentView}
              onViewVehicle={(id) => setSelectedVehicleId(id)}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-xs text-slate-500">Please sign in to view your customer dashboard.</p>
              <button onClick={() => handleOpenAuth('login')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
                Sign In
              </button>
            </div>
          )
        )}

        {/* VIEW: CUSTOMER BOOKINGS */}
        {currentView === 'customer-bookings' && (
          currentUser ? (
            <MyBookingsView
              currentUser={currentUser}
              onViewVehicle={(id) => setSelectedVehicleId(id)}
              onNavigate={setCurrentView}
            />
          ) : null
        )}

        {/* VIEW: CUSTOMER PROFILE */}
        {currentView === 'customer-profile' && (
          currentUser ? (
            <CustomerProfileView currentUser={currentUser} />
          ) : null
        )}

        {/* VIEW: ADMIN CONSOLE */}
        {currentView === 'admin-dashboard' && (
          currentUser?.role === 'admin' ? (
            <AdminDashboard
              currentUser={currentUser}
              onViewVehicle={(id) => setSelectedVehicleId(id)}
            />
          ) : (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3 max-w-md mx-auto">
              <Lock className="w-10 h-10 text-purple-600 mx-auto" />
              <h2 className="font-bold text-slate-900 text-base">Administrator Clearance Needed</h2>
              <p className="text-xs text-slate-500">
                You must be logged in as an Administrator to view platform analytics and governance tools.
              </p>
              <button
                onClick={() => auth.switchUser('user_admin')}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
              >
                Switch to Admin Account
              </button>
            </div>
          )
        )}
      </main>

      {/* Vehicle Details & Reservation Modal */}
      {selectedVehicleId && (
        <VehicleDetailsModal
          vehicleId={selectedVehicleId}
          currentUser={currentUser}
          onClose={() => {
            setSelectedVehicleId(null);
            setAutoConflictDates(false);
          }}
          onBookingSuccess={(bookingId) => {
            setSelectedVehicleId(null);
            setAutoConflictDates(false);
            if (currentUser?.role === 'owner') {
              setCurrentView('owner-dashboard');
            } else {
              setCurrentView('customer-bookings');
            }
          }}
          onNavigateToAuth={() => handleOpenAuth('login')}
          initialConflictDates={autoConflictDates}
        />
      )}

      {/* Add / Edit Vehicle Modal */}
      {isAddVehicleModalOpen && (
        <AddVehicleModal
          currentUser={currentUser}
          vehicleToEdit={vehicleToEdit}
          onClose={() => {
            setIsAddVehicleModalOpen(false);
            setVehicleToEdit(null);
          }}
          onSuccess={() => {
            setIsAddVehicleModalOpen(false);
            setVehicleToEdit(null);
            setCurrentView('owner-vehicles');
          }}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authDefaultMode}
      />

      {/* Global Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                A
              </div>
              <span className="font-black text-base tracking-tight text-slate-900">AutoGO</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The premier modern peer-to-peer car sharing marketplace connecting local vehicle hosts with renters worldwide.
            </p>
            <div className="flex items-center gap-2 text-slate-400 text-xs pt-1">
              <span>© {new Date().getFullYear()} AutoGO Technologies, Inc.</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Explore</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => setCurrentView('browse')} className="hover:text-blue-600 transition-colors">
                  Browse All Vehicles
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, type: 'Electric' }));
                    setCurrentView('browse');
                  }}
                  className="hover:text-blue-600 transition-colors"
                >
                  Electric Vehicles (EV)
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, type: 'SUV' }));
                    setCurrentView('browse');
                  }}
                  className="hover:text-blue-600 transition-colors"
                >
                  SUVs & 4x4 Off-Road
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, type: 'Luxury' }));
                    setCurrentView('browse');
                  }}
                  className="hover:text-blue-600 transition-colors"
                >
                  Luxury & Sports Cars
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Host Fleet</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    if (currentUser?.role === 'owner') {
                      handleOpenAddVehicle();
                    } else {
                      auth.switchUser('user_marcus_owner');
                      setCurrentView('owner-dashboard');
                    }
                  }}
                  className="hover:text-blue-600 transition-colors"
                >
                  List Your Vehicle
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    auth.switchUser('user_marcus_owner');
                    setCurrentView('owner-dashboard');
                  }}
                  className="hover:text-blue-600 transition-colors"
                >
                  Host Earnings Calculator
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    auth.switchUser('user_admin');
                    setCurrentView('admin-dashboard');
                  }}
                  className="hover:text-purple-600 transition-colors"
                >
                  Platform Governance Console
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Trust & Security</h4>
            <ul className="space-y-2 text-slate-500">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                $1,000,000 Liability Protection
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                24/7 Roadside Assistance
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                DMV Identity & License Checks
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Self-Booking Lockout & Conflict Guard
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
