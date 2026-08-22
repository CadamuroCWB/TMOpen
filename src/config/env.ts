import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  TMOPEN_API_KEYS: z.string().default('changeme-me-retire-antes-de-producao'),
  CORS_ORIGINS: z.string().default('*'),
  PROSPECT_RATE_LIMIT_MAX: z.coerce.number().default(60),
  PROSPECT_MAX_PAGE_SIZE: z.coerce.number().default(500),
});

export const env = envSchema.parse(process.env);
