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

    console.log('\n✅ Database schema initialized successfully on TiDB Cloud!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
