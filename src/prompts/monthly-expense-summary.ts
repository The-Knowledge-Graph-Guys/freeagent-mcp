import type { GetPromptResult, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export const monthlyExpenseSummaryPrompt = {
  name: 'monthly_expense_summary',
  description: 'Generate a comprehensive expense analysis for a specified month',
  arguments: [
    {
      name: 'month',
      description: 'Month number (1-12)',
      required: true,
    },
    {
      name: 'year',
      description: 'Year (YYYY)',
      required: true,
    },
  ],
};

export function getMonthlyExpenseSummaryMessages(
  month: string,
  year: string
): GetPromptResult {
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // Calculate date range
  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

  // Previous month for comparison
  const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;
  const prevStartDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`;
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
  const prevEndDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${prevLastDay}`;

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Analyze expenses for ${monthNum}/${yearNum}. Include:
1. Total expenses by category
2. Top 5 vendors by spend
3. Month-over-month comparison with ${prevMonth}/${prevYear}
4. Flag any unusual expenses (>2x average)
5. Tax-deductible totals

Please read the expense and bill data from the resources and provide a comprehensive analysis.`,
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://expenses?from_date=${startDate}&to_date=${endDate}`,
          mimeType: 'application/json',
          text: `Fetch expenses from ${startDate} to ${endDate}`,
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://bills?from_date=${startDate}&to_date=${endDate}`,
          mimeType: 'application/json',
          text: `Fetch bills from ${startDate} to ${endDate}`,
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://expenses?from_date=${prevStartDate}&to_date=${prevEndDate}`,
          mimeType: 'application/json',
          text: `Fetch previous month expenses for comparison`,
        },
      },
    },
  ];

  return {
    description: `Monthly expense summary for ${monthNum}/${yearNum}`,
    messages,
  };
}
