// ================================================================
// server.js
//
// ROUTES:
//   GET  /                         → serves index.html
//   POST /contact                  → contact form email
//   GET  /api/instagram            → latest IG posts (cached 15min)
//   GET  /api/instagram/refresh    → refresh IG token
//   GET  /api/journey              → all journey entries (admin auth)
//   POST /api/journey              → add entry + photo (admin auth)
//   DELETE /api/journey/:id        → delete entry (admin auth)
//   GET  /api/journey/public       → entries for public site (no auth)
//   GET  /api/spotify/now-playing  → currently playing track
//   GET  /api/spotify/top          → top artists + tracks
//   GET  /api/spotify/auth         → start OAuth (visit in browser once)
//   GET  /api/spotify/callback     → OAuth callback
// ================================================================

const express    = require('express');
const nodemailer = require('nodemailer');
const path       = require('path');
const https      = require('https');
const http       = require('http');
const fs         = require('fs');
const crypto     = require('crypto');
require('dotenv').config();

let multer;
try {
  multer = require('multer');
} catch (e) {
  console.warn('⚠  multer not installed — run: npm install multer');
}

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// ================================================================
// MULTER — photo uploads → public/images/journey/
// ================================================================
let upload;
if (multer) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, 'public', 'images', 'journey');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      cb(null, name);
    }
  });
  upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ok = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      cb(null, ok.includes(path.extname(file.originalname).toLowerCase()));
    }
  });
}


// ================================================================
// JOURNEY DATA  →  data/journey.json
// ================================================================
const JOURNEY_FILE = path.join(__dirname, 'data', 'journey.json');

function readJourney() {
  try {
    fs.mkdirSync(path.dirname(JOURNEY_FILE), { recursive: true });
    if (!fs.existsSync(JOURNEY_FILE)) fs.writeFileSync(JOURNEY_FILE, '[]');
    return JSON.parse(fs.readFileSync(JOURNEY_FILE, 'utf8'));
  } catch (e) { return []; }
}

function writeJourney(entries) {
  fs.mkdirSync(path.dirname(JOURNEY_FILE), { recursive: true });
  fs.writeFileSync(JOURNEY_FILE, JSON.stringify(entries, null, 2));
}

