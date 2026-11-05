# RankChecker - DDU Result Portal

RankChecker is a full-stack student result and ranking portal for Deen Dayal Upadhyay Gorakhpur University. It uses server-side browser automation to collect Semester 3 results, stores them in SQLite or Supabase, and presents student dashboards and department/batch rankings.

## Features

- Student login using roll number and date of birth
- Puppeteer-based result scraping from the official result portal
- Student dashboard with subject-wise marks and SGPA/CGPA
- Department-wide and batch-wide SGPA and CGPA rankings
- Batch lookup by roll-number prefix for IT, CSE, ECE, and Mechanical
- Automatic startup queue for a configured student credential batch
- Automatic retries, configurable delays, and scrape status reporting
- Local SQLite storage with no cloud setup required
- Optional Supabase storage for shared or hosted deployments
- Pending, not-found, failed, and partially declared result states

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| UI | Motion, Lucide React, Recharts |
| Backend | Node.js, Express |
| Automation | Puppeteer |
| Local database | SQLite through better-sqlite3 |
| Cloud database | Supabase |
| Data processing | TypeScript, XLSX |

## Project Structure

```text
RankChecker/
├── server.ts                 # Express server, API routes, and scrape queue
├── server/
│   ├── scraper.ts            # Result portal automation and manual student batch
│   ├── repository.ts         # Supabase and SQLite data access
│   ├── db.ts                 # Local SQLite schema and connection
│   ├── batch.ts              # Batch prefixes and batch names
│   ├── normalizers.ts        # Roll number and DOB normalization
│   ├── excel-processor.ts    # Excel credential import support
│   ├── migrate-to-supabase.ts
│   └── supabase-schema.sql   # Supabase database schema
├── src/
│   ├── App.tsx               # Frontend route state
│   └── components/
│       ├── Login.tsx         # Student login
│       ├── Dashboard.tsx     # Student result dashboard
│       └── RankList.tsx      # Department and batch rankings
├── .env.example              # Environment variable reference
├── vite.config.ts
└── package.json
```

## Prerequisites

- Node.js 22.6 or newer (required for direct TypeScript execution by `npm start`)
- npm 10 or newer
- Internet access to the configured university result portal
- Chromium support supplied by Puppeteer

## Local Setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Review the values in `.env.local`. The SQLite database is selected by default when Supabase variables are not configured.

4. Start the development server:

   ```powershell
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

Vite's middleware runs with Express in development mode, so the frontend and API are served from the same port.

## Configuration

Copy `.env.example` to `.env.local` and adjust any required values.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Express server port |
| `RESULT_PORTAL_URL` | DDU Semester 3 result URL | Primary result portal URL |
| `RESULT_PORTAL_URLS` | Alternate DDU result URL | Comma-separated fallback portal URLs |
| `RESULT_PORTAL_SEMESTER` | `3` | Semester sent to the portal and displayed in records |
| `SCRAPE_MAX_RETRIES` | `3` | Maximum attempts for retryable scraping errors |
| `SCRAPE_DELAY_MS` | `3000` | Delay between queued scrape jobs |
| `SCRAPE_RETRY_DELAY_MS` | `15000` | Base delay used when retrying a scrape |
| `SCRAPER_NAVIGATION_TIMEOUT_MS` | `60000` | Browser navigation timeout |
| `SCRAPER_SELECTOR_TIMEOUT_MS` | `20000` | Result-page selector timeout |
| `SCRAPER_HEADLESS` | `true` | Set to `false` to display the browser during debugging |
| `DB_FILE` | `college_results.db` | SQLite database path, relative to the project directory |
| `RESCRAPE_ON_LOGIN` | unset | Set to `true` to re-run a scrape whenever a student logs in |
| `SUPABASE_URL` | unset | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | unset | Preferred server-side Supabase key |
| `SUPABASE_API_KEY` | unset | Alternative Supabase API key |
| `SUPABASE_ANON_KEY` | unset | Alternative key when row-level policies allow required access |

## Adding Students for Scraping

Edit the `MANUAL_CREDENTIAL_BATCH` array in `server/scraper.ts`.

```ts
const MANUAL_CREDENTIAL_BATCH: ManualCredentialInput[] = [
  { rollNo: '2514670010038', dob: '05-11-2006' },
  { rollNo: '2514670010041', dob: '22-09-2005' },
];
```

Entries may also use tuple form:

```ts
const MANUAL_CREDENTIAL_BATCH: ManualCredentialInput[] = [
  ['2514670010038', '05-11-2006'],
  ['2514670010041', '22-09-2005'],
];
```

On startup, the server:

1. Adds or updates each credential.
2. Skips credentials whose results have already been scraped successfully.
3. Queues unscraped credentials.
4. Processes the queue with retry and delay handling.

Use the exact roll number and `DD-MM-YYYY` date format accepted by the portal.

> Security note: roll numbers and dates of birth are personal data in some contexts. Do not commit real student credentials, `.env.local`, service-role keys, database files, or exported result data to a public repository.

## Storage

### SQLite (default)

If no complete Supabase configuration is present, the application uses `college_results.db` automatically. The server creates or upgrades the required tables on startup.

The SQLite database, journal, and WAL files should be included in backups when keeping persistent local data.

### Supabase

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Execute [`server/supabase-schema.sql`](server/supabase-schema.sql).
4. Add the project URL and one server-access key to `.env.local`:

   ```dotenv
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

