import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  EmpresaListQuerySchema,
  EmpresaByCnpjParamsSchema,
  EmpresaAggregateSchema,
} from '../schemas/empresa.schema.js';
import { ApiResponseSchema, ErrorResponseSchema } from '../schemas/pagination.schema.js';
import {
  getEmpresas,
  getEmpresaByCnpj,
} from '../controllers/empresa.controller.js';

const empresaRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get('/empresas', {
    schema: {
      tags: ['Empresas'],
      summary: 'Listar empresas',
      querystring: EmpresaListQuerySchema,
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
      },
    },
  }, getEmpresas);

  app.get('/empresas/:cnpj', {
    schema: {
      tags: ['Empresas'],
      summary: 'Detalhar empresa por CNPJ básico (8 dígitos)',
      params: EmpresaByCnpjParamsSchema,
      response: {
        200: EmpresaAggregateSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    },
  }, getEmpresaByCnpj);
};

export default empresaRoutes;
