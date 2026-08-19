import { z } from 'zod';
import { PaginationQuerySchema } from './pagination.schema.js';
import { normalizeCnpj } from '../../../common/utils.js';

function normalizeOptionalCnpj(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const n = normalizeCnpj(v);
    return n.length > 0 ? n : undefined;
  }
  return undefined;
}

export const EmpresaListQuerySchema = PaginationQuerySchema.extend({
  razao_social: z.string().optional(),
  cnpj_basico: z.string().optional().superRefine((val, ctx) => {
    const n = normalizeOptionalCnpj(val);
    if (n !== undefined && !/^\d{8}$/.test(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'cnpj_basico deve ter 8 dígitos' });
    }
  }).transform(normalizeOptionalCnpj),
  porte: z.string().length(1).optional(),
  natureza_juridica: z.string().length(4).optional(),
});

export const EmpresaByCnpjParamsSchema = z.object({
  cnpj: z.string().superRefine((val, ctx) => {
    const n = normalizeCnpj(val);
    if (!/^\d{8}$/.test(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'cnpj_basico deve ter 8 dígitos' });
    }
  }).transform((v) => normalizeCnpj(v)),
});

const AnyObjectSchema = z.record(z.string(), z.unknown());

export const EmpresaAggregateSchema = z.object({
  empresa: AnyObjectSchema,
  estabelecimentos: z.array(AnyObjectSchema),
  socios: z.array(AnyObjectSchema),
  dados_simples: AnyObjectSchema.optional(),
});

export type EmpresaListQuery = z.infer<typeof EmpresaListQuerySchema>;
export type EmpresaByCnpjParams = z.infer<typeof EmpresaByCnpjParamsSchema>;
