export const buildExpenseQuery = (userId, query = {}) => {
    const { 
        search, category_id, date_from, date_to, min_amount, max_amount,
    } = query;

    const conditions = ['e.user_id = ?'];
    const params = [userId];

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
    if (date_to) {
        conditions.push('e.date <= ?');
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

    return {
        whereClause: conditions.join(' AND '),
        params,
    };
};