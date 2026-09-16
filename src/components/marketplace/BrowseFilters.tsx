import { SearchFilterState } from '../../types';
import { Filter, RotateCcw, DollarSign, Users, Car, CheckCircle } from 'lucide-react';

interface BrowseFiltersProps {
  filters: SearchFilterState;
  onChange: (updates: Partial<SearchFilterState>) => void;
  onReset: () => void;
  totalMatches: number;
}

export function BrowseFilters({ filters, onChange, onReset, totalMatches }: BrowseFiltersProps) {
  const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Electric', 'Convertible'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h4 className="font-bold text-slate-900 text-sm">Refine Search</h4>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
            {totalMatches} found
          </span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4 text-xs">
        {/* Keyword Search */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Model or Keyword
          </label>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ searchQuery: e.target.value })}
            placeholder="e.g. Tesla, M3, Bronco..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vehicle Type */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Car className="w-3.5 h-3.5 text-blue-600" />
            Vehicle Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => onChange({ type: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Body Types</option>
            {vehicleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Max Daily Price */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Max Price / Day
            </label>
            <span className="font-bold text-slate-900">${filters.maxPrice}</span>
          </div>
          <input
            type="range"
            min="40"
            max="300"
            step="10"
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: Number(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>$40</span>
            <span>$150</span>
            <span>$300+</span>
          </div>
        </div>

        {/* Seating Capacity */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Seats
          </label>
          <div className="grid grid-cols-4 gap-1">
            {['any', 2, 5, 7].map((num) => {
              const isSelected = filters.seatingCapacity === num;
              return (
                <button
                  key={String(num)}
                  type="button"
                  onClick={() => onChange({ seatingCapacity: num as any })}
                  className={`py-1.5 text-center font-bold rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {num === 'any' ? 'Any' : `${num}+`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex flex-col justify-end">
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Instant Availability
          </label>
          <button
            type="button"
            onClick={() =>
              onChange({
                availability: filters.availability === 'available_only' ? 'all' : 'available_only',
              })
            }
            className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              filters.availability === 'available_only'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                filters.availability === 'available_only' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {filters.availability === 'available_only' ? 'Available Only' : 'Show All States'}
          </button>
        </div>
      </div>
    </div>
  );
}
