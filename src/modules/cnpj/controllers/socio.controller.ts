import type { FastifyRequest, FastifyReply } from 'fastify';
import { SocioService } from '../services/socio.service.js';
import { successApiResponse } from '../../../common/response.js';
import type { SocioListQuery } from '../schemas/socio.schema.js';

const service = new SocioService();

export async function getSocios(
  request: FastifyRequest<{ Querystring: SocioListQuery }>,
  reply: FastifyReply,
) {
  const result = await service.getSocios(request.query);
  return reply.status(200).send(successApiResponse(result.data, result.meta));
}

export default {
  getSocios,
};
