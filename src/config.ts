import { z } from 'zod';

const configSchema = z.object({
  freeagent: z.object({
    clientId: z.string().min(1, 'FREEAGENT_CLIENT_ID is required'),
    clientSecret: z.string().min(1, 'FREEAGENT_CLIENT_SECRET is required'),
    redirectUri: z.string().url('FREEAGENT_REDIRECT_URI must be a valid URL'),
    environment: z.enum(['sandbox', 'production']).default('sandbox'),
  }),
  server: z.object({
    port: z.number().int().positive().default(3000),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
  tokenEncryptionKey: z.string().length(64).optional(), // 32-byte hex
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const rawConfig = {
    freeagent: {
      clientId: process.env['FREEAGENT_CLIENT_ID'] ?? '',
      clientSecret: process.env['FREEAGENT_CLIENT_SECRET'] ?? '',
      redirectUri: process.env['FREEAGENT_REDIRECT_URI'] ?? 'http://localhost:3000/callback',
      environment: process.env['FREEAGENT_ENVIRONMENT'] ?? 'sandbox',
    },
    server: {
      port: parseInt(process.env['PORT'] ?? '3000', 10),
      logLevel: process.env['LOG_LEVEL'] ?? 'info',
    },
    tokenEncryptionKey: process.env['TOKEN_ENCRYPTION_KEY'],
  };

  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  return result.data;
}

export const config = loadConfig();

export const FREEAGENT_API_BASE =
  config.freeagent.environment === 'production'
    ? 'https://api.freeagent.com/v2'
    : 'https://api.sandbox.freeagent.com/v2';

export const FREEAGENT_AUTH_URL =
  config.freeagent.environment === 'production'
    ? 'https://api.freeagent.com/v2/approve_app'
    : 'https://api.sandbox.freeagent.com/v2/approve_app';

export const FREEAGENT_TOKEN_URL =
  config.freeagent.environment === 'production'
    ? 'https://api.freeagent.com/v2/token_endpoint'
    : 'https://api.sandbox.freeagent.com/v2/token_endpoint';
