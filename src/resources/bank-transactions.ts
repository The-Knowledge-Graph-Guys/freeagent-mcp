import type { FreeAgentClient } from '../api/freeagent-client.js';
import type { FreeAgentBankTransaction } from '../types/freeagent/index.js';
import { transformBankTransaction, transformBankTransactions } from '../transformers/bank-transformer.js';
import { handleResourceError } from '../utils/error-handler.js';
import { normalizeBankAccountId } from '../utils/validators.js';
import { FREEAGENT_API_BASE } from '../config.js';

export interface BankTransactionFilters {
  bankAccount: string; // Required
  fromDate?: string;
  toDate?: string;
  updatedSince?: string;
  view?: 'unexplained' | 'all';
}

export async function getBankTransactions(
  client: FreeAgentClient,
  filters: BankTransactionFilters,
  bankAccountNameLookup?: Map<string, string>
) {
  try {
    const params: Record<string, string> = {
      bank_account: normalizeBankAccountId(filters.bankAccount, FREEAGENT_API_BASE),
    };
    if (filters.fromDate) params['from_date'] = filters.fromDate;
    if (filters.toDate) params['to_date'] = filters.toDate;
    if (filters.updatedSince) params['updated_since'] = filters.updatedSince;
    if (filters.view) params['view'] = filters.view;

    const transactions = await client.fetchAllPages<FreeAgentBankTransaction>(
      '/bank_transactions',
      'bank_transactions',
      params
    );
    return transformBankTransactions(transactions, bankAccountNameLookup);
  } catch (error) {
    handleResourceError(error, 'freeagent://bank_transactions');
  }
}

export async function getBankTransaction(
  client: FreeAgentClient,
  id: string,
  bankAccountNameLookup?: Map<string, string>
) {
  try {
    const response = await client.get<{ bank_transaction: FreeAgentBankTransaction }>(
      `/bank_transactions/${id}`
    );
    return transformBankTransaction(response.bank_transaction, bankAccountNameLookup);
  } catch (error) {
    handleResourceError(error, `freeagent://bank_transactions/${id}`);
  }
}
