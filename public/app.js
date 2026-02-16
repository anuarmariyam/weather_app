let map;
let marker;

function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString();
  } catch {
    return String(dateStr);
  }
}

async function fetchWeather(city) {
  const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
  return res.json();
}

async function fetchNews(city, countryCode) {
  const res = await fetch(
    `/api/news?city=${encodeURIComponent(city)}&country=${encodeURIComponent(countryCode)}`
  );
  return res.json();
}

async function fetchCurrency(countryCode) {
  const res = await fetch(`/api/currency?country=${encodeURIComponent(countryCode)}`);
  return res.json();
}

function renderWeather(data) {
  const box = document.getElementById('weatherBox');
  box.classList.remove('hidden');

  box.innerHTML = `
    <div class="weather-head">
      <div class="weather-title">
        <h2>${data.city}, ${data.country}</h2>
        <div class="weather-desc">${data.description}</div>
      </div>

      <div class="weather-icon">
        <img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="weather icon"/>
        <div class="weather-temp">
          <span class="temp-main">${Math.round(data.temperature)}°C</span>
          <span class="temp-feels">Feels like ${Math.round(data.feels_like)}°C</span>
        </div>
      </div>
    </div>

    <div class="weather-grid">
      <div class="w-item"><span>Country code</span><b>${data.country}</b></div>
      <div class="w-item"><span>Humidity</span><b>${data.humidity}%</b></div>

      <div class="w-item"><span>Pressure</span><b>${data.pressure} hPa</b></div>
      <div class="w-item"><span>Wind</span><b>${data.wind_speed} m/s</b></div>

      <!-- Coordinates LEFT, Rain RIGHT (looks balanced) -->
      <div class="w-item"><span>Coordinates</span><b>${data.coordinates.lat}, ${data.coordinates.lon}</b></div>
      <div class="w-item"><span>Rain (3h)</span><b>${data.rain_last_3h} mm</b></div>
    </div>
  `;
}

function renderMap(lat, lon, label) {
  const mapDiv = document.getElementById('map');
  mapDiv.classList.remove('hidden');

  if (!map) {
    map = L.map('map').setView([lat, lon], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  } else {
    map.setView([lat, lon], 11);
  }

  if (marker) marker.remove();
  marker = L.marker([lat, lon]).addTo(map).bindPopup(label).openPopup();
}

function renderNews(data) {
  const box = document.getElementById('newsBox');
  box.classList.remove('hidden');

  if (data.error) {
    box.innerHTML = `
      <div class="card-title">
        <h3>News</h3>
        <span class="badge">Error</span>
      </div>
      <p class="error">${data.error}</p>
    `;
    return;
  }

  const cityTitle = data.city || 'this city';
  const articles = data.articles || [];

  if (articles.length === 0) {
    box.innerHTML = `
      <div class="card-title">
        <h3>News about ${cityTitle}</h3>
        <span class="badge">0 results</span>
      </div>
      <p class="muted">No recent articles were returned for this query.</p>
      <p class="hint">Tip: try English spelling (e.g., “Almaty”, “Astana”).</p>
    `;
    return;
  }

  box.innerHTML = `
    <div class="card-title">
      <h3>News about ${cityTitle}</h3>
      <span class="badge">${articles.length}</span>
    </div>

    <div class="news-list">
      ${articles.map(a => `
        <a class="news-item" href="${a.url}" target="_blank" rel="noopener noreferrer">
          <div class="news-text">
            <div class="news-headline">${a.title}</div>
            <div class="news-meta">${a.source || 'source'} • ${fmtDate(a.date)}</div>
          </div>
          <div class="news-arrow">↗</div>
        </a>
      `).join('')}
    </div>
  `;
}

function renderCurrency(data) {
  const box = document.getElementById('currencyBox');
  box.classList.remove('hidden');

  if (data.error) {
    box.innerHTML = `
      <div class="card-title">
        <h3>Currency</h3>
        <span class="badge">Error</span>
      </div>
      <p class="error">${data.error}</p>
    `;
    return;
  }

  const base = data.currency;
  const rates = data.rates || {};

  // Most common currencies + base
  const common = ['USD', 'EUR', 'RUB', 'GBP', 'CNY', 'TRY', base].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  const list = common
    .filter(c => rates[c] !== undefined)
    .map(c => ({ code: c, val: rates[c] }));

  box.innerHTML = `
    <div class="card-title">
      <h3>Currency</h3>
      <span class="badge">${base}</span>
    </div>

    <div class="currency-main">
      <div class="muted">Country</div>
      <div class="currency-country">${data.country}</div>

      <div class="muted">Local currency</div>
      <div class="currency-local">${base}</div>

      <div class="muted">Updated</div>
      <div>${data.date || ''}</div>
    </div>

    <div class="currency-grid">
      ${list.map(item => `
        <div class="c-item ${item.code === base ? 'c-local' : ''}">
          <span>${item.code}</span>
          <b>${item.val}</b>
        </div>
      `).join('')}
    </div>

    <p class="hint">Base: 1 ${base}</p>
  `;
}

function setLoading() {
  const weatherBox = document.getElementById('weatherBox');
  const newsBox = document.getElementById('newsBox');
  const currencyBox = document.getElementById('currencyBox');

  weatherBox.classList.remove('hidden');
  weatherBox.innerHTML = `<p class="muted">Loading weather...</p>`;

  newsBox.classList.remove('hidden');
  newsBox.innerHTML = `<p class="muted">Loading news...</p>`;

  currencyBox.classList.remove('hidden');
  currencyBox.innerHTML = `<p class="muted">Loading currency...</p>`;
}

async function runSearch() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return;

  setLoading();

  const weather = await fetchWeather(city);
  if (weather.error) {
    alert(weather.error);
    return;
  }

  renderWeather(weather);
  renderMap(
    weather.coordinates.lat,
    weather.coordinates.lon,
    `${weather.city}, ${weather.country}`
  );

  const news = await fetchNews(weather.city, weather.country);
  renderNews(news);

  const currency = await fetchCurrency(weather.country);
  renderCurrency(currency);
}

document.getElementById('searchBtn').addEventListener('click', runSearch);
document.getElementById('cityInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runSearch();
});
