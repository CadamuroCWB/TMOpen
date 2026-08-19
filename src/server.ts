import { createApp } from './app.js';
import { env } from './config/env.js';

export const app = await createApp();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
