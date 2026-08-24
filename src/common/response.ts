import { z } from 'zod';
import type { PaginationMeta } from './pagination.js';

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const SuccessApiResponseSchema = z.object({
  data: z.unknown(),
  meta: PaginationMetaSchema.optional(),
});

export const ErrorApiResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
  code: z.string().nullable().optional(),
});

export function successApiResponse<T>(
  data: T,
  meta?: PaginationMeta,
): { data: T; meta?: PaginationMeta } {
  const response: { data: T; meta?: PaginationMeta } = { data };
  if (meta !== undefined) {
    response.meta = meta;
  }
  return response;
}

export function errorApiResponse(
  error: string,
  details?: unknown,
  code?: string | null,
  extra?: Record<string, unknown>,
): { error: string; details?: unknown; code?: string | null; [key: string]: unknown } {
  const response: { error: string; details?: unknown; code?: string | null; [key: string]: unknown } = { error };
  if (details !== undefined) {
    response.details = details;
  }
  if (code !== undefined) {
    response.code = code;
  }
  if (extra !== undefined && extra !== null) {
    for (const k of Object.keys(extra)) {
      response[k] = extra[k];
    }
  }
  return response;
}
