import prisma from '../../../config/prisma.js';
import type { Prisma } from '@prisma/client';

type ProspectFilter = {
  uf?: string;
  municipio?: string;
  municipio_codigos?: string[];
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

function onlyDigits(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/\D+/g, '');
}

async function resolveMunicipioCodigos(
  prismaInst: typeof prisma,
  raw: string | null | undefined,
): Promise<{ in?: string[] } | string | null> {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const digits = onlyDigits(trimmed);
  if (digits.length === 7) return digits;

  const rows = await prismaInst.municipios.findMany({
    where: {
      descricao: {
        contains: trimmed,
        mode: 'insensitive',
      },
    },
    select: { codigo: true },
    take: 500,
  });
  const codigos = rows.map((r) => r.codigo);
  if (codigos.length === 0) return { in: ['__EMPTY__'] };
  return { in: codigos };
}

async function resolveCnaeCodigos(
  prismaInst: typeof prisma,
  raw: string | null | undefined,
): Promise<{ in?: string[] } | string | null> {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const digits = onlyDigits(trimmed);
  if (digits.length === 7) return digits;
  if (digits.length > 0 && digits.length <= 7) {
    const rows = await prismaInst.cnaes.findMany({
      where: { codigo: { startsWith: digits } },
      select: { codigo: true },
      take: 1000,
    });
    const codigos = rows.map((r) => r.codigo);
    if (codigos.length === 0) return { in: ['__EMPTY__'] };
    return { in: codigos };
  }

  const rows = await prismaInst.cnaes.findMany({
    where: {
      descricao: {
        contains: trimmed,
        mode: 'insensitive',
      },
    },
    select: { codigo: true },
    take: 500,
  });
  const codigos = rows.map((r) => r.codigo);
  if (codigos.length === 0) return { in: ['__EMPTY__'] };
  return { in: codigos };
}

export class ProspectRepository {
  private prisma = prisma;

  async searchEstabelecimentos({ page, limit, filter }: SearchParams) {
    const skip = limit > 0 ? (page - 1) * limit : 0;
    const take = limit > 0 ? limit : 0;

    const where: Prisma.estabelecimentosWhereInput = {};

    if (filter.uf) {
      where.uf = filter.uf;
    }

    if (filter.municipio_codigos && filter.municipio_codigos.length > 0) {
      const normalized = filter.municipio_codigos
        .map((c) => onlyDigits(c))
        .filter((c) => c.length === 7);
      if (normalized.length > 0) {
        where.municipio = { in: normalized } as any;
      } else {
        where.municipio = { in: ['__EMPTY__'] } as any;
      }
    } else if (filter.municipio) {
      const resolved = await resolveMunicipioCodigos(this.prisma, filter.municipio);
      if (resolved !== null) {
        where.municipio = resolved as any;
      }
    }

    if (filter.cnae) {
      const resolved = await resolveCnaeCodigos(this.prisma, filter.cnae);
      if (resolved !== null) {
        where.cnae_fiscal_principal = resolved as any;
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

    if (filter.municipio_codigos && filter.municipio_codigos.length > 0) {
      const normalized = filter.municipio_codigos
        .map((c) => onlyDigits(c))
        .filter((c) => c.length === 7);
      if (normalized.length > 0) {
        estabWhere.municipio = { in: normalized } as any;
      } else {
        estabWhere.municipio = { in: ['__EMPTY__'] } as any;
      }
    } else if (filter.municipio) {
      const resolved = await resolveMunicipioCodigos(this.prisma, filter.municipio);
      if (resolved !== null) {
        estabWhere.municipio = resolved as any;
      }
    }

    if (filter.cnae) {
      const resolved = await resolveCnaeCodigos(this.prisma, filter.cnae);
      if (resolved !== null) {
        estabWhere.cnae_fiscal_principal = resolved as any;
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
      where.dados_simples = dadosSimplesWhere as any;
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

  async getSociosPorCnpjBasico(cnpjBasico: string) {
    const where: Prisma.sociosWhereInput = { cnpj_basico: cnpjBasico };
    const rows = await this.prisma.socios.findMany({
      where,
      orderBy: [
        { data_entrada_sociedade: 'asc' },
        { nome_socio: 'asc' },
      ],
      take: 500,
      select: {
        identificador_de_socio: true,
        nome_socio: true,
        cnpj_cpf_do_socio: true,
        qualificacao_do_socio: true,
        data_entrada_sociedade: true,
        pais: true,
        representante_legal: true,
        nome_do_representante: true,
        qualificacao_representante_legal: true,
        faixa_etaria: true,
        qualificacao_socio_rel: {
          select: { descricao: true },
        },
        pais_rel: {
          select: { descricao: true },
        },
        qualificacao_representante_rel: {
          select: { descricao: true },
        },
      },
    });
    return rows as any[];
  }
}

export default ProspectRepository;
