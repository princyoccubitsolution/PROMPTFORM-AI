import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  
  // Capture response properties on finish
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const contentLength = res.get('Content-Length') || '0';
    
    const message = `${req.method} ${req.originalUrl} | Status ${res.statusCode} | Latency ${timeInMs}ms | Size ${contentLength} bytes`;
    
    const logDetails = {
      ip: req.ip || req.socket.remoteAddress,
      query: req.query,
      body: req.body, // Logger automatically sanitizes passwords/tokens
      headers: {
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
      }
    };

    if (res.statusCode >= 500) {
      logger.error(`Response Fail: ${message}`, undefined, logDetails);
    } else if (res.statusCode >= 400) {
      logger.warn(`Response Warning: ${message}`, logDetails);
    } else {
      logger.info(`Response Success: ${message}`, logDetails);
    }
  });

  next();
};
