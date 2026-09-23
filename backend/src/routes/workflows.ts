import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { isUUID, hasFormAccess } from '../lib/utils';

const router = Router();

const createWorkflowSchema = z.object({
  formId: z.string(),
  trigger: z.string(), // "on_submit", "on_score_threshold", etc.
  action: z.string(), // "send_email", "send_webhook", "slack_notify"
  config: z.record(z.any()), // e.g. { webhook_url, email_recipient }
  active: z.boolean().default(true)
});

const updateWorkflowSchema = z.object({
  trigger: z.string().optional(),
  action: z.string().optional(),
  config: z.record(z.any()).optional(),
  active: z.boolean().optional()
});



// GET: Workflows of a form
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

    if (!(await hasFormAccess(form.id, req.user.id, ['admin', 'editor', 'viewer']))) {
      return res.status(403).json({ error: 'Forbidden. You do not have access to this form.' });
    }

    const workflows = await db.workflow.findMany({
      where: { formId: form.id }
    });

    return res.json(workflows);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Create workflow
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const body = createWorkflowSchema.parse(req.body);

    const hasAccess = await hasFormAccess(body.formId, req.user.id, ['admin', 'editor']);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden. Edit privileges required.' });
    }

    const workflow = await db.workflow.create({
      data: {
        formId: body.formId,
        trigger: body.trigger,
        action: body.action,
        config: body.config,
        active: body.active
      }
    });

    return res.status(201).json(workflow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update workflow
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const body = updateWorkflowSchema.parse(req.body);

    const workflow = await db.workflow.findUnique({ where: { id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const hasAccess = await hasFormAccess(workflow.formId, req.user.id, ['admin', 'editor']);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden. Edit privileges required.' });
    }

    const updatedWorkflow = await db.workflow.update({
      where: { id },
      data: {
        trigger: body.trigger,
        action: body.action,
        config: body.config,
        active: body.active
      }
    });

    return res.json(updatedWorkflow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Delete workflow
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const workflow = await db.workflow.findUnique({ where: { id } });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const hasAccess = await hasFormAccess(workflow.formId, req.user.id, ['admin', 'editor']);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden. Edit privileges required.' });
    }

    await db.workflow.delete({ where: { id } });
    return res.json({ message: 'Workflow deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
