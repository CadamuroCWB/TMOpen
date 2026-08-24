import prisma from '../../../config/prisma.js';
import type { Prisma } from '@prisma/client';

type ProspectFilter = {
  uf?: string;
  municipio?: string;
  cnae?: string;
  situacao_cadastral?: number;
  porte?: string;
  opcao_pelo_simples?: 'S' | 'N';
  opcao_pelo_mei?: 'S' | 'N';
  razao_social?: string;
  nome_fantasia?: string;
  cnpj_basico?: string;
  data_inicio_atividade_de?: Date;
  data_inicio_atividade_ate?: Date;
};

type SearchParams = {
  page: number;
  limit: number;
  filter: ProspectFilter;
};

export class ProspectRepository {
  private prisma = prisma;

  async searchEstabelecimentos({ page, limit, filter }: SearchParams) {
    const skip = limit > 0 ? (page - 1) * limit : 0;
    const take = limit > 0 ? limit : 0;

    const where: Prisma.estabelecimentosWhereInput = {};

    if (filter.uf) {
      where.uf = filter.uf;
    }

    if (filter.municipio) {
      if (/^\d{7}$/.test(filter.municipio)) {
        where.municipio = filter.municipio;
      } else {
        const rows = await this.prisma.municipios.findMany({
          where: {
            descricao: {
              contains: filter.municipio,
              mode: 'insensitive',
            },
          },
          select: { codigo: true },
        });
        const codigos = rows.map((r) => r.codigo);
        where.municipio = codigos.length > 0 ? { in: codigos } : { in: ['__EMPTY__'] };
      }
    }

    if (filter.cnae) {
      if (/^\d{7}$/.test(filter.cnae)) {
        where.cnae_fiscal_principal = filter.cnae;
      } else {
        const rows = await this.prisma.cnaes.findMany({
          where: {
            descricao: {
              contains: filter.cnae,
              mode: 'insensitive',
            },
          },
          select: { codigo: true },
        });
        const codigos = rows.map((r) => r.codigo);
        where.cnae_fiscal_principal = codigos.length > 0 ? { in: codigos } : { in: ['__EMPTY__'] };
      }
    }

    if (filter.situacao_cadastral !== undefined) {
      where.situacao_cadastral = filter.situacao_cadastral;
    }

    if (filter.nome_fantasia) {
      where.nome_fantasia = {
        contains: filter.nome_fantasia,
        mode: 'insensitive',
      };
    }

    if (filter.cnpj_basico) {
      where.cnpj_basico = filter.cnpj_basico;
    }

    if (filter.data_inicio_atividade_de || filter.data_inicio_atividade_ate) {
      const dataFilter: any = {};
      if (filter.data_inicio_atividade_de) {
        dataFilter.gte = filter.data_inicio_atividade_de;
      }
      if (filter.data_inicio_atividade_ate) {
        dataFilter.lte = filter.data_inicio_atividade_ate;
      }
      where.data_inicio_atividade = dataFilter;
    }

    const empresaWhere: Prisma.empresasWhereInput = {};
    const dadosSimplesWhere: Prisma.dados_simplesWhereInput = {};

    if (filter.porte) {
      empresaWhere.porte = filter.porte;
    }

    if (filter.razao_social) {
      empresaWhere.razao_social = {
        contains: filter.razao_social,
        mode: 'insensitive',
      };
    }

    if (filter.opcao_pelo_simples) {
      dadosSimplesWhere.opcao_pelo_simples = filter.opcao_pelo_simples;
    }

    if (filter.opcao_pelo_mei) {
      dadosSimplesWhere.opcao_pelo_mei = filter.opcao_pelo_mei;
    }

    const hasEmpresaWhere = Object.keys(empresaWhere).length > 0;
    const hasDadosSimplesWhere = Object.keys(dadosSimplesWhere).length > 0;

    if (hasEmpresaWhere || hasDadosSimplesWhere) {
      const mergedEmpresa: any = { ...(empresaWhere as any) };
      if (hasDadosSimplesWhere) {
        mergedEmpresa.dados_simples = dadosSimplesWhere;
      }
      where.empresa = mergedEmpresa;
    }

    const include: Prisma.estabelecimentosInclude = {
      empresa: {
        select: {
          razao_social: true,
          porte: true,
          natureza_juridica: true,
          capital_social: true,
        },
      },
    };

    if (hasDadosSimplesWhere || filter.opcao_pelo_simples || filter.opcao_pelo_mei) {
      (include.empresa as any).include = {
        dados_simples: {
          select: {
            opcao_pelo_simples: true,
            opcao_pelo_mei: true,
          },
        },
      };
    }

    const select: Prisma.estabelecimentosSelect = {
      cnpj_basico: true,
      cnpj_ordem: true,
      cnpj_dv: true,
      uf: true,
      municipio: true,
      nome_fantasia: true,
      situacao_cadastral: true,
      cnae_fiscal_principal: true,
      data_inicio_atividade: true,
      correio_eletronico: true,
      ddd1: true,
      telefone1: true,
      empresa: {
        select: {
          razao_social: true,
          porte: true,
          natureza_juridica: true,
          capital_social: true,
          dados_simples: {
            select: {
              opcao_pelo_simples: true,
              opcao_pelo_mei: true,
            },
          },
        },
      },
    };

    const countPromise = this.prisma.estabelecimentos.count({ where });
    const rowsPromise = take > 0
      ? this.prisma.estabelecimentos.findMany({
          skip,
          take,
          where,
          select,
          orderBy: [
            { cnpj_basico: 'asc' },
            { cnpj_ordem: 'asc' },
            { cnpj_dv: 'asc' },
          ],
        })
      : Promise.resolve([] as any[]);

    const [rows, count] = await Promise.all([rowsPromise, countPromise]);

    return { rows, count };
  }

