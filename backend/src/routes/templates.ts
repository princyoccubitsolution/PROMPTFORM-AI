import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

const createTemplateSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.string(), // "education", "business", "feedback", "personal"
  structure: z.record(z.any()), // JSON representation of questions + settings
  thumbnail: z.string().optional(),
});

// GET: List all marketplace templates
router.get('/', async (req, res) => {
  try {
    const templates = await db.template.findMany({
      orderBy: { category: 'asc' }
    });
    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Get individual template details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await db.template.findUnique({
      where: { id }
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Add new template (Admin privilege only)
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin credentials required.' });
    }

    const body = createTemplateSchema.parse(req.body);

    const template = await db.template.create({
      data: {
        title: body.title,
        description: body.description || "",
        category: body.category,
        structure: body.structure,
        thumbnail: body.thumbnail || null
      }
    });

    return res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
