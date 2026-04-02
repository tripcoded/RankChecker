import db from './db.js';

export type CredentialRow = {
  roll_no: string;
  dob: string;
  is_scraped: number | boolean;
};

export type SubjectRow = {
  course_code?: string | null;
  subject_name: string;
  external_theory?: number | null;
  internal_theory?: number | null;
  internal_practical?: number | null;
  external_practical?: number | null;
  marks: number | null;
  total_credit?: number | null;
  grade_awarded?: string | null;
  grade_point?: number | null;
};

export type StudentRow = {
  roll_no: string;
  name: string | null;
  dob: string | null;
  branch: string | null;
  semester: string | null;
  total_marks: number | null;
  percentage: number | null;
  cgpa: number | null;
  sgpa?: number | null;
  result_status: string | null;
  source_url: string | null;
  raw_result: unknown;
  scrape_error: string | null;
  last_updated: string | null;
};

export type SaveScrapePayload = {
  rollNo: string;
  dob: string;
  status: 'success' | 'not_found' | 'result_pending';
  name: string;
  branch: string;
  semester: string;
  totalMarks: number | null;
  percentage: number | null;
  cgpa: number | null;
  sourceUrl: string;
  rawResult: Record<string, unknown>;
  scrapeError: string | null;
  subjects: SubjectRow[];
};

const SUPABASE_URL = process.env.SUPABASE_URL?.trim() || '';
const SUPABASE_API_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_API_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();
const HAS_PUBLISHABLE_KEY = SUPABASE_API_KEY.startsWith('sb_publishable_');
const USING_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_API_KEY);

if (HAS_PUBLISHABLE_KEY) {
  console.warn('Supabase publishable key detected. Ensure table policies allow server-side writes.');
}

