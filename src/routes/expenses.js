import { Router } from 'express';
import pool from '../config/db.js';
import { expenseRules, validate } from '../middleware/validators.js';
import  authenticate from '../middleware/authenticate.js';

const router = Router();

// GET /api/expenses — fetch all expenses with category name
router.get('/', authenticate,  async (req, res, next) => {
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
      WHERE e.user_id = ?
      ORDER BY e.date DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/expenses/:id — fetch one expense
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, c.name AS category
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ? AND e.user_id = ?
    `, [req.params.id, req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/expenses — create a new expense
router.post('/', authenticate, ...expenseRules, validate, async (req, res, next) => {
  const { title, amount, category_id, date, notes } = req.body;

  try {
    const [result] = await pool.query(
      'INSERT INTO expenses (title, amount, category_id, date, notes, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, amount, category_id || null, date, notes || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, title, amount, category_id, date, notes });
  } catch (err) {
    next(err);
  }
});
// PUT /api/expenses/:id — update an expense
router.put('/:id', authenticate, ...expenseRules, validate, async (req, res, next) => {
  const { title, amount, category_id, date, notes } = req.body;
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `UPDATE expenses
       SET title = ?, amount = ?, category_id = ?, date = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [title, amount, category_id || null, date, notes || null, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/expenses/:id — delete an expense
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;