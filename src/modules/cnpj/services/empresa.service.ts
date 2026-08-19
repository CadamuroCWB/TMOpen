import { EmpresaRepository } from '../repositories/empresa.repository.js';
import type { EmpresaListQuery } from '../schemas/empresa.schema.js';
import { calcPaginationMeta, type Paginated } from '../../../common/pagination.js';
import { NotFoundError } from '../../../common/errors.js';
import type { Prisma } from '@prisma/client';

export class EmpresaService {
  private repo = new EmpresaRepository();

  async getEmpresas(query: EmpresaListQuery): Promise<Paginated<any>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const where: Prisma.empresasWhereInput = {};
    if (query.razao_social) {
      where.razao_social = { contains: query.razao_social, mode: 'insensitive' };
    }
    if (query.cnpj_basico) {
      where.cnpj_basico = query.cnpj_basico;
    }
    if (query.porte) {
      where.porte = query.porte;
    }
    if (query.natureza_juridica) {
      where.natureza_juridica = query.natureza_juridica;
    }
    const { rows, count } = await this.repo.findMany({ skip, take: limit, where });
    return { data: rows, meta: calcPaginationMeta(page, limit, count) };
  }

  async getEmpresaByCnpj(cnpjBasico: string) {
    const result = await this.repo.findByCnpjBasicoCompleto(cnpjBasico);
    if (!result) {
      throw new NotFoundError('Empresa não encontrada');
    }
    const { estabelecimentos = [], socios = [], dados_simples = null, ...empresa } = result as any;
    return { empresa, estabelecimentos, socios, dados_simples };
  }
}

export default EmpresaService;
