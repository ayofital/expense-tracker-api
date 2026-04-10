import { body, validationResult } from 'express-validator';
import pool from '../config/db.js';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const expenseRules = [
    body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be under 200 characters'),

    body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),

    body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be a valid date (YYYY-MM-DD)'),

    body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('category_id must be a valid ID')
    .custom(async (value) =>{
        if (!value) return true;
        const [rows] = await pool.query(
            'SELECT id FROM categories WHERE id = ?', [value]
        );
        if (rows.length === 0) {
            throw new Error('Category_id does not exist');
        }
        return true;
    }),

    body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be under 1000 characters')

];

export const categoryRules = [
    body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name must be under 100 characters'),
];