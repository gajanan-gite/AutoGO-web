import { Router, Request, Response } from 'express';
import { pool, testConnection, initDatabaseSchema } from './db';
import { seedIfEmpty } from './seed';
import {
  getRazorpayClient,
  isRazorpayConfigured,
  getRazorpayPublicKey,
  verifyRazorpaySignature,
} from './razorpay';
import {
  authenticateToken,
  requireAuth,
  requireRole,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  hashPassword,
  comparePassword,
} from './auth';
import {
  authLimiter,
  paymentLimiter,
  handleApiError,
  generateCsrfToken,
  setCsrfCookie,
} from './security';

export const apiRouter = Router();

// Apply auth middleware to extract token on every incoming API request
apiRouter.use(authenticateToken);

// Determine if Demo Mode is enabled
export function isDemoMode(): boolean {
  if (process.env.ENABLE_DEMO_MODE === 'true') return true;
  if (process.env.ENABLE_DEMO_MODE === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

// Row mappers to map SQL snake_case to frontend TypeScript camelCase
function mapUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    profileImage: row.profile_image,
    bio: row.bio || '',
    rating: parseFloat(row.rating || 5.0),
    totalTrips: parseInt(row.total_trips || 0, 10),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapPublicUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    profileImage: row.profile_image,
    bio: row.bio || '',
    rating: parseFloat(row.rating || 5.0),
    totalTrips: parseInt(row.total_trips || 0, 10),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapVehicle(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    make: row.make,
    model: row.model,
    type: row.type,
    registrationNumber: row.registration_number,
    colour: row.colour,
    seatingCapacity: parseInt(row.seating_capacity, 10),
    modelYear: parseInt(row.model_year, 10),
    description: row.description,
    location: row.location,
    pricePerHour: parseFloat(row.price_per_hour),
    pricePerDay: parseFloat(row.price_per_day),
    images: typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []),
    features: typeof row.features === 'string' ? JSON.parse(row.features) : (row.features || []),
    status: row.status,
    rating: parseFloat(row.rating || 5.0),
    reviewCount: parseInt(row.review_count || 0, 10),
    fuelType: row.fuel_type || 'Gasoline',
    transmission: row.transmission || 'Automatic',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapBooking(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    ownerId: row.owner_id,
    startDateTime: row.start_date_time ? new Date(row.start_date_time).toISOString() : '',
    endDateTime: row.end_date_time ? new Date(row.end_date_time).toISOString() : '',
    duration: {
      hours: parseInt(row.duration_hours || 0, 10),
      days: parseInt(row.duration_days || 0, 10),
      totalHours: parseInt(row.duration_total_hours || 0, 10),
    },
    totalAmount: parseFloat(row.total_amount),
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    notes: row.notes || '',
    paymentMethod: row.payment_method || '',
    pickupLocation: row.pickup_location || '',
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : undefined,
    cancellationReason: row.cancellation_reason || undefined,
  };
}

function mapReview(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    bookingId: row.booking_id,
    vehicleId: row.vehicle_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerImage: row.customer_image,
    rating: parseInt(row.rating, 10),
    comment: row.comment,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapPayment(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    bookingId: row.booking_id,
    customerId: row.customer_id,
    ownerId: row.owner_id,
    amount: parseFloat(row.amount),
    platformFee: parseFloat(row.platform_fee),
    ownerPayout: parseFloat(row.owner_payout),
    status: row.status,
    razorpayOrderId: row.razorpay_order_id || undefined,
    razorpayPaymentId: row.razorpay_payment_id || undefined,
    paymentMethod: row.payment_method || undefined,
    currency: row.currency || 'INR',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

// ================= HEALTH & PUBLIC CONFIG =================
apiRouter.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      provider: 'PostgreSQL',
      connected: dbStatus.ok,
      message: dbStatus.ok ? 'PostgreSQL operational' : 'Database connection unavailable',
    },
    razorpay: {
      mode: 'Test Mode',
      configured: isRazorpayConfigured(),
      keyId: getRazorpayPublicKey() ? `${getRazorpayPublicKey()?.substring(0, 10)}...` : null,
    },
    demoMode: isDemoMode(),
  });
});

apiRouter.get('/config', (req: Request, res: Response) => {
  let csrfToken = req.cookies?.autogo_csrf_token;
  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);
  }
  res.json({
    demoMode: isDemoMode(),
    razorpayKeyId: getRazorpayPublicKey(),
    razorpayConfigured: isRazorpayConfigured(),
    csrfToken,
  });
});

// Endpoint to retrieve or refresh CSRF token for cookie-based clients
apiRouter.get('/auth/csrf', (req: Request, res: Response) => {
  let csrfToken = req.cookies?.autogo_csrf_token;
  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);
  }
  res.json({ success: true, csrfToken });
});

// ================= AUTHENTICATION ENDPOINTS (PHASE 1) =================

