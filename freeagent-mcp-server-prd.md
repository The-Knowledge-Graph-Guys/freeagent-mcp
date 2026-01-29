# Product Requirements Document

## FreeAgent MCP Server

### Model Context Protocol Integration for Accounting Automation

---

**Version:** 1.0.0  
**Status:** Draft  
**Date:** January 2026  
**Classification:** Technical Specification

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Features & Scope](#2-core-features--scope)
3. [Technical Requirements](#3-technical-requirements)
4. [Schema & Data Mapping](#4-schema--data-mapping)
5. [Security & Privacy](#5-security--privacy)
6. [Success Metrics](#6-success-metrics)
7. [Appendices](#7-appendices)

---

## 1. Project Overview

### 1.1 Executive Summary

This document defines the requirements for building an MCP (Model Context Protocol) Server that integrates with the FreeAgent accounting API. The server enables Large Language Models to securely access, query, and manage accounting data through a standardized protocol, unlocking AI-powered bookkeeping automation for small businesses and freelancers.

### 1.2 Problem Statement

Small business owners and freelancers spend an average of 5-10 hours per week on bookkeeping tasks. While FreeAgent provides excellent accounting software with comprehensive features for invoicing, expense tracking, and financial reporting, users still must manually navigate the interface to extract insights, create invoices, and reconcile transactions. There is no standardized way for AI assistants to interact with accounting data securely and reliably.

### 1.3 Solution Vision

The FreeAgent MCP Server bridges accounting data with AI capabilities by exposing FreeAgent entities as MCP Resources and operations as MCP Tools. This enables natural language interactions such as:

- "What invoices are overdue this month?"
- "Create an invoice for Acme Ltd for 40 hours of consulting at £75/hour"
- "Summarize my expenses by category for Q4"
- "Which bank transactions need explanation?"

### 1.4 Target Users

| User Type | Description | Primary Use Cases |
|-----------|-------------|-------------------|
| **Primary** | Developers building AI-powered accounting integrations | Building chatbots, automation workflows, custom AI assistants |
| **Secondary** | Business owners using LLMs via MCP-compatible clients | Natural language queries, automated bookkeeping tasks |
| **Tertiary** | Accountants and bookkeepers | Automating repetitive client work, bulk operations |

### 1.5 Scope Boundaries

**In Scope:**
- Core FreeAgent entities: Contacts, Invoices, Bills, Bank Transactions, Projects, Expenses, Timeslips
- OAuth2 authentication flow management
- Read and write operations per FreeAgent API capabilities
- Pre-defined prompt templates for common workflows

**Out of Scope (v1.0):**
- Payroll operations
- VAT/Tax returns submission
- Multi-company (Practice Dashboard) access
- Real-time bank feed synchronization
- File attachment handling

---

## 2. Core Features & Scope

### 2.1 MCP Architecture Overview

The Model Context Protocol distinguishes between three core primitives:

| Primitive | Purpose | Control Model |
|-----------|---------|---------------|
| **Resources** | Read-only data endpoints exposing FreeAgent entities | Application-controlled |
| **Tools** | Executable operations that modify data | Model-controlled |
| **Prompts** | Reusable instruction templates for workflows | User-invoked |

This separation enables fine-grained access control and optimized LLM context management.

### 2.2 Resource Templates

Resources expose FreeAgent entities as read-only URI-addressable data. The LLM can request specific resources to populate its context without executing side effects.

#### 2.2.1 Resource URI Schema

```
freeagent://{entity_type}/{id?}
freeagent://{entity_type}?{query_params}
```

#### 2.2.2 Core Resources

| Resource URI | Description | FreeAgent Endpoint | Access Level |
|--------------|-------------|-------------------|--------------|
| `freeagent://company` | Company profile and settings | `GET /v2/company` | 8 (Full) |
| `freeagent://contacts` | List all contacts (clients/suppliers) | `GET /v2/contacts` | 3 |
| `freeagent://contacts/{id}` | Single contact with full details | `GET /v2/contacts/{id}` | 3 |
| `freeagent://invoices` | List invoices with filters | `GET /v2/invoices` | 4 |
| `freeagent://invoices/{id}` | Single invoice with line items | `GET /v2/invoices/{id}` | 4 |
| `freeagent://bills` | Outstanding bills and expenses | `GET /v2/bills` | 5 |
| `freeagent://bills/{id}` | Single bill with items | `GET /v2/bills/{id}` | 5 |
| `freeagent://bank_accounts` | Bank account list | `GET /v2/bank_accounts` | 6 |
| `freeagent://bank_transactions` | Bank transaction feed | `GET /v2/bank_transactions` | 6 |
| `freeagent://bank_transactions/{id}` | Single transaction | `GET /v2/bank_transactions/{id}` | 6 |
| `freeagent://projects` | Active projects list | `GET /v2/projects` | 3 |
| `freeagent://projects/{id}` | Project with tasks and time entries | `GET /v2/projects/{id}` | 3 |
| `freeagent://expenses` | Expense claims | `GET /v2/expenses` | 2 |
| `freeagent://timeslips` | Time tracking entries | `GET /v2/timeslips` | 1 |
| `freeagent://categories` | Account categories | `GET /v2/categories` | 7 |
| `freeagent://users` | Team members | `GET /v2/users` | 7 |

#### 2.2.3 Resource Query Parameters

Resources support FreeAgent's native filtering:

```
freeagent://invoices?status=open&from_date=2024-01-01&to_date=2024-12-31
freeagent://bank_transactions?bank_account={account_id}&from_date=2024-01-01
freeagent://contacts?view=active
freeagent://bills?contact={contact_id}
```

#### 2.2.4 Resource Response Format

```json
{
  "uri": "freeagent://contacts/12345",
  "mimeType": "application/json",
  "content": {
    "url": "https://api.freeagent.com/v2/contacts/12345",
    "first_name": "John",
    "last_name": "Doe",
    "organisation_name": "Acme Ltd",
    "email": "john@acme.com",
    "account_balance": "-500.00",
    "status": "Active"
  }
}
```

### 2.3 Tools (Operations)

Tools enable the LLM to execute operations that modify FreeAgent data. Each tool includes strict input validation and returns structured results.

#### 2.3.1 Invoice Tools

| Tool Name | Permission | Description | Required Parameters |
|-----------|------------|-------------|---------------------|
| `create_invoice` | write:invoices | Create new invoice with line items | `contact_id`, `dated_on`, `payment_terms_in_days`, `invoice_items[]` |
| `update_invoice` | write:invoices | Modify draft invoice | `invoice_id`, fields to update |
| `send_invoice` | write:invoices | Email invoice to contact | `invoice_id`, `email_to` (optional) |
| `mark_invoice_sent` | write:invoices | Mark as sent without email | `invoice_id` |
| `mark_invoice_paid` | write:invoices | Record payment | `invoice_id`, `paid_on`, `amount` (optional) |
| `delete_invoice` | write:invoices | Delete draft invoice | `invoice_id` |

**Example: `create_invoice` Tool Schema**

```json
{
  "name": "create_invoice",
  "description": "Create a new invoice for a contact with line items",
  "inputSchema": {
    "type": "object",
    "properties": {
      "contact_id": {
        "type": "string",
        "description": "FreeAgent contact URL or ID"
      },
      "dated_on": {
        "type": "string",
        "format": "date",
        "description": "Invoice date (YYYY-MM-DD)"
      },
      "payment_terms_in_days": {
        "type": "integer",
        "default": 30,
        "description": "Days until payment due"
      },
      "currency": {
        "type": "string",
        "default": "GBP",
        "description": "Three-letter currency code"
      },
      "invoice_items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "description": { "type": "string" },
            "item_type": { 
              "type": "string", 
              "enum": ["Hours", "Days", "Weeks", "Months", "Years", "Products", "Services", "Training", "Expenses", "Comment"] 
            },
            "quantity": { "type": "number" },
            "price": { "type": "number" },
            "sales_tax_rate": { "type": "number" }
          },
          "required": ["description", "item_type", "quantity", "price"]
        },
        "minItems": 1
      },
      "comments": {
        "type": "string",
        "description": "Notes visible on invoice"
      }
    },
    "required": ["contact_id", "dated_on", "invoice_items"]
  }
}
```

#### 2.3.2 Contact Tools

| Tool Name | Permission | Description | Required Parameters |
|-----------|------------|-------------|---------------------|
| `create_contact` | write:contacts | Add new client/supplier | `first_name` OR `organisation_name` |
| `update_contact` | write:contacts | Update contact details | `contact_id`, fields to update |
| `delete_contact` | write:contacts | Remove contact | `contact_id` |

#### 2.3.3 Bank Transaction Tools

| Tool Name | Permission | Description | Required Parameters |
|-----------|------------|-------------|---------------------|
| `explain_transaction` | write:bank | Categorize bank transaction | `transaction_id`, `category`, `description` |
| `match_transaction` | write:bank | Match to invoice/bill | `transaction_id`, `invoice_id` OR `bill_id` |
| `split_transaction` | write:bank | Split across categories | `transaction_id`, `splits[]` |
| `unexplain_transaction` | write:bank | Remove explanation | `transaction_id` |

#### 2.3.4 Bill Tools

| Tool Name | Permission | Description | Required Parameters |
|-----------|------------|-------------|---------------------|
| `create_bill` | write:bills | Record supplier bill | `contact_id`, `reference`, `dated_on`, `category`, `total_value` |
| `update_bill` | write:bills | Modify bill | `bill_id`, fields to update |
| `delete_bill` | write:bills | Remove bill | `bill_id` |

#### 2.3.5 Project & Time Tools

| Tool Name | Permission | Description | Required Parameters |
|-----------|------------|-------------|---------------------|
| `create_project` | write:projects | Initialize project | `contact_id`, `name`, `budget_units` |
| `update_project` | write:projects | Update project | `project_id`, fields to update |
| `create_timeslip` | write:timeslips | Log time entry | `project_id`, `user_id`, `dated_on`, `hours` |
| `create_task` | write:projects | Add task to project | `project_id`, `name` |

#### 2.3.6 Query Tools (Read-Only)

| Tool Name | Permission | Description | Use Case |
|-----------|------------|-------------|----------|
| `list_unpaid_invoices` | read:invoices | Filter overdue/open invoices | Cash flow analysis |
| `get_bank_summary` | read:bank | Aggregate balances | Financial overview |
| `search_transactions` | read:bank | Full-text search | Transaction lookup |
| `get_profit_loss` | read:reports | P&L for date range | Financial reporting |
| `get_balance_sheet` | read:reports | Balance sheet | Financial reporting |
| `get_cashflow` | read:reports | Cash flow projection | Forecasting |

### 2.4 Prompt Templates

Pre-defined prompts provide structured workflows for common accounting tasks.

#### 2.4.1 Prompt Registry

| Prompt Name | Arguments | Description |
|-------------|-----------|-------------|
| `monthly_expense_summary` | `month`, `year` | Categorized expense report with comparisons |
| `invoice_from_description` | `description` | Parse natural language into invoice |
| `cash_flow_forecast` | `days` (30/60/90) | Project cash position |
| `overdue_invoice_followup` | `contact_id` (optional) | Draft reminder emails |
| `transaction_categorization` | `bank_account_id`, `from_date` | Suggest categories for unexplained |
| `project_profitability` | `project_id` | Analyze project margins |
| `quarterly_tax_estimate` | `quarter`, `year` | Estimate tax liability |

#### 2.4.2 Example Prompt Implementation

**`monthly_expense_summary`**

```json
{
  "name": "monthly_expense_summary",
  "description": "Generate a comprehensive expense analysis for a specified month",
  "arguments": [
    {
      "name": "month",
      "description": "Month number (1-12)",
      "required": true
    },
    {
      "name": "year",
      "description": "Year (YYYY)",
      "required": true
    }
  ]
}
```

**Generated Messages:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Analyze expenses for {{month}}/{{year}}. Include:\n1. Total expenses by category\n2. Top 5 vendors by spend\n3. Month-over-month comparison\n4. Flag any unusual expenses (>2x average)\n5. Tax-deductible totals"
      }
    },
    {
      "role": "user",
      "content": {
        "type": "resource",
        "resource": {
          "uri": "freeagent://expenses?from_date={{year}}-{{month}}-01&to_date={{end_date}}"
        }
      }
    },
    {
      "role": "user",
      "content": {
        "type": "resource",
        "resource": {
          "uri": "freeagent://bills?from_date={{year}}-{{month}}-01&to_date={{end_date}}"
        }
      }
    }
  ]
}
```

**`invoice_from_description`**

```json
{
  "name": "invoice_from_description",
  "description": "Create an invoice from natural language description",
  "arguments": [
    {
      "name": "description",
      "description": "Natural language description of the invoice",
      "required": true
    }
  ]
}
```

**Example Input:**
> "Invoice Acme Ltd for 40 hours of backend development at £85/hour, plus £200 expenses for cloud hosting. Payment due in 14 days."

**Generated Messages:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Parse this invoice description and create an invoice:\n\n{{description}}\n\nSteps:\n1. Identify the contact (search contacts if needed)\n2. Extract line items with quantities and rates\n3. Determine payment terms\n4. Use create_invoice tool with extracted data\n5. Confirm creation with user before sending"
      }
    },
    {
      "role": "user",
      "content": {
        "type": "resource",
        "resource": {
          "uri": "freeagent://contacts"
        }
      }
    }
  ]
}
```

---

## 3. Technical Requirements

### 3.1 Authentication

#### 3.1.1 OAuth2 Flow

FreeAgent implements OAuth 2.0 Draft 22. The MCP server must handle the complete authorization flow.

**Endpoints:**
- Authorization: `https://api.freeagent.com/v2/approve_app`
- Token: `https://api.freeagent.com/v2/token_endpoint`
- Sandbox: `https://api.sandbox.freeagent.com/v2/...`

**Flow Sequence:**

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│   User  │     │MCP Client│     │MCP Server │     │FreeAgent │
└────┬────┘     └────┬─────┘     └─────┬─────┘     └────┬─────┘
     │               │                 │                 │
     │ 1. Connect    │                 │                 │
     │──────────────>│                 │                 │
     │               │ 2. Init         │                 │
     │               │────────────────>│                 │
     │               │                 │ 3. Auth URL     │
     │               │<────────────────│                 │
     │ 4. Redirect   │                 │                 │
     │<──────────────│                 │                 │
     │               │                 │                 │
     │ 5. Login & Authorize            │                 │
     │────────────────────────────────────────────────-->│
     │               │                 │                 │
     │ 6. Callback with code           │                 │
     │<──────────────────────────────────────────────────│
     │               │                 │                 │
     │ 7. Code       │                 │                 │
     │──────────────>│ 8. Exchange     │                 │
     │               │────────────────>│                 │
     │               │                 │ 9. Code→Token   │
     │               │                 │────────────────>│
     │               │                 │ 10. Tokens      │
     │               │                 │<────────────────│
     │               │ 11. Ready       │                 │
     │               │<────────────────│                 │
```

#### 3.1.2 Token Management

```typescript
interface TokenStore {
  access_token: string;
  refresh_token: string;
  expires_at: number;  // Unix timestamp
  refresh_token_expires_at: number;
}

// Token refresh logic
async function ensureValidToken(store: TokenStore): Promise<string> {
  if (Date.now() < store.expires_at - 60000) {
    return store.access_token;
  }
  
  const response = await fetch('https://api.freeagent.com/v2/token_endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${base64(CLIENT_ID + ':' + CLIENT_SECRET)}`
    },
    body: `grant_type=refresh_token&refresh_token=${store.refresh_token}`
  });
  
  const tokens = await response.json();
  // Update store with new tokens
  return tokens.access_token;
}
```

#### 3.1.3 Credential Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Client ID storage | Environment variable or secure vault |
| Client Secret storage | Environment variable or secure vault (NEVER in code) |
| Access token storage | Encrypted at rest, memory-only preferred |
| Refresh token storage | Encrypted at rest, secure storage required |
| Token transmission | HTTPS only, Authorization header |

**Environment Variables:**
```bash
FREEAGENT_CLIENT_ID=your_client_id
FREEAGENT_CLIENT_SECRET=your_client_secret
FREEAGENT_REDIRECT_URI=http://localhost:3000/callback
FREEAGENT_ENVIRONMENT=sandbox  # or 'production'
```

### 3.2 Rate Limiting

#### 3.2.1 FreeAgent API Limits

| Limit Type | Threshold | Reset Period |
|------------|-----------|--------------|
| User requests | 120 per minute | Start of minute |
| User requests | 3,600 per hour | Start of hour |
| Token refreshes | 15 per minute | Start of minute |

#### 3.2.2 Rate Limit Handling Strategy

```typescript
class RateLimiter {
  private requestCounts = new Map<string, { minute: number; hour: number }>();
  private lastReset = { minute: Date.now(), hour: Date.now() };
  
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    userId: string
  ): Promise<T> {
    await this.checkLimits(userId);
    
    try {
      const response = await fn();
      this.incrementCount(userId);
      return response;
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers['Retry-After']) || 60;
        await this.sleep(retryAfter * 1000);
        return this.executeWithRetry(fn, userId);
      }
      throw error;
    }
  }
  
  private async checkLimits(userId: string): Promise<void> {
    const counts = this.requestCounts.get(userId) || { minute: 0, hour: 0 };
    
    if (counts.minute >= 100) {  // Buffer below 120
      const waitTime = 60000 - (Date.now() - this.lastReset.minute);
      if (waitTime > 0) await this.sleep(waitTime);
    }
    
    if (counts.hour >= 3400) {  // Buffer below 3600
      const waitTime = 3600000 - (Date.now() - this.lastReset.hour);
      if (waitTime > 0) await this.sleep(waitTime);
    }
  }
}
```

#### 3.2.3 MCP Server Rate Limit Response

When rate limited, return MCP-compliant error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Rate limit exceeded",
    "data": {
      "retryAfter": 60,
      "limitType": "minute",
      "currentUsage": 120,
      "limit": 120
    }
  }
}
```

