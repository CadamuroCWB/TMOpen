import fs from 'node:fs';
import path from 'node:path';
import type { FileSummary, RunReport, TableName } from './types.js';

export function writeReport(logDir: string, report: RunReport): string {
  const file = path.join(logDir, 'summary.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
  return file;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m % 60 > 0) parts.push(`${m % 60}m`);
  if (s % 60 > 0) parts.push(`${s % 60}s`);
  return parts.join(' ') || '0s';
}

function pad(s: string | number, len: number, align: 'left' | 'right' = 'right'): string {
  const str = String(s);
  if (str.length >= len) return str.slice(0, len);
  return align === 'right' ? str.padStart(len, ' ') : str.padEnd(len, ' ');
}

export function printSummaryTable(report: RunReport) {
  const header = [
    pad('TABELA', 22, 'left'),
    pad('LIDAS', 10),
    pad('MAPEADAS', 10),
    pad('INSERIDAS', 10),
    pad('SKIPADAS', 10),
    pad('BAD', 8),
    pad('LINHAS/S', 10),
    pad('DURAÇÃO', 12),
  ].join(' | ');
  const sep = '-'.repeat(header.length);
  const lines: string[] = ['', sep, header, sep];
  const byTable = new Map<TableName, FileSummary[]>();
  for (const s of report.files) {
    if (!byTable.has(s.kind)) byTable.set(s.kind, []);
    byTable.get(s.kind)!.push(s);
  }
  const order: TableName[] = [
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
  let totalRead = 0;
  let totalMapped = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalBad = 0;
  for (const t of order) {
    const arr = byTable.get(t);
    if (!arr || arr.length === 0) continue;
    const aggr = arr.reduce(
      (acc, s) => {
        acc.read += s.read;
        acc.mapped += s.mapped;
        acc.inserted += s.inserted;
        acc.skipped += s.skipped;
        acc.bad += s.badLines;
        acc.ms = Math.max(acc.ms, s.durationMs);
        return acc;
      },
      { read: 0, mapped: 0, inserted: 0, skipped: 0, bad: 0, ms: 0 },
    );
    const lps = aggr.ms > 0 ? Math.round((aggr.read / aggr.ms) * 1000) : 0;
    lines.push(
      [
        pad(t, 22, 'left'),
        pad(aggr.read.toLocaleString('pt-BR'), 10),
        pad(aggr.mapped.toLocaleString('pt-BR'), 10),
        pad(aggr.inserted.toLocaleString('pt-BR'), 10),
        pad(aggr.skipped.toLocaleString('pt-BR'), 10),
        pad(aggr.bad.toLocaleString('pt-BR'), 8),
        pad(lps.toLocaleString('pt-BR'), 10),
        pad(formatDuration(aggr.ms), 12, 'left'),
      ].join(' | '),
    );
    totalRead += aggr.read;
    totalMapped += aggr.mapped;
    totalInserted += aggr.inserted;
    totalSkipped += aggr.skipped;
    totalBad += aggr.bad;
  }
  lines.push(sep);
  const totalLps =
    report.durationMs > 0
      ? Math.round((totalRead / report.durationMs) * 1000)
      : 0;
  lines.push(
    [
      pad('TOTAL', 22, 'left'),
      pad(totalRead.toLocaleString('pt-BR'), 10),
      pad(totalMapped.toLocaleString('pt-BR'), 10),
      pad(totalInserted.toLocaleString('pt-BR'), 10),
      pad(totalSkipped.toLocaleString('pt-BR'), 10),
      pad(totalBad.toLocaleString('pt-BR'), 8),
      pad(totalLps.toLocaleString('pt-BR'), 10),
      pad(formatDuration(report.durationMs), 12, 'left'),
    ].join(' | '),
  );
  lines.push(sep);
  lines.push(
    `STATUS: ${report.ok ? 'SUCESSO' : 'COM ERROS'} | DURAÇÃO TOTAL: ${formatDuration(
      report.durationMs,
    )} | PICO DE MEMÓRIA: ${report.peakMemoryMB} MB | BAD LINES: ${report.globalBadLines}`,
  );
  lines.push(`LOGS: ${report.logDir}`);
  lines.push('');
  return lines.join('\n');
}
