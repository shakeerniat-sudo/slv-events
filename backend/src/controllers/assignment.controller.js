const db = require('../config/db');
const AutomationService = require('../services/automation.service');

// Helper to sync event_assignments table from assignments table
const syncEventAssignmentsTable = async (eventId) => {
  try {
    const currentAssignments = await db.query('SELECT * FROM assignments WHERE event_id = ?', [eventId]);
    const [vendors, staff] = await Promise.all([
      db.query('SELECT id, category FROM vendors'),
      db.query('SELECT id, role FROM staff')
    ]);

    const vendorsMap = new Map(vendors.map(v => [v.id, v.category]));
    const staffMap = new Map(staff.map(s => [s.id, s.role]));

    let decorator_id = null;
    let caterer_id = null;
    let photographer_id = null;
    let anchor_id = null;
    let sound_team_id = null;
    const staffIds = [];

    currentAssignments.forEach(a => {
      if (a.resource_type === 'vendor') {
        const cat = vendorsMap.get(a.resource_id);
        if (cat === 'Decorator') decorator_id = a.resource_id;
        else if (cat === 'Caterer') caterer_id = a.resource_id;
        else if (cat === 'Photographer') photographer_id = a.resource_id;
        else if (cat === 'Anchor') anchor_id = a.resource_id;
        else if (cat === 'Sound Team') sound_team_id = a.resource_id;
      } else if (a.resource_type === 'staff') {
        staffIds.push(a.resource_id);
      }
    });

    const staffIdsStr = staffIds.join(',');

    const existing = await db.query('SELECT * FROM event_assignments WHERE event_id = ?', [eventId]);

    if (existing.length > 0) {
      await db.query(
        'UPDATE event_assignments SET decorator_id = ?, caterer_id = ?, photographer_id = ?, anchor_id = ?, sound_team_id = ?, staff_ids = ? WHERE event_id = ?',
        [decorator_id, caterer_id, photographer_id, anchor_id, sound_team_id, staffIdsStr, eventId]
      );
    } else {
      await db.query(
        'INSERT INTO event_assignments (event_id, decorator_id, caterer_id, photographer_id, anchor_id, sound_team_id, staff_ids, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [eventId, decorator_id, caterer_id, photographer_id, anchor_id, sound_team_id, staffIdsStr, 'Assigned']
      );
    }
  } catch (err) {
    console.error('syncEventAssignmentsTable error:', err);
  }
};

