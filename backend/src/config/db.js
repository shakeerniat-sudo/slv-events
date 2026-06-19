const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool = null;
let isDemoMode = false;
const dbPath = path.join(__dirname, '../../data/demo_db.json');

// Initial seed data for Demo Mode
const defaultSeedData = {
  users: [
    { id: 1, name: 'Admin User', email: 'admin@slvevents.com', password_hash: '$2a$10$gLt7glnqhIadRNBeuqbQJO2cO.PCeLuSoThrv6KqkNdp1EEQ9Zkae', role: 'Admin', created_at: new Date().toISOString() }, // pw: admin123
    { id: 2, name: 'Coordinator User', email: 'coordinator@slvevents.com', password_hash: '$2a$10$gLt7glnqhIadRNBeuqbQJO2cO.PCeLuSoThrv6KqkNdp1EEQ9Zkae', role: 'Vendor Coordinator', created_at: new Date().toISOString() },
    { id: 3, name: 'Operations User', email: 'operations@slvevents.com', password_hash: '$2a$10$gLt7glnqhIadRNBeuqbQJO2cO.PCeLuSoThrv6KqkNdp1EEQ9Zkae', role: 'Operations Lead', created_at: new Date().toISOString() },
    { id: 4, name: 'Finance User', email: 'finance@slvevents.com', password_hash: '$2a$10$gLt7glnqhIadRNBeuqbQJO2cO.PCeLuSoThrv6KqkNdp1EEQ9Zkae', role: 'Finance Team', created_at: new Date().toISOString() }
  ],
  clients: [
    { id: 1, name: 'John Doe', phone: '+91 98765 43210', email: 'john@example.com', company_name: 'TechCorp', created_at: new Date().toISOString() },
    { id: 2, name: 'Sarah Jenkins', phone: '+91 98765 12345', email: 'sarah@example.com', company_name: 'Jenkins & Co', created_at: new Date().toISOString() }
  ],
  events: [
    { id: 1, name: 'TechCorp Annual Gala 2026', client_id: 1, event_type: 'Corporate', event_date: '2026-07-15', venue: 'Grand Palace Hall, Bangalore', budget: 150000.00, guest_count: 300, theme_preference: 'Gold & Black Premium', status: 'Assigned', notes: 'Needs top decorators and anchors.', created_at: new Date().toISOString() },
    { id: 2, name: 'Sarah Wedding Reception', client_id: 2, event_type: 'Wedding', event_date: '2026-07-20', venue: 'Lakeside Pavilion', budget: 350000.00, guest_count: 500, theme_preference: 'Floral Fantasy', status: 'Pending', notes: 'Provide custom catering preferences.', created_at: new Date().toISOString() },
    { id: 3, name: 'Product Launch 2026', client_id: 1, event_type: 'Corporate', event_date: '2026-08-05', venue: 'Sheraton Convention Center', budget: 80000.00, guest_count: 150, theme_preference: 'Futuristic Tech', status: 'Pending', notes: 'Requires high quality sound and technicians.', created_at: new Date().toISOString() }
  ],
  vendors: [
    { id: 1, name: 'Royal Decorators', category: 'Decorator', contact_person: 'Ramesh Kumar', phone: '+91 91111 22222', email: 'royal@decors.com', service_type: 'Premium Decor', price_range: 'High', rating: 4.8, availability_status: 'Available', created_at: new Date().toISOString() },
    { id: 2, name: 'Spice Route Catering', category: 'Caterer', contact_person: 'Anil Nair', phone: '+91 92222 33333', email: 'spice@route.com', service_type: 'Multi-cuisine Buffet', price_range: 'Medium', rating: 4.5, availability_status: 'Available', created_at: new Date().toISOString() },
    { id: 3, name: 'Pixel Perfect Photography', category: 'Photographer', contact_person: 'Vikram Sen', phone: '+91 93333 44444', email: 'pixel@perfect.com', service_type: 'Candid & Cinematic', price_range: 'High', rating: 4.9, availability_status: 'Available', created_at: new Date().toISOString() },
    { id: 4, name: 'Anchor Sameer', category: 'Anchor', contact_person: 'Sameer Khan', phone: '+91 94444 55555', email: 'sameer@anchor.com', service_type: 'Emcee & Stand-up', price_range: 'Medium', rating: 4.7, availability_status: 'Available', created_at: new Date().toISOString() },
    { id: 5, name: 'Boom Sound & Stage', category: 'Sound Team', contact_person: 'DJ Alok', phone: '+91 95555 66666', email: 'boom@sound.com', service_type: 'JBL Line Array System', price_range: 'High', rating: 4.6, availability_status: 'Available', created_at: new Date().toISOString() }
  ],
  staff: [
    { id: 1, name: 'Rohan Sharma', role: 'Supervisor', phone: '+91 81111 11111', experience_years: 5, availability_status: 'Available', created_at: new Date().toISOString() },
    { id: 2, name: 'Amit Patel', role: 'Coordinator', phone: '+91 82222 22222', experience_years: 3, availability_status: 'Available', created_at: new Date().toISOString() },
    { id: 3, name: 'Suresh Das', role: 'Technician', phone: '+91 83333 33333', experience_years: 4, availability_status: 'Available', created_at: new Date().toISOString() },
    { id: 4, name: 'Karan Kumar', role: 'Helper', phone: '+91 84444 44444', experience_years: 1, availability_status: 'Available', created_at: new Date().toISOString() },
    { id: 5, name: 'Vijay Singh', role: 'Helper', phone: '+91 85555 55555', experience_years: 2, availability_status: 'Available', created_at: new Date().toISOString() }
  ],
  assignments: [
    { id: 1, event_id: 1, resource_type: 'vendor', resource_id: 1, status: 'Confirmed', assigned_at: new Date().toISOString() },
    { id: 2, event_id: 1, resource_type: 'vendor', resource_id: 3, status: 'Confirmed', assigned_at: new Date().toISOString() },
    { id: 3, event_id: 1, resource_type: 'staff', resource_id: 1, status: 'Confirmed', assigned_at: new Date().toISOString() },
    { id: 4, event_id: 1, resource_type: 'staff', resource_id: 4, status: 'Pending', assigned_at: new Date().toISOString() }
  ],
  vendor_availability: [],
  staff_availability: [],
  inventory: [
    { id: 1, item_name: 'Chairs (Banquet Gold)', quantity: 1000, available_quantity: 700, status: 'In Stock', created_at: new Date().toISOString() },
    { id: 2, item_name: 'Round Tables (Veneer)', quantity: 100, available_quantity: 70, status: 'In Stock', created_at: new Date().toISOString() },
    { id: 3, item_name: 'LED Ambience Lights', quantity: 200, available_quantity: 150, status: 'In Stock', created_at: new Date().toISOString() },
    { id: 4, item_name: 'JBL VRX Line Array Speakers', quantity: 12, available_quantity: 12, status: 'In Stock', created_at: new Date().toISOString() },
    { id: 5, item_name: 'Stage Floral Setup Arch', quantity: 5, available_quantity: 4, status: 'In Stock', created_at: new Date().toISOString() }
  ],
  payments: [
    { id: 1, event_id: 1, type: 'client', vendor_id: null, total_amount: 150000.00, advance: 50000.00, balance: 100000.00, amount: 50000.00, due_date: '2026-07-01', status: 'Paid', paid_at: new Date().toISOString(), notes: 'Advance payment received', created_at: new Date().toISOString() },
    { id: 2, event_id: 1, type: 'vendor', vendor_id: 1, total_amount: 0.00, advance: 0.00, balance: 0.00, amount: 25000.00, due_date: '2026-07-15', status: 'Pending', paid_at: null, notes: 'Advance for decoration stage design', created_at: new Date().toISOString() },
    { id: 3, event_id: 2, type: 'client', vendor_id: null, total_amount: 350000.00, advance: 0.00, balance: 350000.00, amount: 100000.00, due_date: '2026-06-30', status: 'Pending', paid_at: null, notes: 'First installment due', created_at: new Date().toISOString() }
  ],
  quotations: [],
  notifications: [
    { id: 1, title: 'New Event Booking', message: 'Corporate event "Product Launch 2026" has been created.', type: 'Upcoming Event', is_read: 0, created_at: new Date().toISOString() },
    { id: 2, title: 'Pending Vendor Booking', message: 'Royal Decorators has a pending assignment for TechCorp Annual Gala.', type: 'Assignment Confirmation', is_read: 0, created_at: new Date().toISOString() }
  ],
  activity_logs: [
    { id: 1, user_id: 1, user_name: 'Admin User', action: 'CREATE_EVENT', details: 'Created event: TechCorp Annual Gala 2026', timestamp: new Date().toISOString() }
  ],
  event_assignments: []
};

