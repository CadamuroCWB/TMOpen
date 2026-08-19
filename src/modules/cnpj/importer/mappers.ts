import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { COLUMN_COUNT, DOMAIN_PLACEHOLDER_PREFIX } from './constants.js';
import type { FileKind, MappingResult, TableName } from './types.js';

export type PrismaCreateInput =
  | Prisma.empresasCreateManyInput
  | Prisma.estabelecimentosCreateManyInput
  | Prisma.sociosCreateManyInput
  | Prisma.dados_simplesCreateManyInput
  | Prisma.cnaesCreateManyInput
  | Prisma.motivosCreateManyInput
  | Prisma.municipiosCreateManyInput
  | Prisma.naturezas_juridicasCreateManyInput
  | Prisma.paisesCreateManyInput
  | Prisma.qualificacoes_sociosCreateManyInput;

function isEmpty(v: string | null | undefined): v is null | undefined | '' {
  return v == null || v === '' || v.trim() === '';
}

export function str(v: string | null | undefined): string | null {
  if (isEmpty(v)) return null;
  return String(v).trim();
}

export function char(v: string | null | undefined, len: number): string | null {
  const s = str(v);
  if (s == null) return null;
  let out = s;
  if (/^\d+$/.test(out)) {
    out = out.padStart(len, '0');
  }
  if (out.length > len) {
    out = out.slice(0, len);
  }
  return out;
}

export function int(v: string | null | undefined): number | null {
  const s = str(v);
  if (s == null) return null;
  const n = Number.parseInt(s, 10);
  if (Number.isNaN(n)) return null;
  return n;
}

