-- =====================================================================
-- ÍNDICES COMPOSTOS PARA PROSPECÇÃO CNPJ - TMOpen (PostgreSQL)
-- Data: 2026-08-25
-- Versão: CORRIGIDA (100% alinhada com prisma/schema.prisma do TMOpen)
--         Ajustado para o novo endpoint /prospect/socios/:cnpj_basico
--         e para os filtros reais do painel TMOrganizer > Prospeccao.razor
--
-- Autor: ajustes baseados em schema.prisma real (estabelecimentos,
--        empresas, socios, dados_simples, cnaes, municipios, etc)
--
-- ⚠️  IMPORTANTE - LEIA ANTES DE EXECUTAR:
-- 1. TABELAS GRANDES (> 10 MILHÕES DE LINHAS): use CREATE INDEX CONCURRENTLY
--    para NÃO TRAVAR escritas (INSERT/UPDATE/DELETE). Execute FORA do
--    horário de pico (ex: madrugada). CONCURRENTLY NÃO PODE rodar dentro
--    de BEGIN TRANSACTION / BEGIN / COMMIT (use AUTOCOMMIT).
-- 2. Não precisa rodar novamente os índices marcados como "JÁ EXISTENTE":
--    - socios (cnpj_basico, nome_socio, cnpj_cpf_do_socio)
--    - dados_simples (opcao_pelo_simples, opcao_pelo_mei)
--    - empresas (razao_social, porte, natureza_juridica)
--    Esses já foram aplicados via hostinger-01/02/03.sql ou migration Prisma.
-- 3. Ao final, sempre rode ANALYZE (já incluso abaixo).
-- 4. Postgres 16-Alpine (docker-compose.prod.yml) ou superior recomendado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ESTABELECIMENTOS (tabela principal do modo "Estabelecimento")
--
-- Esta era a tabela que MAIS fazia FULL TABLE SCAN pois o índice padrão
-- do Prisma tinha líder = cnpj_basico, que NUNCA é filtrado na busca
-- comum (uf -> municipio -> cnae -> situacao).
--
-- Regra B-Tree Postgres: coloque ESQUERDA as colunas de IGUALDADE
-- (mais seletivas primeiro), depois IN, por último RANGE (BETWEEN/>/<)
-- ---------------------------------------------------------------------

-- 1. CASO MAIS COMUM: UF + Município IBGE + CNAE Fiscal Principal + Situação
--    UI: (UF = PR) AND (Município = 4113205 Lapa) AND (CNAE = 4744)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estab_uf_municipio_cnae_situacao
    ON estabelecimentos (uf, municipio, cnae_fiscal_principal, situacao_cadastral);

-- 2. BUSCA ESTADO INTEIRO: UF + CNAE Fiscal Principal + Situação
--    UI: (UF = PR) AND (CNAE = 4744) SEM município selecionado
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estab_uf_cnae_situacao
    ON estabelecimentos (uf, cnae_fiscal_principal, situacao_cadastral);

-- 3. FILTRO POR RECÊNCIA / DATA: UF + Situação + Data Início Atividade
--    UI: (UF = PR) AND (Situação = 02 ATIVA) AND (Data Início BETWEEN de/ate)
--    Colocar data INCLUSIVE NO FIM porque é RANGE (BETWEEN)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estab_uf_situacao_data_inicio
    ON estabelecimentos (uf, situacao_cadastral, data_inicio_atividade);

-- 4. BUSCA POR SITUAÇÃO CADASTRAL SEM FILTRO GEOGRÁFICO
--    UI: (Situação = 02 ATIVA) + (Simples = S)
--    A situação cadastral frequentemente é filtro base da UI (default 02)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estab_situacao_cnpj_basico
    ON estabelecimentos (situacao_cadastral, cnpj_basico);

