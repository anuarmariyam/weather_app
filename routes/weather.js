const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/weather?city=CityName
router.get('/', async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: 'City is required' });
  }

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OpenWeather API key' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${apiKey}&units=metric`;

    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    return res.status(200).json({
      city: data.name,
      country: data.sys.country, // country code
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather?.[0]?.description || '—',
      icon: data.weather?.[0]?.icon || '01d',
      wind_speed: data.wind?.speed ?? 0,
      rain_last_3h: data.rain ? (data.rain['3h'] ?? 0) : 0,
      coordinates: {
        lat: data.coord.lat,
        lon: data.coord.lon
      }
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'City not found' });
    }
    console.error(error.message);
    return res.status(500).json({ error: 'Weather API error' });
  }
});

module.exports = router;

