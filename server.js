require('dotenv').config();

const express = require('express');
const cors = require('cors');

const weatherRoute = require('./routes/weather');
const newsRoute = require('./routes/news');
const currencyRoute = require('./routes/currency');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/weather', weatherRoute);
app.use('/api/news', newsRoute);
app.use('/api/currency', currencyRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
