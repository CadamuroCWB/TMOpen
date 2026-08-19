import type { FastifyRequest, FastifyReply } from 'fastify';
import { EstabelecimentoService } from '../services/estabelecimento.service.js';
import { successApiResponse } from '../../../common/response.js';
import type {
  EstabelecimentoListQuery,
  EstabelecimentoByCnpjParams,
} from '../schemas/estabelecimento.schema.js';

const service = new EstabelecimentoService();

export async function getEstabelecimentos(
  request: FastifyRequest<{ Querystring: EstabelecimentoListQuery }>,
  reply: FastifyReply,
) {
  const result = await service.getEstabelecimentos(request.query);
  return reply.status(200).send(successApiResponse(result.data, result.meta));
}

export async function getEstabelecimentoByCnpj(
  request: FastifyRequest<{ Params: EstabelecimentoByCnpjParams }>,
  reply: FastifyReply,
) {
  const result = await service.getEstabelecimentoByCnpj(request.params.cnpj);
  return reply.status(200).send(result);
}

export default {
  getEstabelecimentos,
  getEstabelecimentoByCnpj,
};
