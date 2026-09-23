import { db } from '../lib/db';
import { isUUID } from '../lib/utils';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

export class AnalyticsService {
  /**
   * Logs a form event (VIEW, START, SUBMIT, DROPOUT).
   */
  static async logEvent(params: {
    formId: string;
    eventType: 'VIEW' | 'START' | 'SUBMIT' | 'DROPOUT';
    questionId?: string | null;
    userAgent: string;
    ipAddress?: string | null;
  }) {
    try {
      const isFormUUID = isUUID(params.formId);
      let formId = params.formId;
      if (!isFormUUID) {
        const form = await db.form.findUnique({ where: { uniqueShareId: params.formId } });
        if (!form) return;
        formId = form.id;
      }

      // Parse user agent to detect device
      const parser = new UAParser(params.userAgent);
      const deviceType = parser.getDevice().type; // "mobile", "tablet", undefined
      const device = deviceType === 'mobile' ? 'mobile' : deviceType === 'tablet' ? 'tablet' : 'desktop';

      // Parse IP to detect country code
      let country = 'US'; // Default fallback
      if (params.ipAddress && params.ipAddress !== '127.0.0.1' && params.ipAddress !== '::1') {
        const geo = geoip.lookup(params.ipAddress);
        if (geo && geo.country) {
          country = geo.country;
        }
      }

      // 1. Create the event log
      await db.$executeRawUnsafe(
        `INSERT INTO "FormEvent" (id, "formId", "eventType", "questionId", device, country, "ipAddress", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
        formId,
        params.eventType,
        params.questionId || null,
        device,
        country,
        params.ipAddress || null
      );

      // 2. Perform daily rollup mapping for faster historical dashboard loads
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Upsert daily metric record
      const metric = await (db as any).formDailyMetric.findUnique({
        where: {
          formId_date: {
            formId: formId,
            date: today
          }
        }
      });

      if (!metric) {
        await (db as any).formDailyMetric.create({
          data: {
            formId: formId,
            date: today,
            views: params.eventType === 'VIEW' ? 1 : 0,
            submissions: params.eventType === 'SUBMIT' ? 1 : 0,
            deviceStats: { [device]: 1 },
            countryStats: { [country]: 1 }
          }
        });
      } else {
        const deviceStats = (metric.deviceStats as Record<string, number>) || {};
        deviceStats[device] = (deviceStats[device] || 0) + 1;

        const countryStats = (metric.countryStats as Record<string, number>) || {};
        countryStats[country] = (countryStats[country] || 0) + 1;

        await (db as any).formDailyMetric.update({
          where: { id: metric.id },
          data: {
            views: params.eventType === 'VIEW' ? { increment: 1 } : undefined,
            submissions: params.eventType === 'SUBMIT' ? { increment: 1 } : undefined,
            deviceStats,
            countryStats
          }
        });
      }
    } catch (err) {
      console.error('Failed to log form event:', err);
    }
  }

  /**
   * Computes aggregate metrics, dropout funnels, and time-series trends.
   */
  static async getFormMetrics(formId: string, rangeDays: number = 7) {
    const isFormUUID = isUUID(formId);
    const form = await db.form.findFirst({
      where: isFormUUID ? { id: formId } : { uniqueShareId: formId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    });
    if (!form) throw new Error('Form not found');

    const targetFormId = form.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);

    // 1. Fetch time range events
    const events = await (db as any).formEvent.findMany({
      where: {
        formId: targetFormId,
        createdAt: { gte: startDate }
      }
    });

    const views = events.filter((e: any) => e.eventType === 'VIEW');
    const submissions = events.filter((e: any) => e.eventType === 'SUBMIT');

    const totalViews = views.length;
    const totalSubmissions = submissions.length;
    const completionRate = totalViews > 0 ? parseFloat(((totalSubmissions / totalViews) * 100).toFixed(1)) : 0;

    // 2. Fetch responses for completing time calculations
    const responses = await db.response.findMany({
      where: {
        formId: targetFormId,
        createdAt: { gte: startDate }
      },
      select: { timeTaken: true }
    });
    const avgTime = responses.length > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.timeTaken, 0) / responses.length)
      : 0;

    // 3. Device Stats Grouping
    const deviceCount: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    views.forEach((e: any) => {
      if (e.device) deviceCount[e.device] = (deviceCount[e.device] || 0) + 1;
    });

    // 4. Country Stats Grouping
    const countryCount: Record<string, number> = {};
    views.forEach((e: any) => {
      if (e.country) countryCount[e.country] = (countryCount[e.country] || 0) + 1;
    });

    // 5. Time-Series Trend Aggregations (grouped by day)
    const trendData: Record<string, { date: string; views: number; submissions: number }> = {};
    
    // Initialize day map buckets
    for (let i = rangeDays; i >= 0; i--) {
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

    // 6. Funnel / Dropouts Aggregations
    const dropoutsMap: Record<string, number> = {};
    events.filter((e: any) => e.eventType === 'DROPOUT').forEach((e: any) => {
      if (e.questionId) {
        dropoutsMap[e.questionId] = (dropoutsMap[e.questionId] || 0) + 1;
      }
    });

    // Construct Funnel rates step-by-step
    const funnelSteps: Array<{ stepName: string; count: number; percentage: number }> = [];
    funnelSteps.push({
      stepName: 'Total Views',
      count: totalViews,
      percentage: 100
    });

    let currentRemaining = totalViews;
    form.questions.forEach((q) => {
      const dropouts = dropoutsMap[q.id] || 0;
      currentRemaining = Math.max(0, currentRemaining - dropouts);
      const pct = totalViews > 0 ? Math.round((currentRemaining / totalViews) * 100) : 0;
      funnelSteps.push({
        stepName: q.label,
        count: currentRemaining,
        percentage: pct
      });
    });

    funnelSteps.push({
      stepName: 'Submissions',
      count: totalSubmissions,
      percentage: totalViews > 0 ? Math.round((totalSubmissions / totalViews) * 100) : 0
    });

    return {
      totalViews,
      totalSubmissions,
      completionRate,
      averageSubmissionTime: avgTime,
      deviceStats: deviceCount,
      countryStats: countryCount,
      trends,
      funnel: funnelSteps
    };
  }
}
