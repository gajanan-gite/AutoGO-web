import { useState } from 'react';
import { User, Booking, BookingStatus } from '../../types';
import { db } from '../../services/db';
import { toast } from '../common/ToastContainer';
import {
  CalendarDays,
  Check,
  X,
  Clock,
  CheckCircle2,
  DollarSign,
  User as UserIcon,
  Car
} from 'lucide-react';

interface OwnerBookingsViewProps {
  currentUser: User;
}

export function OwnerBookingsView({ currentUser }: OwnerBookingsViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const bookings = db.getBookingsByOwner(currentUser.id);

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return b.status === 'pending';
    if (filter === 'active') return b.status === 'confirmed' || b.status === 'active';
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
    return true;
  });

  const handleUpdateStatus = (bookingId: string, status: BookingStatus, reason?: string) => {
    const res = db.updateBookingStatus(bookingId, status, reason);
    if (res.success) {
      if (status === 'confirmed') toast.success('Booking request confirmed! Dates reserved.', 'Confirmed');
      if (status === 'rejected') toast.info('Booking request declined.', 'Rejected');
      if (status === 'completed') toast.success('Trip marked completed! Earnings unlocked.', 'Completed');
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
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Booking Requests & Reservations</h1>
        <p className="text-xs text-slate-500">
          Review customer booking inquiries, approve schedules, and track vehicle turnover.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs max-w-fit text-xs">
        {[
          { id: 'all', label: `All (${bookings.length})` },
          { id: 'pending', label: 'Pending Requests' },
          { id: 'active', label: 'Confirmed & Active' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled / Declined' },
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
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are currently no reservations under this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const car = db.getVehicleById(b.vehicleId);
            const renter = db.getUserById(b.customerId);
            const hostPayout = Math.round(b.totalAmount * 0.90);

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Car & Customer Info */}
                <div className="flex items-start gap-4">
                  <img
                    src={car?.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'}
                    alt="car"
                    className="w-20 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {car?.make} {car?.model} ({car?.modelYear})
                      </h3>
                      {statusBadge(b.status)}
                      <span className="text-[10px] text-slate-400 font-mono">ID: {b.id}</span>
                    </div>

                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                      Renter: <strong>{renter?.name || 'Customer'}</strong> ({renter?.email})
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(b.startDateTime).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                        {' → '}
                        {new Date(b.endDateTime).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </span>
                      <span className="text-slate-400">({b.duration.days}d {b.duration.hours}h)</span>
                    </div>

                    {b.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg">
                        "{b.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Your Net Payout</span>
                    <p className="text-lg font-black text-emerald-700">${hostPayout}</p>
                    <span className="text-[10px] text-slate-400">Total Charged: ${b.totalAmount}</span>
                  </div>

                  {/* Action Buttons based on status */}
                  <div className="flex items-center gap-2">
                    {b.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(b.id, 'rejected')}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(b.id, 'confirmed')}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      </>
                    )}

                    {(b.status === 'confirmed' || b.status === 'active') && (
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'completed')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Returned & Complete
                      </button>
                    )}

                    {b.status === 'completed' && (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Paid Out
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
