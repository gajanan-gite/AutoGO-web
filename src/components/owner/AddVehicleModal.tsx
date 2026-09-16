import { useState, useEffect, FormEvent } from 'react';
import { Vehicle, VehicleType, VehicleStatus, User } from '../../types';
import { db } from '../../services/db';
import { toast } from '../common/ToastContainer';
import { X, Plus, Image as ImageIcon, Sparkles, Check, Car, DollarSign } from 'lucide-react';

interface AddVehicleModalProps {
  currentUser: User | null;
  onClose: () => void;
  onSuccess: (vehicle: Vehicle) => void;
  vehicleToEdit?: Vehicle | null;
}

const PRESET_PHOTO_COLLECTIONS: { name: string; type: VehicleType; photos: string[] }[] = [
  {
    name: 'Modern Luxury Sedan (Audi / Mercedes)',
    type: 'Luxury',
    photos: [
      'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&auto=format&fit=crop&q=80',
    ],
  },
  {
    name: 'Electric SUV / Crossover',
    type: 'Electric',
    photos: [
      'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&auto=format&fit=crop&q=80',
    ],
  },
  {
    name: 'Adventure Offroad 4x4',
    type: 'SUV',
    photos: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1200&auto=format&fit=crop&q=80',
    ],
  },
  {
    name: 'Sleek Sports Convertible',
    type: 'Convertible',
    photos: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200&auto=format&fit=crop&q=80',
    ],
  },
];

