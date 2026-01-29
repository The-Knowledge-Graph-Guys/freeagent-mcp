import type { GetPromptResult, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export const transactionCategorizationPrompt = {
  name: 'transaction_categorization',
  description: 'Suggest categories for unexplained bank transactions',
  arguments: [
    {
      name: 'bank_account_id',
      description: 'Bank account ID to analyze',
      required: true,
    },
    {
      name: 'from_date',
      description: 'Start date (YYYY-MM-DD)',
      required: false,
    },
  ],
};

export function getTransactionCategorizationMessages(
  bankAccountId: string,
  fromDate?: string
): GetPromptResult {
  const today = new Date();
  const defaultFromDate = new Date(today);
  defaultFromDate.setMonth(defaultFromDate.getMonth() - 1);

  const startDate = fromDate ?? defaultFromDate.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Review unexplained bank transactions and suggest categories for each.

For each transaction:
1. Analyze the description to identify the type of expense/income
2. Match against available categories
3. Suggest the most appropriate category
4. Flag any that might be:
   - Personal expenses
   - Potential invoice matches
   - Recurring subscriptions

After reviewing, I can use the explain_transaction tool to categorize them.`,
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://bank_transactions?bank_account=${bankAccountId}&from_date=${startDate}&to_date=${endDate}&view=unexplained`,
          mimeType: 'application/json',
          text: 'Unexplained transactions to categorize',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: 'freeagent://categories',
          mimeType: 'application/json',
          text: 'Available categories for matching',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: 'freeagent://invoices?view=recent_open_or_overdue',
          mimeType: 'application/json',
          text: 'Open invoices for potential matching',
        },
      },
    },
  ];

  return {
    description: `Transaction categorization for bank account ${bankAccountId}`,
    messages,
  };
}