function normalizeScrapedFlag(flag: number | boolean): boolean {
  return flag === true || flag === 1;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRawResult(rawResult: unknown): unknown {
  if (typeof rawResult !== 'string') {
    return rawResult;
  }
  try {
    return JSON.parse(rawResult);
  } catch {
    return rawResult;
  }
}

function extractSummaryFromRawResult(rawResult: unknown): { sgpa: number | null; cgpa: number | null; resultLabel: string | null } {
  const parsed = parseRawResult(rawResult);

  const summary = typeof parsed === 'object' && parsed !== null
    ? (parsed as { summary?: { sgpa?: unknown; cgpa?: unknown; resultLabel?: unknown } }).summary
    : undefined;
  const sgpaFromSummary = toNullableNumber(summary?.sgpa);
  const cgpaFromSummary = toNullableNumber(summary?.cgpa);
  const resultLabelFromSummary = typeof summary?.resultLabel === 'string'
    ? summary.resultLabel.trim().toUpperCase()
    : null;

  const rawText = typeof parsed === 'object' && parsed !== null
    ? String((parsed as { rawText?: unknown }).rawText || '')
    : (typeof parsed === 'string' ? parsed : '');
  const normalizedText = rawText.replace(/\s+/g, ' ').trim();
  const sgpaMatch = normalizedText.match(/semester\s*grade\s*point\s*average\s*\(sgpa\)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i)
    || normalizedText.match(/\bsgpa\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
  const cgpaMatch = normalizedText.match(/cumulative\s*grade\s*point\s*average\s*\(cgpa\)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i)
    || normalizedText.match(/\bcgpa\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
  const resultMatch = normalizedText.match(/\bresult\b[^A-Z0-9]{0,20}(INC|PASSED|PROMOTED|FAIL|FAILED)\b/i);

  return {
    sgpa: sgpaFromSummary ?? (sgpaMatch ? Number(sgpaMatch[1]) : null),
    cgpa: cgpaFromSummary ?? (cgpaMatch ? Number(cgpaMatch[1]) : null),
    resultLabel: resultLabelFromSummary ?? (resultMatch ? resultMatch[1].toUpperCase() : null),
  };
}

function isIncResult(rawResult: unknown): boolean {
  const { resultLabel } = extractSummaryFromRawResult(rawResult);
  return resultLabel === 'INC';
}

function normalizeStudentRow(student: StudentRow): StudentRow {
  const parsedRawResult = parseRawResult(student.raw_result);
  const { sgpa, cgpa } = extractSummaryFromRawResult(parsedRawResult);

  return {
    ...student,
    total_marks: toNullableNumber(student.total_marks),
    percentage: toNullableNumber(student.percentage),
    cgpa: cgpa ?? toNullableNumber(student.cgpa),
    sgpa,
    raw_result: parsedRawResult,
  };
}

function normalizeSubjectRow(subject: SubjectRow): SubjectRow {
  return {
    ...subject,
    marks: toNullableNumber(subject.marks),
    external_theory: toNullableNumber(subject.external_theory),
    internal_theory: toNullableNumber(subject.internal_theory),
    internal_practical: toNullableNumber(subject.internal_practical),
    external_practical: toNullableNumber(subject.external_practical),
    total_credit: toNullableNumber(subject.total_credit),
    grade_point: toNullableNumber(subject.grade_point),
  };
}

export function getStorageEngine(): 'sqlite' | 'supabase' {
  return USING_SUPABASE ? 'supabase' : 'sqlite';
}

export function scoreOf(student: Partial<StudentRow>): number {
  const sgpa = toNullableNumber(student.sgpa);
  if (sgpa !== null) {
    return sgpa;
  }

  const cgpa = toNullableNumber(student.cgpa);
  if (cgpa !== null) {
    return cgpa;
  }

  return 0;
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!USING_SUPABASE) {
    throw new Error('Supabase is not configured.');
  }

  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
  const headers = new Headers(init.headers || {});
  headers.set('apikey', SUPABASE_API_KEY);
  headers.set('Authorization', `Bearer ${SUPABASE_API_KEY}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text || response.statusText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null as T;
  }

  return await response.json() as T;
}

async function supabaseCount(path: string): Promise<number> {
  if (!USING_SUPABASE) {
    return 0;
  }

  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
  const headers = new Headers();
  headers.set('apikey', SUPABASE_API_KEY);
  headers.set('Authorization', `Bearer ${SUPABASE_API_KEY}`);
  headers.set('Prefer', 'count=exact');
  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase count failed (${response.status}): ${text || response.statusText}`);
  }

  const contentRange = response.headers.get('content-range');
  if (contentRange && contentRange.includes('/')) {
    const [, total] = contentRange.split('/');
    const parsed = Number(total);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const body = await response.json().catch(() => []);
  return Array.isArray(body) ? body.length : 0;
}

export async function findCredential(rollNo: string, dob: string): Promise<CredentialRow | null> {
  if (!USING_SUPABASE) {
    const row = db.prepare('SELECT * FROM credentials WHERE roll_no = ? AND dob = ?').get(rollNo, dob) as CredentialRow | undefined;
    return row || null;
  }

  const query = new URLSearchParams({
    select: '*',
    roll_no: `eq.${rollNo}`,
    dob: `eq.${dob}`,
    limit: '1',
  });
  const rows = await supabaseRequest<CredentialRow[]>(`credentials?${query.toString()}`);
  return rows[0] || null;
}

export async function upsertCredentials(rows: Array<{ rollNo: string; dob: string }>): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  if (!USING_SUPABASE) {
    const insertCredential = db.prepare(`
      INSERT INTO credentials (roll_no, dob, is_scraped)
      VALUES (?, ?, 0)
      ON CONFLICT(roll_no) DO UPDATE SET
        dob = excluded.dob
    `);

    const transaction = db.transaction((batch: Array<{ rollNo: string; dob: string }>) => {
      for (const row of batch) {
        insertCredential.run(row.rollNo, row.dob);
      }
    });

    transaction(rows);
    return rows.length;
  }

  const payload = rows.map((row) => ({
    roll_no: row.rollNo,
    dob: row.dob,
  }));

  await supabaseRequest(
    `credentials?on_conflict=roll_no`,
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    },
  );

  return rows.length;
}

export async function getPendingCredentials(limit = 2000): Promise<Array<{ roll_no: string; dob: string }>> {
  if (!USING_SUPABASE) {
    return db.prepare('SELECT roll_no, dob FROM credentials WHERE is_scraped = 0 LIMIT ?').all(limit) as Array<{ roll_no: string; dob: string }>;
  }

  const query = new URLSearchParams({
    select: 'roll_no,dob',
    is_scraped: 'eq.false',
    limit: String(limit),
  });
  return await supabaseRequest<Array<{ roll_no: string; dob: string }>>(`credentials?${query.toString()}`);
}

