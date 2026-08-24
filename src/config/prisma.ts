import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Timeouts globais do cliente Prisma (ms)
const QUERY_TIMEOUT_MS = env.NODE_ENV === 'production' ? 40_000 : 120_000;
const TRANSACTION_MAX_WAIT_MS = env.NODE_ENV === 'production' ? 45_000 : 150_000;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    transactionOptions: {
      maxWait: TRANSACTION_MAX_WAIT_MS,
      timeout: QUERY_TIMEOUT_MS,
      isolationLevel: 'ReadCommitted',
    },
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
