import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ProspectListQueryWithoutModeSchema } from '../schemas/prospect.schema.js';
import { ApiResponseSchema, ErrorResponseSchema } from '../../cnpj/schemas/pagination.schema.js';
import {
  getProspectEstabelecimentos,
  getProspectEmpresas,
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
};

export default prospectRoutes;
