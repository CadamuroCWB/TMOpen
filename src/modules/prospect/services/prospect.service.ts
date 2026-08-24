import prisma from '../../../config/prisma.js';
import { ProspectRepository } from '../repositories/prospect.repository.js';
import type { ProspectListQuery } from '../schemas/prospect.schema.js';
import { calcPaginationMeta, type Paginated } from '../../../common/pagination.js';
import type { FastifyBaseLogger } from 'fastify';

const SITUACAO_CADASTRAL_DESC: Record<number, string> = {
  1: 'NULA',
  2: 'ATIVA',
  3: 'SUSPENSA',
  4: 'INAPTA',
  5: 'BAIXADA',
  6: 'REABERTA',
  7: 'INTERDITADA',
  8: 'EXTINTA',
};

const PORTE_DESC: Record<string, string> = {
  '00': 'Não informado',
  '01': 'Micro empresa',
  '03': 'Empresa de pequeno porte',
  '05': 'Demais',
};

type DomainMaps = {
  municipios: Map<string, string>;
  cnaes: Map<string, string>;
  naturezas: Map<string, string>;
};

export class ProspectService {
  private repo = new ProspectRepository();
  private prisma = prisma;

  private formatTelefone(ddd: string | null | undefined, tel: string | null | undefined): string | null {
    const cleanDdd = ddd ? String(ddd).trim().replace(/\D/g, '') : '';
    const cleanTel = tel ? String(tel).trim().replace(/\D/g, '') : '';
    if (!cleanDdd && !cleanTel) return null;
    if (cleanDdd && cleanTel) return `(${cleanDdd}) ${cleanTel}`;
    return cleanDdd + cleanTel;
  }

