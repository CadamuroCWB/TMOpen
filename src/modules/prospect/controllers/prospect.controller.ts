import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProspectService } from '../services/prospect.service.js';
import { successApiResponse } from '../../../common/response.js';
import type { ProspectListQuery } from '../schemas/prospect.schema.js';

const service = new ProspectService();

export async function getProspectEstabelecimentos(
  request: FastifyRequest<{ Querystring: ProspectListQuery }>,
  reply: FastifyReply,
) {
  const result = await service.searchEstabelecimentos(request.query, request.log);
  return reply.status(200).send(successApiResponse(result.data, result.meta));
}

export async function getProspectEmpresas(
  request: FastifyRequest<{ Querystring: ProspectListQuery }>,
  reply: FastifyReply,
) {
  const result = await service.searchEmpresas(request.query, request.log);
  return reply.status(200).send(successApiResponse(result.data, result.meta));
}

export default {
  getProspectEstabelecimentos,
  getProspectEmpresas,
};
