import { DomainRepository } from '../repositories/domain.repository.js';
import {
  CnaeListQueryType,
  MunicipioListQueryType,
  NaturezaJuridicaListQueryType,
} from '../schemas/domain.schema.js';
import { calcPaginationMeta, type Paginated } from '../../../common/pagination.js';

export class DomainService {
  private repo = new DomainRepository();

  async getCnaes(query: CnaeListQueryType): Promise<Paginated<any>> {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    const where: any = {};
    if (query.descricao) {
      where.descricao = { contains: query.descricao, mode: 'insensitive' };
    }
    const { rows, count } = await this.repo.findAllCnaes({ skip, take, where });
    const meta = calcPaginationMeta(query.page, query.limit, count);
    return { data: rows, meta };
  }

  async getMunicipios(query: MunicipioListQueryType): Promise<Paginated<any>> {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    const where: any = {};
    if (query.uf) {
      where.uf = query.uf;
    }
    if (query.descricao) {
      where.descricao = { contains: query.descricao, mode: 'insensitive' };
    }
    const { rows, count } = await this.repo.findAllMunicipios({ skip, take, where });
    const meta = calcPaginationMeta(query.page, query.limit, count);
    return { data: rows, meta };
  }

  async getNaturezasJuridicas(query: NaturezaJuridicaListQueryType): Promise<Paginated<any>> {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    const where: any = {};
    if (query.descricao) {
      where.descricao = { contains: query.descricao, mode: 'insensitive' };
    }
    const { rows, count } = await this.repo.findAllNaturezasJuridicas({ skip, take, where });
    const meta = calcPaginationMeta(query.page, query.limit, count);
    return { data: rows, meta };
  }
}

export default DomainService;
