const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  try {
    console.log('Connecting to PostgreSQL...');
    await pool.query('SELECT NOW()'); // Test connection
    console.log('✓ Connected to PostgreSQL');

    // Read Excel file
    const filePath = path.join(__dirname, 'Paint Index database.xlsx');
    console.log('Reading Excel file:', filePath);

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} entries to import`);

    // Clear existing data
    await pool.query('DELETE FROM paints');
    console.log('✓ Cleared existing data');

    // Insert data
    let imported = 0;
    for (const row of data) {
      const isCustom = row['Original Order Number'] ? true : false;

      await pool.query(
        `INSERT INTO paints (
          building, paint_color, finish, paint_line, location_in_building,
          custom_color, order_number, notes, paint_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          row['Building'] || 'Unknown',
          row['Paint Color'] || 'Unknown',
          row['Finish'] || 'Unknown',
          row['Paint Line'] || 'Unknown',
          row['Location in building'] || '',
          isCustom,
          row['Original Order Number'] || null,
          row['Notes'] || null,
          row['PAINT NAME CAPS'] || row['Paint Color']?.toUpperCase() || 'Unknown'
        ]
      );

      imported++;
      if (imported % 20 === 0) {
        process.stdout.write(`\rImported: ${imported}/${data.length}`);
      }
    }

    console.log(`\n✓ Import complete! ${imported} entries added to PostgreSQL.`);
    await pool.end();
    process.exit(0);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

migrateData();
