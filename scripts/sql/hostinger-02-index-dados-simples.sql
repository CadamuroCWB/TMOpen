-- PASSO 3b — DADOS_SIMPLES
-- Tamanho: 4.1GB ~ 1-2 GB temp
CREATE INDEX IF NOT EXISTS dados_simples_opcao_pelo_simples_opcao_pelo_mei_idx
ON dados_simples (opcao_pelo_simples, opcao_pelo_mei);

ANALYZE dados_simples;
CHECKPOINT;
