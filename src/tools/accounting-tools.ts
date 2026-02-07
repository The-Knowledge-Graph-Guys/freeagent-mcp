import { z } from 'zod';
import type { FreeAgentClient } from '../api/freeagent-client.js';
import { handleToolError } from '../utils/error-handler.js';

// ========== Trial Balance / P&L ==========

export const getTrialBalanceSummarySchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type GetTrialBalanceSummaryInput = z.infer<typeof getTrialBalanceSummarySchema>;

interface TrialBalanceCategory {
  category: string;
  nominal_code: string;
  display_nominal_code: string;
  name: string;
  total: string;
}

export interface ProfitAndLossReport {
  period: { from: string; to: string };
  income: { categories: Array<{ name: string; nominalCode: string; total: number }>; total: number };
  costOfSales: { categories: Array<{ name: string; nominalCode: string; total: number }>; total: number };
  grossProfit: number;
  overheads: { categories: Array<{ name: string; nominalCode: string; total: number }>; total: number };
  netProfit: number;
  currency: string;
}

export async function getTrialBalanceSummary(
  client: FreeAgentClient,
  input: GetTrialBalanceSummaryInput
): Promise<ProfitAndLossReport> {
  try {
    const validated = getTrialBalanceSummarySchema.parse(input);

    const response = await client.get<{ trial_balance_summary: TrialBalanceCategory[] }>(
      '/accounting/trial_balance/summary',
      { from_date: validated.from_date, to_date: validated.to_date }
    );

    const categories = response.trial_balance_summary;

    // FreeAgent nominal code ranges:
    // 001 = Sales (income, shown as negative)
    // 100-199 = Cost of sales / direct costs
    // 200-499 = Administrative overheads
    // 500-699 = Other overheads
    // 700+ = Balance sheet items (skip for P&L)
    const income: Array<{ name: string; nominalCode: string; total: number }> = [];
    const costOfSales: Array<{ name: string; nominalCode: string; total: number }> = [];
    const overheads: Array<{ name: string; nominalCode: string; total: number }> = [];

    for (const cat of categories) {
      const code = parseInt(cat.nominal_code, 10);
      const total = parseFloat(cat.total);

      if (code <= 1) {
        // Income (FreeAgent shows as negative)
        income.push({ name: cat.name, nominalCode: cat.nominal_code, total: Math.abs(total) });
      } else if (code >= 100 && code < 200) {
        // Cost of sales
        costOfSales.push({ name: cat.name, nominalCode: cat.nominal_code, total });
      } else if (code >= 200 && code < 700) {
        // Overheads
        if (total !== 0) {
          overheads.push({ name: cat.name, nominalCode: cat.nominal_code, total });
        }
      }
      // Skip 700+ (balance sheet items)
    }

    const incomeTotal = income.reduce((sum, c) => sum + c.total, 0);
    const costOfSalesTotal = costOfSales.reduce((sum, c) => sum + c.total, 0);
    const grossProfit = incomeTotal - costOfSalesTotal;
    const overheadsTotal = overheads.reduce((sum, c) => sum + c.total, 0);
    const netProfit = grossProfit - overheadsTotal;

    return {
      period: { from: validated.from_date, to: validated.to_date },
      income: { categories: income, total: incomeTotal },
      costOfSales: { categories: costOfSales, total: costOfSalesTotal },
      grossProfit,
      overheads: { categories: overheads, total: overheadsTotal },
      netProfit,
      currency: 'GBP',
    };
  } catch (error) {
    handleToolError(error, 'get_profit_and_loss');
  }
}

// ========== Tax Timeline ==========

export const getTaxTimelineSchema = z.object({});

export type GetTaxTimelineInput = z.infer<typeof getTaxTimelineSchema>;

interface TaxTimelineItem {
  description: string;
  nature: string;
  dated_on: string;
  amount_due?: string;
  is_personal: boolean;
  status?: string;
}

