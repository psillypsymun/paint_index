# Paint Index - Paint Management System

A mobile-friendly web application for managing paint color inventory across multiple buildings.

## Features

- **Passphrase Protection**: Secure access with a simple passphrase
- **Add New Paints**: Form to log new paint colors with details like building, paint line, sheen, location, and notes
- **Custom Color Support**: Track custom color orders with order numbers
- **Search Functionality**: Search existing paints by color name or building
- **Mobile Responsive**: Works seamlessly on phones, tablets, and desktop browsers
- **PostgreSQL Database**: Reliable, scalable data storage (self-hosted)
- **Admin Panel**: Manage dropdown options, archive entries, and download backups
- **Automatic Backups**: Regular JSON backups with optional GitHub integration
- **All Data Included**: 306 paint entries ready to import - no manual data entry needed

---

## Quick Start (30 minutes)

### For Linux Servers (Fastest)

```bash
# 1. Clone the repository
git clone <REPO_URL> paint-app
cd paint-app

# 2. Run the automated setup script
chmod +x setup-server.sh
./setup-server.sh

# Follow the prompts, edit .env file, then:
npm start
```

### For Windows or Manual Setup

Follow the "Installation & Setup" section below.

---

## Installation & Setup

### Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn**
- **PostgreSQL** 12 or higher (running on your server)

### Step 1: Set Up PostgreSQL Database

#### Linux/Unix:
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

Then copy and paste:
```sql
CREATE DATABASE paint_inventory;
CREATE USER paintapp WITH PASSWORD 'your_secure_password';
ALTER ROLE paintapp SET client_encoding TO 'utf8';
ALTER ROLE paintapp SET default_transaction_isolation TO 'read committed';
ALTER ROLE paintapp SET default_transaction_deferrable TO on;
ALTER ROLE paintapp SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
\q
```

#### Windows:
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and note the password you set for `postgres` user
3. Open Command Prompt as Administrator and run: `psql -U postgres`
4. Copy and paste the SQL commands above (same as Linux)

### Step 2: Clone Repository

```bash
cd /var/www/apps  # or your preferred directory
git clone <REPO_URL> paint-app
cd paint-app
npm install
```

### Step 3: Configure Environment Variables

```bash
cp .env.example .env
nano .env  # Edit with your settings
```

Update these three fields:
```
DATABASE_URL=postgresql://paintapp:YOUR_PASSWORD@localhost:5432/paint_inventory
PORT=3000
PAINT_PASSPHRASE=your_secure_passphrase
```

### Step 4: Import All Paint Data

```bash
npm run import-data
```

This imports all 306 paint entries from the backup file. You should see:
```
Using complete backup with all entries: backups/paint-backup-complete-306-entries.json
✓ Database tables initialized
Imported: 306/306
✓ Import complete! 306 entries added to database.
```

### Step 5: Start the Server

#### For Testing:
```bash
npm start
```

Visit: `http://localhost:3000`

#### For Production (24/7 Running):
```bash
npm install -g pm2
pm2 start server.js --name "paint-app"
pm2 startup
pm2 save
```

View logs: `pm2 logs paint-app`

---

## Usage

### Initial Access
1. Open `http://localhost:3000` (or `http://SERVER_IP:3000` from other computers)
2. Enter the passphrase you set in `.env`
3. You'll see the main menu

### Main Menu Options

#### Add New Paint
- Select the building from the dropdown
- Enter paint name/color
- Specify if it's a custom color
- If custom, enter the order number
- Select paint line and sheen
- Enter the area/location in the building
- Add optional notes
- Submit to save

#### Search Paints
- **By Color**: Search for paint names or colors
- **By Building**: See all paints used in a specific building
- View details including location, paint line, finish, and any notes

#### Admin Panel
- **Manage Dropdowns**: Disable specific building, paint line, or finish options
- **Archive Paints**: Archive old/replaced entries (hidden but not deleted)
- **View Statistics**: See total paint count
- **Download Backups**: Export data as JSON or CSV

---

## Network Access

To access from other computers on your network:

1. Find your server's IP: `hostname -I` (Linux) or `ipconfig` (Windows)
2. Access from other computers: `http://SERVER_IP:3000`

---

## Configuration

### Change the Passphrase

Edit `.env`:
```
PAINT_PASSPHRASE=your_new_secure_passphrase
```

Then restart: `pm2 restart paint-app` (or stop and restart manually)

### Change the Port

Edit `.env`:
```
PORT=3001
```

---

## Database Management

### Create Manual Backups

