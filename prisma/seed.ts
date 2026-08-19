import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    console.log('[1/5] Inserindo domínios obrigatórios...');

    await tx.qualificacoes_socios.createMany({
      skipDuplicates: true,
      data: [
        { codigo: '00', descricao: 'Não informado' },
        { codigo: '01', descricao: 'Sócio' },
        { codigo: '02', descricao: 'Representante Legal' },
      ],
    });
    console.log('  → qualificacoes_socios: 3 registros');

    await tx.naturezas_juridicas.createMany({
      skipDuplicates: true,
      data: [{ codigo: '0000', descricao: 'Não informada' }],
    });
    console.log('  → naturezas_juridicas: 1 registro');

    await tx.paises.createMany({
      skipDuplicates: true,
      data: [{ codigo: 'BRA', descricao: 'Brasil' }],
    });
    console.log('  → paises: 1 registro');

    await tx.motivos.createMany({
      skipDuplicates: true,
      data: [{ codigo: '00', descricao: 'SEM MOTIVO' }],
    });
    console.log('  → motivos: 1 registro');

    await tx.municipios.createMany({
      skipDuplicates: true,
      data: [
        { codigo: '3550308', descricao: 'São Paulo', uf: 'SP' },
        { codigo: '3304557', descricao: 'Rio de Janeiro', uf: 'RJ' },
      ],
    });
    console.log('  → municipios: 2 registros');

    await tx.cnaes.createMany({
      skipDuplicates: true,
      data: [{ codigo: '0000000', descricao: 'Atividade não informada' }],
    });
    console.log('  → cnaes: 1 registro');

    console.log('[2/5] Inserindo empresa...');
    await tx.empresas.upsert({
      where: { cnpj_basico: '12345678' },
      update: {},
      create: {
        cnpj_basico: '12345678',
        razao_social: 'TECHNO MANIA TESTES LTDA',
        natureza_juridica: '0000',
        qualificacao_responsavel: '01',
        capital_social: 100000.0,
        porte: '5',
        ente_federativo: null,
      },
    });
    console.log('  → empresas: 1 registro (TECHNO MANIA TESTES LTDA)');

    console.log('[3/5] Inserindo estabelecimentos...');
    await tx.estabelecimentos.upsert({
      where: {
        cnpj_basico_cnpj_ordem_cnpj_dv: {
          cnpj_basico: '12345678',
          cnpj_ordem: '0001',
          cnpj_dv: '01',
        },
      },
      update: {},
      create: {
        cnpj_basico: '12345678',
        cnpj_ordem: '0001',
        cnpj_dv: '01',
        identificador_matriz_filial: 1,
        nome_fantasia: 'Techno Mania Matriz',
        situacao_cadastral: 2,
        data_situacao_cadastral: new Date('2020-01-01'),
        motivo_situacao_cadastral: '00',
        data_inicio_atividade: new Date('2020-01-01'),
        cnae_fiscal_principal: '0000000',
        tipo_logradouro: 'RUA',
        logradouro: 'PAULISTA',
        numero: '1000',
        complemento: 'ANDAR 10',
        bairro: 'BELA VISTA',
        cep: '01310100',
        uf: 'SP',
        municipio: '3550308',
        ddd1: '11',
        telefone1: '33334444',
        correio_eletronico: 'contato@techno.com.br',
      },
    });

    await tx.estabelecimentos.upsert({
      where: {
        cnpj_basico_cnpj_ordem_cnpj_dv: {
          cnpj_basico: '12345678',
          cnpj_ordem: '0002',
          cnpj_dv: '02',
        },
      },
      update: {},
      create: {
        cnpj_basico: '12345678',
        cnpj_ordem: '0002',
        cnpj_dv: '02',
        identificador_matriz_filial: 2,
        nome_fantasia: 'Techno Mania Filial Rio',
        situacao_cadastral: 2,
        data_situacao_cadastral: new Date('2021-06-01'),
        motivo_situacao_cadastral: '00',
        data_inicio_atividade: new Date('2021-06-01'),
        cnae_fiscal_principal: '0000000',
        tipo_logradouro: 'AV',
        logradouro: 'ATLANTICA',
        numero: '2000',
        bairro: 'COPACABANA',
        cep: '22070001',
        uf: 'RJ',
        municipio: '3304557',
        ddd1: '21',
        telefone1: '22223333',
      },
    });
    console.log('  → estabelecimentos: 2 registros (Matriz SP + Filial RJ)');

    console.log('[4/5] Inserindo sócios...');
    await tx.socios.createMany({
      skipDuplicates: false,
      data: [
        {
          cnpj_basico: '12345678',
          identificador_de_socio: 2,
          nome_socio: 'JOAO DA SILVA',
          cnpj_cpf_do_socio: '12345678901',
          qualificacao_do_socio: '01',
          data_entrada_sociedade: new Date('2020-01-01'),
          pais: 'BRA',
          faixa_etaria: '5',
        },
        {
          cnpj_basico: '12345678',
          identificador_de_socio: 2,
          nome_socio: 'MARIA SOUZA',
          cnpj_cpf_do_socio: '98765432100',
          qualificacao_do_socio: '01',
          data_entrada_sociedade: new Date('2020-01-01'),
          pais: 'BRA',
          faixa_etaria: '4',
        },
      ],
    });
    console.log('  → socios: 2 registros (João da Silva + Maria Souza)');

    console.log('[5/5] Inserindo dados_simples...');
    await tx.dados_simples.upsert({
      where: { cnpj_basico: '12345678' },
      update: {},
      create: {
        cnpj_basico: '12345678',
        opcao_pelo_simples: 'S',
        data_opcao_simples: new Date('2020-01-01'),
        opcao_pelo_mei: 'N',
      },
    });
    console.log('  → dados_simples: 1 registro (opção Simples = S)');

    console.log('\n✅ Seed concluído com sucesso! Todos os registros foram inseridos.');
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
