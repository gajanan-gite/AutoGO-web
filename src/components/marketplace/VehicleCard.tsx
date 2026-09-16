import { Vehicle, User } from '../../types';
import { db } from '../../services/db';
import { Users, MapPin, Star, ShieldCheck, Fuel, Gauge } from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  onViewDetails: (vehicleId: string) => void;
  currentUser: User | null;
  key?: string;
}

export function VehicleCard({ vehicle, onViewDetails, currentUser }: VehicleCardProps) {
  const owner = db.getUserById(vehicle.ownerId);
  const isOwnerOfCar = currentUser?.id === vehicle.ownerId;

  const statusConfig = {
    available: { label: 'Available', badgeClass: 'bg-emerald-500/90 text-white' },
    rented: { label: 'Currently Rented', badgeClass: 'bg-amber-500/90 text-white' },
    maintenance: { label: 'In Maintenance', badgeClass: 'bg-slate-600/90 text-white' },
    unlisted: { label: 'Unlisted', badgeClass: 'bg-rose-500/90 text-white' },
  }[vehicle.status] || { label: 'Available', badgeClass: 'bg-emerald-500/90 text-white' };

  return (
    <div
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
      id={`vehicle-card-${vehicle.id}`}
    >
      <div>
        {/* Card Image Cover */}
        <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
          <img
            src={vehicle.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80'}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs ${statusConfig.badgeClass}`}>
              {statusConfig.label}
            </span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-900/80 text-white backdrop-blur-md">
              {vehicle.type}
            </span>
          </div>

          {/* Owner Self Badge */}
          {isOwnerOfCar && (
            <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Your Vehicle
            </div>
          )}

          {/* Bottom rating pill */}
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-bold text-slate-900 shadow-xs flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>{vehicle.rating || '5.0'}</span>
            <span className="text-[10px] text-slate-400 font-normal">({vehicle.reviewCount || 0})</span>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {vehicle.make} • {vehicle.modelYear}
              </p>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {vehicle.model}
              </h3>
            </div>
          </div>

          {/* Location */}
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{vehicle.location}</span>
          </div>

          {/* Feature Specs Pills */}
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{vehicle.seatingCapacity} Seats</span>
            </div>
            {vehicle.fuelType && (
              <div className="flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[80px]">{vehicle.fuelType}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              <span>{vehicle.transmission || 'Automatic'}</span>
            </div>
          </div>

          {/* Host Info */}
          {owner && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-2">
              <img
                src={owner.profileImage}
                alt={owner.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="truncate">Hosted by <strong className="text-slate-700">{owner.name}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Pricing & CTA */}
      <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900">${vehicle.pricePerDay}</span>
            <span className="text-xs text-slate-500 font-medium">/ day</span>
          </div>
          <p className="text-[11px] text-slate-400">${vehicle.pricePerHour} / hour</p>
        </div>

        <button
          onClick={() => onViewDetails(vehicle.id)}
          className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
          id={`btn-view-details-${vehicle.id}`}
        >
          View Details
        </button>
      </div>
    </div>
  );
}
