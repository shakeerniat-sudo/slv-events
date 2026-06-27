const db = require('../config/db');
const AutomationService = require('../services/automation.service');

exports.listNotifications = async (req, res) => {
  try {
    // Synchronize automated warnings and follow-ups dynamically
    await AutomationService.syncAutomatedNotifications();
    
    const list = await db.query('SELECT * FROM notifications WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY created_at DESC');
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

exports.deleteNotification = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.query('UPDATE notifications SET is_deleted = 1 WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ message: 'Error deleting notification' });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_deleted = 1');
    return res.status(200).json({ message: 'All notifications cleared successfully' });
  } catch (err) {
    console.error('Delete all notifications error:', err);
    return res.status(500).json({ message: 'Error clearing notifications' });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    const result = await db.query(
      'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
      [title, message, type || 'Upcoming Event']
    );
    return res.status(201).json({
      message: 'Notification created successfully',
      notificationId: result.insertId
    });
  } catch (err) {
    console.error('[NOTIFICATION CONTROLLER ERROR] Create notification error:', err);
    return res.status(500).json({ message: 'Error creating notification', error: err.message });
  }
};
