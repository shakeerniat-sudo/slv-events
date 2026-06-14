const db = require('../config/db');

exports.listNotifications = async (req, res) => {
  try {
    const list = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    return res.status(200).json(list);
  } catch (err) {
    console.error('List notifications error:', err);
    return res.status(500).json({ message: 'Error retrieving notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.query(
      'UPDATE notifications SET is_read = ? WHERE id = ?',
      [1, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark read notification error:', err);
    return res.status(500).json({ message: 'Error updating notification status' });
  }
};
