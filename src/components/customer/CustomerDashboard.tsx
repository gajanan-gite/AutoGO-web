import { User } from '../../types';
import { db } from '../../services/db';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface CustomerDashboardProps {
  currentUser: User;
  onNavigate: (view: string) => void;
  onViewVehicle: (vehicleId: string) => void;
}

export function CustomerDashboard({
  currentUser,
  onNavigate,
  onViewVehicle,
}: CustomerDashboardProps) {
  const customerBookings = db.getBookingsByCustomer(currentUser.id);

  const activeOrUpcoming = customerBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'active' || b.status === 'pending'
  );
  const completed = customerBookings.filter((b) => b.status === 'completed');
  const totalSpent = customerBookings
    .filter((b) => b.status === 'completed' || b.status === 'confirmed' || b.status === 'active')
    .reduce((acc, b) => acc + b.totalAmount, 0);

  const currentTrip = activeOrUpcoming[0] || null;
  const currentTripVehicle = currentTrip ? db.getVehicleById(currentTrip.vehicleId) : null;
  const currentTripHost = currentTrip ? db.getUserById(currentTrip.ownerId) : null;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-blue-950/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Renter Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Hello, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Ready for your next adventure? Find top-rated peer-to-peer vehicles nearby with keyless access and full coverage.
          </p>
        </div>

        <button
          onClick={() => onNavigate('browse')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all active:scale-95"
          id="btn-customer-browse-cta"
        >
          <Compass className="w-4 h-4" />
          Browse Marketplace
        </button>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active & Upcoming</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{activeOrUpcoming.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled journeys</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Trips</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{completed.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Miles traveled</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invested</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">${totalSpent}</div>
          <p className="text-[11px] text-slate-400 mt-1">Car rental expenses</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Renter Score</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">★ {currentUser.rating || '4.9'}</div>
          <p className="text-[11px] text-slate-400 mt-1">Super renter badge</p>
        </div>
      </div>

      {/* Active Rental Spotlight */}
      {currentTrip && currentTripVehicle && (
        <div className="bg-white rounded-3xl p-6 border-2 border-blue-500/30 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="font-bold text-slate-900 text-base">Current / Upcoming Reservation</h2>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase">
              {currentTrip.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 aspect-16/10 rounded-2xl overflow-hidden bg-slate-100">
              <img
                src={currentTripVehicle.images[0]}
                alt="car"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:col-span-5 space-y-2">
              <span className="text-xs font-bold text-blue-600 uppercase">
                {currentTripVehicle.make} • {currentTripVehicle.modelYear}
              </span>
              <h3 className="text-xl font-bold text-slate-900">{currentTripVehicle.model}</h3>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Pickup: {currentTrip.pickupLocation || currentTripVehicle.location}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-700">
                <p>
                  <strong>Dates:</strong>{' '}
                  {new Date(currentTrip.startDateTime).toLocaleDateString()} at{' '}
                  {new Date(currentTrip.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                  →{' '}
                  {new Date(currentTrip.endDateTime).toLocaleDateString()} at{' '}
                  {new Date(currentTrip.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Duration: {currentTrip.duration.days} days, {currentTrip.duration.hours} hours
                </p>
              </div>
            </div>

            <div className="md:col-span-3 text-right space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Total Paid</span>
                <p className="text-2xl font-black text-slate-900">${currentTrip.totalAmount}</p>
                <p className="text-[11px] text-slate-400 font-mono">ID: {currentTrip.id}</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onViewVehicle(currentTripVehicle.id)}
                  className="w-full py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  View Car Details
                </button>
                <button
                  onClick={() => onNavigate('customer-bookings')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Manage Reservation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Booking History & Receipts</h2>
            <p className="text-xs text-slate-400">All your car rental reservations on AutoGO</p>
          </div>
          <button
            onClick={() => onNavigate('customer-bookings')}
            className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
          >
            <span>View All Bookings</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {customerBookings.length === 0 ? (
          <div className="text-center py-10">
            <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No reservations found yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Explore available cars and book your first trip in seconds.
            </p>
            <button
              onClick={() => onNavigate('browse')}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Browse Cars
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {customerBookings.slice(0, 4).map((b) => {
              const car = db.getVehicleById(b.vehicleId);
              return (
                <div key={b.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={car?.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'}
                      alt="car"
                      className="w-16 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        {car?.make} {car?.model}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {new Date(b.startDateTime).toLocaleDateString()} → {new Date(b.endDateTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-xs">${b.totalAmount}</span>
                    <span className={`block text-[10px] font-bold uppercase ${
                      b.status === 'confirmed' ? 'text-blue-600' :
                      b.status === 'completed' ? 'text-emerald-600' :
                      b.status === 'pending' ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
