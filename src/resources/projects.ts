import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentProject, FreeAgentTask } from '../types/freeagent/index.js';
import { transformProject, transformProjects, transformTasks } from '../transformers/project-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';
import { normalizeContactId } from '../utils/validators.js';
import { FREEAGENT_API_BASE } from '../config.js';

export interface ProjectFilters {
  contact?: string;
  view?: 'active' | 'completed' | 'cancelled' | 'hidden' | 'all';
  sort?: string;
}

export async function getProjects(
  client: FreeAgentClient,
  filters: ProjectFilters = {},
  contactNameLookup?: Map<string, string>
) {
  try {
    const params: Record<string, string> = {};
    if (filters.contact) params['contact'] = normalizeContactId(filters.contact, FREEAGENT_API_BASE);
    if (filters.view) params['view'] = filters.view;
    if (filters.sort) params['sort'] = filters.sort;

    const projects = await client.fetchAllPages<FreeAgentProject>(
      '/projects',
      'projects',
      params
    );
    return transformProjects(projects, contactNameLookup);
  } catch (error) {
    handleResourceError(error, 'freeagent://projects');
  }
}

export async function getProject(
  client: FreeAgentClient,
  id: string,
  contactNameLookup?: Map<string, string>
) {
  try {
    const response = await client.get<{ project: FreeAgentProject }>(`/projects/${id}`);
    return transformProject(response.project, contactNameLookup);
  } catch (error) {
    handleResourceError(error, `freeagent://projects/${id}`);
  }
}

export async function getProjectTasks(
  client: FreeAgentClient,
  projectId: string
) {
  try {
    const tasks = await client.fetchAllPages<FreeAgentTask>(
      '/tasks',
      'tasks',
      { project: `${FREEAGENT_API_BASE}/projects/${projectId}` }
    );
    return transformTasks(tasks);
  } catch (error) {
    handleResourceError(error, `freeagent://projects/${projectId}/tasks`);
  }
}
