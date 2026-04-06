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

// GET /apireports/by-category - spending per category
router.get('/by-category', authenticate, async (req, res, next) => {
    try {
        const [rows] =  await pool.query(`
            SELECT 
            COALESCE(c.name, 'Uncategorised') AS category,
            SUM(e.amount)  AS total,
            COunt(*) AS expense_count,
            ROUND(AVG(e.amount, 2))  AS average
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = ?
            GROUP BY e.category_id, c.name
            ORDER BY total DESC
            `, [req.user.id]);

            const formatted = rows.map(row => ({
                category: row.category,
                total: parseFloat(row.total),
                expense_count: parseInt(row.expense_count),
                average: parseFloat(row.average),
            }));

            res.json(formatted);
    }catch (err) {
        next(err);
    }
})

