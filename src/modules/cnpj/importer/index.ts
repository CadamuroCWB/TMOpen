import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_MAX_BAD_LINES,
} from './constants.js';
import { createLogDir, createLogger, type ImporterLogger } from './logger.js';
import {
  cleanupTempDirs,
  listFiles,
} from './file.js';
import { ImportPipeline } from './pipeline.js';
import {
  dropIndexes,
  recreateIndexes,
  truncateAllTables,
} from './db.js';
import { printSummaryTable, writeReport } from './report.js';
import type { FileSummary, ImportOptions, RunReport, TableName } from './types.js';

export interface RunImportResult {
  report: RunReport;
  summaries: FileSummary[];
  ok: boolean;
}

const ALL_TABLES: TableName[] = [
  'cnaes',
  'motivos',
  'municipios',
  'naturezas_juridicas',
  'paises',
  'qualificacoes_socios',
  'empresas',
  'dados_simples',
  'estabelecimentos',
  'socios',
];

export function normalizeTables(raw: string[] | undefined): TableName[] {
  if (!raw || raw.length === 0) return [];
  const normalized: TableName[] = [];
  const set = new Set<TableName>();
  for (const item of raw) {
    for (const part of item.split(/[,;\s]+/)) {
      const t = part.trim();
      if (!t) continue;
      if ((ALL_TABLES as string[]).includes(t)) {
        if (!set.has(t as TableName)) {
          set.add(t as TableName);
          normalized.push(t as TableName);
        }
      }
    }
  }
  return normalized;
}

export function defaultImportOptions(
  overrides: Partial<ImportOptions> = {},
): ImportOptions {
  return {
    dir: process.env.IMPORTER_DIR || undefined,
    file: process.env.IMPORTER_FILE || undefined,
    batchSize:
      Number.parseInt(process.env.IMPORTER_BATCH_SIZE || '', 10) ||
      DEFAULT_BATCH_SIZE,
    truncate: false,
    tables: normalizeTables(process.env.IMPORTER_TABLES?.split(',')),
    onConflict: 'skip',
    dryRun: false,
    skipBadLines: true,
    tolerantFk: true,
    maxBadLines:
      Number.parseInt(process.env.IMPORTER_MAX_BAD_LINES || '', 10) ||
      DEFAULT_MAX_BAD_LINES,
    logLevel: (process.env.IMPORTER_LOG_LEVEL as ImportOptions['logLevel']) || 'info',
    dropIndexesBefore: false,
    parallelDomains: true,
    ...overrides,
  };
}

export async function runImport(
  options: Partial<ImportOptions>,
): Promise<RunImportResult> {
  const opts = defaultImportOptions(options);
  const logDir = createLogDir();
  const logger: ImporterLogger = createLogger(logDir, opts.logLevel);
  const pipeline = new ImportPipeline(logger, opts, logDir);
  const cleanup: string[] = [];
  let ok = true;
  let summaries: FileSummary[] = [];

  try {
    logger.info({ options: sanitize(opts), logDir }, 'Iniciando importação CNPJ Receita Federal');

    const { files, cleanupTempDirs: tempDirs } = await listFiles(opts, logger);
    cleanup.push(...tempDirs);
    if (files.length === 0) {
      logger.error('Nenhum arquivo CSV válido encontrado. Use --dir ou --file com arquivos nos sufixos oficiais (.EMPRECSV, .ESTABELE, etc).');
      ok = false;
    } else {
      logger.info({ files: files.map((f) => ({ kind: f.kind, path: f.path })) }, 'Arquivos reconhecidos');
    }

    if (ok && !opts.dryRun) {
      if (opts.truncate) {
        logger.warn('Truncate habilitado: limpando todas as tabelas...');
        await truncateAllTables(undefined, logger);
      }
      if (opts.dropIndexesBefore) {
        logger.warn('Removendo índices não-PK para acelerar carga...');
        await dropIndexes(logger);
      }
    }

    if (ok) {
      summaries = await pipeline.runAll(files);
    }

    if (ok && !opts.dryRun && opts.dropIndexesBefore) {
      logger.warn('Recriando índices não-PK...');
      await recreateIndexes(logger);
    }

    const report = pipeline.buildReport(summaries, ok);
    const reportPath = writeReport(logDir, report);
    logger.info({ reportPath }, 'Relatório JSON gravado');
    const tableStr = printSummaryTable(report);
    console.log(tableStr);

    return { report, summaries, ok };
  } catch (err) {
    ok = false;
    logger.error({ err }, 'Erro fatal na importação');
    const report = pipeline.buildReport(summaries, ok);
    writeReport(logDir, report);
    console.log(printSummaryTable(report));
    return { report, summaries, ok };
  } finally {
    pipeline.close();
    await new Promise((r) => setTimeout(r, 300));
    if (cleanup.length > 0) cleanupTempDirs(cleanup, logger);
    await (logger as unknown as { flush?: () => void }).flush?.();
  }
}

function sanitize<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export { ALL_TABLES };
export { dropIndexes, recreateIndexes, truncateAllTables } from './db.js';
export * from './types.js';
