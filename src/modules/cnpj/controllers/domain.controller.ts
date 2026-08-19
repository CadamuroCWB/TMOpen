import type { FastifyRequest, FastifyReply } from 'fastify';
import { DomainService } from '../services/domain.service.js';
import { successApiResponse } from '../../../common/response.js';
import type {
  CnaeListQueryType,
  MunicipioListQueryType,
  NaturezaJuridicaListQueryType,
} from '../schemas/domain.schema.js';

const service = new DomainService();

export async function getCnaes(
  request: FastifyRequest<{ Querystring: CnaeListQueryType }>,
  reply: FastifyReply,
) {
  const result = await service.getCnaes(request.query);
  return reply.send(successApiResponse(result.data, result.meta));
}

export async function getMunicipios(
  request: FastifyRequest<{ Querystring: MunicipioListQueryType }>,
  reply: FastifyReply,
) {
  const result = await service.getMunicipios(request.query);
  return reply.send(successApiResponse(result.data, result.meta));
}

export async function getNaturezasJuridicas(
  request: FastifyRequest<{ Querystring: NaturezaJuridicaListQueryType }>,
  reply: FastifyReply,
) {
  const result = await service.getNaturezasJuridicas(request.query);
  return reply.send(successApiResponse(result.data, result.meta));
}

export default {
  getCnaes,
  getMunicipios,
  getNaturezasJuridicas,
};
