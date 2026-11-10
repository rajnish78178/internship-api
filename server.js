const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- TASK 04: RATE LIMIT ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: "error", message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: "error", message: "Too many applications, please try again later." },
});

const db = new Database('internships.db');

db.exec(`
CREATE TABLE IF NOT EXISTS internships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  company TEXT,
  location TEXT,
  stipend TEXT,
  type TEXT
)
`);

// --- TASK 04: APPLICATIONS TABLE ---
db.exec(`
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  internship_id INTEGER NOT NULL,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (internship_id) REFERENCES internships(id)
)
`);

// --- TASK 03: GET ALL with Pagination (tumhara purana) ---
app.get('/api/internships', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const rows = db.prepare('SELECT * FROM internships LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT count(*) as total FROM internships').get().total;
  res.json({ status: "success", data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// --- TASK 03: POST (tumhara purana) ---
app.post('/api/internships', (req, res) => {
  const { title, company, location, stipend, type } = req.body;
  if (!title || !company) return res.status(400).json({ status: "error", message: "title and company are required" });
  const info = db.prepare('INSERT INTO internships (title, company, location, stipend, type) VALUES (?,?,?,?,?)').run(title, company, location, stipend, type);
  res.json({ id: info.lastInsertRowid });
});

// --- TASK 03: DELETE (tumhara purana) ---
app.delete('/api/internships/:id', (req, res) => {
  db.prepare('DELETE FROM internships WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- TASK 04: APPLICATION FORM API ---
app.post('/api/applications', applyLimiter, (req, res) => {
  const { name, email, internship_id, message } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ status: "error", message: "Name must be at least 2 characters" });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ status: "error", message: "Valid email is required" });
  }
  if (!internship_id) {
    return res.status(400).json({ status: "error", message: "Internship selection is required" });
  }

  // Parameterized Query - SQL Injection safe
  const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(internship_id);
  if (!internship) {
    return res.status(404).json({ status: "error", message: "Internship not found" });
  }

  const info = db.prepare('INSERT INTO applications (name, email, internship_id, message) VALUES (?, ?, ?, ?)')
    .run(name.trim(), email.trim().toLowerCase(), internship_id, message || '');

  res.status(201).json({ status: "success", id: info.lastInsertRowid, message: "Application submitted successfully!" });
});

app.get('/api/applications', (req, res) => {
  const rows = db.prepare('SELECT * FROM applications ORDER BY id DESC').all();
  res.json({ status: "success", data: rows });
});
// Capstone - Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Capstone - Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uptime: process.uptime(), 
    timestamp: new Date().toISOString() 
  });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));