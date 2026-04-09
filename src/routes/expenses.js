import { Router } from 'express';
import  authenticate from '../middleware/authenticate.js';
import { expenseRules, validate } from '../middleware/validators.js';
import { getExpense, getExpenseById, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';

const router = Router();

router.get('/', authenticate, getExpense);
router.get('/:id', authenticate, getExpenseById);
router.post('/', authenticate, ...expenseRules, validate, createExpense);
router.put('/:id', authenticate, ...expenseRules, validate, updateExpense);
router.delete('/:id', authenticate, deleteExpense);

export default router;