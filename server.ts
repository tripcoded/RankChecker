import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from 'multer';
import db from './server/db.js';
import { scrapeStudentResult, getStudentRanks } from './server/scraper.js';
import { processExcelCredentials } from './server/excel-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Login
  app.post("/api/login", (req, res) => {
    const { rollNo, dob } = req.body;
    const student = db.prepare('SELECT * FROM credentials WHERE roll_no = ? AND dob = ?').get(rollNo, dob) as any;
    
    if (student) {
      // If not scraped yet, trigger scrape
      if (!student.is_scraped) {
        scrapeStudentResult(rollNo, dob);
      }
      res.json({ success: true, rollNo });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Upload Credentials
  app.post("/api/upload-credentials", upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    try {
      const result = processExcelCredentials(req.file.path);
      res.json({ success: true, count: result.count });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Scrape All
  app.post("/api/scrape-all", async (req, res) => {
    const credentials = db.prepare('SELECT * FROM credentials WHERE is_scraped = 0').all() as any[];
    
    // Run scraping in background
    (async () => {
      for (const cred of credentials) {
        await scrapeStudentResult(cred.roll_no, cred.dob);
        // Add delay to avoid overwhelming the server
        await new Promise(r => setTimeout(r, 1000));
      }
    })();

    res.json({ success: true, message: `Started scraping ${credentials.length} students` });
  });

  // Get Student Result
  app.get("/api/student/:rollNo", (req, res) => {
    const result = getStudentRanks(req.params.rollNo);
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  });

  // Stats
  app.get("/api/stats", (req, res) => {
    const total = db.prepare('SELECT COUNT(*) as count FROM credentials').get() as any;
    const scraped = db.prepare('SELECT COUNT(*) as count FROM credentials WHERE is_scraped = 1').get() as any;
    res.json({ total: total.count, scraped: scraped.count });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
