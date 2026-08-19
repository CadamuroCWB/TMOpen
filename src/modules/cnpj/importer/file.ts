import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import unzipper from 'unzipper';
import { FILE_KIND_SUFFIXES } from './constants.js';
import type { ClassifiedFile, FileKind, ImportOptions } from './types.js';
import type { ImporterLogger } from './logger.js';

export function detectFileKind(filename: string): FileKind | null {
  const base = path.basename(filename);
  for (const [kind, patterns] of Object.entries(FILE_KIND_SUFFIXES) as Array<
    [FileKind, RegExp[]]
  >) {
    if (patterns.some((re) => re.test(base))) return kind;
  }
  return null;
}

function collectInDir(dir: string): ClassifiedFile[] {
  const results: ClassifiedFile[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    const full = path.join(e.parentPath ?? dir, e.name);
    const kind = detectFileKind(e.name);
    if (!kind) continue;
    const stat = fs.statSync(full);
    results.push({ kind, path: full, sizeBytes: stat.size });
  }
  return results;
}

async function extractZip(
  zipPath: string,
  logger: ImporterLogger,
): Promise<{ dir: string; files: ClassifiedFile[] }> {
  const ts = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `tmopen-importer-${ts}-`));
  logger.info({ zipPath, tempDir }, 'Extraindo ZIP');
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: tempDir }))
      .on('close', () => resolve())
      .on('error', (err) => reject(err));
  });
  const files = collectInDir(tempDir).map((f) => ({
    ...f,
    temp: true,
    tempDir,
  }));
  logger.info({ filesCount: files.length, tempDir }, 'Extração concluída');
  return { dir: tempDir, files };
}

export async function listFiles(
  options: Pick<ImportOptions, 'dir' | 'file'>,
  logger: ImporterLogger,
): Promise<{ files: ClassifiedFile[]; cleanupTempDirs: string[] }> {
  const cleanupTempDirs: string[] = [];
  let files: ClassifiedFile[] = [];

  if (options.file) {
    const filePath = path.resolve(options.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    if (/\.zip$/i.test(filePath)) {
      const extracted = await extractZip(filePath, logger);
      files = extracted.files;
      cleanupTempDirs.push(extracted.dir);
    } else {
      const kind = detectFileKind(filePath);
      if (!kind) {
        throw new Error(
          `Não foi possível identificar o tipo do arquivo ${path.basename(filePath)}. Use sufixo oficial da Receita (ex: .EMPRECSV, .ESTABELE).`,
        );
      }
      const stat = fs.statSync(filePath);
      files = [{ kind, path: filePath, sizeBytes: stat.size }];
    }
  } else if (options.dir) {
    const dir = path.resolve(options.dir);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error(`Diretório não encontrado: ${dir}`);
    }
    files = collectInDir(dir);
  } else {
    throw new Error('É necessário fornecer --dir ou --file');
  }

  if (files.length === 0) {
    logger.warn('Nenhum arquivo reconhecido nos locais informados.');
  }

  return { files, cleanupTempDirs };
}

export function cleanupTempDirs(dirs: string[], logger: ImporterLogger) {
  for (const d of dirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
      logger.debug({ dir: d }, 'Diretório temporário removido');
    } catch (err) {
      logger.warn({ dir: d, err }, 'Falha ao remover diretório temporário');
    }
  }
}
