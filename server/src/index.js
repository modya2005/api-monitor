require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const monitorRoutes = require('./routes/monitors');
const demoRoutes = require('./routes/demo');
const { requireAuth } = require('./middleware/auth');
const { startScheduler } = require('./services/scheduler');
const { runDueChecks } = require('./services/checker');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: false, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'api-monitor' }));
app.post('/api/internal/tick', async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const count = await runDueChecks();
    res.json({ ok: true, checked: count });
  } catch (e) { next(e); }
});
app.use('/api/auth', authRoutes);
app.use('/api/monitors', requireAuth, monitorRoutes);

if (process.env.ENABLE_DEMO_ENDPOINTS === 'true') app.use('/demo', demoRoutes);

// Serve the built React app from the same origin in production.
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => err && next(err));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[config] MONGODB_URI is required');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('[config] JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

mongoose.connect(MONGODB_URI).then(() => {
  console.log('[db] connected');
  app.listen(PORT, '0.0.0.0', () => console.log(`[http] listening on ${PORT}`));
  startScheduler();
}).catch((err) => {
  console.error('[db] connection failed:', err.message);
  process.exit(1);
});
