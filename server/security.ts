import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import cors, { CorsOptions } from 'cors';
import crypto from 'crypto';

/**
 * ==========================================================
 * 1. API RATE LIMITING (express-rate-limit)
 * ==========================================================
 */

// General API rate limiter for all /api endpoints
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 180, // Limit each IP to 180 requests per minute
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    error: 'Too many requests from this connection. Please wait a moment before trying again.',
  },
});

// Stricter rate limiter for authentication endpoints (prevent brute-force attacks)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 25, // Limit each IP to 25 login/register attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

// Stricter rate limiter for Razorpay test mode payment & checkout endpoints
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 40, // Limit each IP to 40 payment actions per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many payment operations. Please wait a few moments before trying again.',
  },
});

/**
 * ==========================================================
 * 2. RESTRICTED CORS CONFIGURATION
 * ==========================================================
 */

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /\.run\.app$/,
  /\.google\.com$/,
  /\.ai\.studio$/,
];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin header (such as same-origin browser fetches, mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
    if (isAllowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin not permitted: ${origin}`);
      callback(new Error('Cross-Origin Request Blocked by AutoGO Security Policy.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours preflight cache
};

export const corsMiddleware = cors(corsOptions);

/**
 * ==========================================================
 * 3. CSRF PROTECTION FOR COOKIE-BASED AUTHENTICATION
 * ==========================================================
 */

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('autogo_csrf_token', token, {
    httpOnly: false, // Must be readable by client for double-submit header
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * State-changing request CSRF protection middleware.
 * - Safe methods (GET, HEAD, OPTIONS) pass unconditionally.
 * - Requests with 'Authorization: Bearer' pass unconditionally (immune to browser ambient CSRF).
 * - For cookie-authenticated mutation requests (POST, PUT, DELETE, PATCH), validates:
 *   1. Custom header 'X-Requested-With: XMLHttpRequest', OR
 *   2. Custom header 'X-CSRF-Token' matching the CSRF cookie or session.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();

  // Safe HTTP methods do not change state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Exempt public unauthenticated onboarding routes
  const exemptPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/demo-switch',
    '/api/auth/logout',
  ];

  if (exemptPaths.some((p) => req.path.startsWith(p) || req.originalUrl.startsWith(p))) {
    return next();
  }

  // Authorization: Bearer requests are explicitly sent via JavaScript and immune to cross-site ambient CSRF
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If user is authenticated via cookie, require custom header verification
  const hasCookieAuth = Boolean(req.cookies?.autogo_token);
  if (hasCookieAuth) {
    const requestedWith = req.headers['x-requested-with'];
    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = req.cookies?.autogo_csrf_token;

    const hasValidRequestedWith =
      typeof requestedWith === 'string' && requestedWith.toLowerCase() === 'xmlhttprequest';
    const hasMatchingCsrfToken =
      Boolean(csrfHeader && csrfCookie && csrfHeader === csrfCookie);

    if (!hasValidRequestedWith && !hasMatchingCsrfToken) {
      console.warn(`[CSRF Blocked] State-changing ${method} request blocked for path: ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        error: 'Security verification failed: State-changing request requires valid custom security header.',
      });
    }
  }

  next();
}

/**
 * ==========================================================
 * 4. SANITIZED API 500-ERROR RESPONSES & SERVER-ONLY LOGGING
 * ==========================================================
 */

/**
 * Handles server errors safely:
 * - Logs raw error details, SQL queries, codes, and stack traces exclusively to server logs.
 * - Sends a clean, sanitized message to the client, preventing leakage of database hostnames,
 *   table names, internal file paths, or PostgreSQL driver errors.
 */
export function handleApiError(
  res: Response,
  err: any,
  clientFallbackMessage = 'An unexpected server error occurred. Please try again later.'
) {
  // Detailed diagnostic info kept strictly server-side
  console.error('[AutoGO Server Error - Diagnostic Log]:', {
    timestamp: new Date().toISOString(),
    message: err?.message,
    code: err?.code,
    detail: err?.detail,
    hint: err?.hint,
    table: err?.table,
    column: err?.column,
    stack: err?.stack,
  });

  // Sanitized client response
  return res.status(500).json({
    success: false,
    error: clientFallbackMessage,
  });
}
