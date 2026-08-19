import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CnaeListQuery,
  MunicipioListQuery,
  NaturezaJuridicaListQuery,
} from '../schemas/domain.schema.js';
import { ApiResponseSchema, ErrorResponseSchema } from '../schemas/pagination.schema.js';
import {
  getCnaes,
  getMunicipios,
  getNaturezasJuridicas,
} from '../controllers/domain.controller.js';

const domainRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get('/cnaes', {
    schema: {
      tags: ['Domínio'],
      summary: 'Listar CNAEs',
      querystring: CnaeListQuery,
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
      },
    },
  }, getCnaes);

  app.get('/municipios', {
    schema: {
      tags: ['Domínio'],
      summary: 'Listar Municípios IBGE',
      querystring: MunicipioListQuery,
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
      },
    },
  }, getMunicipios);

  app.get('/naturezas-juridicas', {
    schema: {
      tags: ['Domínio'],
      summary: 'Listar Naturezas Jurídicas',
      querystring: NaturezaJuridicaListQuery,
      response: {
        200: ApiResponseSchema,
        400: ErrorResponseSchema,
      },
    },
  }, getNaturezasJuridicas);
};

export default domainRoutes;
