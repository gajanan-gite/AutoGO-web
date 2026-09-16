import { useState } from 'react';
import { User, Vehicle, VehicleStatus } from '../../types';
import { db } from '../../services/db';
import { toast } from '../common/ToastContainer';
import {
  Car,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  MapPin,
  Users,
  DollarSign
} from 'lucide-react';

interface MyVehiclesViewProps {
  currentUser: User;
  onOpenAddVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onViewVehicle: (vehicleId: string) => void;
}

export function MyVehiclesView({
  currentUser,
  onOpenAddVehicle,
  onEditVehicle,
  onViewVehicle,
}: MyVehiclesViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const vehicles = db.getVehiclesByOwner(currentUser.id);

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter === 'all') return true;
    return v.status === statusFilter;
  });

  const handleStatusChange = (vehicleId: string, newStatus: VehicleStatus) => {
    const updated = db.updateVehicle(vehicleId, { status: newStatus });
    if (updated) {
      toast.success(`Vehicle status updated to "${newStatus.toUpperCase()}".`);
    }
  };

  const handleConfirmDelete = () => {
    if (!vehicleToDelete) return;
    const res = db.deleteVehicle(vehicleToDelete.id);
    if (res) {
      toast.success(`Removed ${vehicleToDelete.make} ${vehicleToDelete.model} from your listings.`);
    } else {
      toast.error('Failed to remove vehicle.');
    }
    setVehicleToDelete(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Listed Vehicles</h1>
          <p className="text-xs text-slate-500">
            Manage your rental inventory, adjust daily/hourly rates, and monitor booking statuses.
          </p>
        </div>

        <button
          onClick={onOpenAddVehicle}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
          id="btn-add-vehicle-view"
        >
          <PlusCircle className="w-4 h-4" />
          Add Another Vehicle
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs max-w-fit text-xs">
        {[
          { id: 'all', label: `All Vehicles (${vehicles.length})` },
          { id: 'available', label: 'Available' },
          { id: 'rented', label: 'Rented' },
          { id: 'maintenance', label: 'Maintenance' },
          { id: 'unlisted', label: 'Unlisted' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
              statusFilter === tab.id
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vehicles Grid / Table */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No vehicles found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            You don't have any vehicles matching this filter.
          </p>
          <button
            onClick={onOpenAddVehicle}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
          >
            Add New Vehicle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((vehicle) => {
            const activeBookings = db.getBookingsByVehicle(vehicle.id).filter(
              (b) => b.status === 'confirmed' || b.status === 'active'
            );

            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-16/9 bg-slate-100">
                    <img
                      src={vehicle.images[0]}
                      alt={vehicle.model}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-md">
                        {vehicle.type}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/90 text-slate-800 backdrop-blur-md font-semibold">
                        {vehicle.registrationNumber}
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2">
                      <select
                        value={vehicle.status}
                        onChange={(e) => handleStatusChange(vehicle.id, e.target.value as VehicleStatus)}
                        className="bg-white/95 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-xl shadow-md border border-slate-200 cursor-pointer focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="available">● Available</option>
                        <option value="rented">● Rented</option>
                        <option value="maintenance">● Maintenance</option>
                        <option value="unlisted">● Unlist / Hide</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase">
                          {vehicle.make} • {vehicle.modelYear}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm">{vehicle.model}</h3>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-base">${vehicle.pricePerDay}</span>
                        <span className="text-[10px] text-slate-400 block">${vehicle.pricePerHour}/hr</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{vehicle.location}</span>
                    </div>

                    {/* Active reservations badge */}
                    {activeBookings.length > 0 && (
                      <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
                        <span>{activeBookings.length} Active / Upcoming Trip(s)</span>
                        <span className="font-bold text-blue-700">Scheduled</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onViewVehicle(vehicle.id)}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-blue-600 flex items-center gap-1 font-semibold"
                    title="View public listing"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditVehicle(vehicle)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 flex items-center gap-1 font-semibold transition-colors"
                      title="Edit vehicle details"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>

                    <button
                      onClick={() => setVehicleToDelete(vehicle)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete / Unlist vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">Unlist / Remove Vehicle?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{vehicleToDelete.make} {vehicleToDelete.model}</strong>? 
                It will no longer appear to renters in the AutoGO marketplace.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setVehicleToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
