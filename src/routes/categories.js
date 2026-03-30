import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// GET /api/categories — fetch all categories
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories — create a new category
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name) VALUES (?)',
      [name.trim()]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;