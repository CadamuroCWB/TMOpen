import { z } from 'zod';
import { PaginationQuerySchema } from './pagination.schema.js';
import { normalizeCnpj } from '../../../common/utils.js';

export const EstabelecimentoListQuerySchema = PaginationQuerySchema.extend({
  uf: z.string().length(2).optional(),
  municipio: z.string().length(7).optional(),
  cnae: z.string().length(7).optional(),
  situacao_cadastral: z.coerce.number().int().optional(),
  nome_fantasia: z.string().optional(),
});

export const EstabelecimentoByCnpjParamsSchema = z.object({
  cnpj: z.string().superRefine((val, ctx) => {
    const n = normalizeCnpj(val);
    if (!/^\d{14}$/.test(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNPJ completo deve ter 14 dígitos' });
    }
  }).transform((v) => normalizeCnpj(v)),
});

export type EstabelecimentoListQuery = z.infer<typeof EstabelecimentoListQuerySchema>;
export type EstabelecimentoByCnpjParams = z.infer<typeof EstabelecimentoByCnpjParamsSchema>;
