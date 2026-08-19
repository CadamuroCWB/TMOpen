import cliProgress from 'cli-progress';
import type { BatchStats, FileKind } from './types.js';
import type { ImporterLogger } from './logger.js';

export interface ProgressHandle {
  start(totalEstimate?: number): void;
  update(stats: BatchStats, extra?: Record<string, string | number>): void;
  incrementRead(n: number): void;
  stop(): void;
}

export class TtyProgress implements ProgressHandle {
  private bar: cliProgress.SingleBar;
  private kind: FileKind;
  private total = 0;
  private read = 0;

  constructor(kind: FileKind) {
    this.kind = kind;
    this.bar = new cliProgress.SingleBar(
      {
        format:
          '{kind} | {bar} | {percentage}% | {read} linhas | {speed}/s | {memory}MB | ETA {eta_formatted}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: true,
        forceRedraw: true,
      },
      cliProgress.Presets.shades_classic,
    );
  }

  start(totalEstimate = 0) {
    this.total = totalEstimate || 100_000_000;
    this.bar.start(this.total, 0, {
      kind: this.kind.padEnd(22, ' '),
      speed: '0',
      memory: '0',
    });
  }

  incrementRead(n: number) {
    this.read += n;
  }

  update(stats: BatchStats) {
    const elapsedMs = Date.now() - stats.startAt;
    const speed = elapsedMs > 0 ? Math.round((stats.read / elapsedMs) * 1000) : 0;
    const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
    this.bar.update(Math.min(this.read, this.total), {
      kind: this.kind.padEnd(22, ' '),
      speed: speed.toLocaleString('pt-BR'),
      memory: mem.toString(),
    });
  }

  stop() {
    this.bar.stop();
  }
}

export class LogProgress implements ProgressHandle {
  private kind: FileKind;
  private logger: ImporterLogger;
  private lastLogAt = 0;
  private readonly intervalMs = 5000;

  constructor(kind: FileKind, logger: ImporterLogger) {
    this.kind = kind;
    this.logger = logger;
  }

  start() {
    this.logger.info({ kind: this.kind }, 'Iniciando processamento');
  }

  incrementRead() {}

  update(stats: BatchStats) {
    const now = Date.now();
    if (now - this.lastLogAt < this.intervalMs) return;
    this.lastLogAt = now;
    const elapsedMs = now - stats.startAt;
    const speed = elapsedMs > 0 ? Math.round((stats.read / elapsedMs) * 1000) : 0;
    const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
    this.logger.info(
      {
        kind: this.kind,
        read: stats.read,
        mapped: stats.mapped,
        inserted: stats.inserted,
        skipped: stats.skipped,
        badLines: stats.badLines,
        linesPerSecond: speed,
        memoryMB: mem,
      },
      'Progresso',
    );
  }

  stop() {}
}

export function createProgress(kind: FileKind, logger: ImporterLogger): ProgressHandle {
  return process.stdout.isTTY ? new TtyProgress(kind) : new LogProgress(kind, logger);
}
