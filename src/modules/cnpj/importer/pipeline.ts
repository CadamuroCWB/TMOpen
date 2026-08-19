import fs from 'node:fs';
import path from 'node:path';
import {
  ensureDomainPlaceholders,
  insertBatch,
  type InsertBatchResult,
} from './db.js';
import { openCsvStream } from './read-stream.js';
import { createProgress, type ProgressHandle } from './progress.js';
import { FK_REF, IMPORT_ORDER } from './constants.js';
import { mapLine, type PrismaCreateInput } from './mappers.js';
import type {
  BatchStats,
  ClassifiedFile,
  FileKind,
  FileSummary,
  ImportOptions,
  RunReport,
  TableName,
} from './types.js';
import type { ImporterLogger } from './logger.js';

type BadLineWriter = {
  write: (kind: FileKind, reason: string, raw: string) => void;
  close: () => void;
};

function createBadLineWriter(logDir: string): BadLineWriter {
  const handles = new Map<FileKind, fs.WriteStream>();
  function getStream(kind: FileKind): fs.WriteStream {
    if (!handles.has(kind)) {
      const filePath = path.join(logDir, `${kind}.errors.csv`);
      const ws = fs.createWriteStream(filePath, { encoding: 'utf8' });
      ws.write('MOTIVO;LINHA_ORIGINAL\n');
      handles.set(kind, ws);
    }
    return handles.get(kind)!;
  }
  return {
    write(kind, reason, raw) {
      const ws = getStream(kind);
      const safeReason = String(reason).replace(/;/g, ',').replace(/\s+/g, ' ');
      const safeRaw = raw.replace(/;/g, ',').replace(/\r?\n/g, ' ');
      ws.write(`${safeReason};${safeRaw}\n`);
    },
    close() {
      for (const ws of handles.values()) {
        try {
          ws.end();
        } catch {
          // ignore
        }
      }
    },
  };
}

function extractMissingFkRefs(
  table: TableName,
  rows: PrismaCreateInput[],
): Array<{ table: TableName; codigo: string }> {
  const refs = FK_REF[table];
  if (refs.length === 0) return [];
  const acc: Array<{ table: TableName; codigo: string }> = [];
  for (const row of rows) {
    for (const r of refs) {
      const v = (row as Record<string, unknown>)[r.column];
      if (typeof v === 'string' && v.length > 0) {
        acc.push({ table: r.refTable, codigo: v });
      }
    }
  }
  return acc;
}

export class ImportPipeline {
  private logger: ImporterLogger;
  private options: ImportOptions;
  private logDir: string;
  private badLines: BadLineWriter;
  private peakMemoryMB = 0;
  private statsMemoryTimer: NodeJS.Timeout | null = null;
  private readonly startedAt: Date;

  constructor(logger: ImporterLogger, options: ImportOptions, logDir: string) {
    this.logger = logger;
    this.options = options;
    this.logDir = logDir;
    this.badLines = createBadLineWriter(logDir);
    this.startedAt = new Date();
  }

  startMemoryMonitor() {
    this.statsMemoryTimer = setInterval(() => {
      const mb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      if (mb > this.peakMemoryMB) this.peakMemoryMB = mb;
    }, 1000);
  }

  stopMemoryMonitor() {
    if (this.statsMemoryTimer) {
      clearInterval(this.statsMemoryTimer);
      this.statsMemoryTimer = null;
    }
  }

  close() {
    this.badLines.close();
    this.stopMemoryMonitor();
  }

  async runAll(files: ClassifiedFile[]): Promise<FileSummary[]> {
    this.startMemoryMonitor();
    const summaries: FileSummary[] = [];
    const filesByKind = new Map<FileKind, ClassifiedFile[]>();
    for (const f of files) {
      if (this.options.tables.length > 0 && !this.options.tables.includes(f.kind)) {
        this.logger.info(
          { kind: f.kind, path: f.path },
          'Arquivo ignorado (--tables filter)',
        );
        continue;
      }
      if (!filesByKind.has(f.kind)) filesByKind.set(f.kind, []);
      filesByKind.get(f.kind)!.push(f);
    }

    for (const group of this.getImportOrderGroups()) {
      const groupFiles: ClassifiedFile[] = [];
      for (const k of group) {
        const arr = filesByKind.get(k as FileKind);
        if (arr) groupFiles.push(...arr);
      }
      if (groupFiles.length === 0) continue;
      this.logger.info({ group }, `Processando grupo de tabelas`);
      if (this.options.parallelDomains && group.length > 1 && groupFiles.length > 1) {
        const results = await Promise.all(
          groupFiles.map((f) => this.runFile(f)),
        );
        summaries.push(...results);
      } else {
        for (const f of groupFiles) {
          summaries.push(await this.runFile(f));
        }
      }
    }
    return summaries;
  }

  private getImportOrderGroups(): TableName[][] {
    if (this.options.tables.length === 0) return IMPORT_ORDER;
    return IMPORT_ORDER.map((group) =>
      group.filter((t) => this.options.tables.includes(t)),
    ).filter((g) => g.length > 0);
  }

