import pool from '../config/db.js';
import { convertToBase } from '../services/currencyService.js';
import { buildExpenseQuery } from '../utils/expenseQueryBuilder.js';

const ALLOWED_SORT_COLUMNS = ['date', 'amount', 'title', 'created_at'];
const ALLOWED_SORT_ORDERS = ['ASC','DESC'];

export const getExpenses =  async (req, res, next) => {
 const {
    sort_by,
    sort_order,
    page,
    limit,
 } = req.query;


// santize sort inputs against whitelist
const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sort_by)
? sort_by
: 'date';

const safeSortOrder = ALLOWED_SORT_ORDERS.includes((sort_order || '').toUpperCase())
? sort_order.toUpperCase()
: 'DESC';

// sanitise pagination inputs
const safePage = Math.max(1, parseInt(page) || 1);
const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
const offset = (safePage - 1) * safeLimit;

// --- build dynamic WHERE clause from query builder ---

const { whereClause, params } = buildExpenseQuery(req.user.id, req.query);

try {
    //  count query - same WHERE, no LIMIT
    const countQuery = `
    SELECT COUNT(*) AS total
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE ${whereClause}
    `;
    const [[{ total }]] = await pool.query(countQuery, params);
    
    //  Data query - with ORDER BY, LIMIT, OFFSET

    const dataQuery = `
       SELECT
          e.id, e.title, e.amount, 
          e.currency, e.amount_base, e.date,
          e.notes, e.created_at,
          c.name AS category
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE ${whereClause}
        ORDER BY e.${safeSortBy} ${safeSortOrder}
        LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, safeLimit, offset];
    const [rows] = await pool.query(dataQuery, dataParams);

    // Build response
    const totalPages = Math.ceil(parseInt(total) / safeLimit);

    res.json({
        data: rows.map( row => ({
            ...rows,
            amount: parseFloat(row.amount),
            amount_base: row.amount_base ? parseFloat(row.amount_base) : null,
        })),
        pagination: {
            total: parseInt(total),
            page: safePage,
            limit: safeLimit,
            total_pages: totalPages,
            has_next: safePage < totalPages,
            has_prev: safePage  > 1,
        },
        filters_applied: {
            search: search || null,
            category_id: category_id ? parseInt(category_id) : null,
            date_from: date_from || null,
            date_to: date_to || null,
            min_amount: min_amount ? parseFloat(min_amount) : null,
            max_amount: max_amount ? parseFloat(max_amount) : null,
            sort_by: safeSortBy,
            sort_order: safeSortOrder,
        },
    });
} catch(err) {
    next(err);
}
}

export const getExpenseById = async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
           SELECT e.*, c.name AS category 
           FROM expenses e
           LEFT JOIN categories c ON e.category_id = c.id
           WHERE e.id = ? AND e.user_id = ?
            `, [req.params.id, req.user.id]);

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Expense not found'});
            }
            res.json(rows[0]);
    } catch (err) {
        next(err);
    }
};

export const createExpense = async (req, res, next) => {
  const { title, amount, category_id, date, notes } = req.body;

//   Normalize currency - default to user's base currency
    const currency = (req.body.currency || 'NGN').toUpperCase().trim();

  try {
    // Get user's base currency
    const [userRows] = await pool.query(
        'SELECT base_currency FROM users WHERE id = ?', [req.user.id]
    );
    const baseCurrency = userRows[0]?.base_currency || 'NGN';

    //  Convert to base currency
    const { amountBase, exchangeRate } = await convertToBase(
        parseFloat(amount), currency, baseCurrency
    );
    const [result] = await pool.query(
        `INSERT INTO expenses
        (title, amount, currency, amount_base, exchange_rate, category_id, date, notes, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, amount, currency, amountBase, exchangeRate,
            category_id || null, date, notes || null, req.user.id]
    );

    // Base response — expense was saved
    const response = {
         id: result.insertId,
         title,
         amount: parseFloat(amount),
         currency,
         amount_base: amountBase,
         exchange_rate: exchangeRate,
         base_currency: baseCurrency,
         date,
         };

    // Check budget only if a category was provided
    if (category_id) {
      const [budgetRows] = await pool.query(`
        SELECT
          b.amount AS budget_amount,
          COALESCE(SUM(e.amount), 0) AS spent
        FROM budgets b
        LEFT JOIN expenses e
          ON  e.category_id = b.category_id
          AND e.user_id     = b.user_id
          AND DATE_FORMAT(e.date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
        WHERE b.user_id     = ?
          AND b.category_id = ?
          AND b.period      = 'monthly'
        GROUP BY b.amount
      `, [req.user.id, category_id]);

      if (budgetRows.length > 0) {
        const { budget_amount, spent } = budgetRows[0];
        const percentage = (parseFloat(spent) / parseFloat(budget_amount)) * 100;

        if (percentage >= 100) {
          response.budget_alert = {
            type:       'exceeded',
            message:    `You have exceeded your monthly budget for this category`,
            percentage: parseFloat(percentage.toFixed(2)),
          };
        } else if (percentage >= 80) {
          response.budget_alert = {
            type:       'warning',
            message:    `You have used ${percentage.toFixed(1)}% of your monthly budget`,
            percentage: parseFloat(percentage.toFixed(2)),
          };
        }
      }
    }

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

export const updateExpense = async (req, res, next) => {
    const { title, amount, category_id, date, notes } = req.body;
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE expenses
            SET title = ?, amount = ?, category_id = ?, date = ?, notes = ?
            WHERE id = ?  AND user_id = ?`,
            [title, amount, category_id || null, date, notes || null, id, req.user.id]
        );
        if (result.affectedRows === 0 ) {
            return res.status(404).json({ error: 'Expense not found'});
        }
        res.json({ message: 'Expense updated successfully'}); 
    } catch (err) {
        next(err);
    }
};

export const deleteExpense = async (req, res, next) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Expense not found' }) ;
        }
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        next(err);
    }
}