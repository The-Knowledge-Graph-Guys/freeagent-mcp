import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentInvoice } from '../types/freeagent/index.js';
import { transformInvoice, transformInvoices } from '../transformers/invoice-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';
import { normalizeContactId } from '../utils/validators.js';
import { FREEAGENT_API_BASE } from '../config.js';

export interface InvoiceFilters {
  contact?: string;
  project?: string;
  status?: 'draft' | 'scheduled' | 'open' | 'overdue' | 'reminded' | 'thank_you' | 'paid';
  fromDate?: string;
  toDate?: string;
  updatedSince?: string;
  sort?: string;
  view?: 'recent_open_or_overdue' | 'all';
}

export async function getInvoices(
  client: FreeAgentClient,
  filters: InvoiceFilters = {},
  contactNameLookup?: Map<string, string>
) {
  try {
    const params: Record<string, string> = {};
    if (filters.contact) params['contact'] = normalizeContactId(filters.contact, FREEAGENT_API_BASE);
    if (filters.project) params['project'] = filters.project;
    if (filters.status) params['status'] = filters.status;
    if (filters.fromDate) params['from_date'] = filters.fromDate;
    if (filters.toDate) params['to_date'] = filters.toDate;
    if (filters.updatedSince) params['updated_since'] = filters.updatedSince;
    if (filters.sort) params['sort'] = filters.sort;
    if (filters.view) params['view'] = filters.view;

    const invoices = await client.fetchAllPages<FreeAgentInvoice>(
      '/invoices',
      'invoices',
      params
    );
    return transformInvoices(invoices, contactNameLookup);
  } catch (error) {
    handleResourceError(error, 'freeagent://invoices');
  }
}

export async function getInvoice(
  client: FreeAgentClient,
  id: string,
  contactNameLookup?: Map<string, string>
) {
  try {
    const response = await client.get<{ invoice: FreeAgentInvoice }>(`/invoices/${id}`);
    return transformInvoice(response.invoice, contactNameLookup);
  } catch (error) {
    handleResourceError(error, `freeagent://invoices/${id}`);
  }
}
