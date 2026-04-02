create table if not exists public.credentials (
  roll_no text primary key,
  dob text not null,
  is_scraped boolean not null default false
);

create table if not exists public.students (
  roll_no text primary key,
  name text,
  dob text,
  branch text,
  semester text,
  total_marks numeric,
  percentage numeric,
  cgpa numeric,
  result_status text default 'pending',
  source_url text,
  raw_result jsonb,
  scrape_error text,
  last_updated timestamptz not null default now()
);

create table if not exists public.subject_marks (
  id bigint generated always as identity primary key,
  roll_no text not null references public.students(roll_no) on delete cascade,
  course_code text,
  subject_name text not null,
  external_theory numeric,
  internal_theory numeric,
  internal_practical numeric,
  external_practical numeric,
  marks numeric,
  total_credit numeric,
  grade_awarded text,
  grade_point numeric,
  unique (roll_no, course_code, subject_name)
);

create index if not exists idx_credentials_scraped on public.credentials(is_scraped);
create index if not exists idx_students_semester_status on public.students(semester, result_status);
