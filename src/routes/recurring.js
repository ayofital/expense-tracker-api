import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validators.js';
import authenticate from '../middleware/authenticate.js';
import {
  getRecurring,
  createRecurring,
  toggleRecurring,
  deleteRecurring,
  triggerJob,
} from '../controllers/recurringController.js';

const router = Router();

const recurringRules = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .trim()
    .isLength({ max: 200 }).withMessage('Title must be under 200 characters'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('frequency')
    .notEmpty().withMessage('Frequency is required')
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Frequency must be daily, weekly, monthly or yearly'),
  body('start_date')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  body('end_date')
    .optional()
    .isISO8601().withMessage('End date must be a valid date (YYYY-MM-DD)'),
  body('category_id')
    .optional()
    .isInt({ min: 1 }).withMessage('category_id must be a valid ID'),
];

router.get('/', authenticate, getRecurring);
router.post('/', authenticate, recurringRules, validate, createRecurring);
router.patch('/:id/toggle', authenticate, toggleRecurring);
router.delete('/:id',     authenticate, deleteRecurring);
router.post('/trigger',   authenticate, triggerJob); // manual test trigger

export default router;