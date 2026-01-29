# FreeAgent MCP Server

MCP (Model Context Protocol) server for the FreeAgent accounting API. Enables LLMs to securely access and manage accounting data including contacts, invoices, bills, bank transactions, and more.

## Prerequisites

- Node.js 24 LTS or later
- A FreeAgent account with API access
- FreeAgent API credentials (Client ID and Secret)

## Installation

### From npm (recommended)

```bash
npm install -g @stupidcodefactory/freeagent-mcp-server
```

### From source

```bash
git clone https://github.com/StupidCodeFactory/freeagent-mcp.git
cd freeagent-mcp
npm install
npm run build
```

## Configuration

### 1. Get FreeAgent API Credentials

1. Log in to your FreeAgent account
2. Go to **Settings** → **Integrations** → **Developer Dashboard**
3. Create a new app to get your Client ID and Client Secret
4. Set the redirect URI to `http://localhost:3000/callback`

### 2. Set Environment Variables

Create a `.env` file or export the following environment variables:

```bash
export FREEAGENT_CLIENT_ID="your_client_id"
export FREEAGENT_CLIENT_SECRET="your_client_secret"
export FREEAGENT_REDIRECT_URI="http://localhost:3000/callback"
export FREEAGENT_ENVIRONMENT="sandbox"  # or "production"
```

Optional:
```bash
export TOKEN_ENCRYPTION_KEY="$(openssl rand -hex 32)"  # For persistent token storage
export LOG_LEVEL="info"
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "freeagent": {
      "command": "npx",
      "args": ["@stupidcodefactory/freeagent-mcp-server"],
      "env": {
        "FREEAGENT_CLIENT_ID": "your_client_id",
        "FREEAGENT_CLIENT_SECRET": "your_client_secret",
        "FREEAGENT_REDIRECT_URI": "http://localhost:3000/callback",
        "FREEAGENT_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

Or if installed from source:

```json
{
  "mcpServers": {
    "freeagent": {
      "command": "node",
      "args": ["/path/to/freeagent-mcp/dist/index.js"],
      "env": {
        "FREEAGENT_CLIENT_ID": "your_client_id",
        "FREEAGENT_CLIENT_SECRET": "your_client_secret",
        "FREEAGENT_REDIRECT_URI": "http://localhost:3000/callback",
        "FREEAGENT_ENVIRONMENT": "sandbox"
      }
    }
  }
}
```

## Authentication

On first use, the server will provide an authorization URL. Visit this URL to authorize the app with your FreeAgent account. After authorization, tokens are stored and refreshed automatically.

## Available Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Company | `freeagent://company` | Company profile and settings |
| Contacts | `freeagent://contacts` | Clients and suppliers |
| Invoices | `freeagent://invoices` | Sales invoices |
| Bills | `freeagent://bills` | Supplier bills |
| Bank Accounts | `freeagent://bank_accounts` | Bank account list |
| Bank Transactions | `freeagent://bank_transactions?bank_account={id}` | Transaction feed |
| Projects | `freeagent://projects` | Projects |
| Timeslips | `freeagent://timeslips` | Time entries |
| Expenses | `freeagent://expenses` | Expense claims |
| Categories | `freeagent://categories` | Account categories |
| Users | `freeagent://users` | Team members |

## Available Tools

### Invoices
- `create_invoice` - Create a new invoice
- `update_invoice` - Update a draft invoice
- `send_invoice` - Email invoice to contact
- `mark_invoice_sent` - Mark as sent without emailing
- `mark_invoice_paid` - Record payment
- `delete_invoice` - Delete draft invoice

### Contacts
- `create_contact` - Add new client/supplier
- `update_contact` - Update contact details
- `delete_contact` - Remove contact

### Bank Transactions
- `explain_transaction` - Categorize transaction
- `match_transaction_to_invoice` - Match to invoice payment
- `match_transaction_to_bill` - Match to bill payment
- `split_transaction` - Split across categories
- `unexplain_transaction` - Remove explanation

### Bills
- `create_bill` - Record supplier bill
- `update_bill` - Modify bill
- `delete_bill` - Remove bill

### Projects
- `create_project` - Create project
- `update_project` - Update project
- `create_task` - Add task to project
- `create_timeslip` - Log time entry

### Queries
- `list_unpaid_invoices` - Get overdue/open invoices
- `get_bank_summary` - Aggregate balances
- `search_transactions` - Search by description
- `get_unexplained_transactions` - List unexplained transactions

## Available Prompts

- `monthly_expense_summary` - Categorized expense report
- `invoice_from_description` - Create invoice from natural language
- `cash_flow_forecast` - Project cash position (30/60/90 days)
- `overdue_invoice_followup` - Draft reminder emails
- `transaction_categorization` - Suggest categories for unexplained transactions
- `project_profitability` - Analyze project margins
- `quarterly_tax_estimate` - Estimate tax liability

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## License

MIT
