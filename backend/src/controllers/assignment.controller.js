const db = require('../config/db');

// Helper to check if resource is assigned on a specific date
const checkResourceConflict = async (resourceType, resourceId, dateString, excludeEventId = null) => {
  let queryStr = `
    SELECT a.*, e.name as event_name, e.event_date 
    FROM assignments a 
    JOIN events e ON a.event_id = e.id 
    WHERE a.resource_type = ? AND a.resource_id = ? AND e.event_date = ?
  `;
  const params = [resourceType, resourceId, dateString];
  
  if (excludeEventId) {
    queryStr += " AND e.id != ?";
    params.push(excludeEventId);
  }

  const matches = await db.query(queryStr, params);
  return matches.length > 0 ? matches[0] : null;
};

// Create Assignment (assign vendor or staff to event)
exports.createAssignment = async (req, res) => {
  try {
    const { eventId, resourceType, resourceId, force } = req.body;

    if (!eventId || !resourceType || !resourceId) {
      return res.status(400).json({ message: 'eventId, resourceType, and resourceId are required' });
    }

    // 1. Get Event Details
    const events = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const event = events[0];

    // 2. Check for conflicts
    const conflict = await checkResourceConflict(resourceType, resourceId, event.event_date);
    if (conflict && !force) {
      return res.status(409).json({
        message: 'Conflict detected: Resource is already assigned to another event on this day.',
        conflict: {
          eventName: conflict.event_name,
          date: conflict.event_date
        }
      });
    }

    // 3. Create or update assignment
    try {
      await db.query(
        'INSERT INTO assignments (event_id, resource_type, resource_id, status) VALUES (?, ?, ?, ?)',
        [eventId, resourceType, resourceId, 'Confirmed']
      );
    } catch (dbErr) {
      // If already assigned to this event, just return success
      if (dbErr.message.includes('Duplicate') || dbErr.message.includes('unique')) {
        return res.status(200).json({ message: 'Resource already assigned to this event' });
      }
      throw dbErr;
    }

    // 4. Update vendor/staff availability cache if necessary (or leave dynamic)
    // 5. Notify if conflict is forced
    if (conflict && force) {
      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        [
          'Overlapping Assignment Forced',
          `Double-booking warning: ${resourceType} ID ${resourceId} was forced onto event "${event.name}" despite conflict with "${conflict.event_name}".`,
          'Conflict Alert'
        ]
      );
    }

    // 6. Log
    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    const resourceName = resourceType === 'vendor' ? 'vendor' : 'staff';
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'ASSIGN_RESOURCE', `Assigned ${resourceName} ID ${resourceId} to event "${event.name}" (ID: ${eventId})`]
    );

    return res.status(201).json({ message: 'Resource assigned successfully' });
  } catch (err) {
    console.error('Create assignment error:', err);
    return res.status(500).json({ message: 'Error creating assignment' });
  }
};

// Remove Assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { eventId, resourceType, resourceId } = req.body;
    
    if (!eventId || !resourceType || !resourceId) {
      return res.status(400).json({ message: 'eventId, resourceType, and resourceId are required' });
    }

    const result = await db.query(
      'DELETE FROM assignments WHERE event_id = ? AND resource_type = ? AND resource_id = ?',
      [eventId, resourceType, resourceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    return res.status(200).json({ message: 'Assignment removed successfully' });
  } catch (err) {
    console.error('Delete assignment error:', err);
    return res.status(500).json({ message: 'Error removing assignment' });
  }
};

