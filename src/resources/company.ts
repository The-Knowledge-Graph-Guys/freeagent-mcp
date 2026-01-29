import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentCompany } from '../types/freeagent/index.js';
import { transformCompany } from '../transformers/company-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';

export async function getCompany(client: FreeAgentClient) {
  try {
    const response = await client.get<{ company: FreeAgentCompany }>('/company');
    return transformCompany(response.company);
  } catch (error) {
    handleResourceError(error, 'freeagent://company');
  }
}
