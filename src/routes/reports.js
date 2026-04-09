import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import { getMonthly, getByCategory, getRecent, getOverview, } from '../controllers/reportController.js';

const router = Router();

router.get('/monthly', authenticate, getMonthly);
router.get('/by-category', authenticate, getByCategory);
router.get('/recent', authenticate, getRecent);
router.get('/overview', authenticate, getOverview)

export default router;

