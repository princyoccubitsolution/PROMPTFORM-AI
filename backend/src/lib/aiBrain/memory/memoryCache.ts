import { IMemoryStorageDriver } from './interfaces';
import { cache } from '../../cache';
import * as fs from 'fs';
import * as path from 'path';

export class RedisDriver implements IMemoryStorageDriver {
  async get(key: string): Promise<string | null> {
    return await cache.get(key);
  }
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await cache.set(key, value, ttlSeconds);
  }
  async del(key: string): Promise<void> {
    await cache.del(key);
  }
}

export class DiskDriver implements IMemoryStorageDriver {
  private baseDir = path.join(__dirname, '..', '..', '..', '..', 'storage', 'sessions');

  constructor() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async get(key: string): Promise<string | null> {
    const filePath = path.join(this.baseDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  }

  async set(key: string, value: string): Promise<void> {
    const filePath = path.join(this.baseDir, `${key}.json`);
    fs.writeFileSync(filePath, value, 'utf-8');
  }

  async del(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export class InMemoryDriver implements IMemoryStorageDriver {
  private store = new Map<string, { value: string; expiry: number | null }>();

  async get(key: string): Promise<string | null> {
    const data = this.store.get(key);
    if (!data) return null;
    if (data.expiry && Date.now() > data.expiry) {
      this.store.delete(key);
      return null;
    }
    return data.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export function getStorageDriver(): IMemoryStorageDriver {
  return new RedisDriver();
}
export function getDiskBackupDriver(): IMemoryStorageDriver {
  return new DiskDriver();
}
