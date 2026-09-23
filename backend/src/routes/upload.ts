import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 uploads per minute
  message: { error: 'Too many uploads from this IP, please try again after a minute.' }
});

// Storage setup with secure filename sanitization
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent directory traversal and XSS
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

// Secure Extension Whitelist
const ALLOWED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx',
  '.html', '.json', '.md', '.zip', '.txt'
];

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new AppError('Invalid file type. Upload format is blocked for security.', 400));
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB file limit
  fileFilter
});

import { enqueueDocumentParsing } from '../lib/queue';

// POST: /api/upload (Optional auth with rate limiter for public forms and authenticated builder)
router.post('/', optionalAuthMiddleware, uploadLimiter, (req: AuthenticatedRequest, res: Response, next: any) => {
  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return next(new AppError(`Multer upload error: ${err.message}`, 400));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new AppError('No file uploaded.', 400));
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const jobId = await enqueueDocumentParsing(req.file.path, req.file.mimetype, req.file.originalname, req.file.size);

    return res.status(201).json({
      message: 'File uploaded successfully.',
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      trackingId: jobId || undefined
    });
  });
});

export default router;