```bash
# From Admin Panel: Click "Download All Paints as JSON"
# Or from command line:
psql -U paintapp -d paint_inventory -c "\COPY (SELECT * FROM paints) TO STDOUT WITH CSV HEADER" > backup.csv
```

### Reset Everything (Start Over)

```bash
pm2 stop paint-app  # or Ctrl+C if running in foreground

# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE paint_inventory;"
sudo -u postgres psql <<EOF
CREATE DATABASE paint_inventory;
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
EOF

# Re-import the data
npm run import-data

# Restart
pm2 start paint-app  # or npm start
```

### Check Database Size

```bash
sudo -u postgres psql -d paint_inventory -c "SELECT pg_size_pretty(pg_database_size('paint_inventory'));"
```

---

## API Endpoints

For integrations:

- `POST /api/verify-passphrase` - Verify access passphrase
- `GET /api/paints` - Get all paints
- `GET /api/search?query=...&type=color|building` - Search paints
- `POST /api/paints` - Add new paint entry
- `PUT /api/paints/:id` - Edit a paint entry
- `GET /api/paints/:id` - Get single paint entry
- `POST /api/paints/:id/archive` - Archive a paint
- `POST /api/paints/:id/unarchive` - Restore archived paint
- `GET /api/options/:field` - Get dropdown options
- `GET /api/admin/export` - Export all paints as JSON
- `GET /api/admin/export-csv` - Export all paints as CSV

---

## Troubleshooting

### Can't connect to PostgreSQL
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection manually
psql -U paintapp -d paint_inventory -h localhost
```

### Port 3000 already in use
```bash
PORT=3001 npm start
```

### Import data fails
```bash
# Make sure DATABASE_URL is set and PostgreSQL is running
echo $DATABASE_URL

# Check PostgreSQL connection
psql -U paintapp -d paint_inventory -h localhost -c "SELECT 1"

# Try import again
npm run import-data
```

### Need to see server logs
```bash
# With PM2
pm2 logs paint-app

# Or without PM2
npm start
```

### Can't access from another computer on the network
1. Check firewall allows port 3000: `sudo ufw allow 3000/tcp`
2. Verify you're using server's IP address, not `localhost`
3. Make sure server and client are on the same network

---

## Project Structure

```
paint-app/
├── server.js                 # Express server with API endpoints
├── import-data.js            # Script to import backup data
├── package.json              # Dependencies
├── .env                       # Environment variables (created by you)
├── .env.example              # Configuration template
├── .gitignore                # Git ignore rules
├── setup-server.sh           # Automated setup script (Linux)
├── backups/                  # Backup files
│   ├── paint-backup-complete-306-entries.json  # Primary backup (all data)
│   └── paint-backup-2026-09-08.json           # Fallback backup
├── public/                   # Frontend files
│   ├── index.html            # Main HTML file
│   ├── styles.css            # Responsive styling
│   └── app.js                # Frontend JavaScript logic
└── README.md                 # This file
```

---

## Tips

- The app automatically populates dropdowns from existing database entries
- Custom colors can track special order numbers for future reordering
- Search is fuzzy-friendly (partial matches work)
- Disabled dropdown options are hidden but existing entries remain
- Archived paints are hidden but can be restored anytime
- **Always change the default passphrase** before going live on your network!

---

## Automatic Backups to GitHub (Optional)

The app can push backups to GitHub every 6 months.

### Setup:

1. Create a GitHub Personal Access Token:
   - Go to github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Name: `paint-app-backup`
   - Check: **repo** (Full control of private repositories)
   - Copy the token

2. Add to `.env`:
```
GITHUB_REPO=YOUR-USERNAME/paint-app
GITHUB_TOKEN=your_github_personal_access_token
```

3. The app will automatically push backups to GitHub every 6 months

---

## Security Notes

- 🔒 **Change the default passphrase immediately**
- 🔒 **Use a strong, unique passphrase** (mix of letters, numbers, symbols)
- 🔒 **Keep your `.env` file private** - never commit it to Git
- 🔒 **Use HTTPS in production** - set up a reverse proxy with SSL certificates
- 🔒 **Restrict network access** - use firewall rules to limit who can access port 3000

---

## What's Included

✅ All 306 paint entries ready to import  
✅ PostgreSQL setup instructions  
✅ Automated setup script for Linux  
✅ Configuration template  
✅ Complete documentation  
✅ Backup system (automatic + manual)  

---

## Support

- For detailed setup help, see the "Troubleshooting" section above
- Check `setup-server.sh` comments for automated setup details
- Review `.env.example` for all configuration options

---

Built for efficient paint inventory management across multiple buildings!
