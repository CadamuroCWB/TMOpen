import prisma from '../../../config/prisma.js';
import type { Prisma } from '@prisma/client';

type FindManyParams = {
  skip: number;
  take: number;
  where?: Prisma.sociosWhereInput;
};

export class SocioRepository {
  private prisma = prisma;

  async findMany({ skip, take, where }: FindManyParams) {
    const [rows, count] = await Promise.all([
      this.prisma.socios.findMany({
        skip,
        take,
        where,
        orderBy: [
          { nome_socio: 'asc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.socios.count({ where }),
    ]);
    return { rows, count };
  }
}

export default SocioRepository;
