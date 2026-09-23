import { db } from '../lib/db';
import { generateUniqueShareId } from '../lib/utils';

export class FormsService {
  /**
   * Creates a new form along with its initial view analytics.
   */
  static async createForm(
    userId: string,
    data: {
      title: string;
      description?: string;
      teamId?: string | null;
      isPublic?: boolean;
      responseLimit?: number | null;
      settings?: any;
      theme?: any;
    }
  ) {
    const code = await generateUniqueShareId();
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:4500';
    const publicUrl = `${frontendBaseUrl}/f/${code}`;

    const form = await db.form.create({
      data: {
        title: data.title,
        description: data.description || "",
        status: "DRAFT",
        ownerId: userId,
        teamId: data.teamId || null,
        uniqueShareId: code,
        publicUrl: publicUrl,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        responseLimit: data.responseLimit || null,
        settings: data.settings || {
          collect_emails: false,
          limit_responses: false,
          password: null,
          allow_editing: false,
          shuffle_questions: false,
          timer_limit: 0,
          anti_cheat_detection: false,
          team_members_only: false,
          invited_only: false,
          invited_emails: []
        },
        theme: data.theme || {
          primary_color: "#6366f1",
          background_color: "#f3f4f6",
          font_family: "Inter",
          logo_url: null
        }
      }
    });

    // Initialize baseline view analytics
    await db.analytics.create({
      data: {
        formId: form.id,
        views: 0,
        submissions: 0,
        deviceStats: { desktop: 0, mobile: 0, tablet: 0 },
        countryStats: {},
        dropoutRates: {}
      }
    });

    return form;
  }
}
