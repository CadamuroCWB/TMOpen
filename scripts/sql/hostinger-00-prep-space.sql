-- PASSO 0 (execute ANTES dos índices)
-- Libera espaço do pg_wal e remove tuplas mortas das bulk loads
-- NÃO usa VACUUM FULL (não trava a tabela com AccessExclusiveLock longo)
CHECKPOINT;
VACUUM ANALYZE empresas;
VACUUM ANALYZE estabelecimentos;
VACUUM ANALYZE socios;
VACUUM ANALYZE dados_simples;
CHECKPOINT;

-- Confere espaço de WAL (não mostra filesystem mas ajuda a confirmar)
SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) AS wal_from_start;
