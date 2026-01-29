import { describe, it, expect } from 'vitest';
import {
  extractId,
  extractEntityType,
  buildUrl,
  parseNumericString,
  normalizeContactId,
} from '../../src/utils/validators.js';

describe('Validators', () => {
  describe('extractId', () => {
    it('extracts numeric ID from FreeAgent URL', () => {
      expect(extractId('https://api.freeagent.com/v2/contacts/12345')).toBe('12345');
      expect(extractId('https://api.sandbox.freeagent.com/v2/invoices/999')).toBe('999');
    });

    it('returns original value if not a URL', () => {
      expect(extractId('12345')).toBe('12345');
      expect(extractId('abc')).toBe('abc');
    });
  });

  describe('extractEntityType', () => {
    it('extracts entity type from URL', () => {
      expect(extractEntityType('https://api.freeagent.com/v2/contacts/12345')).toBe('contacts');
      expect(extractEntityType('https://api.freeagent.com/v2/invoices/999')).toBe('invoices');
      expect(extractEntityType('https://api.freeagent.com/v2/bank_transactions/1')).toBe('bank_transactions');
    });

    it('returns unknown for non-matching URLs', () => {
      expect(extractEntityType('invalid')).toBe('unknown');
    });
  });

  describe('buildUrl', () => {
    it('builds FreeAgent URL from entity type and ID', () => {
      expect(buildUrl('contacts', '12345', 'https://api.freeagent.com/v2')).toBe(
        'https://api.freeagent.com/v2/contacts/12345'
      );
    });
  });

  describe('parseNumericString', () => {
    it('parses valid numeric strings', () => {
      expect(parseNumericString('123.45')).toBe(123.45);
      expect(parseNumericString('-50.00')).toBe(-50);
      expect(parseNumericString('0')).toBe(0);
    });

    it('returns 0 for invalid or empty values', () => {
      expect(parseNumericString('')).toBe(0);
      expect(parseNumericString(undefined)).toBe(0);
      expect(parseNumericString(null)).toBe(0);
      expect(parseNumericString('not-a-number')).toBe(0);
    });
  });

  describe('normalizeContactId', () => {
    const baseUrl = 'https://api.freeagent.com/v2';

    it('returns URL as-is if already a full URL', () => {
      const url = 'https://api.freeagent.com/v2/contacts/12345';
      expect(normalizeContactId(url, baseUrl)).toBe(url);
    });

    it('builds full URL from numeric ID', () => {
      expect(normalizeContactId('12345', baseUrl)).toBe(
        'https://api.freeagent.com/v2/contacts/12345'
      );
    });
  });
});
