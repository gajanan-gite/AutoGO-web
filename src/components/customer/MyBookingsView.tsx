import { useState } from 'react';
import { User, Booking, BookingStatus } from '../../types';
import { db } from '../../services/db';
import { toast } from '../common/ToastContainer';
import {
  CalendarDays,
  Clock,
  MapPin,
  XCircle,
  FileText,
  AlertTriangle,
  Car,
  CheckCircle2,
  X,
  Printer
} from 'lucide-react';

interface MyBookingsViewProps {
  currentUser: User;
  onViewVehicle: (vehicleId: string) => void;
  onNavigate: (view: string) => void;
}

export function MyBookingsView({ currentUser, onViewVehicle, onNavigate }: MyBookingsViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Change of travel plans');
  const [activeReceiptBooking, setActiveReceiptBooking] = useState<Booking | null>(null);

  const bookings = db.getBookingsByCustomer(currentUser.id);

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'active') return b.status === 'confirmed' || b.status === 'active';
    if (filter === 'pending') return b.status === 'pending';
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
    return true;
  });

  const handleConfirmCancel = () => {
    if (!bookingToCancel) return;
    const res = db.updateBookingStatus(bookingToCancel.id, 'cancelled', cancellationReason);
    if (res.success) {
      toast.success(
        `Reservation ${bookingToCancel.id} has been cancelled. Any eligible refund has been issued to your original payment method.`,
        'Booking Cancelled'
      );
      setBookingToCancel(null);
    } else {
      toast.error(res.error || 'Failed to cancel booking.');
    }
  };

  const statusBadge = (status: BookingStatus) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      active: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
      rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    }[status] || 'bg-slate-100 text-slate-700';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${map}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Rental Bookings</h1>
          <p className="text-xs text-slate-500">
            View your upcoming trips, download invoices, or manage scheduled car reservations.
          </p>
        </div>

        <button
          onClick={() => onNavigate('browse')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Car className="w-4 h-4" /> Book Another Car
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs max-w-fit text-xs">
        {[
          { id: 'all', label: `All (${bookings.length})` },
          { id: 'active', label: 'Confirmed & Upcoming' },
          { id: 'pending', label: 'Pending Approval' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
              filter === tab.id ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No bookings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            You don't have any reservations under this tab right now.
          </p>
          <button
            onClick={() => onNavigate('browse')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
          >
            Explore Vehicles
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const car = db.getVehicleById(b.vehicleId);
            const host = db.getUserById(b.ownerId);
            const isCancellable = b.status === 'confirmed' || b.status === 'pending';

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Vehicle & Reservation info */}
                <div className="flex items-start gap-4">
                  <img
                    src={car?.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'}
                    alt="car"
                    className="w-24 h-18 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {car ? `${car.make} ${car.model}` : 'Vehicle'}
                      </h3>
                      {statusBadge(b.status)}
                      <span className="text-[10px] text-slate-400 font-mono">ID: {b.id}</span>
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.pickupLocation || car?.location}</span>
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-700 pt-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {new Date(b.startDateTime).toLocaleDateString()} at{' '}
                        {new Date(b.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        → {new Date(b.endDateTime).toLocaleDateString()} at{' '}
                        {new Date(b.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-slate-400">({b.duration.days}d {b.duration.hours}h)</span>
                    </div>

                    {host && (
                      <p className="text-[11px] text-slate-400">
                        Hosted by <strong className="text-slate-700">{host.name}</strong> • Contact: {host.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing & Control buttons */}
                <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Paid</span>
                    <p className="text-xl font-black text-slate-900">${b.totalAmount}</p>
                    <span className="text-[10px] text-slate-400">Card ending in 4242</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Receipt */}
                    <button
                      onClick={() => setActiveReceiptBooking(b)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1"
                      title="View tax receipt"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Receipt
                    </button>

                    {/* View Car */}
                    {car && (
                      <button
                        onClick={() => onViewVehicle(car.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                      >
                        Car Details
                      </button>
                    )}

                    {/* Cancel Booking */}
                    {isCancellable && (
                      <button
                        onClick={() => setBookingToCancel(b)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1"
                        id={`btn-cancel-booking-${b.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">Cancel Reservation?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Booking <strong>{bookingToCancel.id}</strong> will be cancelled. 
                Under our standard 24h free cancellation policy, your full payment of 
                <strong> ${bookingToCancel.totalAmount}</strong> will be released.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for cancellation
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              >
                <option value="Change of travel plans">Change of travel plans</option>
                <option value="Found alternative transportation">Found alternative transportation</option>
                <option value="Flight delay or cancellation">Flight delay or cancellation</option>
                <option value="Personal emergency">Personal emergency</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBookingToCancel(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                id="btn-confirm-cancel-final"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {activeReceiptBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">AutoGO Official Receipt</h3>
              </div>
              <button
                onClick={() => setActiveReceiptBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <div className="flex justify-between">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-slate-800">INV-{activeReceiptBooking.id.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction Date:</span>
                <span>{new Date(activeReceiptBooking.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Renter:</span>
                <span className="font-semibold text-slate-900">{currentUser.name}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span>Vehicle Rental Duration ({activeReceiptBooking.duration.days}d {activeReceiptBooking.duration.hours}h)</span>
                  <span className="font-semibold">${Math.round(activeReceiptBooking.totalAmount * 0.82)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>AutoGO Platform & Service Fee</span>
                  <span>${Math.round(activeReceiptBooking.totalAmount * 0.08)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Trip Protection & Liability Insurance</span>
                  <span>${Math.round(activeReceiptBooking.totalAmount * 0.10)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>Total Paid</span>
                  <span className="text-blue-600 font-black">${activeReceiptBooking.totalAmount}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                Payment processed via {activeReceiptBooking.paymentMethod || 'Credit Card'}. 
                All transactions are encrypted with 256-bit SSL technology.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  toast.success('Receipt sent to your email.');
                  setActiveReceiptBooking(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Email Copy
              </button>
              <button
                onClick={() => setActiveReceiptBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
