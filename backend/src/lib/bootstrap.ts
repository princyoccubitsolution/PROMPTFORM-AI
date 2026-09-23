import fs from 'fs';
import path from 'path';
import net from 'net';
import { db } from './db';
import { initCache } from './cache';
import { logger } from './logger';
import { Express } from 'express';

export async function bootstrap(app: Express, port: number): Promise<void> {
  logger.system('=== [PromptForm AI Backend] Starting Bootstrap Sequence ===');

  // 1. Validate Environment Variables
  const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingEnv = requiredEnv.filter((env) => !process.env[env]);
  
  if (missingEnv.length > 0) {
    logger.error(`BOOTSTRAP ERROR: Missing critical environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }
  logger.info('Environment variables validated successfully.');

  // 2. Validate Database Connection & Schemas
  const maxAttempts = 15;
  const delayMs = 2000;
  let dbConnected = false;

  logger.info('Validating database connectivity...');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db.$queryRaw`SELECT 1`;
      logger.db('Database connection verified successfully.');
      
      // Probe key tables
      const userCount = await db.user.count();
      logger.db(`Database tables probe success. Users count: ${userCount}`);
      dbConnected = true;
      break;
    } catch (err: any) {
      logger.warn(`Database connection attempt ${attempt}/${maxAttempts} failed. Retrying in ${delayMs / 1000}s... Error: ${err.message}`);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        logger.error('BOOTSTRAP ERROR: Database connection failed after maximum attempts. Verify DATABASE_URL or database server status.', err);
        process.exit(1);
      }
    }
  }

  // 3. Validate Redis Connection
  try {
    await initCache();
  } catch (err: any) {
    logger.error('BOOTSTRAP ERROR: Redis connection failed. Redis is required for production caching.', err);
    process.exit(1);
  }

  // 4. Validate Public Uploads Folder
  const uploadsDir = path.join(__dirname, '../../public/uploads');
  try {
    logger.info('Validating uploads directory write access...');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const tempFile = path.join(uploadsDir, `.write_test_${Date.now()}`);
    fs.writeFileSync(tempFile, 'write_test');
    fs.unlinkSync(tempFile);
    logger.info(`Uploads folder write privileges verified: ${uploadsDir}`);
  } catch (err: any) {
    logger.error(`BOOTSTRAP ERROR: File system write access failed at ${uploadsDir}. Check file permissions.`, err);
    process.exit(1);
  }

  // 5. Validate Port Availability
  await new Promise<void>((resolve) => {
    logger.info(`Validating port availability: ${port}...`);
    const server = net.createServer();
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`Port ${port} check noticed active socket or restart. Proceeding...`);
        resolve();
      } else {
        logger.warn(`Port check notice: ${err.message}`);
        resolve();
      }
    });

    server.once('listening', () => {
      server.close(() => {
        logger.info(`Port ${port} is free and available.`);
        resolve();
      });
    });

    server.listen(port, '0.0.0.0');
  });

  // 6. Validate Express Routes
  logger.info('Parsing Express route registration tables...');
  const routes: string[] = [];
  
  function printRoutes(stack: any[], prefix = '') {
    stack.forEach((val) => {
      if (val.route) {
        const methods = Object.keys(val.route.methods).join(',').toUpperCase();
        routes.push(`${methods.padEnd(6)} | ${prefix}${val.route.path}`);
      } else if (val.name === 'router' && val.handle.stack) {
        let routerPath = val.regexp.toString()
          .replace('/^\\', '')
          .replace('\\/?(?=\\/|$)/i', '')
          .replace(/\\\//g, '/');
        // Clean regex noise
        routerPath = routerPath.substring(0, routerPath.indexOf('?'));
        printRoutes(val.handle.stack, prefix + routerPath);
      }
    });
  }

  printRoutes(app._router.stack);
  logger.info(`Successfully parsed ${routes.length} active routes:`, routes);

  logger.system('=== [PromptForm AI Backend] Bootstrap Sequence Completed Successfully ===');
}
