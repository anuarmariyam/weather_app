const express = require('express');
const axios = require('axios');
const router = express.Router();

/*GET /api/currency?country=KZ
 * Steps:
 * 1) Country info from REST Countries = currency code
 * 2) Exchange rates from open.er-api.com 
 */
router.get('/', async (req, res) => {
  const countryCode = req.query.country;

  if (!countryCode) {
    return res.status(400).json({ error: 'Country code is required' });
  }

  try {
    const countryRes = await axios.get(
      `https://restcountries.com/v3.1/alpha/${encodeURIComponent(countryCode)}`,
      { timeout: 10000 }
    );

    const country = countryRes.data?.[0];
    if (!country || !country.currencies) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const currencyCode = Object.keys(country.currencies)[0];

    const ratesRes = await axios.get(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(currencyCode)}`,
      { timeout: 10000 }
    );

    if (ratesRes.data?.result !== 'success') {
      return res.status(500).json({ error: 'Currency rates not available' });
    }

    return res.status(200).json({
      country: country.name.common,
      currency: currencyCode,
      date: ratesRes.data.time_last_update_utc,
      rates: ratesRes.data.rates
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ error: 'Currency API error' });
  }
});

module.exports = router;