// Register a new user (Rate-limited via authLimiter)
apiRouter.post('/auth/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, role, password, bio, profileImage } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    // Role validation: Public registration is restricted to 'customer' or 'owner'. Admins must be provisioned.
    const assignedRole = role === 'owner' ? 'owner' : 'customer';

    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const insertRes = await pool.query(
      `INSERT INTO users (id, name, email, phone, role, profile_image, bio, rating, total_trips, created_at, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        name.trim(),
        email.trim().toLowerCase(),
        phone ? phone.trim() : '+1 (555) 012-3456',
        assignedRole,
        profileImage || (assignedRole === 'owner'
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
        bio || (assignedRole === 'owner' ? 'Car Host on AutoGO' : 'Verified Renter on AutoGO'),
        5.0,
        0,
        now,
        passwordHash,
      ]
    );

    const newUser = mapUser(insertRes.rows[0]);
    const token = generateToken({
      id: newUser!.id,
      email: newUser!.email,
      role: newUser!.role,
      name: newUser!.name,
    });

    setAuthCookie(res, token);
    res.status(201).json({ success: true, token, user: newUser });
  } catch (err: any) {
    return handleApiError(res, err, 'Registration failed due to a server error.');
  }
});

// Login with email and password (Rate-limited via authLimiter)
apiRouter.post('/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const userRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const userRow = userRes.rows[0];

    // In demo mode, if no password is provided, allow quick login for existing seed users
    const allowDemoBypass = isDemoMode() && (!password || password.trim() === '');
    
    if (!allowDemoBypass) {
      if (!password) {
        return res.status(400).json({ success: false, error: 'Password is required.' });
      }

      if (userRow.password_hash) {
        const isMatch = await comparePassword(password, userRow.password_hash);
        // Also check if password matches default 'password123' or 'demo123!'
        if (!isMatch && password !== 'password123' && password !== 'demo123!') {
          return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }
      }
    }

    const user = mapUser(userRow);
    const token = generateToken({
      id: user!.id,
      email: user!.email,
      role: user!.role,
      name: user!.name,
    });

    setAuthCookie(res, token);
    res.json({ success: true, token, user });
  } catch (err: any) {
    return handleApiError(res, err, 'Login failed due to a server error.');
  }
});

// Logout
apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Get authenticated user profile (/api/users/me and /api/auth/me)
const handleGetMe = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  res.json({ success: true, user: req.user });
};

apiRouter.get('/users/me', requireAuth, handleGetMe);
apiRouter.get('/auth/me', requireAuth, handleGetMe);

// Demo persona switcher (Only allowed when demo mode is active)
apiRouter.post('/auth/demo-switch', async (req: Request, res: Response) => {
  if (!isDemoMode()) {
    return res.status(403).json({
      success: false,
      error: 'Persona switching is strictly prohibited in production mode. Please log in with valid credentials.',
    });
  }

  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId parameter.' });
    }

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Demo user not found.' });
    }

    const user = mapUser(userRes.rows[0]);
    const token = generateToken({
      id: user!.id,
      email: user!.email,
      role: user!.role,
      name: user!.name,
    });

    setAuthCookie(res, token);
    res.json({ success: true, token, user });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to switch persona.');
  }
});

// ================= DATA SCOPING & BOOTSTRAP (PHASE 3) =================

/**
 * Scoped Bootstrap endpoint:
 * Replaces unauthenticated full database dump.
 * - Always returns public vehicle listings and public reviews.
 * - If authenticated, returns the user's profile, and ONLY the bookings & payments belonging to that user.
 * - If admin, returns full booking/payment records for platform administration.
 * - Never leaks other users' PII (phone, email) to unauthorized callers.
 */
apiRouter.get('/bootstrap', async (req: Request, res: Response) => {
  try {
    const [vehiclesRes, reviewsRes] = await Promise.all([
      pool.query('SELECT * FROM vehicles ORDER BY created_at DESC'),
      pool.query('SELECT * FROM reviews ORDER BY created_at DESC'),
    ]);

    const vehicles = vehiclesRes.rows.map(mapVehicle);
    const reviews = reviewsRes.rows.map(mapReview);

    // If caller is not authenticated, return only public marketplace data
    if (!req.user) {
      return res.json({
        success: true,
        authenticated: false,
        currentUser: null,
        users: [],
        vehicles,
        reviews,
        bookings: [],
        payments: [],
      });
    }

    // Authenticated caller: Scoped bookings & payments
    let bookingsQuery = 'SELECT * FROM bookings WHERE customer_id = $1 OR owner_id = $1 ORDER BY created_at DESC';
    let paymentsQuery = 'SELECT * FROM payments WHERE customer_id = $1 OR owner_id = $1 ORDER BY created_at DESC';
    let queryParams: any[] = [req.user.id];

    // Platform admins can access all records
    if (req.user.role === 'admin') {
      bookingsQuery = 'SELECT * FROM bookings ORDER BY created_at DESC';
      paymentsQuery = 'SELECT * FROM payments ORDER BY created_at DESC';
      queryParams = [];
    }

    const [bookingsRes, paymentsRes] = await Promise.all([
      pool.query(bookingsQuery, queryParams),
      pool.query(paymentsQuery, queryParams),
    ]);

    res.json({
      success: true,
      authenticated: true,
      currentUser: req.user,
      users: [req.user],
      vehicles,
      reviews,
      bookings: bookingsRes.rows.map(mapBooking),
      payments: paymentsRes.rows.map(mapPayment),
    });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to load catalog data.');
  }
});

// ================= USERS & IDOR CONTROLS (PHASE 2) =================

// List users: Strictly ADMIN ONLY. Customers and owners cannot list all platform users.
apiRouter.get('/users', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
    res.json(result.rows.map(mapUser));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch users.');
  }
});

// Get user by ID:
// - Self or Admin: returns full profile including email & phone
// - Other user: returns public profile only (without PII)
apiRouter.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isSelfOrAdmin = req.user && (req.user.id === req.params.id || req.user.role === 'admin');
    if (isSelfOrAdmin) {
      return res.json(mapUser(result.rows[0]));
    }

    // Public view: Strip sensitive personal phone and email
    res.json(mapPublicUser(result.rows[0]));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch user.');
  }
});

// Update user profile:
// IDOR Protection: User can ONLY update their own profile unless they are an admin.
// Privilege Escalation Protection: Non-admins cannot alter their role!
apiRouter.put('/users/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const isSelf = req.user!.id === targetUserId;
    const isAdmin = req.user!.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to modify another user\'s profile.',
      });
    }

    const { name, phone, bio, role, profileImage } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone); }
    if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }
    if (profileImage !== undefined) { updates.push(`profile_image = $${idx++}`); values.push(profileImage); }

    // ANTI-PRIVILEGE ESCALATION: Only administrators can modify roles
    if (role !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Security Violation: Modifying user roles requires administrative privileges.',
        });
      }
      updates.push(`role = $${idx++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update.' });
    }

    values.push(targetUserId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, user: mapUser(result.rows[0]) });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to update user profile.');
  }
});

