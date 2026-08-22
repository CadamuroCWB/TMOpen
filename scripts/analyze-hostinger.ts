import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

console.log('1. Checando tamanho do banco (Hostinger)...');
const sz: any[] = await prisma.$queryRawUnsafe("SELECT pg_size_pretty(pg_database_size(current_database())) AS db;");
console.log('Tamanho do banco:', sz[0].db);

console.log('\n2. Executando ANALYZE (atualiza planner stats)...');
const t0 = Date.now();
try {
  await prisma.$queryRawUnsafe('ANALYZE;');
  console.log('ANALYZE OK em ' + (Date.now() - t0) + ' ms');
} catch (e: any) { console.error('ANALYZE erro:', e.message); }

console.log('\n3. Tamanho por tabela (Top 10 por tamanho em disco):');
const tabsz: any[] = await prisma.$queryRawUnsafe("SELECT relname AS table, pg_size_pretty(pg_total_relation_size(relname::regclass)) AS size FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relname::regclass) DESC LIMIT 10;");
console.table(tabsz);

console.log('\n4. Tamanho das relacoes (incluindo indices e toast):');
const totalSz: any[] = await prisma.$queryRawUnsafe("SELECT pg_size_pretty(SUM(pg_total_relation_size(relname::regclass))) AS total FROM pg_stat_user_tables;");
console.log('Total tables + índices + toast:', totalSz[0].total);

await prisma.$disconnect();
