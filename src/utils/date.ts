const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function assertDateOnly(date: string) {
  if (!DATE_ONLY_REGEX.test(date)) {
    throw new Error("Date must be in YYYY-MM-DD format");
  }
}

export function todayLocalDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function assertNotPastDate(date: string) {
  assertDateOnly(date);
  if (date < todayLocalDateOnly()) {
    throw new Error("Date cannot be in the past");
  }
}

export function dateToUtcStart(date: string) {
  assertDateOnly(date);
  return new Date(`${date}T00:00:00.000Z`);
}

export function dateRangeUtc(date: string) {
  const start = dateToUtcStart(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function toDateOnlyString(date: Date) {
  return date.toISOString().slice(0, 10);
}
