#!/usr/bin/env node
import { Command } from 'commander';
import { runImport, ALL_TABLES, defaultImportOptions, normalizeTables } from './index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '../../../../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
type ConflictMode = 'skip' | 'upsert' | 'error';

const program = new Command();
const defaults = defaultImportOptions();

program
  .name('tmopen-import-cnpj')
  .description(
    'Importador de dados de CNPJ da Receita Federal (layout oficial) para o banco do TMOpen.',
  )
  .version(pkg.version);

program
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
    '-l, --log-level <level>',
    'fatal | error | warn | info | debug | trace (padrão: info)',
    /^(fatal|error|warn|info|debug|trace)$/i,
    'info',
  )
  .option(
    '--drop-indexes-before',
    'Remove índices não-PK antes da carga e recria ao final (acelera full-load)',
  )
  .option(
    '--parallel-domains',
    `Importa tabelas de domínio em paralelo (padrão: ${defaults.parallelDomains})`,
    defaults.parallelDomains,
  );

program.action(async (opts) => {
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

program.parseAsync(process.argv).catch((err) => {
  console.error('Erro não tratado:', err);
  process.exit(1);
});