  async searchEmpresas({ page, limit, filter }: SearchParams) {
    const skip = limit > 0 ? (page - 1) * limit : 0;
    const take = limit > 0 ? limit : 0;

    const estabWhere: Prisma.estabelecimentosWhereInput = {};

    if (filter.uf) {
      estabWhere.uf = filter.uf;
    }

    if (filter.municipio) {
      if (/^\d{7}$/.test(filter.municipio)) {
        estabWhere.municipio = filter.municipio;
      } else {
        const rows = await this.prisma.municipios.findMany({
          where: {
            descricao: {
              contains: filter.municipio,
              mode: 'insensitive',
            },
          },
          select: { codigo: true },
        });
        const codigos = rows.map((r) => r.codigo);
        estabWhere.municipio = codigos.length > 0 ? { in: codigos } : { in: ['__EMPTY__'] };
      }
    }

    if (filter.cnae) {
      if (/^\d{7}$/.test(filter.cnae)) {
        estabWhere.cnae_fiscal_principal = filter.cnae;
      } else {
        const rows = await this.prisma.cnaes.findMany({
          where: {
            descricao: {
              contains: filter.cnae,
              mode: 'insensitive',
            },
          },
          select: { codigo: true },
        });
        const codigos = rows.map((r) => r.codigo);
        estabWhere.cnae_fiscal_principal = codigos.length > 0 ? { in: codigos } : { in: ['__EMPTY__'] };
      }
    }

    if (filter.situacao_cadastral !== undefined) {
      estabWhere.situacao_cadastral = filter.situacao_cadastral;
    }

    if (filter.nome_fantasia) {
      estabWhere.nome_fantasia = {
        contains: filter.nome_fantasia,
        mode: 'insensitive',
      };
    }

    if (filter.data_inicio_atividade_de || filter.data_inicio_atividade_ate) {
      const dataFilter: any = {};
      if (filter.data_inicio_atividade_de) {
        dataFilter.gte = filter.data_inicio_atividade_de;
      }
      if (filter.data_inicio_atividade_ate) {
        dataFilter.lte = filter.data_inicio_atividade_ate;
      }
      estabWhere.data_inicio_atividade = dataFilter;
    }

    const where: Prisma.empresasWhereInput = {
      estabelecimentos: {
        some: estabWhere,
      },
    };

    if (filter.porte) {
      where.porte = filter.porte;
    }

    if (filter.razao_social) {
      where.razao_social = {
        contains: filter.razao_social,
        mode: 'insensitive',
      };
    }

    if (filter.cnpj_basico) {
      where.cnpj_basico = filter.cnpj_basico;
    }

    if (filter.opcao_pelo_simples || filter.opcao_pelo_mei) {
      const dadosSimplesWhere: Prisma.dados_simplesWhereInput = {};
      if (filter.opcao_pelo_simples) {
        dadosSimplesWhere.opcao_pelo_simples = filter.opcao_pelo_simples;
      }
      if (filter.opcao_pelo_mei) {
        dadosSimplesWhere.opcao_pelo_mei = filter.opcao_pelo_mei;
      }
      where.dados_simples = dadosSimplesWhere;
    }

    const select: Prisma.empresasSelect = {
      cnpj_basico: true,
      razao_social: true,
      porte: true,
      natureza_juridica: true,
      capital_social: true,
      dados_simples: {
        select: {
          opcao_pelo_simples: true,
          opcao_pelo_mei: true,
        },
      },
      estabelecimentos: {
        take: 1,
        where: estabWhere,
        select: {
          cnpj_ordem: true,
          cnpj_dv: true,
          uf: true,
          municipio: true,
          nome_fantasia: true,
          situacao_cadastral: true,
          cnae_fiscal_principal: true,
          data_inicio_atividade: true,
          correio_eletronico: true,
          ddd1: true,
          telefone1: true,
        },
        orderBy: [
          { cnpj_ordem: 'asc' },
          { cnpj_dv: 'asc' },
        ],
      },
    };

    const countPromise = this.prisma.empresas.count({ where });
    const rowsPromise = take > 0
      ? this.prisma.empresas.findMany({
          skip,
          take,
          where,
          select,
          orderBy: { cnpj_basico: 'asc' },
        })
      : Promise.resolve([] as any[]);

    const [rows, count] = await Promise.all([rowsPromise, countPromise]);

    return { rows, count };
  }
}

export default ProspectRepository;