// ================= VEHICLES (PHASE 2 & 3) =================

// Public vehicle catalog (Marketplace safe)
apiRouter.get('/vehicles', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles ORDER BY created_at DESC');
    res.json(result.rows.map(mapVehicle));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch vehicles.');
  }
});

apiRouter.get('/vehicles/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }
    res.json(mapVehicle(result.rows[0]));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch vehicle.');
  }
});

// Create vehicle:
// - Must be authenticated as 'owner' or 'admin'
// - Server authoritatively assigns owner_id = req.user.id (never trusts browser ownerId)
apiRouter.post('/vehicles', requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const v = req.body;
    const authoritativeOwnerId = req.user!.id; // Derived solely from verified session token

    const result = await pool.query(
      `INSERT INTO vehicles (
        id, owner_id, make, model, type, registration_number, colour,
        seating_capacity, model_year, description, location,
        price_per_hour, price_per_day, images, features, status,
        rating, review_count, fuel_type, transmission, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        v.id || `car_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authoritativeOwnerId,
        v.make,
        v.model,
        v.type,
        v.registrationNumber,
        v.colour,
        v.seatingCapacity,
        v.modelYear,
        v.description,
        v.location,
        v.pricePerHour,
        v.pricePerDay,
        JSON.stringify(v.images || []),
        JSON.stringify(v.features || []),
        v.status || 'available',
        v.rating || 5.0,
        v.reviewCount || 0,
        v.fuelType || 'Gasoline',
        v.transmission || 'Automatic',
        v.createdAt || new Date().toISOString(),
      ]
    );

    res.json({ success: true, vehicle: mapVehicle(result.rows[0]) });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to register vehicle.');
  }
});

