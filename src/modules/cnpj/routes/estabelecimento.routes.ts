import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  EstabelecimentoListQuerySchema,
  EstabelecimentoByCnpjParamsSchema,
} from '../schemas/estabelecimento.schema.js';
import { ApiResponseSchema, ErrorResponseSchema } from '../schemas/pagination.schema.js';
import {
  getEstabelecimentos,
  getEstabelecimentoByCnpj,
} from '../controllers/estabelecimento.controller.js';

const AnyObjectSchema = z.record(z.string(), z.unknown());

const estabelecimentoRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get('/estabelecimentos', {
    schema: {
      tags: ['Estabelecimentos'],
      summary: 'Listar estabelecimentos',
      querystring: EstabelecimentoListQuerySchema,
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
      },
    },
  }, getEstabelecimentos);

  app.get('/estabelecimentos/:cnpj', {
    schema: {
      tags: ['Estabelecimentos'],
      summary: 'Detalhar estabelecimento por CNPJ completo (14 dígitos)',
      params: EstabelecimentoByCnpjParamsSchema,
      response: {
        200: AnyObjectSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
  }, getEstabelecimentoByCnpj);
};

export default estabelecimentoRoutes;
