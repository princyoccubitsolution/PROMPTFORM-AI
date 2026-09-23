import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details: any;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;
  
  const response = {
    error: err.message || 'Internal server error occurred',
    statusCode,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack, details: err.details } : {}),
  };

  // Structured logging of unhandled errors
  if (statusCode >= 500) {
    logger.error(`API Error: ${req.method} ${req.originalUrl} | Status ${statusCode} | ${err.message}`, err);
  } else {
    logger.warn(`API Warning: ${req.method} ${req.originalUrl} | Status ${statusCode} | ${err.message}`, { details: err.details });
  }

  return res.status(statusCode).json(response);
};
