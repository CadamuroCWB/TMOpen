import type { FastifyRequest, FastifyReply } from 'fastify';
import { EmpresaService } from '../services/empresa.service.js';
import { successApiResponse } from '../../../common/response.js';
import type {
  EmpresaListQuery,
  EmpresaByCnpjParams,
} from '../schemas/empresa.schema.js';

const service = new EmpresaService();

export async function getEmpresas(
  request: FastifyRequest<{ Querystring: EmpresaListQuery }>,
  reply: FastifyReply,
) {
  const result = await service.getEmpresas(request.query);
  return reply.status(200).send(successApiResponse(result.data, result.meta));
}

export async function getEmpresaByCnpj(
  request: FastifyRequest<{ Params: EmpresaByCnpjParams }>,
  reply: FastifyReply,
) {
  const result = await service.getEmpresaByCnpj(request.params.cnpj);
  return reply.status(200).send(result);
}

export default {
  getEmpresas,
  getEmpresaByCnpj,
};
