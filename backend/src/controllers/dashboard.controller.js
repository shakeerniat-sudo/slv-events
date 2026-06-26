const db = require('../config/db');

exports.getKpiStats = async (req, res) => {
  try {
    const [events, vendors, staff, payments] = await Promise.all([
      db.query('SELECT * FROM events'),
      db.query('SELECT * FROM vendors'),
      db.query('SELECT * FROM staff'),
      db.query('SELECT * FROM payments')
    ]);

    // 1. KPI Counts
    const totalEvents = events.length;
    const activeEvents = events.filter(e => !['Completed', 'Cancelled'].includes(e.status)).length;
    const totalVendors = vendors.length;
    const totalStaff = staff.length;
    
    // Pending assignments (events with Pending status or lacking critical resources)
    const pendingAssignments = events.filter(e => e.status === 'Pending').length;

    // Payments Pending (payments with Pending/Overdue status)
    const paymentsPending = payments.filter(p => p.status !== 'Paid').length;

    // 2. Conflict Alerts
    // Build list of assignments grouped by date to find overlaps
    const [vendorAssignments, staffAssignments] = await Promise.all([
      db.query(`
        SELECT a.resource_id, e.event_date
        FROM assignments a
        JOIN events e ON a.event_id = e.id
        WHERE a.resource_type = 'vendor'
      `),
      db.query(`
        SELECT a.resource_id, e.event_date
        FROM assignments a
        JOIN events e ON a.event_id = e.id
        WHERE a.resource_type = 'staff'
      `)
    ]);

    const detectOverlapCount = (list) => {
      const dates = {};
      list.forEach(item => {
        const key = `${item.resource_id}_${item.event_date}`;
        dates[key] = (dates[key] || 0) + 1;
      });
      return Object.values(dates).filter(count => count > 1).length;
    };

    const conflictAlerts = detectOverlapCount(vendorAssignments) + detectOverlapCount(staffAssignments);

    return res.status(200).json({
      totalEvents,
      activeEvents,
      totalVendors,
      totalStaff,
      pendingAssignments,
      conflictAlerts,
      paymentsPending
    });
  } catch (err) {
    console.error('KPI Stats error:', err);
    return res.status(500).json({ message: 'Error compiling KPI dashboard data' });
  }
};

exports.getChartsData = async (req, res) => {
  try {
    const [events, vendors, staff, assignments] = await Promise.all([
      db.query('SELECT * FROM events'),
      db.query('SELECT * FROM vendors'),
      db.query('SELECT * FROM staff'),
      db.query('SELECT * FROM assignments')
    ]);

    // 1. Monthly Events (Recharts Line/Bar)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const eventCounts = Array(12).fill(0);
    
    events.forEach(e => {
      const d = new Date(e.event_date);
      if (d.getFullYear() === currentYear) {
        eventCounts[d.getMonth()]++;
      }
    });

    const monthlyEvents = months.map((m, idx) => ({
      name: m,
      events: eventCounts[idx]
    }));

    // 2. Vendor Utilization (Category distribution + assignment rate)
    // Assigned vendors: total vendors currently assigned to at least one upcoming/active event
    const assignedVendorIds = new Set(assignments.filter(a => a.resource_type === 'vendor').map(a => a.resource_id));
    const categories = ['Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team'];
    
    const vendorUtilization = categories.map(cat => {
      const catVendors = vendors.filter(v => v.category === cat);
      const total = catVendors.length;
      const assigned = catVendors.filter(v => assignedVendorIds.has(v.id)).length;
      const rate = total > 0 ? Math.round((assigned / total) * 100) : 0;
      return {
        name: cat,
        total,
        assigned,
        utilizationRate: rate
      };
    });

    // 3. Staff Utilization (Role distribution + assignment rate)
    const assignedStaffIds = new Set(assignments.filter(a => a.resource_type === 'staff').map(a => a.resource_id));
    const roles = ['Supervisor', 'Coordinator', 'Technician', 'Helper'];

    const staffUtilization = roles.map(role => {
      const roleStaff = staff.filter(s => s.role === role);
      const total = roleStaff.length;
      const assigned = roleStaff.filter(s => assignedStaffIds.has(s.id)).length;
      const rate = total > 0 ? Math.round((assigned / total) * 100) : 0;
      return {
        name: role,
        total,
        assigned,
        utilizationRate: rate
      };
    });

    return res.status(200).json({
      monthlyEvents,
      vendorUtilization,
      staffUtilization
    });
  } catch (err) {
    console.error('Charts Data error:', err);
    return res.status(500).json({ message: 'Error compiling analytics charts' });
  }
};

exports.getRecentActivities = async (req, res) => {
  try {
    const logs = await db.query('SELECT * FROM activity_logs ORDER BY timestamp DESC');
    // Return top 10 logs
    return res.status(200).json(logs.slice(0, 10));
  } catch (err) {
    console.error('Recent activity error:', err);
    return res.status(500).json({ message: 'Error fetching logs' });
  }
};
