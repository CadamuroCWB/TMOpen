-- PASSO 4 - Validação final
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('empresas','estabelecimentos','socios','dados_simples')
ORDER BY tablename, indexname;

-- Total esperado: 8 indices = 4 PK + 4 não-PK (estabelecimentos já tinha criado)
ANALYZE;
