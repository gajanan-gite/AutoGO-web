import { User } from '../../types';
import { db } from '../../services/db';
import { DollarSign, TrendingUp, Calendar, CheckCircle2, ShieldCheck, ArrowDownToLine } from 'lucide-react';
import { toast } from '../common/ToastContainer';

interface OwnerEarningsViewProps {
  currentUser: User;
}

export function OwnerEarningsView({ currentUser }: OwnerEarningsViewProps) {
  const bookings = db.getBookingsByOwner(currentUser.id);
  const vehicles = db.getVehiclesByOwner(currentUser.id);

  const completed = bookings.filter((b) => b.status === 'completed');
  const activeAndConfirmed = bookings.filter((b) => b.status === 'confirmed' || b.status === 'active');

  const completedRevenue = completed.reduce((acc, b) => acc + b.totalAmount, 0);
  const netPaidOut = Math.round(completedRevenue * 0.90);

  const upcomingRevenue = activeAndConfirmed.reduce((acc, b) => acc + b.totalAmount, 0);
  const netEscrow = Math.round(upcomingRevenue * 0.90);

  const handleExportPayouts = () => {
    toast.success('Generated earnings statement report (CSV export simulated).');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Earnings & Payouts</h1>
          <p className="text-xs text-slate-500">
            Track gross rental volume, 90% net host distributions, and historical settlements.
          </p>
        </div>

        <button
          onClick={handleExportPayouts}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          Export Statement
        </button>
      </div>

      {/* Top 4 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Paid Out to Date</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">${netPaidOut}</div>
          <p className="text-[11px] text-slate-400 mt-1">{completed.length} completed rentals</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">Pending Escrow</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-600">${netEscrow}</div>
          <p className="text-[11px] text-slate-400 mt-1">{activeAndConfirmed.length} active/upcoming bookings</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Booking Volume</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">${completedRevenue + upcomingRevenue}</div>
          <p className="text-[11px] text-slate-400 mt-1">10% platform fee applies</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Fleet</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{vehicles.length} Cars</div>
          <p className="text-[11px] text-slate-400 mt-1">Generating revenue</p>
        </div>
      </div>

      {/* Payout Breakdown Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Transaction & Payout History</h3>

        {bookings.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-8 text-center">
            No booking transactions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Rental Duration</th>
                  <th className="py-3 px-4">Gross Amount</th>
                  <th className="py-3 px-4">Net Payout (90%)</th>
                  <th className="py-3 px-4">Payout Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => {
                  const car = db.getVehicleById(b.vehicleId);
                  const renter = db.getUserById(b.customerId);
                  const payout = Math.round(b.totalAmount * 0.90);

                  const statusMap = {
                    completed: { label: 'Paid Out', color: 'bg-emerald-100 text-emerald-800' },
                    confirmed: { label: 'Held in Escrow', color: 'bg-blue-100 text-blue-800' },
                    active: { label: 'Held in Escrow', color: 'bg-indigo-100 text-indigo-800' },
                    pending: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-800' },
                    cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600' },
                    rejected: { label: 'Declined', color: 'bg-rose-100 text-rose-800' },
                  }[b.status] || { label: b.status, color: 'bg-slate-100 text-slate-600' };

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{b.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {car ? `${car.make} ${car.model}` : 'Vehicle'}
                      </td>
                      <td className="py-3 px-4">{renter?.name || 'Customer'}</td>
                      <td className="py-3 px-4">
                        {b.duration.days}d {b.duration.hours}h
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">${b.totalAmount}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">${payout}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMap.color}`}>
                          {statusMap.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
