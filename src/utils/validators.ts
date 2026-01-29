import { z } from 'zod';

// Common validation schemas
export const idSchema = z.string().regex(/^\d+$/, 'Must be a numeric ID');

export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
);

export const amountSchema = z.number()
  .min(-999999999.99, 'Amount too small')
  .max(999999999.99, 'Amount too large');

export const currencySchema = z.string()
  .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code')
  .transform((val) => val.toUpperCase());

export const emailSchema = z.string().email('Invalid email address');

export const urlSchema = z.string().url('Invalid URL');

// FreeAgent-specific URL to ID extraction
export function extractId(url: string): string {
  const match = url.match(/\/(\d+)$/);
  return match?.[1] ?? url;
}

export function extractEntityType(url: string): string {
  const match = url.match(/\/v2\/(\w+)\/\d+$/);
  return match?.[1] ?? 'unknown';
}

// Build FreeAgent URL from ID
export function buildUrl(entityType: string, id: string, baseUrl: string): string {
  return `${baseUrl}/${entityType}/${id}`;
}

// Parse numeric string to number (FreeAgent returns numbers as strings)
export function parseNumericString(value: string | undefined | null): number {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Validate and transform contact ID (accepts both URL and numeric ID)
export function normalizeContactId(input: string, baseUrl: string): string {
  if (input.startsWith('http')) {
    return input;
  }
  return buildUrl('contacts', input, baseUrl);
}

// Validate and transform project ID
export function normalizeProjectId(input: string, baseUrl: string): string {
  if (input.startsWith('http')) {
    return input;
  }
  return buildUrl('projects', input, baseUrl);
}

// Validate and transform invoice ID
export function normalizeInvoiceId(input: string, baseUrl: string): string {
  if (input.startsWith('http')) {
    return input;
  }
  return buildUrl('invoices', input, baseUrl);
}

// Validate and transform bill ID
export function normalizeBillId(input: string, baseUrl: string): string {
  if (input.startsWith('http')) {
    return input;
  }
  return buildUrl('bills', input, baseUrl);
}

// Validate and transform bank account ID
export function normalizeBankAccountId(input: string, baseUrl: string): string {
  if (input.startsWith('http')) {
    return input;
  }
  return buildUrl('bank_accounts', input, baseUrl);
}

// Validate and transform bank transaction ID
export function normalizeBankTransactionId(input: string, baseUrl: string): string {
  if (input.startsWith('http')) {
    return input;
  }
  return buildUrl('bank_transactions', input, baseUrl);
}

// Validate and transform category URL
export function normalizeCategoryUrl(input: string, baseUrl: string): string {
  if (input.startsWith('http')) {
    return input;
  }
  return buildUrl('categories', input, baseUrl);
}
