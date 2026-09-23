import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { registerSchema, loginSchema } from '@promptform/shared';

const router = Router();

const jwtSecret = process.env.JWT_SECRET!;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;

// Helper to generate tokens
const generateTokens = (user: { id: string; email: string; role: string; subscriptionPlan: string; activeSessionToken?: string | null }) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    subscriptionPlan: user.subscriptionPlan,
    sessionToken: user.activeSessionToken || null,
  };
  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: user.id, sessionToken: user.activeSessionToken || null }, jwtRefreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Register Route
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);
    
    const existingUser = await db.user.findUnique({
      where: { email: body.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const sessionToken = crypto.randomUUID();
    const user = await db.user.create({
      data: {
        email: body.email,
        name: body.name || null,
        password: hashedPassword,
        role: 'user',
        subscriptionPlan: 'free',
        credits: 100, // Initial AI credits
        activeSessionToken: sessionToken
      }
    });

    const tokens = generateTokens(user);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        credits: user.credits,
      },
      isNewUser: true,
      ...tokens
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login Route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    // Google OAuth Sign In Flow
    if (body.idToken) {
      const { idToken } = body;
      let email = '';
      let name = '';

      if (idToken.startsWith('mock_')) {
        email = idToken.replace('mock_', '') + '@gmail.com';
        name = idToken.replace('mock_', '').replace('_', ' ');
      } else {
        try {
          const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
          if (!googleResponse.ok) {
            if (process.env.NODE_ENV !== 'production') {
              email = 'demo_google_user@gmail.com';
              name = 'Demo Google User';
            } else {
              return res.status(400).json({ error: 'Invalid Google OAuth Token' });
            }
          } else {
            const payload = (await googleResponse.json()) as { email: string; name?: string };
            email = payload.email;
            name = payload.name || payload.email.split('@')[0];
          }
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            email = 'offline_google_user@gmail.com';
            name = 'Offline Google User';
          } else {
            return res.status(400).json({ error: 'Google verification service is offline' });
          }
        }
      }

      let user = await db.user.findUnique({
        where: { email }
      });

      const sessionToken = crypto.randomUUID();
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        const randomPassword = await bcrypt.hash(Math.random().toString(36).substring(2, 15), 10);
        user = await db.user.create({
          data: {
            email,
            name,
            password: randomPassword,
            role: 'user',
            subscriptionPlan: 'free',
            credits: 100,
            activeSessionToken: sessionToken
          }
        });
      } else {
        user = await db.user.update({
          where: { id: user.id },
          data: { activeSessionToken: sessionToken }
        });
      }

      const tokens = generateTokens(user);

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionPlan: user.subscriptionPlan,
          credits: user.credits,
        },
        isNewUser,
        ...tokens
      });
    }

    // Email/Password Sign In Flow
    let user = await db.user.findUnique({
      where: { email: body.email }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(body.password!, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const sessionToken = crypto.randomUUID();
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { activeSessionToken: sessionToken }
    });

    const tokens = generateTokens(updatedUser);

    return res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        subscriptionPlan: updatedUser.subscriptionPlan,
        credits: updatedUser.credits,
      },
      isNewUser: false,
      ...tokens
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile / Current User Profile endpoint handler
const profileHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionPlan: true,
        credits: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/me', authMiddleware, profileHandler);
router.get('/profile', authMiddleware, profileHandler);

