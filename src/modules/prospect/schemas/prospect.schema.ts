import { z } from 'zod';
import { PaginationQuerySchema } from '../../cnpj/schemas/pagination.schema.js';
import { env } from '../../../config/env.js';

export const ProspectSearchModeSchema = z.enum(['estabelecimento', 'empresa']).default('estabelecimento');

const ProspectListQueryBaseSchema = PaginationQuerySchema.extend({
  mode: ProspectSearchModeSchema,
  uf: z.string().length(2).optional(),
  municipio: z.string().optional(),
  cnae: z.string().optional(),
  situacao_cadastral: z.coerce.number().int().optional(),
  porte: z.string().length(2).optional(),
  opcao_pelo_simples: z.enum(['S', 'N']).optional(),
  opcao_pelo_mei: z.enum(['S', 'N']).optional(),
  razao_social: z.string().optional(),
  nome_fantasia: z.string().optional(),
  cnpj_basico: z.string().length(8).optional(),
  data_inicio_atividade_de: z.coerce.date().optional(),
  data_inicio_atividade_ate: z.coerce.date().optional(),
});

export const ProspectListQuerySchema = ProspectListQueryBaseSchema.transform((parsed) => {
  let limit = parsed.limit ?? 20;
  if (limit > env.PROSPECT_MAX_PAGE_SIZE) {
    limit = env.PROSPECT_MAX_PAGE_SIZE;
  }
  return { ...parsed, limit };
});

export const ProspectListQueryWithoutModeSchema = ProspectListQueryBaseSchema.omit({ mode: true }).transform((parsed) => {
  let limit = parsed.limit ?? 20;
  if (limit > env.PROSPECT_MAX_PAGE_SIZE) {
    limit = env.PROSPECT_MAX_PAGE_SIZE;
  }
  return { ...parsed, limit };
});

export type ProspectListQuery = z.infer<typeof ProspectListQuerySchema>;
export type ProspectSearchMode = z.infer<typeof ProspectSearchModeSchema>;