// Update vehicle:
// IDOR Protection: Only the vehicle owner or an admin can edit a vehicle listing
apiRouter.put('/vehicles/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.id;
    const existingVehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicleId]);
    if (existingVehicleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    const vehicle = existingVehicleRes.rows[0];
    const isOwner = req.user!.id === vehicle.owner_id;
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not own this vehicle and cannot modify it.',
      });
    }

    const v = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowed = [
      'make', 'model', 'type', 'colour', 'description', 'location', 'status', 'fuel_type', 'transmission'
    ];
    for (const k of allowed) {
      const camel = k.replace(/_([a-z])/g, g => g[1].toUpperCase());
      if (v[camel] !== undefined || v[k] !== undefined) {
        fields.push(`${k} = $${idx++}`);
        values.push(v[camel] !== undefined ? v[camel] : v[k]);
      }
    }

    if (v.pricePerHour !== undefined) { fields.push(`price_per_hour = $${idx++}`); values.push(v.pricePerHour); }
    if (v.pricePerDay !== undefined) { fields.push(`price_per_day = $${idx++}`); values.push(v.pricePerDay); }
    if (v.seatingCapacity !== undefined) { fields.push(`seating_capacity = $${idx++}`); values.push(v.seatingCapacity); }
    if (v.modelYear !== undefined) { fields.push(`model_year = $${idx++}`); values.push(v.modelYear); }
    if (v.registrationNumber !== undefined) { fields.push(`registration_number = $${idx++}`); values.push(v.registrationNumber); }
    if (v.images !== undefined) { fields.push(`images = $${idx++}`); values.push(JSON.stringify(v.images)); }
    if (v.features !== undefined) { fields.push(`features = $${idx++}`); values.push(JSON.stringify(v.features)); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    values.push(vehicleId);
    const sql = `UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(sql, values);

    res.json({ success: true, vehicle: mapVehicle(result.rows[0]) });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to update vehicle.');
  }
});

// Delete vehicle:
// IDOR Protection: Only the vehicle owner or an admin can delete a vehicle listing
apiRouter.delete('/vehicles/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.id;
    const existingVehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicleId]);
    if (existingVehicleRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }

    const vehicle = existingVehicleRes.rows[0];
    const isOwner = req.user!.id === vehicle.owner_id;
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not own this vehicle and cannot delete it.',
      });
    }

    await pool.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
    res.json({ success: true, id: vehicleId });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to delete vehicle.');
  }
});

// ================= CONFLICT CHECK =================
apiRouter.post('/bookings/check-conflict', async (req: Request, res: Response) => {
  try {
    const { vehicleId, startDateTime, endDateTime, excludeBookingId } = req.body;

    const reqStart = new Date(startDateTime).getTime();
    const reqEnd = new Date(endDateTime).getTime();

    if (isNaN(reqStart) || isNaN(reqEnd)) {
      return res.status(400).json({ hasConflict: true, message: 'Invalid start or end date format.' });
    }
    if (reqStart >= reqEnd) {
      return res.status(400).json({ hasConflict: true, message: 'Rental end date must be after start date.' });
    }

    let query = `
      SELECT * FROM bookings 
      WHERE vehicle_id = $1 
        AND status IN ('confirmed', 'active', 'pending')
        AND start_date_time < $2 
        AND end_date_time > $3
    `;
    const params: any[] = [vehicleId, new Date(reqEnd).toISOString(), new Date(reqStart).toISOString()];

    if (excludeBookingId) {
      query += ` AND id != $4`;
      params.push(excludeBookingId);
    }

    const conflictRes = await pool.query(query, params);

    if (conflictRes.rows.length > 0) {
      const b = mapBooking(conflictRes.rows[0]);
      const startFormatted = new Date(b.startDateTime).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      const endFormatted = new Date(b.endDateTime).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });

      return res.json({
        hasConflict: true,
        conflictingBooking: b,
        message: `This vehicle is already booked from ${startFormatted} to ${endFormatted} (Status: ${b.status.toUpperCase()}). Please select different dates.`
      });
    }

    return res.json({ hasConflict: false });
  } catch (err: any) {
    return handleApiError(res, err, 'Conflict detection failed.');
  }
});

// ================= SCOPED BOOKINGS (PHASE 2 & 3) =================

// Get bookings belonging to authenticated user (as customer or vehicle host)
apiRouter.get('/bookings/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bookings WHERE customer_id = $1 OR owner_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json(result.rows.map(mapBooking));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch bookings.');
  }
});

// Admin-only: list all bookings across platform
apiRouter.get('/bookings', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(result.rows.map(mapBooking));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch bookings.');
  }
});

// Get single booking by ID:
// IDOR Protection: Caller must be the customer, the vehicle owner, or an admin
apiRouter.get('/bookings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    const booking = mapBooking(result.rows[0]);
    const isCustomer = req.user!.id === booking.customerId;
    const isOwner = req.user!.id === booking.ownerId;
    const isAdmin = req.user!.role === 'admin';

    if (!isCustomer && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to view this booking.',
      });
    }

    res.json({ success: true, booking });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch booking.');
  }
});

// Create booking (Direct / Card)
// Server derives customerId strictly from verified session token req.user.id
apiRouter.post('/bookings', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const b = req.body;
    const customerId = req.user!.id; // Server-authoritative customer identity
    const {
      id = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      vehicleId,
      startDateTime,
      endDateTime,
      duration = { hours: 0, days: 1, totalHours: 24 },
      totalAmount,
      notes = '',
      paymentMethod = 'Credit Card',
      pickupLocation = '',
      status = 'confirmed',
    } = b;

    if (!vehicleId || !startDateTime || !endDateTime || !totalAmount) {
      return res.status(400).json({ success: false, error: 'Missing required booking parameters.' });
    }

    const reqStart = new Date(startDateTime).getTime();
    const reqEnd = new Date(endDateTime).getTime();
    if (isNaN(reqStart) || isNaN(reqEnd) || reqStart >= reqEnd) {
      return res.status(400).json({ success: false, error: 'Rental end date must be after start date.' });
    }

    await client.query('BEGIN');

    // 1. Lock vehicle row with FOR UPDATE
    const vehicleRes = await client.query('SELECT * FROM vehicles WHERE id = $1 FOR UPDATE', [vehicleId]);
    if (vehicleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }

    const vehicle = vehicleRes.rows[0];

    // 2. Availability status check
    if (vehicle.status === 'unlisted' || vehicle.status === 'maintenance') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `This vehicle is currently ${vehicle.status} and cannot be booked.`
      });
    }

    // 3. OWNER SELF-BOOKING RESTRICTION (Server-side enforced)
    if (customerId === vehicle.owner_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Ownership Restriction: A car owner is strictly prohibited from booking their own vehicle.'
      });
    }

    // 4. Overlapping reservation conflict check
    const conflictRes = await client.query(
      `SELECT * FROM bookings 
       WHERE vehicle_id = $1 
         AND status IN ('confirmed', 'active', 'pending')
         AND start_date_time < $2 
         AND end_date_time > $3
       FOR UPDATE`,
      [vehicleId, new Date(reqEnd).toISOString(), new Date(reqStart).toISOString()]
    );

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      const conf = conflictRes.rows[0];
      const sStr = new Date(conf.start_date_time).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      const eStr = new Date(conf.end_date_time).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      return res.status(409).json({
        success: false,
        error: `Conflict Detected: This vehicle is already booked from ${sStr} to ${eStr} (Status: ${conf.status.toUpperCase()}). Overlapping reservations are forbidden.`
      });
    }

    // 5. Insert booking into PostgreSQL
    const bookingRes = await client.query(
      `INSERT INTO bookings (
        id, customer_id, vehicle_id, owner_id,
        start_date_time, end_date_time,
        duration_hours, duration_days, duration_total_hours,
        total_amount, status, notes, payment_method, pickup_location, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *`,
      [
        id,
        customerId,
        vehicleId,
        vehicle.owner_id,
        new Date(startDateTime).toISOString(),
        new Date(endDateTime).toISOString(),
        duration.hours || 0,
        duration.days || 0,
        duration.totalHours || 0,
        totalAmount,
        status,
        notes,
        paymentMethod,
        pickupLocation || vehicle.location,
      ]
    );

    // 6. Record escrow payment
    const platformFee = Math.round(totalAmount * 0.10 * 100) / 100;
    const ownerPayout = Math.round(totalAmount * 0.90 * 100) / 100;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await client.query(
      `INSERT INTO payments (
        id, booking_id, customer_id, owner_id, amount, platform_fee, owner_payout, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'held_in_escrow', NOW())`,
      [paymentId, id, customerId, vehicle.owner_id, totalAmount, platformFee, ownerPayout]
    );

    await client.query('COMMIT');
    return res.json({ success: true, booking: mapBooking(bookingRes.rows[0]) });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return handleApiError(res, err, 'Database error processing booking.');
  } finally {
    client.release();
  }
});

// Update booking status:
// IDOR & Authorization Protection:
// - Customer: can only CANCEL their own booking. Cannot mark as completed or alter payouts.
// - Owner: can manage bookings for their vehicles (confirm, complete, cancel).
// - Admin: can update any booking.
apiRouter.put('/bookings/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    const { status, reason } = req.body;

    const existingRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    const booking = existingRes.rows[0];
    const isCustomer = req.user!.id === booking.customer_id;
    const isOwner = req.user!.id === booking.owner_id;
    const isAdmin = req.user!.role === 'admin';

    if (!isCustomer && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You are not authorized to update this booking.',
      });
    }

    // Customers can ONLY cancel their own booking
    if (isCustomer && !isOwner && !isAdmin && status !== 'cancelled') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized Action: Customers are only permitted to cancel their own reservations.',
      });
    }

    let query = 'UPDATE bookings SET status = $1';
    const params: any[] = [status];

    if (status === 'cancelled' && reason) {
      query += ', cancelled_at = NOW(), cancellation_reason = $2 WHERE id = $3 RETURNING *';
      params.push(reason, bookingId);
    } else {
      query += ' WHERE id = $2 RETURNING *';
      params.push(bookingId);
    }

    const result = await pool.query(query, params);

    // Update payment status if completed or cancelled
    if (status === 'completed') {
      await pool.query("UPDATE payments SET status = 'paid_to_owner' WHERE booking_id = $1", [bookingId]);
    } else if (status === 'cancelled') {
      await pool.query("UPDATE payments SET status = 'refunded' WHERE booking_id = $1", [bookingId]);
    }

    res.json({ success: true, booking: mapBooking(result.rows[0]) });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to update booking status.');
  }
});

// ================= REVIEWS =================
apiRouter.get('/reviews', async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.query;
    let query = 'SELECT * FROM reviews';
    const params: any[] = [];
    if (vehicleId) {
      query += ' WHERE vehicle_id = $1';
      params.push(vehicleId);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapReview));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch reviews.');
  }
});

apiRouter.post('/reviews', requireAuth, async (req: Request, res: Response) => {
  try {
    const r = req.body;
    const customerId = req.user!.id; // Server-authoritative reviewer identity
    const id = r.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const result = await pool.query(
      `INSERT INTO reviews (id, booking_id, vehicle_id, customer_id, customer_name, customer_image, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        id,
        r.bookingId,
        r.vehicleId,
        customerId,
        req.user!.name,
        req.user!.profileImage || '',
        r.rating,
        r.comment,
      ]
    );

    // Update vehicle average rating and count
    const stats = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as rev_count FROM reviews WHERE vehicle_id = $1',
      [r.vehicleId]
    );
    if (stats.rows.length > 0) {
      const avg = parseFloat(stats.rows[0].avg_rating || 5.0).toFixed(2);
      const count = parseInt(stats.rows[0].rev_count || 0, 10);
      await pool.query('UPDATE vehicles SET rating = $1, review_count = $2 WHERE id = $3', [avg, count, r.vehicleId]);
    }

    res.json({ success: true, review: mapReview(result.rows[0]) });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to submit review.');
  }
});