-- ---------------------------------------------------------------------
-- EMPRESAS (usada por JOIN quando modo Estabelecimento filtra PORTE ou
--          NATUREZA JURÍDICA; e usada diretamente pelo modo "Empresa")
--
-- JÁ EXISTE: empresas (razao_social, porte, natureza_juridica)
--            hostinger-03.sql / Prisma @@index
-- Esse índice é BOM para filtro POR RAZÃO SOCIAL primeiro. Mas quando
-- a query filtra POR PORTE ou NATUREZA JURÍDICA ANTES (sem razão social),
-- o Postgres não consegue usá-lo (coluna líder é razao_social).
-- ---------------------------------------------------------------------

-- 5. FILTRO POR PORTE + NATUREZA JURÍDICA + join via cnpj_basico
--    UI modo Estabelecimento: (Porte = 05 - ME) + (Natureza = 2062)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_empresas_porte_natureza_cnpj
    ON empresas (porte, natureza_juridica, cnpj_basico);

-- ---------------------------------------------------------------------
-- DADOS_SIMPLES (Simples Nacional / MEI)
--
-- JÁ EXISTE: dados_simples (opcao_pelo_simples, opcao_pelo_mei)
--            hostinger-02.sql / Prisma @@index
-- Vamos extender para INCLUIR cnpj_basico NO FIM, para virar um
-- "COVERING INDEX": Postgres responde (filtro Simples + join) direto
-- do índice, sem precisar voltar para a tabela heap (menos I/O).
-- ---------------------------------------------------------------------

-- 6. COVERING INDEX: filtro Simples/MEI + join com estabelecimentos
--    UI: (Simples Nacional = S) + (MEI = N)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dados_simples_opcoes_cnpj
    ON dados_simples (opcao_pelo_simples, opcao_pelo_mei, cnpj_basico);

-- ---------------------------------------------------------------------
-- SOCIOS (endpoint novo: GET /prospect/socios/:cnpj_basico)
--
-- JÁ EXISTE: socios (cnpj_basico, nome_socio, cnpj_cpf_do_socio)
--            hostinger-01.sql / Prisma @@index
-- Cobre a busca WHERE cnpj_basico = '...'. Nosso ORDER BY é
-- [{ data_entrada_sociedade: 'asc' }, { nome_socio: 'asc' }].
-- Para OTIMIZAR o ORDER BY (evitar sort em memória/disco), criamos
-- um índice adicional com a ordem exata do sort (opcional, para
-- consultas com MUITOS sócios por empresa — ex: grandes SAs).
-- ---------------------------------------------------------------------

-- 7. (OPCIONAL, descomente se houver empresas com +200 sócios)
--    Elimina o sort do ORDER BY na busca de quadro societário
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_socios_cnpj_entrada_nome
--     ON socios (cnpj_basico, data_entrada_sociedade ASC, nome_socio ASC);

-- ---------------------------------------------------------------------
-- (OPCIONAL) SUPORTE A TEXTO PARCIAL: ILIKE '%texto%' em Razão Social /
--            Nome Fantasia (usado pela UI em modo "Empresa").
-- Requer EXTENSÃO pg_trgm (precisa de superuser) — APENAS ative se o
-- uso diário de ILIKE for FREQUENTE (esses índices são grandes e
-- caros para escrita em ETLs de CNPJ).
-- ---------------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estab_nome_fantasia_trgm
--     ON estabelecimentos USING GIN (nome_fantasia gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_empresa_razao_social_trgm
--     ON empresas USING GIN (razao_social gin_trgm_ops);

-- ---------------------------------------------------------------------
-- ATUALIZA ESTATÍSTICAS DO PLANNER PARA QUE ELE USE OS NOVOS ÍNDICES
-- ---------------------------------------------------------------------
ANALYZE estabelecimentos;
ANALYZE empresas;
ANALYZE dados_simples;
ANALYZE socios;

-- Força checkpoint (grava todos os dirty buffers para disco — reduz
-- uso de WAL no próximo backup/restore; igual aos scripts hostinger)
CHECKPOINT;
