import { useState } from 'react';
import { User, Vehicle, Booking, VehicleStatus, BookingStatus } from '../../types';
import { db } from '../../services/db';
import { toast } from '../common/ToastContainer';
import {
  ShieldCheck,
  Users,
  Car,
  CalendarDays,
  DollarSign,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  onViewVehicle: (vehicleId: string) => void;
}

export function AdminDashboard({ currentUser, onViewVehicle }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'bookings' | 'users'>('overview');

  const users = db.getUsers();
  const vehicles = db.getVehicles();
  const bookings = db.getBookings();

  const totalGrossRevenue = bookings
    .filter((b) => b.status === 'completed' || b.status === 'confirmed' || b.status === 'active')
    .reduce((acc, b) => acc + b.totalAmount, 0);
  const platformEarnings = Math.round(totalGrossRevenue * 0.10); // 10% platform commission

  const handleUpdateVehicleStatus = (vehicleId: string, status: VehicleStatus) => {
    const updated = db.updateVehicle(vehicleId, { status });
    if (updated) {
      toast.success(`Admin updated vehicle status to ${status.toUpperCase()}`);
    }
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (window.confirm('Admin Action: Permanently delete this vehicle from the platform?')) {
      db.deleteVehicle(vehicleId);
      toast.success('Vehicle deleted by administrator.');
    }
  };

  const handleUpdateBookingStatus = (bookingId: string, status: BookingStatus) => {
    const res = db.updateBookingStatus(bookingId, status);
    if (res.success) {
      toast.success(`Admin updated booking status to ${status.toUpperCase()}`);
    }
  };

  const handleToggleUserRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === 'owner' ? 'customer' : 'owner';
    const res = db.updateUser(userId, { role: newRole as any });
    if (res) {
      toast.success(`Updated ${res.name}'s role to ${newRole.toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-purple-900/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Platform Governance Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            AutoGO Super Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Audit platform marketplace operations, manage active vehicle listings, override reservation disputes, and govern user roles.
          </p>
        </div>

        <button
          onClick={() => {
            db.resetToDefault();
            toast.success('Platform reset to seed database.');
          }}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Marketplace Data
        </button>
      </div>

      {/* 4 Platform Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Platform Users</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{users.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Owners & Renters</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Vehicles</span>
            <Car className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{vehicles.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active inventory</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Bookings</span>
            <CalendarDays className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{bookings.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">All time trips</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase text-emerald-700">Platform Take (10%)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">${platformEarnings}</div>
          <p className="text-[11px] text-slate-400 mt-1">Net revenue earned</p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs max-w-fit text-xs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'vehicles', label: `Vehicles (${vehicles.length})` },
          { id: 'bookings', label: `Bookings (${bookings.length})` },
          { id: 'users', label: `Users (${users.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview or Tab Content */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">All Platform Vehicles</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Price / Day</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => {
                  const owner = db.getUserById(v.ownerId);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <img src={v.images[0]} alt="car" className="w-10 h-8 rounded-lg object-cover" />
                        <div>
                          <p>{v.make} {v.model}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{v.registrationNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{owner?.name || 'Owner'}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">${v.pricePerDay}</td>
                      <td className="py-3 px-4 truncate max-w-[150px]">{v.location}</td>
                      <td className="py-3 px-4">
                        <select
                          value={v.status}
                          onChange={(e) => handleUpdateVehicleStatus(v.id, e.target.value as VehicleStatus)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        >
                          <option value="available">Available</option>
                          <option value="rented">Rented</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="unlisted">Unlisted</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">All Platform Bookings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Host</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => {
                  const car = db.getVehicleById(b.vehicleId);
                  const customer = db.getUserById(b.customerId);
                  const host = db.getUserById(b.ownerId);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{b.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{car?.make} {car?.model}</td>
                      <td className="py-3 px-4">{customer?.name}</td>
                      <td className="py-3 px-4">{host?.name}</td>
                      <td className="py-3 px-4">
                        {new Date(b.startDateTime).toLocaleDateString()} → {new Date(b.endDateTime).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">${b.totalAmount}</td>
                      <td className="py-3 px-4">
                        <select
                          value={b.status}
                          onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value as BookingStatus)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-4">Platform User Directory</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Role Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <img src={u.profileImage} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-bold text-slate-900">{u.name}</span>
                    </td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4">{u.phone}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'owner' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserRole(u.id, u.role)}
                          className="text-[11px] text-blue-600 hover:underline font-semibold"
                        >
                          Switch to {u.role === 'owner' ? 'Customer' : 'Owner'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-base">Platform Architecture & Firebase Readiness</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AutoGO is structured with decoupled collections conforming to the Firestore schema specification:
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li><strong>/users</strong>: Customer, Host, and Administrator profiles with role verification.</li>
              <li><strong>/vehicles</strong>: Normalized vehicle assets referencing ownerId relationships.</li>
              <li><strong>/bookings</strong>: Reservation records containing status lifecycle, conflict checking, and financial accounting.</li>
              <li><strong>/reviews</strong>: Verified renter ratings and feedback.</li>
              <li><strong>/payments</strong>: 90/10 escrow breakdown with automated refund calculation on cancellation.</li>
            </ul>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-base">Enforced Business Rules</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Owner Self-Booking Prohibition</strong>: Hosts cannot rent their own vehicles under any circumstance.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Overlap Collision Engine</strong>: Interval intersection prevention across active, confirmed, and pending bookings.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Role-Based Access</strong>: Owners only modify their own inventory; customers can browse and reserve.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
