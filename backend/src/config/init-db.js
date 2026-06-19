const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const db = require('./db');

async function initializeDatabase() {
  console.log('🔄 Connecting and initializing database schema on TiDB Cloud...');
  
  try {
    const schemaPath = path.join(__dirname, '../../data/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split queries by semicolon, filter out empty ones
    const queries = schemaSql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    console.log(`📋 Found ${queries.length} queries to execute.`);

    // Connect first
    await db.connectDb();
    
    if (db.isDemo()) {
      console.log('❌ Connection failed (reverted to Demo Mode). Please verify your .env credentials.');
      process.exit(1);
    }

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      // Clean query text for logging
      const firstLine = query.split('\n')[0].trim();
      
      // Skip USE statements or DB creation since we are already connected to DB_NAME
      if (query.toUpperCase().startsWith('CREATE DATABASE') || query.toUpperCase().startsWith('USE')) {
        console.log(`➡️ Skipping: "${firstLine}"`);
        continue;
      }
      
      console.log(`⚡ Executing query ${i + 1}/${queries.length}: "${firstLine.substring(0, 60)}..."`);
      await db.query(query);
    }

    console.log('\n🌱 Checking table seeding status...');

    // 1. Seed users
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
    if (usersCount[0].count === 0) {
      console.log('🌱 Seeding default users...');
      await db.query(`
        INSERT INTO users (id, name, email, password_hash, role) VALUES 
        (1, 'Admin User', 'admin@slvevents.com', '$2a$10$gLt7glnqhIadRNBeuqbQJO2cO.PCeLuSoThrv6KqkNdp1EEQ9Zkae', 'Admin'),
        (2, 'Coordinator User', 'coordinator@slvevents.com', '$2a$10$gLt7glnqhIadRNBeuqbQJO2cO.PCeLuSoThrv6KqkNdp1EEQ9Zkae', 'Vendor Coordinator'),
        (3, 'Operations User', 'operations@slvevents.com', '$2a$10$gLt7glnqhIadRNBeuqbQJO2cO.PCeLuSoThrv6KqkNdp1EEQ9Zkae', 'Operations Lead'),
        (4, 'Finance User', 'finance@slvevents.com', '$2a$10$gLt7glnqhIadRNBeuqbQJO2cO.PCeLuSoThrv6KqkNdp1EEQ9Zkae', 'Finance Team')
      `);
    } else {
      console.log('➡️ Users table is already populated.');
    }

    // 2. Seed clients
    const clientsCount = await db.query('SELECT COUNT(*) as count FROM clients');
    if (clientsCount[0].count === 0) {
      console.log('🌱 Seeding default clients...');
      await db.query(`
        INSERT INTO clients (id, name, phone, email, company_name) VALUES 
        (1, 'John Doe', '+91 98765 43210', 'john@example.com', 'TechCorp'),
        (2, 'Sarah Jenkins', '+91 98765 12345', 'sarah@example.com', 'Jenkins & Co')
      `);
    } else {
      console.log('➡️ Clients table is already populated.');
    }

    // 3. Seed events
    const eventsCount = await db.query('SELECT COUNT(*) as count FROM events');
    if (eventsCount[0].count === 0) {
      console.log('🌱 Seeding default events...');
      await db.query(`
        INSERT INTO events (id, name, client_id, event_type, event_date, venue, budget, guest_count, theme_preference, status, notes) VALUES 
        (1, 'TechCorp Annual Gala 2026', 1, 'Corporate', '2026-07-15', 'Grand Palace Hall, Bangalore', 150000.00, 300, 'Gold & Black Premium', 'Assigned', 'Needs top decorators and anchors.'),
        (2, 'Sarah Wedding Reception', 2, 'Wedding', '2026-07-20', 'Lakeside Pavilion', 350000.00, 500, 'Floral Fantasy', 'Pending', 'Provide custom catering preferences.'),
        (3, 'Product Launch 2026', 1, 'Corporate', '2026-08-05', 'Sheraton Convention Center', 80000.00, 150, 'Futuristic Tech', 'Pending', 'Requires high quality sound and technicians.')
      `);
    } else {
      console.log('➡️ Events table is already populated.');
    }

    // 4. Seed vendors
    const vendorsCount = await db.query('SELECT COUNT(*) as count FROM vendors');
    if (vendorsCount[0].count === 0) {
      console.log('🌱 Seeding default vendors...');
      await db.query(`
        INSERT INTO vendors (id, name, category, contact_person, phone, email, service_type, price_range, rating, availability_status) VALUES 
        (1, 'Royal Decorators', 'Decorator', 'Ramesh Kumar', '+91 91111 22222', 'royal@decors.com', 'Premium Decor', 'High', 4.8, 'Available'),
        (2, 'Spice Route Catering', 'Caterer', 'Anil Nair', '+91 92222 33333', 'spice@route.com', 'Multi-cuisine Buffet', 'Medium', 4.5, 'Available'),
        (3, 'Pixel Perfect Photography', 'Photographer', 'Vikram Sen', '+91 93333 44444', 'pixel@perfect.com', 'Candid & Cinematic', 'High', 4.9, 'Available'),
        (4, 'Anchor Sameer', 'Anchor', 'Sameer Khan', '+91 94444 55555', 'sameer@anchor.com', 'Emcee & Stand-up', 'Medium', 4.7, 'Available'),
        (5, 'Boom Sound & Stage', 'Sound Team', 'DJ Alok', '+91 95555 66666', 'boom@sound.com', 'JBL Line Array System', 'High', 4.6, 'Available')
      `);
    } else {
      console.log('➡️ Vendors table is already populated.');
    }

    // 5. Seed staff
    const staffCount = await db.query('SELECT COUNT(*) as count FROM staff');
    if (staffCount[0].count === 0) {
      console.log('🌱 Seeding default staff...');
      await db.query(`
        INSERT INTO staff (id, name, role, phone, experience_years, availability_status) VALUES 
        (1, 'Rohan Sharma', 'Supervisor', '+91 81111 11111', 5, 'Available'),
        (2, 'Amit Patel', 'Coordinator', '+91 82222 22222', 3, 'Available'),
        (3, 'Suresh Das', 'Technician', '+91 83333 33333', 4, 'Available'),
        (4, 'Karan Kumar', 'Helper', '+91 84444 44444', 1, 'Available'),
        (5, 'Vijay Singh', 'Helper', '+91 85555 55555', 2, 'Available')
      `);
    } else {
      console.log('➡️ Staff table is already populated.');
    }

    // 6. Seed assignments
    const assignmentsCount = await db.query('SELECT COUNT(*) as count FROM assignments');
    if (assignmentsCount[0].count === 0) {
      console.log('🌱 Seeding default assignments...');
      await db.query(`
        INSERT INTO assignments (id, event_id, resource_type, resource_id, status) VALUES 
        (1, 1, 'vendor', 1, 'Confirmed'),
        (2, 1, 'vendor', 3, 'Confirmed'),
        (3, 1, 'staff', 1, 'Confirmed'),
        (4, 1, 'staff', 4, 'Pending')
      `);
    } else {
      console.log('➡️ Assignments table is already populated.');
    }

    // 7. Seed payments
    const paymentsCount = await db.query('SELECT COUNT(*) as count FROM payments');
    if (paymentsCount[0].count === 0) {
      console.log('🌱 Seeding default payments...');
      await db.query(`
        INSERT INTO payments (id, event_id, type, vendor_id, total_amount, advance, balance, amount, due_date, status, notes) VALUES 
        (1, 1, 'client', null, 150000.00, 50000.00, 100000.00, 50000.00, '2026-07-01', 'Paid', 'Advance payment received'),
        (2, 1, 'vendor', 1, 0.00, 0.00, 0.00, 25000.00, '2026-07-15', 'Pending', 'Advance for decoration stage design'),
        (3, 2, 'client', null, 350000.00, 0.00, 350000.00, 100000.00, '2026-06-30', 'Pending', 'First installment due')
      `);
    } else {
      console.log('➡️ Payments table is already populated.');
    }

    // 8. Seed inventory
    const inventoryCount = await db.query('SELECT COUNT(*) as count FROM inventory');
    if (inventoryCount[0].count === 0) {
      console.log('🌱 Seeding default inventory...');
      await db.query(`
        INSERT INTO inventory (id, item_name, quantity, available_quantity, status) VALUES 
        (1, 'Chairs (Banquet Gold)', 1000, 700, 'In Stock'),
        (2, 'Round Tables (Veneer)', 100, 70, 'In Stock'),
        (3, 'LED Ambience Lights', 200, 150, 'In Stock'),
        (4, 'JBL VRX Line Array Speakers', 12, 12, 'In Stock'),
        (5, 'Stage Floral Setup Arch', 5, 4, 'In Stock')
      `);
    } else {
      console.log('➡️ Inventory table is already populated.');
    }

    // 9. Seed notifications
    const notificationsCount = await db.query('SELECT COUNT(*) as count FROM notifications');
    if (notificationsCount[0].count === 0) {
      console.log('🌱 Seeding default notifications...');
      await db.query(`
        INSERT INTO notifications (id, title, message, type, is_read) VALUES 
        (1, 'New Event Booking', 'Corporate event "Product Launch 2026" has been created.', 'Upcoming Event', 0),
        (2, 'Pending Vendor Booking', 'Royal Decorators has a pending assignment for TechCorp Annual Gala.', 'Assignment Confirmation', 0)
      `);
    } else {
      console.log('➡️ Notifications table is already populated.');
    }

    // 10. Seed activity logs
    const activityLogsCount = await db.query('SELECT COUNT(*) as count FROM activity_logs');
    if (activityLogsCount[0].count === 0) {
      console.log('🌱 Seeding default activity logs...');
      await db.query(`
        INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES 
        (1, 1, 'Admin User', 'CREATE_EVENT', 'Created event: TechCorp Annual Gala 2026')
      `);
    } else {
      console.log('➡️ Activity logs table is already populated.');
    }

    console.log('\n✅ Database schema initialized and seeded successfully on TiDB Cloud!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
