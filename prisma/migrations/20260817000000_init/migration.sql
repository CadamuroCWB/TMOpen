-- CreateTable
CREATE TABLE "empresas" (
    "cnpj_basico" CHAR(8) NOT NULL,
    "razao_social" TEXT NOT NULL,
    "natureza_juridica" CHAR(4) NOT NULL,
    "qualificacao_responsavel" CHAR(2) NOT NULL,
    "capital_social" DECIMAL(18,2),
    "porte" CHAR(1),
    "ente_federativo" VARCHAR(50),

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("cnpj_basico")
);

-- CreateTable
CREATE TABLE "estabelecimentos" (
    "cnpj_basico" CHAR(8) NOT NULL,
    "cnpj_ordem" CHAR(4) NOT NULL,
    "cnpj_dv" CHAR(2) NOT NULL,
    "identificador_matriz_filial" INTEGER NOT NULL,
    "nome_fantasia" TEXT,
    "situacao_cadastral" INTEGER NOT NULL,
    "data_situacao_cadastral" DATE,
    "motivo_situacao_cadastral" CHAR(2) NOT NULL,
    "nome_cidade_exterior" TEXT,
    "pais" CHAR(3),
    "data_inicio_atividade" DATE,
    "cnae_fiscal_principal" CHAR(7) NOT NULL,
    "cnae_fiscal_secundaria" TEXT,
    "tipo_logradouro" VARCHAR(20),
    "logradouro" TEXT,
    "numero" VARCHAR(20),
    "complemento" TEXT,
    "bairro" TEXT,
    "cep" CHAR(8),
    "uf" CHAR(2),
    "municipio" CHAR(7),
    "ddd1" CHAR(4),
    "telefone1" TEXT,
    "ddd2" CHAR(4),
    "telefone2" TEXT,
    "ddd_fax" CHAR(4),
    "fax" TEXT,
    "correio_eletronico" TEXT,
    "situacao_especial" TEXT,
    "data_situacao_especial" DATE,

    CONSTRAINT "estabelecimentos_pkey" PRIMARY KEY ("cnpj_basico","cnpj_ordem","cnpj_dv")
);

-- CreateTable
CREATE TABLE "socios" (
    "id" BIGSERIAL NOT NULL,
    "cnpj_basico" CHAR(8) NOT NULL,
    "identificador_de_socio" INTEGER NOT NULL,
    "nome_socio" TEXT,
    "cnpj_cpf_do_socio" TEXT,
    "qualificacao_do_socio" CHAR(2),
    "data_entrada_sociedade" DATE,
    "pais" CHAR(3),
    "representante_legal" CHAR(11),
    "nome_do_representante" TEXT,
    "qualificacao_representante_legal" CHAR(2),
    "faixa_etaria" CHAR(1),

    CONSTRAINT "socios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dados_simples" (
    "cnpj_basico" CHAR(8) NOT NULL,
    "opcao_pelo_simples" CHAR(1),
    "data_opcao_simples" DATE,
    "data_exclusao_simples" DATE,
    "opcao_pelo_mei" CHAR(1),
    "data_opcao_mei" DATE,
    "data_exclusao_mei" DATE,

    CONSTRAINT "dados_simples_pkey" PRIMARY KEY ("cnpj_basico")
);

-- CreateTable
CREATE TABLE "cnaes" (
    "codigo" CHAR(7) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "cnaes_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "motivos" (
    "codigo" CHAR(2) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "motivos_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "municipios" (
    "codigo" CHAR(7) NOT NULL,
    "descricao" TEXT NOT NULL,
    "uf" CHAR(2),

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "naturezas_juridicas" (
    "codigo" CHAR(4) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "naturezas_juridicas_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "paises" (
    "codigo" CHAR(3) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "paises_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "qualificacoes_socios" (
    "codigo" CHAR(2) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "qualificacoes_socios_pkey" PRIMARY KEY ("codigo")
);

-- CreateIndex
CREATE INDEX "empresas_razao_social_porte_natureza_juridica_idx" ON "empresas"("razao_social", "porte", "natureza_juridica");

-- CreateIndex
CREATE INDEX "estabelecimentos_cnpj_basico_uf_situacao_cadastral_cnae_fis_idx" ON "estabelecimentos"("cnpj_basico", "uf", "situacao_cadastral", "cnae_fiscal_principal", "nome_fantasia", "municipio", "cep");

-- CreateIndex
CREATE INDEX "socios_cnpj_basico_nome_socio_cnpj_cpf_do_socio_idx" ON "socios"("cnpj_basico", "nome_socio", "cnpj_cpf_do_socio");

-- CreateIndex
CREATE INDEX "dados_simples_opcao_pelo_simples_opcao_pelo_mei_idx" ON "dados_simples"("opcao_pelo_simples", "opcao_pelo_mei");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_natureza_juridica_fkey" FOREIGN KEY ("natureza_juridica") REFERENCES "naturezas_juridicas"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_qualificacao_responsavel_fkey" FOREIGN KEY ("qualificacao_responsavel") REFERENCES "qualificacoes_socios"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_cnpj_basico_fkey" FOREIGN KEY ("cnpj_basico") REFERENCES "empresas"("cnpj_basico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_cnae_fiscal_principal_fkey" FOREIGN KEY ("cnae_fiscal_principal") REFERENCES "cnaes"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_motivo_situacao_cadastral_fkey" FOREIGN KEY ("motivo_situacao_cadastral") REFERENCES "motivos"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_municipio_fkey" FOREIGN KEY ("municipio") REFERENCES "municipios"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimentos" ADD CONSTRAINT "estabelecimentos_pais_fkey" FOREIGN KEY ("pais") REFERENCES "paises"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "socios" ADD CONSTRAINT "socios_cnpj_basico_fkey" FOREIGN KEY ("cnpj_basico") REFERENCES "empresas"("cnpj_basico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "socios" ADD CONSTRAINT "socios_qualificacao_do_socio_fkey" FOREIGN KEY ("qualificacao_do_socio") REFERENCES "qualificacoes_socios"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "socios" ADD CONSTRAINT "socios_pais_fkey" FOREIGN KEY ("pais") REFERENCES "paises"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "socios" ADD CONSTRAINT "socios_qualificacao_representante_legal_fkey" FOREIGN KEY ("qualificacao_representante_legal") REFERENCES "qualificacoes_socios"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dados_simples" ADD CONSTRAINT "dados_simples_cnpj_basico_fkey" FOREIGN KEY ("cnpj_basico") REFERENCES "empresas"("cnpj_basico") ON DELETE RESTRICT ON UPDATE CASCADE;
