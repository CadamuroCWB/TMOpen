-- PASSO 3a (menor primeiro) — SOCIOS
-- Tamanho: 4GB ~ 1-2 GB temp
CREATE INDEX IF NOT EXISTS socios_cnpj_basico_nome_socio_cnpj_cpf_do_socio_idx
ON socios (cnpj_basico, nome_socio, cnpj_cpf_do_socio);

ANALYZE socios;
CHECKPOINT;
