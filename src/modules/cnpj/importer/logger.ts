import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import type { LogLevel } from './types.js';

export function createLogDir(baseDir = 'logs/importer'): string {
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  const dir = path.resolve(process.cwd(), baseDir, ts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function createLogger(logDir: string, level: LogLevel = 'info') {
  const logFile = path.join(logDir, 'run.log');
  const transport = pino.transport({
    targets: [
      {
        target: 'pino/file',
        options: { destination: logFile, mkdir: true },
        level,
      },
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          ignore: 'pid,hostname',
        },
        level: process.stdout.isTTY ? 'info' : ('warn' as LogLevel),
      },
    ],
  });

  return pino(
    {
      level,
      base: { importer: 'cnpj' },
      serializers: {
        err: pino.stdSerializers.err,
      },
    },
    transport,
  );
}

export type ImporterLogger = ReturnType<typeof createLogger>;