function requireAdmin(req, res, next) {
  const pw = req.headers['x-admin-password'];
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Public — no auth needed, returns entries for the main site
app.get('/api/journey/public', (req, res) => {
  res.json(readJourney());
});

// Admin — get all entries
app.get('/api/journey', requireAdmin, (req, res) => {
  res.json(readJourney());
});

// Admin — add entry
app.post('/api/journey', requireAdmin, (req, res, next) => {
  if (upload) {
    upload.single('photo')(req, res, err => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  } else { next(); }
}, (req, res) => {
  const { date, weight, badge, badgeStyle, note } = req.body;
  if (!date || !weight) return res.status(400).json({ error: 'Date and weight required.' });

  const entries = readJourney();
  const entry = {
    id:         crypto.randomBytes(8).toString('hex'),
    date,
    weight:     parseFloat(weight),
    badge:      badge || '',
    badgeStyle: badgeStyle || 'normal',
    note:       note || '',
    photo:      req.file ? `/images/journey/${req.file.filename}` : null,
    createdAt:  new Date().toISOString()
  };
  entries.unshift(entry);
  writeJourney(entries);
  console.log(`📝 Journey: ${date} — ${weight} lbs`);
  res.status(201).json(entry);
});

// Admin — delete entry
app.delete('/api/journey/:id', requireAdmin, (req, res) => {
  let entries = readJourney();
  const entry = entries.find(e => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found.' });
  if (entry.photo) {
    const p = path.join(__dirname, 'public', entry.photo);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  writeJourney(entries.filter(e => e.id !== req.params.id));
  res.json({ success: true });
});


// ================================================================
// SPOTIFY
//
// ★ SETUP (one-time, ~5 minutes):
//   1. https://developer.spotify.com/dashboard → Create App
//      Redirect URI: http://localhost:3000/api/spotify/callback
//      APIs: check "Web API"
//   2. Copy Client ID + Client Secret into .env:
//        SPOTIFY_CLIENT_ID=...
//        SPOTIFY_CLIENT_SECRET=...
//        SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
//   3. Start server → visit: http://localhost:3000/api/spotify/auth
//   4. Authorize → refresh token printed to console
//   5. Add to .env:  SPOTIFY_REFRESH_TOKEN=...
//   6. Restart server — done!
//
// For production: change SPOTIFY_REDIRECT_URI to your live URL,
// add it in the Spotify dashboard, and redo steps 3-5 once.
// ================================================================

let spotifyAccessToken  = null;
let spotifyTokenExpires = 0;
const spotifyCache      = {};

function spotifyBase64() {
  return Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
}

function spotifyConfigured() {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_REFRESH_TOKEN);
}

function fetchOptions(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const req    = lib.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   opts.method || 'GET',
      headers:  opts.headers || {}
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (!raw.trim()) return resolve({ _status: res.statusCode });
        try { resolve({ ...JSON.parse(raw), _status: res.statusCode }); }
        catch { resolve({ raw, _status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function getSpotifyToken() {
  if (spotifyAccessToken && Date.now() < spotifyTokenExpires - 60000) return spotifyAccessToken;

  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(process.env.SPOTIFY_REFRESH_TOKEN)}`;
  const data = await fetchOptions('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization':  `Basic ${spotifyBase64()}`,
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    },
    body
  });

  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));
  spotifyAccessToken  = data.access_token;
  spotifyTokenExpires = Date.now() + data.expires_in * 1000;
  return spotifyAccessToken;
}

// One-time auth — visit in browser to get refresh token
app.get('/api/spotify/auth', (req, res) => {
  if (!process.env.SPOTIFY_CLIENT_ID) return res.send('Add SPOTIFY_CLIENT_ID to .env first.');
  const scopes = 'user-read-currently-playing user-read-playback-state user-top-read user-read-recently-played';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.SPOTIFY_CLIENT_ID,
    scope:         scopes,
    redirect_uri:  process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${PORT}/api/spotify/callback`
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

app.get('/api/spotify/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.send('Auth failed: ' + (error || 'no code'));

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${PORT}/api/spotify/callback`;
  const body = `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  const data = await fetchOptions('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization':  `Basic ${spotifyBase64()}`,
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    },
    body
  });

  if (!data.refresh_token) return res.send('Failed: ' + JSON.stringify(data));

  console.log('\n★ SPOTIFY REFRESH TOKEN — add to .env:');
  console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`);

  spotifyAccessToken  = data.access_token;
  spotifyTokenExpires = Date.now() + data.expires_in * 1000;

  res.send(`
    <h2 style="font-family:sans-serif">✅ Spotify connected!</h2>
    <p style="font-family:sans-serif">Refresh token printed to server console.</p>
    <p style="font-family:sans-serif">Copy it into .env as <code>SPOTIFY_REFRESH_TOKEN</code>, then restart the server.</p>
    <a href="/">← Back to site</a>
  `);
});

// Now playing — cached 30s
app.get('/api/spotify/now-playing', async (req, res) => {
  if (!spotifyConfigured()) return res.status(503).json({ error: 'not_configured' });

  const now = Date.now();
  if (spotifyCache.np && now - spotifyCache.npAt < 30000) return res.json(spotifyCache.np);

  try {
    const token = await getSpotifyToken();
    const data  = await fetchOptions('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (data._status === 204 || !data.item) {
      spotifyCache.np   = { isPlaying: false };
      spotifyCache.npAt = now;
      return res.json(spotifyCache.np);
    }

    const result = {
      isPlaying:  data.is_playing,
      track:      data.item.name,
      artist:     data.item.artists.map(a => a.name).join(', '),
      album:      data.item.album.name,
      albumArt:   data.item.album.images[0]?.url || null,
      url:        data.item.external_urls.spotify,
      progressMs: data.progress_ms,
      durationMs: data.item.duration_ms
    };
    spotifyCache.np   = result;
    spotifyCache.npAt = now;
    res.json(result);
  } catch (err) {
    console.error('Spotify now-playing:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Top artists + tracks — cached 1hr
// ?range=short_term (4 weeks) | medium_term (6 months) | long_term (all time)
app.get('/api/spotify/top', async (req, res) => {
  if (!spotifyConfigured()) return res.status(503).json({ error: 'not_configured' });

  const range = ['short_term', 'medium_term', 'long_term'].includes(req.query.range)
    ? req.query.range : 'short_term';
  const key = `top_${range}`;
  const now = Date.now();

  if (spotifyCache[key] && now - spotifyCache[key + 'At'] < 3600000) return res.json(spotifyCache[key]);

  try {
    const token = await getSpotifyToken();
    const [artists, tracks] = await Promise.all([
      fetchOptions(`https://api.spotify.com/v1/me/top/artists?limit=6&time_range=${range}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetchOptions(`https://api.spotify.com/v1/me/top/tracks?limit=6&time_range=${range}`,  { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const result = {
      range,
      artists: (artists.items || []).map(a => ({
        name:   a.name,
        image:  a.images[0]?.url || null,
        genres: a.genres.slice(0, 2),
        url:    a.external_urls.spotify
      })),
      tracks: (tracks.items || []).map(t => ({
        name:     t.name,
        artist:   t.artists.map(a => a.name).join(', '),
        album:    t.album.name,
        albumArt: t.album.images[0]?.url || null,
        url:      t.external_urls.spotify
      }))
    };

    spotifyCache[key]        = result;
    spotifyCache[key + 'At'] = now;
    res.json(result);
  } catch (err) {
    console.error('Spotify top:', err.message);
    res.status(502).json({ error: err.message });
  }
});


// ================================================================
// INSTAGRAM
// ================================================================
let igCache = { data: null, fetchedAt: 0 };

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

app.get('/api/instagram', async (req, res) => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token || token === 'your_token_here') return res.status(503).json({ error: 'INSTAGRAM_TOKEN not configured' });

  const now = Date.now();
  if (igCache.data && now - igCache.fetchedAt < 15 * 60 * 1000) return res.json(igCache.data);

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const data   = await fetchJSON(`https://graph.instagram.com/me/media?fields=${fields}&limit=6&access_token=${token}`);
    if (data.error) return res.status(502).json({ error: data.error.message });
    igCache = { data, fetchedAt: now };
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch Instagram posts.' });
  }
});

app.get('/api/instagram/refresh', async (req, res) => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return res.status(400).send('No token.');
  try {
    const data = await fetchJSON(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
    if (data.access_token) {
      console.log('\n★ NEW INSTAGRAM TOKEN:', data.access_token);
      res.send('<h2>Done! Check server console for new token.</h2>');
    } else {
      res.status(400).send(JSON.stringify(data));
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// ================================================================
// CONTACT FORM
// ================================================================
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'All fields required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email.' });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from:    `"${name}" <${process.env.EMAIL_USER}>`,
      to:      process.env.EMAIL_TO,
      replyTo: email,
      subject: `Portfolio contact from ${name}`,
      text:    `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
      html:    `<div style="font-family:sans-serif;max-width:520px"><h2 style="color:#5C7A52">New Message</h2><p><strong>From:</strong> ${name} &lt;${email}&gt;</p><hr/><p style="white-space:pre-wrap">${message}</p></div>`
    });
    console.log(`📬 Contact from ${name}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});


// ================================================================
// HOME + 404
// ================================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((req, res) => res.status(404).send('Not found.'));

app.listen(PORT, () => {
  console.log(`✅  http://localhost:${PORT}`);
  console.log(`🔐  Admin: http://localhost:${PORT}/admin.html`);
});