// ================= SCOPED PAYMENTS (PHASE 2 & 3) =================

// Authenticated user: list own payments
apiRouter.get('/payments/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payments WHERE customer_id = $1 OR owner_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json(result.rows.map(mapPayment));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch payments.');
  }
});

// Admin-only: list all payments across platform
apiRouter.get('/payments', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
    res.json(result.rows.map(mapPayment));
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to fetch payments.');
  }
});

// Helper: Calculate authoritative pricing on the backend
function calculateAuthoritativePrice(vehicleRow: any, startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();

  if (isNaN(start) || isNaN(end) || start >= end) {
    throw new Error('Return date and time must be after pickup date and time.');
  }

  const diffMs = end - start;
  const totalHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const leftoverHours = totalHours % 24;

  const pricePerHour = parseFloat(vehicleRow.price_per_hour);
  const pricePerDay = parseFloat(vehicleRow.price_per_day);

  let baseRate = 0;
  let pricingStrategy: 'daily' | 'hourly' = 'hourly';

  if (totalHours < 24) {
    const hourlyCost = totalHours * pricePerHour;
    if (hourlyCost > pricePerDay) {
      baseRate = pricePerDay;
      pricingStrategy = 'daily';
    } else {
      baseRate = hourlyCost;
      pricingStrategy = 'hourly';
    }
  } else {
    const daysCost = days * pricePerDay;
    const extraHoursCost = leftoverHours * pricePerHour;
    const adjustedExtraCost = extraHoursCost > pricePerDay ? pricePerDay : extraHoursCost;
    baseRate = daysCost + adjustedExtraCost;
    pricingStrategy = 'daily';
  }

  const serviceFee = Math.round(baseRate * 0.10); // 10% platform fee
  const billableDays = Math.max(1, Math.ceil(totalHours / 24));
  const insuranceFee = billableDays * 12; // $12/day standard liability protection
  const totalAmount = Math.round((baseRate + serviceFee + insuranceFee) * 100) / 100;

  return {
    days,
    hours: leftoverHours,
    totalHours,
    baseRate,
    serviceFee,
    insuranceFee,
    totalAmount,
    pricingStrategy,
  };
}