  private async loadDomainMaps(codigos: {
    municipioCodigos: Set<string>;
    cnaeCodigos: Set<string>;
    naturezaCodigos: Set<string>;
  }): Promise<DomainMaps> {
    const [municipiosRows, cnaesRows, naturezasRows] = await Promise.all([
      codigos.municipioCodigos.size > 0
        ? this.prisma.municipios.findMany({
            where: { codigo: { in: Array.from(codigos.municipioCodigos) } },
            select: { codigo: true, descricao: true },
          })
        : Promise.resolve([]),
      codigos.cnaeCodigos.size > 0
        ? this.prisma.cnaes.findMany({
            where: { codigo: { in: Array.from(codigos.cnaeCodigos) } },
            select: { codigo: true, descricao: true },
          })
        : Promise.resolve([]),
      codigos.naturezaCodigos.size > 0
        ? this.prisma.naturezas_juridicas.findMany({
            where: { codigo: { in: Array.from(codigos.naturezaCodigos) } },
            select: { codigo: true, descricao: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      municipios: new Map(municipiosRows.map((r) => [r.codigo, r.descricao])),
      cnaes: new Map(cnaesRows.map((r) => [r.codigo, r.descricao])),
      naturezas: new Map(naturezasRows.map((r) => [r.codigo, r.descricao])),
    };
  }

  private formatEstabelecimento(row: any, maps: DomainMaps) {
    const municipio = row.municipio;
    const cnae = row.cnae_fiscal_principal;
    const situacao = row.situacao_cadastral;
    const porte = row.empresa?.porte;
    const natureza = row.empresa?.natureza_juridica;
    const telefone = this.formatTelefone(row.ddd1, row.telefone1);
    const simples = row.empresa?.dados_simples?.opcao_pelo_simples ?? null;
    const mei = row.empresa?.dados_simples?.opcao_pelo_mei ?? null;

    return {
      cnpj_basico: row.cnpj_basico,
      cnpj_ordem: row.cnpj_ordem,
      cnpj_dv: row.cnpj_dv,
      cnpj_completo: `${row.cnpj_basico}${row.cnpj_ordem}${row.cnpj_dv}`,
      uf: row.uf,
      municipio: municipio,
      municipio_codigo: municipio,
      municipio_descricao: municipio ? maps.municipios.get(municipio) ?? null : null,
      nome_fantasia: row.nome_fantasia,
      situacao_cadastral: situacao,
      situacao_cadastral_descricao: situacao !== undefined ? SITUACAO_CADASTRAL_DESC[situacao] ?? null : null,
      cnae_fiscal_principal: cnae,
      cnae_codigo: cnae,
      cnae_descricao: cnae ? maps.cnaes.get(cnae) ?? null : null,
      data_inicio_atividade: row.data_inicio_atividade,
      correio_eletronico: row.correio_eletronico,
      email: row.correio_eletronico,
      ddd1: row.ddd1,
      telefone1: row.telefone1,
      telefone,
      razao_social: row.empresa?.razao_social ?? null,
      porte: porte ?? null,
      porte_codigo: porte ?? null,
      porte_descricao: porte ? PORTE_DESC[porte] ?? null : null,
      natureza_juridica: natureza ?? null,
      natureza_juridica_descricao: natureza ? maps.naturezas.get(natureza) ?? null : null,
      capital_social: row.empresa?.capital_social ?? null,
      opcao_pelo_simples: simples,
      opcao_pelo_mei: mei,
      simples_nacional: simples,
      simples: simples,
      mei,
    };
  }

  private formatEmpresa(row: any, maps: DomainMaps) {
    const estab = row.estabelecimentos?.[0];
    const porte = row.porte;
    const natureza = row.natureza_juridica;
    const municipio = estab?.municipio;
    const cnae = estab?.cnae_fiscal_principal;
    const situacao = estab?.situacao_cadastral;
    const telefone = this.formatTelefone(estab?.ddd1, estab?.telefone1);
    const simples = row.dados_simples?.opcao_pelo_simples ?? null;
    const mei = row.dados_simples?.opcao_pelo_mei ?? null;

    return {
      cnpj_basico: row.cnpj_basico,
      cnpj_completo: estab ? `${row.cnpj_basico}${estab.cnpj_ordem}${estab.cnpj_dv}` : `${row.cnpj_basico}000100`,
      razao_social: row.razao_social,
      porte: porte ?? null,
      porte_codigo: porte ?? null,
      porte_descricao: porte ? PORTE_DESC[porte] ?? null : null,
      natureza_juridica: natureza ?? null,
      natureza_juridica_descricao: natureza ? maps.naturezas.get(natureza) ?? null : null,
      capital_social: row.capital_social ?? null,
      opcao_pelo_simples: simples,
      opcao_pelo_mei: mei,
      simples_nacional: simples,
      simples,
      mei,
      uf: estab?.uf ?? null,
      municipio: municipio ?? null,
      municipio_codigo: municipio ?? null,
      municipio_descricao: municipio ? maps.municipios.get(municipio) ?? null : null,
      nome_fantasia: estab?.nome_fantasia ?? null,
      situacao_cadastral: situacao ?? null,
      situacao_cadastral_descricao: situacao !== undefined && situacao !== null ? SITUACAO_CADASTRAL_DESC[situacao] ?? null : null,
      cnae_fiscal_principal: cnae ?? null,
      cnae_codigo: cnae ?? null,
      cnae_descricao: cnae ? maps.cnaes.get(cnae) ?? null : null,
      data_inicio_atividade: estab?.data_inicio_atividade ?? null,
      correio_eletronico: estab?.correio_eletronico ?? null,
      email: estab?.correio_eletronico ?? null,
      ddd1: estab?.ddd1 ?? null,
      telefone1: estab?.telefone1 ?? null,
      telefone,
    };
  }

  async searchEstabelecimentos(query: ProspectListQuery, logger?: FastifyBaseLogger): Promise<Paginated<any>> {
    const page = query.page;
    const limit = query.limit;

    const filter = {
      uf: query.uf,
      municipio: query.municipio,
      municipio_codigos: Array.isArray(query.municipio_codigos) ? query.municipio_codigos : undefined,
      cnae: query.cnae,
      situacao_cadastral: query.situacao_cadastral,
      porte: query.porte,
      opcao_pelo_simples: query.opcao_pelo_simples,
      opcao_pelo_mei: query.opcao_pelo_mei,
      razao_social: query.razao_social,
      nome_fantasia: query.nome_fantasia,
      cnpj_basico: query.cnpj_basico,
      data_inicio_atividade_de: query.data_inicio_atividade_de,
      data_inicio_atividade_ate: query.data_inicio_atividade_ate,
    };

    const startedAt = performance.now();
    try {
      const { rows, count } = await this.repo.searchEstabelecimentos({ page, limit, filter });
      const elapsedMs = Math.round(performance.now() - startedAt);

      if (limit === 0 || rows.length === 0) {
        logger?.info(
          { kind: 'estabelecimentos', page, limit, count, rows: rows.length, elapsedMs, filter },
          limit === 0 ? 'prospect.count.estabelecimentos' : 'prospect.search.estabelecimentos.empty',
        );
        return { data: [], meta: calcPaginationMeta(page, limit, count) };
      }

      const municipioCodigos = new Set<string>();
      const cnaeCodigos = new Set<string>();
      const naturezaCodigos = new Set<string>();

      for (const row of rows) {
        if (row.municipio) municipioCodigos.add(row.municipio);
        if (row.cnae_fiscal_principal) cnaeCodigos.add(row.cnae_fiscal_principal);
        if (row.empresa?.natureza_juridica) naturezaCodigos.add(row.empresa.natureza_juridica);
      }

      const maps = await this.loadDomainMaps({ municipioCodigos, cnaeCodigos, naturezaCodigos });
      const data = rows.map((r) => this.formatEstabelecimento(r, maps));

      logger?.info(
        { kind: 'estabelecimentos', page, limit, count, rows: rows.length, elapsedMs },
        'prospect.search.estabelecimentos.ok',
      );
      return { data, meta: calcPaginationMeta(page, limit, count) };
    } catch (err) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      logger?.error(
        { kind: 'estabelecimentos', page, limit, elapsedMs, filter, err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err },
        'prospect.search.estabelecimentos.error',
      );
      throw err;
    }
  }

  async searchEmpresas(query: ProspectListQuery, logger?: FastifyBaseLogger): Promise<Paginated<any>> {
    const page = query.page;
    const limit = query.limit;

    const filter = {
      uf: query.uf,
      municipio: query.municipio,
      municipio_codigos: Array.isArray(query.municipio_codigos) ? query.municipio_codigos : undefined,
      cnae: query.cnae,
      situacao_cadastral: query.situacao_cadastral,
      porte: query.porte,
      opcao_pelo_simples: query.opcao_pelo_simples,
      opcao_pelo_mei: query.opcao_pelo_mei,
      razao_social: query.razao_social,
      nome_fantasia: query.nome_fantasia,
      cnpj_basico: query.cnpj_basico,
      data_inicio_atividade_de: query.data_inicio_atividade_de,
      data_inicio_atividade_ate: query.data_inicio_atividade_ate,
    };

    const startedAt = performance.now();
    try {
      const { rows, count } = await this.repo.searchEmpresas({ page, limit, filter });
      const elapsedMs = Math.round(performance.now() - startedAt);

      if (limit === 0 || rows.length === 0) {
        logger?.info(
          { kind: 'empresas', page, limit, count, rows: rows.length, elapsedMs, filter },
          limit === 0 ? 'prospect.count.empresas' : 'prospect.search.empresas.empty',
        );
        return { data: [], meta: calcPaginationMeta(page, limit, count) };
      }

      const municipioCodigos = new Set<string>();
      const cnaeCodigos = new Set<string>();
      const naturezaCodigos = new Set<string>();

      for (const row of rows) {
        const estab = row.estabelecimentos?.[0];
        if (estab?.municipio) municipioCodigos.add(estab.municipio);
        if (estab?.cnae_fiscal_principal) cnaeCodigos.add(estab.cnae_fiscal_principal);
        if (row.natureza_juridica) naturezaCodigos.add(row.natureza_juridica);
      }

      const maps = await this.loadDomainMaps({ municipioCodigos, cnaeCodigos, naturezaCodigos });
      const data = rows.map((r) => this.formatEmpresa(r, maps));

      logger?.info(
        { kind: 'empresas', page, limit, count, rows: rows.length, elapsedMs },
        'prospect.search.empresas.ok',
      );
      return { data, meta: calcPaginationMeta(page, limit, count) };
    } catch (err) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      logger?.error(
        { kind: 'empresas', page, limit, elapsedMs, filter, err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err },
        'prospect.search.empresas.error',
      );
      throw err;
    }
  }
}

export default ProspectService;
