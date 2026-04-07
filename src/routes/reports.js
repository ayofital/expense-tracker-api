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
           GROUP BY DATE_FORMAT(date, '%Y-%m')
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
            COUNT(*) AS expense_count,
            ROUND(AVG(e.amount), 2)  AS average
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
});

// GET /api/reports/recent?days=30 - expenses from last N days
router.get('/recent', authenticate, async (req, res, next) => {
    const days = parseInt(req.query.days) || 30;

    if (days < 1 || days > 365) {
        return res.status(400).json({ error: 'days must be between 1 and 365' });
    }

    try {
        const [rows] = await pool.query(`
            SELECT
            e.id,
            e.title,
            e.amount,
            e.date,
            e.notes,
            COALESCE(c.name, 'Uncategorised') AS category
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = ?
             AND e.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             ORDER BY e.date DESC
             `, [req.user.id, days]);

             res.json({
                period_days: days,
                count: rows.length,
                expenses: rows.map( row => ({
                    ...row,
                    amount: parseFloat(row.amount),
                })),
             });
    } catch (err) {
        next(err);
    }
});

// GET /api/reports/overview - single row summary of all spending
router.get('/overview', authenticate, async (req, res, next) => {
    try {
        const [rows] = await pool.query (`
            SELECT 
            COUNT(*)  AS total_expenses,
            SUM(amount) AS total_spent,
            ROUND(AVG(amount), 2) AS average_expense,
            MAX(amount) AS largest_expense,
            MIN(amount) AS smallest_expense
            FROM expenses
            WHERE user_id = ? 
            `, [req.user.id]);

            const stats = rows[0];

            res.json({
                total_expenses: parseInt(stats.total_expenses) || 0,
                total_spent: parseFloat(stats.total_spent) || 0,
                average_expense: parseFloat(stats.average_expense) || 0,
                largest_expense: parseFloat(stats.largest_expense) || 0,
                smallest_expense: parseFloat(stats.smallest_expense) || 0,
            });
    } catch (err) {
        next(err);
    }

});

export default router;

