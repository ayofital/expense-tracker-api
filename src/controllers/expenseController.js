import pool from '../config/db.js';

const ALLOWED_SORT_COLUMNS = ['date', 'amount', 'title', 'created_at'];
const ALLOWED_SORT_ORDERS = ['ASC','DESC'];

export const getExpenses =  async (req, res, next) => {
 const {
    search,
    category_id,
    date_from,
    date_to,
    min_amount,
    max_amount,
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

// build dynamic WHERE clause
const conditions = ['e.user_id = ?'];
const params = [req.user.id];

if (search) {
    conditions.push('e.title LIKE ?');
    params.push(`%${search}%`);
}
if (category_id) {
    conditions.push('e.category_id = ?');
    params.push(parseInt(category_id));
}

if (date_from) {
    conditions.push('e.date >= ?');
    params.push(date_from);
}

if  (date_to) {
    conditions.push('e.date < ?');
    params.push(date_to);
}

if (min_amount) {
    conditions.push('e.amount >= ?');
    params.push(parseFloat(min_amount));
}

if (max_amount) {
    conditions.push('e.amount <= ?');
    params.push(parseFloat(max_amount));
}

const whereClause = conditions.join(' AND ');

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
          e.id, e.title, e.amount, e.date,
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
            amount: parseFloat(rows.amount),
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
    const {title, amount, category_id, date, notes } = req.body;
    try {
        const [result] = await pool.query(
            `INSERT INTO expenses (title, amount, category_id, date, notes, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [title, amount, category_id || null, date, notes || null, req.user.id]
        );
        res.status(201).json({ id: result.insertId, title, amount, date });
    } catch (err){
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