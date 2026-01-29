import { z } from 'zod';

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  format?: string;
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
};

// Type guard helpers
function getTypeName(def: z.ZodTypeDef): string | undefined {
  return (def as { typeName?: string }).typeName;
}

export function zodToJsonSchema(schema: z.ZodType): JsonSchema {
  return processZodType(schema);
}

function processZodType(schema: z.ZodType): JsonSchema {
  const def = schema._def as Record<string, unknown>;
  const typeName = getTypeName(schema._def);

  // Handle ZodEffects (refine, transform, etc.)
  if (typeName === 'ZodEffects') {
    return processZodType(def['schema'] as z.ZodType);
  }

  // Handle ZodDefault
  if (typeName === 'ZodDefault') {
    const inner = processZodType(def['innerType'] as z.ZodType);
    inner.default = (def['defaultValue'] as () => unknown)();
    return inner;
  }

  // Handle ZodOptional
  if (typeName === 'ZodOptional') {
    return processZodType(def['innerType'] as z.ZodType);
  }

  // Handle ZodNullable
  if (typeName === 'ZodNullable') {
    const inner = processZodType(def['innerType'] as z.ZodType);
    return { anyOf: [inner, { type: 'null' }] };
  }

  // Handle ZodString
  if (typeName === 'ZodString') {
    const result: JsonSchema = { type: 'string' };
    const checks = def['checks'] as Array<{ kind: string; value?: number; regex?: RegExp }> | undefined;
    for (const check of checks ?? []) {
      if (check.kind === 'min') result.minLength = check.value;
      if (check.kind === 'max') result.maxLength = check.value;
      if (check.kind === 'regex' && check.regex) result.pattern = check.regex.source;
      if (check.kind === 'email') result.format = 'email';
      if (check.kind === 'url') result.format = 'uri';
      if (check.kind === 'length' && check.value !== undefined) {
        result.minLength = check.value;
        result.maxLength = check.value;
      }
    }
    return result;
  }

  // Handle ZodNumber
  if (typeName === 'ZodNumber') {
    const result: JsonSchema = { type: 'number' };
    const checks = def['checks'] as Array<{ kind: string; value?: number }> | undefined;
    for (const check of checks ?? []) {
      if (check.kind === 'min') result.minimum = check.value;
      if (check.kind === 'max') result.maximum = check.value;
      if (check.kind === 'int') result.type = 'integer';
    }
    return result;
  }

  // Handle ZodBoolean
  if (typeName === 'ZodBoolean') {
    return { type: 'boolean' };
  }

  // Handle ZodArray
  if (typeName === 'ZodArray') {
    const result: JsonSchema = {
      type: 'array',
      items: processZodType(def['type'] as z.ZodType),
    };
    const minLength = def['minLength'] as { value: number } | undefined;
    const maxLength = def['maxLength'] as { value: number } | undefined;
    if (minLength?.value !== undefined) result.minItems = minLength.value;
    if (maxLength?.value !== undefined) result.maxItems = maxLength.value;
    return result;
  }

  // Handle ZodObject
  if (typeName === 'ZodObject') {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    const shape = (def['shape'] as () => Record<string, z.ZodType>)();
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = processZodType(value);

      // Check if field is required
      const fieldTypeName = getTypeName(value._def);
      if (fieldTypeName !== 'ZodOptional' && fieldTypeName !== 'ZodDefault') {
        required.push(key);
      }
    }

    const result: JsonSchema = {
      type: 'object',
      properties,
    };

    if (required.length > 0) {
      result.required = required;
    }

    return result;
  }

  // Handle ZodEnum
  if (typeName === 'ZodEnum') {
    return {
      type: 'string',
      enum: def['values'] as string[],
    };
  }

  // Handle ZodLiteral
  if (typeName === 'ZodLiteral') {
    const value = def['value'] as unknown;
    return {
      type: typeof value as string,
      enum: [value],
    };
  }

  // Handle ZodUnion
  if (typeName === 'ZodUnion') {
    const options = def['options'] as z.ZodType[];
    return {
      anyOf: options.map((opt) => processZodType(opt)),
    };
  }

  // Handle ZodRecord
  if (typeName === 'ZodRecord') {
    return {
      type: 'object',
    };
  }

  // Handle ZodAny
  if (typeName === 'ZodAny') {
    return {};
  }

  // Fallback
  return { type: 'string' };
}
