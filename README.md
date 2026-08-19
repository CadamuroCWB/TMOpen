# TMOpen - API de Dados Públicos
Microserviço para consulta de dados públicos brasileiros. Versão inicial: dados de CNPJ (Receita Federal).

## Stack: Node.js + TypeScript + Fastify + Prisma + PostgreSQL + Zod + Swagger

## Quickstart (Docker Compose)
```bash
cp .env.example .env
docker compose up -d --build
```

Após subir:
- API: http://localhost:3000
- Docs: http://localhost:3000/docs
- OpenAPI JSON: http://localhost:3000/docs/json
- Para rodar migrations manualmente: `docker compose exec api npx prisma migrate deploy`
- Para rodar seed (dados de teste): `docker compose exec api npx prisma db seed`

## Sem Docker (desenvolvimento local)
```bash
npm install
cp .env.example .env   # ajuste DATABASE_URL
npx prisma migrate dev --name init
npx tsx src/server.ts
```