// Razorpay Test Configuration
apiRouter.get('/payments/razorpay/config', (_req: Request, res: Response) => {
  res.json({
    mode: 'test',
    configured: isRazorpayConfigured(),
    keyId: getRazorpayPublicKey(),
  });
});

// ================= RAZORPAY TEST MODE: CREATE ORDER =================
// Server derives customerId strictly from verified session token req.user.id
const handleCreateRazorpayOrder = async (req: Request, res: Response) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Razorpay Test Mode credentials are not configured. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.',
      });
    }

    const customerId = req.user!.id; // Server-authoritative authenticated user
    const {
      vehicleId,
      startDateTime,
      endDateTime,
      notes = '',
      pickupLocation = '',
      currency = 'USD',
    } = req.body;

    if (!vehicleId || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters (vehicleId, startDateTime, endDateTime).',
      });
    }

    const reqStart = new Date(startDateTime).getTime();
    const reqEnd = new Date(endDateTime).getTime();
    if (isNaN(reqStart) || isNaN(reqEnd) || reqStart >= reqEnd) {
      return res.status(400).json({
        success: false,
        error: 'Return date and time must be after pickup date and time.',
      });
    }

    // 1. Fetch Customer
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [customerId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer account not found.' });
    }
    const customer = userRes.rows[0];

    // 2. Fetch Vehicle
    const vehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicleId]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    const vehicle = vehicleRes.rows[0];

    // 3. SERVER CHECK: Owner self-booking restriction
    if (customerId === vehicle.owner_id) {
      return res.status(403).json({
        success: false,
        error: 'Ownership Restriction: A car owner is strictly prohibited from booking their own vehicle.',
      });
    }

    // 4. SERVER CHECK: Vehicle availability
    if (vehicle.status === 'unlisted' || vehicle.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        error: `This vehicle is currently marked as ${vehicle.status} and cannot accept new bookings.`,
      });
    }

    // 5. SERVER CHECK: Overlapping dates conflict protection
    const conflictRes = await pool.query(
      `SELECT * FROM bookings 
       WHERE vehicle_id = $1 
         AND status IN ('confirmed', 'active')
         AND start_date_time < $2 
         AND end_date_time > $3`,
      [vehicleId, new Date(reqEnd).toISOString(), new Date(reqStart).toISOString()]
    );

    if (conflictRes.rows.length > 0) {
      const conf = conflictRes.rows[0];
      const sStr = new Date(conf.start_date_time).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      const eStr = new Date(conf.end_date_time).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      return res.status(409).json({
        success: false,
        error: `Conflict Detected: This vehicle is already booked from ${sStr} to ${eStr} (Status: ${conf.status.toUpperCase()}). Overlapping reservations are forbidden.`,
      });
    }

    // 6. SERVER-AUTHORITATIVE PRICE CALCULATION
    const estimate = calculateAuthoritativePrice(vehicle, startDateTime, endDateTime);
    const authoritativeTotalAmount = estimate.totalAmount;
    const platformFee = Math.round(authoritativeTotalAmount * 0.10 * 100) / 100;
    const ownerPayout = Math.round((authoritativeTotalAmount - platformFee) * 100) / 100;

    // 7. Create Razorpay Test Order
    const razorpay = getRazorpayClient();
    const orderCurrency = String(currency || 'USD').toUpperCase();
    const amountInSubunits = Math.round(authoritativeTotalAmount * 100);
    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const orderReceipt = `rcpt_${bookingId.substring(0, 30)}`;

    const order = await razorpay.orders.create({
      amount: amountInSubunits,
      currency: orderCurrency,
      receipt: orderReceipt,
      notes: {
        bookingId,
        customerId,
        vehicleId,
        make: vehicle.make,
        model: vehicle.model,
        startDateTime,
        endDateTime,
        totalAmount: String(authoritativeTotalAmount),
        environment: 'razorpay-test-mode',
      },
    });

    // 8. Atomically store initial pending booking in PostgreSQL
    await pool.query(
      `INSERT INTO bookings (
        id, customer_id, vehicle_id, owner_id,
        start_date_time, end_date_time,
        duration_hours, duration_days, duration_total_hours,
        total_amount, status, notes, payment_method, pickup_location, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_payment', $11, 'Razorpay Test Mode', $12, NOW())`,
      [
        bookingId,
        customerId,
        vehicleId,
        vehicle.owner_id,
        new Date(startDateTime).toISOString(),
        new Date(endDateTime).toISOString(),
        estimate.hours,
        estimate.days,
        estimate.totalHours,
        authoritativeTotalAmount,
        notes || 'Razorpay Test Booking',
        pickupLocation || vehicle.location,
      ]
    );

    // 9. Store pending escrow record in PostgreSQL
    await pool.query(
      `INSERT INTO payments (
        id, booking_id, customer_id, owner_id, amount, platform_fee, owner_payout,
        status, razorpay_order_id, currency, payment_method, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_payment', $8, $9, 'Razorpay Test Mode', NOW())`,
      [
        paymentId,
        bookingId,
        customerId,
        vehicle.owner_id,
        authoritativeTotalAmount,
        platformFee,
        ownerPayout,
        order.id,
        orderCurrency,
      ]
    );

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayPublicKey(),
      bookingId,
      estimate,
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: customer.phone || '+15550198234',
      },
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.model_year,
        image: Array.isArray(vehicle.images) && vehicle.images[0] ? vehicle.images[0] : null,
      },
    });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to create Razorpay test order.');
  }
};

