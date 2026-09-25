# Paint Index - Paint Management System

A mobile-friendly web application for managing paint color inventory across multiple buildings.

## Features

- **Passphrase Protection**: Secure access with a simple passphrase
- **Add New Paints**: Form to log new paint colors with details like building, paint line, sheen, location, and notes
- **Custom Color Support**: Track custom color orders with order numbers
- **Search Functionality**: Search existing paints by color name or building
- **Mobile Responsive**: Works seamlessly on phones, tablets, and desktop browsers
- **PostgreSQL Database**: Reliable, scalable data storage
- **Admin Panel**: Manage dropdown options, archive entries, and download backups
- **Automatic Backups**: Regular JSON backups with optional GitHub integration

## Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn**
- **PostgreSQL** 12 or higher (running on your server)

## Deployment Instructions (Self-Hosted)

Follow these steps to install Paint Index on your network server.

### Step 1: Set Up PostgreSQL Database

#### On Linux/Unix:
```bash
# Install PostgreSQL (if not already installed)
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Connect to PostgreSQL and create database and user
sudo -u postgres psql
```

Then in the PostgreSQL prompt:
```sql
CREATE DATABASE paint_inventory;
CREATE USER paintapp WITH PASSWORD 'secure_password_here';
ALTER ROLE paintapp SET client_encoding TO 'utf8';
ALTER ROLE paintapp SET default_transaction_isolation TO 'read committed';
ALTER ROLE paintapp SET default_transaction_deferrable TO on;
ALTER ROLE paintapp SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
\q
```

#### On Windows:
1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Note the password you set for the `postgres` user
4. Use pgAdmin (included with installer) or Command Prompt:
```bash
psql -U postgres
```

Then create the database:
```sql
CREATE DATABASE paint_inventory;
CREATE USER paintapp WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
\q
```

### Step 2: Clone the Repository

```bash
# Navigate to your desired location
cd /var/www/apps  # or your preferred directory

# Clone the repository
git clone https://github.com/YOUR-USERNAME/paint-app.git
cd paint-app

# Install Node.js dependencies
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection details:

```
# PostgreSQL connection (adjust host, user, and password)
DATABASE_URL=postgresql://paintapp:secure_password_here@localhost:5432/paint_inventory

# Server port (optional, defaults to 3000)
PORT=3000

# Production mode
NODE_ENV=production

# Set a secure passphrase (CHANGE THIS!)
PAINT_PASSPHRASE=your_very_secure_passphrase_here

# Optional: GitHub backups (leave blank to disable)
# GITHUB_REPO=YOUR-USERNAME/paint-app
# GITHUB_TOKEN=your_github_personal_access_token
```

**Security Note:** Keep your `.env` file secure and never commit it to version control. The `.gitignore` file is already configured to exclude it.

### Step 4: Import Data

The app includes 306 paint entries in the backup file. To import them:

```bash
npm run import-data
```

This script will:
- ✅ Connect to your PostgreSQL database
- ✅ Create all necessary tables
- ✅ Import all 306 paint entries with their data
- ✅ Restore any disabled dropdown values

### Step 5: Start the Server

```bash
npm start
```

You should see:
```
✓ Connected to PostgreSQL database
✓ Database tables initialized
Paint app server running at http://localhost:3000
Passphrase: your_very_secure_passphrase_here
```

Access the app at: `http://localhost:3000`

### Step 6: Set Up a Production Process Manager (Recommended)

To keep the app running after you close the terminal, use PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the app with PM2
pm2 start server.js --name "paint-app"

# Make it auto-start on server reboot
pm2 startup
pm2 save

# View logs
pm2 logs paint-app
```

## Usage Guide

### Initial Access
1. Open `http://your-server:3000` in your browser
2. Enter the passphrase you set in `.env`
3. You'll see the main menu

### Main Menu Options

#### Add New Paint
- Select the building from the dropdown
- Enter paint name/color
- Specify if it's a custom color (check if it's a special order)
- If custom, enter the order number for future reordering
- Select paint line and sheen
- Enter the area/location in the building
- Add optional notes (e.g., special instructions, warnings)
- Submit to save

#### Search Paints
- **By Color**: Search for paint names or colors
- **By Building**: See all paints used in a specific building
- View details including location, paint line, finish, and any notes

#### Admin Panel
- **Manage Dropdowns**: Disable specific building, paint line, or finish options
- **Archive Paints**: Archive old/replaced paint entries (not deleted, just hidden)
- **View Statistics**: See total paint count and database info
- **Download Backups**: Export data as JSON or CSV for records
- **Restore Backups**: Download previous backups from the automatic backup system

## Configuration

### Change the Passphrase

The easiest way is to update your `.env` file:

