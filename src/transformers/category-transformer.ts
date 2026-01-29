import type { FreeAgentCategory } from '../types/freeagent/index.js';
import type { LLMCategory } from '../types/llm/index.js';
import { extractId } from './common.js';

export function transformCategory(category: FreeAgentCategory): LLMCategory {
  return {
    id: extractId(category.url),
    description: category.description,
    nominalCode: category.nominal_code,
    groupDescription: category.group_description,
    allowableForTax: category.allowable_for_tax,
  };
}

export function transformCategories(categories: FreeAgentCategory[]): LLMCategory[] {
  return categories.map(transformCategory);
}
