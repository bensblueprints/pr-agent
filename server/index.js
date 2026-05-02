import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/auth', (await import('./routes/auth.js')).default);
app.use('/api/admin', (await import('./routes/admin.js')).default);
app.use('/api/chat', (await import('./routes/chat.js')).default);
app.use('/api/publications', (await import('./routes/publications.js')).default);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve static frontend
const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
