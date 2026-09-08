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

## Deployment

For free hosting options:
- **Replit**: Supports Node.js, great for quick deployments
- **Railway.app**: Free tier available, easy setup
- **Render**: Free tier with auto-deploy from GitHub
- **Heroku**: Paid but very straightforward

When deploying:
1. Set the `PAINT_PASSPHRASE` environment variable in your hosting provider
2. The app will work with any cloud Node.js host
3. Consider adding a process to backup the `paints.db` file regularly

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