// Get all conflicts in the system
exports.getConflicts = async (req, res) => {
  try {
    // A conflict is when the same resource is assigned to multiple events on the same date.
    // Let's perform a self-join simulation.
    // Query list of all assignments with their events.
    const [vendorAssignments, staffAssignments] = await Promise.all([
      db.query(`
        SELECT a.id, a.event_id, a.resource_id, e.name as event_name, e.event_date, v.name as resource_name, v.phone as resource_phone
        FROM assignments a
        JOIN events e ON a.event_id = e.id
        JOIN vendors v ON a.resource_id = v.id
        WHERE a.resource_type = 'vendor'
      `),
      db.query(`
        SELECT a.id, a.event_id, a.resource_id, e.name as event_name, e.event_date, s.name as resource_name, s.phone as resource_phone
        FROM assignments a
        JOIN events e ON a.event_id = e.id
        JOIN staff s ON a.resource_id = s.id
        WHERE a.resource_type = 'staff'
      `)
    ]);

    const conflicts = [];

    const detectConflicts = (assignments, type) => {
      const groupedByDate = {}; // date -> { resourceId -> [assignments] }
      
      assignments.forEach(as => {
        const date = as.event_date;
        const resId = as.resource_id;
        
        if (!groupedByDate[date]) groupedByDate[date] = {};
        if (!groupedByDate[date][resId]) groupedByDate[date][resId] = [];
        
        groupedByDate[date][resId].push(as);
      });

      Object.keys(groupedByDate).forEach(date => {
        Object.keys(groupedByDate[date]).forEach(resId => {
          const list = groupedByDate[date][resId];
          if (list.length > 1) {
            conflicts.push({
              conflictType: 'Double Booking',
              resourceType: type,
              resourceName: list[0].resource_name,
              resourcePhone: list[0].resource_phone,
              date: date,
              events: list.map(l => ({ id: l.event_id, name: l.event_name }))
            });
          }
        });
      });
    };

    detectConflicts(vendorAssignments, 'Vendor');
    detectConflicts(staffAssignments, 'Staff');

    return res.status(200).json(conflicts);
  } catch (err) {
    console.error('Conflict detection error:', err);
    return res.status(500).json({ message: 'Error checking conflicts' });
  }
};

// Check availability for all vendors & staff for a specific date
exports.checkAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const [vendors, staff, assignments] = await Promise.all([
      db.query('SELECT id, name, category, rating FROM vendors'),
      db.query('SELECT id, name, role, experience_years FROM staff'),
      db.query(
        'SELECT a.*, e.event_date FROM assignments a JOIN events e ON a.event_id = e.id WHERE e.event_date = ?',
        [date]
      )
    ]);

    const busyVendors = new Set(assignments.filter(a => a.resource_type === 'vendor').map(a => a.resource_id));
    const busyStaff = new Set(assignments.filter(a => a.resource_type === 'staff').map(a => a.resource_id));

    const vendorStatus = vendors.map(v => ({
      ...v,
      status: busyVendors.has(v.id) ? 'Busy' : 'Available'
    }));

    const staffStatus = staff.map(s => ({
      ...s,
      status: busyStaff.has(s.id) ? 'Busy' : 'Available'
    }));

    return res.status(200).json({
      vendors: vendorStatus,
      staff: staffStatus
    });
  } catch (err) {
    console.error('Check availability error:', err);
    return res.status(500).json({ message: 'Error checking availability' });
  }
};

