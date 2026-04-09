import { Router } from 'express';
import { getCategories, createCategory } from '../controllers/categoryController.js';
import { categoryRules, validate } from '../middleware/validators.js';

const router = Router();

router.get('/', getCategories );
router.post('/', ...categoryRules, validate, createCategory);


export default router;