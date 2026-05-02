import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const API_BASE = 'https://api.x.ai/v1/chat/completions';
const API_KEY = process.env.XAI_API_KEY;

router.use(verifyToken);

// Proxy chat completions to xAI
router.post('/completions', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'XAI_API_KEY not configured' });
  }

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Proxy failed' });
  }
});

export default router;