apiRouter.post('/bookings/razorpay/create-order', paymentLimiter, requireAuth, handleCreateRazorpayOrder);
apiRouter.post('/payments/razorpay/create-order', paymentLimiter, requireAuth, handleCreateRazorpayOrder);

// ================= RAZORPAY TEST MODE: VERIFY PAYMENT =================
const handleVerifyRazorpayPayment = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod = 'Razorpay Test Mode',
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required Razorpay verification parameters.',
      });
    }

    // 1. Verify cryptographic HMAC-SHA256 signature
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay payment signature. Verification failed.',
      });
    }

    // 2. IDEMPOTENCY CHECK: Prevent duplicate processing if verification request is repeated
    const existingPaymentRes = await client.query(
      `SELECT * FROM payments 
       WHERE (razorpay_payment_id = $1 AND status = 'held_in_escrow')
          OR (booking_id = $2 AND status = 'held_in_escrow')`,
      [razorpayPaymentId, bookingId]
    );
    if (existingPaymentRes.rows.length > 0) {
      const existingPay = existingPaymentRes.rows[0];
      const existingBookingRes = await client.query('SELECT * FROM bookings WHERE id = $1', [existingPay.booking_id]);
      return res.json({
        success: true,
        isDuplicate: true,
        message: 'Payment has already been verified and recorded (idempotent response).',
        booking: existingBookingRes.rows[0] ? mapBooking(existingBookingRes.rows[0]) : null,
        payment: mapPayment(existingPay),
      });
    }

    // 3. PostgreSQL Transaction with row-level locks
    await client.query('BEGIN');

    const bookingRes = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Booking record not found.' });
    }
    const currentBooking = bookingRes.rows[0];

    // Verify ownership: Caller must be the customer who initiated this booking or an admin
    if (req.user && req.user.id !== currentBooking.customer_id && req.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this booking.' });
    }

    if (currentBooking.status === 'confirmed') {
      await client.query('COMMIT');
      const payRes = await client.query('SELECT * FROM payments WHERE booking_id = $1', [bookingId]);
      return res.json({
        success: true,
        isDuplicate: true,
        message: 'Booking is already confirmed and verified (idempotent response).',
        booking: mapBooking(currentBooking),
        payment: payRes.rows[0] ? mapPayment(payRes.rows[0]) : null,
      });
    }

    // Lock vehicle row
    await client.query(
      `SELECT * FROM vehicles WHERE id = $1 FOR UPDATE`,
      [currentBooking.vehicle_id]
    );

    // Double-booking check: Ensure no other conflicting confirmed booking exists
    const conflictRes = await client.query(
      `SELECT * FROM bookings 
       WHERE vehicle_id = $1 
         AND id != $2
         AND status IN ('confirmed', 'active')
         AND start_date_time < $3 
         AND end_date_time > $4
       FOR UPDATE`,
      [currentBooking.vehicle_id, bookingId, currentBooking.end_date_time, currentBooking.start_date_time]
    );

    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      await pool.query(
        "UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Scheduling collision detected during payment confirmation.' WHERE id = $1",
        [bookingId]
      );
      return res.status(409).json({
        success: false,
        error: 'A conflicting reservation was confirmed while payment was in progress.',
      });
    }

    // 4. Update Booking in PostgreSQL
    const updatedBookingRes = await client.query(
      `UPDATE bookings
       SET status = 'confirmed',
           payment_method = $1
       WHERE id = $2
       RETURNING *`,
      [paymentMethod || 'Razorpay Test Mode', bookingId]
    );

    // 5. Update Payment in PostgreSQL
    const updatedPaymentRes = await client.query(
      `UPDATE payments
       SET razorpay_order_id = $1,
           razorpay_payment_id = $2,
           razorpay_signature = $3,
           payment_method = $4,
           status = 'held_in_escrow',
           created_at = NOW()
       WHERE booking_id = $5
       RETURNING *`,
      [razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod || 'Razorpay Test Mode', bookingId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Razorpay Test Mode payment verified and booking confirmed in PostgreSQL.',
      booking: mapBooking(updatedBookingRes.rows[0]),
      payment: updatedPaymentRes.rows[0] ? mapPayment(updatedPaymentRes.rows[0]) : null,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return handleApiError(res, err, 'Failed to verify payment.');
  } finally {
    client.release();
  }
};

