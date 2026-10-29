/**
 * Date utility functions to enforce DD-MM-YYYY standard across the application
 */

/**
 * Formats any date input (YYYY-MM-DD, ISO string, timestamp, or Date) to 'DD-MM-YYYY'
 * e.g., '2026-09-29' -> '29-09-2026'
 */
export function formatDateToDDMMYYYY(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';

  const str = String(dateInput).trim();
  if (!str) return '';

  // If already in DD-MM-YYYY (e.g. 29-09-2026)
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // If in YYYY-MM-DD format (e.g. 2026-09-29 or 2026-09-29T12:00:00Z)
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // If in DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${day}-${month}-${year}`;
  }

  // Fallback using Date object
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

/**
 * Returns today's date formatted as DD-MM-YYYY (e.g. '29-09-2026')
 */
export function getTodayDDMMYYYY(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Converts any date format to YYYY-MM-DD for HTML <input type="date"> value
 */
export function toInputDateFormat(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';

  const str = String(dateInput).trim();
  if (!str) return '';

  // If in DD-MM-YYYY format
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // If already in YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return '';
}

/**
 * Safely parses any date string (DD-MM-YYYY or YYYY-MM-DD) into a JavaScript Date
 */
export function parseDate(dateInput?: string | null): Date | null {
  if (!dateInput) return null;
  const s = String(dateInput).trim();
  if (!s) return null;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }

  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Checks if a date has passed (overdue)
 */
export function isDateOverdue(dateInput?: string | null): boolean {
  if (!dateInput) return false;
  const d = parseDate(dateInput);
  if (!d) return false;
  // End of that date's day: 23:59:59.999
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

/**
 * Calculates due date by adding N days to an issue date string (returns YYYY-MM-DD for date input)
 */
export function addDaysToDate(dateInput?: string | null, days: number = 30): string {
  const base = parseDate(dateInput) || new Date();
  const res = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return res.toISOString().slice(0, 10);
}