export function date(v: string | null | undefined): Date | null {
  const s = str(v);
  if (s == null) return null;
  if (!/^\d{8}$/.test(s)) return null;
  if (s === '00000000' || s === '99999999') return null;
  const y = Number.parseInt(s.slice(0, 4), 10);
  const m = Number.parseInt(s.slice(4, 6), 10);
  const d = Number.parseInt(s.slice(6, 8), 10);
  if (y < 1900 || y > 2999) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function decimal(v: string | null | undefined): Prisma.Decimal | null {
  const s = str(v);
  if (s == null) return null;
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  try {
    return new Decimal(cleaned);
  } catch {
    return null;
  }
}

export function makePlaceholderDesc(codigo: string): string {
  return `${DOMAIN_PLACEHOLDER_PREFIX} COD=${codigo}`;
}

function expectColumnCount(
  kind: FileKind,
  columns: string[],
): { ok: false; reason: string; rawLine: string } | null {
  const expected = COLUMN_COUNT[kind];
  if (columns.length < expected) {
    return {
      ok: false,
      reason: `COLUMN_COUNT_MISMATCH: esperado ${expected}, recebido ${columns.length} (faltam colunas)`,
      rawLine: '',
    };
  }
  return null;
}

function mapCnaes(c: string[]): MappingResult<Prisma.cnaesCreateManyInput> {
  return {
    ok: true,
    data: {
      codigo: char(c[0], 7)!,
      descricao: str(c[1]) ?? '',
    },
  };
}

function mapMotivos(c: string[]): MappingResult<Prisma.motivosCreateManyInput> {
  return {
    ok: true,
    data: {
      codigo: char(c[0], 2)!,
      descricao: str(c[1]) ?? '',
    },
  };
}

function mapMunicipios(c: string[]): MappingResult<Prisma.municipiosCreateManyInput> {
  return {
    ok: true,
    data: {
      codigo: char(c[0], 7)!,
      descricao: str(c[1]) ?? '',
      uf: char(c[2], 2),
    },
  };
}

function mapNaturezas(c: string[]): MappingResult<Prisma.naturezas_juridicasCreateManyInput> {
  return {
    ok: true,
    data: {
      codigo: char(c[0], 4)!,
      descricao: str(c[1]) ?? '',
    },
  };
}

function mapPaises(c: string[]): MappingResult<Prisma.paisesCreateManyInput> {
  return {
    ok: true,
    data: {
      codigo: char(c[0], 3)!,
      descricao: str(c[1]) ?? '',
    },
  };
}

function mapQualificacoes(c: string[]): MappingResult<Prisma.qualificacoes_sociosCreateManyInput> {
  return {
    ok: true,
    data: {
      codigo: char(c[0], 2)!,
      descricao: str(c[1]) ?? '',
    },
  };
}

function mapEmpresas(c: string[]): MappingResult<Prisma.empresasCreateManyInput> {
  return {
    ok: true,
    data: {
      cnpj_basico: char(c[0], 8)!,
      razao_social: str(c[1]) ?? '',
      natureza_juridica: char(c[2], 4)!,
      qualificacao_responsavel: char(c[3], 2)!,
      capital_social: decimal(c[4]),
      porte: char(c[5], 1),
      ente_federativo: str(c[6]),
    },
  };
}

function mapEstabelecimentos(c: string[]): MappingResult<Prisma.estabelecimentosCreateManyInput> {
  return {
    ok: true,
    data: {
      cnpj_basico: char(c[0], 8)!,
      cnpj_ordem: char(c[1], 4)!,
      cnpj_dv: char(c[2], 2)!,
      identificador_matriz_filial: int(c[3]) ?? 1,
      nome_fantasia: str(c[4]),
      situacao_cadastral: int(c[5]) ?? 0,
      data_situacao_cadastral: date(c[6]),
      motivo_situacao_cadastral: char(c[7], 2)!,
      nome_cidade_exterior: str(c[8]),
      pais: char(c[9], 3),
      data_inicio_atividade: date(c[10]),
      cnae_fiscal_principal: char(c[11], 7)!,
      cnae_fiscal_secundaria: str(c[12]),
      tipo_logradouro: str(c[13]),
      logradouro: str(c[14]),
      numero: str(c[15]),
      complemento: str(c[16]),
      bairro: str(c[17]),
      cep: char(c[18], 8),
      uf: char(c[19], 2),
      municipio: char(c[20], 7),
      ddd1: char(c[21], 4),
      telefone1: str(c[22]),
      ddd2: char(c[23], 4),
      telefone2: str(c[24]),
      ddd_fax: char(c[25], 4),
      fax: str(c[26]),
      correio_eletronico: str(c[27]),
      situacao_especial: str(c[28]),
      data_situacao_especial: date(c[29]),
    },
  };
}

function mapSocios(c: string[]): MappingResult<Prisma.sociosCreateManyInput> {
  return {
    ok: true,
    data: {
      cnpj_basico: char(c[0], 8)!,
      identificador_de_socio: int(c[1]) ?? 1,
      nome_socio: str(c[2]),
      cnpj_cpf_do_socio: str(c[3]),
      qualificacao_do_socio: char(c[4], 2),
      data_entrada_sociedade: date(c[5]),
      pais: char(c[6], 3),
      representante_legal: char(c[7], 11),
      nome_do_representante: str(c[8]),
      qualificacao_representante_legal: char(c[9], 2),
      faixa_etaria: char(c[10], 1),
    },
  };
}

function mapSimples(c: string[]): MappingResult<Prisma.dados_simplesCreateManyInput> {
  return {
    ok: true,
    data: {
      cnpj_basico: char(c[0], 8)!,
      opcao_pelo_simples: char(c[1], 1),
      data_opcao_simples: date(c[2]),
      data_exclusao_simples: date(c[3]),
      opcao_pelo_mei: char(c[4], 1),
      data_opcao_mei: date(c[5]),
      data_exclusao_mei: date(c[6]),
    },
  };
}

const MAPPERS: Record<
  FileKind,
  (c: string[]) => MappingResult<PrismaCreateInput>
> = {
  cnaes: mapCnaes,
  motivos: mapMotivos,
  municipios: mapMunicipios,
  naturezas_juridicas: mapNaturezas,
  paises: mapPaises,
  qualificacoes_socios: mapQualificacoes,
  empresas: mapEmpresas,
  estabelecimentos: mapEstabelecimentos,
  socios: mapSocios,
  dados_simples: mapSimples,
};

export function mapLine(
  kind: FileKind,
  columns: string[],
  rawLine = '',
): MappingResult<PrismaCreateInput> {
  const countErr = expectColumnCount(kind, columns);
  if (countErr) {
    return {
      ok: false,
      reason: countErr.reason,
      rawLine: rawLine || countErr.rawLine,
    };
  }
  try {
    const inner = MAPPERS[kind](columns);
    if (inner.ok) return inner as MappingResult<PrismaCreateInput>;
    return inner as MappingResult<PrismaCreateInput>;
  } catch (err) {
    return {
      ok: false,
      reason: `MAPPER_ERROR: ${err instanceof Error ? err.message : String(err)}`,
      rawLine,
    };
  }
}

export type MapFn = (c: string[]) => MappingResult<PrismaCreateInput>;
export const TABLE_NAME_KIND: Record<TableName, FileKind> = {
  cnaes: 'cnaes',
  motivos: 'motivos',
  municipios: 'municipios',
  naturezas_juridicas: 'naturezas_juridicas',
  paises: 'paises',
  qualificacoes_socios: 'qualificacoes_socios',
  empresas: 'empresas',
  estabelecimentos: 'estabelecimentos',
  socios: 'socios',
  dados_simples: 'dados_simples',
};
