import type { FileKind, TableName } from './types.js';

export const DEFAULT_BATCH_SIZE = 2000;
export const DEFAULT_MAX_BAD_LINES = 100_000;
export const DOMAIN_PLACEHOLDER_PREFIX = '[IMPORT] NÃO INFORMADA';

export const IMPORT_ORDER: TableName[][] = [
  ['cnaes', 'motivos', 'municipios', 'naturezas_juridicas', 'paises', 'qualificacoes_socios'],
  ['empresas'],
  ['dados_simples'],
  ['estabelecimentos'],
  ['socios'],
];

export const TRUNCATE_ORDER: TableName[] = [
  'socios',
  'estabelecimentos',
  'dados_simples',
  'empresas',
  'qualificacoes_socios',
  'paises',
  'naturezas_juridicas',
  'municipios',
  'motivos',
  'cnaes',
];

export const FILE_KIND_SUFFIXES: Record<FileKind, RegExp[]> = {
  empresas: [
    /emprecsv$/i,
    /\.empre(\.d\d+)?\.csv$/i,
    /\.empresacsv$/i,
  ],
  estabelecimentos: [
    /estabele$/i,
    /estabelecsv$/i,
    /estabeleccsv$/i,
    /\.estabele(\.d\d+)?\.csv$/i,
    /\.estabelec(\.d\d+)?\.csv$/i,
    /\.estabelecimento(\.d\d+)?\.csv$/i,
  ],
  socios: [
    /sociocsv$/i,
    /\.socio(\.d\d+)?\.csv$/i,
    /\.socios(\.d\d+)?\.csv$/i,
  ],
  dados_simples: [
    /simplescsv$/i,
    /\.simples(\.d\d+)?\.csv$/i,
    /simples\.csv$/i,
    /\.simples\.csv$/i,
  ],
  cnaes: [/cnaecsv$/i, /\.cnae(\.d\d+)?\.csv$/i, /\.cnaes(\.d\d+)?\.csv$/i],
  motivos: [/moticsv$/i, /\.moti(\.d\d+)?\.csv$/i, /\.motivos(\.d\d+)?\.csv$/i],
  municipios: [/municcsv$/i, /\.munic(\.d\d+)?\.csv$/i, /\.municipios(\.d\d+)?\.csv$/i],
  naturezas_juridicas: [
    /natjucsv$/i,
    /\.natju(\.d\d+)?\.csv$/i,
    /\.naturezas[_-]?juridicas?(\.d\d+)?\.csv$/i,
  ],
  paises: [/paiscsv$/i, /\.pais(\.d\d+)?\.csv$/i, /\.paises(\.d\d+)?\.csv$/i],
  qualificacoes_socios: [
    /qualscsv$/i,
    /\.quals(\.d\d+)?\.csv$/i,
    /\.qualificacoes[_-]?socios?(\.d\d+)?\.csv$/i,
  ],
};

export const COLUMN_COUNT: Record<FileKind, number> = {
  empresas: 7,
  estabelecimentos: 30,
  socios: 11,
  dados_simples: 7,
  cnaes: 2,
  motivos: 2,
  municipios: 2,
  naturezas_juridicas: 2,
  paises: 2,
  qualificacoes_socios: 2,
};

export const DOMAIN_TABLES: TableName[] = [
  'cnaes',
  'motivos',
  'municipios',
  'naturezas_juridicas',
  'paises',
  'qualificacoes_socios',
];

export const PK_FIELDS: Record<TableName, string[]> = {
  empresas: ['cnpj_basico'],
  estabelecimentos: ['cnpj_basico', 'cnpj_ordem', 'cnpj_dv'],
  socios: ['id'],
  dados_simples: ['cnpj_basico'],
  cnaes: ['codigo'],
  motivos: ['codigo'],
  municipios: ['codigo'],
  naturezas_juridicas: ['codigo'],
  paises: ['codigo'],
  qualificacoes_socios: ['codigo'],
};

