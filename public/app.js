// State management
let appState = {
  isLoggedIn: false,
  allPaints: [],
  dropdownOptions: {
    buildings: [],
    paintLines: [],
    sheens: []
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  showScreen('loginScreen');
});

// Screen Navigation
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');

  if (screenId === 'searchScreen') {
    loadAllPaints();
  }
  if (screenId === 'entryScreen') {
    loadDropdownOptions();
  }
}

// Login
function login(event) {
  event.preventDefault();
  const passphrase = document.getElementById('passphraseInput').value;
  const errorDiv = document.getElementById('loginError');

  fetch('/api/verify-passphrase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        appState.isLoggedIn = true;
        errorDiv.style.display = 'none';
        showScreen('menuScreen');
      } else {
        errorDiv.textContent = 'Invalid passphrase. Try again.';
        errorDiv.style.display = 'block';
        document.getElementById('passphraseInput').value = '';
      }
    })
    .catch(error => {
      console.error('Login error:', error);
      errorDiv.textContent = 'Connection error. Please try again.';
      errorDiv.style.display = 'block';
    });
}

// Logout
function logout() {
  appState.isLoggedIn = false;
  document.getElementById('passphraseInput').value = '';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('paintForm').reset();
  document.getElementById('entrySuccess').style.display = 'none';
  showScreen('loginScreen');
}

// Load dropdown options
function loadDropdownOptions() {
  Promise.all([
    fetch('/api/options/building').then(r => r.json()),
    fetch('/api/options/paint_line').then(r => r.json()),
    fetch('/api/options/finish').then(r => r.json())
  ])
    .then(([buildings, paintLines, sheens]) => {
      appState.dropdownOptions = { buildings, paintLines, sheens };
      populateDropdowns();
    })
    .catch(error => console.error('Error loading options:', error));
}

function populateDropdowns() {
  // Buildings
  const buildingSelect = document.getElementById('building');
  appState.dropdownOptions.buildings.forEach(building => {
    const option = document.createElement('option');
    option.value = building;
    option.textContent = building;
    buildingSelect.appendChild(option);
  });

  // Paint Lines
  const paintLineSelect = document.getElementById('paintLine');
  appState.dropdownOptions.paintLines.forEach(line => {
    const option = document.createElement('option');
    option.value = line;
    option.textContent = line;
    paintLineSelect.appendChild(option);
  });

  // Sheens
  const sheenSelect = document.getElementById('sheen');
  appState.dropdownOptions.sheens.forEach(sheen => {
    const option = document.createElement('option');
    option.value = sheen;
    option.textContent = sheen;
    sheenSelect.appendChild(option);
  });
}

// Toggle custom color field
function toggleCustomColor() {
  const isCustom = document.querySelector('input[name="customColor"]:checked').value === 'yes';
  document.getElementById('orderNumberGroup').style.display = isCustom ? 'flex' : 'none';
  if (!isCustom) {
    document.getElementById('orderNumber').value = '';
  }
}

// Dropdowns update functions (for sorting/tracking)
function updateBuildingList() {}
function updatePaintLineList() {}
function updateSheenList() {}

// Submit paint form
function submitPaint(event) {
  event.preventDefault();

  const isCustom = document.querySelector('input[name="customColor"]:checked').value === 'yes';

  const paintData = {
    building: document.getElementById('building').value,
    paint_color: document.getElementById('paintName').value,
    finish: document.getElementById('sheen').value,
    paint_line: document.getElementById('paintLine').value,
    location_in_building: document.getElementById('location').value,
    custom_color: isCustom,
    order_number: isCustom ? document.getElementById('orderNumber').value : null,
    notes: document.getElementById('notes').value || null
  };

  fetch('/api/paints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paintData)
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Show success message
        const successDiv = document.getElementById('entrySuccess');
        successDiv.style.display = 'block';
        successDiv.textContent = '✓ Paint entry added successfully!';

        // Reset form
        document.getElementById('paintForm').reset();
        document.getElementById('orderNumberGroup').style.display = 'none';

        // Auto-return to menu after 2 seconds
        setTimeout(() => {
          successDiv.style.display = 'none';
          showScreen('menuScreen');
        }, 2000);
      }
    })
    .catch(error => {
      console.error('Submit error:', error);
      alert('Error submitting paint. Please try again.');
    });
}

