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
// Sorted in Bible order: book, then chapter, then verse. Studies with no
// book (e.g. Respond-mode replies) have NULL book_no and sort LAST, by date.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, mode, title, source_input, book_no, chapter, verse, created_at
         FROM studies
        WHERE user_id = $1
        ORDER BY
          book_no IS NULL,           -- false (has a book) sorts before true (no book)
          book_no ASC,
          chapter ASC,
          verse ASC,
          created_at DESC`,
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
      `SELECT id, mode, title, source_input, details, book_no, chapter, verse, created_at
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
    const { mode, title, source_input, details, book_no, chapter, verse } = req.body ?? {};

    if (!mode || !details) {
      return res.status(400).json({ error: 'Missing study data.' });
    }

    // Normalise the Bible-order fields. They may be absent (Respond mode) or
    // partial (chapter with no verse). Missing book/chapter stay NULL so they
    // sort to the bottom; missing verse becomes 0 so a whole-chapter study
    // sorts above its individual verses.
    const bookNo = Number.isInteger(book_no) ? book_no : null;
    const chap = Number.isInteger(chapter) ? chapter : null;
    const vrs = Number.isInteger(verse) ? verse : (bookNo ? 0 : null);

    const result = await pool.query(
      `INSERT INTO studies (user_id, mode, title, source_input, details, book_no, chapter, verse)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, mode, title, source_input, book_no, chapter, verse, created_at`,
      [req.userId, mode, title || null, source_input || null, JSON.stringify(details), bookNo, chap, vrs]
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