export interface TaxTimelineReport {
  items: Array<{
    description: string;
    nature: string;
    datedOn: string;
    amountDue: number | null;
    isPersonal: boolean;
    status: string | null;
  }>;
  nextPaymentDue: { description: string; datedOn: string; amount: number } | null;
  totalUpcoming: number;
  currency: string;
}

export async function getTaxTimeline(
  client: FreeAgentClient,
  _input: GetTaxTimelineInput
): Promise<TaxTimelineReport> {
  try {
    const response = await client.get<{ timeline_items: TaxTimelineItem[] }>(
      '/tax_timeline'
    );

    const items = response.timeline_items.map((item) => ({
      description: item.description,
      nature: item.nature,
      datedOn: item.dated_on,
      amountDue: item.amount_due ? parseFloat(item.amount_due) : null,
      isPersonal: item.is_personal,
      status: item.status ?? null,
    }));

    // Find next payment due
    const payments = items.filter((i) => i.amountDue !== null && i.amountDue > 0);
    const nextPayment = payments.length > 0
      ? { description: payments[0]!.description, datedOn: payments[0]!.datedOn, amount: payments[0]!.amountDue! }
      : null;

    const totalUpcoming = payments.reduce((sum, p) => sum + (p.amountDue ?? 0), 0);

    return {
      items,
      nextPaymentDue: nextPayment,
      totalUpcoming,
      currency: 'GBP',
    };
  } catch (error) {
    handleToolError(error, 'get_tax_timeline');
  }
}

// ========== Cash Flow Summary ==========

export const getCashFlowSchema = z.object({
  bank_account_id: z.string().min(1),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  group_by: z.enum(['month', 'week']).default('month'),
});

export type GetCashFlowInput = z.infer<typeof getCashFlowSchema>;

interface BankTransactionRaw {
  url: string;
  amount: string;
  dated_on: string;
  description: string;
  unexplained_amount?: string;
}

export interface CashFlowReport {
  period: { from: string; to: string };
  groupBy: string;
  periods: Array<{
    label: string;
    inflows: number;
    outflows: number;
    net: number;
    transactionCount: number;
  }>;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  currency: string;
}

export async function getCashFlow(
  client: FreeAgentClient,
  input: GetCashFlowInput
): Promise<CashFlowReport> {
  try {
    const validated = getCashFlowSchema.parse(input);

    const transactions = await client.fetchAllPages<BankTransactionRaw>(
      `/bank_transactions`,
      'bank_transactions',
      {
        bank_account: `https://api.freeagent.com/v2/bank_accounts/${validated.bank_account_id}`,
        from_date: validated.from_date,
        to_date: validated.to_date,
      }
    );

    // Group by period
    const groups = new Map<string, { inflows: number; outflows: number; count: number }>();

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);
      const date = new Date(tx.dated_on);
      let label: string;

      if (validated.group_by === 'month') {
        label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // ISO week
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
        label = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      }

      if (!groups.has(label)) {
        groups.set(label, { inflows: 0, outflows: 0, count: 0 });
      }
      const group = groups.get(label)!;
      if (amount > 0) {
        group.inflows += amount;
      } else {
        group.outflows += Math.abs(amount);
      }
      group.count++;
    }

    // Sort by period label
    const sortedPeriods = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, data]) => ({
        label,
        inflows: Math.round(data.inflows * 100) / 100,
        outflows: Math.round(data.outflows * 100) / 100,
        net: Math.round((data.inflows - data.outflows) * 100) / 100,
        transactionCount: data.count,
      }));

    const totalInflows = sortedPeriods.reduce((s, p) => s + p.inflows, 0);
    const totalOutflows = sortedPeriods.reduce((s, p) => s + p.outflows, 0);

    return {
      period: { from: validated.from_date, to: validated.to_date },
      groupBy: validated.group_by,
      periods: sortedPeriods,
      totalInflows: Math.round(totalInflows * 100) / 100,
      totalOutflows: Math.round(totalOutflows * 100) / 100,
      netCashFlow: Math.round((totalInflows - totalOutflows) * 100) / 100,
      currency: 'GBP',
    };
  } catch (error) {
    handleToolError(error, 'get_cash_flow');
  }
}
