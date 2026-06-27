const db = require('../config/db');
const AutomationService = require('../services/automation.service');

const formatDateString = (dateInput) => {
  if (!dateInput) return null;
  const str = dateInput.toString();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  try {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}
  return dateInput;
};


// List events with search, status filters
exports.listEvents = async (req, res) => {
  try {
    const { search, status, sort, page, limit } = req.query;
    
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
      filteredEvents = filteredEvents.filter(e => e.status && e.status.toLowerCase() === status.toLowerCase());
    } else if (status === 'all') {
      filteredEvents = filteredEvents.filter(e => !e.status || (e.status.toLowerCase() !== 'new' && e.status.toLowerCase() !== 'rejected'));
    }

    // Sort
    if (sort) {
      if (sort === 'date_asc') {
        filteredEvents.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
      } else if (sort === 'date_desc') {
        filteredEvents.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
      } else if (sort === 'budget_desc') {
        filteredEvents.sort((a, b) => b.budget - a.budget);
      }
    } else {
      // Default sort by date ascending (upcoming first)
      filteredEvents.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    }

    // Pagination (optional)
    if (page) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;
      const paginatedEvents = filteredEvents.slice(offset, offset + limitNum);
      return res.status(200).json({
        data: paginatedEvents,
        total: filteredEvents.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filteredEvents.length / limitNum)
      });
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
      payments,
      tasks: event.tasks ? JSON.parse(event.tasks) : [],
      inventory: event.inventory ? JSON.parse(event.inventory) : [],
      ops_logs: event.ops_logs ? JSON.parse(event.ops_logs) : [],
      photos: event.photos ? JSON.parse(event.photos) : []
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
      'INSERT INTO events (name, client_id, event_type, eventDate, venue, budget, guest_count, theme_preference, notes, status, tasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        clientId,
        eventType,
        formatDateString(eventDate),
        venue,
        parseFloat(budget),
        parseInt(guestCount) || 0,
        themePreference || '',
        notes || '',
        'Pending',
        JSON.stringify([])
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
        formatDateString(eventDate), // due date is event date by default
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

    // Generate event summary & sync automated warnings
    await AutomationService.generateEventSummary(newEventId);
    await AutomationService.syncAutomatedNotifications();

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
      status,
      workflow_stage,
      workflow_mode,
      event_time,
      tasks,
      inventory,
      ops_logs,
      photos,
      coordinator_id,
      operations_lead_id,
      finance_team_id
    } = req.body;

    const events = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const currentEvent = events[0];
    const tasksString = tasks !== undefined ? (typeof tasks === 'string' ? tasks : JSON.stringify(tasks)) : (currentEvent.tasks || null);
    const inventoryString = inventory !== undefined ? (typeof inventory === 'string' ? inventory : JSON.stringify(inventory)) : (currentEvent.inventory || null);
    const opsLogsString = ops_logs !== undefined ? (typeof ops_logs === 'string' ? ops_logs : JSON.stringify(ops_logs)) : (currentEvent.ops_logs || null);
    const photosString = photos !== undefined ? (typeof photos === 'string' ? photos : JSON.stringify(photos)) : (currentEvent.photos || null);

    const parseAssignmentId = (val) => {
      if (val === undefined) return undefined;
      if (val === null || val === '' || val === 'null' || val === 'undefined') return null;
      return parseInt(val) || null;
    };

    const coordId = parseAssignmentId(coordinator_id);
    const opsId = parseAssignmentId(operations_lead_id);
    const finId = parseAssignmentId(finance_team_id);

    await db.query(
      'UPDATE events SET name = ?, event_type = ?, eventDate = ?, venue = ?, budget = ?, guest_count = ?, theme_preference = ?, notes = ?, status = ?, workflow_stage = ?, workflow_mode = ?, event_time = ?, tasks = ?, inventory = ?, ops_logs = ?, photos = ?, coordinator_id = ?, operations_lead_id = ?, finance_team_id = ? WHERE id = ?',
      [
        name || currentEvent.name,
        eventType || currentEvent.event_type,
        formatDateString(eventDate || currentEvent.eventDate),
        venue || currentEvent.venue,
        parseFloat(budget !== undefined ? budget : currentEvent.budget),
        parseInt(guestCount !== undefined ? guestCount : currentEvent.guest_count),
        themePreference !== undefined ? themePreference : (currentEvent.theme_preference || ''),
        notes !== undefined ? notes : (currentEvent.notes || ''),
        status || currentEvent.status,
        workflow_stage !== undefined ? parseInt(workflow_stage) : (currentEvent.workflow_stage || 1),
        workflow_mode || currentEvent.workflow_mode || 'Automatic',
        event_time || currentEvent.event_time || '10:00 AM - 04:00 PM',
        tasksString,
        inventoryString,
        opsLogsString,
        photosString,
        coordId !== undefined ? coordId : currentEvent.coordinator_id,
        opsId !== undefined ? opsId : currentEvent.operations_lead_id,
        finId !== undefined ? finId : currentEvent.finance_team_id,
        eventId
      ]
    );

    // If status changed, check transition and notify
    if (status && status !== currentEvent.status) {
      const prevStatus = currentEvent.status;
      
      // Check if transitioning from "New" to confirm/reject
      if (prevStatus && prevStatus.toLowerCase() === 'new') {
        // Fetch client details
        const clients = await db.query('SELECT * FROM clients WHERE id = ?', [currentEvent.client_id]);
        const client = clients[0] || {};
        const clientName = client.name || 'Client';
        const clientPhone = client.phone || 'N/A';
        const clientEmail = client.email || 'N/A';
        const eventName = name || currentEvent.name;

        let formattedDate = 'N/A';
        if (currentEvent.eventDate) {
          try {
            formattedDate = new Date(currentEvent.eventDate).toLocaleDateString('en-GB');
          } catch (dErr) {
            console.error('Date format error:', dErr);
          }
        }

        if (status.toLowerCase() === 'cancelled' || status.toLowerCase() === 'rejected') {
          // Rejection Outbox Messages
          const waMsg = `Hello ${clientName}\n\nYour booking request was not approved.\n\nPlease contact SLV Events for more information.`;
          const mailMsg = `Hello ${clientName},\n\nUnfortunately your booking request has not been approved.\n\nPlease contact us for more information.\n\nThank you,\nSLV Events`;

          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            [`[WhatsApp Outbox] Booking Update`, waMsg, 'Upcoming Event']
          );
          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            [`[Email Outbox] SLV Events Booking Update`, mailMsg, 'Upcoming Event']
          );
          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            [`Booking Rejected`, `❌ Booking request "${eventName}" has been rejected.`, 'Upcoming Event']
          );
          
          // Activity Log for Rejection
          const userName = req.user ? req.user.name : 'System';
          const userId = req.user ? req.user.id : null;
          await db.query(
            'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
            [userId, userName, 'REJECT_BOOKING', `Rejected booking "${eventName}" (ID: ${eventId}) for client "${clientName}"`]
          );
        } else {
          // Confirmation Outbox Messages
          const waMsg = `Hello ${clientName}\n\nYour event booking has been confirmed.\n\nBooking ID: SLV-EV-${eventId}\nDate: ${formattedDate}\nVenue: ${currentEvent.venue}\n\nThank you for choosing SLV Events.`;
          const mailMsg = `Hello ${clientName},\n\nYour booking has been confirmed.\n\nBooking ID: SLV-EV-${eventId}\nEvent: ${eventName}\nDate: ${formattedDate}\nVenue: ${currentEvent.venue}\n\nOur team will contact you shortly.\n\nThank you,\nSLV Events`;

          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            [`[WhatsApp Outbox] Booking Confirmed`, waMsg, 'Upcoming Event']
          );
          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            [`[Email Outbox] SLV Events Booking Confirmed`, mailMsg, 'Upcoming Event']
          );
          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            [`Booking Confirmed`, `🎉 Booking "${eventName}" has been accepted/confirmed. Client notified.`, 'Upcoming Event']
          );

          // Activity Log for Confirmation
          const userName = req.user ? req.user.name : 'System';
          const userId = req.user ? req.user.id : null;
          await db.query(
            'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
            [userId, userName, 'CONFIRM_BOOKING', `Accepted and confirmed booking "${eventName}" (ID: ${eventId}) for client "${clientName}"`]
          );

          // Create event assignments row automatically if it does not exist
          const existingAssignments = await db.query('SELECT * FROM event_assignments WHERE event_id = ?', [eventId]);
          if (existingAssignments.length === 0) {
            await db.query(
              'INSERT INTO event_assignments (event_id, decorator_id, caterer_id, photographer_id, anchor_id, sound_team_id, lighting_team_id, staff_ids, status, assigned_by) VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)',
              [eventId, 'Assigned', userName]
            );
            console.log(`[AUTO ASSIGNMENT] Created event_assignments row for event ID ${eventId}`);
          }
        }
      } else {
        // Standard status update
        await db.query(
          'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
          [
            'Event Status Update',
            `Event "${name || currentEvent.name}" status changed to ${status}.`,
            'Upcoming Event'
          ]
        );
      }
    }

    // Check and log notifications for newly assigned team leads
    const updatedEventName = name || currentEvent.name;
    if (coordId !== undefined && coordId !== currentEvent.coordinator_id) {
      if (coordId) {
        const coords = await db.query('SELECT name FROM users WHERE id = ?', [coordId]);
        if (coords.length > 0) {
          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            ['Vendor Coordinator Assigned', `Vendor Coordinator ${coords[0].name} has been assigned to "${updatedEventName}".`, 'Assignment Confirmation']
          );
        }
      }
    }
    if (opsId !== undefined && opsId !== currentEvent.operations_lead_id) {
      if (opsId) {
        const ops = await db.query('SELECT name FROM users WHERE id = ?', [opsId]);
        if (ops.length > 0) {
          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            ['Operations Lead Assigned', `Operations Lead ${ops[0].name} has been assigned to "${updatedEventName}".`, 'Assignment Confirmation']
          );
        }
      }
    }
    if (finId !== undefined && finId !== currentEvent.finance_team_id) {
      if (finId) {
        const fins = await db.query('SELECT name FROM users WHERE id = ?', [finId]);
        if (fins.length > 0) {
          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            ['Finance Lead Assigned', `Finance Lead ${fins[0].name} has been assigned to "${updatedEventName}".`, 'Assignment Confirmation']
          );
        }
      }
    }

    // Sync automated warnings on event status/detail modifications
    await AutomationService.syncAutomatedNotifications();

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'UPDATE_EVENT', `Updated event "${name || currentEvent.name}" (ID: ${eventId}) details.`]
    );

    return res.status(200).json({ message: 'Event updated successfully' });
  } catch (err) {
    console.error('[EVENT CONTROLLER ERROR] Update event error:', err);
    return res.status(500).json({ 
      message: 'Error updating event or confirming booking', 
      error: err.message 
    });
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

// Clear All Events
exports.clearAllEvents = async (req, res) => {
  try {
    await db.query('DELETE FROM events');

    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'CLEAR_ALL_EVENTS', 'Cleared all event bookings from database history.']
    );

    return res.status(200).json({ message: 'All booking history cleared successfully' });
  } catch (err) {
    console.error('Clear all events error:', err);
    return res.status(500).json({ message: 'Error clearing booking history' });
  }
};

