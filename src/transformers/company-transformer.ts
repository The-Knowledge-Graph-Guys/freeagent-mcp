import type { FreeAgentCompany } from '../types/freeagent/index.js';
import type { LLMCompany } from '../types/llm/index.js';

export function transformCompany(company: FreeAgentCompany): LLMCompany {
  return {
    name: company.name,
    currency: company.currency,
    type: company.type,
    startDate: company.company_start_date,
    salesTaxRegistered: company.sales_tax_registration_status === 'Registered',
  };
}
