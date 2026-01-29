import type { GetPromptResult, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export const quarterlyTaxEstimatePrompt = {
  name: 'quarterly_tax_estimate',
  description: 'Estimate tax liability for a specified quarter',
  arguments: [
    {
      name: 'quarter',
      description: 'Quarter number (1-4)',
      required: true,
    },
    {
      name: 'year',
      description: 'Tax year (YYYY)',
      required: true,
    },
  ],
};

export function getQuarterlyTaxEstimateMessages(
  quarter: string,
  year: string
): GetPromptResult {
  const quarterNum = parseInt(quarter, 10);
  const yearNum = parseInt(year, 10);

  // UK tax quarters typically follow calendar quarters
  const quarterStarts: Record<number, string> = {
    1: '01-01',
    2: '04-01',
    3: '07-01',
    4: '10-01',
  };

  const quarterEnds: Record<number, string> = {
    1: '03-31',
    2: '06-30',
    3: '09-30',
    4: '12-31',
  };

  const startDate = `${year}-${quarterStarts[quarterNum]}`;
  const endDate = `${year}-${quarterEnds[quarterNum]}`;

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Estimate tax liability for Q${quarterNum} ${yearNum} (${startDate} to ${endDate}).

Calculate:

1. Income Summary:
   - Total invoiced revenue
   - Less: VAT collected (if applicable)
   - Net revenue

2. Deductible Expenses:
   - Business expenses by category
   - Bills paid
   - Total allowable deductions

3. Profit Estimate:
   - Net profit for quarter
   - Year-to-date comparison

4. Tax Estimates (UK rates):
   - Corporation Tax estimate (25% on profits)
   - OR Self-employment tax estimate
   - National Insurance contributions
   - VAT liability (if VAT registered)

5. Cash Requirements:
   - Estimated tax due
   - Recommended set-aside amount

Note: This is an estimate only. Consult an accountant for accurate tax advice.`,
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: 'freeagent://company',
          mimeType: 'application/json',
          text: 'Company details (VAT status, company type)',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://invoices?from_date=${startDate}&to_date=${endDate}`,
          mimeType: 'application/json',
          text: 'Quarter invoices (revenue)',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://expenses?from_date=${startDate}&to_date=${endDate}`,
          mimeType: 'application/json',
          text: 'Quarter expenses',
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
          text: 'Quarter bills',
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
          text: 'Categories for tax-deductible analysis',
        },
      },
    },
  ];

  return {
    description: `Q${quarterNum} ${yearNum} tax estimate`,
    messages,
  };
}