// Load all paints for search
function loadAllPaints() {
  fetch('/api/paints')
    .then(res => res.json())
    .then(paints => {
      appState.allPaints = paints;
      document.getElementById('resultsContainer').innerHTML = '<p class="placeholder">Start typing to search...</p>';
      document.getElementById('colorSearch').value = '';
      document.getElementById('buildingSearch').value = '';
    })
    .catch(error => console.error('Error loading paints:', error));
}

// Search paints
function searchPaints(type) {
  const query = type === 'color'
    ? document.getElementById('colorSearch').value.trim()
    : document.getElementById('buildingSearch').value.trim();

  if (!query) {
    document.getElementById('resultsContainer').innerHTML = '<p class="placeholder">Start typing to search...</p>';
    return;
  }

  fetch(`/api/search?query=${encodeURIComponent(query)}&type=${type}`)
    .then(res => res.json())
    .then(results => {
      const container = document.getElementById('resultsContainer');

      if (results.length === 0) {
        container.innerHTML = '<p class="no-results">No paints found. Try a different search.</p>';
        return;
      }

      container.innerHTML = results.map(paint => `
        <div class="paint-result">
          <h3>${escapeHtml(paint.paint_color)}</h3>
          <div class="detail">
            <span class="label">Building:</span>
            <span class="value">${escapeHtml(paint.building)}</span>
          </div>
          <div class="detail">
            <span class="label">Paint Line:</span>
            <span class="value">${escapeHtml(paint.paint_line)}</span>
          </div>
          <div class="detail">
            <span class="label">Finish:</span>
            <span class="value">${escapeHtml(paint.finish)}</span>
          </div>
          <div class="detail">
            <span class="label">Location:</span>
            <span class="value">${escapeHtml(paint.location_in_building || 'N/A')}</span>
          </div>
          ${paint.custom_color ? `
            <div class="detail">
              <span class="label">Custom Color:</span>
              <span class="value">Yes</span>
            </div>
            <div class="detail">
              <span class="label">Order #:</span>
              <span class="value">${escapeHtml(paint.order_number || 'N/A')}</span>
            </div>
          ` : ''}
          ${paint.notes ? `
            <div class="detail">
              <span class="label">Notes:</span>
              <span class="value">${escapeHtml(paint.notes)}</span>
            </div>
          ` : ''}
        </div>
      `).join('');
    })
    .catch(error => {
      console.error('Search error:', error);
      document.getElementById('resultsContainer').innerHTML = '<p class="no-results">Error searching. Please try again.</p>';
    });
}

// Switch search tab
function switchSearchTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  if (tab === 'color') {
    document.getElementById('colorTab').classList.add('active');
    document.getElementById('colorSearch').focus();
  } else if (tab === 'building') {
    document.getElementById('buildingTab').classList.add('active');
    document.getElementById('buildingSearch').focus();
  }

  // Clear results
  document.getElementById('resultsContainer').innerHTML = '<p class="placeholder">Start typing to search...</p>';
}

// Load and display all paints
function loadAndShowAllPaints() {
  showScreen('viewAllScreen');

  fetch('/api/paints')
    .then(res => res.json())
    .then(paints => {
      appState.allPaints = paints;
      displayAllPaints(paints, 'building');
    })
    .catch(error => {
      console.error('Error loading paints:', error);
      document.getElementById('allPaintsContainer').innerHTML = '<p class="no-results">Error loading paints. Please try again.</p>';
    });
}

