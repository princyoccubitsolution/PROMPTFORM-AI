import { Response, NextFunction } from 'express';
import { db } from '../lib/db';
import { AuthenticatedRequest } from './auth';

// Central limits configuration
export const SUBSCRIPTION_CONFIG = {
  FREE_PLAN_MAX_FORMS: 5,
  FREE_PLAN_TRIAL_DAYS: 14,
};

export async function subscriptionMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await db.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // PRO and ENTERPRISE subscribers and Admin roles have no restrictions
    if (user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'enterprise' || user.role === 'admin') {
      return next();
    }

    // Calculate forms count
    const formCount = await db.form.count({
      where: { ownerId: user.id }
    });

    // Calculate account age in days
    const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
    const trialExpired = accountAgeDays > SUBSCRIPTION_CONFIG.FREE_PLAN_TRIAL_DAYS;

    if (trialExpired) {
      return res.status(403).json({
        status: 'restricted',
        reason: 'TRIAL_EXPIRED',
        message: `Your ${SUBSCRIPTION_CONFIG.FREE_PLAN_TRIAL_DAYS}-day free trial has expired. Please upgrade to PRO to continue using AI features.`,
        plan: 'free',
        upgradeRequired: true,
        trialExpired: true
      });
    }

    if (formCount >= SUBSCRIPTION_CONFIG.FREE_PLAN_MAX_FORMS) {
      return res.status(403).json({
        status: 'restricted',
        reason: 'LIMIT_REACHED',
        message: `You have reached the free limit of ${SUBSCRIPTION_CONFIG.FREE_PLAN_MAX_FORMS} forms. Please upgrade to PRO to create more forms.`,
        plan: 'free',
        remainingLimits: 0,
        upgradeRequired: true,
        trialExpired: false
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error checking subscription limits.' });
  }
}
