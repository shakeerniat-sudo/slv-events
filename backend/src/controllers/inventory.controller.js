const db = require('../config/db');

exports.listInventory = async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM inventory');
    return res.status(200).json(items);
  } catch (err) {
    console.error('List inventory error:', err);
    return res.status(500).json({ message: 'Error retrieving inventory list' });
  }
};

exports.createInventoryItem = async (req, res) => {
  try {
    const { itemName, quantity, status } = req.body;

    if (!itemName || isNaN(quantity)) {
      return res.status(400).json({ message: 'itemName and quantity are required fields' });
    }

    const qty = parseInt(quantity);
    const result = await db.query(
      'INSERT INTO inventory (item_name, quantity, available_quantity, status) VALUES (?, ?, ?, ?)',
      [
        itemName,
        qty,
        qty, // initially all are available
        status || 'In Stock'
      ]
    );

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'CREATE_INVENTORY', `Added new inventory item "${itemName}" (Qty: ${qty})`]
    );

    return res.status(201).json({ message: 'Inventory item added successfully', itemId: result.insertId });
  } catch (err) {
    console.error('Create inventory error:', err);
    return res.status(500).json({ message: 'Error adding inventory item' });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { itemName, quantity, availableQuantity, status } = req.body;

    const items = await db.query('SELECT * FROM inventory WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const current = items[0];

    const qty = quantity !== undefined ? parseInt(quantity) : current.quantity;
    const availQty = availableQuantity !== undefined ? parseInt(availableQuantity) : current.available_quantity;

    await db.query(
      'UPDATE inventory SET item_name = ?, quantity = ?, available_quantity = ?, status = ? WHERE id = ?',
      [
        itemName || current.item_name,
        qty,
        availQty,
        status || current.status,
        id
      ]
    );

    return res.status(200).json({ message: 'Inventory item updated successfully' });
  } catch (err) {
    console.error('Update inventory error:', err);
    return res.status(500).json({ message: 'Error updating inventory item' });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const items = await db.query('SELECT * FROM inventory WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await db.query('DELETE FROM inventory WHERE id = ?', [id]);

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'DELETE_INVENTORY', `Deleted inventory item "${items[0].item_name}" (ID: ${id})`]
    );

    return res.status(200).json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    console.error('Delete inventory error:', err);
    return res.status(500).json({ message: 'Error deleting inventory item' });
  }
};
