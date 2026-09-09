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
    fetch('/api/options/finish').then(r => r.json()),
    fetch('/api/paints').then(r => r.json())
  ])
    .then(([buildings, paintLines, sheens, allPaints]) => {
      appState.dropdownOptions = { buildings, paintLines, sheens };
      appState.allPaints = allPaints;
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
        successDiv.textContent = '✓ Paint entry added! Ready for the next one.';

        // Reset form
        document.getElementById('paintForm').reset();
        document.getElementById('orderNumberGroup').style.display = 'none';

        // Clear paint name suggestions
        document.getElementById('paintNameSuggestions').innerHTML = '';

        // Hide success message after 2 seconds
        setTimeout(() => {
          successDiv.style.display = 'none';
        }, 2000);

        // Scroll to top of form
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      document.getElementById('resultsContainer').innerHTML = '<p class="placeholder">Select a building to view paints...</p>';
      document.getElementById('colorSearch').value = '';
      document.getElementById('buildingSearch').value = '';

      // Populate buildings dropdown
      populateBuildingsDropdown();
    })
    .catch(error => console.error('Error loading paints:', error));
}

// Populate buildings dropdown in search
function populateBuildingsDropdown() {
  fetch('/api/options/building')
    .then(res => res.json())
    .then(buildings => {
      const select = document.getElementById('buildingSearch');
      select.innerHTML = '<option value="">Select a building...</option>';
      buildings.forEach(building => {
        const option = document.createElement('option');
        option.value = building;
        option.textContent = building;
        select.appendChild(option);
      });
    });
}

// Search paints
function searchPaints(type) {
  const query = type === 'color'
    ? document.getElementById('colorSearch').value.trim()
    : document.getElementById('buildingSearch').value.trim();

  if (!query) {
    const placeholder = type === 'building'
      ? 'Select a building to view paints...'
      : 'Start typing to search...';
    document.getElementById('resultsContainer').innerHTML = `<p class="placeholder">${placeholder}</p>`;
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
          <div class="archive-btn-container">
            <button class="archive-btn" onclick="archivePaint(${paint.id}, '${escapeHtml(paint.paint_color)}')" title="Archive this paint">
              🗑️
            </button>
          </div>
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
  } else if (tab === 'archived') {
    loadArchivedPaints();
  } else if (tab === 'export') {
    loadDatabaseStats();
  } else if (tab === 'backups') {
    loadBackupsList();
  }
}