  private async runFile(file: ClassifiedFile): Promise<FileSummary> {
    const { kind, path: filePath } = file;
    const now = Date.now();
    const stats: BatchStats = {
      read: 0,
      mapped: 0,
      inserted: 0,
      skipped: 0,
      badLines: 0,
      startAt: now,
      lastFlushAt: now,
    };
    const errors: string[] = [];
    this.logger.info({ kind, path: filePath, sizeBytes: file.sizeBytes }, 'Processando arquivo');
    const progress: ProgressHandle = createProgress(kind, this.logger);
    progress.start(Math.ceil(file.sizeBytes / 200));
    const stream = openCsvStream(filePath);
    const batchBuffer: PrismaCreateInput[] = [];
    const placeholderBuffer: Array<{ table: TableName; codigo: string }> = [];

    let maxBadExceeded = false;

    try {
      for await (const columns of stream as AsyncIterable<string[]>) {
        stats.read++;
        progress.incrementRead(1);
        const rawLine = columns.join(';');
        const mapped = mapLine(kind, columns, rawLine);
        if (!mapped.ok) {
          stats.badLines++;
          this.badLines.write(kind, mapped.reason, rawLine);
          if (
            this.options.maxBadLines > 0 &&
            stats.badLines >= this.options.maxBadLines
          ) {
            maxBadExceeded = true;
            errors.push(`MAX_BAD_LINES_EXCEEDED (${this.options.maxBadLines})`);
            break;
          }
          continue;
        }
        stats.mapped++;
        batchBuffer.push(mapped.data);

        if (this.options.tolerantFk) {
          const refs = extractMissingFkRefs(kind as TableName, [mapped.data]);
          placeholderBuffer.push(...refs);
          if (placeholderBuffer.length >= this.options.batchSize * 2) {
            try {
              await ensureDomainPlaceholders(placeholderBuffer, this.logger);
            } catch (err) {
              this.logger.error({ err, kind }, 'Falha ensureDomainPlaceholders');
            }
            placeholderBuffer.length = 0;
          }
        }

        if (batchBuffer.length >= this.options.batchSize) {
          const res = await this.flushBatch(kind as TableName, batchBuffer, stats);
          if (!res.ok) {
            errors.push(res.reason);
            if (this.options.onConflict === 'error') break;
          }
          batchBuffer.length = 0;
        }
        progress.update(stats);
      }

      if (batchBuffer.length > 0 && !maxBadExceeded) {
        const res = await this.flushBatch(kind as TableName, batchBuffer, stats);
        if (!res.ok) errors.push(res.reason);
        batchBuffer.length = 0;
      }
      if (placeholderBuffer.length > 0 && this.options.tolerantFk) {
        try {
          await ensureDomainPlaceholders(placeholderBuffer, this.logger);
        } catch (err) {
          this.logger.error({ err, kind }, 'Falha ensureDomainPlaceholders final');
        }
      }
    } catch (err) {
      this.logger.error({ kind, err }, 'Erro fatal ao processar arquivo');
      errors.push(err instanceof Error ? err.message : String(err));
    } finally {
      stream.destroy();
      progress.stop();
    }

    const durationMs = Date.now() - stats.startAt;
    const linesPerSecond = durationMs > 0 ? Math.round((stats.read / durationMs) * 1000) : 0;
    const summary: FileSummary = {
      kind,
      path: filePath,
      read: stats.read,
      mapped: stats.mapped,
      inserted: stats.inserted,
      skipped: stats.skipped,
      badLines: stats.badLines,
      durationMs,
      linesPerSecond,
      errors,
    };
    this.logger.info(summary, 'Arquivo finalizado');
    return summary;
  }

  private async flushBatch(
    table: TableName,
    rows: PrismaCreateInput[],
    stats: BatchStats,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (this.options.dryRun) {
      stats.inserted += rows.length;
      return { ok: true };
    }
    try {
      const result: InsertBatchResult = await insertBatch(
        table,
        rows,
        this.options.onConflict,
      );
      stats.inserted += result.inserted;
      stats.skipped += result.skipped;
      stats.lastFlushAt = Date.now();
      return { ok: true };
    } catch (err) {
      this.logger.error({ err, table, batchSize: rows.length }, 'Falha no flush do batch');
      const reason = err instanceof Error ? err.message : String(err);
      if (this.options.skipBadLines) {
        stats.skipped += rows.length;
        for (let i = 0; i < rows.length; i++) {
          try {
            const r2 = await insertBatch(table, [rows[i]], this.options.onConflict);
            stats.inserted += r2.inserted;
            stats.skipped -= 1;
            stats.skipped += r2.skipped;
          } catch (err2) {
            stats.badLines++;
            stats.skipped -= 1;
            this.badLines.write(
              table as FileKind,
              `BATCH_ROW_ERROR: ${err2 instanceof Error ? err2.message : String(err2)}`,
              JSON.stringify(rows[i]),
            );
          }
        }
        return { ok: true };
      }
      return { ok: false, reason };
    }
  }

  buildReport(summaries: FileSummary[], ok: boolean): RunReport {
    const endedAt = new Date();
    return {
      startedAt: this.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - this.startedAt.getTime(),
      files: summaries,
      globalBadLines: summaries.reduce((s, x) => s + x.badLines, 0),
      peakMemoryMB: this.peakMemoryMB,
      optionsUsed: { ...this.options },
      ok,
      logDir: this.logDir,
    };
  }
}
