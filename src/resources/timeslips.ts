import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentTimeslip } from '../types/freeagent/index.js';
import { transformTimeslip, transformTimeslips } from '../transformers/project-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';
import { normalizeProjectId } from '../utils/validators.js';
import { FREEAGENT_API_BASE } from '../config.js';

export interface TimeslipFilters {
  project?: string;
  user?: string;
  task?: string;
  fromDate?: string;
  toDate?: string;
  updatedSince?: string;
}

export async function getTimeslips(
  client: FreeAgentClient,
  filters: TimeslipFilters = {}
) {
  try {
    const params: Record<string, string> = {};
    if (filters.project) params['project'] = normalizeProjectId(filters.project, FREEAGENT_API_BASE);
    if (filters.user) params['user'] = filters.user;
    if (filters.task) params['task'] = filters.task;
    if (filters.fromDate) params['from_date'] = filters.fromDate;
    if (filters.toDate) params['to_date'] = filters.toDate;
    if (filters.updatedSince) params['updated_since'] = filters.updatedSince;

    const timeslips = await client.fetchAllPages<FreeAgentTimeslip>(
      '/timeslips',
      'timeslips',
      params
    );
    return transformTimeslips(timeslips);
  } catch (error) {
    handleResourceError(error, 'freeagent://timeslips');
  }
}

export async function getTimeslip(client: FreeAgentClient, id: string) {
  try {
    const response = await client.get<{ timeslip: FreeAgentTimeslip }>(`/timeslips/${id}`);
    return transformTimeslip(response.timeslip);
  } catch (error) {
    handleResourceError(error, `freeagent://timeslips/${id}`);
  }
}
