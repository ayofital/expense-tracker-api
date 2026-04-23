import pool from '../config/db.js';
import { processRecurringExpenses } from '../jobs/recurringExpenseJob.js';

export const getRecurring = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.*, c.name AS category
            FROM recurring_expenses r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC`,
            [req.user.id] 
        );
        res.json(rows);
    } catch (err) {
        next(err)
    }
};

export const createRecurring = async (req, res, next) => {
     const { title, amount, category_id, frequency, start_date, next_due_date, end_date, notes} = req.body;

     try {
        const [result] = await pool.query(
            `INSERT INTO recurring_expenses
            (user_id, category_id, title, amount, frequency, start_date, next_due_date, end_date, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                req.user.id,
                category_id  || null,
                title,
                amount,
                frequency,
                start_date,
                start_date,  //next_due_date starts as start_date
                end_date || null,
                notes || null,
              ]
        );

        res.status(201).json({
            id: result.insertId,
            title,
            amount: parseFloat(amount),
            frequency, 
            start_date,
            next_due_date: start_date,
            message: `Recurring expense created - will generate ${frequency} from ${start_date}`
        });
     } catch (err) {
        next(err);
     }  
};
export const toggleRecurring = async (req, res, next) => {
    try {
        //  Flip is_active - if true make false, if false make true
        const [result] = await pool.query(
            `UPDATE recurring_expenses
            SET is_active = NOT is_active
            WHERE id = ? AND user_id = ?`,
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Recurring expense not found'});
        }

        // Fetch the updated row to return current state
        const [rows] = await pool.query(
            'SELECT id, title, is_active FROM recurring_expenses WHERE id = ?',
            [req.params.id]
        );

        res.json({
            message: rows[0].is_active ? 'Recurring expense resumed' : 'Recurring expense paused',
            is_active:rows[0].is_active,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteRecurring = async (req, res, next) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Recurring expense not found'});
        }

        res.json({ message: 'Recurring expense deleted' });
    } catch (err) {
        next(err);
    }
};

// Manual trigger - for testing without waiting for cron
 export const triggerJob = async (req, res, next) => {
    try {
        // Run the job but don't await  it - respond immediately
        processRecurringExpenses().catch(err =>
            console.error('[TRIGGER] Manual job failed:', err.message)
        ); 

        res.json({ message: 'Recurring expense job triggered - check server logs' });
    } catch (err) {
        next(err);
    }
 };