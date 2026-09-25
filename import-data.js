const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get DATABASE_URL from environment or use default
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Set it before running this script:');
  console.error('  export DATABASE_URL="postgresql://user:password@host:port/database"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function importData() {
  try {
    // Read backup file - try the complete 306-entry backup first, then fall back to 136-entry
    let backupPath = path.join(__dirname, 'backups', 'paint-backup-complete-306-entries.json');
    let data;

    if (fs.existsSync(backupPath)) {
      console.log(`Using complete backup with all entries: ${backupPath}`);
      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      data = JSON.parse(backupContent);
    } else {
      // Fall back to older backup if complete one not found
      backupPath = path.join(__dirname, 'backups', 'paint-backup-2026-09-08.json');
      console.log(`Using legacy backup: ${backupPath}`);

      if (!fs.existsSync(backupPath)) {
        console.error(`ERROR: No backup file found. Checked:`);
        console.error(`  - ${path.join(__dirname, 'backups', 'paint-backup-complete-306-entries.json')}`);
        console.error(`  - ${backupPath}`);
        process.exit(1);
      }

      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      const backup = JSON.parse(backupContent);
      data = backup.data;
    }

    console.log(`Found ${data.length} entries to import`);

    // Initialize database tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS paints (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        building TEXT NOT NULL,
        paint_color TEXT NOT NULL,
        finish TEXT NOT NULL,
        paint_line TEXT NOT NULL,
        location_in_building TEXT,
        custom_color BOOLEAN DEFAULT FALSE,
        order_number TEXT,
        notes TEXT,
        paint_name TEXT,
        archived BOOLEAN DEFAULT FALSE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS disabled_values (
        id SERIAL PRIMARY KEY,
        value_type TEXT NOT NULL,
        value TEXT NOT NULL,
        disabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(value_type, value)
      )
    `);

    console.log('✓ Database tables initialized');

    // Clear existing data
    await pool.query('DELETE FROM paints');
    console.log('✓ Cleared existing paint entries');

    // Insert data
    let imported = 0;
    for (const row of data) {
      try {
        await pool.query(
          `INSERT INTO paints (
            id, timestamp, building, paint_color, finish, paint_line,
            location_in_building, custom_color, order_number, notes, paint_name, archived
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            timestamp = $2,
            building = $3,
            paint_color = $4,
            finish = $5,
            paint_line = $6,
            location_in_building = $7,
            custom_color = $8,
            order_number = $9,
            notes = $10,
            paint_name = $11,
            archived = $12`,
          [
            row.id,
            row.timestamp,
            row.building || 'Unknown',
            row.paint_color || 'Unknown',
            row.finish || 'Unknown',
            row.paint_line || 'Unknown',
            row.location_in_building || null,
            row.custom_color || false,
            row.order_number || null,
            row.notes || null,
            row.paint_name || null,
            row.archived || false
          ]
        );
        imported++;
        if (imported % 20 === 0) {
          process.stdout.write(`\rImported: ${imported}/${data.length}`);
        }
      } catch (err) {
        console.error(`Error importing row ${row.id}:`, err);
      }
    }

    console.log(`\n✓ Import complete! ${imported} entries added to database.`);
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importData();
