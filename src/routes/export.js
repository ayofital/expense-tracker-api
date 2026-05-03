import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import { exportCSV, exportPDF } from '../controllers/exportController.js';

const router = Router();

// All export routes are protected
router.get('/csv', authenticate, exportCSV);
router.get('/pdf', authenticate, exportPDF);

export default router;