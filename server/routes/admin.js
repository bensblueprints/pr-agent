import express from 'express';
import db from '../db.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken, requireAdmin);

// List all users
router.get('/users', (req, res) => {
  const users = db.prepare(
    'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ users });
});

// Stats
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const admins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
  res.json({ totalUsers: total.count, adminUsers: admins.count });
});

// Delete any user (admin action)
router.post('/delete-user', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself via admin panel' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ success: true });
});

export default router;
