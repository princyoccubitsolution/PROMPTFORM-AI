import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from './logger';
import { parseDocument } from './documentParser';
import { cache } from './cache';
import fs from 'fs';
import path from 'path';

const disableRedis = process.env.DISABLE_REDIS === 'true';
const redisUrl = disableRedis ? null : (process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Construct ConnectionOptions for BullMQ (which uses ioredis)
let connectionOpts: any = null;
if (redisUrl) {
  try {
    const parsedUrl = new URL(redisUrl);
    connectionOpts = {
      host: parsedUrl.hostname || '127.0.0.1',
      port: Number(parsedUrl.port) || 6379,
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
    };
  } catch (err) {
    logger.error('Failed to parse REDIS_URL for BullMQ, falling back to defaults:', err);
    connectionOpts = { host: '127.0.0.1', port: 6379 };
  }
}

const QUEUE_NAME = 'document-parsing';

export const documentQueue = connectionOpts
  ? new Queue(QUEUE_NAME, { connection: connectionOpts })
  : null;

if (documentQueue) {
  documentQueue.on('error', (err) => {
    logger.debug('BullMQ Queue connection warning (Redis is down): ' + err.message);
  });
}

export const queueEvents = connectionOpts
  ? new QueueEvents(QUEUE_NAME, { connection: connectionOpts })
  : null;

if (queueEvents) {
  queueEvents.on('error', (err) => {
    logger.debug('BullMQ QueueEvents connection warning (Redis is down): ' + err.message);
  });
}

let worker: Worker | null = null;

if (connectionOpts) {
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { filePath, mimeType, cacheKey } = job.data;
      logger.info(`[Worker] Started processing document parsing job ${job.id} for path: ${filePath}`);
      
      try {
        // Resolve path to make sure it's absolute
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.join(__dirname, '../../', filePath);
        
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`File not found at path: ${absolutePath}`);
        }
        
        const fileBuffer = fs.readFileSync(absolutePath);
        const parsedText = await parseDocument(fileBuffer, mimeType);
        
        // Cache the result in Redis
        await cache.set(cacheKey, parsedText, 3600 * 24); // cache for 24 hours
        
        logger.info(`[Worker] Successfully completed job ${job.id}. Cached under key: ${cacheKey}`);
        return parsedText;
      } catch (err: any) {
        logger.error(`[Worker] Failed job ${job.id}:`, err);
        throw err;
      }
    },
    { connection: connectionOpts }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    logger.debug('BullMQ Worker connection warning (Redis is down): ' + err.message);
  });
}

export async function enqueueDocumentParsing(
  filePath: string,
  mimeType: string,
  originalName: string,
  fileSize: number
): Promise<string> {
  const cacheKey = `parsed_doc:${originalName}:${fileSize}`;
  
  if (!documentQueue) {
    logger.warn(`Redis/Queue is disabled. Document parsing for ${originalName} will be processed synchronously when requested.`);
    return '';
  }
  
  const jobId = `parse:${originalName}:${fileSize}`;
  
  // Add job if it doesn't already exist in the queue
  const existingJob = await documentQueue.getJob(jobId);
  if (existingJob) {
    logger.info(`Job already exists for ${originalName}:${fileSize} with id: ${existingJob.id}`);
    return existingJob.id as string;
  }
  
  const job = await documentQueue.add(
    'parse-document',
    { filePath, mimeType, cacheKey },
    { jobId, removeOnComplete: true, removeOnFail: true }
  );
  
  logger.info(`Enqueued background parsing job ${job.id} for ${originalName}`);
  return job.id as string;
}

export async function getOrParseDocument(
  fileBuffer: Buffer | null,
  mimeType: string,
  originalName: string,
  fileSize: number
): Promise<string> {
  const cacheKey = `parsed_doc:${originalName}:${fileSize}`;
  
  // 1. Check if we already have the parsed text in cache
  const cachedText = await cache.get(cacheKey);
  if (cachedText) {
    logger.info(`Cache hit for parsed document: ${originalName}`);
    return cachedText;
  }
  
  // 2. If Redis is disabled, parse synchronously inline
  if (!documentQueue || !queueEvents || !fileBuffer) {
    if (fileBuffer) {
      logger.info(`Redis/Queue disabled. Parsing document ${originalName} inline on main thread.`);
      const parsed = await parseDocument(fileBuffer, mimeType);
      await cache.set(cacheKey, parsed, 3600 * 24);
      return parsed;
    }
    return '';
  }
  
  // 3. Check if there is an active job processing this document
  const jobId = `parse:${originalName}:${fileSize}`;
  const job = await documentQueue.getJob(jobId);
  
  if (job) {
    logger.info(`Waiting for active background job ${job.id} to finish parsing ${originalName}...`);
    try {
      const result = await job.waitUntilFinished(queueEvents);
      return result || '';
    } catch (err) {
      logger.error(`Error waiting for background job ${jobId}:`, err);
      // Fallback to inline parsing if the job failed or has issue
      logger.info(`Falling back to inline parsing for ${originalName}`);
      const parsed = await parseDocument(fileBuffer, mimeType);
      await cache.set(cacheKey, parsed, 3600 * 24);
      return parsed;
    }
  }
  
  // 4. No active job found and not cached: push a job and wait for it
  logger.info(`No active job found for ${originalName}. Enqueuing and waiting...`);
  
  // We need to write the buffer to a temp file so the background worker can read it from disk
  const tempDir = path.join(__dirname, '../../public/uploads/temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempFilePath = path.join(tempDir, `${Date.now()}-${originalName}`);
  fs.writeFileSync(tempFilePath, fileBuffer);
  
  try {
    const newJobId = await enqueueDocumentParsing(tempFilePath, mimeType, originalName, fileSize);
    const newJob = await documentQueue.getJob(newJobId);
    if (newJob) {
      const result = await newJob.waitUntilFinished(queueEvents);
      // Clean up temp file
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
      return result || '';
    }
  } catch (err) {
    logger.error(`Failed executing background parsing job for ${originalName}:`, err);
  }
  
  // Final fallback: parse inline
  try { fs.unlinkSync(tempFilePath); } catch (e) {}
  logger.info(`Final fallback: parsing inline for ${originalName}`);
  const parsed = await parseDocument(fileBuffer, mimeType);
  await cache.set(cacheKey, parsed, 3600 * 24);
  return parsed;
}
