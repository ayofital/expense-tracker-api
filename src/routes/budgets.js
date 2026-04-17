import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validators.js';
import { 
    setBudget,
    getBudgets,
    getBudgetStatus,
    deleteBudget,
} from '../controllers/budgetController.js';

const router = Router();

const budgetRules = [
  body('category_id')
    .notEmpty().withMessage('category_id is required')
    .isInt({ min: 1}).withMessage('category_id must be a valid ID'),
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isFloat({ min: 0.01 }).withMessage('amount must be a positive number'),
  body('period')  
    .optional()
    .isIn(['monthly', 'weekly', 'yearly'])
    .withMessage('period must be monthly, weekly or yearly'),
];

router.get('/', authenticate, getBudgets);
router.get('/getStatus', authenticate, getBudgetStatus);
router.post('/', authenticate, budgetRules, validate, setBudget);
router.delete('/:id', authenticate, deleteBudget);

export default router;
