import type { FastifyPluginAsync } from 'fastify';
import { successApiResponse, SuccessApiResponseSchema } from '../common/response.js';
import { NotFoundError } from '../common/errors.js';
import cnpjModuleRoutes from './cnpj/routes/index.js';

const modulesPlugin: FastifyPluginAsync = async (fastify) => {
  const appTyped = fastify.withTypeProvider<any>();
  appTyped.get('/api/v1', {
    schema: {
      tags: ['Info'],
      summary: 'Informações da API',
      response: {
        200: SuccessApiResponseSchema,
      },
    },
  }, async () => {
    return successApiResponse({
      version: '1.0.0',
      name: 'TMOpen API',
      endpoints: [
        '/cnaes',
        '/municipios',
        '/naturezas-juridicas',
        '/empresas',
        '/empresas/{cnpj}',
        '/estabelecimentos',
        '/estabelecimentos/{cnpj}',
        '/socios',
      ] as string[],
    });
  });

  await appTyped.register(cnpjModuleRoutes, { prefix: '/api/v1' });

  appTyped.get('/api/v1/*', async () => {
    throw new NotFoundError('Endpoint não encontrado');
  });
};

export default modulesPlugin;
