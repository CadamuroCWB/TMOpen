import prisma from '../../../config/prisma.js';
import type { Prisma } from '@prisma/client';

type FindManyParams = {
  skip: number;
  take: number;
  where?: Prisma.estabelecimentosWhereInput;
};

export class EstabelecimentoRepository {
  private prisma = prisma;

  async findMany({ skip, take, where }: FindManyParams) {
    const [rows, count] = await Promise.all([
      this.prisma.estabelecimentos.findMany({
        skip,
        take,
        where,
        orderBy: [
          { cnpj_basico: 'asc' },
          { cnpj_ordem: 'asc' },
          { cnpj_dv: 'asc' },
        ],
      }),
      this.prisma.estabelecimentos.count({ where }),
    ]);
    return { rows, count };
  }

  async findByCnpjCompleto(cnpj14: string) {
    const cnpj_basico = cnpj14.slice(0, 8);
    const cnpj_ordem = cnpj14.slice(8, 12);
    const cnpj_dv = cnpj14.slice(12, 14);
    return this.prisma.estabelecimentos.findUnique({
      where: {
        cnpj_basico_cnpj_ordem_cnpj_dv: {
          cnpj_basico,
          cnpj_ordem,
          cnpj_dv,
        },
      },
    });
  }
}

export default EstabelecimentoRepository;
