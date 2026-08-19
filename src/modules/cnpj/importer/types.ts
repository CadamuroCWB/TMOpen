export type FileKind =
  | 'empresas'
  | 'estabelecimentos'
  | 'socios'
  | 'dados_simples'
  | 'cnaes'
  | 'motivos'
  | 'municipios'
  | 'naturezas_juridicas'
  | 'paises'
  | 'qualificacoes_socios';

export type TableName = FileKind;

export type OnConflictMode = 'skip' | 'upsert' | 'error';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface ImportOptions {
  dir?: string;
  file?: string;
  batchSize: number;
  truncate: boolean;
  tables: TableName[];
  onConflict: OnConflictMode;
  dryRun: boolean;
  skipBadLines: boolean;
  tolerantFk: boolean;
  maxBadLines: number;
  logLevel: LogLevel;
  dropIndexesBefore: boolean;
  parallelDomains: boolean;
}

export interface BatchStats {
  read: number;
  mapped: number;
  inserted: number;
  skipped: number;
  badLines: number;
  startAt: number;
  lastFlushAt: number;
}

export interface FileSummary {
  kind: FileKind;
  path: string;
  read: number;
  mapped: number;
  inserted: number;
  skipped: number;
  badLines: number;
  durationMs: number;
  linesPerSecond: number;
  errors: string[];
}

export interface RunReport {
  startedAt: string;
  endedAt: string;
  durationMs: number;
  files: FileSummary[];
  globalBadLines: number;
  peakMemoryMB: number;
  optionsUsed: Omit<ImportOptions, 'dir' | 'file'> & { dir?: string; file?: string };
  ok: boolean;
  logDir: string;
}

export interface ClassifiedFile {
  kind: FileKind;
  path: string;
  sizeBytes: number;
  temp?: boolean;
  tempDir?: string;
}

export type MappingResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; reason: string; rawLine: string };

export const FILE_KIND_TABLE: Record<FileKind, TableName> = {
  empresas: 'empresas',
  estabelecimentos: 'estabelecimentos',
  socios: 'socios',
  dados_simples: 'dados_simples',
  cnaes: 'cnaes',
  motivos: 'motivos',
  municipios: 'municipios',
  naturezas_juridicas: 'naturezas_juridicas',
  paises: 'paises',
  qualificacoes_socios: 'qualificacoes_socios',
};
