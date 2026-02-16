const express = require("express");
const axios = require("axios");
const router = express.Router();

function pickLanguages(countryCode) {
  // For KZ and CIS, Russian results are often better
  const ruFirst = ["KZ", "RU", "BY", "UA", "KG", "UZ", "TJ", "AM", "AZ", "GE", "MD"];
  return ruFirst.includes(String(countryCode || "").toUpperCase())
    ? ["ru", "en"]
    : ["en", "ru"];
}

function normalizeCity(city) {
  return String(city || "").trim();
}

function normalizeCountry(country) {
  return String(country || "").trim().toUpperCase();
}

function mapArticles(articles) {
  return (articles || [])
    .filter(a => a && (a.title || a.url))
    .map(a => ({
      title: a.title || "Untitled",
      url: a.url,
      source: a.source?.name || a.source || "source",
      date: a.publishedAt || a.published_at || a.date || ""
    }));
}

async function tryGNews({ q, lang, max = 8 }) {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return { ok: false, error: "Missing GNEWS_API_KEY" };

  // GNews: https://gnews.io/docs/
  const url = "https://gnews.io/api/v4/search";
  const params = {
    q,
    lang,
    max,
    token: apiKey
  };

  try {
    const r = await axios.get(url, { params, timeout: 12000 });
    const data = r.data;
    const articles = (data.articles || []).map(a => ({
      title: a.title,
      url: a.url,
      source: a.source?.name,
      date: a.publishedAt
    }));
    return { ok: true, articles };
  } catch (e) {
    // keep error message minimal for frontend, log details for debugging
    console.error("GNews error:", e.response?.status, e.response?.data || e.message);
    return { ok: false, error: `GNews error (${e.response?.status || "no-status"})` };
  }
}

async function tryNewsAPI({ q, lang, max = 8 }) {
  const apiKey = process.env.NEWSAPI_API_KEY;
  if (!apiKey) return { ok: false, error: "Missing NEWSAPI_API_KEY" };

  // NewsAPI: https://newsapi.org/docs
  const url = "https://newsapi.org/v2/everything";
  const params = {
    q,
    language: lang,
    pageSize: max,
    sortBy: "publishedAt",
    apiKey
  };

  try {
    const r = await axios.get(url, { params, timeout: 12000 });
    const data = r.data;
    const articles = (data.articles || []).map(a => ({
      title: a.title,
      url: a.url,
      source: a.source?.name,
      date: a.publishedAt
    }));
    return { ok: true, articles };
  } catch (e) {
    console.error("NewsAPI error:", e.response?.status, e.response?.data || e.message);
    return { ok: false, error: `NewsAPI error (${e.response?.status || "no-status"})` };
  }
}

async function findNews(city, countryCode) {
  const langs = pickLanguages(countryCode);

  // 2 levels of query: strict and broad
  const strictQuery = `"${city}"`;                 // exact phrase
  const broadQuery = countryCode
    ? `"${city}" OR ${city} ${countryCode}`       // broader (helps KZ cities)
    : `"${city}" OR ${city}`;

  // 1) strict -> GNews -> NewsAPI, languages in order
  for (const lang of langs) {
    const g1 = await tryGNews({ q: strictQuery, lang });
    if (g1.ok && g1.articles.length) return { provider: "GNews", articles: g1.articles };

    const n1 = await tryNewsAPI({ q: strictQuery, lang });
    if (n1.ok && n1.articles.length) return { provider: "NewsAPI", articles: n1.articles };
  }

  // 2) broad -> GNews -> NewsAPI, languages in order
  for (const lang of langs) {
    const g2 = await tryGNews({ q: broadQuery, lang });
    if (g2.ok && g2.articles.length) return { provider: "GNews", articles: g2.articles };

    const n2 = await tryNewsAPI({ q: broadQuery, lang });
    if (n2.ok && n2.articles.length) return { provider: "NewsAPI", articles: n2.articles };
  }

  return { provider: "none", articles: [] };
}

router.get("/", async (req, res) => {
  const city = normalizeCity(req.query.city);
  const country = normalizeCountry(req.query.country);

  if (!city) return res.status(400).json({ error: "City is required" });

  try {
    const result = await findNews(city, country);

    return res.status(200).json({
      city,
      country,
      provider: result.provider,
      articles: mapArticles(result.articles)
    });
  } catch (e) {
    console.error("News route error:", e.message);
    return res.status(500).json({ error: "News backend error" });
  }
});

module.exports = router;
