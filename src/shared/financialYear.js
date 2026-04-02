const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const FINANCIAL_YEAR_OPTIONS = [
  "2023-2024",
  "2024-2025",
  "2025-2026",
  "2026-2027",
  "2027-2028",
];

export const normalizeOrderDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value.trim())) {
    return new Date(`${value.trim()}T12:00:00+05:30`);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getFinancialYear = (value) => {
  const date = normalizeOrderDate(value);
  if (!date) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const startYear = month >= 4 ? year : year - 1;

  return `${startYear}-${startYear + 1}`;
};
