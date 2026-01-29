import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentCategory } from '../types/freeagent/index.js';
import { transformCategory, transformCategories } from '../transformers/category-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';

export async function getCategories(client: FreeAgentClient) {
  try {
    const categories = await client.fetchAllPages<FreeAgentCategory>(
      '/categories',
      'categories'
    );
    return transformCategories(categories);
  } catch (error) {
    handleResourceError(error, 'freeagent://categories');
  }
}

export async function getCategory(client: FreeAgentClient, nominalCode: string) {
  try {
    const response = await client.get<{ category: FreeAgentCategory }>(`/categories/${nominalCode}`);
    return transformCategory(response.category);
  } catch (error) {
    handleResourceError(error, `freeagent://categories/${nominalCode}`);
  }
}
