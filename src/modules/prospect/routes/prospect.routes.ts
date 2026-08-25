import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ProspectListQueryWithoutModeSchema } from '../schemas/prospect.schema.js';
import { ApiResponseSchema, ErrorResponseSchema } from '../../cnpj/schemas/pagination.schema.js';
import {
  getProspectEstabelecimentos,
  getProspectEmpresas,
  getProspectSocios,
} from '../controllers/prospect.controller.js';

const prospectRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get('/prospect/estabelecimentos', {
    schema: {
      tags: ['Prospecção'],
      summary: 'Buscar estabelecimentos com filtros avançados de prospecção',
      security: [{ ApiKeyAuth: [] }],
      querystring: ProspectListQueryWithoutModeSchema,
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
  }, getProspectEstabelecimentos);

  app.get('/prospect/empresas', {
    schema: {
      tags: ['Prospecção'],
      summary: 'Buscar empresas com filtros avançados de prospecção',
      security: [{ ApiKeyAuth: [] }],
      querystring: ProspectListQueryWithoutModeSchema,
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
  }, getProspectEmpresas);

  app.get('/prospect/socios/:cnpj_basico', {
    schema: {
      tags: ['Prospecção'],
      summary: 'Consultar quadro societário de um CNPJ básico (8 dígitos)',
      security: [{ ApiKeyAuth: [] }],
      params: z.object({
        cnpj_basico: z.string()
          .min(1)
          .transform((v) => v.replace(/\D+/g, ''))
          .refine((v) => v.length === 8, { message: 'cnpj_basico deve conter 8 dígitos numéricos' }),
      }),
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
  }, getProspectSocios);
};

export default prospectRoutes;
