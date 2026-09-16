export type UserRole = 'customer' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  profileImage: string;
  createdAt: string;
  bio?: string;
  rating?: number;
  totalTrips?: number;
}

export type VehicleType = 'Sedan' | 'SUV' | 'Hatchback' | 'Luxury' | 'Electric' | 'Convertible';

export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'unlisted';

export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  type: VehicleType;
  registrationNumber: string;
  colour: string;
  seatingCapacity: number;
  modelYear: number;
  description: string;
  location: string;
  pricePerHour: number;
  pricePerDay: number;
  images: string[];
  status: VehicleStatus;
  createdAt: string;
  features?: string[];
  rating?: number;
  reviewCount?: number;
  fuelType?: string;
  transmission?: 'Automatic' | 'Manual';
}

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'rejected' | 'pending_payment';

export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  ownerId: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
  duration: {
    hours: number;
    days: number;
    totalHours: number;
  };
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
  notes?: string;
  paymentMethod?: string;
  pickupLocation?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  vehicleId: string;
  customerId: string;
  customerName: string;
  customerImage: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  ownerId: string;
  amount: number;
  platformFee: number;
  ownerPayout: number;
  status: 'held_in_escrow' | 'paid_to_owner' | 'refunded' | 'pending_payment' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod?: string;
  currency?: string;
  createdAt: string;
}

export interface SearchFilterState {
  location: string;
  type: string;
  minPrice: number;
  maxPrice: number;
  seatingCapacity: number | 'any';
  availability: 'all' | 'available_only';
  searchQuery: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}

export interface PriceEstimate {
  days: number;
  hours: number;
  totalHours: number;
  baseRate: number;
  serviceFee: number;
  insuranceFee: number;
  totalAmount: number;
  pricingStrategy: 'daily' | 'hourly';
}
