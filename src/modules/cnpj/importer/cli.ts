#!/usr/bin/env node
import { Command } from 'commander';
import {
  runImport,
  ALL_TABLES,
  defaultImportOptions,
  normalizeTables,
  dropIndexes,
  recreateIndexes,
} from './index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pino from 'pino';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '../../../../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
type ConflictMode = 'skip' | 'upsert' | 'error';

function makeSimpleLogger(logLevel: LogLevel = 'info'): ReturnType<typeof pino> {
  return pino({
    level: logLevel,
    transport: { target: 'pino-pretty' },
  });
}

const program = new Command();
const defaults = defaultImportOptions();

program
  .name('tmopen-import-cnpj')
  .description(
    'Importador de dados de CNPJ da Receita Federal (layout oficial) para o banco do TMOpen.',
  )
  .version(pkg.version);

const commonOpts = (cmd: Command) =>
  cmd
    .option(
      '-l, --log-level <level>',
      'fatal | error | warn | info | debug | trace (padrão: info)',
      /^(fatal|error|warn|info|debug|trace)$/i,
      'info',
    );

commonOpts(
  program
    .command('import', { isDefault: true })
    .description('Executa a importação completa de arquivos CSV da Receita Federal')
    .option('-d, --dir <path>', 'Diretório contendo arquivos CSV (ou extraídos do ZIP)')
    .option('-f, --file <path>', 'Arquivo único (CSV ou .zip com arquivos da Receita)')
    .option(
      '-b, --batch-size <n>',
      `Tamanho do lote para createMany (padrão: ${defaults.batchSize})`,
      (v) => Number.parseInt(v, 10),
    )
    .option(
      '-t, --tables <list>',
      'Subconjunto de tabelas a importar (csv separado por vírgula). Tabelas disponíveis: ' +
        ALL_TABLES.join(', '),
    )
    .option(
      '--on-conflict <mode>',
      'Comportamento em conflito de PK: skip | upsert | error (padrão: skip)',
      /^(skip|upsert|error)$/i,
      'skip',
    )
    .option('--truncate', 'Limpa todas as tabelas em ordem FK antes de importar')
    .option('--dry-run', 'Faz parsing, mapeamento e contagem sem escrever no banco')
    .option(
      '--skip-bad-lines',
      `Ignora linhas com erro de mapeamento (padrão: ${defaults.skipBadLines})`,
      defaults.skipBadLines,
    )
    .option(
      '--no-skip-bad-lines',
      'Aborta no primeiro erro de parsing/mapeamento',
    )
    .option(
      '--tolerant-fk',
      `Insere placeholders em tabelas de domínio para FKs ausentes (padrão: ${defaults.tolerantFk})`,
      defaults.tolerantFk,
    )
    .option(
      '--strict-fk',
      'Pula linhas que referenciam FKs de domínio inexistentes (grava como bad line)',
    )
    .option(
      '--max-bad-lines <n>',
      `Limite de bad lines antes de abortar (0 = infinito; padrão: ${defaults.maxBadLines})`,
      (v) => Number.parseInt(v, 10),
    )
    .option(
      '--drop-indexes-before',
      'Remove índices não-PK antes da carga e recria ao final (acelera full-load)',
    )
    .option(
      '--parallel-domains',
      `Importa tabelas de domínio em paralelo (padrão: ${defaults.parallelDomains})`,
      defaults.parallelDomains,
    ),
).action(async (opts) => {
  const tables = normalizeTables(opts.tables ? [opts.tables] : undefined);
  const result = await runImport({
    dir: opts.dir,
    file: opts.file,
    batchSize: opts.batchSize,
    truncate: Boolean(opts.truncate),
    tables,
    onConflict: String(opts.onConflict).toLowerCase() as ConflictMode,
    dryRun: Boolean(opts.dryRun),
    skipBadLines: Boolean(opts.skipBadLines),
    tolerantFk: opts.strictFk ? false : Boolean(opts.tolerantFk),
    maxBadLines: opts.maxBadLines,
    logLevel: String(opts.logLevel).toLowerCase() as LogLevel,
    dropIndexesBefore: Boolean(opts.dropIndexesBefore),
    parallelDomains: Boolean(opts.parallelDomains),
  });
  process.exit(result.ok ? 0 : 1);
});

commonOpts(
  program
    .command('reindex')
    .description('Remove e recria todos os índices não-PK (útil após carga ou quando o banco encheu de espaço durante o index build)'),
).action(async (opts) => {
  const logger = makeSimpleLogger(String(opts.logLevel).toLowerCase() as LogLevel);
  const t0 = Date.now();
  logger.warn('Iniciando rebuild de índices não-PK...');
  await dropIndexes(logger as unknown as Parameters<typeof dropIndexes>[0]);
  await recreateIndexes(logger as unknown as Parameters<typeof recreateIndexes>[0]);
  logger.info({ durationMs: Date.now() - t0 }, 'Rebuild de índices concluído com sucesso');
  process.exit(0);
});

commonOpts(
  program
    .command('drop-indexes')
    .description('Remove apenas os índices não-PK (para acelerar cargas manuais). Use `reindex` depois para restaurar.'),
).action(async (opts) => {
  const logger = makeSimpleLogger(String(opts.logLevel).toLowerCase() as LogLevel);
  logger.warn('Removendo índices não-PK...');
  await dropIndexes(logger as unknown as Parameters<typeof dropIndexes>[0]);
  logger.info('Índices não-PK removidos. Para restaurar, rode `reindex`.');
  process.exit(0);
});

program.parseAsync(process.argv).catch((err) => {
  console.error('Erro não tratado:', err);
  process.exit(1);
});
