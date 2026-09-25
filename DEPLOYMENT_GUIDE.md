# Paint Index - Deployment Guide for Your Boss

This guide is specifically for your boss to follow when deploying Paint Index on your network server.

## TL;DR - Quick Start (Linux)

```bash
# Clone the repository
git clone <your-repo-url> paint-app
cd paint-app

# Run the automated setup script
chmod +x setup-server.sh
./setup-server.sh

# Follow the prompts, edit .env file with your settings, then:
npm start
```

The app will be available at `http://localhost:3000`

---

## Detailed Setup Guide

### What You'll Need

- A Linux or Windows server with internet access
- Administrator/sudo access on that server
- PostgreSQL 12 or higher
- Node.js v14 or higher
- ~500 MB disk space

### Step-by-Step Instructions

#### Step 1: Prepare the Server

**For Linux Servers:**
```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (if not already installed)
sudo apt-get install -y postgresql postgresql-contrib
```

**For Windows Servers:**
1. Download and install Node.js from https://nodejs.org/ (LTS version)
2. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
3. During PostgreSQL installation, remember the password you set for the `postgres` user

#### Step 2: Clone the Repository

```bash
# Navigate to where you want to install the app
cd /var/www/apps  # or your preferred directory

# Clone the repository
git clone <REPO-URL> paint-app
cd paint-app

# Install dependencies
npm install
```

#### Step 3: Set Up PostgreSQL Database

**For Linux:**
```bash
sudo -u postgres psql
```

Then copy and paste this (change 'change_this_password' to something secure):
```sql
CREATE DATABASE paint_inventory;
CREATE USER paintapp WITH PASSWORD 'change_this_password';
ALTER ROLE paintapp SET client_encoding TO 'utf8';
ALTER ROLE paintapp SET default_transaction_isolation TO 'read committed';
ALTER ROLE paintapp SET default_transaction_deferrable TO on;
ALTER ROLE paintapp SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
\q
```

**For Windows:**
1. Open Command Prompt or PowerShell as Administrator
2. Run: `psql -U postgres`
3. Enter the password you set during PostgreSQL installation
4. Copy and paste the SQL commands above (same as Linux)

#### Step 4: Configure Environment Variables

```bash
# Copy the example configuration
cp .env.example .env

# Edit the .env file with your settings
nano .env  # or use your preferred editor
```

**Update these fields:**
```
DATABASE_URL=postgresql://paintapp:YOUR_PASSWORD_HERE@localhost:5432/paint_inventory
PORT=3000
NODE_ENV=production
PAINT_PASSPHRASE=CHANGE_TO_YOUR_SECURE_PASSPHRASE
```

Save the file (Ctrl+O, Enter, Ctrl+X in nano).

#### Step 5: Import All Your Paint Data

The app includes a backup file with all **306 paint entries**. Import them with one command:

```bash
npm run import-data
```

You should see:
```
Using complete backup with all entries: backups/paint-backup-complete-306-entries.json
✓ Database tables initialized
✓ Cleared existing paint entries
Imported: 306/306
✓ Import complete! 306 entries added to database.
```

**That's it!** All your paint data is now in the PostgreSQL database. No manual data entry needed.

#### Step 6: Start the Application

**For Testing:**
```bash
npm start
```

Visit `http://localhost:3000` in your browser and enter the passphrase you set.

**For Production (Recommended):**

Install PM2 (keeps the app running automatically):
```bash
npm install -g pm2

# Start the app
pm2 start server.js --name "paint-app"

# Make it auto-start when the server reboots
pm2 startup
pm2 save

# View logs
pm2 logs paint-app
```

### Network Access

**To access from other computers on your network:**

Find your server's IP address:
- Linux: `hostname -I`
- Windows: `ipconfig` (look for IPv4 Address)

Then access from other computers: `http://SERVER_IP:3000`

**Example:**
- Your server IP: `192.168.1.100`
- Access from another computer: `http://192.168.1.100:3000`

---

## Troubleshooting

### "Cannot find module 'pg'"
```bash
npm install
npm start
```

### "Database connection refused"
Check your DATABASE_URL in .env file:
- Username should be: `paintapp`
- Password should match what you set in PostgreSQL
- Host should be: `localhost`
- Database name should be: `paint_inventory`

Test the connection:
```bash
psql -U paintapp -d paint_inventory -h localhost
```

### "Port 3000 is already in use"
```bash
# Use a different port
PORT=3001 npm start
```

### "Import data fails"
Make sure:
1. PostgreSQL is running
2. DATABASE_URL is correct in .env
3. You can connect manually: `psql -U paintapp -d paint_inventory`

Then try again:
```bash
npm run import-data
```

### "Can't access from another computer on the network"
1. Check your server's firewall allows port 3000
2. Use your server's IP address, not `localhost`
3. Make sure the server and client computer are on the same network

**Allow port 3000 through firewall (Linux):**
```bash
sudo ufw allow 3000/tcp
```

---

## Maintenance

### Backup Your Data

The app automatically creates backups every 6 months. To create a manual backup:

1. Log into the app and go to Admin Panel
2. Click "Download All Paints as JSON"

Or from the command line:
```bash
# This exports all paint data
psql -U paintapp -d paint_inventory -c "\COPY (SELECT * FROM paints) TO STDOUT WITH CSV HEADER" > backup.csv
```

### View Application Logs

```bash
# With PM2
pm2 logs paint-app

# Or without PM2 (if running in foreground)
npm start
```

### Check Database Size

```bash
sudo -u postgres psql -d paint_inventory -c "SELECT pg_size_pretty(pg_database_size('paint_inventory'));"
```

### Restart the Application

```bash
# With PM2
pm2 restart paint-app

# Without PM2
# Stop the running process (Ctrl+C) and run: npm start
```

### Reset Everything (Start Over)

If you need to completely reset:

```bash
# Stop the app
pm2 stop paint-app  # or Ctrl+C

# Drop the database
sudo -u postgres psql -c "DROP DATABASE paint_inventory;"

# Recreate it
sudo -u postgres psql <<EOF
CREATE DATABASE paint_inventory;
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
EOF

# Re-import the data
npm run import-data

# Restart
pm2 start paint-app  # or npm start
```

---

## Security Recommendations

Before going live on your network:

1. **Change the passphrase:**
   - Edit `.env` and set `PAINT_PASSPHRASE` to something secure
   - Restart the app

2. **Use HTTPS in production:**
   - Set up a reverse proxy (Nginx, Apache) with SSL certificates
   - Forward traffic to your Node.js app on port 3000

3. **Restrict network access:**
   - Use firewall rules to limit who can access the app
   - Only allow access from specific IP ranges if possible

4. **Regular backups:**
   - Download backups monthly from the Admin Panel
   - Store them in a safe location

5. **Keep software updated:**
   - Regularly update Node.js and PostgreSQL
   - Check for security updates

---

## Contact

If you have questions or issues, refer to the main README.md file or contact your system administrator.
