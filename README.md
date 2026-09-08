# Paint Index - Paint Management System

A mobile-friendly web application for managing paint color inventory across multiple buildings.

## Features

- **Passphrase Protection**: Secure access with a simple passphrase
- **Add New Paints**: Form to log new paint colors with details like building, paint line, sheen, location, and notes
- **Custom Color Support**: Track custom color orders with order numbers
- **Search Functionality**: Search existing paints by color name or building
- **Mobile Responsive**: Works seamlessly on phones, tablets, and desktop browsers
- **Persistent Storage**: All data stored in SQLite database

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation & Setup

1. Navigate to the work directory:
   ```bash
   cd /Users/jeremy/Downloads/work
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   The app will be available at: `http://localhost:3000`

## Usage

### Initial Access
1. Open `http://localhost:3000` in your browser
2. Enter the passphrase (default: `paintapp123`)
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
- **By Building**: Search for all paints in a specific building
- View details including location, paint line, finish, and any notes

## Configuration

### Change the Passphrase

**Option 1: Environment Variable (Recommended for deployment)**
```bash
PAINT_PASSPHRASE=your_new_passphrase npm start
```

**Option 2: Edit server.js**
Edit line 9 in `server.js`:
```javascript
const PASSPHRASE = 'your_new_passphrase';
```

## Database

- Database file: `paints.db` (created automatically)
- Contains all paint entries with timestamps
- Data persists between server restarts

### To Reset Data

Delete the `paints.db` file and re-run the import:
```bash
rm paints.db
npm run import-data
```

## Automatic Backups to GitHub

The app can automatically push backups to your GitHub repository every 6 months!

### Setup Instructions

#### 1. Create a GitHub Personal Access Token

1. Go to **github.com** and log in
2. Click your profile → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Click **Generate new token (classic)**
4. Give it a name: `paint-app-backup`
5. Check only: **repo** (Full control of private repositories)
6. Click **Generate token**
7. **Copy the token** (you'll only see it once!)

#### 2. Deploy to Render with Backups

1. Push your code to GitHub (see below)
2. Go to **render.com** and sign up/log in
3. Click **New +** → **Web Service**
4. Connect your GitHub account and select `paint-app` repo
5. Fill in the form:
   - **Name**: paint-app
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Scroll to **Environment** and add:
   ```
   PAINT_PASSPHRASE = your-secure-passphrase-here
   GITHUB_REPO = YOUR-USERNAME/paint-app
   GITHUB_TOKEN = (paste your token from step 1)
   ```
7. Click **Create Web Service**
8. Render will deploy automatically from GitHub!

#### 3. Push Your Code to GitHub

```bash
cd ~/Downloads/work
git init
git add .
git commit -m "Initial commit: Paint app with auto-backups"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/paint-app.git
git push -u origin main
```

### How Automatic Backups Work

- ✅ Every 6 months, the app creates a backup automatically
- ✅ Backup is pushed to your GitHub repo in a `backups/` folder
- ✅ You can download any backup anytime from the Admin Panel
- ✅ Full version history on GitHub - can restore from any point
- ✅ Completely automatic - nothing to do!

## Project Structure

```
work/
├── server.js              # Express server with API endpoints
├── import-data.js         # Script to import Excel data
├── paints.db              # SQLite database (auto-created)
├── package.json           # Dependencies
└── public/
    ├── index.html         # Main HTML file
    ├── styles.css         # Responsive styling
    └── app.js             # Frontend JavaScript logic
```

## API Endpoints

- `POST /api/verify-passphrase` - Verify access passphrase
- `GET /api/paints` - Get all paints
- `GET /api/search?query=...&type=color|building` - Search paints
- `POST /api/paints` - Add new paint entry
- `GET /api/options/:field` - Get dropdown options (building, paint_line, finish)

## Tips

- The app automatically populates dropdowns from existing database entries
- Custom colors can track special order numbers for reordering
- Search is fuzzy-friendly (partial matches work)
- The default passphrase is: `paintapp123` - change this immediately!

## Troubleshooting

**Port 3000 already in use?**
```bash
PORT=3001 npm start
```

**Need to see server logs?**
```bash
npm start
# Look for connection messages and errors in the console
```

**Lost data?**
- The database (`paints.db`) contains all data
- Keep regular backups of this file
- Data persists between server restarts

---

Built for efficient paint inventory management across multiple buildings!
