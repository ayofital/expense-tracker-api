import { Router } from 'express';
import { body } from 'express-validator';
import { register, login } from '../controllers/authController.js';

const router = Router();

// validation rules for auth routes
const authRules = [
    body('email')
    .isEmail()
    .withMessage('valid email required')
    .normalizeEmail(),

    body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];


router.post('/register', authRules, register)
router.post('/login', authRules, login)
   

export default router