export async function getCredentialStats(): Promise<{ total: number; scraped: number }> {
  if (!USING_SUPABASE) {
    const total = db.prepare('SELECT COUNT(*) as count FROM credentials').get() as { count: number };
    const scraped = db.prepare('SELECT COUNT(*) as count FROM credentials WHERE is_scraped = 1').get() as { count: number };
    return { total: total.count, scraped: scraped.count };
  }

  const total = await supabaseCount('credentials?select=roll_no');
  const scraped = await supabaseCount('credentials?select=roll_no&is_scraped=eq.true');
  return { total, scraped };
}

export async function getResultStatusCounts(): Promise<{
  success: number;
  notFound: number;
  error: number;
  resultPending: number;
}> {
  if (!USING_SUPABASE) {
    const rows = db.prepare(`
      SELECT result_status, COUNT(*) as count
      FROM students
      GROUP BY result_status
    `).all() as Array<{ result_status: string | null; count: number }>;

    const counts = { success: 0, notFound: 0, error: 0, resultPending: 0 };
    for (const row of rows) {
      if (row.result_status === 'success') {
        counts.success = row.count;
      } else if (row.result_status === 'not_found') {
        counts.notFound = row.count;
      } else if (row.result_status === 'error') {
        counts.error = row.count;
      } else if (row.result_status === 'result_pending') {
        counts.resultPending = row.count;
      }
    }
    return counts;
  }

  const query = new URLSearchParams({
    select: 'result_status',
  });
  const rows = await supabaseRequest<Array<{ result_status: string | null }>>(`students?${query.toString()}`);
  const counts = { success: 0, notFound: 0, error: 0, resultPending: 0 };
  for (const row of rows) {
    if (row.result_status === 'success') {
      counts.success += 1;
    } else if (row.result_status === 'not_found') {
      counts.notFound += 1;
    } else if (row.result_status === 'error') {
      counts.error += 1;
    } else if (row.result_status === 'result_pending') {
      counts.resultPending += 1;
    }
  }
  return counts;
}

export type PendingResultRow = {
  roll_no: string;
  name: string | null;
  semester: string | null;
  result_status: string | null;
  scrape_error: string | null;
  last_updated: string | null;
};

type PendingResultCandidateRow = PendingResultRow & {
  raw_result: unknown;
};

export async function listPendingResults(limit = 2000): Promise<PendingResultRow[]> {
  const filterRows = (rows: PendingResultCandidateRow[]): PendingResultRow[] => rows
    .filter((row) => row.result_status === 'result_pending' || isIncResult(row.raw_result))
    .map(({ raw_result: _raw, ...rest }) => rest)
    .slice(0, limit);

  if (!USING_SUPABASE) {
    const rows = db.prepare(`
      SELECT roll_no, name, semester, result_status, scrape_error, last_updated, raw_result
      FROM students
      ORDER BY last_updated DESC
      LIMIT ?
    `).all(Math.max(limit, 5000)) as PendingResultCandidateRow[];
    return filterRows(rows);
  }

  const query = new URLSearchParams({
    select: 'roll_no,name,semester,result_status,scrape_error,last_updated,raw_result',
    order: 'last_updated.desc',
    limit: String(Math.max(limit, 5000)),
  });
  const rows = await supabaseRequest<PendingResultCandidateRow[]>(`students?${query.toString()}`);
  return filterRows(rows);
}

export async function listPendingResultCredentials(limit = 2000): Promise<Array<{ roll_no: string; dob: string }>> {
  const pendingRows = await listPendingResults(limit);
  const rollNos = Array.from(new Set(pendingRows.map((row) => row.roll_no).filter(Boolean)));
  if (rollNos.length === 0) {
    return [];
  }

  if (!USING_SUPABASE) {
    const placeholders = rollNos.map(() => '?').join(',');
    return db.prepare(`
      SELECT roll_no, dob
      FROM credentials
      WHERE roll_no IN (${placeholders})
      LIMIT ?
    `).all(...rollNos, limit) as Array<{ roll_no: string; dob: string }>;
  }

  const inValues = rollNos.map((value) => `"${value}"`).join(',');
  const query = new URLSearchParams({
    select: 'roll_no,dob',
    roll_no: `in.(${inValues})`,
    limit: String(limit),
  });
  return await supabaseRequest<Array<{ roll_no: string; dob: string }>>(`credentials?${query.toString()}`);
}

