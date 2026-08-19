import prisma from '../../../config/prisma.js';

type FindManyParams = {
  skip: number;
  take: number;
  where?: any;
};

export class DomainRepository {
  private prisma = prisma;

  async findAllCnaes(params: FindManyParams) {
    const [rows, count] = await Promise.all([
      this.prisma.cnaes.findMany({
        skip: params.skip,
        take: params.take,
        where: params.where,
        orderBy: { descricao: 'asc' },
      }),
      this.prisma.cnaes.count({ where: params.where }),
    ]);
    return { rows, count };
  }

  async findAllMunicipios(params: FindManyParams) {
    const where: any = {};
    if (params.where) {
      Object.assign(where, params.where);
    }
    const [rows, count] = await Promise.all([
      this.prisma.municipios.findMany({
        skip: params.skip,
        take: params.take,
        where,
        orderBy: [{ uf: 'asc' }, { descricao: 'asc' }],
      }),
      this.prisma.municipios.count({ where }),
    ]);
    return { rows, count };
  }

  async findAllNaturezasJuridicas(params: FindManyParams) {
    const [rows, count] = await Promise.all([
      this.prisma.naturezas_juridicas.findMany({
        skip: params.skip,
        take: params.take,
        where: params.where,
        orderBy: { descricao: 'asc' },
      }),
      this.prisma.naturezas_juridicas.count({ where: params.where }),
    ]);
    return { rows, count };
  }
}

export default DomainRepository;
