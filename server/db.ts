import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('WARNING: DATABASE_URL is not set in environment!');
}

// Configure PostgreSQL connection pool with SSL handling for cloud PostgreSQL providers
export const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes('sslmode=require') || !connectionString.includes('localhost'))
    ? { rejectUnauthorized: false }
    : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function testConnection(): Promise<{ ok: boolean; message: string; version?: string }> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT version()');
      return {
        ok: true,
        message: 'Successfully connected to PostgreSQL database.',
        version: res.rows[0].version,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('PostgreSQL connection error:', err);
    return {
      ok: false,
      message: `Failed to connect to PostgreSQL: ${err.message}`,
    };
  }
}

export async function initDatabaseSchema() {
  console.log('[PostgreSQL] Initializing relational schema...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        profile_image TEXT,
        bio TEXT,
        rating NUMERIC(3, 2) DEFAULT 5.0,
        total_trips INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id VARCHAR(100) PRIMARY KEY,
        owner_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        make VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        registration_number VARCHAR(100) NOT NULL,
        colour VARCHAR(100) NOT NULL,
        seating_capacity INT NOT NULL,
        model_year INT NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        price_per_hour NUMERIC(10, 2) NOT NULL,
        price_per_day NUMERIC(10, 2) NOT NULL,
        images JSONB NOT NULL DEFAULT '[]'::jsonb,
        features JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'available',
        rating NUMERIC(3, 2) DEFAULT 5.0,
        review_count INT DEFAULT 0,
        fuel_type VARCHAR(50),
        transmission VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(100) PRIMARY KEY,
        customer_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vehicle_id VARCHAR(100) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        owner_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_date_time TIMESTAMPTZ NOT NULL,
        end_date_time TIMESTAMPTZ NOT NULL,
        duration_hours INT DEFAULT 0,
        duration_days INT DEFAULT 0,
        duration_total_hours INT DEFAULT 0,
        total_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT,
        payment_method VARCHAR(100),
        pickup_location VARCHAR(255),
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_dates 
        ON bookings (vehicle_id, start_date_time, end_date_time);

      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(100) PRIMARY KEY,
        booking_id VARCHAR(100),
        vehicle_id VARCHAR(100) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        customer_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        customer_image TEXT,
        rating INT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(100) PRIMARY KEY,
        booking_id VARCHAR(100) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id VARCHAR(100) NOT NULL REFERENCES users(id),
        owner_id VARCHAR(100) NOT NULL REFERENCES users(id),
        amount NUMERIC(10, 2) NOT NULL,
        platform_fee NUMERIC(10, 2) NOT NULL,
        owner_payout NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'held_in_escrow',
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        razorpay_signature TEXT,
        currency VARCHAR(10) DEFAULT 'INR',
        payment_method VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id 
        ON payments (razorpay_payment_id) 
        WHERE razorpay_payment_id IS NOT NULL;
    `);
    console.log('[PostgreSQL] Relational tables and indexes verified.');
  } finally {
    client.release();
  }
}
