import { format, parseISO, isValid } from 'date-fns';

/** Format a DB date string (yyyy-MM-dd) to display format (dd MMM yyyy) */
export function formatDisplayDate(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return String(dateStr);
    return format(d, 'dd MMM yyyy');
  } catch {
    return String(dateStr);
  }
}

/** Format a JS Date to DB storage string (yyyy-MM-dd) */
export function toDBDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Format a DB date string to month-year display (MMM yyyy) */
export function formatMonthYear(dateStr: string): string {
  try {
    const d = parseISO(dateStr + '-01');
    return format(d, 'MMMM yyyy');
  } catch {
    return dateStr;
  }
}

/** Today as a DB date string */
export function todayDB(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
