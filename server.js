const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const fs = require('fs');
const simpleGit = require('simple-git');

const app = express();
const PORT = 3000;
const PASSPHRASE = process.env.PAINT_PASSPHRASE || 'paintapp123'; // Change this to your passphrase

// GitHub backup configuration
const GITHUB_REPO = process.env.GITHUB_REPO; // e.g., YOUR-USERNAME/paint-app
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal access token
const PUSH_BACKUPS_TO_GITHUB = GITHUB_REPO && GITHUB_TOKEN; // Only if both are set

// Backup configuration
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
}

// Database setup
const dbPath = path.join(__dirname, 'paints.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database tables
db.serialize(() => {
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
  `);
});

// API Routes

// Verify passphrase
app.post('/api/verify-passphrase', (req, res) => {
  const { passphrase } = req.body;
  if (passphrase === PASSPHRASE) {
    res.json({ success: true, message: 'Access granted' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid passphrase' });
  }
});

// Get all paints
app.get('/api/paints', (req, res) => {
  db.all('SELECT * FROM paints ORDER BY building, paint_color', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Search paints
app.get('/api/search', (req, res) => {
  const { query, type } = req.query;
  let sql = 'SELECT * FROM paints WHERE 1=1';
  const params = [];

  if (type === 'color' && query) {
    sql += ' AND (paint_color LIKE ? OR paint_name LIKE ?)';
    params.push(`%${query}%`, `%${query}%`);
  } else if (type === 'building' && query) {
    sql += ' AND building LIKE ?';
    params.push(`%${query}%`);
  }

  sql += ' ORDER BY building, paint_color';

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Add new paint
app.post('/api/paints', (req, res) => {
  const {
    building,
    paint_color,
    finish,
    paint_line,
    location_in_building,
    custom_color,
    order_number,
    notes
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO paints (
      building, paint_color, finish, paint_line, location_in_building,
      custom_color, order_number, notes, paint_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    building,
    paint_color,
    finish,
    paint_line,
    location_in_building,
    custom_color ? 1 : 0,
    order_number || null,
    notes || null,
    paint_color.toUpperCase(),
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ success: true, id: this.lastID });
      }
    }
  );

  stmt.finalize();
});

// Get distinct values for dropdowns
app.get('/api/options/:field', (req, res) => {
  const field = req.params.field;
  const allowedFields = ['building', 'paint_line', 'finish'];

  if (!allowedFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field' });
  }

  db.all(`SELECT DISTINCT ${field} FROM paints WHERE ${field} IS NOT NULL ORDER BY ${field}`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      const options = rows.map(r => r[field]).filter(Boolean);
      res.json(options);
    }
  });
});

// Admin endpoints

// Get database stats
app.get('/api/admin/stats', (req, res) => {
  db.get('SELECT COUNT(*) as total FROM paints', (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        totalPaints: row.total
      });
    }
  });
});

// Download database as JSON
app.get('/api/admin/export', (req, res) => {
  db.all('SELECT * FROM paints ORDER BY building, paint_color', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="paint-database-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(rows);
    }
  });
});

// Download database as CSV
app.get('/api/admin/export-csv', (req, res) => {
  db.all('SELECT * FROM paints ORDER BY building, paint_color', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (rows.length === 0) {
      res.status(400).json({ error: 'No data to export' });
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="paint-database-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  });
});

// Backup Management

async function pushBackupToGithub(backupPath, backupFileName) {
  if (!PUSH_BACKUPS_TO_GITHUB) {
    return; // GitHub not configured
  }

  try {
    const git = simpleGit();
    const remoteUrl = `https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git`;

    // Add the backup file
    await git.add(backupPath);

    // Commit
    await git.commit(`Auto-backup: ${backupFileName}`, ['--no-verify']);

    // Push (with token in URL for authentication)
    await git.push([remoteUrl, 'main'], ['--quiet']);

    console.log(`✓ Backup pushed to GitHub: ${backupFileName}`);
  } catch (err) {
    console.error('GitHub push error:', err.message);
    // Don't reject - local backup still exists
  }
}

function createBackup() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM paints ORDER BY building, paint_color', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const backupFileName = `paint-backup-${timestamp}.json`;
      const backupPath = path.join(backupsDir, backupFileName);

      const backupData = {
        created: new Date().toISOString(),
        totalEntries: rows.length,
        data: rows
      };

      fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`✓ Backup created: ${backupFileName}`);

          // Try to push to GitHub (non-blocking)
          if (PUSH_BACKUPS_TO_GITHUB) {
            pushBackupToGithub(backupPath, backupFileName).catch(err => {
              console.error('Failed to push backup to GitHub:', err.message);
            });
          }

          resolve(backupPath);
        }
      });
    });
  });
}

function getLastBackupDate() {
  try {
    const files = fs.readdirSync(backupsDir);
    if (files.length === 0) return null;

    const sorted = files.sort().reverse();
    return sorted[0]; // Most recent backup filename
  } catch (err) {
    return null;
  }
}

function needsBackup() {
  const lastBackupFile = getLastBackupDate();
  if (!lastBackupFile) return true; // No backup exists

  const dateMatch = lastBackupFile.match(/backup-(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return true;

  const lastBackupDate = new Date(dateMatch[1]);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return lastBackupDate < sixMonthsAgo;
}

// API endpoints for backup management

// List all backups
app.get('/api/admin/backups', (req, res) => {
  try {
    const files = fs.readdirSync(backupsDir);
    const backups = files
      .filter(f => f.startsWith('paint-backup-'))
      .sort()
      .reverse()
      .map(f => {
        const filePath = path.join(backupsDir, f);
        const stats = fs.statSync(filePath);
        const dateMatch = f.match(/backup-(\d{4}-\d{2}-\d{2})/);

        return {
          filename: f,
          date: dateMatch ? dateMatch[1] : 'unknown',
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          created: stats.birthtime
        };
      });

    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download specific backup
app.get('/api/admin/backup/:filename', (req, res) => {
  const filename = req.params.filename;

  // Security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filepath = path.join(backupsDir, filename);

  // Check file exists and is in backups directory
  if (!fs.existsSync(filepath) || !filepath.startsWith(backupsDir)) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  res.download(filepath);
});

// Create manual backup
app.post('/api/admin/backup-now', (req, res) => {
  createBackup()
    .then(backupPath => {
      res.json({ success: true, message: 'Backup created successfully' });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// Schedule automatic backups every 6 months
// Check daily if a backup is needed
cron.schedule('0 2 * * *', () => {
  console.log('Checking if backup is needed...');
  if (needsBackup()) {
    console.log('Creating 6-month backup...');
    createBackup()
      .then(() => {
        console.log('Backup completed successfully');
      })
      .catch(err => {
        console.error('Backup failed:', err);
      });
  }
});

// Check on startup if backup is needed
setImmediate(() => {
  if (needsBackup()) {
    console.log('Creating initial backup...');
    createBackup()
      .catch(err => console.error('Initial backup failed:', err));
  } else {
    const lastBackup = getLastBackupDate();
    console.log(`✓ Last backup: ${lastBackup}`);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Paint app server running at http://localhost:${PORT}`);
  console.log(`Passphrase: ${PASSPHRASE}`);
  console.log(`Backups directory: ${backupsDir}`);
});
