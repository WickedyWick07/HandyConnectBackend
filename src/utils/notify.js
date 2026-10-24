const Notification = require('../models/Notifications');
const { getIO } = require('./socketStore');

const notify = async ({ userId, type = 'system', title, message = '', link = '' }) => {
  try {
    const notification = await Notification.create({ user: userId, type, title, message, link });

    const io = getIO();
    console.log(`NOTIFY saved for user ${userId}, io available: ${!!io}`);
    io?.to(String(userId)).emit('notification', notification);

    return notification;
  } catch (err) {
    console.error('notify failed:', err.message);
    return null;
  }
};

module.exports = { notify };