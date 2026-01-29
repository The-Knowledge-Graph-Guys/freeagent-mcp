import type { GetPromptResult, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export const invoiceFromDescriptionPrompt = {
  name: 'invoice_from_description',
  description: 'Create an invoice from a natural language description',
  arguments: [
    {
      name: 'description',
      description: 'Natural language description of the invoice',
      required: true,
    },
  ],
};

export function getInvoiceFromDescriptionMessages(
  description: string
): GetPromptResult {
  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Parse this invoice description and create an invoice:

"${description}"

Steps:
1. Identify the contact (search contacts if needed)
2. Extract line items with quantities and rates
3. Determine payment terms
4. Use the create_invoice tool with extracted data
5. Confirm creation with me before sending

Please start by looking up the contacts to find the correct recipient.`,
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: 'freeagent://contacts?view=active',
          mimeType: 'application/json',
          text: 'Active contacts for matching',
        },
      },
    },
  ];

  return {
    description: 'Create invoice from natural language description',
    messages,
  };
}
