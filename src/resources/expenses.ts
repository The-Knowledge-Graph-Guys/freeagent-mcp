import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentExpense } from '../types/freeagent/index.js';
import { transformExpense, transformExpenses } from '../transformers/expense-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';
import { normalizeProjectId } from '../utils/validators.js';
import { FREEAGENT_API_BASE } from '../config.js';

export interface ExpenseFilters {
  user?: string;
  project?: string;
  fromDate?: string;
  toDate?: string;
  updatedSince?: string;
  view?: 'all' | 'recent';
}

export async function getExpenses(
  client: FreeAgentClient,
  filters: ExpenseFilters = {}
) {
  try {
    const params: Record<string, string> = {};
    if (filters.user) params['user'] = filters.user;
    if (filters.project) params['project'] = normalizeProjectId(filters.project, FREEAGENT_API_BASE);
    if (filters.fromDate) params['from_date'] = filters.fromDate;
    if (filters.toDate) params['to_date'] = filters.toDate;
    if (filters.updatedSince) params['updated_since'] = filters.updatedSince;
    if (filters.view) params['view'] = filters.view;

    const expenses = await client.fetchAllPages<FreeAgentExpense>(
      '/expenses',
      'expenses',
      params
    );
    return transformExpenses(expenses);
  } catch (error) {
    handleResourceError(error, 'freeagent://expenses');
  }
}

export async function getExpense(client: FreeAgentClient, id: string) {
  try {
    const response = await client.get<{ expense: FreeAgentExpense }>(`/expenses/${id}`);
    return transformExpense(response.expense);
  } catch (error) {
    handleResourceError(error, `freeagent://expenses/${id}`);
  }
}
