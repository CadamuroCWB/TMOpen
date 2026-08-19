import { z } from 'zod';
import { PaginationQuerySchema } from './pagination.schema.js';

export const CnaeSchema = z.object({
  codigo: z.string().length(7),
  descricao: z.string(),
});

export const MunicipioSchema = z.object({
  codigo: z.string().length(7),
  descricao: z.string(),
  uf: z.string().length(2).optional(),
});

export const NaturezaJuridicaSchema = z.object({
  codigo: z.string().length(4),
  descricao: z.string(),
});

export const CnaeListQuery = PaginationQuerySchema.extend({
  descricao: z.string().optional(),
});

export const MunicipioListQuery = PaginationQuerySchema.extend({
  uf: z.string().length(2).optional(),
  descricao: z.string().optional(),
});

export const NaturezaJuridicaListQuery = PaginationQuerySchema.extend({
  descricao: z.string().optional(),
});

export type Cnae = z.infer<typeof CnaeSchema>;
export type Municipio = z.infer<typeof MunicipioSchema>;
export type NaturezaJuridica = z.infer<typeof NaturezaJuridicaSchema>;
export type CnaeListQueryType = z.infer<typeof CnaeListQuery>;
export type MunicipioListQueryType = z.infer<typeof MunicipioListQuery>;
export type NaturezaJuridicaListQueryType = z.infer<typeof NaturezaJuridicaListQuery>;
