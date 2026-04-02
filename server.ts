import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { normalizeDob, normalizeRollNo } from './server/normalizers.js';
import {
  findCredential,
  getCredentialStats,
  getResultStatusCounts,
  getStorageEngine,
  isCredentialScraped,
  upsertCredentials,
} from './server/repository.js';
import { getManualCredentialBatch, getStudentRanks, scrapeStudentResult } from './server/scraper.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const MAX_RETRIES = Number(process.env.SCRAPE_MAX_RETRIES || 3);
const SCRAPE_DELAY_MS = Number(process.env.SCRAPE_DELAY_MS || 1000);
const RETRY_DELAY_MS = Number(process.env.SCRAPE_RETRY_DELAY_MS || 2500);

type QueueTask = {
  rollNo: string;
  dob: string;
  attempt: number;
  source: 'login' | 'manual';
};

const queue: QueueTask[] = [];
const queueSet = new Set<string>();

const queueState = {
  running: false,
  startedAt: null as string | null,
  finishedAt: null as string | null,
  totalQueued: 0,
  completed: 0,
  failed: 0,
  retried: 0,
  currentRollNo: null as string | null,
  lastError: null as string | null,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enqueueTask(rollNo: string, dob: string, source: QueueTask['source']): boolean {
  if (queueSet.has(rollNo)) {
    return false;
  }

  queue.push({ rollNo, dob, attempt: 1, source });
  queueSet.add(rollNo);
  queueState.totalQueued += 1;
  queueState.finishedAt = null;

  if (!queueState.startedAt) {
    queueState.startedAt = new Date().toISOString();
  }

  void runQueue();
  return true;
}

async function runQueue() {
  if (queueState.running) {
    return;
  }

  queueState.running = true;

  while (queue.length > 0) {
    const task = queue.shift();
    if (!task) {
      continue;
    }

    queueSet.delete(task.rollNo);
    queueState.currentRollNo = task.rollNo;

    try {
      const result = await scrapeStudentResult(task.rollNo, task.dob);

      if (result.status === 'error' && result.retryable && task.attempt < MAX_RETRIES) {
        queueState.retried += 1;
        await sleep(RETRY_DELAY_MS * task.attempt);
        queue.push({ ...task, attempt: task.attempt + 1 });
        queueSet.add(task.rollNo);
        continue;
      }

      if (result.status === 'error') {
        queueState.failed += 1;
        queueState.lastError = result.error || 'Unknown scraping error';
      } else {
        queueState.completed += 1;
      }
    } catch (error) {
      queueState.failed += 1;
      queueState.lastError = (error as Error).message;
    }

    await sleep(SCRAPE_DELAY_MS);
  }

  queueState.running = false;
  queueState.currentRollNo = null;
  queueState.finishedAt = new Date().toISOString();
}

function getQueueSnapshot() {
  return {
    ...queueState,
    pending: queue.length,
    maxRetries: MAX_RETRIES,
    delayMs: SCRAPE_DELAY_MS,
    retryDelayMs: RETRY_DELAY_MS,
  };
}

async function queueManualBatchOnStartup() {
  const batch = getManualCredentialBatch();
  if (batch.length === 0) {
    console.log('Manual credential batch is empty. Add rows in server/scraper.ts to start scraping.');
    return;
  }

  await upsertCredentials(batch);
  let enqueued = 0;
  let skippedAlreadyScraped = 0;
  for (const row of batch) {
    const existing = await findCredential(row.rollNo, row.dob);
    if (existing && isCredentialScraped(existing)) {
      skippedAlreadyScraped += 1;
      continue;
    }

    if (enqueueTask(row.rollNo, row.dob, 'manual')) {
      enqueued += 1;
    }
  }

  console.log(
    `Manual batch loaded: ${batch.length} credentials, ${enqueued} queued, ${skippedAlreadyScraped} already scraped.`,
  );
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      storage: getStorageEngine(),
    });
  });

  app.post('/api/login', async (req, res) => {
    const rollNo = normalizeRollNo(req.body?.rollNo);
    const dob = normalizeDob(req.body?.dob);

    if (!rollNo || !dob) {
      return res.status(400).json({ success: false, message: 'Use valid roll number and DOB (DD-MM-YYYY).' });
    }

    const credential = await findCredential(rollNo, dob);
    if (!credential) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!isCredentialScraped(credential) || process.env.RESCRAPE_ON_LOGIN === 'true') {
      enqueueTask(rollNo, dob, 'login');
    }

    return res.json({ success: true, rollNo });
  });

  app.get('/api/student/:rollNo', async (req, res) => {
    const rollNo = normalizeRollNo(req.params.rollNo);
    if (!rollNo) {
      return res.status(400).json({ error: 'Invalid roll number.' });
    }

    const result = await getStudentRanks(rollNo);
    if (!result) {
      return res.status(404).json({ error: 'Student not found' });
    }
    return res.json(result);
  });

  app.get('/api/scrape-status', async (_req, res) => {
    const stats = await getCredentialStats();
    const resultCounts = await getResultStatusCounts();
    const queue = getQueueSnapshot();
    res.json({
      success: true,
      ...stats,
      processed: queue.completed + queue.failed,
      resultCounts,
      queue,
      storage: getStorageEngine(),
    });
  });

  // Ensure API typos/missing routes never fall through to Vite HTML.
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'API route not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  void queueManualBatchOnStartup().catch((error) => {
    console.error('Failed to queue manual credential batch:', error);
  });
}

startServer().catch((error) => {
  console.error('Fatal server startup error:', error);
  process.exit(1);
});
