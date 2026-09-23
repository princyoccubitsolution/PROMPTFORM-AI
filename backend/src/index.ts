import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the current working directory or fallback to the backend directory
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';

// Infrastructure & Middlewares
import { logger } from './lib/logger';
import { bootstrap } from './lib/bootstrap';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler, AppError } from './middlewares/errorHandler';

// Routes
import authRouter from './routes/auth';
import formsRouter from './routes/forms';
import aiRouter from './routes/ai';
import uploadRouter from './routes/upload';
import teamsRouter from './routes/teams';
import workflowsRouter from './routes/workflows';
import analyticsRouter from './routes/analytics';
import templatesRouter from './routes/templates';

import { db } from './lib/db';
import { cache } from './lib/cache';

const app = express();
const PORT = Number(process.env.PORT || 5050);

// Enable Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false // Allows files to be fetched from public folders by frontend
}));

// CORS Configuration with strict environment-aware whitelists
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean) as string[]
  : ['http://localhost:4500', 'http://127.0.0.1:4500', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5050', 'http://127.0.0.1:5050'];

const isLocalOrigin = (origin: string): boolean => {
  if (process.env.NODE_ENV === 'production') {
    return allowedOrigins.includes(origin);
  }
  return (
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    allowedOrigins.includes(origin)
  );
};

// Immediate rejection middleware for non-matching Origin headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !isLocalOrigin(origin)) {
    logger.warn(`CORS Blocking request from unauthorized origin: ${origin}`);
    return res.status(403).json({ error: 'CORS Blocked: Origin not authorized.' });
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isLocalOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Structured Request/Response Logger
app.use(requestLogger);

// Payload size limit configurations
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static route for uploaded files
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(publicDir, 'uploads')));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // relaxed limit for general API routes
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

// Strict rate limiters for critical public endpoints
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // max 15 submissions per minute per IP
  message: { error: 'Too many submissions. Please wait a minute before trying again.' }
});
app.use('/api/forms/:id/submit', submissionLimiter);

const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // relaxed limit for active usage (60 requests per minute)
  message: { error: 'Too many AI generation requests. Please wait a minute before trying again.' }
});
app.use('/api/ai', aiGenerationLimiter);

// Mount Application Routes
app.use('/api/auth', authRouter);
app.use('/api/forms', formsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/templates', templatesRouter);

// Root welcome message
app.get('/', (req: Request, res: Response) => {
  return res.json({
    message: "PromptForm AI REST API Server is running successfully.",
    frontendUrl: "http://127.0.0.1:4500",
    healthCheck: `http://127.0.0.1:${PORT}/health`
  });
});

// Health Checks
app.get('/health', async (req: Request, res: Response) => {
  try {
    await db.$queryRaw`SELECT 1`;
    await cache.set('health_check', 'ok', 5);
    const cacheStatus = await cache.get('health_check');

    return res.json({
      status: 'healthy',
      database: 'connected',
      cache: cacheStatus === 'ok' ? 'connected' : 'fallback_memory',
      timestamp: new Date()
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Liveness Probe (process is up)
app.get('/health/liveness', (req: Request, res: Response) => {
  return res.status(200).json({ status: 'alive', timestamp: new Date() });
});

// Readiness Probe (DB/Redis ready to handle requests)
app.get('/health/readiness', async (req: Request, res: Response) => {
  try {
    await db.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ready', timestamp: new Date() });
  } catch (err: any) {
    logger.error('Readiness probe failed:', err);
    return res.status(503).json({ status: 'not_ready', error: err.message });
  }
});

// Catch-all route for unmatched endpoints (404 Error)
app.use((req: Request, res: Response, next) => {
  const errorMsg = `Endpoint '${req.method} ${req.originalUrl}' was not found on this server. Please verify the API route path and HTTP method.`;
  next(new AppError(errorMsg, 404));
});

// Global Error Handler Middleware
app.use(errorHandler);

async function startServer() {
  // Execute bootstrap diagnostics
  await bootstrap(app, PORT);

  let listenAttempts = 0;
  let server: any;

  const tryListen = () => {
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.system(`[PromptForm AI Backend] Server running and accepting requests on http://127.0.0.1:${PORT}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        listenAttempts++;
        if (listenAttempts <= 3) {
          logger.warn(`[PromptForm AI Backend] Port ${PORT} is in use by another process. Retrying (${listenAttempts}/3) in 1.5s...`);
          setTimeout(() => {
            try { server.close(); } catch (e) {}
            tryListen();
          }, 1500);
        } else {
          logger.error(`[PromptForm AI Backend] Port ${PORT} is occupied. Stopped retry loop. Kill existing process on port ${PORT} to start server.`);
        }
      } else {
        logger.error('Server listen error:', err);
      }
    });
  };

  tryListen();

  // Graceful shutdowns
  const shutdown = () => {
    logger.system('Shutting down server connection socket channels gracefully...');
    server.close(async () => {
      logger.system('Express HTTP server closed.');
      try {
        await db.$disconnect();
        logger.db('Database connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during database disconnect:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  logger.error('Startup failed:', err);
  process.exit(1);
});