### 3.3 Error Handling

#### 3.3.1 FreeAgent to MCP Error Mapping

| FreeAgent HTTP | FreeAgent Meaning | MCP Error Code | MCP Message |
|----------------|-------------------|----------------|-------------|
| 400 | Bad Request | -32602 | Invalid params: {details} |
| 401 | Unauthorized | -32001 | Authentication required |
| 403 | Forbidden | -32002 | Insufficient permissions |
| 404 | Not Found | -32003 | Resource not found: {uri} |
| 422 | Unprocessable | -32602 | Validation failed: {details} |
| 429 | Rate Limited | -32000 | Rate limit exceeded |
| 500 | Server Error | -32603 | FreeAgent server error |
| 503 | Unavailable | -32603 | FreeAgent temporarily unavailable |

#### 3.3.2 Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Validation failed: Invoice must have at least one item",
    "data": {
      "freeagentCode": 422,
      "field": "invoice_items",
      "originalError": "Invoice items can't be blank"
    }
  }
}
```

#### 3.3.3 Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatuses: [429, 500, 502, 503, 504]
};

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!RETRY_CONFIG.retryableStatuses.includes(error.status)) {
        throw error;
      }
      
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

### 3.4 Transport Configuration

#### 3.4.1 Supported Transports

| Transport | Use Case | Configuration |
|-----------|----------|---------------|
| stdio | Local development, CLI tools | Default for local servers |
| HTTP/SSE | Web applications, cloud deployment | Recommended for production |
| Streamable HTTP | Long-running operations | Required for batch operations |

#### 3.4.2 HTTP Transport Setup

```typescript
import { MCPServer } from '@modelcontextprotocol/sdk/server';

