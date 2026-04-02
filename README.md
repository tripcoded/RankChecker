# DDU Result Checker

Result portal for DDU (semester fixed to 3) with:
- server-side scraping
- Supabase/SQLite storage
- student login + rank from stored data

## How to Add Students for Scraping

Edit `server/scraper.ts` and fill:

```ts
const MANUAL_CREDENTIAL_BATCH = [
  ['2514670010038', '05-11-2006'],
  { rollNo: '2514670010038', dob: '05-11-2006' },
  { rollNo: '2514670010041', dob: '22-09-2005' },
];
```

On server start, these are auto-upserted to DB and auto-queued for scraping.

## Run Locally

1. `npm install`
2. Configure `.env.local` (Supabase keys if using Supabase)
3. `npm run dev`
4. Open `http://localhost:3000`

Use the same roll no + DOB to login after scrape is stored.

## API Endpoints

- `GET /api/health`
- `POST /api/login`
- `GET /api/student/:rollNo`
- `GET /api/scrape-status`

## Scraper Defaults

- `RESULT_PORTAL_URL=https://ddugorakhpur.com/result2023/searchresult_new.aspx`
- `RESULT_PORTAL_SEMESTER=3`

## Supabase Setup

1. Run [server/supabase-schema.sql](server/supabase-schema.sql) in Supabase SQL editor.
2. Set `SUPABASE_URL` and one key:
   - `SUPABASE_SERVICE_ROLE_KEY` (recommended)
   - or `SUPABASE_API_KEY`
   - or `SUPABASE_ANON_KEY` (requires permissive RLS policies)
