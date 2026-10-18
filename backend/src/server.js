/* ============================================================
   server.js — entry point for the self-hosted Vertex Maths API.
   Serves JSON only; the static site itself is deployed separately
   (e.g. GitHub Pages, nginx, any static host) and talks to this
   over HTTP via js/api-client.js.
   ============================================================ */
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const topicStatusRoutes = require('./routes/topicStatus');
const practiceSessionsRoutes = require('./routes/practiceSessions');
const teacherRoutes = require('./routes/teacher');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/topic-status', topicStatusRoutes);
app.use('/api/practice-sessions', practiceSessionsRoutes);
app.use('/api/teacher', teacherRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Vertex Maths backend listening on :${PORT}`);
  if (!allowedOrigins.length) {
    console.warn('ALLOWED_ORIGINS is not set — all cross-origin requests will be rejected by CORS.');
  }
});
