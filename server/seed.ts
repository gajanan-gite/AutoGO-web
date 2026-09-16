import { pool } from './db';
import { SEED_USERS, SEED_VEHICLES, SEED_BOOKINGS, SEED_REVIEWS } from '../src/data/seedData';
import { hashPassword } from './auth';

export async function seedIfEmpty() {
  const client = await pool.connect();
  try {
    // Ensure all existing users have a valid password_hash
    const defaultHash = await hashPassword('password123');
    await client.query(
      `UPDATE users SET password_hash = $1 WHERE password_hash IS NULL`,
      [defaultHash]
    );

    const userCountRes = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountRes.rows[0].count, 10);

    if (userCount > 0) {
      console.log(`[PostgreSQL] Database already has ${userCount} users. Skipping initial seed.`);
      return;
    }

    console.log('[PostgreSQL] Database is empty. Seeding initial AutoGO catalog...');

    await client.query('BEGIN');

    // Seed Users with bcrypt password hash
    for (const u of SEED_USERS) {
      await client.query(
        `INSERT INTO users (id, name, email, phone, role, profile_image, bio, rating, total_trips, created_at, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.email, u.phone, u.role, u.profileImage, u.bio || '', u.rating || 5.0, u.totalTrips || 0, u.createdAt, defaultHash]
      );
    }

    // Seed Vehicles
    for (const v of SEED_VEHICLES) {
      await client.query(
        `INSERT INTO vehicles (
          id, owner_id, make, model, type, registration_number, colour,
          seating_capacity, model_year, description, location,
          price_per_hour, price_per_day, images, features, status,
          rating, review_count, fuel_type, transmission, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO NOTHING`,
        [
          v.id, v.ownerId, v.make, v.model, v.type, v.registrationNumber, v.colour,
          v.seatingCapacity, v.modelYear, v.description, v.location,
          v.pricePerHour, v.pricePerDay, JSON.stringify(v.images || []), JSON.stringify(v.features || []),
          v.status, v.rating || 5.0, v.reviewCount || 0, v.fuelType || 'Gasoline', v.transmission || 'Automatic',
          v.createdAt
        ]
      );
    }

    // Seed Bookings
    for (const b of SEED_BOOKINGS) {
      await client.query(
        `INSERT INTO bookings (
          id, customer_id, vehicle_id, owner_id,
          start_date_time, end_date_time,
          duration_hours, duration_days, duration_total_hours,
          total_amount, status, notes, payment_method, pickup_location, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING`,
        [
          b.id, b.customerId, b.vehicleId, b.ownerId,
          b.startDateTime, b.endDateTime,
          b.duration.hours, b.duration.days, b.duration.totalHours,
          b.totalAmount, b.status, b.notes || '', b.paymentMethod || '', b.pickupLocation || '',
          b.createdAt
        ]
      );

      // Create dummy escrow payment for existing bookings
      const platformFee = Math.round(b.totalAmount * 0.10 * 100) / 100;
      const ownerPayout = Math.round(b.totalAmount * 0.90 * 100) / 100;
      await client.query(
        `INSERT INTO payments (
          id, booking_id, customer_id, owner_id, amount, platform_fee, owner_payout, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING`,
        [
          `pay_${b.id}`, b.id, b.customerId, b.ownerId, b.totalAmount, platformFee, ownerPayout,
          b.status === 'completed' ? 'paid_to_owner' : 'held_in_escrow',
          b.createdAt
        ]
      );
    }

    // Seed Reviews
    for (const r of SEED_REVIEWS) {
      await client.query(
        `INSERT INTO reviews (id, booking_id, vehicle_id, customer_id, customer_name, customer_image, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.bookingId, r.vehicleId, r.customerId, r.customerName, r.customerImage, r.rating, r.comment, r.createdAt]
      );
    }

    await client.query('COMMIT');
    console.log('[PostgreSQL] Initial seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL] Seeding error:', err);
  } finally {
    client.release();
  }
}
