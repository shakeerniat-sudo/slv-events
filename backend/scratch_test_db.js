const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const db = require('./src/config/db');
const AutomationService = require('./src/services/automation.service');

async function test() {
  console.log('Connecting to database...');
  await db.connectDb();
  console.log('Demo mode status:', db.isDemo());

  try {
    const events = await db.query('SELECT * FROM events');
    console.log('All events in database:', JSON.stringify(events, null, 2));

    const event = events.find(e => e.name.toLowerCase() === 'wedding' || e.id === 4);
    if (!event) {
      console.log('Wedding event not found!');
      process.exit(0);
    }

    console.log('Attempting to update event workflow_stage to 4 (Ready) for event ID:', event.id);
    const updateResult = await db.query(
      'UPDATE events SET name = ?, event_type = ?, event_date = ?, venue = ?, budget = ?, guest_count = ?, theme_preference = ?, notes = ?, status = ?, workflow_stage = ?, workflow_mode = ?, event_time = ? WHERE id = ?',
      [
        event.name,
        event.event_type,
        event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : null,
        event.venue,
        parseFloat(event.budget),
        parseInt(event.guest_count || 0),
        event.theme_preference || '',
        event.notes || '',
        'Ready',
        4,
        'Manual',
        event.event_time || '10:00 AM - 04:00 PM',
        event.id
      ]
    );
    console.log('Update query result:', updateResult);

    console.log('Syncing automated notifications...');
    await AutomationService.syncAutomatedNotifications();
    console.log('✅ Sync notifications complete.');

  } catch (err) {
    console.error('❌ Error occurred during test:', err);
  }

  process.exit(0);
}

test();