async function setCredentialScraped(rollNo: string, isScraped: boolean): Promise<void> {
  if (!USING_SUPABASE) {
    db.prepare('UPDATE credentials SET is_scraped = ? WHERE roll_no = ?').run(isScraped ? 1 : 0, rollNo);
    return;
  }

  const query = new URLSearchParams({ roll_no: `eq.${rollNo}` });
  await supabaseRequest(`credentials?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ is_scraped: isScraped }),
  });
}

export async function saveScrapeResult(payload: SaveScrapePayload): Promise<void> {
  const studentData = {
    roll_no: payload.rollNo,
    name: payload.name,
    dob: payload.dob,
    branch: payload.branch,
    semester: payload.semester,
    total_marks: payload.totalMarks,
    percentage: payload.percentage,
    cgpa: payload.cgpa,
    result_status: payload.status,
    source_url: payload.sourceUrl,
    raw_result: payload.rawResult,
    scrape_error: payload.scrapeError,
  };

  if (!USING_SUPABASE) {
    const upsertStudent = db.prepare(`
      INSERT INTO students (
        roll_no, name, dob, branch, semester, total_marks, percentage, cgpa,
        result_status, source_url, raw_result, scrape_error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(roll_no) DO UPDATE SET
        name = excluded.name,
        dob = excluded.dob,
        branch = excluded.branch,
        semester = excluded.semester,
        total_marks = excluded.total_marks,
        percentage = excluded.percentage,
        cgpa = excluded.cgpa,
        result_status = excluded.result_status,
        source_url = excluded.source_url,
        raw_result = excluded.raw_result,
        scrape_error = excluded.scrape_error,
        last_updated = CURRENT_TIMESTAMP
    `);

    upsertStudent.run(
      studentData.roll_no,
      studentData.name,
      studentData.dob,
      studentData.branch,
      studentData.semester,
      studentData.total_marks,
      studentData.percentage,
      studentData.cgpa,
      studentData.result_status,
      studentData.source_url,
      JSON.stringify(studentData.raw_result),
      studentData.scrape_error,
    );

    db.prepare('DELETE FROM subject_marks WHERE roll_no = ?').run(payload.rollNo);
    const insertSubject = db.prepare(`
      INSERT INTO subject_marks (
        roll_no, course_code, subject_name, external_theory, internal_theory,
        internal_practical, external_practical, marks, total_credit, grade_awarded, grade_point
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const subject of payload.subjects) {
      insertSubject.run(
        payload.rollNo,
        subject.course_code || null,
        subject.subject_name,
        subject.external_theory ?? null,
        subject.internal_theory ?? null,
        subject.internal_practical ?? null,
        subject.external_practical ?? null,
        subject.marks,
        subject.total_credit ?? null,
        subject.grade_awarded || null,
        subject.grade_point ?? null,
      );
    }

    await setCredentialScraped(payload.rollNo, true);
    return;
  }

  await supabaseRequest(
    'students?on_conflict=roll_no',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([studentData]),
    },
  );

  const deleteQuery = new URLSearchParams({ roll_no: `eq.${payload.rollNo}` });
  await supabaseRequest(`subject_marks?${deleteQuery.toString()}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });

  if (payload.subjects.length > 0) {
    const rows = payload.subjects.map((subject) => ({
      roll_no: payload.rollNo,
      course_code: subject.course_code || null,
      subject_name: subject.subject_name,
      external_theory: subject.external_theory ?? null,
      internal_theory: subject.internal_theory ?? null,
      internal_practical: subject.internal_practical ?? null,
      external_practical: subject.external_practical ?? null,
      marks: subject.marks,
      total_credit: subject.total_credit ?? null,
      grade_awarded: subject.grade_awarded || null,
      grade_point: subject.grade_point ?? null,
    }));
    await supabaseRequest('subject_marks', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
    });
  }

  await setCredentialScraped(payload.rollNo, true);
}

export async function saveScrapeError(rollNo: string, dob: string, semester: string, sourceUrl: string, message: string): Promise<void> {
  if (!USING_SUPABASE) {
    db.prepare(`
      INSERT INTO students (roll_no, dob, semester, result_status, source_url, scrape_error)
      VALUES (?, ?, ?, 'error', ?, ?)
      ON CONFLICT(roll_no) DO UPDATE SET
        dob = excluded.dob,
        semester = excluded.semester,
        result_status = excluded.result_status,
        source_url = excluded.source_url,
        scrape_error = excluded.scrape_error,
        last_updated = CURRENT_TIMESTAMP
    `).run(rollNo, dob, semester, sourceUrl, message);

    await setCredentialScraped(rollNo, false);
    return;
  }

  const row = {
    roll_no: rollNo,
    dob,
    semester,
    result_status: 'error',
    source_url: sourceUrl,
    scrape_error: message,
  };

  await supabaseRequest('students?on_conflict=roll_no', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([row]),
  });

  await setCredentialScraped(rollNo, false);
}

export async function getStudentWithSubjects(rollNo: string): Promise<{ student: StudentRow; subjects: SubjectRow[] } | null> {
  if (!USING_SUPABASE) {
    const student = db.prepare('SELECT * FROM students WHERE roll_no = ?').get(rollNo) as StudentRow | undefined;
    if (!student) {
      return null;
    }
    const subjects = db.prepare(`
      SELECT
        course_code, subject_name, external_theory, internal_theory, internal_practical,
        external_practical, marks, total_credit, grade_awarded, grade_point
      FROM subject_marks
      WHERE roll_no = ?
      ORDER BY id ASC
    `).all(rollNo) as SubjectRow[];
    return {
      student: normalizeStudentRow(student),
      subjects: subjects.map(normalizeSubjectRow),
    };
  }

  const studentQuery = new URLSearchParams({
    select: '*',
    roll_no: `eq.${rollNo}`,
    limit: '1',
  });
  const students = await supabaseRequest<StudentRow[]>(`students?${studentQuery.toString()}`);
  const student = students[0];
  if (!student) {
    return null;
  }

  const subjectQuery = new URLSearchParams({
    select: 'course_code,subject_name,external_theory,internal_theory,internal_practical,external_practical,marks,total_credit,grade_awarded,grade_point',
    roll_no: `eq.${rollNo}`,
    order: 'id.asc',
  });
  const subjects = await supabaseRequest<SubjectRow[]>(`subject_marks?${subjectQuery.toString()}`);
  return {
    student: normalizeStudentRow(student),
    subjects: subjects.map(normalizeSubjectRow),
  };
}

export async function listSuccessfulStudents(semester?: string | null): Promise<StudentRow[]> {
  const normalizeAndFilter = (rows: StudentRow[]) => rows
    .map(normalizeStudentRow)
    .filter((row) => !isIncResult(row.raw_result));

  if (!USING_SUPABASE) {
    if (!semester) {
      return normalizeAndFilter(db.prepare(`
        SELECT roll_no, name, semester, total_marks, percentage, cgpa, raw_result, result_status
        FROM students
        WHERE result_status = 'success'
      `).all() as StudentRow[]);
    }

    return normalizeAndFilter(db.prepare(`
      SELECT roll_no, name, semester, total_marks, percentage, cgpa, raw_result, result_status
      FROM students
      WHERE result_status = 'success' AND semester = ?
    `).all(semester) as StudentRow[]);
  }

  const query = new URLSearchParams({
    select: 'roll_no,name,semester,total_marks,percentage,cgpa,raw_result,result_status',
    result_status: 'eq.success',
  });
  if (semester) {
    query.set('semester', `eq.${semester}`);
  }
  const rows = await supabaseRequest<StudentRow[]>(`students?${query.toString()}`);
  return normalizeAndFilter(rows);
}

export function isCredentialScraped(credential: CredentialRow): boolean {
  return normalizeScrapedFlag(credential.is_scraped);
}
