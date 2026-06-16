const db = require('../config/db');

// ==========================================
// VENDOR CONTROLLERS
// ==========================================

exports.listVendors = async (req, res) => {
  try {
    const { category, availability, search, page, limit } = req.query;
    const vendors = await db.query('SELECT * FROM vendors');
    
    let filtered = [...vendors];
    if (category && category !== 'all') {
      filtered = filtered.filter(v => v.category.toLowerCase() === category.toLowerCase());
    }
    if (availability && availability !== 'all') {
      filtered = filtered.filter(v => v.availability_status.toLowerCase() === availability.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(q) || 
        v.contact_person?.toLowerCase().includes(q)
      );
    }

    // Pagination (optional)
    if (page) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(offset, offset + limitNum);
      return res.status(200).json({
        data: paginated,
        total: filtered.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filtered.length / limitNum)
      });
    }

    return res.status(200).json(filtered);
  } catch (err) {
    console.error('List vendors error:', err);
    return res.status(500).json({ message: 'Error retrieving vendors' });
  }
};

exports.getVendorDetail = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vendors = await db.query('SELECT * FROM vendors WHERE id = ?', [id]);
    
    if (vendors.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Get assignments schedule
    const assignments = await db.query(
      "SELECT a.*, e.name as event_name, e.event_date, e.venue FROM assignments a JOIN events e ON a.event_id = e.id WHERE a.resource_type = 'vendor' AND a.resource_id = ?",
      [id]
    );

    return res.status(200).json({
      ...vendors[0],
      schedule: assignments
    });
  } catch (err) {
    console.error('Get vendor detail error:', err);
    return res.status(500).json({ message: 'Error retrieving vendor details' });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const { name, category, contactPerson, phone, email, serviceType, priceRange, rating } = req.body;

    if (!name || !category || !phone || !email) {
      return res.status(400).json({ message: 'Name, category, phone, and email are required fields' });
    }

    const result = await db.query(
      'INSERT INTO vendors (name, category, contact_person, phone, email, service_type, price_range, rating, availability_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        category,
        contactPerson || '',
        phone,
        email,
        serviceType || '',
        priceRange || 'Medium',
        parseFloat(rating) || 5.0,
        'Available'
      ]
    );

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'CREATE_VENDOR', `Added new vendor "${name}" under category "${category}"`]
    );

    return res.status(201).json({ message: 'Vendor created successfully', vendorId: result.insertId });
  } catch (err) {
    console.error('Create vendor error:', err);
    return res.status(500).json({ message: 'Error creating vendor' });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, contactPerson, phone, email, serviceType, priceRange, rating, availabilityStatus } = req.body;

    const vendors = await db.query('SELECT * FROM vendors WHERE id = ?', [id]);
    if (vendors.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await db.query(
      'UPDATE vendors SET name = ?, category = ?, contact_person = ?, phone = ?, email = ?, service_type = ?, price_range = ?, rating = ?, availability_status = ? WHERE id = ?',
      [
        name,
        category,
        contactPerson || '',
        phone,
        email,
        serviceType || '',
        priceRange || 'Medium',
        parseFloat(rating),
        availabilityStatus || 'Available',
        id
      ]
    );

    return res.status(200).json({ message: 'Vendor updated successfully' });
  } catch (err) {
    console.error('Update vendor error:', err);
    return res.status(500).json({ message: 'Error updating vendor' });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vendors = await db.query('SELECT * FROM vendors WHERE id = ?', [id]);
    if (vendors.length === 0) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await db.query('DELETE FROM vendors WHERE id = ?', [id]);

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'DELETE_VENDOR', `Deleted vendor "${vendors[0].name}" (ID: ${id})`]
    );

    return res.status(200).json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    console.error('Delete vendor error:', err);
    return res.status(500).json({ message: 'Error deleting vendor' });
  }
};

// ==========================================
// STAFF CONTROLLERS
// ==========================================

exports.listStaff = async (req, res) => {
  try {
    const { role, availability, search, page, limit } = req.query;
    const staff = await db.query('SELECT * FROM staff');
    
    let filtered = [...staff];
    if (role && role !== 'all') {
      filtered = filtered.filter(s => s.role.toLowerCase() === role.toLowerCase());
    }
    if (availability && availability !== 'all') {
      filtered = filtered.filter(s => s.availability_status.toLowerCase() === availability.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.role.toLowerCase().includes(q)
      );
    }

    // Pagination (optional)
    if (page) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(offset, offset + limitNum);
      return res.status(200).json({
        data: paginated,
        total: filtered.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filtered.length / limitNum)
      });
    }

    return res.status(200).json(filtered);
  } catch (err) {
    console.error('List staff error:', err);
    return res.status(500).json({ message: 'Error retrieving staff list' });
  }
};

exports.getStaffDetail = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const staff = await db.query('SELECT * FROM staff WHERE id = ?', [id]);
    
    if (staff.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Get assignments schedule
    const assignments = await db.query(
      "SELECT a.*, e.name as event_name, e.event_date, e.venue FROM assignments a JOIN events e ON a.event_id = e.id WHERE a.resource_type = 'staff' AND a.resource_id = ?",
      [id]
    );

    return res.status(200).json({
      ...staff[0],
      schedule: assignments
    });
  } catch (err) {
    console.error('Get staff detail error:', err);
    return res.status(500).json({ message: 'Error retrieving staff details' });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const { name, role, phone, experienceYears } = req.body;

    if (!name || !role || !phone) {
      return res.status(400).json({ message: 'Name, role, and phone are required fields' });
    }

    const result = await db.query(
      'INSERT INTO staff (name, role, phone, experience_years, availability_status) VALUES (?, ?, ?, ?, ?)',
      [
        name,
        role,
        phone,
        parseInt(experienceYears) || 0,
        'Available'
      ]
    );

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'CREATE_STAFF', `Added staff member "${name}" as "${role}"`]
    );

    return res.status(201).json({ message: 'Staff member created successfully', staffId: result.insertId });
  } catch (err) {
    console.error('Create staff error:', err);
    return res.status(500).json({ message: 'Error creating staff' });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, role, phone, experienceYears, availabilityStatus } = req.body;

    const staff = await db.query('SELECT * FROM staff WHERE id = ?', [id]);
    if (staff.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await db.query(
      'UPDATE staff SET name = ?, role = ?, phone = ?, experience_years = ?, availability_status = ? WHERE id = ?',
      [
        name,
        role,
        phone,
        parseInt(experienceYears),
        availabilityStatus || 'Available',
        id
      ]
    );

    return res.status(200).json({ message: 'Staff updated successfully' });
  } catch (err) {
    console.error('Update staff error:', err);
    return res.status(500).json({ message: 'Error updating staff info' });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const staff = await db.query('SELECT * FROM staff WHERE id = ?', [id]);
    if (staff.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await db.query('DELETE FROM staff WHERE id = ?', [id]);

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'DELETE_STAFF', `Deleted staff member "${staff[0].name}" (ID: ${id})`]
    );

    return res.status(200).json({ message: 'Staff member deleted successfully' });
  } catch (err) {
    console.error('Delete staff error:', err);
    return res.status(500).json({ message: 'Error deleting staff' });
  }
};
