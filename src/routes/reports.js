import { Router } from 'express';
import pool from '../config/db.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();


// GET /api/reports/by-category - spendng per category
router.get('/monthly', authenticate, async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
           SELECT 
           DATE_FORMAT(date, '%Y-%m') AS month,
           SUM(amount)  AS total,
           COUNT(*)  AS expense_count
           FROM expenses
           WHERE user_id = ?
           GROUP BY DATE_FORMAT(date, '%Y-%M')
           ORDER BY month DESC
            `, [req.user.id]);

            const formatted = rows.map(row => ({
                month: row.month,
                total: parseFloat(row.total),
                expense_count: parseInt(row.expense_count)
            }));

            res.json(formatted);
    } catch (err) {
        next(err);
    }
});

