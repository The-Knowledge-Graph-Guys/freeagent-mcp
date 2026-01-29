import type { GetPromptResult, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export const projectProfitabilityPrompt = {
  name: 'project_profitability',
  description: 'Analyze profit margins and efficiency for a specific project',
  arguments: [
    {
      name: 'project_id',
      description: 'Project ID to analyze',
      required: true,
    },
  ],
};

export function getProjectProfitabilityMessages(
  projectId: string
): GetPromptResult {
  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Analyze the profitability of project ${projectId}. Calculate:

1. Revenue Analysis:
   - Total invoiced amount
   - Outstanding invoices
   - Average hourly/daily rate achieved

2. Cost Analysis:
   - Time logged (hours × cost rate)
   - Direct expenses
   - Bills allocated to project

3. Profitability Metrics:
   - Gross profit
   - Profit margin percentage
   - Budget vs actual comparison
   - Efficiency (actual vs budgeted time)

4. Recommendations:
   - Is the project on track?
   - Areas for improvement
   - Rate adjustment suggestions`,
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://projects/${projectId}`,
          mimeType: 'application/json',
          text: 'Project details',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://invoices?project=${projectId}`,
          mimeType: 'application/json',
          text: 'Project invoices',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://timeslips?project=${projectId}`,
          mimeType: 'application/json',
          text: 'Time logged against project',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://expenses?project=${projectId}`,
          mimeType: 'application/json',
          text: 'Project expenses',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: `freeagent://bills?project=${projectId}`,
          mimeType: 'application/json',
          text: 'Bills allocated to project',
        },
      },
    },
  ];

  return {
    description: `Project profitability analysis for project ${projectId}`,
    messages,
  };
}