// Display all paints with current sort
function displayAllPaints(paints, sortBy) {
  let sortedPaints = [...paints];

  if (sortBy === 'building') {
    sortedPaints.sort((a, b) => {
      if (a.building !== b.building) {
        return a.building.localeCompare(b.building);
      }
      return a.paint_color.localeCompare(b.paint_color);
    });
  } else if (sortBy === 'color') {
    sortedPaints.sort((a, b) => a.paint_color.localeCompare(b.paint_color));
  } else if (sortBy === 'line') {
    sortedPaints.sort((a, b) => {
      if (a.paint_line !== b.paint_line) {
        return a.paint_line.localeCompare(b.paint_line);
      }
      return a.paint_color.localeCompare(b.paint_color);
    });
  }

  const container = document.getElementById('allPaintsContainer');
  container.innerHTML = sortedPaints.map(paint => `
    <div class="paint-result">
      <h3>${escapeHtml(paint.paint_color)}</h3>
      <div class="detail">
        <span class="label">Building:</span>
        <span class="value">${escapeHtml(paint.building)}</span>
      </div>
      <div class="detail">
        <span class="label">Paint Line:</span>
        <span class="value">${escapeHtml(paint.paint_line)}</span>
      </div>
      <div class="detail">
        <span class="label">Finish:</span>
        <span class="value">${escapeHtml(paint.finish)}</span>
      </div>
      <div class="detail">
        <span class="label">Location:</span>
        <span class="value">${escapeHtml(paint.location_in_building || 'N/A')}</span>
      </div>
      ${paint.custom_color ? `
        <div class="detail">
          <span class="label">Custom Color:</span>
          <span class="value">Yes</span>
        </div>
        <div class="detail">
          <span class="label">Order #:</span>
          <span class="value">${escapeHtml(paint.order_number || 'N/A')}</span>
        </div>
      ` : ''}
      ${paint.notes ? `
        <div class="detail">
          <span class="label">Notes:</span>
          <span class="value">${escapeHtml(paint.notes)}</span>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Resort all paints when sort option changes
function resortAllPaints() {
  const sortBy = document.getElementById('sortBy').value;
  displayAllPaints(appState.allPaints, sortBy);
}

// Admin Panel Functions

function switchAdminTab(tab) {
  // Hide all tabs
  document.querySelectorAll('.admin-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tab + 'Tab').classList.add('active');
  event.target.classList.add('active');

  // Load content
  if (tab === 'buildings') {
    loadBuildingsList();
  } else if (tab === 'paintlines') {
    loadPaintLinesList();
  } else if (tab === 'sheens') {
    loadSheensList();
  } else if (tab === 'export') {
    loadDatabaseStats();
  } else if (tab === 'backups') {
    loadBackupsList();
  }
}

// Buildings Management
function loadBuildingsList() {
  fetch('/api/options/building')
    .then(res => res.json())
    .then(buildings => {
      const container = document.getElementById('buildingsList');
      if (buildings.length === 0) {
        container.innerHTML = '<p class="placeholder">No buildings yet.</p>';
        return;
      }
      container.innerHTML = buildings.map(b =>
        `<div class="item-badge">${escapeHtml(b)}</div>`
      ).join('');
    });
}

function addNewBuilding(event) {
  event.preventDefault();
  const buildingName = document.getElementById('newBuilding').value.trim();

  if (!buildingName) {
    alert('Please enter a building name');
    return;
  }

  // Add a fake paint entry with the new building
  const data = {
    building: buildingName,
    paint_color: 'Sample Color',
    finish: 'Matte',
    paint_line: 'Standard',
    location_in_building: 'N/A',
    custom_color: false,
    notes: 'Auto-created for building management'
  };

  fetch('/api/paints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        alert(`Building "${buildingName}" added successfully!`);
        document.getElementById('newBuilding').value = '';
        loadBuildingsList();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error adding building');
    });
}

// Paint Lines Management
function loadPaintLinesList() {
  fetch('/api/options/paint_line')
    .then(res => res.json())
    .then(lines => {
      const container = document.getElementById('paintlinesList');
      if (lines.length === 0) {
        container.innerHTML = '<p class="placeholder">No paint lines yet.</p>';
        return;
      }
      container.innerHTML = lines.map(l =>
        `<div class="item-badge">${escapeHtml(l)}</div>`
      ).join('');
    });
}

function addNewPaintLine(event) {
  event.preventDefault();
  const lineName = document.getElementById('newPaintLine').value.trim();

  if (!lineName) {
    alert('Please enter a paint line name');
    return;
  }

  const data = {
    building: 'Management',
    paint_color: 'Sample Color',
    finish: 'Matte',
    paint_line: lineName,
    location_in_building: 'N/A',
    custom_color: false,
    notes: 'Auto-created for paint line management'
  };

  fetch('/api/paints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        alert(`Paint line "${lineName}" added successfully!`);
        document.getElementById('newPaintLine').value = '';
        loadPaintLinesList();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error adding paint line');
    });
}

// Sheens Management
function loadSheensList() {
  fetch('/api/options/finish')
    .then(res => res.json())
    .then(sheens => {
      const container = document.getElementById('sheensList');
      if (sheens.length === 0) {
        container.innerHTML = '<p class="placeholder">No sheens yet.</p>';
        return;
      }
      container.innerHTML = sheens.map(s =>
        `<div class="item-badge">${escapeHtml(s)}</div>`
      ).join('');
    });
}

function addNewSheen(event) {
  event.preventDefault();
  const sheenName = document.getElementById('newSheen').value.trim();

  if (!sheenName) {
    alert('Please enter a sheen/finish name');
    return;
  }

  const data = {
    building: 'Management',
    paint_color: 'Sample Color',
    finish: sheenName,
    paint_line: 'Standard',
    location_in_building: 'N/A',
    custom_color: false,
    notes: 'Auto-created for sheen management'
  };

  fetch('/api/paints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        alert(`Sheen "${sheenName}" added successfully!`);
        document.getElementById('newSheen').value = '';
        loadSheensList();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error adding sheen');
    });
}