// Check and initialize JSON database file
function initJsonDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultSeedData, null, 2), 'utf-8');
  }
}

// Read/Write helper for JSON db
function readJsonDb() {
  initJsonDb();
  const raw = fs.readFileSync(dbPath, 'utf-8');
  return JSON.parse(raw);
}

function writeJsonDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Simple SQL interpreter for JSON DB Fallback
function runJsonQuery(sql, params = []) {
  const db = readJsonDb();
  const sqlClean = sql.replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. SELECT * FROM users WHERE email = ?
  if (sqlClean.includes('select * from users where email = ?')) {
    const email = params[0];
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user ? [user] : [];
  }
  
  // 2. SELECT * FROM users WHERE id = ?
  if (sqlClean.includes('select * from users where id = ?')) {
    const id = parseInt(params[0]);
    const user = db.users.find(u => u.id === id);
    return user ? [user] : [];
  }

  // 3. INSERT INTO users
  if (sqlClean.startsWith('insert into users')) {
    const newId = db.users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
    const user = {
      id: newId,
      name: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3],
      created_at: new Date().toISOString()
    };
    db.users.push(user);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 4. SELECT JOIN events and clients (all events)
  if (sqlClean.startsWith('select e.*, c.name as client_name') && !sqlClean.includes('where e.id = ?')) {
    const list = db.events.map(ev => {
      const client = db.clients.find(c => c.id === ev.client_id) || {};
      return {
        ...ev,
        client_name: client.name || '',
        client_phone: client.phone || '',
        client_email: client.email || ''
      };
    });
    return list;
  }

  // 5. SELECT JOIN events and clients by ID
  if (sqlClean.startsWith('select e.*, c.name as client_name') && sqlClean.includes('where e.id = ?')) {
    const eventId = parseInt(params[0]);
    const ev = db.events.find(e => e.id === eventId);
    if (!ev) return [];
    const client = db.clients.find(c => c.id === ev.client_id) || {};
    return [{
      ...ev,
      client_name: client.name || '',
      client_phone: client.phone || '',
      client_email: client.email || ''
    }];
  }

  // 6. SELECT clients
  if (sqlClean.startsWith('select * from clients')) {
    if (sqlClean.includes('where name = ? and phone = ?')) {
      return db.clients.filter(c => c.name === params[0] && c.phone === params[1]);
    }
    if (sqlClean.includes('where id = ?')) {
      return db.clients.filter(c => c.id === parseInt(params[0]));
    }
    return db.clients;
  }

  // 7. INSERT INTO clients
  if (sqlClean.startsWith('insert into clients')) {
    const newId = db.clients.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const client = {
      id: newId,
      name: params[0],
      phone: params[1],
      email: params[2],
      company_name: params[3],
      created_at: new Date().toISOString()
    };
    db.clients.push(client);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 8. INSERT INTO events
  if (sqlClean.startsWith('insert into events')) {
    const newId = db.events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    const event = {
      id: newId,
      name: params[0],
      client_id: parseInt(params[1]),
      event_type: params[2],
      event_date: params[3],
      venue: params[4],
      budget: parseFloat(params[5]),
      guest_count: parseInt(params[6]),
      theme_preference: params[7],
      notes: params[8],
      status: params[9] || 'Pending',
      created_at: new Date().toISOString()
    };
    db.events.push(event);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 9. UPDATE events
  if (sqlClean.startsWith('update events set')) {
    const eventId = parseInt(params[params.length - 1]);
    const evIdx = db.events.findIndex(e => e.id === eventId);
    if (evIdx !== -1) {
      db.events[evIdx] = {
        ...db.events[evIdx],
        name: params[0],
        event_type: params[1],
        event_date: params[2],
        venue: params[3],
        budget: parseFloat(params[4]),
        guest_count: parseInt(params[5]),
        theme_preference: params[6],
        notes: params[7],
        status: params[8]
      };
      writeJsonDb(db);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 10. DELETE FROM events
  if (sqlClean.startsWith('delete from events where id = ?')) {
    const eventId = parseInt(params[0]);
    const origLength = db.events.length;
    db.events = db.events.filter(e => e.id !== eventId);
    db.assignments = db.assignments.filter(a => a.event_id !== eventId); // Cascade delete simulation
    db.payments = db.payments.filter(p => p.event_id !== eventId); // Cascade delete simulation
    writeJsonDb(db);
    return { affectedRows: origLength - db.events.length };
  }

  // 11. SELECT vendors
  if (sqlClean.startsWith('select * from vendors')) {
    if (sqlClean.includes('where id = ?')) {
      const vendor = db.vendors.find(v => v.id === parseInt(params[0]));
      return vendor ? [vendor] : [];
    }
    return db.vendors;
  }

  // 12. INSERT INTO vendors
  if (sqlClean.startsWith('insert into vendors')) {
    const newId = db.vendors.reduce((max, v) => Math.max(max, v.id), 0) + 1;
    const vendor = {
      id: newId,
      name: params[0],
      category: params[1],
      contact_person: params[2],
      phone: params[3],
      email: params[4],
      service_type: params[5],
      price_range: params[6],
      rating: parseFloat(params[7]) || 5.0,
      availability_status: params[8] || 'Available',
      created_at: new Date().toISOString()
    };
    db.vendors.push(vendor);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 13. UPDATE vendors
  if (sqlClean.startsWith('update vendors set')) {
    const id = parseInt(params[params.length - 1]);
    const idx = db.vendors.findIndex(v => v.id === id);
    if (idx !== -1) {
      db.vendors[idx] = {
        ...db.vendors[idx],
        name: params[0],
        category: params[1],
        contact_person: params[2],
        phone: params[3],
        email: params[4],
        service_type: params[5],
        price_range: params[6],
        rating: parseFloat(params[7]),
        availability_status: params[8]
      };
      writeJsonDb(db);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 14. DELETE FROM vendors
  if (sqlClean.startsWith('delete from vendors where id = ?')) {
    const id = parseInt(params[0]);
    const len = db.vendors.length;
    db.vendors = db.vendors.filter(v => v.id !== id);
    db.assignments = db.assignments.filter(a => !(a.resource_type === 'vendor' && a.resource_id === id));
    writeJsonDb(db);
    return { affectedRows: len - db.vendors.length };
  }

  // 15. SELECT staff
  if (sqlClean.startsWith('select * from staff')) {
    if (sqlClean.includes('where id = ?')) {
      const st = db.staff.find(s => s.id === parseInt(params[0]));
      return st ? [st] : [];
    }
    return db.staff;
  }

  // 16. INSERT INTO staff
  if (sqlClean.startsWith('insert into staff')) {
    const newId = db.staff.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    const st = {
      id: newId,
      name: params[0],
      role: params[1],
      phone: params[2],
      experience_years: parseInt(params[3]) || 0,
      availability_status: params[4] || 'Available',
      created_at: new Date().toISOString()
    };
    db.staff.push(st);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 17. UPDATE staff
  if (sqlClean.startsWith('update staff set')) {
    const id = parseInt(params[params.length - 1]);
    const idx = db.staff.findIndex(s => s.id === id);
    if (idx !== -1) {
      db.staff[idx] = {
        ...db.staff[idx],
        name: params[0],
        role: params[1],
        phone: params[2],
        experience_years: parseInt(params[3]),
        availability_status: params[4]
      };
      writeJsonDb(db);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 18. DELETE FROM staff
  if (sqlClean.startsWith('delete from staff where id = ?')) {
    const id = parseInt(params[0]);
    const len = db.staff.length;
    db.staff = db.staff.filter(s => s.id !== id);
    db.assignments = db.assignments.filter(a => !(a.resource_type === 'staff' && a.resource_id === id));
    writeJsonDb(db);
    return { affectedRows: len - db.staff.length };
  }

  // 19. SELECT assignments JOIN vendors
  if (sqlClean.startsWith('select a.*, v.name as vendor_name') && sqlClean.includes("resource_type = 'vendor'")) {
    const eventId = parseInt(params[0]);
    const list = db.assignments
      .filter(a => a.event_id === eventId && a.resource_type === 'vendor')
      .map(a => {
        const v = db.vendors.find(vd => vd.id === a.resource_id) || {};
        return {
          ...a,
          vendor_name: v.name || 'Unknown',
          vendor_category: v.category || 'Decorator'
        };
      });
    return list;
  }

  // 20. SELECT assignments JOIN staff
  if (sqlClean.startsWith('select a.*, s.name as staff_name') && sqlClean.includes("resource_type = 'staff'")) {
    const eventId = parseInt(params[0]);
    const list = db.assignments
      .filter(a => a.event_id === eventId && a.resource_type === 'staff')
      .map(a => {
        const s = db.staff.find(st => st.id === a.resource_id) || {};
        return {
          ...a,
          staff_name: s.name || 'Unknown',
          staff_role: s.role || 'Helper'
        };
      });
    return list;
  }

  // 21. SELECT * FROM assignments
  if (sqlClean.startsWith('select * from assignments')) {
    if (sqlClean.includes('where event_id = ?')) {
      return db.assignments.filter(a => a.event_id === parseInt(params[0]));
    }
    return db.assignments;
  }

  // 22. INSERT INTO assignments
  if (sqlClean.startsWith('insert into assignments')) {
    const newId = db.assignments.reduce((max, a) => Math.max(max, a.id), 0) + 1;
    // Check unique constraint first
    const exists = db.assignments.some(
      a => a.event_id === parseInt(params[0]) && a.resource_type === params[1] && a.resource_id === parseInt(params[2])
    );
    if (exists) {
      throw new Error('Duplicate entry for assignment');
    }
    const ass = {
      id: newId,
      event_id: parseInt(params[0]),
      resource_type: params[1],
      resource_id: parseInt(params[2]),
      status: params[3] || 'Pending',
      assigned_at: new Date().toISOString()
    };
    db.assignments.push(ass);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 23. DELETE assignments
  if (sqlClean.startsWith('delete from assignments where id = ?')) {
    const id = parseInt(params[0]);
    const len = db.assignments.length;
    db.assignments = db.assignments.filter(a => a.id !== id);
    writeJsonDb(db);
    return { affectedRows: len - db.assignments.length };
  }
  if (sqlClean.startsWith('delete from assignments where event_id = ? and resource_type = ? and resource_id = ?')) {
    const evId = parseInt(params[0]);
    const type = params[1];
    const resId = parseInt(params[2]);
    const len = db.assignments.length;
    db.assignments = db.assignments.filter(a => !(a.event_id === evId && a.resource_type === type && a.resource_id === resId));
    writeJsonDb(db);
    return { affectedRows: len - db.assignments.length };
  }

  // 24. SELECT payments JOIN events LEFT JOIN vendors
  if (sqlClean.startsWith('select p.*, e.name as event_name')) {
    const list = db.payments.map(p => {
      const e = db.events.find(ev => ev.id === p.event_id) || {};
      const v = p.vendor_id ? db.vendors.find(vd => vd.id === p.vendor_id) : null;
      return {
        ...p,
        event_name: e.name || 'Unknown Event',
        vendor_name: v ? v.name : null
      };
    });
    return list;
  }

  // 25. INSERT payments
  if (sqlClean.startsWith('insert into payments')) {
    const newId = db.payments.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const payment = {
      id: newId,
      event_id: parseInt(params[0]),
      type: params[1],
      vendor_id: params[2] ? parseInt(params[2]) : null,
      total_amount: parseFloat(params[3]) || 0,
      advance: parseFloat(params[4]) || 0,
      balance: parseFloat(params[5]) || 0,
      amount: parseFloat(params[6]) || 0,
      due_date: params[7],
      status: params[8] || 'Pending',
      paid_at: params[9] || null,
      notes: params[10] || '',
      created_at: new Date().toISOString()
    };
    db.payments.push(payment);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 26. UPDATE payments
  if (sqlClean.startsWith('update payments set')) {
    const id = parseInt(params[params.length - 1]);
    const idx = db.payments.findIndex(p => p.id === id);
    if (idx !== -1) {
      db.payments[idx] = {
        ...db.payments[idx],
        status: params[0],
        paid_at: params[1],
        amount: parseFloat(params[2]) || db.payments[idx].amount,
        due_date: params[3] || db.payments[idx].due_date,
        notes: params[4] || db.payments[idx].notes,
        advance: params[5] !== undefined ? parseFloat(params[5]) : db.payments[idx].advance,
        balance: params[6] !== undefined ? parseFloat(params[6]) : db.payments[idx].balance
      };
      writeJsonDb(db);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 27. DELETE payments
  if (sqlClean.startsWith('delete from payments where id = ?')) {
    const id = parseInt(params[0]);
    const len = db.payments.length;
    db.payments = db.payments.filter(p => p.id !== id);
    writeJsonDb(db);
    return { affectedRows: len - db.payments.length };
  }

  // 28. SELECT inventory
  if (sqlClean.startsWith('select * from inventory')) {
    if (sqlClean.includes('where id = ?')) {
      const item = db.inventory.find(i => i.id === parseInt(params[0]));
      return item ? [item] : [];
    }
    return db.inventory;
  }

  // 29. INSERT inventory
  if (sqlClean.startsWith('insert into inventory')) {
    const newId = db.inventory.reduce((max, i) => Math.max(max, i.id), 0) + 1;
    const item = {
      id: newId,
      item_name: params[0],
      quantity: parseInt(params[1]) || 0,
      available_quantity: parseInt(params[2]) || 0,
      status: params[3] || 'In Stock',
      created_at: new Date().toISOString()
    };
    db.inventory.push(item);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 30. UPDATE inventory
  if (sqlClean.startsWith('update inventory set')) {
    const id = parseInt(params[params.length - 1]);
    const idx = db.inventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      db.inventory[idx] = {
        ...db.inventory[idx],
        item_name: params[0],
        quantity: parseInt(params[1]),
        available_quantity: parseInt(params[2]),
        status: params[3]
      };
      writeJsonDb(db);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 31. DELETE inventory
  if (sqlClean.startsWith('delete from inventory where id = ?')) {
    const id = parseInt(params[0]);
    const len = db.inventory.length;
    db.inventory = db.inventory.filter(i => i.id !== id);
    writeJsonDb(db);
    return { affectedRows: len - db.inventory.length };
  }

  // 32. SELECT notifications
  if (sqlClean.startsWith('select * from notifications')) {
    if (sqlClean.includes('where is_deleted = 0 or is_deleted is null')) {
      return db.notifications.filter(n => !n.is_deleted).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return db.notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // 33. INSERT notification
  if (sqlClean.startsWith('insert into notifications')) {
    const newId = db.notifications.reduce((max, n) => Math.max(max, n.id), 0) + 1;
    const notification = {
      id: newId,
      title: params[0],
      message: params[1],
      type: params[2],
      is_read: 0,
      created_at: new Date().toISOString()
    };
    db.notifications.push(notification);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 34. UPDATE notifications
  if (sqlClean.startsWith('update notifications set is_read = ? where id = ?')) {
    const id = parseInt(params[1]);
    const idx = db.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      db.notifications[idx].is_read = parseInt(params[0]);
      writeJsonDb(db);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 34b. DELETE FROM notifications (Legacy hard delete, kept for internal sync cleanup)
  if (sqlClean.startsWith('delete from notifications')) {
    const orig = db.notifications.length;
    if (sqlClean.includes('where')) {
      if (sqlClean.includes('type = ? and message = ?')) {
        db.notifications = db.notifications.filter(n => !(n.type === params[0] && n.message === params[1]));
      } else if (sqlClean.includes('title = ? and type = ?')) {
        db.notifications = db.notifications.filter(n => !(n.title === params[0] && n.type === params[1]));
      } else if (sqlClean.includes('id = ?')) {
        db.notifications = db.notifications.filter(n => n.id !== parseInt(params[0]));
      }
    } else {
      db.notifications = [];
    }
    writeJsonDb(db);
    return { affectedRows: orig - db.notifications.length };
  }

  // 34c. UPDATE notifications is_deleted (Soft Delete)
  if (sqlClean.startsWith('update notifications set is_deleted = 1')) {
    if (sqlClean.includes('where id = ?')) {
      const id = parseInt(params[0]);
      const idx = db.notifications.findIndex(n => n.id === id);
      if (idx !== -1) {
        db.notifications[idx].is_deleted = 1;
        writeJsonDb(db);
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    } else {
      let count = 0;
      db.notifications.forEach(n => {
        if (!n.is_deleted) {
          n.is_deleted = 1;
          count++;
        }
      });
      writeJsonDb(db);
      return { affectedRows: count };
    }
  }

  // 35. SELECT activity_logs
  if (sqlClean.startsWith('select * from activity_logs')) {
    return db.activity_logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // 36. INSERT activity_log
  if (sqlClean.startsWith('insert into activity_logs')) {
    const newId = db.activity_logs.reduce((max, a) => Math.max(max, a.id), 0) + 1;
    const log = {
      id: newId,
      user_id: params[0] ? parseInt(params[0]) : null,
      user_name: params[1],
      action: params[2],
      details: params[3],
      timestamp: new Date().toISOString()
    };
    db.activity_logs.push(log);
    writeJsonDb(db);
    return { insertId: newId };
  }

  // 37. SELECT event_assignments
  if (sqlClean.startsWith('select * from event_assignments') && sqlClean.includes('where event_id = ?')) {
    const eventId = parseInt(params[0]);
    if (!db.event_assignments) db.event_assignments = [];
    const ass = db.event_assignments.find(a => a.event_id === eventId);
    return ass ? [ass] : [];
  }

  // 38. INSERT INTO event_assignments
  if (sqlClean.startsWith('insert into event_assignments')) {
    if (!db.event_assignments) db.event_assignments = [];
    const newId = db.event_assignments.reduce((max, a) => Math.max(max, a.assignment_id || a.id || 0), 0) + 1;
    const eventId = parseInt(params[0]);
    const existingIdx = db.event_assignments.findIndex(a => a.event_id === eventId);
    
    const record = {
      assignment_id: newId,
      event_id: eventId,
      decorator_id: params[1] ? parseInt(params[1]) : null,
      caterer_id: params[2] ? parseInt(params[2]) : null,
      photographer_id: params[3] ? parseInt(params[3]) : null,
      anchor_id: params[4] ? parseInt(params[4]) : null,
      sound_team_id: params[5] ? parseInt(params[5]) : null,
      staff_ids: params[6] || '',
      status: params[7] || 'Assigned',
      assigned_by: params[8] || 'Admin',
      assigned_at: new Date().toISOString()
    };
    
    if (existingIdx !== -1) {
      db.event_assignments[existingIdx] = {
        ...db.event_assignments[existingIdx],
        ...record,
        assignment_id: db.event_assignments[existingIdx].assignment_id
      };
    } else {
      db.event_assignments.push(record);
    }
    writeJsonDb(db);
    return { insertId: newId, affectedRows: 1 };
  }

  // 39. UPDATE event_assignments
  if (sqlClean.startsWith('update event_assignments set')) {
    if (!db.event_assignments) db.event_assignments = [];
    const eventId = parseInt(params[params.length - 1]);
    const idx = db.event_assignments.findIndex(a => a.event_id === eventId);
    if (idx !== -1) {
      db.event_assignments[idx] = {
        ...db.event_assignments[idx],
        decorator_id: params[0] ? parseInt(params[0]) : null,
        caterer_id: params[1] ? parseInt(params[1]) : null,
        photographer_id: params[2] ? parseInt(params[2]) : null,
        anchor_id: params[3] ? parseInt(params[3]) : null,
        sound_team_id: params[4] ? parseInt(params[4]) : null,
        staff_ids: params[5] || '',
        status: params[6] || 'Assigned',
        assigned_by: params[7] || 'Admin',
        assigned_at: new Date().toISOString()
      };
      writeJsonDb(db);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 40. DELETE FROM event_assignments
  if (sqlClean.startsWith('delete from event_assignments where event_id = ?')) {
    if (!db.event_assignments) db.event_assignments = [];
    const eventId = parseInt(params[0]);
    const orig = db.event_assignments.length;
    db.event_assignments = db.event_assignments.filter(a => a.event_id !== eventId);
    writeJsonDb(db);
    return { affectedRows: orig - db.event_assignments.length };
  }

  // Catch-all or unhandled query fallback simulation
  console.warn(`[JSON DB Engine] Query unhandled, returning empty list: "${sql}"`);
  return [];
}

// Database Connection & Initialization Lifecycle
async function connectDb() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || 3306;

  if (!host || !user) {
    console.log('\n========================================================================');
    console.log('⚠️  DATABASE NOTICE: DB_HOST or DB_USER not provided in environment.');
    console.log('🔌 Switching to DEMO MODE using file-based JSON database (stateful).');
    console.log('========================================================================\n');
    isDemoMode = true;
    initJsonDb();
    return;
  }

  try {
    const poolConfig = {
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

    if (host.includes('aivencloud.com') || host.includes('tidbcloud.com') || process.env.DB_SSL === 'true') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = mysql.createPool(poolConfig);
    // Test connection
    const conn = await pool.getConnection();
    console.log(`✅ Database Connected Successfully to MySQL at ${host}:${port}/${database}`);
    try {
      await conn.query('ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL');
      console.log('✅ Schema migration for notifications table completed successfully (modified type to VARCHAR(50)).');
    } catch (migErr) {
      console.warn('⚠️ Notification table alter query warning:', migErr.message);
    }
    try {
      await conn.query('ALTER TABLE notifications ADD COLUMN is_deleted BOOLEAN DEFAULT 0');
      console.log('✅ Schema migration: Added is_deleted column to notifications table.');
    } catch (migErr) {
      // Ignored if column already exists
      if (migErr.code !== 'ER_DUP_FIELDNAME') {
        console.warn('⚠️ Notification table add column warning:', migErr.message);
      }
    }
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS event_assignments (
          assignment_id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT UNIQUE NOT NULL,
          decorator_id INT DEFAULT NULL,
          caterer_id INT DEFAULT NULL,
          photographer_id INT DEFAULT NULL,
          anchor_id INT DEFAULT NULL,
          sound_team_id INT DEFAULT NULL,
          staff_ids VARCHAR(255) DEFAULT NULL,
          status VARCHAR(50) DEFAULT 'Assigned',
          assigned_by VARCHAR(100) DEFAULT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ Schema migration for event_assignments table completed successfully.');
    } catch (migErr) {
      console.warn('⚠️ Event assignments table creation warning:', migErr.message);
    }
    conn.release();
    isDemoMode = false;
  } catch (err) {
    console.log('\n========================================================================');
    console.log(`❌ MySQL Connection Failed: ${err.message}`);
    console.log('🔌 Switching to DEMO MODE using file-based JSON database (stateful).');
    console.log('========================================================================\n');
    isDemoMode = true;
    initJsonDb();
  }
}

// Public API matching pool.execute
const db = {
  query: async (sql, params = []) => {
    if (!isDemoMode && pool) {
      const [rows] = await pool.query(sql, params);
      return rows;
    } else {
      return runJsonQuery(sql, params);
    }
  },
  execute: async (sql, params = []) => {
    if (!isDemoMode && pool) {
      const [result] = await pool.execute(sql, params);
      return result;
    } else {
      return runJsonQuery(sql, params);
    }
  },
  isDemo: () => isDemoMode,
  connectDb
};

module.exports = db;
