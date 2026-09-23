import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { isUUID, hasFormAccess } from '../lib/utils';
import { AnalyticsService } from '../services/analyticsService';

const router = Router();

// GET: Fetch aggregated analytics for all forms in the user's workspace
router.get('/workspace', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch teams user belongs to
    const memberTeams = await db.teamMember.findMany({
      where: { userId: req.user.id },
      select: { teamId: true }
    });
    const teamIds = memberTeams.map((t: any) => t.teamId);

    // Find all forms
    const forms = await db.form.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { teamId: { in: teamIds } }
        ]
      },
      select: { id: true }
    });
    const formIds = forms.map((f: any) => f.id);

    const range = parseInt(req.query.range as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);

    // Fetch aggregated events
    const events = await (db as any).formEvent.findMany({
      where: {
        formId: { in: formIds },
        createdAt: { gte: startDate }
      }
    });

    const views = events.filter((e: any) => e.eventType === 'VIEW');
    const submissions = events.filter((e: any) => e.eventType === 'SUBMIT');

    const totalViews = views.length;
    const totalSubmissions = submissions.length;
    const completionRate = totalViews > 0 ? parseFloat(((totalSubmissions / totalViews) * 100).toFixed(1)) : 0;

    // Fetch responses for completion time
    const responses = await db.response.findMany({
      where: {
        formId: { in: formIds },
        createdAt: { gte: startDate }
      },
      select: { timeTaken: true }
    });
    const avgTime = responses.length > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.timeTaken, 0) / responses.length)
      : 0;

    // Device counts
    const deviceCount: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    views.forEach((e: any) => {
      if (e.device) deviceCount[e.device] = (deviceCount[e.device] || 0) + 1;
    });

    // Time-series Trend Aggregations (grouped by day)
    const trendData: Record<string, { date: string; views: number; submissions: number }> = {};
    for (let i = range; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendData[dateStr] = { date: dateStr, views: 0, submissions: 0 };
    }

    views.forEach((e: any) => {
      const dStr = e.createdAt.toISOString().split('T')[0];
      if (trendData[dStr]) trendData[dStr].views++;
    });

    submissions.forEach((e: any) => {
      const dStr = e.createdAt.toISOString().split('T')[0];
      if (trendData[dStr]) trendData[dStr].submissions++;
    });

    const trends = Object.values(trendData);

    return res.json({
      totalViews,
      totalSubmissions,
      completionRate,
      averageSubmissionTime: avgTime,
      deviceStats: deviceCount,
      trends
    });
  } catch (error) {
    console.error('Fetch workspace analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Fetch analytics for a form
router.get('/form/:formId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { formId } = req.params;
    const isFormUUID = isUUID(formId);

    let form = null;
    if (isFormUUID) {
      form = await db.form.findUnique({ where: { id: formId } });
    } else {
      form = await db.form.findUnique({ where: { uniqueShareId: formId } });
    }
    if (!form) return res.status(404).json({ error: 'Form not found' });
    const targetFormId = form.id;
    
    if (!(await hasFormAccess(targetFormId, req.user.id, ['admin', 'editor', 'viewer']))) {
      return res.status(403).json({ error: 'Forbidden. You do not have access to this form\'s analytics.' });
    }

    const range = parseInt(req.query.range as string) || 7;
    const metrics = await AnalyticsService.getFormMetrics(targetFormId, range);

    return res.json({
      ...metrics,
      views: metrics.totalViews,
      submissions: metrics.totalSubmissions,
      dropoutRates: {} // legacy fallback
    });
  } catch (error) {
    console.error('Fetch analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Increment views (Public endpoint)
router.post('/form/:formId/view', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    await AnalyticsService.logEvent({
      formId,
      eventType: 'VIEW',
      userAgent,
      ipAddress
    });

    return res.json({ message: 'View registered successfully.' });
  } catch (error) {
    console.error('Log view error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Log form interaction events (START, DROPOUT)
router.post('/form/:formId/event', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const { eventType, questionId } = req.body;

    if (!['START', 'DROPOUT'].includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    await AnalyticsService.logEvent({
      formId,
      eventType,
      questionId,
      userAgent,
      ipAddress
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Log event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
