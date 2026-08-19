import type { FastifyPluginAsync } from 'fastify';
import domainRoutes from './domain.routes.js';
import empresaRoutes from './empresa.routes.js';
import estabelecimentoRoutes from './estabelecimento.routes.js';
import socioRoutes from './socio.routes.js';

const cnpjRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(domainRoutes);
  await fastify.register(empresaRoutes);
  await fastify.register(estabelecimentoRoutes);
  await fastify.register(socioRoutes);
};

export default cnpjRoutes;
