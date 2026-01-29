import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentBill } from '../types/freeagent/index.js';
import { transformBill, transformBills } from '../transformers/bill-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';
import { normalizeContactId, normalizeProjectId } from '../utils/validators.js';
import { FREEAGENT_API_BASE } from '../config.js';

export interface BillFilters {
  contact?: string;
  project?: string;
  fromDate?: string;
  toDate?: string;
  updatedSince?: string;
  sort?: string;
  view?: 'recent_open_or_overdue' | 'all';
}

export async function getBills(
  client: FreeAgentClient,
  filters: BillFilters = {},
  contactNameLookup?: Map<string, string>
) {
  try {
    const params: Record<string, string> = {};
    if (filters.contact) params['contact'] = normalizeContactId(filters.contact, FREEAGENT_API_BASE);
    if (filters.project) params['project'] = normalizeProjectId(filters.project, FREEAGENT_API_BASE);
    if (filters.fromDate) params['from_date'] = filters.fromDate;
    if (filters.toDate) params['to_date'] = filters.toDate;
    if (filters.updatedSince) params['updated_since'] = filters.updatedSince;
    if (filters.sort) params['sort'] = filters.sort;
    if (filters.view) params['view'] = filters.view;

    const bills = await client.fetchAllPages<FreeAgentBill>(
      '/bills',
      'bills',
      params
    );
    return transformBills(bills, contactNameLookup);
  } catch (error) {
    handleResourceError(error, 'freeagent://bills');
  }
}

export async function getBill(
  client: FreeAgentClient,
  id: string,
  contactNameLookup?: Map<string, string>
) {
  try {
    const response = await client.get<{ bill: FreeAgentBill }>(`/bills/${id}`);
    return transformBill(response.bill, contactNameLookup);
  } catch (error) {
    handleResourceError(error, `freeagent://bills/${id}`);
  }
}
