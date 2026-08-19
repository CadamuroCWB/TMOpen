import { EstabelecimentoRepository } from '../repositories/estabelecimento.repository.js';
import type { EstabelecimentoListQuery } from '../schemas/estabelecimento.schema.js';
import { calcPaginationMeta, type Paginated } from '../../../common/pagination.js';
import { NotFoundError } from '../../../common/errors.js';
import type { Prisma } from '@prisma/client';

export class EstabelecimentoService {
  private repo = new EstabelecimentoRepository();

  async getEstabelecimentos(query: EstabelecimentoListQuery): Promise<Paginated<any>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const where: Prisma.estabelecimentosWhereInput = {};

    if (query.uf) {
      where.uf = query.uf;
    }
    if (query.municipio) {
      where.municipio = query.municipio;
    }
    if (query.cnae) {
      where.cnae_fiscal_principal = query.cnae;
    }
    if (query.situacao_cadastral !== undefined) {
      where.situacao_cadastral = query.situacao_cadastral;
    }
    if (query.nome_fantasia) {
      where.nome_fantasia = {
        contains: query.nome_fantasia,
        mode: 'insensitive',
      };
    }

    const { rows, count } = await this.repo.findMany({ skip, take: limit, where });
    return { data: rows, meta: calcPaginationMeta(page, limit, count) };
  }

  async getEstabelecimentoByCnpj(cnpj14: string) {
    const result = await this.repo.findByCnpjCompleto(cnpj14);
    if (!result) {
      throw new NotFoundError('Estabelecimento não encontrado');
    }
    return result;
  }
}

export default EstabelecimentoService;
