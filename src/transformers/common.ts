import { extractId, parseNumericString } from '../utils/validators.js';

export { extractId, parseNumericString };

export function computeDaysOverdue(dueDate: string, status: string): number | undefined {
  if (status !== 'Overdue') {
    return undefined;
  }

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : undefined;
}

export function computeFullName(firstName?: string, lastName?: string, organisationName?: string): string {
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  return organisationName ?? 'Unknown';
}

export function parseDate(dateString: string | undefined | null): string | undefined {
  if (!dateString) {
    return undefined;
  }
  // FreeAgent dates are already in YYYY-MM-DD format
  return dateString;
}

export function computeLineTotal(quantity: string, price: string): number {
  const qty = parseNumericString(quantity);
  const prc = parseNumericString(price);
  return Math.round(qty * prc * 100) / 100;
}
