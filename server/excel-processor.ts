import * as XLSXModule from 'xlsx';
import { normalizeDob, normalizeRollNo } from './normalizers.js';
import { upsertCredentials } from './repository.js';

const XLSX = (XLSXModule as any).default ?? XLSXModule;

function pickField(row: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (candidates.some((candidate) => normalizedKey === candidate || normalizedKey.includes(candidate))) {
      return value;
    }
  }
  return undefined;
}

export async function processExcelCredentials(filePath: string) {
  if (typeof XLSX.readFile !== 'function') {
    throw new Error('XLSX parser is not initialized correctly on server.');
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: true }) as Array<Record<string, unknown>>;
  const normalizedRows: Array<{ rollNo: string; dob: string }> = [];

  for (const row of data) {
    const rollNoRaw = pickField(row, ['rollno', 'rollnumber', 'roll', 'enrollmentno', 'enrollment']);
    const dobRaw = pickField(row, ['dob', 'dateofbirth', 'birthdate']);
    const rollNo = normalizeRollNo(rollNoRaw);
    const dob = normalizeDob(dobRaw);

    if (rollNo && dob) {
      normalizedRows.push({ rollNo, dob });
    }
  }

  const count = await upsertCredentials(normalizedRows);
  return { count };
}