export const DATA_FIELDS: Record<TableName, string[]> = {
  empresas: [
    'razao_social',
    'natureza_juridica',
    'qualificacao_responsavel',
    'capital_social',
    'porte',
    'ente_federativo',
  ],
  estabelecimentos: [
    'identificador_matriz_filial',
    'nome_fantasia',
    'situacao_cadastral',
    'data_situacao_cadastral',
    'motivo_situacao_cadastral',
    'nome_cidade_exterior',
    'pais',
    'data_inicio_atividade',
    'cnae_fiscal_principal',
    'cnae_fiscal_secundaria',
    'tipo_logradouro',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cep',
    'uf',
    'municipio',
    'ddd1',
    'telefone1',
    'ddd2',
    'telefone2',
    'ddd_fax',
    'fax',
    'correio_eletronico',
    'situacao_especial',
    'data_situacao_especial',
  ],
  socios: [
    'cnpj_basico',
    'identificador_de_socio',
    'nome_socio',
    'cnpj_cpf_do_socio',
    'qualificacao_do_socio',
    'data_entrada_sociedade',
    'pais',
    'representante_legal',
    'nome_do_representante',
    'qualificacao_representante_legal',
    'faixa_etaria',
  ],
  dados_simples: [
    'opcao_pelo_simples',
    'data_opcao_simples',
    'data_exclusao_simples',
    'opcao_pelo_mei',
    'data_opcao_mei',
    'data_exclusao_mei',
  ],
  cnaes: ['descricao'],
  motivos: ['descricao'],
  municipios: ['descricao', 'uf'],
  naturezas_juridicas: ['descricao'],
  paises: ['descricao'],
  qualificacoes_socios: ['descricao'],
};

export const FK_REF: Record<TableName, Array<{ column: string; refTable: TableName }>> = {
  empresas: [
    { column: 'natureza_juridica', refTable: 'naturezas_juridicas' },
    { column: 'qualificacao_responsavel', refTable: 'qualificacoes_socios' },
  ],
  estabelecimentos: [
    { column: 'cnae_fiscal_principal', refTable: 'cnaes' },
    { column: 'motivo_situacao_cadastral', refTable: 'motivos' },
    { column: 'municipio', refTable: 'municipios' },
    { column: 'pais', refTable: 'paises' },
  ],
  socios: [
    { column: 'qualificacao_do_socio', refTable: 'qualificacoes_socios' },
    { column: 'pais', refTable: 'paises' },
    { column: 'qualificacao_representante_legal', refTable: 'qualificacoes_socios' },
  ],
  dados_simples: [],
  cnaes: [],
  motivos: [],
  municipios: [],
  naturezas_juridicas: [],
  paises: [],
  qualificacoes_socios: [],
};

export const INDICES_DROP_RECREATE: Array<{
  table: TableName;
  name: string;
  columns: string[];
}> = [
  {
    table: 'empresas',
    name: 'empresas_razao_social_porte_natureza_juridica_idx',
    columns: ['razao_social', 'porte', 'natureza_juridica'],
  },
  {
    table: 'estabelecimentos',
    name: 'estabelecimentos_cnpj_basico_uf_situacao_cnae_nome_municipio_cep_idx',
    columns: [
      'cnpj_basico',
      'uf',
      'situacao_cadastral',
      'cnae_fiscal_principal',
      'nome_fantasia',
      'municipio',
      'cep',
    ],
  },
  {
    table: 'socios',
    name: 'socios_cnpj_basico_nome_socio_cnpj_cpf_do_socio_idx',
    columns: ['cnpj_basico', 'nome_socio', 'cnpj_cpf_do_socio'],
  },
  {
    table: 'dados_simples',
    name: 'dados_simples_opcao_pelo_simples_opcao_pelo_mei_idx',
    columns: ['opcao_pelo_simples', 'opcao_pelo_mei'],
  },
];