```bash
# Edit .env
PAINT_PASSPHRASE=your_new_secure_passphrase

# Restart the app
pm2 restart paint-app
```

### Network Access

To allow other computers on your network to access the app:

#### Option 1: Access via Server's IP Address
1. Find your server's IP address:
   - Linux: `hostname -I`
   - Windows: `ipconfig` (look for IPv4 Address)

2. Access from other computers: `http://SERVER_IP:3000`

#### Option 2: Set Up a Domain Name (Advanced)
Configure DNS pointing to your server's IP, then access via domain name.

#### Option 3: Use a Reverse Proxy (Advanced)
Set up Nginx or Apache to forward traffic from port 80/443 to your Node.js app.

## Database Management

### Create a Manual Backup

The app automatically creates JSON backups every 6 months. To create one manually:

1. Log in and go to Admin Panel
2. Click "Download All Paints as JSON"

Or from the command line:
```bash
npm run backup  # (if available)
```

### Restore from Backup

If you ever need to restore from a backup:

1. Delete the current data: `npm run import-data` will clear and reimport
2. Replace the backup file in `backups/` with your previous backup
3. Run `npm run import-data`

### Database Maintenance

```bash
# Connect to PostgreSQL and check database size
sudo -u postgres psql
\c paint_inventory
SELECT pg_size_pretty(pg_database_size('paint_inventory'));
```

## API Endpoints

These are available for integrations:

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

## Tips

- The app automatically populates dropdowns from existing database entries
- Custom colors can track special order numbers for future reordering
- Search is fuzzy-friendly (partial matches work)
- Disabled dropdown options are hidden from the form but existing entries remain
- Archived paints are hidden but not deleted and can be restored anytime
- **Always change the default passphrase** before going live on your network!

## Troubleshooting

### Can't connect to PostgreSQL
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
# or check Services on Windows

# Verify connection string format
postgresql://username:password@hostname:port/database

# Test connection manually
psql -U paintapp -d paint_inventory -h localhost
```

### Port 3000 already in use
```bash
# Use a different port
PORT=3001 npm start
# or change in .env file
```

### Import data fails
```bash
# Make sure DATABASE_URL is set and PostgreSQL is running
echo $DATABASE_URL

# Check PostgreSQL is accepting connections
psql -U paintapp -d paint_inventory -h localhost -c "SELECT 1"

# Run import with verbose output
npm run import-data
```

### Need to see server logs
```bash
# With PM2
pm2 logs paint-app

# Or run without PM2
npm start
```

### Reset Everything and Start Fresh
```bash
# Drop the database and recreate it
sudo -u postgres psql
DROP DATABASE paint_inventory;
CREATE DATABASE paint_inventory;
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
\q

# Re-import the data
npm run import-data

# Restart the app
pm2 restart paint-app
```

## Project Structure

```
paint-app/
├── server.js                 # Express server with API endpoints
├── import-postgres.js        # Script to import backup data into PostgreSQL
├── package.json              # Dependencies
├── .env                       # Environment variables (created by you)
├── .env.example              # Example configuration
├── .gitignore                # Git ignore rules (excludes .env)
├── backups/                  # Directory for automatic backups
│   └── paint-backup-*.json   # Backup files
├── public/                   # Frontend files
│   ├── index.html            # Main HTML file
│   ├── styles.css            # Responsive styling
│   └── app.js                # Frontend JavaScript logic
└── README.md                 # This file
```

## Automatic Backups to GitHub (Optional)

If you want automatic backups pushed to GitHub:

### Setup Instructions

#### 1. Create a GitHub Personal Access Token

1. Go to **github.com** and log in
2. Click your profile → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Click **Generate new token (classic)**
4. Give it a name: `paint-app-backup`
5. Check only: **repo** (Full control of private repositories)
6. Copy the token (you'll only see it once!)

#### 2. Add to Your .env File

```
GITHUB_REPO=YOUR-USERNAME/paint-app
GITHUB_TOKEN=your_github_personal_access_token
```

#### 3. The App Will Automatically

- ✅ Create backups every 6 months
- ✅ Push them to your GitHub repo in a `backups/` folder
- ✅ You can restore any backup from the Admin Panel
- ✅ Full version history on GitHub - recover from any point

## Security Notes

- 🔒 **Change the default passphrase immediately**
- 🔒 **Use a strong, unique passphrase** (mix of letters, numbers, symbols)
- 🔒 **Keep your `.env` file private** - never commit it to Git
- 🔒 **Use HTTPS in production** - set up a reverse proxy with SSL certificates
- 🔒 **Restrict network access** - use firewall rules to limit who can access port 3000

## Support

For issues, questions, or feature requests, refer to the project documentation or contact your system administrator.

---

Built for efficient paint inventory management across multiple buildings!
