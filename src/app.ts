import fastify, {
  type FastifyError,
  type FastifyRequest,
  type FastifyReply,
} from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import rateLimit from '@fastify/rate-limit';
import scalarApiReference from '@scalar/fastify-api-reference';
import { validatorCompiler, serializerCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';
import { ZodError, ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { env } from './config/env.js';
import prisma from './config/prisma.js';
import { errorApiResponse, successApiResponse, SuccessApiResponseSchema } from './common/response.js';
import { AppError } from './common/errors.js';
import modulesPlugin from './modules/index.js';

function isZodSchema(schema: unknown): schema is ZodType {
  return schema instanceof ZodType;
}

function sanitizeJsonSchema(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  if (Array.isArray(obj)) {
    const result: unknown[] = [];
    for (const item of obj) {
      const s = sanitizeJsonSchema(item);
      if (s !== undefined) {
        result.push(s);
      }
    }
    return result;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const val = (obj as Record<string, unknown>)[key];
      if (key === 'properties' && val && typeof val === 'object' && !Array.isArray(val)) {
        const props: Record<string, unknown> = {};
        for (const pkey of Object.keys(val as Record<string, unknown>)) {
          const pval = (val as Record<string, unknown>)[pkey];
          const sanitized = sanitizeJsonSchema(pval);
          if (sanitized !== undefined && sanitized !== null) {
            props[pkey] = sanitized;
          } else {
            props[pkey] = { type: 'string' };
          }
        }
        result[key] = props;
      } else {
        const sanitized = sanitizeJsonSchema(val);
        if (sanitized !== undefined) {
          result[key] = sanitized;
        }
      }
    }
    return result;
  }
  return obj;
}

function safeJsonSchemaTransform({ schema, url }: { schema: unknown; url: string }): any {
  let transformedSchema: unknown = schema;
  if (schema !== null && schema !== undefined && isZodSchema(schema)) {
    try {
      const r = (jsonSchemaTransform as any)({ schema, url });
      if (r && typeof r === 'object' && 'schema' in r) {
        transformedSchema = r.schema;
      } else if (r && typeof r === 'object') {
        transformedSchema = r;
      } else {
        throw new Error('jsonSchemaTransform returned invalid');
      }
    } catch (_e) {
      try {
        const result = zodToJsonSchema(schema, {
          $refStrategy: 'none',
          target: 'jsonSchema7',
        });
        if (result && typeof result === 'object') {
          transformedSchema = result;
        } else {
          transformedSchema = { type: 'object', properties: {}, additionalProperties: true };
        }
      } catch (_e2) {
        transformedSchema = { type: 'object', properties: {}, additionalProperties: true };
      }
    }
  }
  if (transformedSchema !== null && transformedSchema !== undefined && typeof transformedSchema === 'object') {
    transformedSchema = sanitizeJsonSchema(transformedSchema);
  }
  return { schema: transformedSchema, url };
}

function isAppErrorLike(err: any): err is { statusCode: number; message: string; code?: string; details?: unknown } {
  return (
    err !== null &&
    typeof err === 'object' &&
    typeof err.statusCode === 'number' &&
    typeof err.message === 'string'
  );
}

export async function createApp() {
  const app = fastify({
    logger: env.NODE_ENV !== 'test',
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
      },
    },
    attachValidation: true,
  } as Parameters<typeof fastify>[0]);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  const appTyped = app.withTypeProvider<ZodTypeProvider>();

  app.addHook('preSerialization', async (_request, _reply, payload) => {
    function convertBigInt(obj: unknown): unknown {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') {
        return obj.toString();
      }
      if (Array.isArray(obj)) {
        return obj.map((item) => convertBigInt(item));
      }
      if (typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(obj as Record<string, unknown>)) {
          result[key] = convertBigInt((obj as Record<string, unknown>)[key]);
        }
        return result;
      }
      return obj;
    }
    return convertBigInt(payload) as any;
  });

  app.setNotFoundHandler((request, reply) => {
    reply
      .status(404)
      .send(errorApiResponse('Rota não encontrada', null, 'NOT_FOUND'));
  });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error instanceof AppError) {
      reply
        .status(error.statusCode)
        .send(errorApiResponse(error.message, error.details, error.code));
      return;
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      reply.status(400).send(
        errorApiResponse('Dados inválidos', details, 'VALIDATION_ERROR'),
      );
      return;
    }

    if (
      error.validation !== undefined ||
      (error as any).code === 'FST_ERR_VALIDATION'
    ) {
      const details = (error as any).validation ?? null;
      reply.status(400).send(
        errorApiResponse('Requisição inválida', details, 'VALIDATION_ERROR'),
      );
      return;
    }

    if (isAppErrorLike(error)) {
      reply
        .status(error.statusCode)
        .send(errorApiResponse(error.message, (error as any).details ?? null, (error as any).code));
      return;
    }

    request.log.error({ err: error }, 'Erro interno não tratado');
    reply.status(500).send(errorApiResponse('Erro interno do servidor'));
  });

  const corsOrigins = env.CORS_ORIGINS;
  if (corsOrigins === '*') {
    await appTyped.register(cors, { origin: true });
  } else {
    const origins = corsOrigins.split(',').map((s) => s.trim());
    await appTyped.register(cors, { origin: origins, credentials: true });
  }
  await appTyped.register(helmet);
  await appTyped.register(sensible);

  await appTyped.register(rateLimit, {
    global: true,
    timeWindow: 60000,
    max: 60,
    onExceeded: (request: FastifyRequest) => {
      request.log.warn({ ip: request.ip }, 'Rate limit atingido');
    },
  });

  app.addSchema({
    $id: 'https://tmopen.local/PaginationMeta.json',
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
    },
  });

  app.addSchema({
    $id: 'https://tmopen.local/ErrorResponse.json',
    type: 'object',
    properties: {
      error: { type: 'string' },
      details: {},
      code: { type: 'string', nullable: true },
    },
  });

  app.addSchema({
    $id: 'https://tmopen.local/ApiResponse.json',
    type: 'object',
    properties: {
      data: {},
      meta: { $ref: 'https://tmopen.local/PaginationMeta.json' },
    },
  });

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url;
    const isApiV1 = url.startsWith('/api/v1');
    const isExempt =
      url === '/api/v1' ||
      url === '/healthz' ||
      url.startsWith('/docs') ||
      url.startsWith('/docs/json');

    if (isApiV1 && !isExempt) {
      const apiKeyHeader = request.headers['x-tmopen-api-key'];
      const apiKeys = env.TMOPEN_API_KEYS.split(',').map((s) => s.trim());

      if (!apiKeyHeader || !apiKeys.includes(apiKeyHeader as string)) {
        reply
          .status(401)
          .send(errorApiResponse('Chave de API inválida ou ausente', null, 'API_KEY_REQUIRED'));
      }
    }
  });

  await appTyped.register(swagger, {
    stripBasePath: false,
    transform: safeJsonSchemaTransform,
    openapi: {
      info: {
        title: 'TMOpen API',
        version: '1.0.0',
        description:
          'Microserviço para consulta de dados públicos brasileiros. Versão inicial: dados de CNPJ da Receita Federal.',
      },
      servers: [
        {
          url: '/api/v1',
          description: 'Base path da API v1',
        },
      ],
      tags: [
        {
          name: 'Domínio',
          description:
            'Tabelas de domínio (CNAEs, Municípios, Naturezas Jurídicas)',
        },
        { name: 'Empresas', description: 'Consulta de empresas (CNPJ básico)' },
        {
          name: 'Estabelecimentos',
          description: 'Estabelecimentos / CNPJ completo',
        },
        { name: 'Sócios', description: 'Quadro societário' },
        { name: 'Prospecção', description: 'Busca avançada de leads empresariais' },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-TMOpen-Api-Key',
          },
        },
      },
      security: [{ ApiKeyAuth: [] }],
    },
  });

  await appTyped.register(scalarApiReference, {
    routePrefix: '/docs',
    configuration: {
      spec: { url: '/docs/json' },
      theme: 'alternate',
    },
  });

  appTyped.get('/docs/json', async (_request, reply) => {
    const swaggerDoc = app.swagger() as any;
    if (swaggerDoc && typeof swaggerDoc === 'object') {
      if (!swaggerDoc.components) {
        swaggerDoc.components = {};
      }
      if (!swaggerDoc.components.securitySchemes) {
        swaggerDoc.components.securitySchemes = {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-TMOpen-Api-Key',
          },
        };
      }
      if (!swaggerDoc.security) {
        swaggerDoc.security = [{ ApiKeyAuth: [] }];
      }
    }
    reply.send(swaggerDoc);
  });

  await appTyped.register(modulesPlugin);

  appTyped.get('/healthz', {
    schema: {
      tags: ['Info'],
      summary: 'Health Check',
      response: {
        200: SuccessApiResponseSchema,
      },
    },
  }, async () => {
    let dbStatus: 'ok' | 'error' = 'error';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    } catch {
      dbStatus = 'error';
    }
    return successApiResponse({ status: 'ok', db: dbStatus });
  });

  return app;
}
