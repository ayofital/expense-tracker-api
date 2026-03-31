import { Router } from 'express';
import pool from '../config/db.js';
import { categoryRules, validate } from '../middleware/validators.js';

const router = Router();

// GET /api/categories — fetch all categories
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
   next(err);
  }
});

// POST /api/categories — create a new category
router.post('/', ...categoryRules, validate, async (req, res, next) => {
  const { name } = req.body;
  
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name) VALUES (?)',
      [name.trim()]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    next(err);
  }
});

export default router;