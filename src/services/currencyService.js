// In-memory cache - lives as long as your server process runs
const rateCache = {
    rates: null,
    fetchedAt: null,
    TTL: 60 * 60 * 1000, //1 hour
};

// Fetch rates from ExchangeRate API with caching
export const getRates = async (baseCurrency = process.env.BASE_CURRRENCY || 'NGN') => {
    const now = Date.now();

    const cacheValid =
    rateCache.rates &&
    rateCache.fetchedAt &&
    (now - rateCache.fetchedAt) < rateCache.TTL;

    if (cacheValid) {
        return rateCache.rates;
    }

    const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/${baseCurrency}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== 'success') {
        throw new Error(`Exchange rate API error: ${data['error-type']}`);
    }

    // Update cache
    rateCache.rates = data.conversion_rates;
    rateCache.fetchedAt = now;

    return rateCache.rates;
};

//Convert an amount from one currency to the base currency
//Returns { amountBase, exchangeRate  } or { amountBase: null, exchangeRate: null }
export const convertToBase = async (amount, currency, baseCurrency) => {
    // Same currency - no conversion needed
    if (currency === baseCurrency) {
        return  { amountBase: parseFloat(amount), exchangeRate: 1 };
    }

    try {
        const rates = await getRates(baseCurrency);

        if(!rates[currency]) {
            throw new error(`Unknown currency: ${currency}`);
        }

        //rates[currency] = how many units of currency per 1 base unit
        // invert to get base units per 1 currency unit 
        const exchangeRate = 1 / rates[currency];
        const amountBase = parseFloat((amount * exchangeRate).toFixed(2));

        return { amountBase, exchangeRates: parseFloat(exchangeRate.toFixed(6)) };

    } catch (err) {
        console.error('[currency] Conversion failed:', err.message);
        // Graceful degradation - return nulls, don't crash
        return { amountBase: null, exchangeRate: null };
     }
 };

    // Get list of supported currencies (just return the keys of the rates object)
    export const getSupportedCurrencies = async () => {
        const rates = await getRates();
        return Object.keys(rates).sort();

};