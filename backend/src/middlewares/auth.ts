import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    subscriptionPlan: string;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized. Access token is missing or invalid.' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    
    const decoded = jwt.verify(token, jwtSecret) as {
      id: string;
      email: string;
      role: string;
      subscriptionPlan: string;
      sessionToken?: string | null;
    };

    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionPlan: true,
        activeSessionToken: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized. User does not exist.' });
    }

    // Enforce single active session & invalidation on logout
    if (!user.activeSessionToken || user.activeSessionToken !== decoded.sessionToken) {
      return res.status(401).json({
        error: 'SESSION_MISMATCH',
        message: 'You have been logged out because your account is active on another device or the session was ended.'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized. Invalid token.' });
  }
};

export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authMiddleware(req, res, next);
};

export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
  }
  next();
};