export function AddVehicleModal({
  currentUser,
  onClose,
  onSuccess,
  vehicleToEdit,
}: AddVehicleModalProps) {
  const [make, setMake] = useState(vehicleToEdit?.make || '');
  const [model, setModel] = useState(vehicleToEdit?.model || '');
  const [type, setType] = useState<VehicleType>(vehicleToEdit?.type || 'Sedan');
  const [registrationNumber, setRegistrationNumber] = useState(vehicleToEdit?.registrationNumber || '');
  const [colour, setColour] = useState(vehicleToEdit?.colour || 'Metallic Silver');
  const [seatingCapacity, setSeatingCapacity] = useState(vehicleToEdit?.seatingCapacity || 5);
  const [modelYear, setModelYear] = useState(vehicleToEdit?.modelYear || 2024);
  const [description, setDescription] = useState(vehicleToEdit?.description || '');
  const [pricePerHour, setPricePerHour] = useState(vehicleToEdit?.pricePerHour || 15);
  const [pricePerDay, setPricePerDay] = useState(vehicleToEdit?.pricePerDay || 95);
  const [location, setLocation] = useState(vehicleToEdit?.location || 'San Francisco, CA (Downtown)');
  const [status, setStatus] = useState<VehicleStatus>(vehicleToEdit?.status || 'available');
  const [fuelType, setFuelType] = useState(vehicleToEdit?.fuelType || 'Gasoline');
  const [transmission, setTransmission] = useState<'Automatic' | 'Manual'>(vehicleToEdit?.transmission || 'Automatic');
  const [images, setImages] = useState<string[]>(
    vehicleToEdit?.images || [
      'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&auto=format&fit=crop&q=80',
    ]
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Dynamic price suggestion: when pricePerDay changes, calculate approximate hourly
    if (!vehicleToEdit && pricePerDay > 0) {
      setPricePerHour(Math.round(pricePerDay / 7));
    }
  }, [pricePerDay, vehicleToEdit]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!make.trim()) errs.make = 'Make is required';
    if (!model.trim()) errs.model = 'Model is required';
    if (!registrationNumber.trim()) errs.registrationNumber = 'Registration license number is required';
    if (!location.trim()) errs.location = 'Location is required';
    if (!description.trim() || description.length < 15) {
      errs.description = 'Please provide a descriptive overview (at least 15 characters)';
    }
    if (pricePerDay <= 0) errs.pricePerDay = 'Daily price must be greater than $0';
    if (pricePerHour <= 0) errs.pricePerHour = 'Hourly price must be greater than $0';
    if (images.length === 0) errs.images = 'At least one photo is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (presetPhotos: string[], presetType: VehicleType) => {
    setImages([...presetPhotos]);
    setType(presetType);
    toast.info('Applied preset showcase photos.');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('You must be logged in as an owner.');
      return;
    }

    if (!validate()) {
      toast.error('Please fix the highlighted form errors.');
      return;
    }

    if (vehicleToEdit) {
      const updated = db.updateVehicle(vehicleToEdit.id, {
        make,
        model,
        type,
        registrationNumber,
        colour,
        seatingCapacity: Number(seatingCapacity),
        modelYear: Number(modelYear),
        description,
        pricePerHour: Number(pricePerHour),
        pricePerDay: Number(pricePerDay),
        location,
        status,
        fuelType,
        transmission,
        images,
      });

      if (updated) {
        toast.success(`Updated ${updated.make} ${updated.model} successfully.`);
        onSuccess(updated);
        onClose();
      }
    } else {
      const newVehicle: Vehicle = {
        id: `car_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ownerId: currentUser.id,
        make,
        model,
        type,
        registrationNumber,
        colour,
        seatingCapacity: Number(seatingCapacity),
        modelYear: Number(modelYear),
        description,
        pricePerHour: Number(pricePerHour),
        pricePerDay: Number(pricePerDay),
        location,
        images,
        status,
        createdAt: new Date().toISOString(),
        features: ['GPS Navigation', 'Bluetooth', 'Backup Camera', 'Apple CarPlay'],
        rating: 5.0,
        reviewCount: 0,
        fuelType,
        transmission,
      };

      const created = db.addVehicle(newVehicle);
      toast.success(
        `Added ${created.make} ${created.model}! It is now live in the marketplace.`,
        'Vehicle Listed Successfully'
      );
      onSuccess(created);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative my-auto flex flex-col max-h-[92vh]"
        id="add-vehicle-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                {vehicleToEdit ? 'Edit Vehicle Information' : 'Add New Vehicle to Marketplace'}
              </h2>
              <p className="text-xs text-slate-400">
                List your vehicle on AutoGO and start earning rental income
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            id="btn-close-add-vehicle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Section: Basic Vehicle Identification */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Vehicle Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Make / Brand *</label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="e.g. Audi, BMW, Tesla, Toyota"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                {errors.make && <p className="text-rose-500 text-[11px] mt-0.5">{errors.make}</p>}
              </div>

              <div>
                <label className="block font-semibold mb-1">Model & Trim *</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. A4 Quattro, Model Y, RAV4"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                {errors.model && <p className="text-rose-500 text-[11px] mt-0.5">{errors.model}</p>}
              </div>

              <div>
                <label className="block font-semibold mb-1">Body Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as VehicleType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Electric">Electric</option>
                  <option value="Convertible">Convertible</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Registration / Plate # *</label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 7XYZ890"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                {errors.registrationNumber && (
                  <p className="text-rose-500 text-[11px] mt-0.5">{errors.registrationNumber}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">Model Year</label>
                <input
                  type="number"
                  min="2010"
                  max="2027"
                  value={modelYear}
                  onChange={(e) => setModelYear(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Exterior Colour</label>
                <input
                  type="text"
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                  placeholder="e.g. Alpine White, Midnight Black"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section: Specifications */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              2. Specifications & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Seating Capacity</label>
                <select
                  value={seatingCapacity}
                  onChange={(e) => setSeatingCapacity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value={2}>2 Passengers</option>
                  <option value={4}>4 Passengers</option>
                  <option value={5}>5 Passengers</option>
                  <option value={7}>7 Passengers</option>
                  <option value={8}>8 Passengers</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Fuel / Energy</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="Electric">Electric (EV)</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Gasoline">Gasoline</option>
                  <option value="Premium Gasoline">Premium Gasoline</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Transmission</label>
                <select
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Availability Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50/50"
                >
                  <option value="available">Available for Rent</option>
                  <option value="rented">Currently Rented</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="unlisted">Unlisted / Hidden</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block font-semibold mb-1">Pickup & Dropoff Location *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA (SOMA / Downtown)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                {errors.location && <p className="text-rose-500 text-[11px] mt-0.5">{errors.location}</p>}
              </div>
            </div>
          </div>

          {/* Section: Pricing */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              3. Rental Pricing Structure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block font-semibold mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Daily Rental Rate (USD) *
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Recommended market average: $65–$160 / day</p>
                {errors.pricePerDay && (
                  <p className="text-rose-500 text-[11px] mt-0.5">{errors.pricePerDay}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  Hourly Rental Rate (USD) *
                </label>
                <input
                  type="number"
                  min="2"
                  max="200"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Used for short duration trips under 24 hours</p>
                {errors.pricePerHour && (
                  <p className="text-rose-500 text-[11px] mt-0.5">{errors.pricePerHour}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              4. Vehicle Story & Description *
            </h3>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes your car special, included accessories, toll transponder rules, cleanliness standards, etc."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="text-rose-500 text-[11px] mt-0.5">{errors.description}</p>
            )}
          </div>

          {/* Section: Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                5. Vehicle Photo Gallery ({images.length}) *
              </h3>
              <span className="text-[11px] text-slate-400">High resolution photos increase bookings by 3x</span>
            </div>

            {/* Photo preset shortcuts */}
            <div className="mb-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-wrap items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] font-semibold text-blue-900">Quick Photo Presets:</span>
              {PRESET_PHOTO_COLLECTIONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset.photos, preset.type)}
                  className="px-2 py-1 bg-white hover:bg-blue-100/70 text-slate-700 rounded-md text-[10px] font-medium border border-blue-200 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Photo preview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={img} alt="car preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                      Cover Photo
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom URL */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste additional image URL (e.g. from Unsplash or image host)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Image
              </button>
            </div>
            {errors.images && <p className="text-rose-500 text-[11px] mt-1">{errors.images}</p>}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
              id="btn-submit-vehicle"
            >
              <Check className="w-4 h-4" />
              <span>{vehicleToEdit ? 'Save Vehicle Changes' : 'Publish Vehicle to AutoGO'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
