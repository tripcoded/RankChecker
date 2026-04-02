const DD_MM_YYYY = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
const YYYY_MM_DD = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0) {
    return null;
  }

  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const millisPerDay = 86400000;
  return new Date(excelEpoch.getTime() + Math.floor(serial) * millisPerDay);
}

export function normalizeRollNo(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const cleaned = String(value).trim().replace(/\s+/g, '').toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeDob(value: unknown): string | null {
  if (typeof value === 'number') {
    const date = excelSerialToDate(value);
    if (!date) {
      return null;
    }
    return `${pad(date.getUTCDate())}-${pad(date.getUTCMonth() + 1)}-${date.getUTCFullYear()}`;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const ddMatch = trimmed.match(DD_MM_YYYY);
  if (ddMatch) {
    return `${ddMatch[1]}-${ddMatch[2]}-${ddMatch[3]}`;
  }

  const yyMatch = trimmed.match(YYYY_MM_DD);
  if (yyMatch) {
    return `${yyMatch[3]}-${yyMatch[2]}-${yyMatch[1]}`;
  }

  const asDate = new Date(trimmed);
  if (!Number.isNaN(asDate.getTime())) {
    return `${pad(asDate.getDate())}-${pad(asDate.getMonth() + 1)}-${asDate.getFullYear()}`;
  }

  return null;
}

export function toPortalDob(normalizedDob: string): string | null {
  const match = normalizedDob.match(DD_MM_YYYY);
  if (!match) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}
