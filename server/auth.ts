import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from './db';
import { generateCsrfToken, setCsrfCookie } from './security';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'autogo-production-secure-session-key-2026-strict';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'owner' | 'admin';
  profileImage: string;
  bio?: string;
  rating?: number;
  totalTrips?: number;
  createdAt: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser | null;
    }
  }
}

export function generateToken(user: { id: string; email: string; role: string; name: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function setAuthCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('autogo_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
  // Provide CSRF cookie for client double-submit verification
  setCsrfCookie(res, generateCsrfToken());
}

export function clearAuthCookie(res: Response) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('autogo_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie('autogo_csrf_token', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Authentication Middleware: Extracts token from Cookie or Authorization header.
 * Attaches verified user to req.user.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.autogo_token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; name: string };
    
    // Always query database to ensure user still exists and role is fresh
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      req.user = null;
      return next();
    }

    const row = result.rows[0];
    req.user = {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role as 'customer' | 'owner' | 'admin',
      profileImage: row.profile_image || '',
      bio: row.bio || '',
      rating: parseFloat(row.rating || 5.0),
      totalTrips: parseInt(row.total_trips || 0, 10),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };

    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

/**
 * Guard Middleware: Requires user to be authenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to access this resource.',
    });
  }
  next();
}

/**
 * Guard Middleware: Requires user to have at least one of the specified roles.
 */
export function requireRole(...allowedRoles: ('customer' | 'owner' | 'admin')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to continue.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You do not have the required role (${allowedRoles.join(' or ')}) to perform this action.`,
      });
    }

    next();
  };
}
