import db from './db.js';
import type { CredentialRow, StudentRow, SubjectRow } from './repository.js';

type SubjectMarkDbRow = SubjectRow & {
  roll_no: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL?.trim() || '';
const SUPABASE_API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

if (!SUPABASE_URL || !SUPABASE_API_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

async function supabaseRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
  const headers = new Headers({
    apikey: SUPABASE_API_KEY,
    Authorization: `Bearer ${SUPABASE_API_KEY}`,
  });

  const options: RequestInit = { method, headers };
  if (body) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${method} failed (${response.status}): ${text}`);
  }

  if (response.status === 204 || method === 'DELETE') {
    return null as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null as T;
  }

  return await response.json() as T;
}

async function migrateCredentials() {
  console.log('📋 Migrating credentials...');
  const credentials = db.prepare('SELECT * FROM credentials').all() as CredentialRow[];
  
  if (credentials.length === 0) {
    console.log('  ✓ No credentials to migrate');
    return;
  }

  const payload = credentials.map((row) => ({
    roll_no: row.roll_no,
    dob: row.dob,
    is_scraped: Boolean(row.is_scraped),
  }));

  await supabaseRequest(
    'POST',
    'credentials?on_conflict=roll_no',
    payload
  );

  console.log(`  ✓ Migrated ${credentials.length} credentials`);
}

async function migrateStudents() {
  console.log('📚 Migrating students...');
  const students = db.prepare('SELECT * FROM students').all() as StudentRow[];
  
  if (students.length === 0) {
    console.log('  ✓ No students to migrate');
    return;
  }

  const payload = students.map((row) => ({
    roll_no: row.roll_no,
    name: row.name,
    dob: row.dob,
    branch: row.branch,
    semester: row.semester,
    total_marks: row.total_marks,
    percentage: row.percentage,
    cgpa: row.cgpa,
    result_status: row.result_status || 'pending',
    source_url: row.source_url,
    raw_result: typeof row.raw_result === 'string' 
      ? (() => {
          try {
            return JSON.parse(row.raw_result);
          } catch {
            return row.raw_result;
          }
        })()
      : row.raw_result,
    scrape_error: row.scrape_error,
    last_updated: row.last_updated || new Date().toISOString(),
  }));

  // Batch insert (Supabase has limits, typically 1000 per request)
  const batchSize = 500;
  for (let i = 0; i < payload.length; i += batchSize) {
    const batch = payload.slice(i, i + batchSize);
    await supabaseRequest(
      'POST',
      'students?on_conflict=roll_no',
      batch
    );
    console.log(`  ✓ Migrated students batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(payload.length / batchSize)}`);
  }

  console.log(`  ✓ Total students migrated: ${students.length}`);
}

async function migrateSubjectMarks() {
  console.log('📊 Migrating subject marks...');
  const subjects = db.prepare('SELECT * FROM subject_marks').all() as SubjectMarkDbRow[];
  
  if (subjects.length === 0) {
    console.log('  ✓ No subject marks to migrate');
    return;
  }

  const payload = subjects.map((row) => ({
    roll_no: row.roll_no,
    course_code: row.course_code,
    subject_name: row.subject_name,
    external_theory: row.external_theory,
    internal_theory: row.internal_theory,
    internal_practical: row.internal_practical,
    external_practical: row.external_practical,
    marks: row.marks,
    total_credit: row.total_credit,
    grade_awarded: row.grade_awarded,
    grade_point: row.grade_point,
  }));

  // Batch insert
  const batchSize = 500;
  for (let i = 0; i < payload.length; i += batchSize) {
    const batch = payload.slice(i, i + batchSize);
    await supabaseRequest(
      'POST',
      'subject_marks',
      batch
    );
    console.log(`  ✓ Migrated marks batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(payload.length / batchSize)}`);
  }

  console.log(`  ✓ Total subject marks migrated: ${subjects.length}`);
}

async function main() {
  try {
    console.log('🚀 Starting SQLite to Supabase migration...\n');
    
    // Get initial counts
    const credCount = db.prepare('SELECT COUNT(*) as count FROM credentials').get() as { count: number };
    const studCount = db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number };
    const subjCount = db.prepare('SELECT COUNT(*) as count FROM subject_marks').get() as { count: number };

    console.log(`Found: ${credCount.count} credentials, ${studCount.count} students, ${subjCount.count} subject marks\n`);

    // Migrate
    await migrateCredentials();
    await migrateStudents();
    await migrateSubjectMarks();

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
