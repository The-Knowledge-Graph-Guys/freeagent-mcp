// Sensitive fields that should be excluded from LLM responses
const SENSITIVE_FIELDS = new Set([
  'sales_tax_registration_number',
  'unique_tax_reference',
  'subcontractor_verification_number',
  'billing_email',
  'ni_number',
  'account_number',
  'sort_code',
  'secondary_sort_code',
  'iban',
  'bic',
]);

export function sanitizeForLLM<T extends Record<string, unknown>>(
  data: T,
  allowedFields: string[]
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const field of allowedFields) {
    if (field in data && !SENSITIVE_FIELDS.has(field)) {
      sanitized[field as keyof T] = data[field as keyof T];
    }
  }

  return sanitized;
}

export function sanitizeInput(value: string, maxLength = 1000): string {
  // Remove control characters
  let sanitized = value.replace(/[\x00-\x1F\x7F]/g, '');

  // Strip HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Truncate to max length
  return sanitized.slice(0, maxLength);
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToSanitize: string[],
  maxLength = 1000
): T {
  const result = { ...obj };

  for (const field of fieldsToSanitize) {
    if (field in result && typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field] = sanitizeInput(result[field] as string, maxLength);
    }
  }

  return result;
}
