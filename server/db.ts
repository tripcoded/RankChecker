import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), process.env.DB_FILE || 'college_results.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    roll_no TEXT PRIMARY KEY,
    name TEXT,
    dob TEXT,
    branch TEXT,
    semester TEXT,
    total_marks REAL,
    percentage REAL,
    cgpa REAL,
    result_status TEXT DEFAULT 'pending',
    source_url TEXT,
    raw_result TEXT,
    scrape_error TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subject_marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_no TEXT,
    course_code TEXT,
    subject_name TEXT,
    external_theory REAL,
    internal_theory REAL,
    internal_practical REAL,
    external_practical REAL,
    marks REAL,
    total_credit REAL,
    grade_awarded TEXT,
    grade_point REAL,
    UNIQUE(roll_no, subject_name),
    FOREIGN KEY (roll_no) REFERENCES students(roll_no)
  );

  CREATE TABLE IF NOT EXISTS credentials (
    roll_no TEXT PRIMARY KEY,
    dob TEXT,
    is_scraped INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_credentials_scraped ON credentials(is_scraped);
`);

type TableInfo = { name: string };

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfo[];
  const exists = columns.some((item) => item.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

ensureColumn('students', 'result_status', "result_status TEXT DEFAULT 'pending'");
ensureColumn('students', 'source_url', 'source_url TEXT');
ensureColumn('students', 'raw_result', 'raw_result TEXT');
ensureColumn('students', 'scrape_error', 'scrape_error TEXT');
ensureColumn('subject_marks', 'course_code', 'course_code TEXT');
ensureColumn('subject_marks', 'external_theory', 'external_theory REAL');
ensureColumn('subject_marks', 'internal_theory', 'internal_theory REAL');
ensureColumn('subject_marks', 'internal_practical', 'internal_practical REAL');
ensureColumn('subject_marks', 'external_practical', 'external_practical REAL');
ensureColumn('subject_marks', 'total_credit', 'total_credit REAL');
ensureColumn('subject_marks', 'grade_awarded', 'grade_awarded TEXT');
ensureColumn('subject_marks', 'grade_point', 'grade_point REAL');

export default db;
