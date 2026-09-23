import { createClient } from 'redis';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient> | null = null;
let useMemoryFallback = true;
const memoryCache = new Map<string, { value: string; expiry: number | null }>();

const disableRedis = process.env.DISABLE_REDIS === 'true';
const redisUrl = disableRedis ? null : (process.env.REDIS_URL || 'redis://localhost:6379');

export const initCache = async (): Promise<void> => {
  if (disableRedis || !redisUrl) {
    logger.info('Cache initialized using in-memory fallback (Redis is disabled).');
    useMemoryFallback = true;
    return;
  }

  logger.info('Initializing Redis cache socket connection...');
  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: false
    }
  });

  redisClient.on('error', (err) => {
    useMemoryFallback = true;
  });

  try {
    await redisClient.connect();
    // Test connectivity
    await redisClient.set('startup_probe', 'ok', { EX: 2 });
    const probe = await redisClient.get('startup_probe');
    
    if (probe === 'ok') {
      logger.redis('Successfully established Redis cache connection.');
      useMemoryFallback = false;
    } else {
      throw new Error('Redis ping response mismatch');
    }
  } catch (err: any) {
    logger.error('Redis cache validation failed. Initializing in-memory fallback.', err);
    useMemoryFallback = true;
  }
};

export const cache = {
  async get(key: string): Promise<string | null> {
    if (useMemoryFallback || !redisClient) {
      const data = memoryCache.get(key);
      if (!data) return null;
      if (data.expiry && Date.now() > data.expiry) {
        memoryCache.delete(key);
        return null;
      }
      return data.value;
    }
    try {
      return await redisClient.get(key);
    } catch (err) {
      logger.error(`Redis cache GET fail for key "${key}":`, err);
      return null;
    }
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (useMemoryFallback || !redisClient) {
      const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
      memoryCache.set(key, { value, expiry });
      return;
    }
    try {
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, value);
      } else {
        await redisClient.set(key, value);
      }
    } catch (err) {
      logger.error(`Redis cache SET fail for key "${key}":`, err);
      const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
      memoryCache.set(key, { value, expiry });
    }
  },

  async del(key: string): Promise<void> {
    if (useMemoryFallback || !redisClient) {
      memoryCache.delete(key);
      return;
    }
    try {
      await redisClient.del(key);
    } catch (err) {
      logger.error(`Redis cache DEL fail for key "${key}":`, err);
      memoryCache.delete(key);
    }
  }
};
