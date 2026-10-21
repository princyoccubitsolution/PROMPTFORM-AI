import { db } from '../lib/db';
import { generateUniqueShareId, isUUID } from '../lib/utils';

export interface QuestionRowInput {
  id?: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
  validations?: any;
  logic?: any;
}

export class FormsService {
  /**
   * Differential replace of a form's questions inside a transaction: updates rows whose UUID is
   * kept, creates new rows, deletes rows that are gone. Preserves question ids so existing
   * responses (answers keyed by question id) stay attached.
   */
  static async replaceQuestionsPreservingIds(tx: any, formId: string, questionsList: QuestionRowInput[], options: { allowClientIds?: boolean } = {}): Promise<void> {
    const existingQuestions = await tx.question.findMany({ where: { formId }, select: { id: true } });
    const existingIds = new Set<string>(existingQuestions.map((q: any) => q.id));
    const incomingIds = new Set<string>(questionsList.filter(q => q.id && isUUID(q.id)).map(q => q.id!));

    const idsToDelete = [...existingIds].filter((eid: string) => !incomingIds.has(eid));
    if (idsToDelete.length > 0) {
      await tx.question.deleteMany({ where: { id: { in: idsToDelete }, formId } });
    }

    for (let idx = 0; idx < questionsList.length; idx++) {
      const q = questionsList[idx];
      const qId = q.id && isUUID(q.id) ? q.id : undefined;
      const data = {
        formId,
        type: q.type,
        label: q.label,
        required: q.required,
        orderIndex: idx,
        options: q.options,
        validations: q.validations ?? {},
        logic: q.logic ?? {}
      };
      if (qId && existingIds.has(qId)) {
        await tx.question.update({ where: { id: qId }, data });
      } else {
        // The builder pre-generates UUIDs for new questions; AI output never supplies new ids.
        await tx.question.create({ data: { ...(qId && options.allowClientIds ? { id: qId } : {}), ...data } });
      }
    }
  }

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
          expires_at: null,
          expiration_message: null,
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
