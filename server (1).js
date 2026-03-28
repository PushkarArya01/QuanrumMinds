// ================================================
//   FULL STACK AUTH BACKEND — Node.js + SQLite
//   Run: npm install && node server.js
// ================================================

const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const Database   = require('better-sqlite3');
const cors       = require('cors');
const path       = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'apna_secret_key_yahan_likho_$2024'; // Production mein .env use karein

// ------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Frontend files yahan

// ------------------------------------------------
// DATABASE SETUP (SQLite)
// ------------------------------------------------
const db = new Database('./database.db');

// Table banao agar nahi hai
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    token       TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

console.log('✅ Database ready: database.db');

// ------------------------------------------------
// HELPER: JWT Verify Middleware
// ------------------------------------------------
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ error: 'Token nahi mila. Pehle login karein.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid ya expired token. Dobara login karein.' });
  }
}

// ------------------------------------------------
// ROUTES
// ------------------------------------------------

// Root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SIGN UP ---
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Sare fields required hain!' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password 6 characters se chhota nahi hona chahiye!' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: 'Valid email address likhein!' });

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingUser)
      return res.status(409).json({ error: 'Yeh email pehle se registered hai!' });

    // Hash password (bcrypt, 12 rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save to DB
    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(name.trim(), email.toLowerCase(), hashedPassword);

    // Generate JWT token
    const token = jwt.sign(
      { id: result.lastInsertRowid, email: email.toLowerCase(), name: name.trim() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Save session
    db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(result.lastInsertRowid, token);

    console.log(`✅ New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Account ban gaya! Welcome!',
      token,
      user: {
        id: result.lastInsertRowid,
        name: name.trim(),
        email: email.toLowerCase()
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error. Thoda baad try karein.' });
  }
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email aur password dono zaroori hain!' });

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user)
      return res.status(401).json({ error: 'Yeh email registered nahi hai!' });

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: 'Password galat hai!' });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Save session
    db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(user.id, token);

    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Thoda baad try karein.' });
  }
});

// --- GET PROFILE (Protected Route) ---
app.get('/api/profile', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User nahi mila!' });

  res.json({ success: true, user });
});

// --- GET ALL USERS (Protected, sirf login ke baad) ---
app.get('/api/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, count: users.length, users });
});

// --- LOGOUT ---
app.post('/api/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  console.log(`✅ User logged out: ${req.user.email}`);
  res.json({ success: true, message: 'Logout successful!' });
});

// --- DELETE ACCOUNT ---
app.delete('/api/account', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.json({ success: true, message: 'Account delete ho gaya.' });
});

// ------------------------------------------------
// START SERVER
// ------------------------------------------------
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🔐 SecureAuth Server Running!     ║
  ║   http://localhost:${PORT}             ║
  ╠══════════════════════════════════════╣
  ║  POST /api/signup   → Register       ║
  ║  POST /api/login    → Login          ║
  ║  GET  /api/profile  → Profile (JWT)  ║
  ║  GET  /api/users    → All Users      ║
  ║  POST /api/logout   → Logout         ║
  ║  DEL  /api/account  → Delete Acc.    ║
  ╚══════════════════════════════════════╝
  `);
});
