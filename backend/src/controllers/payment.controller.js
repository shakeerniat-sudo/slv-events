const db = require('../config/db');

exports.listPayments = async (req, res) => {
  try {
    const payments = await db.query(
      'SELECT p.*, e.name as event_name, v.name as vendor_name FROM payments p JOIN events e ON p.event_id = e.id LEFT JOIN vendors v ON p.vendor_id = v.id'
    );
    return res.status(200).json(payments);
  } catch (err) {
    console.error('List payments error:', err);
    return res.status(500).json({ message: 'Error retrieving payments list' });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const { eventId, type, vendorId, totalAmount, advance, balance, amount, dueDate, status, notes } = req.body;

    if (!eventId || !type || !dueDate || isNaN(amount)) {
      return res.status(400).json({ message: 'eventId, type, amount, and dueDate are required fields' });
    }

    const result = await db.query(
      'INSERT INTO payments (event_id, type, vendor_id, total_amount, advance, balance, amount, due_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        parseInt(eventId),
        type,
        vendorId ? parseInt(vendorId) : null,
        parseFloat(totalAmount) || 0,
        parseFloat(advance) || 0,
        parseFloat(balance) || 0,
        parseFloat(amount),
        dueDate,
        status || 'Pending',
        notes || ''
      ]
    );

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'CREATE_PAYMENT', `Added new ${type} payment entry (ID: ${result.insertId}) for event ${eventId}`]
    );

    return res.status(201).json({ message: 'Payment entry created successfully', paymentId: result.insertId });
  } catch (err) {
    console.error('Create payment error:', err);
    return res.status(500).json({ message: 'Error creating payment entry' });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, amount, dueDate, notes, advance, balance } = req.body;

    const payments = await db.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment entry not found' });
    }

    const currentPayment = payments[0];
    const paidAt = status === 'Paid' && currentPayment.status !== 'Paid' ? new Date().toISOString() : currentPayment.paid_at;

    // We can also dynamically update the balance/advance if provided
    let newBalance = balance !== undefined ? parseFloat(balance) : currentPayment.balance;
    let newAdvance = advance !== undefined ? parseFloat(advance) : currentPayment.advance;
    if (status === 'Paid' && currentPayment.type === 'client') {
      newAdvance = currentPayment.total_amount;
      newBalance = 0;
    }

    await db.query(
      'UPDATE payments SET status = ?, paid_at = ?, amount = ?, due_date = ?, notes = ?, advance = ?, balance = ? WHERE id = ?',
      [
        status,
        paidAt,
        amount !== undefined ? parseFloat(amount) : currentPayment.amount,
        dueDate || currentPayment.due_date,
        notes || currentPayment.notes,
        newAdvance,
        newBalance,
        id
      ]
    );

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'UPDATE_PAYMENT', `Updated payment entry (ID: ${id}) status to "${status}"`]
    );

    return res.status(200).json({ message: 'Payment entry updated successfully' });
  } catch (err) {
    console.error('Update payment error:', err);
    return res.status(500).json({ message: 'Error updating payment entry' });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const payments = await db.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment entry not found' });
    }

    await db.query('DELETE FROM payments WHERE id = ?', [id]);

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'DELETE_PAYMENT', `Deleted payment entry (ID: ${id})`]
    );

    return res.status(200).json({ message: 'Payment entry deleted successfully' });
  } catch (err) {
    console.error('Delete payment error:', err);
    return res.status(500).json({ message: 'Error deleting payment entry' });
  }
};
