import type {
  FreeAgentBankAccount,
  FreeAgentBankTransaction,
  FreeAgentBankTransactionExplanation,
} from '../types/freeagent/index.js';
import type {
  LLMBankAccount,
  LLMBankTransaction,
  LLMBankTransactionExplanation,
} from '../types/llm/index.js';
import { extractId, parseNumericString } from './common.js';

export function transformBankAccount(account: FreeAgentBankAccount): LLMBankAccount {
  // FreeAgent API returns lowercase status ('active', 'hidden') for bank accounts
  // but capitalized for contacts. Normalize to capitalized for consistent LLM types.
  const normalizedStatus = account.status.charAt(0).toUpperCase() + account.status.slice(1) as LLMBankAccount['status'];

  return {
    id: extractId(account.url),
    name: account.name,
    type: account.type,
    currency: account.currency,
    currentBalance: parseNumericString(account.current_balance),
    openingBalance: parseNumericString(account.opening_balance),
    status: normalizedStatus,
    isPrimary: account.is_primary,
    latestActivityDate: account.latest_activity_date,
  };
}

export function transformBankAccounts(accounts: FreeAgentBankAccount[]): LLMBankAccount[] {
  return accounts.map(transformBankAccount);
}

export function transformBankTransactionExplanation(
  explanation: FreeAgentBankTransactionExplanation
): LLMBankTransactionExplanation {
  return {
    category: explanation.category ? extractId(explanation.category) : undefined,
    description: explanation.description,
    matchedInvoiceId: explanation.paid_invoice ? extractId(explanation.paid_invoice) : undefined,
    matchedBillId: explanation.paid_bill ? extractId(explanation.paid_bill) : undefined,
    value: parseNumericString(explanation.gross_value),
  };
}

export function transformBankTransaction(
  transaction: FreeAgentBankTransaction,
  bankAccountNameLookup?: Map<string, string>
): LLMBankTransaction {
  const bankAccountId = extractId(transaction.bank_account);
  const bankAccountName = bankAccountNameLookup?.get(transaction.bank_account) ?? bankAccountId;

  const explanations = transaction.bank_transaction_explanations?.map(
    transformBankTransactionExplanation
  );

  return {
    id: extractId(transaction.url),
    bankAccountId,
    bankAccountName,
    datedOn: transaction.dated_on,
    amount: parseNumericString(transaction.amount),
    description: transaction.description,
    isExplained: parseNumericString(transaction.unexplained_amount) === 0,
    unexplainedAmount: parseNumericString(transaction.unexplained_amount),
    explanations,
  };
}

export function transformBankTransactions(
  transactions: FreeAgentBankTransaction[],
  bankAccountNameLookup?: Map<string, string>
): LLMBankTransaction[] {
  return transactions.map((tx) => transformBankTransaction(tx, bankAccountNameLookup));
}
