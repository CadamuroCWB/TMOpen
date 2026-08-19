import { SocioRepository } from '../repositories/socio.repository.js';
import type { SocioListQuery } from '../schemas/socio.schema.js';
import { calcPaginationMeta, type Paginated } from '../../../common/pagination.js';
import type { Prisma } from '@prisma/client';

export class SocioService {
  private repo = new SocioRepository();

  async getSocios(query: SocioListQuery): Promise<Paginated<any>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const where: Prisma.sociosWhereInput = {};

    if (query.nome_socio) {
      where.nome_socio = {
        contains: query.nome_socio,
        mode: 'insensitive',
      };
    }
    if (query.cnpj_basico) {
      where.cnpj_basico = query.cnpj_basico;
    }
    if (query.cnpj_cpf_do_socio) {
      where.cnpj_cpf_do_socio = query.cnpj_cpf_do_socio;
    }

    const { rows, count } = await this.repo.findMany({ skip, take: limit, where });
    return { data: rows, meta: calcPaginationMeta(page, limit, count) };
  }
}

export default SocioService;