const server = new MCPServer({
  name: 'freeagent-mcp-server',
  version: '1.0.0'
}, {
  capabilities: {
    resources: { subscribe: true, listChanged: true },
    tools: {},
    prompts: { listChanged: true }
  }
});

// Production deployment
server.run({
  transport: 'streamable-http',
  port: 3000,
  cors: {
    origins: ['https://your-app.com'],
    credentials: true
  }
});
```

---

## 4. Schema & Data Mapping

### 4.1 Design Principles

LLMs have limited context windows and benefit from focused, relevant data. The MCP server implements several strategies to optimize data for LLM consumption.

#### 4.1.1 Field Reduction

FreeAgent responses contain many fields irrelevant to typical LLM interactions. The server filters responses to essential fields.

**Contact: Full vs. LLM-Optimized**

| Full Response Fields | LLM-Optimized Fields |
|---------------------|---------------------|
| url, first_name, last_name, organisation_name, email, billing_email, phone_number, mobile, address1, address2, address3, town, region, postcode, country, contact_name_on_invoices, default_payment_terms_in_days, locale, account_balance, uses_contact_invoice_sequence, charge_sales_tax, sales_tax_registration_number, active_projects_count, direct_debit_mandate_state, status, is_cis_subcontractor, cis_deduction_rate, unique_tax_reference, subcontractor_verification_number, created_at, updated_at | id (extracted from url), name (computed), organisation_name, email, phone_number, account_balance, status, active_projects_count |

#### 4.1.2 Field Computation

```typescript
interface LLMContact {
  id: string;           // Extracted from URL
  name: string;         // Computed: "first_name last_name" or organisation_name
  organisation_name?: string;
  email: string;
  phone_number?: string;
  account_balance: number;  // Parsed to number
  status: 'Active' | 'Inactive';
  active_projects_count: number;
}

