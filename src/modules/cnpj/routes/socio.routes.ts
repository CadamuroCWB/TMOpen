import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SocioListQuerySchema } from '../schemas/socio.schema.js';
import { ApiResponseSchema, ErrorResponseSchema } from '../schemas/pagination.schema.js';
import { getSocios } from '../controllers/socio.controller.js';

const socioRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get('/socios', {
    schema: {
      tags: ['Sócios'],
      summary: 'Listar sócios',
      querystring: SocioListQuerySchema,
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
      },
    },
  }, getSocios);
};

export default socioRoutes;
