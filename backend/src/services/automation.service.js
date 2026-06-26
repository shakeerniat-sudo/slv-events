const db = require('../config/db');

const formatDateSafe = (dateVal) => {
  if (!dateVal) return '';
  const str = dateVal.toString();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) { }
  return str.split('T')[0];
};

/**
 * Normalizes a date to midnight for date-only comparisons.
 */
function normalizeToDateOnly(dateInput) {
  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Rule-Based Automation Service
 */
const AutomationService = {
  /**
   * Generates a notification for an event summary when created.
   */
  generateEventSummary: async (eventId) => {
    try {
      const events = await db.query(
        'SELECT e.*, c.name as client_name FROM events e JOIN clients c ON e.client_id = c.id WHERE e.id = ?',
        [eventId]
      );
      if (events.length === 0) return;
      const event = events[0];

      // Fetch assigned vendors and staff
      const [vendors, staff] = await Promise.all([
        db.query(
          "SELECT v.name, v.category FROM assignments a JOIN vendors v ON a.resource_id = v.id WHERE a.event_id = ? AND a.resource_type = 'vendor'",
          [eventId]
        ),
        db.query(
          "SELECT s.name, s.role FROM assignments a JOIN staff s ON a.resource_id = s.id WHERE a.event_id = ? AND a.resource_type = 'staff'",
          [eventId]
        )
      ]);

      const vendorListStr = vendors.map(v => `${v.name} (${v.category})`).join(', ') || 'None';
      const staffListStr = staff.map(s => `${s.name} (${s.role})`).join(', ') || 'None';

      const summaryText =
        `Client: ${event.client_name}\n` +
        `Event Type: ${event.event_type}\n` +
        `Date: ${new Date(event.eventDate).toLocaleDateString('en-GB')}\n` +
        `Venue: ${event.venue}\n` +
        `Budget: $${parseFloat(event.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
        `Guest Count: ${event.guest_count}\n` +
        `Assigned Vendors: ${vendorListStr}\n` +
        `Assigned Staff: ${staffListStr}\n` +
        `Current Status: ${event.status}`;

      await db.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        [`Event Summary: ${event.name}`, summaryText, 'Event Summary']
      );
      console.log(`Generated event summary for event ID ${eventId}`);
    } catch (err) {
      console.error('Error generating event summary:', err);
    }
  },

  /**
   * Evaluates rule-based logic and synchronizes notifications in the database.
   */
  syncAutomatedNotifications: async () => {
    try {
      // 1. Fetch system state
      const [events, assignments, vendors, staff, payments, existingNotifications] = await Promise.all([
        db.query('SELECT e.*, c.name as client_name FROM events e JOIN clients c ON e.client_id = c.id'),
        db.query('SELECT * FROM assignments'),
        db.query('SELECT * FROM vendors'),
        db.query('SELECT * FROM staff'),
        db.query('SELECT p.*, e.name as event_name FROM payments p JOIN events e ON p.event_id = e.id'),
        db.query('SELECT * FROM notifications')
      ]);

      const currentGenerated = [];
      const today = normalizeToDateOnly(new Date());

      // Helper maps
      const vendorsMap = new Map(vendors.map(v => [v.id, v]));
      const staffMap = new Map(staff.map(s => [s.id, s]));
      const eventsMap = new Map(events.map(e => [e.id, e]));

      // -------------------------------------------------------------
      // RULE 1: Smart Alerts - Double Bookings
      // -------------------------------------------------------------
      // Track resource assignments per date: { resourceType_resourceId: { date: [eventId] } }
      const resourceSchedule = {};
      assignments.forEach(ass => {
        const key = `${ass.resource_type}_${ass.resource_id}`;
        const event = eventsMap.get(ass.event_id);
        const dateStr = formatDateSafe(event.eventDate);

        if (!resourceSchedule[key]) resourceSchedule[key] = {};
        if (!resourceSchedule[key][dateStr]) resourceSchedule[key][dateStr] = [];
        resourceSchedule[key][dateStr].push({ eventId: event.id, name: event.name });
      });

      Object.entries(resourceSchedule).forEach(([resourceKey, schedule]) => {
        const [resourceType, resourceId] = resourceKey.split('_');
        const idVal = parseInt(resourceId);
        Object.entries(schedule).forEach(([dateStr, list]) => {
          if (list.length > 1) {
            const resourceName = resourceType === 'vendor'
              ? (vendorsMap.get(idVal)?.name || `Vendor ID ${idVal}`)
              : (staffMap.get(idVal)?.name || `Staff ID ${idVal}`);
            const categoryLabel = resourceType === 'vendor'
              ? (vendorsMap.get(idVal)?.category || 'Vendor')
              : (staffMap.get(idVal)?.role || 'Staff');

            // Format date nicely
            const niceDate = new Date(dateStr).toLocaleDateString('en-GB');

            currentGenerated.push({
              title: 'Double Booking Conflict',
              message: `⚠ ${categoryLabel} ${resourceName} is already assigned on ${niceDate}.`,
              type: 'Conflict Alert'
            });
          }
        });
      });

      // -------------------------------------------------------------
      // RULE 2: Smart Alerts - Insufficient Helpers
      // -------------------------------------------------------------
      events.forEach(event => {
        if (event.status === 'Completed' || event.status === 'Cancelled') return;

        // Count helpers assigned
        const helperAssignments = assignments.filter(
          a => a.event_id === event.id &&
            a.resource_type === 'staff' &&
            staffMap.get(a.resource_id)?.role === 'Helper'
        );

        // Insufficient helpers rule: 1 helper per 100 guests, minimum 2 helpers (if guest count > 0)
        let requiredHelpers = 0;
        if (event.guest_count > 0) {
          requiredHelpers = Math.max(2, Math.ceil(event.guest_count / 100));
        }

        if (helperAssignments.length < requiredHelpers) {
          currentGenerated.push({
            title: 'Insufficient Helpers Alert',
            message: `⚠ Only ${helperAssignments.length} helpers available. Required: ${requiredHelpers}.`,
            type: 'Conflict Alert'
          });
        }
      });

      // -------------------------------------------------------------
      // RULE 3: Smart Alerts - Missing Assignments
      // -------------------------------------------------------------
      events.forEach(event => {
        if (event.status === 'Completed' || event.status === 'Cancelled') return;

        // Check vendors needed: Decorator, Caterer, Photographer, Anchor, Sound Team
        const requiredVendorCategories = ['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'];
        const assignedCategories = assignments
          .filter(a => a.event_id === event.id && a.resource_type === 'vendor')
          .map(a => vendorsMap.get(a.resource_id)?.category)
          .filter(Boolean);

        requiredVendorCategories.forEach(cat => {
          if (!assignedCategories.includes(cat)) {
            currentGenerated.push({
              title: 'Missing Assignment Alert',
              message: `⚠ Missing assignment: No ${cat} allocated to event "${event.name}".`,
              type: 'Conflict Alert'
            });
          }
        });
      });

      // -------------------------------------------------------------
      // RULE 4: Smart Alerts - Upcoming Event within 24 Hours
      // -------------------------------------------------------------
      events.forEach(event => {
        if (event.status === 'Completed' || event.status === 'Cancelled') return;
        const eventDate = normalizeToDateOnly(event.eventDate);
        const timeDiff = eventDate.getTime() - today.getTime();
        const diffHours = timeDiff / (1000 * 60 * 60);

        if (diffHours >= 0 && diffHours <= 24) {
          currentGenerated.push({
            title: 'Upcoming Event Warning',
            message: `⚠ Event "${event.name}" starts within 24 hours on ${new Date(event.eventDate).toLocaleDateString('en-GB')} at ${event.venue}.`,
            type: 'Upcoming Event'
          });
        }
      });

      // -------------------------------------------------------------
      // RULE 5: Smart Alerts - Pending Payments
      // -------------------------------------------------------------
      payments.forEach(payment => {
        if (payment.status === 'Pending' || payment.status === 'Overdue') {
          const formattedAmount = parseFloat(payment.amount || payment.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
          const niceDue = new Date(payment.due_date).toLocaleDateString('en-GB');
          const description = payment.type === 'vendor' ? 'vendor payment' : 'client billing';

          currentGenerated.push({
            title: 'Pending Payment Alert',
            message: `⚠ Payment of $${formattedAmount} (${description}) for event "${payment.event_name}" is pending. Due date: ${niceDue}.`,
            type: 'Payment Reminder'
          });
        }
      });

      // -------------------------------------------------------------
      // RULE 6: Automated Follow-up Reminders
      // -------------------------------------------------------------
      events.forEach(event => {
        if (event.status === 'Completed' || event.status === 'Cancelled') return;
        const eventDate = normalizeToDateOnly(event.eventDate);
        const timeDiff = eventDate.getTime() - today.getTime();
        const daysUntilEvent = Math.round(timeDiff / (1000 * 60 * 60 * 24));

        if (daysUntilEvent === 7) {
          currentGenerated.push({
            title: '7-Day Follow-up Reminder',
            message: `Reminder: Verify all vendor assignments for event "${event.name}".`,
            type: 'Upcoming Event'
          });
        } else if (daysUntilEvent === 3) {
          currentGenerated.push({
            title: '3-Day Follow-up Reminder',
            message: `Reminder: Confirm vendor availability and payment status for event "${event.name}".`,
            type: 'Payment Reminder'
          });
        } else if (daysUntilEvent === 1) {
          currentGenerated.push({
            title: '1-Day Follow-up Reminder',
            message: `Reminder: Complete the event checklist and final confirmations for event "${event.name}".`,
            type: 'Upcoming Event'
          });
        } else if (daysUntilEvent === 0) {
          currentGenerated.push({
            title: 'Event Day Reminder',
            message: `Reminder: Monitor live event operations for event "${event.name}".`,
            type: 'Upcoming Event'
          });
        }
      });

      // -------------------------------------------------------------
      // SYNCHRONIZATION WITH DATABASE
      // -------------------------------------------------------------
      const automatedTypes = ['Conflict Alert', 'Payment Reminder', 'Upcoming Event'];
      const ruleTitles = [
        'Double Booking Conflict',
        'Insufficient Helpers Alert',
        'Missing Assignment Alert',
        'Upcoming Event Warning',
        'Pending Payment Alert',
        '7-Day Follow-up Reminder',
        '3-Day Follow-up Reminder',
        '1-Day Follow-up Reminder',
        'Event Day Reminder'
      ];

      // Identify which existing notifications are automated ones we manage
      const managedExisting = existingNotifications.filter(
        n => automatedTypes.includes(n.type) && ruleTitles.includes(n.title)
      );

      // A: Insert new notifications that don't exist yet
      for (const gen of currentGenerated) {
        const alreadyExists = managedExisting.some(
          ex => ex.type === gen.type && ex.title === gen.title && ex.message === gen.message
        );
        if (!alreadyExists) {
          await db.query(
            'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
            [gen.title, gen.message, gen.type]
          );
          console.log(`Inserted automated notification: ${gen.title} - ${gen.message.substring(0, 40)}...`);
        }
      }

      // B: Clean up automated notifications that are no longer valid (e.g. resolved conflicts, paid balances, updated dates)
      for (const ex of managedExisting) {
        const stillValid = currentGenerated.some(
          gen => gen.type === ex.type && gen.title === ex.title && gen.message === ex.message
        );
        if (!stillValid) {
          await db.query('DELETE FROM notifications WHERE id = ?', [ex.id]);
          console.log(`Removed stale/resolved automated notification: ${ex.title} (ID: ${ex.id})`);
        }
      }

    } catch (err) {
      console.error('Error synchronizing automated notifications:', err);
    }
  }
};

module.exports = AutomationService;