// Upgrade to PRO Route
router.post('/upgrade', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { plan, billingPeriod, amount, paymentMethod, couponCode, currency } = req.body;
    const selectedPlan = plan || 'pro';
    
    const updatedUser = await db.user.update({
      where: { id: req.user.id },
      data: {
        subscriptionPlan: selectedPlan,
        credits: { increment: selectedPlan === 'enterprise' ? 1000 : 500 }
      }
    });

    const receiptNumber = 'REC-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Verify and update coupon usage if provided
    if (couponCode) {
      try {
      const dbCoupon = await (db as any).coupon.findUnique({
          where: { code: couponCode.trim().toUpperCase() }
        });
        if (dbCoupon && dbCoupon.isActive) {
          await (db as any).coupon.update({
            where: { id: dbCoupon.id },
            data: { usedCount: { increment: 1 } }
          });
        }
      } catch (err) {
        console.error('Failed to update coupon usage logs:', err);
      }
    }

    // Log the transaction in the database
    let dbTransaction = null;
    try {
      // @ts-ignore
      dbTransaction = await db.transaction.create({
        data: {
          userId: req.user.id,
          plan: selectedPlan,
          billingPeriod: billingPeriod || 'monthly',
          amount: parseFloat(amount || '19.00'),
          currency: currency || 'USD',
          paymentMethod: paymentMethod || 'card',
          status: 'success',
          couponCode: couponCode || null,
          receiptNumber
        }
      });
    } catch (dbErr) {
      console.error('Failed to log transaction in database:', dbErr);
    }

    const tokens = generateTokens(updatedUser);

    return res.json({
      message: `Successfully upgraded to ${selectedPlan.toUpperCase()} plan!`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        subscriptionPlan: updatedUser.subscriptionPlan,
        credits: updatedUser.credits,
      },
      transaction: dbTransaction || {
        plan: selectedPlan,
        billingPeriod: billingPeriod || 'monthly',
        amount: parseFloat(amount || '19.00'),
        paymentMethod: paymentMethod || 'card',
        receiptNumber,
        createdAt: new Date()
      },
      ...tokens
    });
  } catch (error) {
    console.error('Upgrade route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh Token Route
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { id: string; sessionToken?: string | null };
    
    const user = await db.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    if (user.activeSessionToken && decoded.sessionToken !== user.activeSessionToken) {
      return res.status(401).json({ error: 'SESSION_MISMATCH', message: 'Session expired' });
    }

    const tokens = generateTokens(user);

    return res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// Fetch user transaction history
router.get('/transactions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const transactions = await db.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(transactions);
  } catch (error) {
    console.error('Fetch transactions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout Route
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user) {
      await db.user.update({
        where: { id: req.user.id },
        data: { activeSessionToken: null }
      });
    }
  } catch (err) {
    console.error('Logout session cleanup failed:', err);
  }
  return res.json({ message: 'Logged out successfully. Please discard access and refresh tokens.' });
});

// Seed default PROMPT50 coupon once at module load
let _couponSeeded = false;
async function seedDefaultCoupons() {
  if (_couponSeeded) return;
  _couponSeeded = true;
  try {
    const count = await (db as any).coupon.count();
    if (count === 0) {
      await (db as any).coupon.create({
        data: {
          code: 'PROMPT50',
          discountPercent: 50.0
        }
      });
    }
  } catch (err) {
    _couponSeeded = false; // allow retry on failure
    console.error('Failed to seed default coupons:', err);
  }
}
// Run seed asynchronously on module load (non-blocking)
seedDefaultCoupons();

// Fetch all coupons (Admin Only)
router.get('/coupons', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const coupons = await (db as any).coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(coupons);
  } catch (error) {
    console.error('Fetch coupons error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new coupon (Admin Only)
router.post('/coupons', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    const { code, discountPercent } = req.body;
    if (!code || isNaN(parseFloat(discountPercent))) {
      return res.status(400).json({ error: 'Coupon code and discount percentage are required.' });
    }
    const cleanCode = code.trim().toUpperCase();
    const existing = await (db as any).coupon.findUnique({
      where: { code: cleanCode }
    });
    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists.' });
    }
    const newCoupon = await (db as any).coupon.create({
      data: {
        code: cleanCode,
        discountPercent: parseFloat(discountPercent)
      }
    });
    return res.json(newCoupon);
  } catch (error) {
    console.error('Create coupon error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete coupon (Admin Only)
router.delete('/coupons/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    const { id } = req.params;
    await (db as any).coupon.delete({
      where: { id }
    });
    return res.json({ message: 'Coupon deleted successfully.' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate coupon public endpoint
router.post('/coupons/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await (db as any).coupon.findUnique({
      where: { code: cleanCode }
    });
    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ error: 'Invalid or inactive coupon code.' });
    }
    return res.json({
      success: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
