import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// GET /api/expenses — fetch all expenses with category name
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.amount,
        e.date,
        e.notes,
        e.created_at,
        c.name AS category
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      ORDER BY e.date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/:id — fetch one expense
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, c.name AS category
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses — create a new expense
router.post('/', async (req, res) => {
  const { title, amount, category_id, date, notes } = req.body;

  if (!title || !amount || !date) {
    return res.status(400).json({ error: 'title, amount and date are required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO expenses (title, amount, category_id, date, notes) VALUES (?, ?, ?, ?, ?)',
      [title, amount, category_id || null, date, notes || null]
    );
    res.status(201).json({ id: result.insertId, title, amount, category_id, date, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/expenses/:id — update an expense
router.put('/:id', async (req, res) => {
  const { title, amount, category_id, date, notes } = req.body;
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `UPDATE expenses
       SET title = ?, amount = ?, category_id = ?, date = ?, notes = ?
       WHERE id = ?`,
      [title, amount, category_id || null, date, notes || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id — delete an expense
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM expenses WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;