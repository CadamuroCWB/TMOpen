import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

console.log('\n=== ÍNDICES (tabelas de dados principais) ===\n');
const indexes = await prisma.$queryRawUnsafe<{ indexname: string; tablename: string }[]>(
  "SELECT indexname, tablename::text FROM pg_indexes WHERE tablename IN ('empresas','estabelecimentos','socios','dados_simples') ORDER BY tablename, indexname;",
);
console.table(indexes);

console.log('\n=== COUNTS POR TABELA ===\n');
const counts = await prisma.$queryRawUnsafe<{ tbl: string; total: string }[]>(
  "SELECT 'empresas' AS tbl, COUNT(*)::text AS total FROM empresas UNION ALL " +
  "SELECT 'estabelecimentos', COUNT(*)::text FROM estabelecimentos UNION ALL " +
  "SELECT 'socios', COUNT(*)::text FROM socios UNION ALL " +
  "SELECT 'dados_simples', COUNT(*)::text FROM dados_simples UNION ALL " +
  "SELECT 'municipios', COUNT(*)::text FROM municipios UNION ALL " +
  "SELECT 'cnaes', COUNT(*)::text FROM cnaes UNION ALL " +
  "SELECT 'naturezas_juridicas', COUNT(*)::text FROM naturezas_juridicas UNION ALL " +
  "SELECT 'paises', COUNT(*)::text FROM paises UNION ALL " +
  "SELECT 'motivos', COUNT(*)::text FROM motivos UNION ALL " +
  "SELECT 'qualificacoes_socios', COUNT(*)::text FROM qualificacoes_socios " +
  'ORDER BY 1;',
);
console.table(counts);

console.log('\n=== MUNICÍPIOS (checagem de placeholders) ===\n');
const muns = await prisma.$queryRawUnsafe<{ total: string; placeholders: string }[]>(
  "SELECT COUNT(*)::text AS total, COUNT(CASE WHEN descricao LIKE '[IMPORT]%' THEN 1 END)::text AS placeholders FROM municipios;",
);
console.table(muns);

await prisma.$disconnect();
