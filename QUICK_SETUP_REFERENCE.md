# Paint Index - Quick Setup Reference Card

**For: Your Boss**  
**Time Required: 30 minutes**  
**Difficulty: Easy (for Linux servers)**

---

## Step 1: Prepare Server (5 min)

```bash
# Install Node.js and PostgreSQL if not already installed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install nodejs postgresql postgresql-contrib -y
```

## Step 2: Clone Repository (2 min)

```bash
cd /var/www/apps  # or your preferred directory
git clone <REPO_URL> paint-app
cd paint-app
npm install
```

## Step 3: Set Up Database (5 min)

```bash
sudo -u postgres psql
```

Copy and paste into PostgreSQL:
```sql
CREATE DATABASE paint_inventory;
CREATE USER paintapp WITH PASSWORD 'YOUR_SECURE_PASSWORD';
ALTER ROLE paintapp SET client_encoding TO 'utf8';
ALTER ROLE paintapp SET default_transaction_isolation TO 'read committed';
ALTER ROLE paintapp SET default_transaction_deferrable TO on;
ALTER ROLE paintapp SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE paint_inventory TO paintapp;
\q
```

## Step 4: Configure App (3 min)

```bash
cp .env.example .env
nano .env  # Edit this file
```

Update these 3 things:
```
DATABASE_URL=postgresql://paintapp:YOUR_SECURE_PASSWORD@localhost:5432/paint_inventory
PAINT_PASSPHRASE=YOUR_SECURE_PASSPHRASE
PORT=3000
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

## Step 5: Import Data (2 min)

```bash
npm run import-data
```

You should see:
```
✓ Database tables initialized
Imported: 136/136
✓ Import complete! 136 entries added to database.
```

## Step 6: Start App (2 min)

### For Testing:
```bash
npm start
```

Visit: `http://localhost:3000`

### For Production (24/7):
```bash
npm install -g pm2
pm2 start server.js --name "paint-app"
pm2 startup
pm2 save
```

View logs: `pm2 logs paint-app`

---

## Access From Other Computers

Get server IP: `hostname -I`

Then visit: `http://SERVER_IP:3000`

---

## If Something Goes Wrong

### Can't connect to database?
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U paintapp -d paint_inventory -h localhost
```

### Port already in use?
```bash
PORT=3001 npm start
```

### Need to start over?
```bash
pm2 stop paint-app
sudo -u postgres psql -c "DROP DATABASE paint_inventory;"
# Then go back to Step 3
```

---

## Common Commands

| Task | Command |
|------|---------|
| Start app | `npm start` |
| Start with PM2 | `pm2 start server.js --name "paint-app"` |
| View logs | `pm2 logs paint-app` |
| Restart app | `pm2 restart paint-app` |
| Stop app | `pm2 stop paint-app` |
| Import data | `npm run import-data` |
| Check DB size | `psql -U paintapp -d paint_inventory -c "SELECT pg_size_pretty(pg_database_size('paint_inventory'));"` |

---

## Important URLs

- **App:** `http://localhost:3000` or `http://SERVER_IP:3000`
- **Full Docs:** See README.md in repo
- **Detailed Setup:** See DEPLOYMENT_GUIDE.md in repo

---

## Support Contacts

1. Check the README.md in the repo
2. Check the DEPLOYMENT_GUIDE.md
3. Check the SETUP_SUMMARY.md for FAQs

---

**Questions? Refer to DEPLOYMENT_GUIDE.md for detailed explanations.**