function transformContact(freeagentContact: any): LLMContact {
  const url = freeagentContact.url;
  const id = url.split('/').pop();
  
  const name = freeagentContact.first_name 
    ? `${freeagentContact.first_name} ${freeagentContact.last_name}`.trim()
    : freeagentContact.organisation_name;
  
  return {
    id,
    name,
    organisation_name: freeagentContact.organisation_name,
    email: freeagentContact.email,
    phone_number: freeagentContact.phone_number,
    account_balance: parseFloat(freeagentContact.account_balance),
    status: freeagentContact.status,
    active_projects_count: freeagentContact.active_projects_count
  };
}
```

### 4.2 Entity Schemas

#### 4.2.1 Contact Schema

```typescript
interface LLMContact {
  id: string;
  name: string;
  organisation_name?: string;
  email: string;
  phone_number?: string;
  account_balance: number;
  status: 'Active' | 'Inactive';
  active_projects_count: number;
  payment_terms_days: number;
}
```

#### 4.2.2 Invoice Schema

```typescript
interface LLMInvoice {
  id: string;
  reference: string;
  contact_id: string;
  contact_name: string;  // Denormalized for convenience
  dated_on: string;      // ISO date
  due_on: string;        // ISO date
  currency: string;
  net_value: number;
  tax_value: number;
  total_value: number;
  paid_value: number;
  due_value: number;
  status: 'Draft' | 'Open' | 'Overdue' | 'Paid' | 'Cancelled';
  days_overdue?: number;  // Computed if overdue
  items: LLMInvoiceItem[];
}

