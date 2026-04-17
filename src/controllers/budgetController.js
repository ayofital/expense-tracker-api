import pool from '../config/db.js';

// Pure helper - computes from two numbers
const computeBudgetStatus =  (budgetAmount, spent) => {
    const percentage = (spent / budgetAmount) * 100;
    const remaining = budgetAmount - spent;

    let status, alertType;
    if (percentage >= 100) {
        status = 'exceeded'; alertType = 'exceeded';
    } else if (percentage >= 80) {
        status = 'warning'; alertType = 'warning';
    } else { 
        status = 'on_track'; alertType = null;
    }

    return {
        budget_amount:parseFloat(budgetAmount),
        spent: parseFloat(spent),
        remaining: parseFloat(remaining),
        percentage: parseFloat(percentage.toFixed(2)),
        status,
        alert_type: alertType,
    };
};

// POST /api/budgets - create or update a budget 
export const setBudget = async (req, res, next) => {
  const { category_id, amount, period = 'monthly' } = req.body;

  const VALID_PERIODS = ['monthly', 'weekly', 'yearly'];
  if (!VALID_PERIODS.includes(period)) {
    return res.status(400).json({ error: 'period must be monthly, weekly or yearly' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify category exists and belongs to a valid category
    const [catRows] = await connection.query(
      'SELECT id FROM categories WHERE id = ?', [category_id]
    );
    if (catRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Category not found' });
    }

    // Upsert — insert if new, update amount if exists
    const [result] = await connection.query(`
      INSERT INTO budgets (user_id, category_id, amount, period)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        amount     = VALUES(amount),
        updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, category_id, amount, period]);

    await connection.commit();

    // insertId is 0 on update — fetch the actual row
    const [rows] = await pool.query(
      'SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND period = ?',
      [req.user.id, category_id, period]
    );

    res.status(201).json({
      message: result.insertId > 0 ? 'Budget created' : 'Budget updated',
      budget:  rows[0],
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// GET /api/budgets - all budgets with live spending status
export const getBudgets = async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
          SELECT
          b.id,
          b.period,
          b.amount AS budget_amount,
          c.name AS category,
          b.category_id,
          COALESCE(SUM(e.amount), 0)  AS spent
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        LEFT JOIN expenses e
         ON e.category_id = b.category_id 
         AND e.user_id = b.user_id
         AND DATE_FORMAT(e.date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
         WHERE b.user_id = ?
         GROUP BY b.id, b.period, b.amount, c.name, b.category_id
         ORDER BY c.name ASC
            `, [req.user.id]);

            // Attach computed statusto each budget row
            const budgets = rows.map(row => ({
                id: row.id,
                category: row.category,
                category_id: row.category_id,
                period: row.period,
                ...computeBudgetStatus(row.budget_amount, row.spent),
            }));

            res.json(budgets);
    } catch(err) {
        next(err);
    }
};

// GET /api/budgets/status - quick overview of all budget statuses 
export const getBudgetStatus = async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
           SELECT 
           b.id,
           c.name AS category,
           b.amount AS budget_amount,
           b.period,
           COALESCE(SUM(e.amount), 0)  AS spent
         FROM budgets b  
         JOIN categories c ON b.category_id = c.id
         LEFT JOIN expenses e
         ON e.category_id = b.category_id
         AND e.user_id = b.user_id
         AND DATE_FORMAT(e.date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
         WHERE b.user_id = ? 
         GROUP BY b.id, c.name, b.amount, b.period
            `, [req.user.id]);

            // Separate into three groups
            const exceeded = [];
            const warning  = [];
            const on_track = [];

            rows.forEach(row => {
                const status = computeBudgetStatus(row.budget_amount, row.spent);
                const entry = { category: row.category, period: row.period, ...status };

                if (status.status === 'exceeded') exceeded.push(entry);
                else if ( status.status === 'warning') warning.push(entry);
                else on_track.push(entry);
            });

            res.json({
                summary: {
                    total_budgets: rows.length,
                    exceeded: exceeded.length,
                    warning: warning.length,
                    on_track: on_track.length,
                },
                budgets: { exceeded, warning, on_track },
            });
    } catch(err) {
        next(err);
    }
};

// DELETE /api/budgets/:id
export const deleteBudget = async (req, res, next) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM budgets WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }
        res.json({ message: 'Budget deleted'})
    } catch (err) {
        next(err);
    };
}