import { useState, useMemo } from 'react';
import { User, Vehicle, Booking } from '../../types';
import { db } from '../../services/db';
import { toast } from '../common/ToastContainer';
import {
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  PlusCircle,
  TrendingUp,
  AlertCircle,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

interface OwnerDashboardProps {
  currentUser: User;
  onNavigate: (view: string) => void;
  onOpenAddVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
}

export function OwnerDashboard({
  currentUser,
  onNavigate,
  onOpenAddVehicle,
  onEditVehicle,
}: OwnerDashboardProps) {
  const vehicles = db.getVehiclesByOwner(currentUser.id);
  const bookings = db.getBookingsByOwner(currentUser.id);

  // Filtered stats
  const availableVehicles = vehicles.filter((v) => v.status === 'available');
  const rentedVehicles = vehicles.filter((v) => v.status === 'rented');
  const pendingRequests = bookings.filter((b) => b.status === 'pending');
  const activeRentals = bookings.filter((b) => b.status === 'active' || b.status === 'confirmed');
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  // Total earnings calculation: completed trips + confirmed escrow minus platform 10%
  const totalGross = bookings
    .filter((b) => b.status === 'completed' || b.status === 'confirmed' || b.status === 'active')
    .reduce((acc, b) => acc + b.totalAmount, 0);
  const totalNetEarnings = Math.round(totalGross * 0.90); // 90% payout to owner

  const handleAcceptRequest = (bookingId: string) => {
    const res = db.updateBookingStatus(bookingId, 'confirmed');
    if (res.success) {
      toast.success('Booking request accepted! Customer has been notified.', 'Reservation Confirmed');
    }
  };

  const handleRejectRequest = (bookingId: string) => {
    const res = db.updateBookingStatus(bookingId, 'rejected', 'Host unavailable for these dates');
    if (res.success) {
      toast.info('Booking request was declined.', 'Request Rejected');
    }
  };

  const handleMarkVehicleReturned = (bookingId: string) => {
    const res = db.updateBookingStatus(bookingId, 'completed');
    if (res.success) {
      toast.success('Rental marked as completed! Payout has been released.', 'Trip Completed');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Banner with Welcome and CTA */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Host Operations Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Manage your fleet of vehicles, review incoming customer booking requests, and track your revenue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('owner-vehicles')}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            Manage Fleet
          </button>
          <button
            onClick={onOpenAddVehicle}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all"
            id="btn-owner-add-car"
          >
            <PlusCircle className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* 6 Metric Cards specified in requirements:
          - Total Vehicles
          - Available Vehicles
          - Currently Rented Vehicles
          - Pending Booking Requests
          - Active Rentals
          - Total Earnings */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Vehicles */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Fleet</span>
            <Car className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{vehicles.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Listed vehicles</p>
        </div>

        {/* 2. Available Vehicles */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{availableVehicles.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Ready to rent</p>
        </div>

        {/* 3. Currently Rented Vehicles */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rented Now</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{rentedVehicles.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">On the road</p>
        </div>

        {/* 4. Pending Booking Requests */}
        <div className={`rounded-2xl p-4 border shadow-xs transition-colors ${
          pendingRequests.length > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{pendingRequests.length}</div>
          <p className="text-[11px] text-amber-700 mt-1">Awaiting approval</p>
        </div>

        {/* 5. Active Rentals */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Bookings</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{activeRentals.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Confirmed & ongoing</p>
        </div>

        {/* 6. Total Earnings */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Net Earnings</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">${totalNetEarnings}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">90% host share</p>
        </div>
      </div>

      {/* Pending Booking Requests Section (Approval Workflow) */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-amber-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <h2 className="font-bold text-slate-900 text-base">
                Pending Booking Requests ({pendingRequests.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500">Requires Host Response</span>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req) => {
              const car = db.getVehicleById(req.vehicleId);
              const customer = db.getUserById(req.customerId);

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={car?.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'}
                      alt="car"
                      className="w-16 h-12 rounded-xl object-cover border border-amber-200"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {car?.make} {car?.model}
                      </h4>
                      <p className="text-xs text-slate-600">
                        Renter: <strong>{customer?.name || 'Customer'}</strong> • {req.duration.days}d {req.duration.hours}h trip
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(req.startDateTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })}
                        {' → '}
                        {new Date(req.endDateTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Payout Amount</span>
                      <p className="text-base font-black text-emerald-700">
                        ${Math.round(req.totalAmount * 0.9)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept Request
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fleet Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: My Listed Vehicles */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Your Fleet Inventory ({vehicles.length})</h2>
              <p className="text-xs text-slate-400">Manage pricing, status, and vehicle availability</p>
            </div>
            <button
              onClick={() => onNavigate('owner-vehicles')}
              className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl">
              <Car className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No vehicles listed yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Put your idle car to work. Add your first vehicle to start receiving bookings.
              </p>
              <button
                onClick={onOpenAddVehicle}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                List Your Car Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-200 bg-slate-50/50 hover:bg-white transition-all flex items-center gap-3"
                >
                  <img
                    src={v.images[0]}
                    alt={v.model}
                    className="w-20 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-blue-600">{v.make}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        v.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs truncate">{v.model}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">${v.pricePerDay}/day • {v.registrationNumber}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => onEditVehicle(v)}
                        className="text-[11px] text-blue-600 hover:underline font-semibold"
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active & Upcoming Trips */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Active Trips ({activeRentals.length})</h2>
              <p className="text-xs text-slate-400">Confirmed customer reservations</p>
            </div>
            <button
              onClick={() => onNavigate('owner-bookings')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              All Bookings
            </button>
          </div>

          {activeRentals.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-6 text-center">
              No active or upcoming reservations at the moment.
            </p>
          ) : (
            <div className="space-y-3">
              {activeRentals.map((b) => {
                const car = db.getVehicleById(b.vehicleId);
                const renter = db.getUserById(b.customerId);

                return (
                  <div key={b.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{car?.make} {car?.model}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {b.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Renter: <strong>{renter?.name || 'Customer'}</strong> ({renter?.phone || 'N/A'})
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Until {new Date(b.endDateTime).toLocaleDateString()}
                    </p>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-emerald-700">${Math.round(b.totalAmount * 0.9)} payout</span>
                      <button
                        onClick={() => handleMarkVehicleReturned(b.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-semibold"
                      >
                        Mark Returned
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