interface LLMInvoiceItem {
  description: string;
  item_type: string;
  quantity: number;
  price: number;
  sales_tax_rate: number;
  line_total: number;  // Computed
}
```

#### 4.2.3 Bank Transaction Schema

```typescript
interface LLMBankTransaction {
  id: string;
  bank_account_id: string;
  bank_account_name: string;  // Denormalized
  dated_on: string;
  amount: number;
  description: string;
  is_explained: boolean;
  explanation?: {
    category: string;
    matched_to?: string;  // Invoice/Bill reference
  };
  suggested_matches?: Array<{
    type: 'invoice' | 'bill';
    id: string;
    reference: string;
    amount: number;
    confidence: number;
  }>;
}
```

#### 4.2.4 Bill Schema

```typescript
interface LLMBill {
  id: string;
  contact_id: string;
  contact_name: string;
  reference: string;
  dated_on: string;
  due_on: string;
  currency: string;
  net_value: number;
  tax_value: number;
  total_value: number;
  paid_value: number;
  due_value: number;
  status: 'Draft' | 'Open' | 'Overdue' | 'Paid';
  category: string;
  project_id?: string;
  project_name?: string;
}
```

#### 4.2.5 Project Schema

```typescript
interface LLMProject {
  id: string;
  name: string;
  contact_id: string;
  contact_name: string;
  status: 'Active' | 'Completed' | 'Cancelled' | 'Hidden';
  budget: number;
  budget_units: 'Hours' | 'Days' | 'Monetary';
  hours_logged: number;
  invoiced_value: number;
  uninvoiced_value: number;
  costs: number;
  profit_margin?: number;  // Computed percentage
}
```

### 4.3 Pagination Handling

FreeAgent API defaults to 25 items per page (max 100). The MCP server handles pagination transparently.

```typescript
async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await freeagentRequest(endpoint, {
      ...params,
      page: page.toString(),
      per_page: '100'
    });
    
    results.push(...response.data);
    
    const totalCount = parseInt(response.headers['X-Total-Count'] || '0');
    hasMore = results.length < totalCount;
    page++;
    
    // Safety limit
    if (page > 50) break;
  }
  
  return results;
}
```

### 4.4 Data Sanitization

#### 4.4.1 PII Handling

```typescript
const SENSITIVE_FIELDS = [
  'sales_tax_registration_number',
  'unique_tax_reference',
  'subcontractor_verification_number',
  'billing_email'  // May differ from contact email
];

