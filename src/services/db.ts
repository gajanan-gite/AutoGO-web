import { User, Vehicle, Booking, Review, Payment } from '../types';
import { SEED_USERS, SEED_VEHICLES, SEED_BOOKINGS, SEED_REVIEWS } from '../data/seedData';
import { auth } from './auth';

type Listener = () => void;

class DatabaseService {
  private users: User[] = [...SEED_USERS];
  private vehicles: Vehicle[] = [...SEED_VEHICLES];
  private bookings: Booking[] = [...SEED_BOOKINGS];
  private reviews: Review[] = [...SEED_REVIEWS];
  private payments: Payment[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;
  private syncInProgress = false;

  constructor() {
    // Initial fetch from PostgreSQL backend
    this.syncWithBackend();

    // Re-sync when authentication state changes
    auth.subscribe(() => {
      this.syncWithBackend();
    });

    // Periodically re-sync with PostgreSQL database so multiple devices/users see real-time updates
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.syncWithBackend());
      setInterval(() => this.syncWithBackend(), 15000);
    }
  }

  /**
   * Syncs the local cache with the PostgreSQL database via /api/bootstrap
   */
  public async syncWithBackend(): Promise<boolean> {
    if (this.syncInProgress) return false;
    this.syncInProgress = true;

    try {
      const res = await fetch('/api/bootstrap', {
        credentials: 'include',
        headers: auth.getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Bootstrap failed with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        this.users = data.users || [];
        this.vehicles = data.vehicles || [];
        this.bookings = data.bookings || [];
        this.reviews = data.reviews || [];
        this.payments = data.payments || [];
        this.initialized = true;
        this.notify();
        return true;
      }
    } catch (err) {
      console.warn('[AutoGO DB] Could not sync with PostgreSQL backend (offline or server starting):', err);
    } finally {
      this.syncInProgress = false;
    }
    return false;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in DB subscriber:', err);
      }
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async resetToDefault() {
    try {
      await fetch('/api/reset', {
        method: 'POST',
        credentials: 'include',
        headers: auth.getAuthHeaders(),
      });
      await this.syncWithBackend();
    } catch (err) {
      console.error('Reset database failed:', err);
      this.users = JSON.parse(JSON.stringify(SEED_USERS));
      this.vehicles = JSON.parse(JSON.stringify(SEED_VEHICLES));
      this.bookings = JSON.parse(JSON.stringify(SEED_BOOKINGS));
      this.reviews = JSON.parse(JSON.stringify(SEED_REVIEWS));
      this.notify();
    }
  }

  // ================= USERS =================
  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  public addUser(user: User): User {
    this.users.push(user);
    this.notify();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.users[index] = { ...this.users[index], ...updates };
    this.notify();

    // Async server persistence to PostgreSQL
    fetch(`/api/users/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify(updates),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          this.users[index] = data.user;
          this.notify();
        }
      })
      .catch(err => console.error('[PostgreSQL] Failed to persist user update:', err));

    return this.users[index];
  }

  // ================= VEHICLES =================
  public getVehicles(): Vehicle[] {
    return [...this.vehicles];
  }

  public getVehicleById(id: string): Vehicle | undefined {
    return this.vehicles.find(v => v.id === id);
  }

  public getVehiclesByOwner(ownerId: string): Vehicle[] {
    return this.vehicles.filter(v => v.ownerId === ownerId);
  }

  public addVehicle(vehicle: Vehicle): Vehicle {
    this.vehicles.unshift(vehicle);
    this.notify();

    // Async server persistence to PostgreSQL
    fetch('/api/vehicles', {
      method: 'POST',
      credentials: 'include',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify(vehicle),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vehicle) {
          const idx = this.vehicles.findIndex(v => v.id === vehicle.id);
          if (idx !== -1) {
            this.vehicles[idx] = data.vehicle;
            this.notify();
          }
        }
      })
      .catch(err => console.error('[PostgreSQL] Failed to persist vehicle:', err));

    return vehicle;
  }

  public updateVehicle(id: string, updates: Partial<Vehicle>): Vehicle | undefined {
    const index = this.vehicles.findIndex(v => v.id === id);
    if (index === -1) return undefined;
    this.vehicles[index] = { ...this.vehicles[index], ...updates };
    this.notify();

    // Async server persistence to PostgreSQL
    fetch(`/api/vehicles/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify(updates),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vehicle) {
          this.vehicles[index] = data.vehicle;
          this.notify();
        }
      })
      .catch(err => console.error('[PostgreSQL] Failed to update vehicle:', err));

    return this.vehicles[index];
  }

  public deleteVehicle(id: string): boolean {
    const prevLen = this.vehicles.length;
    this.vehicles = this.vehicles.filter(v => v.id !== id);
    this.notify();

    // Async server persistence to PostgreSQL
    fetch(`/api/vehicles/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: auth.getAuthHeaders(),
    })
      .then(res => res.json())
      .catch(err => console.error('[PostgreSQL] Failed to delete vehicle:', err));

    return this.vehicles.length !== prevLen;
  }

  // ================= BOOKINGS =================
  public getBookings(): Booking[] {
    return [...this.bookings];
  }

  public getBookingById(id: string): Booking | undefined {
    return this.bookings.find(b => b.id === id);
  }

  public getBookingsByCustomer(customerId: string): Booking[] {
    return this.bookings
      .filter(b => b.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getBookingsByOwner(ownerId: string): Booking[] {
    return this.bookings
      .filter(b => b.ownerId === ownerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getBookingsByVehicle(vehicleId: string): Booking[] {
    return this.bookings.filter(b => b.vehicleId === vehicleId);
  }

  /**
   * Conflict Detection Engine (Client-side fast feedback)
   */
  public checkBookingConflict(
    vehicleId: string,
    startISO: string,
    endISO: string,
    excludeBookingId?: string
  ): { hasConflict: boolean; conflictingBooking?: Booking; message?: string } {
    const reqStart = new Date(startISO).getTime();
    const reqEnd = new Date(endISO).getTime();

    if (isNaN(reqStart) || isNaN(reqEnd)) {
      return { hasConflict: true, message: 'Invalid start or end date format.' };
    }

    if (reqStart >= reqEnd) {
      return { hasConflict: true, message: 'Rental end date and time must be after start date and time.' };
    }

    const activeVehicleBookings = this.bookings.filter(b =>
      b.vehicleId === vehicleId &&
      (!excludeBookingId || b.id !== excludeBookingId) &&
      (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending')
    );

    for (const b of activeVehicleBookings) {
      const bStart = new Date(b.startDateTime).getTime();
      const bEnd = new Date(b.endDateTime).getTime();

      if (reqStart < bEnd && reqEnd > bStart) {
        const startFormatted = new Date(b.startDateTime).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
        const endFormatted = new Date(b.endDateTime).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });

        return {
          hasConflict: true,
          conflictingBooking: b,
          message: `This vehicle is already booked from ${startFormatted} to ${endFormatted} (Status: ${b.status.toUpperCase()}). Please select different dates.`,
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Real Server-Side ACID Transaction Booking Creation
   * Directly posts to /api/bookings where PostgreSQL enforces:
   * 1. Row locks (FOR UPDATE)
   * 2. Owner self-booking prohibition
   * 3. Confirmed overlapping interval checks
   * 4. Vehicle availability status
   * 5. Atomically records booking + escrow payment
   */
  public async addBooking(booking: Booking): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        credentials: 'include',
        headers: auth.getAuthHeaders(),
        body: JSON.stringify(booking),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Server rejected booking (Status ${res.status})`,
        };
      }

      const createdBooking: Booking = data.booking;
      this.bookings.unshift(createdBooking);
      this.notify();

      return { success: true, booking: createdBooking };
    } catch (err: any) {
      console.error('[PostgreSQL] addBooking network/server error:', err);
      return {
        success: false,
        error: err.message || 'Failed to connect to the booking server.',
      };
    }
  }

  public updateBookingStatus(
    bookingId: string,
    newStatus: Booking['status'],
    reason?: string
  ): { success: boolean; booking?: Booking; error?: string } {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    booking.status = newStatus;
    if (newStatus === 'cancelled' && reason) {
      booking.cancelledAt = new Date().toISOString();
      booking.cancellationReason = reason;
    }
    this.notify();

    // Async server persistence to PostgreSQL
    fetch(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      credentials: 'include',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify({ status: newStatus, reason }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.booking) {
          const idx = this.bookings.findIndex(b => b.id === bookingId);
          if (idx !== -1) {
            this.bookings[idx] = data.booking;
            this.notify();
          }
        }
      })
      .catch(err => console.error('[PostgreSQL] Failed to update booking status:', err));

    return { success: true, booking };
  }

  // ================= REVIEWS =================
  public getReviewsByVehicle(vehicleId: string): Review[] {
    return this.reviews.filter(r => r.vehicleId === vehicleId);
  }

  public addReview(review: Review): Review {
    this.reviews.unshift(review);
    this.notify();

    // Async server persistence to PostgreSQL
    fetch('/api/reviews', {
      method: 'POST',
      credentials: 'include',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify(review),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.review) {
          this.syncWithBackend();
        }
      })
      .catch(err => console.error('[PostgreSQL] Failed to persist review:', err));

    return review;
  }

  // ================= PAYMENTS =================
  public getPayments(): Payment[] {
    return [...this.payments];
  }
}

export const db = new DatabaseService();
