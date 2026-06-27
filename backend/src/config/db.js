const mysql = require('mysql2/promise');

let pool = null;

// Helper to ensure compatibility between eventDate and event_date properties
const mapRows = (rows) => {
  if (!rows) return rows;
  const mapSingleRow = (row) => {
    if (row && typeof row === 'object') {
      if ('eventDate' in row && !('event_date' in row)) {
        row.event_date = row.eventDate;
      }
      if ('event_date' in row && !('eventDate' in row)) {
        row.eventDate = row.event_date;
      }
    }
    return row;
  };
  if (Array.isArray(rows)) {
    return rows.map(mapSingleRow);
  }
  return mapSingleRow(rows);
};

// Database Connection & Initialization Lifecycle
async function connectDb() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || 3306;

  if (!host || !user) {
    const errorMsg = '❌ DATABASE CONFIGURATION ERROR: DB_HOST or DB_USER not provided in environment variables.';
    console.error(errorMsg);
    throw new Error(errorMsg);
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
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    };

    if (host.includes('aivencloud.com') || host.includes('tidbcloud.com') || process.env.DB_SSL === 'true') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = mysql.createPool(poolConfig);
    // Test connection
    const conn = await pool.getConnection();
    console.log(`✅ Database Connected Successfully to MySQL at ${host}:${port}/${database}`);
    
    // Run migrations
    try {
      await conn.query('ALTER TABLE events RENAME COLUMN event_date TO eventDate');
      console.log('✅ Schema migration: Renamed events.event_date to events.eventDate.');
    } catch (migErr) {
      try {
        await conn.query('ALTER TABLE events CHANGE event_date eventDate DATE NOT NULL');
        console.log('✅ Schema migration: Changed events.event_date to events.eventDate.');
      } catch (innerErr) {
        // Already migrated
      }
    }
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
      if (migErr.code !== 'ER_DUP_FIELDNAME') {
        console.warn('⚠️ Notification table add column warning:', migErr.message);
      }
    }
    try {
      await conn.query('ALTER TABLE events ADD COLUMN workflow_stage INT DEFAULT 1');
      console.log('✅ Schema migration: Added workflow_stage column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table workflow_stage column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events MODIFY COLUMN status VARCHAR(50) DEFAULT 'Pending'");
      console.log("✅ Schema migration: Modified events table status column to VARCHAR(50).");
    } catch (migErr) {
      console.warn('⚠️ Events table status column modification warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN workflow_mode VARCHAR(20) DEFAULT 'Automatic'");
      console.log('✅ Schema migration: Added workflow_mode column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table workflow_mode column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN event_time VARCHAR(50) DEFAULT '10:00 AM - 04:00 PM'");
      console.log('✅ Schema migration: Added event_time column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table event_time column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN tasks TEXT DEFAULT NULL");
      console.log('✅ Schema migration: Added tasks column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table tasks column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN inventory TEXT DEFAULT NULL");
      console.log('✅ Schema migration: Added inventory column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table inventory column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN ops_logs TEXT DEFAULT NULL");
      console.log('✅ Schema migration: Added ops_logs column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table ops_logs column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN photos TEXT DEFAULT NULL");
      console.log('✅ Schema migration: Added photos column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table photos column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN coordinator_id INT DEFAULT NULL");
      console.log('✅ Schema migration: Added coordinator_id column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table coordinator_id column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN operations_lead_id INT DEFAULT NULL");
      console.log('✅ Schema migration: Added operations_lead_id column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table operations_lead_id column warning:', migErr.message);
    }
    try {
      await conn.query("ALTER TABLE events ADD COLUMN finance_team_id INT DEFAULT NULL");
      console.log('✅ Schema migration: Added finance_team_id column to events table.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') console.warn('⚠️ Events table finance_team_id column warning:', migErr.message);
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
          lighting_team_id INT DEFAULT NULL,
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
    try {
      await conn.query('ALTER TABLE event_assignments ADD COLUMN lighting_team_id INT DEFAULT NULL');
      console.log('✅ Schema migration: Added lighting_team_id column to event_assignments.');
    } catch (migErr) {
      if (migErr.code !== 'ER_DUP_FIELDNAME') {
        console.warn('⚠️ Event assignments table lighting_team_id column warning:', migErr.message);
      }
    }
    try {
      await conn.query("ALTER TABLE vendors MODIFY COLUMN category ENUM('Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team', 'Lighting') NOT NULL");
      console.log("✅ Schema migration: Modified category column in vendors table to include 'Lighting'.");
    } catch (migErr) {
      console.warn("⚠️ Vendors table category modification warning:", migErr.message);
    }
    try {
      const [rows] = await conn.query("SELECT * FROM vendors WHERE id = 6 OR name = 'Glow Lighting Services'");
      if (!rows || rows.length === 0) {
        await conn.query(
          "INSERT INTO vendors (id, name, category, contact_person, phone, email, service_type, price_range, rating, availability_status) VALUES (6, 'Glow Lighting Services', 'Lighting', 'Rahul Mehta', '+91 96666 77777', 'glow@lighting.com', 'LED Ambience & Truss', 'Medium', 4.6, 'Available')"
        );
        console.log("✅ Seeded Glow Lighting Services into MySQL.");
      }
    } catch (seedErr) {
      console.warn("⚠️ Vendors seeding warning:", seedErr.message);
    }
    conn.release();
  } catch (err) {
    console.error(`\n========================================================================\n❌ CRITICAL: MySQL Connection Failed: ${err.message}\n========================================================================\n`);
    throw err;
  }
}

const db = {
  query: async (sql, params = []) => {
    if (!pool) {
      throw new Error('Database pool not initialized. Call connectDb first.');
    }
    const [rows] = await pool.query(sql, params);
    return mapRows(rows);
  },
  execute: async (sql, params = []) => {
    if (!pool) {
      throw new Error('Database pool not initialized. Call connectDb first.');
    }
    const [result] = await pool.execute(sql, params);
    return mapRows(result);
  },
  isDemo: () => false,
  connectDb
};

module.exports = db;
