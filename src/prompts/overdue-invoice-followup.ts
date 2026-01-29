import type { GetPromptResult, PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export const overdueInvoiceFollowupPrompt = {
  name: 'overdue_invoice_followup',
  description: 'Draft reminder emails for overdue invoices',
  arguments: [
    {
      name: 'contact_id',
      description: 'Optional: specific contact ID to filter by',
      required: false,
    },
  ],
};

export function getOverdueInvoiceFollowupMessages(
  contactId?: string
): GetPromptResult {
  const invoiceUri = contactId
    ? `freeagent://invoices?status=overdue&contact=${contactId}`
    : 'freeagent://invoices?status=overdue';

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Review overdue invoices and help me draft follow-up emails.

For each overdue invoice:
1. Note how many days overdue
2. Check if there are previous invoices from this contact (payment history)
3. Draft an appropriate reminder email:
   - 1-7 days: Friendly reminder
   - 8-30 days: Firm but polite follow-up
   - 30+ days: Escalation notice

Include the invoice reference, amount, and due date in each email draft.
${contactId ? `Focusing on contact ID: ${contactId}` : 'Show all overdue invoices grouped by contact.'}`,
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: invoiceUri,
          mimeType: 'application/json',
          text: 'Overdue invoices',
        },
      },
    },
    {
      role: 'user',
      content: {
        type: 'resource',
        resource: {
          uri: 'freeagent://contacts?view=active',
          mimeType: 'application/json',
          text: 'Contact details for personalization',
        },
      },
    },
  ];

  return {
    description: 'Overdue invoice follow-up emails',
    messages,
  };
}
