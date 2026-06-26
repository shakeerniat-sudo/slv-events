const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'slv_events_secret_key_123456';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return token + user info (excluding password hash)
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      isDemo: db.isDemo()
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Database/Server error during login' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const validRoles = ['Admin', 'Vendor Coordinator', 'Operations Lead', 'Finance Team'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check email availability
    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role]
    );

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [null, 'System', 'REGISTER_USER', `Created user account for ${name} (${role})`]
    );

    return res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Database/Server error during registration' });
  }
};

exports.getMe = async (req, res) => {
  try {
    // req.user is populated by the auth middleware
    return res.status(200).json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      isDemo: db.isDemo()
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await db.query('SELECT id, name, email, role, created_at FROM users');
    return res.status(200).json(users);
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ message: 'Error retrieving users list' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role, password } = req.body;

    const users = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = users[0];
    let passwordHash = currentUser.password_hash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    await db.query(
      'UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?',
      [
        name || currentUser.name,
        email || currentUser.email,
        role || currentUser.role,
        passwordHash,
        id
      ]
    );

    return res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ message: 'Error updating user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (req.user && req.user.id === id) {
      return res.status(400).json({ message: 'Cannot delete your own active admin account' });
    }

    const users = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ message: 'Error deleting user' });
  }
};
