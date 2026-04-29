import pool from '../config/db.js';
import { getSupportedCurrencies, getRates } from '../services/currencyService.js';

// GET /api/currency/rates - show current rates relative to user's base currency
export const getCurrencyRates = async (req, res, next) => {
    try {
        const [userRows] = await pool.query(
            'SELECT base_currency FROM users WHERE id = ?', [req.user.id]
        );
        const baseCurrency = userRows[0]?.base_currency || 'NGN';
        const rates = await getRates(baseCurrency);

        res.json({
            base_currency: baseCurrency,
            rates,
            cached_at: new Date().toISOString(),
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/currency/supported - list all supported currency codes
export const getSupportedCurrenciesHandler = async (req, res, next) => {
    try {
        const currencies = await getSupportedCurrencies();
        res.json({ currencies, count: currencies.length });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/currency/base - update user's base currency
export const updateBaseCurrency = async (req, res, next) => {
    const currency = (req.body.currency || '').toUpperCase().trim();

    if(!currency || currency.length !== 3) {
        return res.status(400).json({ error: 'currency must be a 3-letter currency code' });
    }

    try {
        // verify it's a real currency code
        const rates = await getRates();
        if (!rates[currency]) {
            return res.status(400).json({ error: `Unsupported currency: ${currency}` });
        }

        await pool.query(
            'UPDATE users SET base_currency = ? WHERE id = ?',
            [currency, req.user.id]
        );
        res.json({
            message: `Base currency updated to ${currency}`,
            base_currency: currency,
        });
    } catch (err) {
        next(err);
    }
};