// Create Public Client Booking
exports.createPublicBooking = async (req, res) => {
  try {
    const {
      clientName,
      clientPhone,
      clientEmail,
      eventType,
      eventDate,
      venue,
      budget,
      guestCount,
      notes
    } = req.body;

    if (!clientName || !clientPhone || !eventType || !eventDate || !venue || !budget) {
      return res.status(400).json({ message: 'Required booking fields are missing' });
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

    // 2. Create Event (Status defaults to 'New')
    const eventName = `${clientName}'s ${eventType}`;
    const eventResult = await db.query(
      'INSERT INTO events (name, client_id, event_type, eventDate, venue, budget, guest_count, notes, status, tasks, workflow_stage, workflow_mode, event_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        eventName,
        clientId,
        eventType,
        formatDateString(eventDate),
        venue,
        parseFloat(budget),
        parseInt(guestCount) || 0,
        notes || '',
        'New',
        JSON.stringify([]),
        1,
        'Automatic',
        '10:00 AM - 04:00 PM'
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
        formatDateString(eventDate),
        'Pending',
        'Initial event budget payment'
      ]
    );

    // 4. Trigger notifications
    await db.query(
      'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
      [
        'New Event Booking',
        `A new booking "${eventName}" has been submitted for ${eventDate} at ${venue}.`,
        'Upcoming Event'
      ]
    );

    try {
      if (AutomationService && typeof AutomationService.generateEventSummary === 'function') {
        await AutomationService.generateEventSummary(newEventId);
      }
      if (AutomationService && typeof AutomationService.syncAutomatedNotifications === 'function') {
        await AutomationService.syncAutomatedNotifications();
      }
    } catch (e) {
      console.warn('AutomationService warnings ignored:', e.message);
    }

    // 5. Activity log
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [null, 'System (Client)', 'CREATE_EVENT', `Submitted new booking "${eventName}" (ID: ${newEventId}) for client "${clientName}"`]
    );

    return res.status(201).json({
      message: 'Booking submitted successfully',
      eventId: newEventId
    });
  } catch (err) {
    console.error('[EVENT CONTROLLER ERROR] Create public booking error:', err);
    return res.status(500).json({ 
      message: 'Error submitting booking request. Please verify fields or database state.', 
      error: err.message 
    });
  }
};
