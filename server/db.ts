import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), 'college_results.db');
const db = new Database(dbPath);

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
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subject_marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_no TEXT,
    subject_name TEXT,
    marks REAL,
    FOREIGN KEY (roll_no) REFERENCES students(roll_no)
  );

  CREATE TABLE IF NOT EXISTS credentials (
    roll_no TEXT PRIMARY KEY,
    dob TEXT,
    is_scraped INTEGER DEFAULT 0
  );
`);

export default db;