// Buildings Management
function loadBuildingsList() {
  fetch('/api/options-admin/building')
    .then(res => res.json())
    .then(buildings => {
      const container = document.getElementById('buildingsList');
      if (buildings.length === 0) {
        container.innerHTML = '<p class="placeholder">No buildings yet.</p>';
        return;
      }
      container.innerHTML = buildings.map(b =>
        `<div class="item-badge">
          ${escapeHtml(b.value)}
          <button class="delete-value-btn" onclick="deleteBuilding('${escapeHtml(b.value)}')">✕</button>
        </div>`
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
  fetch('/api/options-admin/paint_line')
    .then(res => res.json())
    .then(lines => {
      const container = document.getElementById('paintlinesList');
      if (lines.length === 0) {
        container.innerHTML = '<p class="placeholder">No paint lines yet.</p>';
        return;
      }
      container.innerHTML = lines
        .filter(l => !l.disabled)
        .map(l =>
          `<div class="item-badge">
            ${escapeHtml(l.value)}
            <button class="delete-value-btn" onclick="deletePaintLine('${escapeHtml(l.value)}')">✕</button>
          </div>`
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

function deletePaintLine(lineName) {
  if (!confirm(`Delete "${lineName}" from paint lines? You can add it again anytime.`)) {
    return;
  }

  fetch(`/api/options/paint_line/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: lineName })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadPaintLinesList();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error deleting paint line');
    });
}

// Sheens Management
function loadSheensList() {
  fetch('/api/options-admin/finish')
    .then(res => res.json())
    .then(sheens => {
      const container = document.getElementById('sheensList');
      if (sheens.length === 0) {
        container.innerHTML = '<p class="placeholder">No sheens yet.</p>';
        return;
      }
      container.innerHTML = sheens
        .filter(s => !s.disabled)
        .map(s =>
          `<div class="item-badge">
            ${escapeHtml(s.value)}
            <button class="delete-value-btn" onclick="deleteSheen('${escapeHtml(s.value)}')">✕</button>
          </div>`
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

function deleteSheen(sheenName) {
  if (!confirm(`Delete "${sheenName}" from sheens? You can add it again anytime.`)) {
    return;
  }

  fetch(`/api/options/finish/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: sheenName })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadSheensList();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error deleting sheen');
    });
}

function deleteBuilding(buildingName) {
  if (!confirm(`Delete "${buildingName}" from buildings? You can add it again anytime.`)) {
    return;
  }

  fetch(`/api/options/building/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: buildingName })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadBuildingsList();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error deleting building');
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

// Archive/Unarchive functions

function archivePaint(id, paintName) {
  const passphrase = prompt(`Archive "${paintName}"?\n\nEnter your passphrase to confirm:`);

  if (passphrase === null) {
    return; // User cancelled
  }

  if (passphrase === '') {
    alert('Passphrase is required');
    return;
  }

  // Verify passphrase
  fetch('/api/verify-passphrase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Passphrase correct, proceed with archive
        fetch(`/api/paints/${id}/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              alert(`✓ "${paintName}" archived successfully`);
              // Reload search results
              const activeTab = document.querySelector('.tab-btn.active');
              if (activeTab && activeTab.textContent.includes('Building')) {
                searchPaints('building');
              } else {
                searchPaints('color');
              }
            }
          })
          .catch(error => {
            console.error('Error:', error);
            alert('Error archiving paint');
          });
      } else {
        alert('Incorrect passphrase. Archive cancelled.');
      }
    })
    .catch(error => {
      console.error('Error verifying passphrase:', error);
      alert('Error verifying passphrase');
    });
}

function loadArchivedPaints() {
  fetch('/api/paints/archived')
    .then(res => res.json())
    .then(archived => {
      const container = document.getElementById('archivedList');

      if (archived.length === 0) {
        container.innerHTML = '<p class="placeholder">No archived paints</p>';
        return;
      }

      container.innerHTML = archived.map(paint => `
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
          <div class="archive-btn-container">
            <button class="archive-btn restore-btn" onclick="restorePaint(${paint.id}, '${escapeHtml(paint.paint_color)}')">
              ↺ Restore
            </button>
          </div>
        </div>
      `).join('');
    })
    .catch(error => {
      console.error('Error loading archived paints:', error);
      document.getElementById('archivedList').innerHTML = '<p class="placeholder">Error loading archived paints</p>';
    });
}

function restorePaint(id, paintName) {
  if (!confirm(`Restore "${paintName}"? It will appear in search results again.`)) {
    return;
  }

  fetch(`/api/paints/${id}/unarchive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`✓ "${paintName}" restored successfully`);
        loadArchivedPaints();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error restoring paint');
    });
}

// Paint name autocomplete
function updatePaintSuggestions() {
  const input = document.getElementById('paintName').value.trim().toLowerCase();
  const datalist = document.getElementById('paintNameSuggestions');

  if (input.length === 0) {
    datalist.innerHTML = '';
    return;
  }

  // Get unique paint colors from existing paints
  const uniqueColors = [...new Set(appState.allPaints
    .map(p => p.paint_color)
    .filter(c => c.toLowerCase().includes(input))
  )].sort().slice(0, 10); // Limit to 10 suggestions

  datalist.innerHTML = uniqueColors
    .map(color => `<option value="${escapeHtml(color)}"></option>`)
    .join('');
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
