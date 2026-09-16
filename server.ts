import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { apiRouter } from './server/api';
import { testConnection, initDatabaseSchema } from './server/db';
import { seedIfEmpty } from './server/seed';
import { corsMiddleware, apiLimiter, csrfProtection } from './server/security';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Trust proxy for Cloud Run reverse proxy (enables proper client IP for rate limiting)
  app.set('trust proxy', 1);

  // 2. Disable x-powered-by header
  app.disable('x-powered-by');

  // 3. Apply Helmet security headers
  // - frameguard is disabled to ensure Google AI Studio iframe preview functions
  // - contentSecurityPolicy is disabled to allow external Unsplash vehicle photos and dynamic Vite assets
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      xContentTypeOptions: true,
      xDnsPrefetchControl: { allow: false },
      xDownloadOptions: true,
      xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // 4. Restricted CORS middleware
  app.use(corsMiddleware);

  // 5. Cookie parsing
  app.use(cookieParser());

  // 6. Request body size limit (Strict 100KB limit for JSON and URL-encoded payloads)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 7. Gracefully catch payload size limit violations (HTTP 413)
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        success: false,
        error: 'Payload Too Large: Request body exceeds maximum allowed size limit of 100KB.',
      });
    }
    next(err);
  });

  // 8. General API rate limiter for /api
  app.use('/api', apiLimiter);

  // 9. CSRF protection for cookie-based state-changing endpoints
  app.use('/api', csrfProtection);

  // 10. Mount API router
  app.use('/api', apiRouter);

  // Initialize PostgreSQL database schema & auto-seed
  try {
    console.log('[AutoGO Server] Checking PostgreSQL connection...');
    const conn = await testConnection();
    if (conn.ok) {
      console.log('[AutoGO Server] Connected to PostgreSQL:', conn.version || 'Ready');
      await initDatabaseSchema();
      await seedIfEmpty();
    } else {
      console.warn('[AutoGO Server] Database connection pending/failed:', conn.message);
    }
  } catch (err) {
    console.error('[AutoGO Server] Database initialization error:', err);
  }

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoGO Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
});