// Helper to check and set event workflow status based on assignment completeness
const checkAndSetEventWorkflowStatus = async (eventId) => {
  try {
    // Pure manual workflow progression - return early and do not auto-calculate stage or status
    return;
    if (events.length === 0) return;
    const event = events[0];

    // If manual mode, do not auto-calculate stage or status
    if (event.workflow_mode === 'Manual') {
      return;
    }

    // If status is completed or cancelled, do not auto-change it
    if (event.status === 'Completed' || event.status === 'Cancelled') {
      return;
    }

    const allCurrentAssignments = await db.query('SELECT * FROM assignments WHERE event_id = ?', [eventId]);
    const vendorsAssigned = allCurrentAssignments.filter(a => a.resource_type === 'vendor');
    const staffAssigned = allCurrentAssignments.filter(a => a.resource_type === 'staff');

    const [allVendors, allStaff] = await Promise.all([
      db.query('SELECT id, category FROM vendors'),
      db.query('SELECT id, role FROM staff')
    ]);

    const vendorsMap = new Map(allVendors.map(v => [v.id, v.category]));
    const staffMap = new Map(allStaff.map(s => [s.id, s.role]));

    const currentCategories = vendorsAssigned.map(a => vendorsMap.get(a.resource_id)).filter(Boolean);
    const currentRoles = staffAssigned.map(a => staffMap.get(a.resource_id)).filter(Boolean);

    const requiredCategories = ['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'];
    const requiredRoles = ['Supervisor', 'Coordinator', 'Technician', 'Helper'];

    const hasAllVendors = requiredCategories.every(cat => currentCategories.includes(cat));
    const hasAllStaff = requiredRoles.every(role => currentRoles.includes(role));

    let newStage = 1;
    let newStatus = event.status;

    if (event.status === 'Completed') {
      newStage = 5;
    } else if (hasAllVendors && hasAllStaff) {
      newStage = 4;
      newStatus = 'Ready';
    } else if (hasAllStaff) {
      newStage = 3;
      newStatus = 'In Progress';
    } else if (hasAllVendors) {
      newStage = 2;
      newStatus = 'In Progress';
    } else {
      newStage = 1;
      if (event.status === 'Ready' || event.status === 'Completed') {
        newStatus = 'Pending';
      }
    }

    if (newStage !== event.workflow_stage || newStatus !== event.status) {
      await db.query(
        'UPDATE events SET workflow_stage = ?, status = ? WHERE id = ?',
        [newStage, newStatus, eventId]
      );
      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        [
          'Event Status Auto Update',
          `Event "${event.name}" status automatically changed to ${newStatus} (Stage ${newStage}).`,
          'Upcoming Event'
        ]
      );
    }
  } catch (err) {
    console.error('checkAndSetEventWorkflowStatus error:', err);
  }
};

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
    let isNewAssignment = false;
    try {
      await db.query(
        'INSERT INTO assignments (event_id, resource_type, resource_id, status) VALUES (?, ?, ?, ?)',
        [eventId, resourceType, resourceId, 'Confirmed']
      );
      isNewAssignment = true;
    } catch (dbErr) {
      // If already assigned to this event, just return success
      if (dbErr.message.includes('Duplicate') || dbErr.message.includes('unique')) {
        return res.status(200).json({ message: 'Resource already assigned to this event' });
      }
      throw dbErr;
    }

    if (isNewAssignment) {
      // Fetch resource details for action confirmation
      let resourceName = 'Resource';
      let resourceCategoryOrRole = 'Crew';
      if (resourceType === 'vendor') {
        const vendors = await db.query('SELECT name, category FROM vendors WHERE id = ?', [resourceId]);
        if (vendors.length > 0) {
          resourceName = vendors[0].name;
          resourceCategoryOrRole = vendors[0].category;
        }
      } else {
        const staff = await db.query('SELECT name, role FROM staff WHERE id = ?', [resourceId]);
        if (staff.length > 0) {
          resourceName = staff[0].name;
          resourceCategoryOrRole = staff[0].role;
        }
      }

      // Generate action confirmation notification
      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        [
          'Resource Assigned',
          `✅ ${resourceCategoryOrRole} ${resourceName} assigned successfully.`,
          'Assignment Confirmation'
        ]
      );

      // Check if all resource allocations are complete
      const allCurrentAssignments = await db.query('SELECT * FROM assignments WHERE event_id = ?', [eventId]);
      const vendorsAssigned = allCurrentAssignments.filter(a => a.resource_type === 'vendor');
      const staffAssigned = allCurrentAssignments.filter(a => a.resource_type === 'staff');

      const [allVendors, allStaff] = await Promise.all([
        db.query('SELECT id, category FROM vendors'),
        db.query('SELECT id, role FROM staff')
      ]);

      const vendorsMap = new Map(allVendors.map(v => [v.id, v.category]));
      const staffMap = new Map(allStaff.map(s => [s.id, s.role]));

      const currentCategories = vendorsAssigned.map(a => vendorsMap.get(a.resource_id)).filter(Boolean);
      const currentRoles = staffAssigned.map(a => staffMap.get(a.resource_id)).filter(Boolean);

      const requiredCategories = ['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'];
      const requiredRoles = ['Supervisor', 'Coordinator', 'Technician', 'Helper'];

      const hasAllVendors = requiredCategories.every(cat => currentCategories.includes(cat));
      const hasAllStaff = requiredRoles.every(role => currentRoles.includes(role));

      if (hasAllVendors && hasAllStaff) {
        await db.query(
          'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
          [
            'Event Resources Fully Allocated',
            `✅ Event resources have been allocated successfully.`,
            'Assignment Confirmation'
          ]
        );
      }

      // Sync automated notifications
      await AutomationService.syncAutomatedNotifications();

      // Sync consolidated table and workflow status
      await syncEventAssignmentsTable(eventId);
      await checkAndSetEventWorkflowStatus(eventId);
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

    // Sync automated warnings to update missing assignment alerts / helper count warnings
    await AutomationService.syncAutomatedNotifications();

    // Sync consolidated table and workflow status
    await syncEventAssignmentsTable(eventId);
    await checkAndSetEventWorkflowStatus(eventId);

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
    const { date, eventId } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const parsedEventId = eventId ? parseInt(eventId) : null;

    // Fetch all vendors, staff, assignments for the date, and exceptions
    const [vendors, staff, assignments, vendorExceptions, staffExceptions] = await Promise.all([
      db.query('SELECT id, name, category, rating, availability_status FROM vendors'),
      db.query('SELECT id, name, role, experience_years, availability_status FROM staff'),
      db.query(
        'SELECT a.*, e.event_date, e.id as event_id, e.name as event_name FROM assignments a JOIN events e ON a.event_id = e.id WHERE e.event_date = ?',
        [date]
      ),
      db.query('SELECT * FROM vendor_availability WHERE date = ?', [date]),
      db.query('SELECT * FROM staff_availability WHERE date = ?', [date])
    ]);

    const busyVendors = new Map();
    const busyStaff = new Map();

    assignments.forEach(a => {
      if (parsedEventId && a.event_id === parsedEventId) return;
      if (a.resource_type === 'vendor') busyVendors.set(a.resource_id, a.event_name);
      if (a.resource_type === 'staff') busyStaff.set(a.resource_id, a.event_name);
    });

    const vendorExceptionsMap = new Map(vendorExceptions.map(e => [e.vendor_id, e.status]));
    const staffExceptionsMap = new Map(staffExceptions.map(e => [e.staff_id, e.status]));

    const vendorStatus = vendors.map(v => {
      let status = 'Available';
      let reason = '✅ Available';

      const baseStatus = v.availability_status;
      const exceptionStatus = vendorExceptionsMap.get(v.id);

      if (baseStatus === 'Busy' || exceptionStatus === 'Busy') {
        status = 'Unavailable';
        reason = '❌ Unavailable';
      } else if (busyVendors.has(v.id)) {
        status = 'Already Assigned';
        reason = `⚠ Already assigned to another event on this date.`;
      }

      return {
        ...v,
        status,
        reason
      };
    });

    const staffStatus = staff.map(s => {
      let status = 'Available';
      let reason = '✅ Available';

      const baseStatus = s.availability_status;
      const exceptionStatus = staffExceptionsMap.get(s.id);

      if (baseStatus === 'Busy' || exceptionStatus === 'Busy') {
        status = 'Unavailable';
        reason = '❌ Unavailable';
      } else if (busyStaff.has(s.id)) {
        status = 'Already Assigned';
        reason = `⚠ Already assigned to another event on this date.`;
      }

      return {
        ...s,
        status,
        reason
      };
    });

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
    const events = await db.query(
      'SELECT e.*, c.name as client_name FROM events e JOIN clients c ON e.client_id = c.id WHERE e.id = ?',
      [eventId]
    );
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = events[0];
    const eventDate = event.event_date;
    const budget = event.budget;

    // Load resources and load assignments in parallel
    const [vendors, staff, allAssignments, allEvents] = await Promise.all([
      db.query('SELECT * FROM vendors'),
      db.query('SELECT * FROM staff'),
      db.query('SELECT * FROM assignments'),
      db.query('SELECT e.*, c.name as client_name FROM events e JOIN clients c ON e.client_id = c.id')
    ]);

    // Track schedules by date to determine availability
    const busyVendors = new Set();
    const busyStaff = new Set();
    const targetDateStr = new Date(eventDate).toISOString().split('T')[0];
    const eventsMap = new Map(allEvents.map(ev => [ev.id, ev]));

    allAssignments.forEach(ass => {
      const ev = eventsMap.get(ass.event_id);
      if (!ev) return;
      const evDateStr = new Date(ev.event_date).toISOString().split('T')[0];
      if (evDateStr === targetDateStr && ev.id !== eventId) {
        if (ass.resource_type === 'vendor') busyVendors.add(ass.resource_id);
        if (ass.resource_type === 'staff') busyStaff.add(ass.resource_id);
      }
    });

    // Helper to check budget compatibility
    const isPriceCompatible = (priceRange, eventBudget) => {
      if (priceRange === 'High' && eventBudget < 100000) return false;
      if (priceRange === 'Medium' && eventBudget < 50000) return false;
      return true;
    };

    // Helper to check past assignments of similar type
    const hasHandledSimilarEvent = (resourceType, resourceId, currentEventType) => {
      const resourceAssignments = allAssignments.filter(
        a => a.resource_type === resourceType && a.resource_id === resourceId
      );
      return resourceAssignments.some(ass => {
        const ev = eventsMap.get(ass.event_id);
        return ev && ev.event_type.toLowerCase() === currentEventType.toLowerCase();
      });
    };

    // 3. Generate recommendations per category
    const categories = ['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'];
    const recommendations = {};

    categories.forEach(cat => {
      const candidates = vendors
        .filter(v => v.category === cat)
        .map(v => {
          const isAvailable = !busyVendors.has(v.id);
          const isBudgetFit = isPriceCompatible(v.price_range, budget);
          const hasHandledSimilar = hasHandledSimilarEvent('vendor', v.id, event.event_type);

          // Calculate score based on price, rating, availability, and experience
          let score = v.rating * 10;
          if (!isAvailable) score -= 100;
          if (!isBudgetFit) score -= 20;
          if (hasHandledSimilar) score += 15;

          const status = isAvailable ? 'Available' : 'Already Assigned';

          const reasons = [
            { text: 'Available on selected date', success: isAvailable },
            { text: `Rating: ${parseFloat(v.rating).toFixed(1)}`, success: parseFloat(v.rating) >= 4.0 },
            { text: isBudgetFit ? 'Fits the budget' : 'Exceeds typical budget', success: isBudgetFit },
            { text: 'Previously handled similar events', success: hasHandledSimilar }
          ];

          return {
            ...v,
            status,
            score,
            statusLabel: isAvailable ? '✅ Available' : '❌ Already Assigned',
            reasons
          };
        });

      candidates.sort((a, b) => b.score - a.score);
      recommendations[cat] = candidates.slice(0, 3);
    });

    // Staff Recommendations
    const staffRoles = ['Supervisor', 'Coordinator', 'Technician', 'Helper'];
    recommendations['Staff'] = {};
    staffRoles.forEach(role => {
      const candidates = staff
        .filter(s => s.role === role)
        .map(s => {
          const isAvailable = !busyStaff.has(s.id);
          const hasHandledSimilar = hasHandledSimilarEvent('staff', s.id, event.event_type);

          let score = s.experience_years * 5;
          if (!isAvailable) score -= 100;
          if (hasHandledSimilar) score += 15;

          const status = isAvailable ? 'Available' : 'Already Assigned';

          const reasons = [
            { text: 'Available on selected date', success: isAvailable },
            { text: `Experience: ${s.experience_years} years`, success: s.experience_years >= 2 },
            { text: 'Previously handled similar events', success: hasHandledSimilar }
          ];

          return {
            ...s,
            status,
            score,
            statusLabel: isAvailable ? '✅ Available' : '❌ Already Assigned',
            reasons
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

    const summary = `Suggested crew for "${event.name}" on ${new Date(eventDate).toLocaleDateString('en-GB')}:\n` +
      `- Decorator: ${chosenDecor.name} (Rating: ${chosenDecor.rating || 'N/A'})\n` +
      `- Caterer: ${chosenCaterer.name} (Rating: ${chosenCaterer.rating || 'N/A'})\n` +
      `- Photographer: ${chosenPhoto.name} (Rating: ${chosenPhoto.rating || 'N/A'})\n` +
      `- Anchor: ${chosenAnchor.name} (Rating: ${chosenAnchor.rating || 'N/A'})\n` +
      `- Sound Team: ${chosenSound.name} (Rating: ${chosenSound.rating || 'N/A'})\n` +
      `- Lead Supervisor: ${chosenSupervisor.name}`;

    const vendorBriefing = `SLV EVENTS - VENDOR BRIEFING\n` +
      `Event: ${event.name}\n` +
      `Date: ${new Date(eventDate).toLocaleDateString('en-GB')}\n` +
      `Venue: ${event.venue}\n` +
      `Theme: ${event.theme_preference || 'Standard'}\n` +
      `Estimated Guest Count: ${event.guest_count}\n\n` +
      `Special Instructions:\n` +
      `Dear Vendor Partners, please coordinate with our Lead Supervisor ${chosenSupervisor.name} upon arrival. Setup must be completed 3 hours prior to the event. For any inquiries, reply to this briefing.`;

    const staffBriefing = `SLV EVENTS - INTERNAL STAFF BRIEFING\n` +
      `Event: ${event.name}\n` +
      `Date: ${new Date(eventDate).toLocaleDateString('en-GB')}\n` +
      `Venue: ${event.venue}\n` +
      `Supervisor In-Charge: ${chosenSupervisor.name}\n\n` +
      `Roster Outline:\n` +
      `- Setup Coordination: Decorator (${chosenDecor.name}), Sound Team (${chosenSound.name})\n` +
      `- Operations Lead: Assist Catering (${chosenCaterer.name}) food counters.\n` +
      `Please report to the venue by 08:00 AM on event day in company uniform.`;

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

// Retrieve event consolidated assignments
exports.getEventAssignment = async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const result = await db.query('SELECT * FROM event_assignments WHERE event_id = ?', [eventId]);
    if (result.length === 0) {
      return res.status(200).json({
        event_id: eventId,
        decorator_id: null,
        caterer_id: null,
        photographer_id: null,
        anchor_id: null,
        sound_team_id: null,
        staff_ids: '',
        status: 'Pending'
      });
    }
    return res.status(200).json(result[0]);
  } catch (err) {
    console.error('Get event assignment error:', err);
    return res.status(500).json({ message: 'Error retrieving event assignments' });
  }
};

// Save event consolidated assignments
exports.saveEventAssignment = async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const {
      decorator_id,
      caterer_id,
      photographer_id,
      anchor_id,
      sound_team_id,
      staff_ids,
      status
    } = req.body;

    const assignedBy = req.user ? req.user.name : 'System';

    // 1. Get Event Details
    const events = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const event = events[0];
    const eventDate = event.event_date;

    // Normalize staff_ids to comma-separated string
    let staffIdsStr = '';
    if (Array.isArray(staff_ids)) {
      staffIdsStr = staff_ids.join(',');
    } else if (staff_ids) {
      staffIdsStr = staff_ids.toString();
    }

    // 2. Check if a record already exists in event_assignments
    const existing = await db.query('SELECT * FROM event_assignments WHERE event_id = ?', [eventId]);

    if (existing.length > 0) {
      await db.query(
        'UPDATE event_assignments SET decorator_id = ?, caterer_id = ?, photographer_id = ?, anchor_id = ?, sound_team_id = ?, staff_ids = ?, status = ?, assigned_by = ? WHERE event_id = ?',
        [
          decorator_id ? parseInt(decorator_id) : null,
          caterer_id ? parseInt(caterer_id) : null,
          photographer_id ? parseInt(photographer_id) : null,
          anchor_id ? parseInt(anchor_id) : null,
          sound_team_id ? parseInt(sound_team_id) : null,
          staffIdsStr,
          status || 'Assigned',
          assignedBy,
          eventId
        ]
      );
    } else {
      await db.query(
        'INSERT INTO event_assignments (event_id, decorator_id, caterer_id, photographer_id, anchor_id, sound_team_id, staff_ids, status, assigned_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          eventId,
          decorator_id ? parseInt(decorator_id) : null,
          caterer_id ? parseInt(caterer_id) : null,
          photographer_id ? parseInt(photographer_id) : null,
          anchor_id ? parseInt(anchor_id) : null,
          sound_team_id ? parseInt(sound_team_id) : null,
          staffIdsStr,
          status || 'Assigned',
          assignedBy
        ]
      );
    }

    // 3. Keep old assignments table in sync to preserve calendar, dashboard, alerts
    await db.query('DELETE FROM assignments WHERE event_id = ?', [eventId]);

    const vendorIds = [
      { id: decorator_id, category: 'Decorator' },
      { id: caterer_id, category: 'Caterer' },
      { id: photographer_id, category: 'Photographer' },
      { id: anchor_id, category: 'Anchor' },
      { id: sound_team_id, category: 'Sound Team' }
    ].filter(v => v.id);

    for (const vendor of vendorIds) {
      try {
        await db.query(
          'INSERT INTO assignments (event_id, resource_type, resource_id, status) VALUES (?, ?, ?, ?)',
          [eventId, 'vendor', parseInt(vendor.id), 'Confirmed']
        );
      } catch (err) {
        console.warn(`Old assignments sync warning (vendor ${vendor.id}):`, err.message);
      }
    }

    const staffIdsArr = staffIdsStr ? staffIdsStr.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
    for (const sId of staffIdsArr) {
      try {
        await db.query(
          'INSERT INTO assignments (event_id, resource_type, resource_id, status) VALUES (?, ?, ?, ?)',
          [eventId, 'staff', sId, 'Confirmed']
        );
      } catch (err) {
        console.warn(`Old assignments sync warning (staff ${sId}):`, err.message);
      }
    }

    // 4. Run automated workflow status checker
    await checkAndSetEventWorkflowStatus(eventId);

    // 5. Generate Notifications
    if (vendorIds.length > 0) {
      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        ['Vendors Assigned', '✅ Vendors assigned successfully.', 'Assignment Confirmation']
      );
    }
    if (staffIdsArr.length > 0) {
      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        ['Staff Assigned', '✅ Staff assigned successfully.', 'Assignment Confirmation']
      );
    }

    // Check double bookings and generate warning alerts if any assigned resource is busy
    const conflicts = await db.query(
      'SELECT a.*, e.name as event_name FROM assignments a JOIN events e ON a.event_id = e.id WHERE e.event_date = ? AND e.id != ?',
      [eventDate, eventId]
    );

    const busyVendorIds = new Set(conflicts.filter(a => a.resource_type === 'vendor').map(a => a.resource_id));

    // Warn if Photographer is already booked
    if (photographer_id && busyVendorIds.has(parseInt(photographer_id))) {
      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        ['Photographer Conflict', '⚠ Photographer already booked.', 'Conflict Alert']
      );
    }

    // Warn if other resources are busy
    for (const vendor of vendorIds) {
      if (vendor.category !== 'Photographer' && busyVendorIds.has(parseInt(vendor.id))) {
        await db.query(
          'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
          [`${vendor.category} Booking Conflict`, `⚠ ${vendor.category} is already booked on this date.`, 'Conflict Alert']
        );
      }
    }

    // Helper staffing checklist warning: check how many helpers are assigned
    let helpersCount = 0;
    if (staffIdsArr.length > 0) {
      const allStaff = await db.query('SELECT id, role FROM staff WHERE id IN (?)', [staffIdsArr]);
      helpersCount = allStaff.filter(s => s.role === 'Helper').length;
    }
    
    let requiredHelpers = 0;
    if (event.guest_count > 0) {
      requiredHelpers = Math.max(2, Math.ceil(event.guest_count / 100));
    }
    if (helpersCount < requiredHelpers) {
      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        ['Staffing Warning', `⚠ Only ${helpersCount} helpers available.`, 'Conflict Alert']
      );
    }

    // 6. Generate Event Summary notification
    await AutomationService.generateEventSummary(eventId);

    // 7. Sync automated notifications
    await AutomationService.syncAutomatedNotifications();

    // 8. Log activity
    const userName = req.user ? req.user.name : 'System';
    const userId = req.user ? req.user.id : null;
    await db.query(
      'INSERT INTO activity_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, 'SAVE_EVENT_ASSIGNMENT', `Saved consolidated assignments for event "${event.name}" (ID: ${eventId})`]
    );

    return res.status(200).json({
      message: 'Event assignments saved successfully',
      summary: {
        eventName: event.name,
        decorator: decorator_id,
        caterer: caterer_id,
        photographer: photographer_id,
        anchor: anchor_id,
        soundTeam: sound_team_id,
        helpersCount
      }
    });
  } catch (err) {
    console.error('Save event assignment error:', err);
    return res.status(500).json({ message: 'Error saving event assignments' });
  }
};
