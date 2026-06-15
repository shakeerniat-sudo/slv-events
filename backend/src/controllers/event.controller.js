const db = require('../config/db');

// List events with search, status filters
exports.listEvents = async (req, res) => {
  try {
    const { search, status, sort } = req.query;
    
    // We fetch all events with their clients
    const events = await db.query(
      'SELECT e.*, c.name as client_name, c.phone as client_phone, c.email as client_email FROM events e JOIN clients c ON e.client_id = c.id'
    );

    let filteredEvents = [...events];

    // Filter by search (name, venue, client name)
    if (search) {
      const q = search.toLowerCase();
      filteredEvents = filteredEvents.filter(e => 
        e.name.toLowerCase().includes(q) || 
        e.venue.toLowerCase().includes(q) || 
        e.client_name.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (status && status !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.status.toLowerCase() === status.toLowerCase());
    }

    // Sort
    if (sort) {
      if (sort === 'date_asc') {
        filteredEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      } else if (sort === 'date_desc') {
        filteredEvents.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
      } else if (sort === 'budget_desc') {
        filteredEvents.sort((a, b) => b.budget - a.budget);
      }
    } else {
      // Default sort by date ascending (upcoming first)
      filteredEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    }

    return res.status(200).json(filteredEvents);
  } catch (err) {
    console.error('List events error:', err);
    return res.status(500).json({ message: 'Error retrieving events' });
  }
};

// Get single event details including assignments and payments
exports.getEventDetail = async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    const events = await db.query(
      'SELECT e.*, c.name as client_name, c.phone as client_phone, c.email as client_email FROM events e JOIN clients c ON e.client_id = c.id WHERE e.id = ?',
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = events[0];

    // Get assigned vendors, staff, and payments in parallel
    const [vendors, staff, payments] = await Promise.all([
      db.query(
        "SELECT a.*, v.name as vendor_name, v.category as vendor_category, v.phone as vendor_phone, v.rating as vendor_rating FROM assignments a JOIN vendors v ON a.resource_id = v.id WHERE a.event_id = ? AND a.resource_type = 'vendor'",
        [eventId]
      ),
      db.query(
        "SELECT a.*, s.name as staff_name, s.role as staff_role, s.phone as staff_phone FROM assignments a JOIN staff s ON a.resource_id = s.id WHERE a.event_id = ? AND a.resource_type = 'staff'",
        [eventId]
      ),
      db.query(
        "SELECT * FROM payments WHERE event_id = ?",
        [eventId]
      )
    ]);

    return res.status(200).json({
      ...event,
      assignedVendors: vendors,
      assignedStaff: staff,
      payments
    });
  } catch (err) {
    console.error('Get event detail error:', err);
    return res.status(500).json({ message: 'Error retrieving event details' });
  }
};

// Create Event (and Client if doesn't exist)
exports.createEvent = async (req, res) => {
  try {
    const {
      name,
      clientName,
      clientPhone,
      clientEmail,
      eventType,
      eventDate,
      venue,
      budget,
      guestCount,
      themePreference,
      notes
    } = req.body;

    if (!name || !clientName || !clientPhone || !eventType || !eventDate || !venue || !budget) {
      return res.status(400).json({ message: 'Required event fields are missing' });
    }

    // 1. Check or Create Client
    let clientId;
    const existingClients = await db.query(
      'SELECT * FROM clients WHERE name = ? AND phone = ?',
      [clientName, clientPhone]
    );

    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
    } else {
      const clientResult = await db.query(
        'INSERT INTO clients (name, phone, email, company_name) VALUES (?, ?, ?, ?)',
        [clientName, clientPhone, clientEmail || '', '']
      );
      clientId = clientResult.insertId;
    }

    // 2. Create Event
    const eventResult = await db.query(
      'INSERT INTO events (name, client_id, event_type, event_date, venue, budget, guest_count, theme_preference, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        clientId,
        eventType,
        eventDate,
        venue,
        parseFloat(budget),
        parseInt(guestCount) || 0,
        themePreference || '',
        notes || '',
        'Pending'
      ]
    );
    const newEventId = eventResult.insertId;

    // 3. Create initial client payment tracker
    await db.query(
      'INSERT INTO payments (event_id, type, vendor_id, total_amount, advance, balance, amount, due_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newEventId,
        'client',
        null,
        parseFloat(budget),
        0.00,
        parseFloat(budget),
        parseFloat(budget),
        eventDate, // due date is event date by default
        'Pending',
        'Initial event budget payment'
      ]
    );

    // 4. Trigger notifications
    await db.query(
      'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
      [
        'New Event Created',
        `Event "${name}" scheduled for ${eventDate} at ${venue} has been registered.`,
        'Upcoming Event'
      ]
    );

    // 5. Activity log
    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'CREATE_EVENT', `Created event "${name}" (ID: ${newEventId}) for client "${clientName}"`]
    );

    return res.status(201).json({
      message: 'Event created successfully',
      eventId: newEventId
    });
  } catch (err) {
    console.error('Create event error:', err);
    return res.status(500).json({ message: 'Error creating event' });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const {
      name,
      eventType,
      eventDate,
      venue,
      budget,
      guestCount,
      themePreference,
      notes,
      status
    } = req.body;

    const events = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await db.query(
      'UPDATE events SET name = ?, event_type = ?, event_date = ?, venue = ?, budget = ?, guest_count = ?, theme_preference = ?, notes = ?, status = ? WHERE id = ?',
      [
        name,
        eventType,
        eventDate,
        venue,
        parseFloat(budget),
        parseInt(guestCount),
        themePreference || '',
        notes || '',
        status,
        eventId
      ]
    );

    // If status changed to Completed or Cancelled, notify
    if (status && status !== events[0].status) {
      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        [
          'Event Status Update',
          `Event "${name}" status changed to ${status}.`,
          'Upcoming Event'
        ]
      );
    }

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'UPDATE_EVENT', `Updated event "${name}" (ID: ${eventId}) details.`]
    );

    return res.status(200).json({ message: 'Event updated successfully' });
  } catch (err) {
    console.error('Update event error:', err);
    return res.status(500).json({ message: 'Error updating event' });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    const events = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await db.query('DELETE FROM events WHERE id = ?', [eventId]);

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'DELETE_EVENT', `Deleted event "${events[0].name}" (ID: ${eventId})`]
    );

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Delete event error:', err);
    return res.status(500).json({ message: 'Error deleting event' });
  }
};
