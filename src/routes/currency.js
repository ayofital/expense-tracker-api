import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import {
    getCurrencyRates,
    getSupportedCurrenciesHandler,
    updateBaseCurrency,
} from '../controllers/currencyController.js';

const router =  Router();

router.get('/rates', authenticate, getCurrencyRates);
router.get('/supported', authenticate, getSupportedCurrenciesHandler);
router.patch('/base', authenticate, updateBaseCurrency);

export default router;