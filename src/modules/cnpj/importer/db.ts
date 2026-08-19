import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../../../config/prisma.js';
import {
  DATA_FIELDS,
  INDICES_DROP_RECREATE,
  PK_FIELDS,
  TRUNCATE_ORDER,
} from './constants.js';
import { makePlaceholderDesc } from './mappers.js';
import type { OnConflictMode, TableName } from './types.js';
import type { ImporterLogger } from './logger.js';
import type { PrismaCreateInput } from './mappers.js';

export function getPrismaClient(): PrismaClient {
  return prisma;
}

export async function truncateAllTables(
  tables: TableName[] = TRUNCATE_ORDER,
  logger: ImporterLogger,
): Promise<void> {
  for (const t of tables) {
    logger.debug({ table: t }, 'Truncando');
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`,
    );
  }
  logger.info({ tables }, 'Truncate concluído');
}

export async function dropIndexes(logger: ImporterLogger): Promise<void> {
  for (const idx of INDICES_DROP_RECREATE) {
    logger.debug({ index: idx.name, table: idx.table }, 'Removendo índice');
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx.name}" CASCADE`);
  }
  logger.info('Índices não-PK removidos');
}

export async function recreateIndexes(logger: ImporterLogger): Promise<void> {
  for (const idx of INDICES_DROP_RECREATE) {
    const cols = idx.columns.map((c) => `"${c}"`).join(', ');
    const sql = `CREATE INDEX IF NOT EXISTS "${idx.name}" ON "${idx.table}" (${cols})`;
    logger.debug({ index: idx.name, table: idx.table }, 'Recriando índice');
    const t0 = Date.now();
    await prisma.$executeRawUnsafe(sql);
    logger.debug({ index: idx.name, durationMs: Date.now() - t0 }, 'Índice criado');
  }
  logger.info('Índices não-PK recriados');
}

interface MissingDomainRef {
  table: TableName;
  codigo: string;
}

export async function ensureDomainPlaceholders(
  refs: MissingDomainRef[],
  logger: ImporterLogger,
): Promise<number> {
  const grouped = new Map<TableName, Set<string>>();
  for (const r of refs) {
    if (!grouped.has(r.table)) grouped.set(r.table, new Set());
    grouped.get(r.table)!.add(r.codigo);
  }
  let inserted = 0;
  for (const [table, codigosSet] of grouped) {
    const codesArr = Array.from(codigosSet);
    if (codesArr.length === 0) continue;
    const existing = await queryExistingCodes(table, codesArr);
    const missing = codesArr.filter((c) => !existing.has(c));
    if (missing.length === 0) continue;
    const data = missing.map((codigo) =>
      table === 'municipios'
        ? { codigo, descricao: makePlaceholderDesc(codigo), uf: null }
        : { codigo, descricao: makePlaceholderDesc(codigo) },
    );
    try {
      const prismaTable = prisma as unknown as Record<
        TableName,
        {
          createMany: (args: {
            data: unknown[];
            skipDuplicates: boolean;
          }) => Promise<{ count: number }>;
        }
      >;
      const res = await prismaTable[table].createMany({
        data,
        skipDuplicates: true,
      });
      inserted += res.count;
      logger.warn(
        { table, count: missing.length, sample: missing.slice(0, 5) },
        'Placeholders de domínio inseridos por FK tolerante',
      );
    } catch (err) {
      logger.error({ table, err }, 'Falha ao inserir placeholders de domínio');
    }
  }
  return inserted;
}

async function queryExistingCodes(
  table: TableName,
  codes: string[],
): Promise<Set<string>> {
  const params = codes.map((_, i) => `$${i + 1}`).join(',');
  const result = await prisma.$queryRawUnsafe<{ codigo: string }[]>(
    `SELECT "codigo" FROM "${table}" WHERE "codigo" IN (${params})`,
    ...codes,
  );
  return new Set(result.map((r: { codigo: string }) => r.codigo));
}

function buildUpsertSql(
  table: TableName,
  rows: PrismaCreateInput[],
): string | null {
  if (rows.length === 0) return null;
  const pks = PK_FIELDS[table];
  const fields = DATA_FIELDS[table];
  if (fields.length === 0) return null;
  const allCols = [...pks, ...fields];
  const colList = allCols.map((c) => `"${c}"`).join(', ');
  const updateList = fields.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');
  const valueTuples: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  for (const row of rows) {
    const values: string[] = [];
    for (const col of allCols) {
      const v = (row as Record<string, unknown>)[col];
      if (v instanceof Date) {
        values.push(`$${p}::date`);
        params.push(v.toISOString().slice(0, 10));
      } else if (
        v != null &&
        typeof v === 'object' &&
        (v.constructor?.name === 'Decimal' || v instanceof Decimal)
      ) {
        values.push(`$${p}::decimal`);
        params.push(String(v));
      } else if (v == null) {
        values.push(`$${p}::text`);
        params.push(null);
      } else {
        values.push(`$${p}`);
        params.push(v);
      }
      p++;
    }
    valueTuples.push(`(${values.join(', ')})`);
  }
  const conflictCols = pks.map((c) => `"${c}"`).join(', ');
  const sql = `INSERT INTO "${table}" (${colList}) VALUES ${valueTuples.join(
    ', ',
  )} ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateList}`;
  return applyParamsInline(sql, params);
}

function applyParamsInline(sql: string, params: unknown[]): string {
  let out = sql;
  for (let i = params.length; i >= 1; i--) {
    const v = params[i - 1];
    let literal: string;
    if (v == null) {
      literal = 'NULL';
    } else if (typeof v === 'boolean') {
      literal = v ? 'TRUE' : 'FALSE';
    } else if (typeof v === 'number') {
      literal = String(v);
    } else if (typeof v === 'string') {
      literal = `'${v.replace(/'/g, "''")}'`;
    } else if (v instanceof Date) {
      literal = `'${v.toISOString().slice(0, 10)}'::date`;
    } else {
      literal = `'${String(v).replace(/'/g, "''")}'`;
    }
    out = out.replace(new RegExp(`\\$${i}(::[A-Za-z_]+)?`, 'g'), literal);
  }
  return out;
}

export interface InsertBatchResult {
  inserted: number;
  skipped: number;
}

export async function insertBatch(
  table: TableName,
  rows: PrismaCreateInput[],
  mode: OnConflictMode,
): Promise<InsertBatchResult> {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };
  const prismaTable = prisma as unknown as Record<
    TableName,
    {
      createMany: (args: {
        data: unknown[];
        skipDuplicates: boolean;
      }) => Promise<{ count: number }>;
    }
  >;

  if (mode === 'error') {
    const res = await prismaTable[table].createMany({
      data: rows as unknown[],
      skipDuplicates: false,
    });
    return { inserted: res.count, skipped: 0 };
  }

  if (mode === 'skip') {
    const res = await prismaTable[table].createMany({
      data: rows as unknown[],
      skipDuplicates: true,
    });
    return { inserted: res.count, skipped: rows.length - res.count };
  }

  if (mode === 'upsert') {
    const sql = buildUpsertSql(table, rows);
    if (!sql) {
      const res = await prismaTable[table].createMany({
        data: rows as unknown[],
        skipDuplicates: true,
      });
      return { inserted: res.count, skipped: rows.length - res.count };
    }
    await prisma.$executeRawUnsafe(sql);
    return { inserted: rows.length, skipped: 0 };
  }

  return { inserted: 0, skipped: 0 };
}
