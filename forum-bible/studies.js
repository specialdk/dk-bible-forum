// studies.js
// Saving and reading back a user's studies. Every route here is protected,
// and every query is filtered by user_id, so people only ever touch their own.

import express from 'express';
import { pool } from './db.js';
import { requireAuth } from './auth.js';

const router = express.Router();

// Lock the whole router: you must be logged in to reach anything below.
router.use(requireAuth);

// --- List my saved studies (lightweight: no full details) ------------------
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, mode, title, source_input, created_at
         FROM studies
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [req.userId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('List studies failed:', err);
    return res.status(500).json({ error: 'Could not load your studies.' });
  }
});

// --- Get one full study (to re-open and re-display it) ---------------------
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, mode, title, source_input, details, created_at
         FROM studies
        WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    const study = result.rows[0];
    if (!study) return res.status(404).json({ error: 'Study not found.' });
    return res.json(study);
  } catch (err) {
    console.error('Get study failed:', err);
    return res.status(500).json({ error: 'Could not load that study.' });
  }
});

// --- Save a new study ------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { mode, title, source_input, details } = req.body ?? {};

    if (!mode || !details) {
      return res.status(400).json({ error: 'Missing study data.' });
    }

    const result = await pool.query(
      `INSERT INTO studies (user_id, mode, title, source_input, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, mode, title, source_input, created_at`,
      [req.userId, mode, title || null, source_input || null, JSON.stringify(details)]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Save study failed:', err);
    return res.status(500).json({ error: 'Could not save the study.' });
  }
});

// --- Delete a study --------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM studies WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Study not found.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete study failed:', err);
    return res.status(500).json({ error: 'Could not delete the study.' });
  }
});

export default router;
