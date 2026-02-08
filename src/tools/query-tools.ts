import { z } from 'zod';
import type { FreeAgentClient } from '../api/freeagent-client.js';
import { getInvoices, type InvoiceFilters } from '../resources/invoices.js';
import { getBills, type BillFilters } from '../resources/bills.js';
import { getBankAccounts, buildBankAccountNameLookup } from '../resources/bank-accounts.js';
import { getBankTransactions } from '../resources/bank-transactions.js';
import { handleToolError } from '../utils/error-handler.js';
import type { LLMInvoice, LLMBill, LLMBankAccount, LLMBankTransaction } from '../types/llm/index.js';

// List unpaid invoices schema
export const listUnpaidInvoicesSchema = z.object({
  contact_id: z.string().optional(),
  include_overdue_only: z.boolean().default(false),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type ListUnpaidInvoicesInput = z.infer<typeof listUnpaidInvoicesSchema>;

export interface UnpaidInvoicesSummary {
  invoices: LLMInvoice[];
  totalCount: number;
  totalDue: number;
  totalOverdue: number;
  overdueCount: number;
  currency: string;
}

export async function listUnpaidInvoices(
  client: FreeAgentClient,
  input: ListUnpaidInvoicesInput,
  contactNameLookup?: Map<string, string>
): Promise<UnpaidInvoicesSummary> {
  try {
    const validated = listUnpaidInvoicesSchema.parse(input);

    const filters: InvoiceFilters = {
      view: 'recent_open_or_overdue',
    };

    if (validated.contact_id) filters.contact = validated.contact_id;
    if (validated.from_date) filters.fromDate = validated.from_date;

    let invoices = await getInvoices(client, filters, contactNameLookup);

    if (validated.include_overdue_only) {
      invoices = invoices.filter((inv) => inv.status === 'Overdue');
    } else {
      invoices = invoices.filter((inv) => inv.status === 'Open' || inv.status === 'Overdue');
    }

    const overdueInvoices = invoices.filter((inv) => inv.status === 'Overdue');
    const currency = invoices.length > 0 ? invoices[0]!.currency : 'GBP';

    return {
      invoices,
      totalCount: invoices.length,
      totalDue: invoices.reduce((sum, inv) => sum + inv.dueValue, 0),
      totalOverdue: overdueInvoices.reduce((sum, inv) => sum + inv.dueValue, 0),
      overdueCount: overdueInvoices.length,
      currency,
    };
  } catch (error) {
    handleToolError(error, 'list_unpaid_invoices');
  }
}

// List unpaid bills schema
export const listUnpaidBillsSchema = z.object({
  contact_id: z.string().optional(),
  include_overdue_only: z.boolean().default(false),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type ListUnpaidBillsInput = z.infer<typeof listUnpaidBillsSchema>;

export interface UnpaidBillsSummary {
  bills: LLMBill[];
  totalCount: number;
  totalDue: number;
  totalOverdue: number;
  overdueCount: number;
  currency: string;
}

export async function listUnpaidBills(
  client: FreeAgentClient,
  input: ListUnpaidBillsInput,
  contactNameLookup?: Map<string, string>
): Promise<UnpaidBillsSummary> {
  try {
    const validated = listUnpaidBillsSchema.parse(input);

    // FreeAgent bills endpoint does NOT support view=recent_open_or_overdue (unlike invoices).
    // Fetch all bills and filter by status in code.
    const filters: BillFilters = {};

    if (validated.contact_id) filters.contact = validated.contact_id;
    if (validated.from_date) filters.fromDate = validated.from_date;

    let bills = await getBills(client, filters, contactNameLookup);

    if (validated.include_overdue_only) {
      bills = bills.filter((bill) => bill.status === 'Overdue');
    } else {
      bills = bills.filter((bill) => bill.status === 'Open' || bill.status === 'Overdue');
    }

    const overdueBills = bills.filter((bill) => bill.status === 'Overdue');
    const currency = bills.length > 0 ? bills[0]!.currency : 'GBP';

    return {
      bills,
      totalCount: bills.length,
      totalDue: bills.reduce((sum, bill) => sum + bill.dueValue, 0),
      totalOverdue: overdueBills.reduce((sum, bill) => sum + bill.dueValue, 0),
      overdueCount: overdueBills.length,
      currency,
    };
  } catch (error) {
    handleToolError(error, 'list_unpaid_bills');
  }
}

// Get bank summary schema
export const getBankSummarySchema = z.object({
  view: z.enum(['all', 'standard', 'paypal_accounts', 'credit_card_accounts']).default('all'),
});

export type GetBankSummaryInput = z.infer<typeof getBankSummarySchema>;

export interface BankSummary {
  accounts: LLMBankAccount[];
  totalBalance: number;
  currency: string;
  accountCount: number;
}

export async function getBankSummary(
  client: FreeAgentClient,
  input: GetBankSummaryInput
): Promise<BankSummary> {
  try {
    const validated = getBankSummarySchema.parse(input);

    const accounts = await getBankAccounts(client, { view: validated.view });
    const activeAccounts = accounts.filter((acc) => acc.status === 'Active');

    // Group by currency
    const gbpAccounts = activeAccounts.filter((acc) => acc.currency === 'GBP');
    const totalGbp = gbpAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    return {
      accounts: activeAccounts,
      totalBalance: totalGbp,
      currency: 'GBP',
      accountCount: activeAccounts.length,
    };
  } catch (error) {
    handleToolError(error, 'get_bank_summary');
  }
}

// Search transactions schema
export const searchTransactionsSchema = z.object({
  bank_account_id: z.string().min(1),
  query: z.string().min(1),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  unexplained_only: z.boolean().default(false),
});

export type SearchTransactionsInput = z.infer<typeof searchTransactionsSchema>;

export interface TransactionSearchResult {
  transactions: LLMBankTransaction[];
  matchCount: number;
  searchQuery: string;
}

export async function searchTransactions(
  client: FreeAgentClient,
  input: SearchTransactionsInput
): Promise<TransactionSearchResult> {
  try {
    const validated = searchTransactionsSchema.parse(input);

    const bankAccountNameLookup = await buildBankAccountNameLookup(client);

    const transactions = await getBankTransactions(
      client,
      {
        bankAccount: validated.bank_account_id,
        fromDate: validated.from_date,
        toDate: validated.to_date,
        view: validated.unexplained_only ? 'unexplained' : 'all',
      },
      bankAccountNameLookup
    );

    // Simple text search on description
    const queryLower = validated.query.toLowerCase();
    const filtered = transactions.filter((tx) =>
      tx.description?.toLowerCase().includes(queryLower)
    );

    return {
      transactions: filtered,
      matchCount: filtered.length,
      searchQuery: validated.query,
    };
  } catch (error) {
    handleToolError(error, 'search_transactions');
  }
}

// Get unexplained transactions schema
export const getUnexplainedTransactionsSchema = z.object({
  bank_account_id: z.string().min(1),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().positive().default(50),
});

export type GetUnexplainedTransactionsInput = z.infer<typeof getUnexplainedTransactionsSchema>;

export interface UnexplainedTransactionsResult {
  transactions: LLMBankTransaction[];
  count: number;
  totalUnexplainedAmount: number;
}

export async function getUnexplainedTransactions(
  client: FreeAgentClient,
  input: GetUnexplainedTransactionsInput
): Promise<UnexplainedTransactionsResult> {
  try {
    const validated = getUnexplainedTransactionsSchema.parse(input);

    const bankAccountNameLookup = await buildBankAccountNameLookup(client);

    const transactions = await getBankTransactions(
      client,
      {
        bankAccount: validated.bank_account_id,
        fromDate: validated.from_date,
        toDate: validated.to_date,
        view: 'unexplained',
      },
      bankAccountNameLookup
    );

    const limited = transactions.slice(0, validated.limit);
    const totalUnexplained = limited.reduce((sum, tx) => sum + Math.abs(tx.unexplainedAmount), 0);

    return {
      transactions: limited,
      count: limited.length,
      totalUnexplainedAmount: totalUnexplained,
    };
  } catch (error) {
    handleToolError(error, 'get_unexplained_transactions');
  }
}
