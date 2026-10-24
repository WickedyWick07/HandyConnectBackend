const express = require('express');
const router = express.Router();
const Notification = require('../models/Notifications');
const { authenticateJWT } = require('../middleware/authMiddleware');

const getUserId = (req) => req.user._id || req.user.id || req.user.userId;

router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = getUserId(req);
    const [items, unread] = await Promise.all([
      Notification.find({ user: userId }).sort('-createdAt').limit(50),
      Notification.countDocuments({ user: userId, read: false }),
    ]);
    res.json({ items, unread });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// must stay above /:id/read
router.patch('/read-all', authenticateJWT, async (req, res) => {
  try {
    await Notification.updateMany({ user: getUserId(req), read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
});

router.patch('/:id/read', authenticateJWT, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: getUserId(req) },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    res.json(n);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

module.exports = router;