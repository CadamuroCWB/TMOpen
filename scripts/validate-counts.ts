import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [empresas, estabelecimentos, socios, dados_simples, cnaes, naturezas_juridicas, municipios, qualificacoes_socios, paises, motivos] = await Promise.all([
    prisma.empresas.count(),
    prisma.estabelecimentos.count(),
    prisma.socios.count(),
    prisma.dados_simples.count(),
    prisma.cnaes.count(),
    prisma.naturezas_juridicas.count(),
    prisma.municipios.count(),
    prisma.qualificacoes_socios.count(),
    prisma.paises.count(),
    prisma.motivos.count(),
  ]);

  console.log('--- Validação de contagens ---');
  console.log(`empresas: ${empresas} (esperado 1) ${empresas === 1 ? '✅' : '❌'}`);
  console.log(`estabelecimentos: ${estabelecimentos} (esperado 2) ${estabelecimentos === 2 ? '✅' : '❌'}`);
  console.log(`socios: ${socios} (esperado 2) ${socios === 2 ? '✅' : '❌'}`);
  console.log(`dados_simples: ${dados_simples} (esperado 1) ${dados_simples === 1 ? '✅' : '❌'}`);
  console.log(`cnaes: ${cnaes} (esperado >=1) ${cnaes >= 1 ? '✅' : '❌'}`);
  console.log(`naturezas_juridicas: ${naturezas_juridicas} (esperado >=1) ${naturezas_juridicas >= 1 ? '✅' : '❌'}`);
  console.log(`municipios: ${municipios} (esperado >=2) ${municipios >= 2 ? '✅' : '❌'}`);
  console.log(`qualificacoes_socios: ${qualificacoes_socios} (esperado >=3) ${qualificacoes_socios >= 3 ? '✅' : '❌'}`);
  console.log(`paises: ${paises} (esperado >=1) ${paises >= 1 ? '✅' : '❌'}`);
  console.log(`motivos: ${motivos} (esperado >=1) ${motivos >= 1 ? '✅' : '❌'}`);

  const tudoOk = empresas === 1 && estabelecimentos === 2 && socios === 2 && dados_simples === 1 &&
    cnaes >= 1 && naturezas_juridicas >= 1 && municipios >= 2 && qualificacoes_socios >= 3 && paises >= 1 && motivos >= 1;

  console.log(`\nResultado geral: ${tudoOk ? '✅ TODAS AS CONTAGENS OK' : '❌ ALGUMA CONTAGEM FALHOU'}`);
  process.exit(tudoOk ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