function sanitizeForLLM<T extends object>(data: T, allowedFields: string[]): Partial<T> {
  const sanitized: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in data && !SENSITIVE_FIELDS.includes(field)) {
      sanitized[field] = data[field];
    }
  }
  
  return sanitized;
}
```

#### 4.4.2 URL to ID Extraction

FreeAgent uses full URLs as identifiers. The MCP server extracts clean IDs:

```typescript
function extractId(url: string): string {
  // https://api.freeagent.com/v2/contacts/12345 → 12345
  const match = url.match(/\/(\d+)$/);
  return match ? match[1] : url;
}

function extractEntityType(url: string): string {
  // https://api.freeagent.com/v2/contacts/12345 → contacts
  const match = url.match(/\/v2\/(\w+)\/\d+$/);
  return match ? match[1] : 'unknown';
}
```

---

## 5. Security & Privacy

### 5.1 Permission Model

#### 5.1.1 FreeAgent Access Levels

The MCP server respects FreeAgent's permission hierarchy:

| Level | Name | Accessible Resources |
|-------|------|---------------------|
| 0 | No Access | None |
| 1 | Time | Timeslips |
| 2 | My Money | Expenses, Timeslips |
| 3 | Contacts & Projects | Contacts, Projects, Tasks, Timeslips |
| 4 | Invoices, Estimates & Files | Invoices, Estimates, Contacts, Projects |
| 5 | Bills | Bills + Level 4 |
| 6 | Banking | Bank Accounts, Transactions + Level 5 |
| 7 | Tax, Accounting & Users | Categories, Users, Tax + Level 6 |
| 8 | Full | All resources including Company settings |

#### 5.1.2 MCP Permission Scopes

```typescript
const PERMISSION_SCOPES = {
  'read:company': { minLevel: 8, resources: ['company'] },
  'read:contacts': { minLevel: 3, resources: ['contacts'] },
  'write:contacts': { minLevel: 3, tools: ['create_contact', 'update_contact', 'delete_contact'] },
  'read:invoices': { minLevel: 4, resources: ['invoices'] },
  'write:invoices': { minLevel: 4, tools: ['create_invoice', 'update_invoice', 'send_invoice', 'mark_invoice_paid'] },
  'read:bills': { minLevel: 5, resources: ['bills'] },
  'write:bills': { minLevel: 5, tools: ['create_bill', 'update_bill', 'delete_bill'] },
  'read:bank': { minLevel: 6, resources: ['bank_accounts', 'bank_transactions'] },
  'write:bank': { minLevel: 6, tools: ['explain_transaction', 'match_transaction'] },
  'read:projects': { minLevel: 3, resources: ['projects', 'tasks'] },
  'write:projects': { minLevel: 3, tools: ['create_project', 'update_project'] },
  'read:timeslips': { minLevel: 1, resources: ['timeslips'] },
  'write:timeslips': { minLevel: 1, tools: ['create_timeslip'] },
  'read:reports': { minLevel: 7, resources: ['profit_loss', 'balance_sheet', 'cashflow'] }
};
```

#### 5.1.3 Permission Enforcement

```typescript
async function enforcePermissions(
  userId: string,
  scope: string
): Promise<void> {
  const userProfile = await fetchUserProfile(userId);
  const requiredLevel = PERMISSION_SCOPES[scope]?.minLevel;
  
  if (userProfile.permission_level < requiredLevel) {
    throw new MCPError(
      -32002,
      `Insufficient permissions: requires level ${requiredLevel}, user has ${userProfile.permission_level}`
    );
  }
}
```

### 5.2 Data Transit Security

#### 5.2.1 Requirements

| Requirement | Implementation |
|-------------|----------------|
| Transport encryption | TLS 1.2+ required for all FreeAgent API calls |
| Token transmission | Bearer tokens in Authorization header only |
| Webhook validation | HMAC signature verification (if implementing webhooks) |
| Client authentication | OAuth2 with secure credential storage |

#### 5.2.2 HTTPS Enforcement

```typescript
const FREEAGENT_BASE_URL = process.env.FREEAGENT_ENVIRONMENT === 'production'
  ? 'https://api.freeagent.com/v2'
  : 'https://api.sandbox.freeagent.com/v2';

