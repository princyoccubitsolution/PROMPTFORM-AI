import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Enhance DATABASE_URL with connection pool limits (connection_limit=30, pool_timeout=30) for high concurrent form traffic
let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && dbUrl.startsWith('postgresql://') && !dbUrl.includes('connection_limit=')) {
  const separator = dbUrl.includes('?') ? '&' : '?';
  dbUrl = `${dbUrl}${separator}connection_limit=30&pool_timeout=30`;
}

export const db = globalThis.prisma || new PrismaClient({
  ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

