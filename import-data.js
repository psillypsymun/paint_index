const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const path = require('path');

const dbPath = path.join(__dirname, 'paints.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Read Excel file
const excelFile = path.join(__dirname, 'Paint Index database.xlsx');
console.log('Reading Excel file:', excelFile);

const workbook = XLSX.readFile(excelFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Found ${data.length} entries to import`);

// Import data
db.serialize(() => {
  // Create table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS paints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      building TEXT NOT NULL,
      paint_color TEXT NOT NULL,
      finish TEXT NOT NULL,
      paint_line TEXT NOT NULL,
      location_in_building TEXT,
      custom_color BOOLEAN DEFAULT 0,
      order_number TEXT,
      notes TEXT,
      paint_name TEXT
    )
  `, (err) => {
    if (err) console.error('Table creation error:', err);
  });

  db.run('DELETE FROM paints'); // Clear existing data

  let imported = 0;
  const stmt = db.prepare(`
    INSERT INTO paints (
      building, paint_color, finish, paint_line, location_in_building,
      custom_color, order_number, notes, paint_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  data.forEach((row, index) => {
    const isCustom = row['Original Order Number'] ? 1 : 0;

    stmt.run(
      row['Building'] || 'Unknown',
      row['Paint Color'] || 'Unknown',
      row['Finish'] || 'Unknown',
      row['Paint Line'] || 'Unknown',
      row['Location in building'] || '',
      isCustom,
      row['Original Order Number'] || null,
      row['Notes'] || null,
      row['PAINT NAME CAPS'] || row['Paint Color']?.toUpperCase() || 'Unknown',
      (err) => {
        if (err) {
          console.error(`Error importing row ${index}:`, err);
        } else {
          imported++;
          if (imported % 20 === 0) {
            process.stdout.write(`\rImported: ${imported}/${data.length}`);
          }
        }
      }
    );
  });

  stmt.finalize(() => {
    console.log(`\nImport complete! ${imported} entries added to database.`);
    db.close();
  });
});