// Validate URL scheme
function validateEndpoint(url: string): void {
  if (!url.startsWith('https://')) {
    throw new Error('HTTPS required for FreeAgent API calls');
  }
}
```

### 5.3 Audit Logging

#### 5.3.1 Logged Events

| Event Type | Data Logged | Retention |
|------------|-------------|-----------|
| Authentication | User ID, timestamp, success/failure | 90 days |
| Tool invocation | Tool name, user ID, timestamp, parameters (sanitized) | 30 days |
| Resource access | Resource URI, user ID, timestamp | 30 days |
| Rate limit hit | User ID, timestamp, limit type | 30 days |
| Errors | Error code, user ID, timestamp, context | 90 days |

#### 5.3.2 Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event_type": "tool_invocation",
  "user_id": "user_12345",
  "session_id": "sess_abc123",
  "tool_name": "create_invoice",
  "parameters_hash": "sha256:abc123...",
  "result_status": "success",
  "duration_ms": 234,
  "freeagent_request_id": "req_xyz789"
}
```

### 5.4 Input Validation

#### 5.4.1 Validation Rules

```typescript
const VALIDATION_RULES = {
  contact_id: {
    pattern: /^\d+$/,
    maxLength: 20
  },
  amount: {
    min: -999999999.99,
    max: 999999999.99,
    precision: 2
  },
  date: {
    format: 'YYYY-MM-DD',
    minDate: '2000-01-01',
    maxDate: '+5y'  // 5 years in future
  },
  text_field: {
    maxLength: 1000,
    sanitize: true  // Strip HTML, control characters
  },
  currency: {
    pattern: /^[A-Z]{3}$/,
    allowedValues: ['GBP', 'USD', 'EUR', 'CAD', 'AUD', /* ... */]
  }
};
```

#### 5.4.2 Sanitization

```typescript
function sanitizeInput(value: string, fieldType: string): string {
  // Remove control characters
  let sanitized = value.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Strip HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Truncate to max length
  const maxLength = VALIDATION_RULES[fieldType]?.maxLength || 1000;
  return sanitized.slice(0, maxLength);
}
```

---

## 6. Success Metrics

### 6.1 Functional Criteria

#### 6.1.1 Core Functionality Checklist

| Category | Requirement | Acceptance Criteria |
|----------|-------------|---------------------|
| **Authentication** | OAuth2 flow completes | User can authorize and access data within 30 seconds |
| **Authentication** | Token refresh works | Expired tokens refresh automatically without user intervention |
| **Resources** | All listed resources accessible | Each resource URI returns valid data matching schema |
| **Resources** | Filtering works | Query parameters correctly filter results |
| **Tools** | Invoice creation | Can create invoice with items, validate against FreeAgent UI |
| **Tools** | Contact management | CRUD operations on contacts work correctly |
| **Tools** | Transaction explanation | Can categorize and match transactions |
| **Error Handling** | Rate limits handled | 429 responses trigger backoff, eventually succeed |
| **Error Handling** | Auth errors handled | 401/403 errors return clear MCP error messages |
| **Prompts** | Templates execute | All prompts return valid message arrays |

#### 6.1.2 Integration Test Suite

```typescript
describe('FreeAgent MCP Server', () => {
  describe('Authentication', () => {
    test('completes OAuth flow', async () => { /* ... */ });
    test('refreshes expired tokens', async () => { /* ... */ });
    test('handles invalid credentials', async () => { /* ... */ });
  });
  
  describe('Resources', () => {
    test('lists all contacts', async () => { /* ... */ });
    test('retrieves single contact by ID', async () => { /* ... */ });
    test('filters invoices by status', async () => { /* ... */ });
    test('handles pagination correctly', async () => { /* ... */ });
  });
  
  describe('Tools', () => {
    test('creates invoice with valid data', async () => { /* ... */ });
    test('rejects invalid invoice data', async () => { /* ... */ });
    test('explains bank transaction', async () => { /* ... */ });
  });
  
  describe('Error Handling', () => {
    test('retries on 429', async () => { /* ... */ });
    test('returns MCP error on 404', async () => { /* ... */ });
  });
});
```

