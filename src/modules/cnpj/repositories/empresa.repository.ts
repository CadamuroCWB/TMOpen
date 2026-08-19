import prisma from '../../../config/prisma.js';
import type { Prisma } from '@prisma/client';

type FindManyParams = {
  skip: number;
  take: number;
  where?: Prisma.empresasWhereInput;
  orderBy?: Prisma.empresasOrderByWithRelationInput | Prisma.empresasOrderByWithRelationInput[];
};

export class EmpresaRepository {
  private prisma = prisma;

  async findMany({ skip, take, where, orderBy = { razao_social: 'asc' as const } }: FindManyParams) {
    const [rows, count] = await Promise.all([
      this.prisma.empresas.findMany({ skip, take, where, orderBy }),
      this.prisma.empresas.count({ where }),
    ]);
    return { rows, count };
  }

  async findByCnpjBasicoCompleto(cnpj_basico: string) {
    return this.prisma.empresas.findUnique({
      where: { cnpj_basico },
      include: {
        estabelecimentos: { orderBy: [{ identificador_matriz_filial: 'asc' }, { cnpj_ordem: 'asc' }] },
        socios: { orderBy: [{ identificador_de_socio: 'asc' }, { nome_socio: 'asc' }] },
        dados_simples: true,
      },
    });
  }
}

export default EmpresaRepository;
