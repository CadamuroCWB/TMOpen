import { z } from 'zod';
import { PaginationQuerySchema } from './pagination.schema.js';
import { normalizeCnpj } from '../../../common/utils.js';

export const SocioListQuerySchema = PaginationQuerySchema.extend({
  nome_socio: z.string().optional(),
  cnpj_basico: z.string().optional().transform(v => v ? normalizeCnpj(v) : v).refine(v => !v || /^\d{8}$/.test(v), 'cnpj_basico deve ter 8 dígitos').optional(),
  cnpj_cpf_do_socio: z.string().optional().transform(v => v ? normalizeCnpj(v) : v),
});

export type SocioListQuery = z.infer<typeof SocioListQuerySchema>;
