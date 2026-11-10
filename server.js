const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json());

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

// LIST + Pagination + Format
app.get('/api/internships', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const rows = db.prepare('SELECT * FROM internships LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT count(*) as total FROM internships').get().total;
  res.json({ status: "success", data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// Naya internship add karo
app.post('/api/internships', (req, res) => {
  const { title, company, location, stipend, type } = req.body;
    if (!title || !company) return res.status(400).json({ status: "error", message: "title and company are required" });
  const info = db.prepare('INSERT INTO internships (title, company, location, stipend, type) VALUES (?,?,?,?,?)').run(title, company, location, stipend, type);
  res.json({ id: info.lastInsertRowid });
});

// Delete karo
app.delete('/api/internships/:id', (req, res) => {
  db.prepare('DELETE FROM internships WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
// DETAIL - Ek ki detail
app.get('/api/internships/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM internships WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ status: "error", message: "Not found" });
  res.json({ status: "success", data: row });
});

// UPDATE - Update karo + Validation
app.put('/api/internships/:id', (req, res) => {
  const { title, company, location, stipend, type } = req.body;
  if (!title || !company) return res.status(400).json({ status: "error", message: "title and company are required" });
  const info = db.prepare('UPDATE internships SET title=?, company=?, location=?, stipend=?, type=? WHERE id=?').run(title, company, location, stipend, type, req.params.id);
  if (info.changes === 0) return res.status(404).json({ status: "error", message: "Not found" });
  res.json({ status: "success", data: { id: req.params.id, title, company } });
});
app.listen(3000, () => console.log('Server running on http://localhost:3000'));