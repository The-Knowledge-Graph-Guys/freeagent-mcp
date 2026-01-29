import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentBankAccount } from '../types/freeagent/index.js';
import { transformBankAccount, transformBankAccounts } from '../transformers/bank-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';

export interface BankAccountFilters {
  view?: 'all' | 'standard' | 'paypal_accounts' | 'credit_card_accounts';
}

export async function getBankAccounts(
  client: FreeAgentClient,
  filters: BankAccountFilters = {}
) {
  try {
    const params: Record<string, string> = {};
    if (filters.view) params['view'] = filters.view;

    const accounts = await client.fetchAllPages<FreeAgentBankAccount>(
      '/bank_accounts',
      'bank_accounts',
      params
    );
    return transformBankAccounts(accounts);
  } catch (error) {
    handleResourceError(error, 'freeagent://bank_accounts');
  }
}

export async function getBankAccount(client: FreeAgentClient, id: string) {
  try {
    const response = await client.get<{ bank_account: FreeAgentBankAccount }>(`/bank_accounts/${id}`);
    return transformBankAccount(response.bank_account);
  } catch (error) {
    handleResourceError(error, `freeagent://bank_accounts/${id}`);
  }
}

export async function buildBankAccountNameLookup(
  client: FreeAgentClient
): Promise<Map<string, string>> {
  const accounts = await getBankAccounts(client, { view: 'all' });
  const lookup = new Map<string, string>();

  for (const account of accounts) {
    lookup.set(`https://api.freeagent.com/v2/bank_accounts/${account.id}`, account.name);
    lookup.set(`https://api.sandbox.freeagent.com/v2/bank_accounts/${account.id}`, account.name);
    lookup.set(account.id, account.name);
  }

  return lookup;
}
