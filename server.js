const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const fs = require('fs');
const simpleGit = require('simple-git');

const app = express();
const PORT = process.env.PORT || 3000;
const PASSPHRASE = process.env.PAINT_PASSPHRASE || 'paintapp123';

// GitHub backup configuration
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PUSH_BACKUPS_TO_GITHUB = GITHUB_REPO && GITHUB_TOKEN;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

// Backup configuration
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database tables
async function initializeDatabase() {
  try {
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

    // Add archived column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE paints
      ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE
    `);

    console.log('✓ Database tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initializeDatabase();

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

// Get all paints (excluding archived)
app.get('/api/paints', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM paints WHERE archived = FALSE ORDER BY building, paint_color'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search paints
app.get('/api/search', async (req, res) => {
  const { query, type } = req.query;
  let sql = 'SELECT * FROM paints WHERE archived = FALSE';
  const params = [];

  if (type === 'color' && query) {
    sql += ' AND (paint_color ILIKE $1 OR paint_name ILIKE $1)';
    params.push(`%${query}%`);
  } else if (type === 'building' && query) {
    sql += ' AND building ILIKE $1';
    params.push(`%${query}%`);
  }

  sql += ' ORDER BY building, paint_color';

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new paint
app.post('/api/paints', async (req, res) => {
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

  try {
    const result = await pool.query(
      `INSERT INTO paints (
        building, paint_color, finish, paint_line, location_in_building,
        custom_color, order_number, notes, paint_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        building,
        paint_color,
        finish,
        paint_line,
        location_in_building,
        custom_color || false,
        order_number || null,
        notes || null,
        paint_color.toUpperCase()
      ]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get distinct values for dropdowns
app.get('/api/options/:field', async (req, res) => {
  const field = req.params.field;
  const allowedFields = ['building', 'paint_line', 'finish'];

  if (!allowedFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field' });
  }

  try {
    const result = await pool.query(
      `SELECT DISTINCT ${field} FROM paints WHERE ${field} IS NOT NULL ORDER BY ${field}`
    );
    const options = result.rows.map(r => r[field]).filter(Boolean);
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archive/Unarchive paint
app.post('/api/paints/:id/archive', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE paints SET archived = TRUE WHERE id = $1', [id]);
    res.json({ success: true, message: 'Paint archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paints/:id/unarchive', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE paints SET archived = FALSE WHERE id = $1', [id]);
    res.json({ success: true, message: 'Paint restored' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get archived paints
app.get('/api/paints/archived', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM paints WHERE archived = TRUE ORDER BY building, paint_color'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backup Management

async function createBackup() {
  try {
    const result = await pool.query('SELECT * FROM paints ORDER BY building, paint_color');
    const rows = result.rows;

    const timestamp = new Date().toISOString().split('T')[0];
    const backupFileName = `paint-backup-${timestamp}.json`;
    const backupPath = path.join(backupsDir, backupFileName);

    const backupData = {
      created: new Date().toISOString(),
      totalEntries: rows.length,
      data: rows
    };

    return new Promise((resolve, reject) => {
      fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), async (err) => {
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
  } catch (err) {
    throw err;
  }
}

async function pushBackupToGithub(backupPath, backupFileName) {
  if (!PUSH_BACKUPS_TO_GITHUB) {
    return;
  }

  try {
    const git = simpleGit();
    const remoteUrl = `https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git`;

    await git.add(backupPath);
    await git.commit(`Auto-backup: ${backupFileName}`, ['--no-verify']);
    await git.push([remoteUrl, 'main'], ['--quiet']);

    console.log(`✓ Backup pushed to GitHub: ${backupFileName}`);
  } catch (err) {
    console.error('GitHub push error:', err.message);
  }
}

function getLastBackupDate() {
  try {
    const files = fs.readdirSync(backupsDir);
    if (files.length === 0) return null;

    const sorted = files.sort().reverse();
    return sorted[0];
  } catch (err) {
    return null;
  }
}

function needsBackup() {
  const lastBackupFile = getLastBackupDate();
  if (!lastBackupFile) return true;

  const dateMatch = lastBackupFile.match(/backup-(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return true;

  const lastBackupDate = new Date(dateMatch[1]);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return lastBackupDate < sixMonthsAgo;
}

// Admin endpoints

// Get database stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as total FROM paints');
    res.json({
      totalPaints: parseInt(result.rows[0].total)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download database as JSON
app.get('/api/admin/export', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM paints ORDER BY building, paint_color');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="paint-database-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download database as CSV
app.get('/api/admin/export-csv', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM paints ORDER BY building, paint_color');
    const rows = result.rows;

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filepath = path.join(backupsDir, filename);

  if (!fs.existsSync(filepath) || !filepath.startsWith(backupsDir)) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  res.download(filepath);
});

// Create manual backup
app.post('/api/admin/backup-now', async (req, res) => {
  try {
    await createBackup();
    res.json({ success: true, message: 'Backup created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Schedule automatic backups every 6 months
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
