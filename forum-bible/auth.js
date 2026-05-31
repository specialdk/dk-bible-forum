// auth.js
// Everything to do with accounts: sign up, log in, log out, "who am I?",
// and a small "requireAuth" guard that protects the saved-studies routes.

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === 'production';

// Make a login token that proves "this is user N" for 30 days.
function makeToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

// How the login cookie behaves. httpOnly = JavaScript on the page can't read
// it (safer). secure = only sent over https, which Railway uses in production.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
  };
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Create an account -----------------------------------------------------
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const normEmail = email.trim().toLowerCase();

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // Never store the real password. Store a one-way hash of it.
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [normEmail, hash]
    );

    const user = result.rows[0];
    res.cookie('token', makeToken(user.id), cookieOptions());
    return res.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error('Signup failed:', err);
    return res.status(500).json({ error: 'Could not create account.' });
  }
});

// --- Log in ----------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!isValidEmail(email) || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please enter your email and password.' });
    }

    const normEmail = email.trim().toLowerCase();

    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [normEmail]
    );
    const user = result.rows[0];

    // Same message whether the email or password is wrong, so we don't
    // reveal which emails have accounts.
    if (!user) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    res.cookie('token', makeToken(user.id), cookieOptions());
    return res.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ error: 'Could not log in.' });
  }
});

// --- Log out ---------------------------------------------------------------
router.post('/logout', (req, res) => {
  res.clearCookie('token', cookieOptions());
  return res.json({ ok: true });
});

// --- Who am I? (used by the page on load to decide what to show) -----------
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.json({ user: null });

    const { userId } = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    return res.json({ user: result.rows[0] || null });
  } catch {
    return res.json({ user: null });
  }
});

// --- The guard: put this in front of any route that needs a logged-in user.
// It reads the cookie, checks it, and attaches req.userId for the route to use.
export function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Please log in.' });

    const { userId } = jwt.verify(token, JWT_SECRET);
    req.userId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Please log in.' });
  }
}

export default router;