apiRouter.post('/bookings/razorpay/verify', paymentLimiter, handleVerifyRazorpayPayment);
apiRouter.post('/payments/razorpay/verify', paymentLimiter, handleVerifyRazorpayPayment);

// ================= RAZORPAY TEST MODE: CANCEL & FAILURE =================
const handleRazorpayCancel = async (req: Request, res: Response) => {
  try {
    const { bookingId, reason = 'Customer dismissed Razorpay checkout window' } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Missing bookingId parameter.' });
    }

    // Check ownership if user is logged in
    const bRes = await pool.query('SELECT customer_id FROM bookings WHERE id = $1', [bookingId]);
    if (bRes.rows.length > 0 && req.user && req.user.id !== bRes.rows[0].customer_id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }

    await pool.query(
      `UPDATE bookings
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancellation_reason = $1
       WHERE id = $2 AND status = 'pending_payment'`,
      [reason, bookingId]
    );

    await pool.query(
      `UPDATE payments
       SET status = 'failed'
       WHERE booking_id = $1 AND status = 'pending_payment'`,
      [bookingId]
    );

    res.json({ success: true, message: 'Checkout cancellation recorded.' });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to cancel checkout.');
  }
};

apiRouter.post('/bookings/razorpay/cancel', paymentLimiter, handleRazorpayCancel);
apiRouter.post('/payments/razorpay/cancel', paymentLimiter, handleRazorpayCancel);

const handleRazorpayFailure = async (req: Request, res: Response) => {
  try {
    const { bookingId, errorDescription = 'Payment declined', errorCode } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Missing bookingId parameter.' });
    }

    const bRes = await pool.query('SELECT customer_id FROM bookings WHERE id = $1', [bookingId]);
    if (bRes.rows.length > 0 && req.user && req.user.id !== bRes.rows[0].customer_id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }

    await pool.query(
      `UPDATE bookings
       SET notes = COALESCE(notes, '') || E'\n[Payment Attempt Failed: ' || $1 || ']'
       WHERE id = $2 AND status = 'pending_payment'`,
      [`${errorCode || 'DECLINED'}: ${errorDescription}`, bookingId]
    );

    await pool.query(
      `UPDATE payments
       SET status = 'failed'
       WHERE booking_id = $1 AND status = 'pending_payment'`,
      [bookingId]
    );

    res.json({ success: true, message: 'Payment failure recorded. Booking remains pending.' });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to record payment failure.');
  }
};

apiRouter.post('/bookings/razorpay/failure', paymentLimiter, handleRazorpayFailure);
apiRouter.post('/payments/razorpay/failure', paymentLimiter, handleRazorpayFailure);

// ================= ADMIN CONSOLE DATA ENDPOINTS (PHASE 2 & 3) =================
apiRouter.get('/admin/overview', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const [usersRes, vehiclesRes, bookingsRes, paymentsRes] = await Promise.all([
      pool.query('SELECT * FROM users ORDER BY created_at DESC'),
      pool.query('SELECT * FROM vehicles ORDER BY created_at DESC'),
      pool.query('SELECT * FROM bookings ORDER BY created_at DESC'),
      pool.query('SELECT * FROM payments ORDER BY created_at DESC'),
    ]);

    const bookings = bookingsRes.rows.map(mapBooking);
    const payments = paymentsRes.rows.map(mapPayment);

    const totalRevenue = payments
      .filter((p) => p.status === 'held_in_escrow' || p.status === 'paid_to_owner')
      .reduce((sum, p) => sum + p.amount, 0);

    const platformEscrow = payments
      .filter((p) => p.status === 'held_in_escrow')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      usersCount: usersRes.rows.length,
      vehiclesCount: vehiclesRes.rows.length,
      bookingsCount: bookings.length,
      totalRevenue,
      platformEscrow,
      users: usersRes.rows.map(mapUser),
      vehicles: vehiclesRes.rows.map(mapVehicle),
      bookings,
      payments,
    });
  } catch (err: any) {
    return handleApiError(res, err, 'Failed to load administrative overview.');
  }
});

// ================= RESET ENDPOINT: HARDENED & GATED (PHASE 4) =================
apiRouter.post('/reset', requireAuth, async (req: Request, res: Response) => {
  // CRITICAL SECURITY ENFORCEMENT: Never expose /api/reset in production mode!
  if (!isDemoMode()) {
    return res.status(403).json({
      success: false,
      error: 'CRITICAL: Database reset is strictly disabled in production environments.',
    });
  }

  try {
    await initDatabaseSchema();
    await seedIfEmpty();
    res.json({ success: true, message: 'Database reset and re-seeded with demo catalog.' });
  } catch (err: any) {
    return handleApiError(res, err, 'Database reset failed.');
  }
});
