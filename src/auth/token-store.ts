import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { homedir } from 'os';
import type { TokenData } from './oauth.js';

const TOKEN_FILE_PATH = join(homedir(), '.freeagent-mcp', 'tokens.enc');
const ALGORITHM = 'aes-256-gcm';

export interface TokenStore {
  get(): TokenData | null;
  set(tokens: TokenData): void;
  clear(): void;
  persist(): Promise<void>;
  load(): Promise<void>;
}

export function createTokenStore(encryptionKey?: string): TokenStore {
  let currentTokens: TokenData | null = null;

  const store: TokenStore = {
    get(): TokenData | null {
      return currentTokens;
    },

    set(tokens: TokenData): void {
      currentTokens = tokens;
    },

    clear(): void {
      currentTokens = null;
    },

    async persist(): Promise<void> {
      if (!currentTokens) {
        return;
      }

      if (!encryptionKey) {
        // No encryption key, skip file persistence
        return;
      }

      const data = JSON.stringify(currentTokens);
      const encrypted = encrypt(data, encryptionKey);

      await mkdir(dirname(TOKEN_FILE_PATH), { recursive: true });
      await writeFile(TOKEN_FILE_PATH, encrypted, 'utf-8');
    },

    async load(): Promise<void> {
      if (!encryptionKey) {
        return;
      }

      try {
        const encrypted = await readFile(TOKEN_FILE_PATH, 'utf-8');
        const decrypted = decrypt(encrypted, encryptionKey);
        currentTokens = JSON.parse(decrypted) as TokenData;
      } catch {
        // File doesn't exist or decryption failed, start fresh
        currentTokens = null;
      }
    },
  };

  return store;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32);
}

function encrypt(plaintext: string, password: string): string {
  const salt = randomBytes(16);
  const key = deriveKey(password, salt);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:encrypted (all hex)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted,
  ].join(':');
}

function decrypt(ciphertext: string, password: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltHex, ivHex, authTagHex, encrypted] = parts as [string, string, string, string];
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = deriveKey(password, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