// Database Export and Stats
function loadDatabaseStats() {
  fetch('/api/admin/stats')
    .then(res => res.json())
    .then(stats => {
      document.getElementById('dbStats').innerHTML = `
        <strong>Database Status:</strong><br>
        Total Paint Entries: ${stats.totalPaints}
      `;
    });
}

function exportDatabaseJSON() {
  window.location.href = '/api/admin/export';
}

function exportDatabaseCSV() {
  window.location.href = '/api/admin/export-csv';
}

// Backup Management
function loadBackupsList() {
  fetch('/api/admin/backups')
    .then(res => res.json())
    .then(backups => {
      const container = document.getElementById('backupsList');

      if (backups.length === 0) {
        container.innerHTML = '<p class="placeholder">No backups yet. Create one manually or wait for automatic backup.</p>';
        return;
      }

      container.innerHTML = backups.map(backup => `
        <div class="backup-item">
          <div class="backup-info">
            <div class="date">📅 ${escapeHtml(backup.date)}</div>
            <div class="size">Size: ${escapeHtml(backup.size)}</div>
          </div>
          <button class="backup-download-btn" onclick="downloadBackup('${escapeHtml(backup.filename)}')"
            ⬇️ Download
          </button>
        </div>
      `).join('');
    })
    .catch(error => {
      console.error('Error loading backups:', error);
      document.getElementById('backupsList').innerHTML = '<p class="placeholder">Error loading backups</p>';
    });
}

function downloadBackup(filename) {
  window.location.href = `/api/admin/backup/${encodeURIComponent(filename)}`;
}

function createManualBackup() {
  if (!confirm('Create a backup now? This will save the current database state.')) {
    return;
  }

  fetch('/api/admin/backup-now', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert('✓ Backup created successfully!');
        loadBackupsList();
      } else {
        alert('Error creating backup: ' + data.error);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error creating backup');
    });
}

// Utility function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
