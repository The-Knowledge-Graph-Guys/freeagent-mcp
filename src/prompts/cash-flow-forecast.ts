import type { GetPromptResult, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export const cashFlowForecastPrompt = {
  name: 'cash_flow_forecast',
  description: 'Project cash position for the next 30, 60, or 90 days',
  arguments: [
    {
      name: 'days',
      description: 'Forecast period in days (30, 60, or 90)',
      required: true,
    },
  ],
};

export function getCashFlowForecastMessages(days: string): GetPromptResult {
  const daysNum = parseInt(days, 10);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysNum);
  const endDateStr = endDate.toISOString().split('T')[0];

  // Look back 90 days for historical context
  const lookbackDate = new Date(today);
  lookbackDate.setDate(lookbackDate.getDate() - 90);
  const lookbackStr = lookbackDate.toISOString().split('T')[0];

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Create a ${daysNum}-day cash flow forecast. Analyze:

1. Current bank balances
2. Expected income from:
   - Open invoices (by due date)
   - Recurring revenue patterns
3. Expected outgoings from:
   - Upcoming bills
   - Recurring expenses
4. Project cash position week by week
5. Highlight any potential shortfalls

Provide a clear summary with key dates to watch.`,
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: 'freeagent://bank_accounts',
          mimeType: 'application/json',
          text: 'Current bank account balances',
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
          text: 'Open invoices (expected income)',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: 'freeagent://bills?view=recent_open_or_overdue',
          mimeType: 'application/json',
          text: 'Open bills (expected outgoings)',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://expenses?from_date=${lookbackStr}&to_date=${todayStr}`,
          mimeType: 'application/json',
          text: 'Recent expenses for pattern analysis',
        },
      },
    },
  ];

  return {
    description: `${daysNum}-day cash flow forecast`,
    messages,
  };
}
