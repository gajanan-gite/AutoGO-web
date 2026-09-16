import { useState, useMemo } from 'react';
import { Vehicle, User, Booking } from '../../types';
import { db } from '../../services/db';
import { calculateRentalPrice } from '../../services/pricingService';
import { toast } from '../common/ToastContainer';
import {
  loadRazorpayScript,
  createRazorpayBookingOrder,
  openRazorpayCheckout,
  verifyRazorpayPayment,
  cancelRazorpayOrder,
  failRazorpayOrder,
} from '../../services/razorpay';
import {
  X,
  Star,
  MapPin,
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Car,
  Fuel,
  Gauge,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  CreditCard
} from 'lucide-react';

interface VehicleDetailsModalProps {
  vehicleId: string;
  currentUser: User | null;
  onClose: () => void;
  onBookingSuccess: (bookingId: string) => void;
  onNavigateToAuth: () => void;
  initialConflictDates?: boolean;
}

export function VehicleDetailsModal({
  vehicleId,
  currentUser,
  onClose,
  onBookingSuccess,
  onNavigateToAuth,
  initialConflictDates = false,
}: VehicleDetailsModalProps) {
  const vehicle = db.getVehicleById(vehicleId);
  const owner = vehicle ? db.getUserById(vehicle.ownerId) : null;
  const reviews = vehicle ? db.getReviewsByVehicle(vehicleId) : [];
  const existingBookings = vehicle ? db.getBookingsByVehicle(vehicleId) : [];

  // Active bookings that block the calendar
  const activeBookings = useMemo(() => {
    return existingBookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'active' || b.status === 'pending'
    );
  }, [existingBookings]);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Date selection state
  // Default dates: if initialConflictDates is true (Flow 4 test), set Sep 20 - Sep 22
  const [startDate, setStartDate] = useState(initialConflictDates ? '2026-09-20' : '2026-09-24');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState(initialConflictDates ? '2026-09-22' : '2026-09-26');
  const [endTime, setEndTime] = useState('10:00');
  const [tripNotes, setTripNotes] = useState('');

  // Confirmation modal step
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!vehicle) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="text-slate-800 font-bold mb-4">Vehicle not found or has been removed.</p>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Combined start and end ISO strings
  const startISO = `${startDate}T${startTime}:00.000Z`;
  const endISO = `${endDate}T${endTime}:00.000Z`;

  // Dynamic price calculation
  const priceResult = calculateRentalPrice(vehicle, startISO, endISO);

  // Real-time conflict check
  const conflictResult = db.checkBookingConflict(vehicle.id, startISO, endISO);

  // Role & Business Rule validations
  const isOwnerOfCar = currentUser?.id === vehicle.ownerId;
  const isAvailable = vehicle.status === 'available';

  const handleOpenConfirm = () => {
    if (!currentUser) {
      toast.info('Please sign in or choose a demo persona to book this vehicle.');
      onNavigateToAuth();
      return;
    }

    // Business Rule 1: Car owner cannot rent their own vehicle
    if (isOwnerOfCar) {
      toast.error(
        'Ownership Violation: You are the registered owner of this vehicle. Hosts are strictly forbidden from renting their own vehicles.',
        'Booking Rejected'
      );
      return;
    }

    // Business Rule 2: Vehicle availability
    if (!isAvailable) {
      toast.error(`This vehicle is currently ${vehicle.status} and cannot accept new bookings.`, 'Unavailable');
      return;
    }

    // Business Rule 3: Overlapping dates conflict
    if (conflictResult.hasConflict) {
      toast.error(conflictResult.message || 'Selected dates conflict with an existing reservation.', 'Scheduling Conflict');
      return;
    }

    if (!priceResult.valid || !priceResult.estimate) {
      toast.error(priceResult.error || 'Please choose valid rental dates.', 'Invalid Dates');
      return;
    }

    setIsConfirming(true);
  };

  const handleFinalConfirmBooking = async () => {
    if (!currentUser || !priceResult.estimate) return;

    setIsSubmitting(true);

    try {
      // 1. Ensure Razorpay Checkout script is loaded
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      // 2. Request backend to validate and create authoritative Razorpay Test Mode order
      toast.info('Validating booking and initializing Razorpay Test Mode checkout...');
      const orderData = await createRazorpayBookingOrder({
        customerId: currentUser.id,
        vehicleId: vehicle.id,
        startDateTime: startISO,
        endDateTime: endISO,
        notes: tripNotes || 'Personal vacation & travel trip.',
        pickupLocation: vehicle.location,
        currency: 'USD',
      });

      // 3. Open official Razorpay Checkout popup
      openRazorpayCheckout(orderData, {
        onSuccess: async (rzpResponse) => {
          try {
            setIsSubmitting(true);
            toast.info('Verifying payment signature with server...');

            // 4. Send signature to server for HMAC SHA-256 verification and PostgreSQL transaction
            const verifyResult = await verifyRazorpayPayment({
              bookingId: orderData.bookingId,
              razorpayOrderId: rzpResponse.razorpay_order_id,
              razorpayPaymentId: rzpResponse.razorpay_payment_id,
              razorpaySignature: rzpResponse.razorpay_signature,
              paymentMethod: 'Razorpay Test Mode',
            });

            if (verifyResult.success && verifyResult.booking) {
              // Sync local client database state so UI immediately reflects updated booking
              await db.syncWithBackend();

              toast.success(
                `Payment verified! Booked ${vehicle.make} ${vehicle.model} for $${verifyResult.booking.totalAmount}.`,
                'Booking Confirmed!'
              );
              setIsConfirming(false);
              onClose();
              onBookingSuccess(verifyResult.booking.id);
            } else {
              toast.error(verifyResult.error || 'Payment verification failed.', 'Verification Error');
            }
          } catch (verifyErr: any) {
            console.error('Verification error:', verifyErr);
            toast.error(verifyErr.message || 'Failed to verify payment with server.');
          } finally {
            setIsSubmitting(false);
          }
        },
        onDismiss: async () => {
          setIsSubmitting(false);
          await cancelRazorpayOrder(orderData.bookingId, 'Customer dismissed Razorpay checkout window');
          toast.info('Checkout cancelled. No charges were made.');
        },
        onFailure: async (failError) => {
          setIsSubmitting(false);
          await failRazorpayOrder(
            orderData.bookingId,
            failError.description || 'Payment declined in test mode',
            failError.code
          );
          toast.error(
            `Payment declined: ${failError.description || 'Transaction unsuccessful'}. Please try again.`,
            'Payment Failed'
          );
        },
      });
    } catch (err: any) {
      console.error('Order creation error:', err);
      toast.error(err.message || 'Failed to start Razorpay checkout.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative my-auto flex flex-col max-h-[92vh]"
        id="vehicle-details-modal"
      >
        {/* Modal Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {vehicle.type}
            </span>
            <span className="text-xs text-slate-400 font-mono">Reg: {vehicle.registrationNumber}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
            id="btn-close-vehicle-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto p-4 sm:p-8 space-y-8">
          {/* Top Gallery & Quick Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gallery Column */}
            <div className="lg:col-span-7 space-y-3">
              <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner">
                <img
                  src={vehicle.images[activeImageIndex] || vehicle.images[0]}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover transition-all duration-300"
                />
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white font-medium">
                  Photo {activeImageIndex + 1} of {vehicle.images.length}
                </div>
              </div>

              {/* Thumbnails */}
              {vehicle.images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {vehicle.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activeImageIndex === idx ? 'border-blue-600 scale-95 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Summary Column */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                    {vehicle.make} • {vehicle.modelYear}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{vehicle.rating || '5.0'}</span>
                    <span className="text-slate-400 font-normal">({vehicle.reviewCount || 0} reviews)</span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {vehicle.model}
                </h1>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{vehicle.location}</span>
                </div>

                {/* Key specs row */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Seats</span>
                    <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-blue-600" /> {vehicle.seatingCapacity}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Fuel / Energy</span>
                    <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <Fuel className="w-3 h-3 text-blue-600" /> {vehicle.fuelType || 'Gas'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Transmission</span>
                    <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                      <Gauge className="w-3 h-3 text-blue-600" /> {vehicle.transmission || 'Auto'}
                    </p>
                  </div>
                </div>

                {/* Pricing Box */}
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-700 uppercase">Daily Rate</span>
                    <p className="text-2xl font-black text-slate-900">${vehicle.pricePerDay} <span className="text-xs text-slate-500 font-normal">/ day</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Hourly Rate</span>
                    <p className="text-lg font-bold text-slate-700">${vehicle.pricePerHour} <span className="text-xs text-slate-400 font-normal">/ hr</span></p>
                  </div>
                </div>
              </div>

              {/* Host Card */}
              {owner && (
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center gap-3 shadow-xs">
                  <img
                    src={owner.profileImage}
                    alt={owner.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900 text-sm truncate">{owner.name}</p>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded-sm">Verified Host</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{owner.bio || 'Top-rated host on AutoGO'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">★ 4.95 Rating • {owner.totalTrips || 24} trips hosted</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Critical Warnings / Banners */}
          {/* FLOW 3: OWNER CANNOT BOOK THEIR OWN VEHICLE */}
          {isOwnerOfCar && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Owner Self-Booking Guard Active</h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  You are registered as the host and legal owner of this vehicle. Under AutoGO platform policy, 
                  <strong> car hosts cannot create rental bookings for their own vehicles</strong>. To test customer bookings, 
                  please switch to a customer account (e.g. Alex Rivera) using the demo bar above.
                </p>
              </div>
            </div>
          )}

          {/* FLOW 4: CONFLICTING DATES BANNER */}
          {conflictResult.hasConflict && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Reservation Schedule Conflict</h4>
                <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                  {conflictResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Booking Date Selection & Dynamic Calculator */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-600" />
              Select Rental Schedule & Calculate Price
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Time */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Pickup Date & Time
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="col-span-3 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    id="book-start-date"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                    id="book-start-time"
                  />
                </div>
              </div>

              {/* Return Time */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Return Date & Time
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="col-span-3 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    id="book-end-date"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                    id="book-end-time"
                  />
                </div>
              </div>
            </div>

            {/* Price Estimation Breakdown Box */}
            {priceResult.valid && priceResult.estimate && (
              <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Live Price Calculation Breakdown
                </h4>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>
                      Duration: <strong>{priceResult.estimate.days} days, {priceResult.estimate.hours} hours</strong> ({priceResult.estimate.totalHours} hrs total)
                    </span>
                    <span className="font-semibold text-slate-900">${priceResult.estimate.baseRate}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Platform Service & Technology Fee (10%)</span>
                    <span>${priceResult.estimate.serviceFee}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Standard AutoGO Trip Protection ($12/day)</span>
                    <span>${priceResult.estimate.insuranceFee}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
                    <span>Estimated Total</span>
                    <span className="text-lg text-blue-600 font-black">${priceResult.estimate.totalAmount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Reserved Intervals for this Car (Visual Calendar Schedule) */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Live Vehicle Schedule & Booked Intervals ({activeBookings.length})
              </span>
              {activeBookings.length === 0 ? (
                <p className="text-xs text-slate-500 mt-1">Vehicle currently has full open availability on all dates.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {activeBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>
                          <strong>Booked:</strong>{' '}
                          {new Date(b.startDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })}{' '}
                          →{' '}
                          {new Date(b.endDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })}
                        </span>
                      </div>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Description and Features */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                Vehicle Description
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {vehicle.description}
              </p>
            </div>

            {/* Features */}
            {vehicle.features && vehicle.features.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Features & Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {vehicle.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Reviews Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Customer Ratings & Reviews</span>
              <span className="text-xs font-normal text-slate-500">{reviews.length} total reviews</span>
            </h3>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl">
                No reviews yet for this vehicle. Be the first to rent and leave a review!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={rev.customerImage}
                          alt={rev.customerName}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-slate-800">{rev.customerName}</span>
                      </div>
                      <div className="flex items-center text-amber-500 text-xs">
                        {'★'.repeat(rev.rating)}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-snug">{rev.comment}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-xs text-slate-500 font-medium">Estimated Rental Cost</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">
                ${priceResult.estimate?.totalAmount || vehicle.pricePerDay}
              </span>
              <span className="text-xs text-slate-500">
                ({priceResult.estimate?.days || 1} days, {priceResult.estimate?.hours || 0} hrs)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              Back to Browse
            </button>

            {/* Book Now Button */}
            <button
              onClick={handleOpenConfirm}
              disabled={isOwnerOfCar || conflictResult.hasConflict || !isAvailable}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all ${
                isOwnerOfCar || conflictResult.hasConflict || !isAvailable
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 active:scale-95'
              }`}
              id="btn-book-now"
            >
              {isOwnerOfCar ? (
                'You Own This Vehicle'
              ) : conflictResult.hasConflict ? (
                'Dates Conflicting'
              ) : !isAvailable ? (
                'Vehicle Unavailable'
              ) : (
                <>
                  <span>Book Now</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Step Dialog */}
      {isConfirming && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Review & Confirm Booking</h3>
              </div>
              <button
                onClick={() => setIsConfirming(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Details */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                <img
                  src={vehicle.images[0]}
                  alt="car"
                  className="w-16 h-12 rounded-lg object-cover"
                />
                <div>
                  <h4 className="font-bold text-slate-900">{vehicle.make} {vehicle.model} ({vehicle.modelYear})</h4>
                  <p className="text-slate-500 text-[11px]">{vehicle.location}</p>
                  <p className="text-slate-400 text-[10px]">Host: {owner?.name || 'Verified Host'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Pickup Time</span>
                  <p className="font-bold text-slate-800">
                    {new Date(startISO).toLocaleDateString()} at {startTime}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Return Time</span>
                  <p className="font-bold text-slate-800">
                    {new Date(endISO).toLocaleDateString()} at {endTime}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Trip Note for Host (optional):
                </label>
                <input
                  type="text"
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="e.g. Flight arrival time, luggage count..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Base Vehicle Rental</span>
                  <span className="font-semibold">${priceResult.estimate?.baseRate}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>AutoGO Service Fee</span>
                  <span>${priceResult.estimate?.serviceFee}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Full Liability & Damage Waiver</span>
                  <span>${priceResult.estimate?.insuranceFee}</span>
                </div>
                <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Amount Due</span>
                  <span className="text-blue-600 font-black">${priceResult.estimate?.totalAmount}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Payment Gateway:</span>
                  <span className="font-semibold text-blue-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Razorpay Test Mode
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Free cancellation up to 24 hours before pickup time.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Modify Dates
              </button>
              <button
                onClick={handleFinalConfirmBooking}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2"
                id="btn-confirm-booking-final"
              >
                {isSubmitting ? (
                  <span>Connecting to Razorpay...</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay with Razorpay (${priceResult.estimate?.totalAmount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
