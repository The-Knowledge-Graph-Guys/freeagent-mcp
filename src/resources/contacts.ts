import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentContact } from '../types/freeagent/index.js';
import { transformContact, transformContacts } from '../transformers/contact-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';

export interface ContactFilters {
  view?: 'active' | 'all';
  sort?: string;
}

export async function getContacts(
  client: FreeAgentClient,
  filters: ContactFilters = {}
) {
  try {
    const params: Record<string, string> = {};
    if (filters.view) params['view'] = filters.view;
    if (filters.sort) params['sort'] = filters.sort;

    const contacts = await client.fetchAllPages<FreeAgentContact>(
      '/contacts',
      'contacts',
      params
    );
    return transformContacts(contacts);
  } catch (error) {
    handleResourceError(error, 'freeagent://contacts');
  }
}

export async function getContact(client: FreeAgentClient, id: string) {
  try {
    const response = await client.get<{ contact: FreeAgentContact }>(`/contacts/${id}`);
    return transformContact(response.contact);
  } catch (error) {
    handleResourceError(error, `freeagent://contacts/${id}`);
  }
}

export async function buildContactNameLookup(
  client: FreeAgentClient
): Promise<Map<string, string>> {
  const contacts = await getContacts(client, { view: 'all' });
  const lookup = new Map<string, string>();

  for (const contact of contacts) {
    // Store both URL format and ID format for flexible lookup
    lookup.set(`https://api.freeagent.com/v2/contacts/${contact.id}`, contact.name);
    lookup.set(`https://api.sandbox.freeagent.com/v2/contacts/${contact.id}`, contact.name);
    lookup.set(contact.id, contact.name);
  }

  return lookup;
}
