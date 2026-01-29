import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeForLLM, sanitizeObject } from '../../src/utils/sanitizer.js';

describe('Sanitizer', () => {
  describe('sanitizeInput', () => {
    it('removes control characters', () => {
      // Control characters are removed without replacement
      expect(sanitizeInput('Hello\x00World')).toBe('HelloWorld');
      expect(sanitizeInput('Test\x1F\x7F')).toBe('Test');
    });

    it('strips HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
      expect(sanitizeInput('<b>Bold</b> text')).toBe('Bold text');
    });

    it('normalizes whitespace', () => {
      expect(sanitizeInput('Hello   World')).toBe('Hello World');
      expect(sanitizeInput('  Trimmed  ')).toBe('Trimmed');
      // Newlines are control characters and get removed
      expect(sanitizeInput('Line\n\nBreaks')).toBe('LineBreaks');
    });

    it('truncates to max length', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeInput(longString, 100).length).toBe(100);
    });

    it('handles empty strings', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('sanitizeForLLM', () => {
    it('filters to allowed fields', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        secret: 'password123',
        api_key: 'abc123',
      };

      const result = sanitizeForLLM(data, ['name', 'email']);

      expect(result).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('excludes sensitive fields even if in allowed list', () => {
      const data = {
        name: 'John',
        unique_tax_reference: 'UTR12345',
        sales_tax_registration_number: 'VAT123',
      };

      const result = sanitizeForLLM(data, ['name', 'unique_tax_reference', 'sales_tax_registration_number']);

      expect(result).toEqual({
        name: 'John',
      });
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes specified string fields', () => {
      const data = {
        name: '  John  <b>Doe</b>  ',
        age: 30,
        description: 'Hello\x00World',
      };

      const result = sanitizeObject(data, ['name', 'description']);

      expect(result.name).toBe('John Doe');
      expect(result.description).toBe('HelloWorld');
      expect(result.age).toBe(30);
    });
  });
});
