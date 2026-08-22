-- PASSO 3c — EMPRESAS (maior - o que estourava antes com 50GB disk)
-- Tamanho: 9.1GB ~ 3-4 GB temp. Agora com 100GB deve passar.
CREATE INDEX IF NOT EXISTS empresas_razao_social_porte_natureza_juridica_idx
ON empresas (razao_social, porte, natureza_juridica);

ANALYZE empresas;
CHECKPOINT;
