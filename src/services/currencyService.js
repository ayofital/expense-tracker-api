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

}