### 6.2 Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Resource fetch latency | < 500ms p95 | Time from MCP request to response |
| Tool execution latency | < 2s p95 | Time from tool call to completion |
| Token refresh latency | < 1s p95 | Time to refresh expired token |
| Concurrent users | 100+ | Load test with 100 simultaneous users |
| Memory usage | < 256MB | Peak memory under normal load |
| Error rate | < 0.1% | Errors / total requests |

### 6.3 Monitoring & Observability

#### 6.3.1 Metrics to Track

```typescript
const METRICS = {
  // Request metrics
  'mcp.requests.total': Counter,
  'mcp.requests.duration': Histogram,
  'mcp.requests.errors': Counter,
  
  // FreeAgent API metrics
  'freeagent.requests.total': Counter,
  'freeagent.requests.duration': Histogram,
  'freeagent.requests.rate_limited': Counter,
  
  // Authentication metrics
  'auth.token_refreshes': Counter,
  'auth.failures': Counter,
  
  // Resource-specific metrics
  'resources.fetches': Counter({ labels: ['resource_type'] }),
  'tools.invocations': Counter({ labels: ['tool_name', 'status'] })
};
```

#### 6.3.2 Health Check Endpoint

```typescript
app.get('/health', async (req, res) => {
  const checks = {
    server: 'healthy',
    freeagent_api: await checkFreeAgentConnectivity(),
    token_store: await checkTokenStore(),
    rate_limits: getRateLimitStatus()
  };
  
  const allHealthy = Object.values(checks).every(
    status => status === 'healthy' || typeof status === 'object'
  );
  
  res.status(allHealthy ? 200 : 503).json(checks);
});
```

---

## 7. Appendices

### 7.1 FreeAgent API Reference

| Resource | Documentation |
|----------|---------------|
| API Introduction | https://dev.freeagent.com/docs/introduction |
| OAuth2 | https://dev.freeagent.com/docs/oauth |
| Contacts | https://dev.freeagent.com/docs/contacts |
| Invoices | https://dev.freeagent.com/docs/invoices |
| Bills | https://dev.freeagent.com/docs/bills |
| Bank Transactions | https://dev.freeagent.com/docs/bank_transactions |
| Projects | https://dev.freeagent.com/docs/projects |
| Timeslips | https://dev.freeagent.com/docs/timeslips |
| Categories | https://dev.freeagent.com/docs/categories |

### 7.2 MCP Specification Reference

| Resource | Documentation |
|----------|---------------|
| MCP Specification | https://modelcontextprotocol.io/specification |
| Resources | https://modelcontextprotocol.io/specification/server/resources |
| Tools | https://modelcontextprotocol.io/specification/server/tools |
| Prompts | https://modelcontextprotocol.io/specification/server/prompts |
| Python SDK | https://github.com/modelcontextprotocol/python-sdk |
| TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk |

### 7.3 Sample Implementation Structure

```
freeagent-mcp-server/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── auth/
│   │   ├── oauth.ts            # OAuth2 flow handling
│   │   └── token-store.ts      # Token persistence
│   ├── resources/
│   │   ├── contacts.ts
│   │   ├── invoices.ts
│   │   ├── bills.ts
│   │   ├── bank-transactions.ts
│   │   └── projects.ts
│   ├── tools/
│   │   ├── invoice-tools.ts
│   │   ├── contact-tools.ts
│   │   ├── bank-tools.ts
│   │   └── project-tools.ts
│   ├── prompts/
│   │   ├── expense-summary.ts
│   │   ├── invoice-creator.ts
│   │   └── cash-flow.ts
│   ├── utils/
│   │   ├── rate-limiter.ts
│   │   ├── error-handler.ts
│   │   └── data-transformer.ts
│   └── types/
│       ├── freeagent.ts        # FreeAgent API types
│       └── llm.ts              # LLM-optimized types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
└── README.md
```

### 7.4 Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol - standard for LLM-service integration |
| **Resource** | Read-only data exposed via URI, application-controlled |
| **Tool** | Executable operation, model-controlled |
| **Prompt** | Reusable instruction template, user-invoked |
| **OAuth2** | Authorization framework used by FreeAgent |
| **Access Level** | FreeAgent's permission hierarchy (0-8) |
| **Bank Explanation** | Categorizing a bank transaction in FreeAgent |
| **Timeslip** | Time tracking entry in FreeAgent |

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | January 2026 | Claude | Initial draft |

---

*This PRD is a living document and will be updated as requirements evolve.*
