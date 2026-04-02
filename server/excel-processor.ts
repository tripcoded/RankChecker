import * as XLSX from 'xlsx';
import db from './db.js';

export function processExcelCredentials(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const insertCredential = db.prepare(`
    INSERT INTO credentials (roll_no, dob)
    VALUES (?, ?)
    ON CONFLICT(roll_no) DO UPDATE SET
      dob = excluded.dob
  `);

  const transaction = db.transaction((rows: any[]) => {
    for (const row of rows) {
      // Assuming columns are 'Roll No' and 'DOB'
      const rollNo = row['Roll No'] || row['rollNo'] || row['roll_no'];
      const dob = row['DOB'] || row['dob'];
      if (rollNo && dob) {
        insertCredential.run(rollNo.toString(), dob.toString());
      }
    }
  });

  transaction(data);
  return { count: data.length };
}