// Get AI Recommendations for an event
exports.getRecommendations = async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const events = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = events[0];
    const eventDate = event.event_date;
    const budget = event.budget;

    // 1. Load resources and load already busy resources on this event date in parallel
    const [vendors, staff, busyAssignments] = await Promise.all([
      db.query('SELECT * FROM vendors'),
      db.query('SELECT * FROM staff'),
      db.query(
        'SELECT a.* FROM assignments a JOIN events e ON a.event_id = e.id WHERE e.event_date = ? AND e.id != ?',
        [eventDate, eventId]
      )
    ]);
    const busyVendors = new Set(busyAssignments.filter(a => a.resource_type === 'vendor').map(a => a.resource_id));
    const busyStaff = new Set(busyAssignments.filter(a => a.resource_type === 'staff').map(a => a.resource_id));

    // Helper: Match vendor price tier with budget
    const isPriceCompatible = (priceRange, eventBudget) => {
      if (priceRange === 'High' && eventBudget < 100000) return false;
      if (priceRange === 'Medium' && eventBudget < 50000) return false;
      return true; // Simple logic
    };

    // 3. Generate recommendations per category
    const categories = ['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'];
    const recommendations = {};

    categories.forEach(cat => {
      const candidates = vendors
        .filter(v => v.category === cat)
        .map(v => {
          // Determine status
          let status = 'Available';
          if (busyVendors.has(v.id)) {
            status = 'Already Assigned';
          }
          
          // Calculate score based on price, rating, availability
          let score = v.rating * 10; // rating is 0 to 5
          if (status === 'Already Assigned') score -= 100;
          if (!isPriceCompatible(v.price_range, budget)) score -= 15; // penalize budget mismatch

          return {
            ...v,
            status,
            score,
            statusLabel: status === 'Available' ? '✅ Available' : '❌ Already Assigned'
          };
        });

      // Sort by score descending (highest rated, available, price compatible first)
      candidates.sort((a, b) => b.score - a.score);
      recommendations[cat] = candidates.slice(0, 3); // top 3 choices
    });

    // Staff Recommendations
    const staffRoles = ['Supervisor', 'Coordinator', 'Technician', 'Helper'];
    recommendations['Staff'] = {};
    staffRoles.forEach(role => {
      const candidates = staff
        .filter(s => s.role === role)
        .map(s => {
          let status = 'Available';
          if (busyStaff.has(s.id)) {
            status = 'Already Assigned';
          }
          let score = s.experience_years * 5;
          if (status === 'Already Assigned') score -= 100;

          return {
            ...s,
            status,
            score,
            statusLabel: status === 'Available' ? '✅ Available' : '❌ Already Assigned'
          };
        });

      candidates.sort((a, b) => b.score - a.score);
      recommendations['Staff'][role] = candidates.slice(0, 3);
    });

    // 4. Generate Summaries and Messaging templates
    const chosenDecor = recommendations['Decorator'][0] || { name: 'N/A' };
    const chosenCaterer = recommendations['Caterer'][0] || { name: 'N/A' };
    const chosenPhoto = recommendations['Photographer'][0] || { name: 'N/A' };
    const chosenAnchor = recommendations['Anchor'][0] || { name: 'N/A' };
    const chosenSound = recommendations['Sound Team'][0] || { name: 'N/A' };
    const chosenSupervisor = recommendations['Staff']['Supervisor'][0] || { name: 'N/A' };

    const summary = `Suggested crew for "${event.name}" on ${eventDate}:\n` +
      `- Decorator: ${chosenDecor.name} (Rating: ${chosenDecor.rating || 'N/A'})\n` +
      `- Caterer: ${chosenCaterer.name} (Rating: ${chosenCaterer.rating || 'N/A'})\n` +
      `- Photographer: ${chosenPhoto.name} (Rating: ${chosenPhoto.rating || 'N/A'})\n` +
      `- Anchor: ${chosenAnchor.name} (Rating: ${chosenAnchor.rating || 'N/A'})\n` +
      `- Sound Team: ${chosenSound.name} (Rating: ${chosenSound.rating || 'N/A'})\n` +
      `- Lead Supervisor: ${chosenSupervisor.name}`;

    const vendorBriefing = `SLV EVENTS - VENDOR BRIEFING
Event: ${event.name}
Date: ${eventDate}
Venue: ${event.venue}
Theme: ${event.theme_preference || 'Standard'}
Estimated Guest Count: ${event.guest_count}

Special Instructions:
Dear Vendor Partners, please coordinate with our Lead Supervisor ${chosenSupervisor.name} upon arrival. Setup must be completed 3 hours prior to the event. For any inquiries, reply to this briefing.`;

    const staffBriefing = `SLV EVENTS - INTERNAL STAFF BRIEFING
Event: ${event.name}
Date: ${eventDate}
Venue: ${event.venue}
Supervisor In-Charge: ${chosenSupervisor.name}

Roster Outline:
- Setup Coordination: Decorator (${chosenDecor.name}), Sound Team (${chosenSound.name})
- Operations Lead: Assist Catering (${chosenCaterer.name}) food counters.
Please report to the venue by 08:00 AM on event day in company uniform.`;

    return res.status(200).json({
      recommendations,
      summary,
      vendorBriefing,
      staffBriefing
    });
  } catch (err) {
    console.error('Recommendations error:', err);
    return res.status(500).json({ message: 'Error generating recommendations' });
  }
};

// List all assignments
exports.listAssignments = async (req, res) => {
  try {
    const assignments = await db.query('SELECT * FROM assignments');
    return res.status(200).json(assignments);
  } catch (err) {
    console.error('List assignments error:', err);
    return res.status(500).json({ message: 'Error retrieving assignments' });
  }
};