The repository selects Supabase when `SUPABASE_URL` and at least one supported key are present. For production, use `SUPABASE_SERVICE_ROLE_KEY` only on the server and never expose it through frontend variables or browser code.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express with Vite middleware |
| `npm run build` | Create the production frontend bundle in `dist/` |
| `npm run preview` | Preview the built Vite application |
| `npm run lint` | Run the TypeScript type-checker |
| `npm start` | Start the Node server entry file |

For a production run:

```powershell
npm run build
$env:NODE_ENV="production"
npm start
```

In production, Express serves the files generated in `dist/`.

## API Reference

### Health

```text
GET /api/health
```

Returns server health and the active storage engine.

### Authentication and results

```text
POST /api/login
Content-Type: application/json

{
  "rollNo": "2514670010038",
  "dob": "05-11-2006"
}
```

Validates a credential against the configured repository and queues scraping if required.

```text
GET /api/student/:rollNo
```

Returns the normalized student record, subject marks, result status, and department/batch ranks.

### Rankings

```text
GET /api/rankings?scope=department
GET /api/rankings?scope=batch&batchCode=2514670010
```

Returns separate SGPA and CGPA rankings. A batch code is a roll-number prefix.

### Scraping operations

```text
GET /api/scrape-status
GET /api/pending-results
POST /api/scrape-pending-results
```

- `/api/scrape-status` reports credential totals, result states, queue progress, and storage engine.
- `/api/pending-results` lists results that need further processing.
- `/api/scrape-pending-results` queues all pending credentials.

Unknown `/api/*` routes return a JSON 404 response.

## Troubleshooting

### Chromium fails to start

Run a clean dependency install and verify that Puppeteer downloaded its browser:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

For temporary browser debugging, set:

```dotenv
SCRAPER_HEADLESS=false
```

### The university portal changes or is unavailable

The scraper depends on the current portal page structure and availability. Confirm that `RESULT_PORTAL_URL` is reachable, then inspect the server log and scrape status. Fallback URLs may be configured with comma-separated values in `RESULT_PORTAL_URLS`.

### Results remain pending

Check `/api/scrape-status` and `/api/pending-results`. Increase timeouts for slow connections and inspect portal-specific errors returned in the dashboard or scrape status.

### Application uses SQLite instead of Supabase

This is intentional when `SUPABASE_URL` or a supported API key is missing. Confirm the values are present in `.env.local`, restart the server, and call `/api/health` to verify that the storage engine is `supabase`.

### TypeScript errors

Run the type-checker:

```powershell
npm run lint
```

## Data and Usage Notice

This project accesses an external university result portal and stores academic and identity-related data. Only use credentials and result data that you are authorized to collect, ensure that storage access and deployment policies comply with institutional requirements, and display a clear privacy notice before collecting or publishing student information.
