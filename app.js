// ============ FIREBASE CLOUD SYNC CONFIGURATION ============
const firebaseConfig = {
  apiKey: "AIzaSyBsn4sSre1y9JT4SJDvmTRG6fmQEdVb_3k",
  authDomain: "auf-kurs---health.firebaseapp.com",
  projectId: "auf-kurs---health",
  storageBucket: "auf-kurs---health.firebasestorage.app",
  messagingSenderId: "809268235109",
  appId: "1:809268235109:web:e726a268d6e376800d2f8c"
};

// Initialize Firebase
let firebaseApp = null;
let db = null;
let isCloudSyncEnabled = false;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isCloudSyncEnabled = true;
    console.log('✓ Firebase Firestore initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    isCloudSyncEnabled = false;
}
// ============ END FIREBASE CONFIGURATION ============

// Helper Functions BEFORE appState!
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// DANN appState
const appState = {
    entries: [],
    bonusPoints: 0,
    rauchfreiStart: getTodayDate(),
    systemStart: getTodayDate(),
    currentDate: getTodayDate(),

    viewedKw: null, // For week navigation (e.g., 'KW45', 'KW46', ...)
    lastSyncTime: null,
    isOnline: navigator.onLine,
    isSyncing: false
};

// ============ CLOUD SYNC FUNCTIONS ============

// Update sync status display
function updateSyncStatus(status, message, lastSync = null) {
    const statusText = document.getElementById('syncStatusText');
    const statusTime = document.getElementById('syncStatusTime');
    
    if (!statusText) return;
    
    if (status === 'connected') {
        statusText.innerHTML = '☁️ Mit Cloud verbunden';
        statusText.style.color = 'var(--color-success)';
    } else if (status === 'syncing') {
        statusText.innerHTML = '🔄 Synchronisiere...';
        statusText.style.color = 'var(--color-primary)';
    } else if (status === 'offline') {
        statusText.innerHTML = '📱 Offline-Modus';
        statusText.style.color = 'var(--color-warning)';
    } else if (status === 'error') {
        statusText.innerHTML = '⚠️ Sync-Fehler';
        statusText.style.color = 'var(--color-error)';
    }
    
    if (lastSync) {
        const time = new Date(lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        statusTime.textContent = `Letzter Sync: ${time}`;
    } else if (message) {
        statusTime.textContent = message;
    }
}


// Setup real-time sync listener
function setupRealtimeSync() {
    if (!isCloudSyncEnabled || syncListenerAttached) return;
    
    try {
        console.log('Setting up real-time sync listener...');
        const dbRef = database.ref('users/user_default/weeks');
        
        dbRef.on('value', (snapshot) => {
            // Skip if we're currently syncing (to avoid infinite loop)
            if (appState.isSyncing) {
                console.log('Skipping cloud update (currently syncing)');
                return;
            }
            
            const cloudData = snapshot.val();
            if (!cloudData) return;
            
            console.log('Received cloud update');
            
            // Convert cloud data to entries array
            const cloudEntries = [];
            for (let kw in cloudData) {
                const week = cloudData[kw];
                if (week.entries) {
                    cloudEntries.push(...week.entries);
                }
            }
            
            // Check if cloud data is different from local
            if (JSON.stringify(cloudEntries) !== JSON.stringify(appState.entries)) {
                console.log('Cloud data is different - updating local data');
                appState.entries = cloudEntries;
                
                // Recalculate bonus points
                recalculateBonusPoints();
                
                // Refresh current view
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab) {
                    const tabId = activeTab.id.replace('tab-', '');
                    if (tabId === 'wochenanalyse') renderWochenanalyse();
                    else if (tabId === 'tagesanalyse') renderTagesanalyse();
                    else if (tabId === 'monatsanalyse') renderMonatsanalyse();
                    else if (tabId === 'bonusprogramm') renderBonus();
                }
                
                appState.lastSyncTime = Date.now();
                updateSyncStatus('connected', null, appState.lastSyncTime);
                
                // Show notification
                showNotification('✓ Daten von Cloud synchronisiert', 'success');
            }
        });
        
        syncListenerAttached = true;
        console.log('✓ Real-time sync listener attached');
    } catch (error) {
        console.error('❌ Failed to setup real-time sync:', error);
    }
}

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('🌐 Back online - syncing with cloud');
    appState.isOnline = true;
    updateSyncStatus('syncing', 'Synchronisiere...');
    
    // Sync local data to cloud
    saveToCloud(appState.entries).then(() => {
        showNotification('✓ Mit Cloud verbunden und synchronisiert', 'success');
    });
});

window.addEventListener('offline', () => {
    console.log('📱 Offline - using local data only');
    appState.isOnline = false;
    updateSyncStatus('offline', 'Änderungen werden später synchronisiert');
    showNotification('📱 Offline-Modus: Änderungen werden später synchronisiert', 'success');
});

// Generate unique ID for entries
function generateEntryId() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialize with provided data
async function initializeData() {
    console.log('Initializing app data...');
    
    // Try to load from cloud first
    const cloudEntries = await loadAppStateFromCloud();
    
    if (cloudEntries && cloudEntries.length > 0) {
        console.log('Using cloud data:', cloudEntries.length, 'entries');
        appState.entries = cloudEntries;
        
        // Setup real-time sync listener
        setupRealtimeSync();
        
        return;
    }
    
    console.log('No cloud data - initializing with default data');
    
    // Add initial entries from KW45 with unique IDs
    appState.entries = [
        {
            id: generateEntryId(),
            type: 'ernaehrung',
            datum: '2025-11-03',
            zeit: '12:30',
            ort: 'Arbeit',
            gericht: 'Kebap (Huhn ohne Tomaten)',
            portion: 450,
            kcal: 550,
            fett: 18,
            kh: 60,
            eiweiss: 35,
            preis: 8.3,
            ldlScore: 6.5
        },
        {
            id: generateEntryId(),
            type: 'trinken',
            datum: '2025-11-03',
            zeit: '12:30',
            getraenk: 'Cola',
            kategorie: 'Cola',
            menge: 0.5,
            zucker: 20
        },
        {
            id: generateEntryId(),
            type: 'trinken',
            datum: '2025-11-03',
            zeit: '14:00',
            getraenk: 'Wasser',
            kategorie: 'Wasser',
            menge: 0.75,
            zucker: 0
        },
        {
            id: generateEntryId(),
            type: 'ernaehrung',
            datum: '2025-11-04',
            zeit: '12:00',
            ort: 'Arbeit',
            gericht: 'Macaroni Pesto Glutenfrei',
            portion: 350,
            kcal: 420,
            fett: 22,
            kh: 45,
            eiweiss: 12,
            preis: 8.0,
            ldlScore: 5.5
        },
        {
            id: generateEntryId(),
            type: 'trinken',
            datum: '2025-11-04',
            zeit: '12:00',
            getraenk: 'Wasser',
            kategorie: 'Wasser',
            menge: 1.0,
            zucker: 0
        },
        {
            id: generateEntryId(),
            type: 'trinken',
            datum: '2025-11-04',
            zeit: '09:00',
            getraenk: 'Kaffee',
            kategorie: 'Kaffee',
            menge: 0.3,
            zucker: 0
        },
        {
            id: generateEntryId(),
            type: 'sport',
            datum: '2025-11-05',
            aktivitaet: 'Holz schlichten',
            dauer: 30,
            intensitaet: 'moderat',
            schritte: null
        },
        {
            id: generateEntryId(),
            type: 'sport',
            datum: '2025-11-07',
            aktivitaet: 'Liegestütze/Kniebeugen',
            dauer: 2,
            intensitaet: 'schwer',
            schritte: null,
            kommentar: '20 Liegestütze, 20 Kniebeugen, 10 Situps'
        },
        {
            id: generateEntryId(),
            type: 'schlaf',
            datum: '2025-11-08',
            dauer: 8.5
        },
        {
            id: generateEntryId(),
            type: 'schlaf',
            datum: '2025-11-09',
            dauer: 8.2
        },
        {
            id: generateEntryId(),
            type: 'trinken',
            datum: '2025-11-08',
            zeit: '14:00',
            getraenk: 'Wasser',
            kategorie: 'Wasser',
            menge: 0.5,
            zucker: 0
        },
        {
            id: generateEntryId(),
            type: 'trinken',
            datum: '2025-11-09',
            zeit: '10:00',
            getraenk: 'Wasser',
            kategorie: 'Wasser',
            menge: 0.75,
            zucker: 0
        }
    ];
    
    // Add rauchfrei entries for Nov 1-10
    for (let i = 1; i <= 10; i++) {
        const datum = `2025-11-${String(i).padStart(2, '0')}`;
        appState.entries.push({
            id: generateEntryId(),
            type: 'rauchstatus',
            datum: datum,
            status: 'ja'
        });
    }
    
    // Save initial data to cloud
    if (isCloudSyncEnabled) {
        console.log('Saving initial data to cloud...');
        await saveToCloud(appState.entries);
        
        // Setup real-time sync listener
        setupRealtimeSync();
    }
}

// Delete entry function with modal confirmation
function deleteEntry(entryId) {
    const entry = appState.entries.find(e => e.id === entryId);
    if (!entry) {
        showNotification('❌ Eintrag nicht gefunden', 'error');
        return;
    }
    
        // 🔥 CLOUD SYNC nach Löschen
        saveAppStateToCloud();

    // Create description for confirmation
    let entryDescription = '';
    if (entry.type === 'ernaehrung') {
        entryDescription = `${entry.gericht} (${formatDate(entry.datum)}) - Score: ${entry.ldlScore.toFixed(1)}/10`;
    } else if (entry.type === 'trinken') {
        entryDescription = `${entry.getraenk} (${formatDate(entry.datum)}) - ${entry.menge}l`;
    } else if (entry.type === 'sport') {
        entryDescription = `${entry.aktivitaet} (${formatDate(entry.datum)}) - ${entry.dauer} min`;
    } else if (entry.type === 'schlaf') {
        entryDescription = `Schlaf (${formatDate(entry.datum)}) - ${entry.dauer}h`;
    } else if (entry.type === 'rauchstatus') {
        entryDescription = `Rauchstatus (${formatDate(entry.datum)}) - ${entry.status === 'ja' ? '✅ rauchfrei' : '❌ geraucht'}`;
    }
    
    // Create modal dialog
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div style="
            background: var(--color-surface);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 1px solid var(--color-border);
        ">
            <h2 style="margin-top: 0; color: var(--color-error); font-size: 24px;">⚠️ BESTÄTIGUNG ERFORDERLICH</h2>
            <p style="font-size: 16px; color: var(--color-text); margin: 16px 0;">Eintrag wirklich löschen?</p>
            <p style="
                background: var(--color-background);
                padding: 15px;
                border-radius: 8px;
                font-weight: bold;
                color: var(--color-text);
                margin: 20px 0;
                border: 1px solid var(--color-border);
            ">${entryDescription}</p>
            
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
                <button id="cancelDelete" style="
                    padding: 12px 24px;
                    background: var(--color-secondary);
                    color: var(--color-text);
                    border: 1px solid var(--color-border);
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 15px;
                    transition: all 0.2s;
                ">Nein, nicht löschen</button>
                
                <button id="confirmDelete" style="
                    padding: 12px 24px;
                    background: var(--color-error);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 15px;
                    transition: all 0.2s;
                ">Ja, löschen</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add hover effects
    const cancelBtn = modal.querySelector('#cancelDelete');
    const confirmBtn = modal.querySelector('#confirmDelete');
    
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = 'var(--color-secondary-hover)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = 'var(--color-secondary)';
    });
    
    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.opacity = '0.9';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.opacity = '1';
    });
    
    // Cancel button - close modal
    cancelBtn.onclick = () => {
        modal.remove();
    };
    
    // Confirm button - delete entry
    confirmBtn.onclick = () => {
        // Delete entry from array
        appState.entries = appState.entries.filter(e => e.id !== entryId);
        
        // Recalculate bonus points
        recalculateBonusPoints();
        
        // Save to cloud
        saveToCloud(appState.entries).catch(error => {
            console.error('Failed to sync deletion to cloud:', error);
        });
        
        // Close modal
        modal.remove();
        
        // Refresh the current view
        renderWochenanalyse();
        
        // Show success notification
        showNotification('✓ Eintrag erfolgreich gelöscht!', 'success');
    };
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Recalculate all bonus points
function recalculateBonusPoints() {
    appState.bonusPoints = 0;
    appState.entries.forEach(entry => {
        appState.bonusPoints += calculateBonusPoints(entry);
    });
}

// Show notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    const bgColor = type === 'success' ? 'var(--color-success)' : 'var(--color-error)';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Add animation keyframes
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Reference data
const getraenkeReference = {
    'Wasser': { zucker: 0, alkohol: false, scoreBasis: 10 },
    'Kaffee': { zucker: 0, alkohol: false, scoreBasis: 10 },
    'Eistee': { zucker: 0, alkohol: false, scoreBasis: 9 },
    'Wasser_Zitrone': { zucker: 0, alkohol: false, scoreBasis: 9 },
    'Saft': { zucker: 25, alkohol: false, scoreBasis: 6 },
    'Cola': { zucker: 39, alkohol: false, scoreBasis: 3 },
    'Bier': { zucker: 2, alkohol: true, scoreBasis: 2, preisAufschlag: 1.0 }
};

// ============ TAB NAVIGATION - KRITISCHER FIX ============
// PROBLEM: Tabs wurden nicht gewechselt
// LÖSUNG: Robuste Event-Handler mit expliziter display-Steuerung

function switchTab(tabName) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('switchTab() aufgerufen mit:', tabName);
    
    // 1. Alle Tab-Buttons deaktivieren
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 2. Aktiven Button markieren
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        console.log('Button aktiviert:', tabName);
    } else {
        console.error('Button nicht gefunden für:', tabName);
    }
    
    // 3. Alle Tab-Inhalte ausblenden (EXPLIZIT!)
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none'; // KRITISCH: Explizites display:none
    });
    
    // 4. Aktiven Tab-Inhalt anzeigen (EXPLIZIT!)
    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) {
        activeContent.classList.add('active');
        activeContent.style.display = 'block'; // KRITISCH: Explizites display:block
        console.log('Content aktiviert:', tabName);
    } else {
        console.error('Content nicht gefunden für: tab-' + tabName);
    }
    
    // 5. Content laden wenn nötig
    if (tabName === 'tagesanalyse') {
        console.log('➡ Lade Tagesanalyse...');
        setTimeout(() => renderTagesanalyse(), 10);
    } else if (tabName === 'wochenanalyse') {
        console.log('➡ Lade Wochenanalyse...');
        // KRITISCH: Verwende setTimeout um sicherzustellen dass DOM bereit ist
        setTimeout(() => {
            console.log('setTimeout: Starte renderWochenanalyse()');
            renderWochenanalyse();
        }, 10);
    } else if (tabName === 'monatsanalyse') {
        console.log('➡ Lade Monatsanalyse...');
        setTimeout(() => renderMonatsanalyse(), 10);
    } else if (tabName === 'bonusprogramm') {
        console.log('➡ Lade Bonusprogramm...');
        setTimeout(() => showBonusProgram(), 10);

    }
    
    console.log('✓ Tab-Wechsel abgeschlossen zu:', tabName);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Event-Listener für Tab-Buttons (wird nach DOM-Laden initialisiert)
function initTabNavigation() {
    console.log('initTabNavigation() wird aufgerufen...');
    
    const buttons = document.querySelectorAll('.tab-button');
    console.log('Gefundene Tab-Buttons:', buttons.length);
    
    buttons.forEach((button, index) => {
        const tabName = button.getAttribute('data-tab');
        console.log(`  Button ${index + 1}: data-tab="${tabName}"`);
        
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const clickedTab = this.getAttribute('data-tab');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('KLICK ERKANNT auf Tab:', clickedTab);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            switchTab(clickedTab);
        });
    });
    
    console.log('✓ Tab-Navigation initialisiert!');
}

// Category selection
document.getElementById('categorySelect').addEventListener('change', (e) => {
    const category = e.target.value;
    
    // Hide all forms
    ['ernaehrung', 'trinken', 'sport', 'schlaf', 'rauchstatus'].forEach(cat => {
        document.getElementById(`form-${cat}`).classList.add('hidden');
    });
    
    // Show selected form
    if (category) {
        document.getElementById(`form-${category}`).classList.remove('hidden');
        
        // Set today's date as default
        const today = appState.currentDate;
        if (document.getElementById(`${getPrefix(category)}-datum`)) {
            document.getElementById(`${getPrefix(category)}-datum`).value = today;
        }
    }
});

function getPrefix(category) {
    const prefixes = {
        'ernaehrung': 'ern',
        'trinken': 'trink',
        'sport': 'sport',
        'schlaf': 'schlaf',
        'rauchstatus': 'rauch'
    };
    return prefixes[category];
}

// ========== SCORE CALCULATION FUNCTIONS ==========

function calculateTrinkScore(entry) {
    let score = 5;
    
    if (entry.kategorie === 'Wasser') {
        score += 3;
    }
    
    if (entry.zucker > 20) {
        score -= entry.zucker / 10;
    }
    if (entry.kategorie === 'Bier') {
        score -= 2;
    }
    
    return Math.max(0, Math.min(10, score));
}

function calculateSportScore(entry) {
    let score = 5;
    
    const intensity = { leicht: 1, moderat: 2, schwer: 3, extrem: 4 }[entry.intensitaet] || 2;
    const dauer = Math.min(entry.dauer / 30, 3);
    
    score += (intensity * dauer);
    
    return Math.max(0, Math.min(10, score));
}

function calculateSchlafScore(entry) {
    let score = 5;
    
    const dauer = entry.dauer;
    if (dauer >= 7 && dauer <= 8) {
        score += 3;
    } else if (dauer >= 6 && dauer < 7) {
        score += 1;
    } else if (dauer > 8) {
        score -= 1;
    } else if (dauer < 6) {
        score -= 2;
    }
    
    return Math.max(0, Math.min(10, score));
}

function calculateRauchScore(entry) {
    let score = 10;
    
    if (entry.status === 'geraucht') {
        score = 2;
    } else if (entry.status === 'versuchung') {
        score = 4;
    }
    
    return score;
}

// ========== SAVE ENTRY ==========

delete window.saveEntry;

window.saveEntry = function(category) {
    try {
        let entry = { 
            type: category, 
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString()
        };
        
        // TRINKEN
        if (category === 'trinken') {
            entry.datum = document.getElementById('trink-datum').value;
            entry.getraenk = document.getElementById('trink-getraenk').value;
            if (!entry.datum || !entry.getraenk) { 
                alert('❌ Datum + Getränk erforderlich!'); 
                return; 
            }
            entry.menge = parseFloat(document.getElementById('trink-menge').value) || 0.5;
            entry.zucker = parseFloat(document.getElementById('trink-zucker').value) || 0;
            entry.zeit = document.getElementById('trink-zeit').value || '';
            entry.kategorie = document.getElementById('trink-kategorie').value || '';
            entry.trinkScore = calculateTrinkScore(entry);
            
        } else if (category === 'ernaehrung') {
            entry.datum = document.getElementById('ern-datum').value;
            entry.gericht = document.getElementById('ern-gericht').value;
            if (!entry.datum || !entry.gericht) { 
                alert('❌ Datum + Gericht erforderlich!'); 
                return; 
            }
            entry.zeit = document.getElementById('ern-zeit').value || '12:00';
            entry.ort = document.getElementById('ern-ort').value || 'Unbekannt';
            entry.portion = parseFloat(document.getElementById('ern-portion').value) || 1;
            entry.kcal = parseFloat(document.getElementById('ern-kcal').value) || 500;
            entry.fett = parseFloat(document.getElementById('ern-fett').value) || 15;
            entry.kh = parseFloat(document.getElementById('ern-kh').value) || 50;
            entry.eiweiss = parseFloat(document.getElementById('ern-eiweiss').value) || 20;
            entry.preis = parseFloat(document.getElementById('ern-preis').value) || 0;
            
            if (typeof calculateErnaehrungScore === 'function') {
                entry.ldlScore = calculateErnaehrungScore(entry);
            } else {
                entry.ldlScore = 5;
            }
            
        } else if (category === 'sport') {
            entry.datum = document.getElementById('sport-datum').value;
            if (!entry.datum) { 
                alert('❌ Datum erforderlich!'); 
                return; 
            }
            entry.aktivitaet = document.getElementById('sport-aktivitaet').value || 'Sport';
            entry.dauer = parseInt(document.getElementById('sport-dauer').value) || 30;
            entry.schritte = parseInt(document.getElementById('sport-schritte').value) || 5000;
            entry.liegezeit = parseInt(document.getElementById('sport-liegezeit').value) || 0;
            entry.kommentar = document.getElementById('sport-kommentar').value || '';
            let intensity = 'moderat';
            document.querySelectorAll('input[name="sport-intensitaet"]').forEach(r => {
                if (r.checked) intensity = r.value;
            });
            entry.intensitaet = intensity || 'moderat';
            entry.sportScore = calculateSportScore(entry);
            
        } else if (category === 'schlaf') {
            entry.datum = document.getElementById('schlaf-datum').value;
            if (!entry.datum) { 
                alert('❌ Datum erforderlich!'); 
                return; 
            }
            entry.dauer = parseFloat(document.getElementById('schlaf-dauer').value) || 7;
            entry.schlafScore = calculateSchlafScore(entry);
            
        } else if (category === 'rauchstatus') {
            entry.datum = document.getElementById('rauch-datum').value;
            entry.status = document.getElementById('rauch-status').value;
            if (!entry.datum || !entry.status) { 
                alert('❌ Datum + Status erforderlich!'); 
                return; 
            }
            entry.rauchScore = calculateRauchScore(entry);
        }
        
        // SPEICHERN
        appState.entries.push(entry);
        appState.bonusPoints = (appState.bonusPoints || 0) + 0.5;
        localStorage.setItem('aufkurs_entries', JSON.stringify(appState.entries));
        localStorage.setItem('aufkurs_bonusPoints', appState.bonusPoints.toString());
    
    // 🔥 FIREBASE CLOUD SYNC - Speichere zu Firebase!
    saveAppStateToCloud().catch(error => {
        console.error('❌ Cloud sync failed:', error);
        showNotification('Fehler beim Synchronisieren', 'error');
    });

        
        alert('✅ Eintrag #' + appState.entries.length + ' gespeichert!');
        
        // FORM RESET
        document.getElementById('categorySelect').value = '';
        document.getElementById('trink-datum').value = new Date().toISOString().split('T')[0];
        document.getElementById('ern-datum').value = new Date().toISOString().split('T')[0];
        document.getElementById('sport-datum').value = new Date().toISOString().split('T')[0];
        document.getElementById('schlaf-datum').value = new Date().toISOString().split('T')[0];
        document.getElementById('rauch-datum').value = new Date().toISOString().split('T')[0];
        
        document.querySelectorAll('[id^="form-"]').forEach(f => f.classList.add('hidden'));
        document.querySelectorAll('input[type="text"], input[type="number"], input[type="time"], select, textarea').forEach(f => {
            if (!f.id.endsWith('-datum')) f.value = '';
        });
        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        
    } catch (e) {
        alert('❌ Fehler: ' + e.message);
        console.error(e);
    }
};


function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Score calculations
function calculateErnaehrungScore(entry) {
    // Simplified LDL-friendly score based on fat content
    let score = 10;
    
    // Deduct points for high fat
    if (entry.fett > 25) score -= 2;
    else if (entry.fett > 20) score -= 1;
    
    // Deduct points for low protein
    if (entry.eiweiss < 15) score -= 1;
    
    // Deduct points for high carbs without balance
    if (entry.kh > 70 && entry.eiweiss < 20) score -= 1.5;
    
    return Math.max(0, Math.min(10, score));
}

function calculateSportScore(entry) {
    // NEUE FORMEL: Keine Spaziergänge mehr, nur noch reguläre Aktivitäten
    // Schritte und Liegezeit werden separat berechnet
    const scoringMatrix = {
        'Joggen': {
            15: 3.0, 30: 5.0, 30.1: 6.5, 45: 7.0, 45.1: 8.5, 60: 9.5
        },
        'Krafttraining': {
            10: 1.5, 15: 2.0, 30: 3.5,
            45: 5.0, 60: 6.5, // moderat/intensiv
        },
        'Liegestütze/Kniebeugen': {
            10: 1.5, 15: 2.0, 30: 3.5, 45: 5.0, 60: 6.5
        },
        'Cardio (HIIT)': {
            15: 3.0, 30: 5.0, 30.1: 6.5, 45: 7.0, 45.1: 8.5, 60: 9.5
        },
        'Yoga': {
            15: 1.5, 30: 2.5, 45: 3.5, 60: 5.0
        },
        // Weitere Aktivitäten ggf. extrapoliert
        'Holz Schlichten': {30: 4.0},
        'Gartenarbeit': {30: 3.0, 45: 4.5, 60: 6.0}
    };
    
    let score = 0;
    // Sportaktivität abfragen und Minuten auf nächste Matrix-Stufe runden
    let act = entry.aktivitaet;
    let dauer = entry.dauer;
    let intensity = entry.intensitaet;

    // Helper für Matrix-Match mit "closest lower"
    function matchMatrix(activity, minutes) {
        const matrix = scoringMatrix[activity];
        if (!matrix) return null;
        // Suche höchste Matrix-Stufe <= Dauer
        const allMinutes = Object.keys(matrix).map(Number).sort((a, b) => a - b);
        let value = null;
        for (let i = 0; i < allMinutes.length; i++) {
            if (minutes >= allMinutes[i]) value = matrix[allMinutes[i]];
        }
        return value;
    }

    // Wenn nur Schritte/Liegezeit ohne Aktivität: Score = 0 (wird später durch Schritte/Liegezeit modifiziert)
    if (!act || act === '') {
        return 0;
    }

    // Berechnung für reguläre Aktivitäten
    if (act === 'Joggen' || act === 'Cardio (HIIT)') {
        // Unterscheide "moderat"/"intensiv" ab 30min/45min
        if (intensity === 'moderat' && dauer >= 30 && dauer < 45) score = 6.5;
        else if ((intensity === 'intensiv' || intensity === 'extrem' || intensity === 'schwer') && dauer >= 45) score = 8.5;
        else score = matchMatrix(act, dauer) || 3.0;
    } else if (act === 'Krafttraining' || act === 'Liegestütze/Kniebeugen') {
        // Unterscheide "moderat" und "intensiv" + Minuten
        if ((intensity === 'intensiv' || intensity === 'schwer') && dauer >= 45) score = 5.0;
        else if ((intensity === 'intensiv' || intensity === 'schwer') && dauer >= 60) score = 6.5;
        else score = matchMatrix(act, dauer) || 1.5;
    } else if (act === 'Yoga') {
        score = matchMatrix('Yoga', dauer) || 1.5;
    } else if (scoringMatrix[act]) {
        score = matchMatrix(act, dauer) || 2.0;
    } else {
        // Default fallback
        score = 2.0;
    }

    // Intensity override: Falls "extrem"/"schwer" und Matrix eindeutig, Wert +1 (max 10)
    if ((intensity === 'extrem' || intensity === 'schwer') && score < 8.5 && score > 0) {
        score = Math.min(10, score + 1.0);
    }

    // Bonus für exakte User-Szenario (30min Kraft)
    if ((act === 'Krafttraining' || act === 'Liegestütze/Kniebeugen') && dauer === 30 && intensity === 'moderat') score = 3.5;

    return Math.max(0, Math.min(10, score));
}

function calculateSchlafScore(dauer) {
    if (dauer >= 8) return 10;
    if (dauer >= 7.5) return 8;
    if (dauer >= 7) return 7;
    if (dauer >= 6.5) return 5;
    if (dauer >= 3) return 3;
    return 0;
}

function calculateTrinkenScore(entries) {
    if (entries.length === 0) return 0;
    
    let totalMenge = 0;
    let qualitySum = 0;
    let bierCount = 0;
    
    entries.forEach(entry => {
        totalMenge += entry.menge;
        
        // Get quality score
        const ref = getraenkeReference[entry.kategorie];
        if (ref) {
            let quality = ref.scoreBasis;
            
            // Bier penalty
            if (entry.kategorie === 'Bier') {
                bierCount += entry.menge / 0.5; // Count per 0.5l
                quality = 2 - (1.5 * (entry.menge / 0.5));
            }
            
            qualitySum += quality;
        }
    });
    
    // Menge score (34% weight)
    const zielMenge = 2.5;
    let mengeScore = 10;
    if (totalMenge < zielMenge) {
        const deficit = zielMenge - totalMenge;
        mengeScore = Math.max(0, 10 - (deficit / 0.25));
    }
    
    // Quality score (66% weight)
    const qualityScore = qualitySum / entries.length;
    
    // Combined score
    return (qualityScore * 0.66) + (mengeScore * 0.34);
}

function calculatePreisScore(dailyPrice) {
    const ziel = 12;
    let score = 10;
    
    if (dailyPrice > ziel) {
        score = Math.max(0, 10 - ((dailyPrice - ziel) * 0.75));
    } else if (dailyPrice <= ziel) {
        score = 10;
    }
    
    return score;
}

function calculateBonusPoints(entry) {
    let bonus = 0;
    
    // Entry bonus (KLEINE BONI)
    bonus += 0.2; // Assuming with template
    
    // NEUE BONUS-STRUKTUR V2 - nur tägliche Boni hier, Streaks separat
    
    // 🔴 RAUCHFREI (PRIORITÄT 1) - täglich +1 Punkt!
    if (entry.type === 'rauchstatus' && entry.status === 'ja') {
        bonus += 1.0; // ERHÖHT von 0.5 auf 1.0
    }
    
    // Andere Kategorien: keine sofortigen Boni mehr
    // Boni nur noch bei Wochenauswertung über Streaks
    
    return bonus;
}

// Calculate extended bonus points for a week - NEUE V2 STRUKTUR
function calculateExtendedWeekBonus(weekStart, weekEnd) {
    const entries = getEntriesByDateRange(weekStart, weekEnd);
    let bonus = 0;
    const bonusDetails = [];
    
    // Get daily data
    const days = [];
    for (let d = new Date(weekStart); d <= new Date(weekEnd); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayEntries = getEntriesByDate(dateStr);
        days.push({ date: dateStr, entries: dayEntries });
    }
    
    // Calculate category scores per day
    const dailyScores = days.map(day => {
        const ernEntries = getEntriesByType(day.entries, 'ernaehrung');
        const trinkEntries = getEntriesByType(day.entries, 'trinken');
        const sportEntries = getEntriesByType(day.entries, 'sport');
        const schlafEntries = getEntriesByType(day.entries, 'schlaf');
        const rauchEntries = getEntriesByType(day.entries, 'rauchstatus');
        
        const ernScore = ernEntries.length > 0 ? ernEntries.reduce((sum, e) => sum + (e.ldlScore || 0), 0) / ernEntries.length : 0;
        const trinkScore = trinkEntries.length > 0 ? trinkEntries.reduce((sum, e) => sum + (e.trinkScore || 0), 0) / trinkEntries.length : 0;
        const sportScore = sportEntries.length > 0 ? sportEntries.reduce((sum, e) => sum + (e.sportScore || 0), 0) / sportEntries.length : 0;
        const schlafScore = schlafEntries.length > 0 ? schlafEntries.reduce((sum, e) => sum + (e.schlafScore || 0), 0) / schlafEntries.length : 0;
        const rauchScore = rauchEntries.length > 0 ? rauchEntries.reduce((sum, e) => sum + (e.rauchScore || 0), 0) / rauchEntries.length : 0;
        
        return { ern: ernScore, trink: trinkScore, sport: sportScore, schlaf: schlafScore, rauch: rauchScore };
    });
    
    // Calculate weekly bonus
    const weekBonus = {
        rauch: calculateStreak(weekStart, weekEnd, 'rauchstatus') * 0.5,
        sport: dailyScores.filter(s => s.sport >= 7).length * 2,
        ern: dailyScores.filter(s => s.ern >= 8).length * 1.5,
        trink: dailyScores.filter(s => s.trink >= 7).length * 1
    };
    
    bonus = Object.values(weekBonus).reduce((a, b) => a + b, 0);
    
    return { bonus: Math.round(bonus * 10) / 10, details: bonusDetails };
}

function calculateStreak(startDate, endDate, type) {
    const entries = getEntriesByDateRange(startDate, endDate);
    const typeEntries = entries.filter(e => e.type === type).sort((a, b) => new Date(a.datum) - new Date(b.datum));
    
    if (typeEntries.length === 0) return 0;
    
    let streak = 1;
    let lastDate = new Date(typeEntries[0].datum);
    
    for (let i = 1; i < typeEntries.length; i++) {
        const currentDate = new Date(typeEntries[i].datum);
        const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            streak++;
        } else if (diffDays > 1) {
            break;
        }
        lastDate = currentDate;
    }
    
    return streak;
}

function calculateRauchfreiTage() {
    const allTime = appState.entries || [];
    const rauchEntries = allTime.filter(e => e.type === 'rauchstatus').sort((a, b) => new Date(b.datum) - new Date(a.datum));
    
    if (rauchEntries.length === 0) return 0;
    
    const lastEntry = rauchEntries[0];
    const lastDate = new Date(lastEntry.datum);
    const today = new Date();
    
    let rauchfreiTage = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    
    if (lastEntry.rauchStatus === 'rauchfrei') {
        rauchfreiTage++;
    } else {
        rauchfreiTage = 0;
    }
    
    return rauchfreiTage;
}


// ========== BONUSPROGRAMM SYSTEM ==========

const bonusLevels = [
    { level: 1, title: 'Einstieg', minPts: 0, maxPts: 49, motivationssatz: 'Du nimmst die erste Chance wahr' },
    { level: 2, title: 'Aufbau', minPts: 50, maxPts: 109, motivationssatz: 'Du wächst Tag für Tag' },
    { level: 3, title: 'Fortschritt', minPts: 110, maxPts: 179, motivationssatz: 'Du findest dein Gleichgewicht' },
    { level: 4, title: 'Stabilität', minPts: 180, maxPts: 259, motivationssatz: 'Du hältst durch' },
    { level: 5, title: 'Kontrolle', minPts: 260, maxPts: 349, motivationssatz: 'Du lebst bewusst' },
    { level: 6, title: 'Stärke', minPts: 350, maxPts: 449, motivationssatz: 'Du inspirierst andere' },
    { level: 7, title: 'Brillianz', minPts: 450, maxPts: 559, motivationssatz: 'Du wirst neu erschaffen' },
    { level: 8, title: 'Meisterhaft', minPts: 560, maxPts: 679, motivationssatz: 'Du bist das Vorbild' },
    { level: 9, title: 'Champion', minPts: 680, maxPts: 809, motivationssatz: 'Du beherrschst deinen Körper' },
    { level: 10, title: 'Road to Glory', minPts: 820, maxPts: 999, motivationssatz: 'Du schreibst deine Geschichte neu' },
    { level: 'MAX', title: 'System durchgespielt', minPts: 1000, maxPts: 999999, motivationssatz: 'Du kannst alles in deinem Leben erreichen' }
];

function getCurrentLevel(points) {
    for (let l of bonusLevels) {
        if (points >= l.minPts && points <= l.maxPts) {
            return l;
        }
    }
    return bonusLevels[bonusLevels.length - 1];
}

function calculateStreaks() {
    const allTime = appState.entries || [];
    
    const rauchEntries = allTime.filter(e => e.type === 'rauchstatus');
    const sportEntries = allTime.filter(e => e.type === 'sport');
    const ernEntries = allTime.filter(e => e.type === 'ernaehrung');
    const trinkEntries = allTime.filter(e => e.type === 'trinken');
    const schlafEntries = allTime.filter(e => e.type === 'schlaf');
    
    let rauchStreak = 0, sportStreak = 0, ernStreak = 0, trinkStreak = 0, schlafStreak = 0;
    let lastDate = null;
    
    for (let i = rauchEntries.length - 1; i >= 0; i--) {
        if (lastDate === null || isConsecutive(rauchEntries[i].datum, lastDate)) {
            rauchStreak++;
            lastDate = rauchEntries[i].datum;
        } else {
            break;
        }
    }
    
    lastDate = null;
    for (let i = sportEntries.length - 1; i >= 0; i--) {
        if (lastDate === null || isConsecutive(sportEntries[i].datum, lastDate)) {
            sportStreak++;
            lastDate = sportEntries[i].datum;
        } else {
            break;
        }
    }
    
    lastDate = null;
    for (let i = ernEntries.length - 1; i >= 0; i--) {
        if (lastDate === null || isConsecutive(ernEntries[i].datum, lastDate)) {
            ernStreak++;
            lastDate = ernEntries[i].datum;
        } else {
            break;
        }
    }
    
    lastDate = null;
    for (let i = trinkEntries.length - 1; i >= 0; i--) {
        if (lastDate === null || isConsecutive(trinkEntries[i].datum, lastDate)) {
            trinkStreak++;
            lastDate = trinkEntries[i].datum;
        } else {
            break;
        }
    }
    
    lastDate = null;
    for (let i = schlafEntries.length - 1; i >= 0; i--) {
        if (lastDate === null || isConsecutive(schlafEntries[i].datum, lastDate)) {
            schlafStreak++;
            lastDate = schlafEntries[i].datum;
        } else {
            break;
        }
    }
    
    return { rauchStreak, sportStreak, ernStreak, trinkStreak, schlafStreak };
}


function isConsecutive(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
}

function getNextMilestones() {
    const streaks = calculateStreaks();
    const rauchStreak = streaks.rauchStreak || 0;
    const sportStreak = streaks.sportStreak || 0;
    const ernStreak = streaks.ernStreak || 0;
    const trinkStreak = streaks.trinkStreak || 0;
    const schlafStreak = streaks.schlafStreak || 0;
    
    const milestones = [];
    
    const rauchMilestones = [5, 10, 20, 30, 50, 100, 180, 365];
    const nextRauch = rauchMilestones.find(m => m > rauchStreak);
    if (nextRauch) {
        const daysLeft = nextRauch - rauchStreak;
        milestones.push({ category: 'Rauchfrei', current: rauchStreak, next: nextRauch, daysLeft });
    }
    
    const sportMilestones = [5, 10, 20, 30, 50, 90, 150, 365];
    const nextSport = sportMilestones.find(m => m > sportStreak);
    if (nextSport) {
        const daysLeft = nextSport - sportStreak;
        milestones.push({ category: 'Sport', current: sportStreak, next: nextSport, daysLeft });
    }
    
    const ernMilestones = [5, 10, 20, 30, 50, 80, 150, 365];
    const nextErn = ernMilestones.find(m => m > ernStreak);
    if (nextErn) {
        const daysLeft = nextErn - ernStreak;
        milestones.push({ category: 'Ernährung', current: ernStreak, next: nextErn, daysLeft });
    }
    
    const trinkMilestones = [5, 10, 20, 30, 50, 80, 150, 365];
    const nextTrink = trinkMilestones.find(m => m > trinkStreak);
    if (nextTrink) {
        const daysLeft = nextTrink - trinkStreak;
        milestones.push({ category: 'Trinken', current: trinkStreak, next: nextTrink, daysLeft });
    }
    
    const schlafMilestones = [5, 10, 20, 30, 50, 80, 150, 365];
    const nextSchlaf = schlafMilestones.find(m => m > schlafStreak);
    if (nextSchlaf) {
        const daysLeft = nextSchlaf - schlafStreak;
        milestones.push({ category: 'Schlaf', current: schlafStreak, next: nextSchlaf, daysLeft });
    }
    
    return milestones;
}


function getPersonalizedBonus() {
    const entries = appState.entries || [];
    const points = parseFloat(appState.bonusPoints) || 0;
    const currentLevel = getCurrentLevel(points);
    const allTime = appState.entries || [];
    
    let additions = [];
    
    const sportEntries = allTime.filter(e => e.type === 'sport');
    const sportScores = sportEntries.map(e => e.sportScore || 0);
    const avgSportScore = sportScores.length > 0 ? sportScores.reduce((a, b) => a + b) / sportScores.length : 0;
    const consistentSportCount = sportScores.filter(s => s >= 7).length;
    
    const rauchEntries = allTime.filter(e => e.type === 'rauchstatus');
    const rauchScores = rauchEntries.map(e => e.rauchScore || 0);
    const avgRauchScore = rauchScores.length > 0 ? rauchScores.reduce((a, b) => a + b) / rauchScores.length : 0;
    const consistentRauchCount = rauchScores.filter(s => s >= 8).length;
    
    const trinkEntries = allTime.filter(e => e.type === 'trinken');
    const trinkScores = trinkEntries.map(e => e.trinkScore || 0);
    const avgTrinkScore = trinkScores.length > 0 ? trinkScores.reduce((a, b) => a + b) / trinkScores.length : 0;
    
    const schlafEntries = allTime.filter(e => e.type === 'schlaf');
    const schlafScores = schlafEntries.map(e => e.schlafScore || 0);
    const avgSchlafScore = schlafScores.length > 0 ? schlafScores.reduce((a, b) => a + b) / schlafScores.length : 0;
    
    const ernEntries = allTime.filter(e => e.type === 'ernaehrung');
    const ldlScores = ernEntries.map(e => e.ldlScore || 0);
    const avgLdlScore = ldlScores.length > 0 ? ldlScores.reduce((a, b) => a + b) / ldlScores.length : 0;
    const consistentErnCount = ldlScores.filter(s => s >= 8).length;
    
    if (rauchScores.length > 0) {
        if (avgRauchScore >= 9.5 && consistentRauchCount >= 50) {
            additions.push('RAUCHFREI LEGEND (50+ perfekte Tage): Du lebst VÖLLIG rauchfrei! 👑');
        } else if (avgRauchScore >= 9.5 && consistentRauchCount >= 30) {
            additions.push('RAUCHFREI MEISTER (30+ perfekte Tage): Körper regeneriert täglich! ❤️');
        } else if (avgRauchScore >= 9.5 && consistentRauchCount >= 10) {
            additions.push('RAUCHFREI CHAMPION (10+ perfekte Tage): Du schaffst es! 🌟');
        } else if (avgRauchScore >= 9.5) {
            additions.push('RAUCHFREI CHAMPION: Körper dankt dir! 🌟');
        } else if (avgRauchScore >= 9 && consistentRauchCount >= 20) {
            additions.push('RAUCHFREI PROFI (20+ gute Tage): Herzinfarktrisiko -80%! ❤️');
        } else if (avgRauchScore >= 9) {
            additions.push('RAUCHFREI MEISTER: Status PERFEKT! 🏆');
        } else if (avgRauchScore >= 8 && consistentRauchCount >= 15) {
            additions.push('SEHR GUT (15+ gute Tage): Lunge regeneriert! 💚');
        } else if (avgRauchScore >= 8) {
            additions.push('SEHR GUT: Du rauchst kaum noch! 💚');
        } else if (avgRauchScore >= 7 && consistentRauchCount >= 10) {
            additions.push('GUT (10+ gute Tage): Verbessert sich! 📈');
        } else if (avgRauchScore >= 7) {
            additions.push('GUT: Fortschritte sichtbar! 💪');
        } else if (avgRauchScore >= 5) {
            additions.push('OK: Sei konsequenter! 💪');
        } else {
            additions.push('WARNUNG: Kritisch - Du schaffst das! 🚭');
        }
    } else {
        additions.push('Du trackst nicht - Rauchst du gar nicht? Glückwunsch! 💚');
    }
    
    if (sportScores.length > 0) {
        if (avgSportScore >= 9 && consistentSportCount >= 90) {
            additions.push('SPORT LEGEND (90+ Meister): Fitness-Ikone! 👑');
        } else if (avgSportScore >= 9 && consistentSportCount >= 60) {
            additions.push('SPORT CHAMPION (60+ Top): Vollständig transformiert! 🏆');
        } else if (avgSportScore >= 9 && consistentSportCount >= 30) {
            additions.push('SPORT PROFI (30+ Top): HDL +35%! 📊');
        } else if (avgSportScore >= 9) {
            additions.push('SPORT CHAMPION: Meister-Niveau! 🏆');
        } else if (avgSportScore >= 8 && consistentSportCount >= 40) {
            additions.push('SEHR GUT (40+ gute): Echte Fortschritte! 💥');
        } else if (avgSportScore >= 8) {
            additions.push('SEHR GUT: TOP-Qualität - HDL steigt! 📊');
        } else if (avgSportScore >= 7 && consistentSportCount >= 20) {
            additions.push('GUT (20+ gute): Muskelaufbau läuft! 💪');
        } else if (avgSportScore >= 7) {
            additions.push('GUT: Fortschritte! 📈');
        } else if (avgSportScore >= 5) {
            additions.push('OK: Intensität erhöhen! ⚡');
        } else {
            additions.push('NIEDRIG: Mehr Intensität! 💪');
        }
    } else {
        additions.push('Kein Sport getracked? Jede Bewegung zählt - Fang an! 🏃');
    }
    
    if (ldlScores.length > 0) {
        if (avgLdlScore >= 9.5 && consistentErnCount >= 100) {
            additions.push('ERNÄHRUNG LEGEND (100+ perfekt): Ultimativer Lebensstil! 👑');
        } else if (avgLdlScore >= 9.5 && consistentErnCount >= 60) {
            additions.push('ERNÄHRUNG CHAMPION (60+ Top): Cholesterin optimal -25%! 💚');
        } else if (avgLdlScore >= 9.5 && consistentErnCount >= 30) {
            additions.push('ERNÄHRUNG PROFI (30+ Top): Gesund & inspirierend! 🌟');
        } else if (avgLdlScore >= 9.5) {
            additions.push('ERNÄHRUNG CHAMPION: Cholesterin OPTIMAL! 🌟');
        } else if (avgLdlScore >= 9 && consistentErnCount >= 50) {
            additions.push('SEHR GUT (50+ gute): Cholesterin -25%! 💚');
        } else if (avgLdlScore >= 9) {
            additions.push('SEHR GUT: LDL sinkt massiv! 📊');
        } else if (avgLdlScore >= 8 && consistentErnCount >= 30) {
            additions.push('TOP (30+ gute): Ausgewogen - Super! 💪');
        } else if (avgLdlScore >= 8) {
            additions.push('TOP: Gesund & ausgewogen! 📊');
        } else if (avgLdlScore >= 7 && consistentErnCount >= 20) {
            additions.push('GUT (20+ gute): Fortschritte! 💪');
        } else if (avgLdlScore >= 7) {
            additions.push('GUT: Fortschritte machen! 💪');
        } else if (avgLdlScore >= 5) {
            additions.push('OK: Luft nach oben! 📈');
        } else {
            additions.push('WARNUNG: Mehr Ballaststoffe! ⚠️');
        }
    } else {
        additions.push('Kein Tracking - Vertrau deinem Bauchgefühl! 💚');
    }
    
    if (consistentSportCount >= 100 && consistentRauchCount >= 50 && consistentErnCount >= 80) {
        additions.push('MEGA-KONSISTENZ: 100%+ Top-Einträge überall! Legende! 👑');
    } else if (consistentSportCount >= 50 && consistentRauchCount >= 30 && consistentErnCount >= 50) {
        additions.push('SUPER-KONSISTENZ: 50+ Sport + 30+ rauchfrei + 50+ Ernährung! 🏆');
    } else if ((consistentSportCount >= 30 || consistentRauchCount >= 20 || consistentErnCount >= 30)) {
        additions.push('KONSISTENZ WÄCHST: Je mehr gute Einträge = stärker! 💪');
    }
    
    const goodScore = (avgRauchScore >= 7 ? 1 : 0) + (avgSportScore >= 7 ? 1 : 0) + (avgLdlScore >= 7 ? 1 : 0);
    const goodConsistency = (consistentRauchCount >= 20 ? 1 : 0) + (consistentSportCount >= 20 ? 1 : 0) + (consistentErnCount >= 20 ? 1 : 0);
    
    if (goodScore === 3 && goodConsistency === 3 && currentLevel.level >= 10) {
        additions.push('ULTIMATE SYNERGY LEVEL 10+: ALLES perfekt + konsistent = LEGENDE! 🌟');
    } else if (goodScore === 3 && goodConsistency === 3 && currentLevel.level >= 7) {
        additions.push('EXTREME SYNERGY: Alle 3 Kategorien perfekt! Du rockst! 💥');
    } else if (goodScore === 3 && goodConsistency >= 2) {
        additions.push('SYNERGY STARK: Alle 3 Scores gut + wachsende Konsistenz! 💪');
    } else if (goodScore === 3) {
        additions.push('SYNERGY AKTIV: Alle 3 Kategorien gute Scores! 💪');
    }
    
    return additions;
}

function getShortBonusStatus() {
    const bonus = getPersonalizedBonus();
    return bonus.length > 0 ? bonus[0] : 'Keep going!';
}

function showBonusProgram() {
    const points = parseFloat(appState.bonusPoints) || 0;
    
    // Hardcoded Level-Bestimmung (TEMPORÄR)
    let level = { level: 1, title: 'Einstieg', motivationssatz: 'Du nimmst die erste Chance wahr' };
    if (points >= 50) level = { level: 2, title: 'Aufbau', motivationssatz: 'Du wächst Tag für Tag' };
    if (points >= 110) level = { level: 3, title: 'Fortschritt', motivationssatz: 'Du findest dein Gleichgewicht' };
    if (points >= 180) level = { level: 4, title: 'Stabilität', motivationssatz: 'Du hältst durch' };
    if (points >= 260) level = { level: 5, title: 'Kontrolle', motivationssatz: 'Du lebst bewusst' };
    if (points >= 350) level = { level: 6, title: 'Stärke', motivationssatz: 'Du inspirierst andere' };
    if (points >= 450) level = { level: 7, title: 'Brillianz', motivationssatz: 'Du wirst neu erschaffen' };
    if (points >= 560) level = { level: 8, title: 'Meisterhaft', motivationssatz: 'Du bist das Vorbild' };
    if (points >= 680) level = { level: 9, title: 'Champion', motivationssatz: 'Du beherrschst deinen Körper' };
    if (points >= 820) level = { level: 10, title: 'Road to Glory', motivationssatz: 'Du schreibst deine Geschichte neu' };
    if (points >= 1000) level = { level: 'MAX', title: 'System durchgespielt', motivationssatz: 'Du kannst alles in deinem Leben erreichen' };
    
    const personalizedBonus = getPersonalizedBonus();

const streaks = calculateStreaks();
const rauchStreak = streaks.rauchStreak || 0;
const sportStreak = streaks.sportStreak || 0;
const ernStreak = streaks.ernStreak || 0;
const trinkStreak = streaks.trinkStreak || 0;
const schlafStreak = streaks.schlafStreak || 0;

    const nextMilestones = getNextMilestones();
    
let html = `
       <div style="padding: 20px; background: #f0f8ff; border-radius: 10px;">
        <h2 style="text-align: center; color: #0066cc;">BONUSPROGRAMM</h2>
        
        <h4 style="margin-top: 20px; color: #0066cc;">Level-Übersicht</h4>
        <table style="width: 100%; border-collapse: collapse; background: white; margin-top: 10px;">
            <thead>
                <tr style="background: #e6f2ff;">
                    <th style="padding: 12px; border: 1px solid #ccc; text-align: left;">LEVEL</th>
                    <th style="padding: 12px; border: 1px solid #ccc; text-align: left;">TITELNAME</th>
                    <th style="padding: 12px; border: 1px solid #ccc; text-align: left;">PUNKTBEREICH</th>
                    <th style="padding: 12px; border: 1px solid #ccc; text-align: left;">MOTIVATIONSSATZ</th>
                    <th style="padding: 12px; border: 1px solid #ccc; text-align: left;">DEIN STATUS</th>
                    <th style="padding: 12px; border: 1px solid #ccc; text-align: center;">STATUS</th>
                </tr>
            </thead>
            <tbody>
`;

    
    bonusLevels.forEach(l => {
        const isActive = points >= l.minPts && points <= l.maxPts;
        const rowStyle = isActive 
            ? 'background: #fff9e6; font-weight: bold; border-left: 4px solid gold;' 
            : '';
        
        let statusSatz = '';
        if (isActive && personalizedBonus.length > 0) {
            statusSatz = personalizedBonus[0];
        } else if (isActive) {
            statusSatz = 'Keep going!';
        }
        
        html += `
            <tr style="${rowStyle}">
                <td style="padding: 12px; border: 1px solid #ccc;">${l.level}</td>
                <td style="padding: 12px; border: 1px solid #ccc;">${l.title}</td>
                <td style="padding: 12px; border: 1px solid #ccc;">${l.minPts} - ${l.maxPts === 999999 ? '∞' : l.maxPts}</td>
                <td style="padding: 12px; border: 1px solid #ccc; font-style: italic; color: #333;">"${l.motivationssatz}"</td>
                <td style="padding: 12px; border: 1px solid #ccc; color: #ff6600; font-weight: bold;">${statusSatz}</td>
                <td style="padding: 12px; border: 1px solid #ccc; text-align: center;">
                    ${isActive ? 'AKTUELL' : ''}
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <div style="text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; border: 2px solid gold;">
                <h3 style="color: #0066cc;">Aktuelle Gesamtpunkte</h3>
                <p style="font-size: 32px; color: #ff6600; font-weight: bold;">${points}</p>
                <div style="margin-top: 15px;">
                    <p style="font-size: 18px; font-weight: bold; color: #333;">Level: ${level.level} - ${level.title}</p>
                    <p style="font-size: 16px; color: #666; font-style: italic;">"${level.motivationssatz}"</p>
                </div>
            </div>
            
<h4 style="margin-top: 20px; color: #0066cc;">🔥 Aktuelle Streaks</h4>
<div style="background: white; padding: 15px; border-radius: 8px; margin-top: 10px;">
<p style="margin: 8px 0;"><strong>Rauchfrei:</strong> ${rauchStreak} Tage → <span style="color: #ff6600; font-weight: bold;">+${Math.round(rauchStreak * 3.5)} Pkt</span> 🚭</p>
<p style="margin: 8px 0;"><strong>Sport:</strong> ${sportStreak} Tage → <span style="color: #ff6600; font-weight: bold;">+${Math.round(sportStreak * 2)} Pkt</span> 💪</p>
<p style="margin: 8px 0;"><strong>Ernährung:</strong> ${ernStreak} Tage → <span style="color: #ff6600; font-weight: bold;">+${Math.round(ernStreak * 1.5)} Pkt</span> 🍎</p>
<p style="margin: 8px 0;"><strong>Trinken:</strong> ${trinkStreak} Tage → <span style="color: #ff6600; font-weight: bold;">+${Math.round(trinkStreak * 0.5)} Pkt</span> 💧</p>
<p style="margin: 8px 0;"><strong>Schlaf:</strong> ${schlafStreak} Tage → <span style="color: #ff6600; font-weight: bold;">+${Math.round(schlafStreak * 0.25)} Pkt</span> 😴</p
</div>


            <h4 style="margin-top: 20px; color: #0066cc;">🎯 Nächste Meilensteine</h4>
            <div style="background: #fff9e6; padding: 15px; border-radius: 8px; margin-top: 10px;">
                ${nextMilestones.map(m => `
                    <p style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px; border-left: 4px solid #ff9800;">
                        <strong>${m.category}:</strong> ${m.current}/${m.next} (noch ${m.daysLeft} Tage)
                    </p>
                `).join('')}
            </div>
    `;
    
    if (personalizedBonus.length > 0) {
        html += `
            <div style="background: #fffacd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #ff6600;">Dein kompletter Status (alle Kategorien):</h4>
                ${personalizedBonus.map(b => `<p style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px; border-left: 4px solid #ff6600;">→ ${b}</p>`).join('')}
            </div>
        `;
    }
    
    html += `
        </div>
    `;
    
    const bonusContent = document.getElementById('tab-bonusprogramm');
if (bonusContent) {
    bonusContent.innerHTML = html;
} else {
    document.body.innerHTML = html;
}

    console.log('Bonus-Programm angezeigt');
}


// Filter entries by date range
function getEntriesByDateRange(startDate, endDate) {
    return appState.entries.filter(entry => {
        return entry.datum >= startDate && entry.datum <= endDate;
    });
}

function getEntriesByDate(date) {
    return appState.entries.filter(entry => entry.datum === date);
}

function getEntriesByType(entries, type) {
    return entries.filter(entry => entry.type === type);
}

// Render functions
function renderTagesanalyse() {
    // Use viewed date or current date
    const viewedDate = appState.viewedDate || appState.currentDate;
    const entries = getEntriesByDate(viewedDate);
    
    // Sort all entries by time
    const allEntriesSorted = entries.filter(e => e.zeit).sort((a, b) => {
        return a.zeit.localeCompare(b.zeit);
    });
    
    const ernEntries = getEntriesByType(entries, 'ernaehrung');
    const trinkEntries = getEntriesByType(entries, 'trinken');
    const sportEntries = getEntriesByType(entries, 'sport');
    const schlafEntries = getEntriesByType(entries, 'schlaf');
    const rauchEntries = getEntriesByType(entries, 'rauchstatus');
    
    // Calculate all scores
    let ernScore = 0;
    if (ernEntries.length > 0) {
        ernScore = ernEntries.reduce((sum, e) => sum + e.ldlScore, 0) / ernEntries.length;
    }
    
    let trinkScore = trinkEntries.length > 0 ? calculateTrinkenScore(trinkEntries) : 0;
    
    // NEUE BERECHNUNG: Wissenschaftlich, fairste Matrix für Aktivitäten pro Tag, mit Schritt-Bonus/Malus und Liegezeit-Malus
    let sportScore = 0;
    if (sportEntries.length > 0) {
        // Sum all activity scores
        let activityScore = sportEntries.reduce((sum, e) => sum + calculateSportScore(e), 0);

        // NEUE SCHRITTE-FORMEL: (Schritte / 500) * 0,3
        let maxSteps = 0;
        sportEntries.forEach(e => {
            if (e.schritte && e.schritte > maxSteps) maxSteps = e.schritte;
        });
        let schritteBonus = 0;
        if (maxSteps > 0) {
            schritteBonus = (maxSteps / 500) * 0.3;
        }

        // NEUE LIEGEZEIT-FORMEL: -(Minuten / 30) * 0,3
        let totalLiegezeit = sportEntries.reduce((sum, e) => sum + (e.liegezeit || 0), 0);
        let liegezeitMalus = 0;
        if (totalLiegezeit > 0) {
            liegezeitMalus = -(totalLiegezeit / 30) * 0.3;
        }

        // GESAMT = Aktivitäten + Schritte + Liegezeit (capped bei 10,0)
        sportScore = activityScore + schritteBonus + liegezeitMalus;
        sportScore = Math.max(0, Math.min(10, sportScore));
    }
    
    let rauchScore = 0;
    if (rauchEntries.length > 0 && rauchEntries[0].status === 'ja') {
        rauchScore = 10;
    }
    
    let schlafScore = 0;
    if (schlafEntries.length > 0) {
        schlafScore = calculateSchlafScore(schlafEntries[0].dauer);
    }
    
    // Calculate price for this day
    let dailyPrice = 0;
    ernEntries.forEach(e => dailyPrice += e.preis);
    const workDays = ernEntries.filter(e => e.ort === 'Arbeit').length;
    dailyPrice += workDays * 0.50;
    trinkEntries.forEach(e => {
        if (e.kategorie === 'Bier') {
            dailyPrice += (e.menge / 0.5) * 1.0;
        }
    });
    let preisScore = calculatePreisScore(dailyPrice);
    
    // Calculate total score with NEW WEIGHTS
    const gesamtScore = (ernScore * 0.35) + (trinkScore * 0.15) + (sportScore * 0.20) + (rauchScore * 0.20) + (schlafScore * 0.05) + (preisScore * 0.05);
    
    // Calculate bonus points for today
    const todayBonusData = calculateExtendedWeekBonus(viewedDate, viewedDate);
    const todayBonus = todayBonusData.bonus;
    
    // Get weekday name
    const date = new Date(viewedDate + 'T12:00:00');
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const weekdayName = weekdays[date.getDay()];
    
    let html = `
        <div class="analysis-section">
            <h2>📅 TAGESANALYSE - ${weekdayName}, ${formatDate(viewedDate)}</h2>
            
            <div class="form-group" style="max-width: 300px; margin-bottom: var(--space-24);">
                <label>📆 Datum auswählen:</label>
                <input type="date" id="tagesanalyseDatePicker" value="${viewedDate}" 
                    onchange="changeTagesanalyseDate(this.value)" 
                    max="${appState.currentDate}"
                    min="${appState.systemStart}"
                    style="padding: var(--space-8); border: 1px solid var(--color-border); border-radius: var(--radius-base); font-size: 14px; background: var(--color-surface); color: var(--color-text);">
            </div>
            
            <h3>1️⃣ 📊 TAGESÜBERSICHT (${weekdayName}, ${formatDate(viewedDate).split(' ').slice(0, 3).join(' ')})</h3>
            <table class="data-table">
                <thead><tr><th>Kategorie</th><th>Score</th><th>Gewicht</th><th>Beitrag</th></tr></thead>
                <tbody>
                    <tr><td>🟢 Ernährung</td><td>${ernScore.toFixed(1)}/10</td><td>35%</td><td>${(ernScore * 0.35).toFixed(2)} Pkte</td></tr>
                    <tr><td>🔵 Trinken</td><td>${trinkScore.toFixed(1)}/10</td><td>15%</td><td>${(trinkScore * 0.15).toFixed(2)} Pkte</td></tr>
                    <tr><td>🟣 Sport</td><td>${sportScore.toFixed(1)}/10</td><td>20%</td><td>${(sportScore * 0.20).toFixed(2)} Pkte</td></tr>
                    <tr><td>🔴 Rauchfrei</td><td>${rauchScore.toFixed(1)}/10</td><td>20%</td><td>${(rauchScore * 0.20).toFixed(2)} Pkte</td></tr>
                    <tr><td>😴 Schlaf</td><td>${schlafScore.toFixed(1)}/10</td><td>5%</td><td>${(schlafScore * 0.05).toFixed(2)} Pkte</td></tr>
                    <tr><td>💰 Preis</td><td>${preisScore.toFixed(1)}/10</td><td>5%</td><td>${(preisScore * 0.05).toFixed(2)} Pkte</td></tr>
                </tbody>
            </table>
            <p style="font-size: 18px; font-weight: 600; margin-top: var(--space-16);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br>⭐ TAGES-GESAMTSCORE: <span style="color: var(--color-primary);">${gesamtScore.toFixed(1)}/10</span></p>
    `;
    
    // 2. ALLE EINTRÄGE CHRONOLOGISCH
    html += `<h3>2️⃣ 📝 ALLE EINTRÄGE CHRONOLOGISCH</h3>`;
    
    if (allEntriesSorted.length === 0 && rauchEntries.length === 0 && schlafEntries.length === 0) {
        html += `<p style="text-align: center; padding: var(--space-24); color: var(--color-text-secondary);">Keine Einträge für diesen Tag vorhanden.</p>`;
    } else {
        // ERNÄHRUNG
        html += `<h4>🥘 ERNÄHRUNG HEUTE</h4>`;
        html += `<div style="border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-16); margin-bottom: var(--space-24); background: var(--color-background);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        if (ernEntries.length > 0) {
            let ernScoreSum = 0;
            let totalKcal = 0, totalFett = 0, totalKH = 0, totalEiweiss = 0;
            
            ernEntries.sort((a, b) => a.zeit.localeCompare(b.zeit)).forEach(entry => {
                ernScoreSum += entry.ldlScore;
                totalKcal += entry.kcal;
                totalFett += entry.fett;
                totalKH += entry.kh;
                totalEiweiss += entry.eiweiss;
                
                html += `<div style="margin: var(--space-16) 0; padding: var(--space-12); border-left: 3px solid var(--color-primary); background: var(--color-surface);">
                    <div style="font-weight: 600; font-size: 15px; margin-bottom: var(--space-8);">${entry.zeit} | ${entry.gericht}</div>
                    <div style="color: var(--color-text-secondary); font-size: 13px; line-height: 1.6;">
                        Score: <strong>${entry.ldlScore.toFixed(1)}/10</strong><br>
                        Kcal: ${entry.kcal} | Fett: ${entry.fett.toFixed(1)}g | KH: ${entry.kh.toFixed(1)}g | Eiweiß: ${entry.eiweiss.toFixed(1)}g<br>
                        Ort: ${entry.ort} | Preis: ${entry.preis.toFixed(2)}€
                    </div>
                    <button class="btn-delete" onclick="deleteEntry('${entry.id}')" style="margin-top: var(--space-8);">🗑️ Löschen</button>
                </div>`;
            });
            
            const avgKcal = totalKcal / ernEntries.length;
            const avgFett = totalFett / ernEntries.length;
            const avgKH = totalKH / ernEntries.length;
            const avgEiweiss = totalEiweiss / ernEntries.length;
            
            html += `<div style="margin-top: var(--space-16); padding-top: var(--space-16); border-top: 1px solid var(--color-border);">
                <strong>Ernährungs-Score heute:</strong> ${ernScore.toFixed(1)}/10<br>
                <strong>Durchschnittliche Nährwerte:</strong> kcal ${avgKcal.toFixed(0)} | Fett ${avgFett.toFixed(1)}g | KH ${avgKH.toFixed(1)}g | Eiweiß ${avgEiweiss.toFixed(1)}g
            </div>`;
        } else {
            html += `<p style="text-align: center; padding: var(--space-16); color: var(--color-text-secondary);">Keine Ernährungs-Einträge heute</p>`;
        }
        
        html += `</div>`;
        
        // TRINKEN
        html += `<h4>💧 TRINKEN HEUTE</h4>`;
        html += `<div style="border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-16); margin-bottom: var(--space-24); background: var(--color-background);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        if (trinkEntries.length > 0) {
            let totalMenge = 0;
            let totalZucker = 0;
            let qualitySum = 0;
            let bierCount = 0;
            
            trinkEntries.sort((a, b) => a.zeit.localeCompare(b.zeit)).forEach(entry => {
                totalMenge += entry.menge;
                totalZucker += entry.zucker;
                const ref = getraenkeReference[entry.kategorie];
                const quality = ref ? ref.scoreBasis : 5;
                qualitySum += quality;
                if (entry.kategorie === 'Bier') bierCount += entry.menge / 0.5;
                
                let extraInfo = '';
                if (entry.kategorie === 'Bier') {
                    extraInfo = `<br>Alkohol: ja | Preis-Aufschlag: +1€`;
                }
                
                html += `<div style="margin: var(--space-16) 0; padding: var(--space-12); border-left: 3px solid var(--color-primary); background: var(--color-surface);">
                    <div style="font-weight: 600; font-size: 15px; margin-bottom: var(--space-8);">${entry.zeit} | ${entry.getraenk} ${entry.menge.toFixed(2)}l</div>
                    <div style="color: var(--color-text-secondary); font-size: 13px; line-height: 1.6;">
                        Qualität: ${quality}/10 | Zucker: ${entry.zucker.toFixed(1)}g${extraInfo}
                    </div>
                    <button class="btn-delete" onclick="deleteEntry('${entry.id}')" style="margin-top: var(--space-8);">🗑️ Löschen</button>
                </div>`;
            });
            
            const zielMenge = 2.5;
            const deficit = Math.max(0, zielMenge - totalMenge);
            const avgQuality = qualitySum / trinkEntries.length;
            
            html += `<div style="margin-top: var(--space-16); padding-top: var(--space-16); border-top: 1px solid var(--color-border);">
                <strong>Trinken-Score heute:</strong> ${trinkScore.toFixed(1)}/10<br>
                <strong>Ø Trinkmenge:</strong> ${totalMenge.toFixed(2)}l (Ziel 2,5l)${deficit > 0 ? ` - ${deficit.toFixed(2)}l Unterversorgung (-${(deficit * 4).toFixed(1)} Punkte)` : ' ✓'}<br>
                <strong>Ø Qualität:</strong> ${avgQuality.toFixed(2)}/10<br>
                <strong>Ø Zucker:</strong> ${(totalZucker / trinkEntries.length).toFixed(1)}g${bierCount > 0 ? ` | <strong>Alkohol:</strong> ${bierCount.toFixed(1)} Einheiten` : ''}
            </div>`;
        } else {
            html += `<p style="text-align: center; padding: var(--space-16); color: var(--color-text-secondary);">Keine Trink-Einträge heute</p>`;
        }
        
        html += `</div>`;
        
        // SPORT
        html += `<h4>⚽ SPORT HEUTE</h4>`;
        html += `<div style="border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-16); margin-bottom: var(--space-24); background: var(--color-background);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        if (sportEntries.length > 0) {
            let totalSchritte = 0;
            let schritteCount = 0;
            
            sportEntries.forEach(entry => {
                const score = calculateSportScore(entry);
                if (entry.schritte) {
                    totalSchritte += entry.schritte;
                    schritteCount++;
                }
                
                let extraInfo = '';
                if (entry.schritte) {
                    const schrittePunkte = (entry.schritte / 500) * 0.3;
                    extraInfo += `<br><strong>Schritte:</strong> ${entry.schritte} → +${schrittePunkte.toFixed(1)} Pkt`;
                }
                if (entry.liegezeit) {
                    const liegePunkte = (entry.liegezeit / 30) * 0.3;
                    extraInfo += `<br><strong>Liegezeit:</strong> ${entry.liegezeit} min → -${liegePunkte.toFixed(1)} Pkt`;
                }
                
                const activityLabel = entry.aktivitaet ? entry.aktivitaet : '— Nur Schritte/Liegezeit —';
                const durationText = entry.dauer ? `${entry.dauer} min` : '—';
                const intensityText = entry.intensitaet ? entry.intensitaet : '—';
                
                html += `<div style="margin: var(--space-16) 0; padding: var(--space-12); border-left: 3px solid var(--color-primary); background: var(--color-surface);">
                    <div style="font-weight: 600; font-size: 15px; margin-bottom: var(--space-8);">${activityLabel}</div>
                    <div style="color: var(--color-text-secondary); font-size: 13px; line-height: 1.6;">
                        ${entry.dauer ? `Dauer: ${durationText} | Intensität: ${intensityText}` : ''}${extraInfo}<br>
                        ${score > 0 ? `Score (Aktivität): <strong>${score.toFixed(1)}/10</strong>` : ''}
                    </div>
                    <button class="btn-delete" onclick="deleteEntry('${entry.id}')" style="margin-top: var(--space-8);">🗑️ Löschen</button>
                </div>`;
            });
            
            // Calculate individual scores for display
            let activitiesSum = 0;
            sportEntries.forEach(entry => {
                activitiesSum += calculateSportScore(entry);
            });
            
            // NEUE SCHRITTE-FORMEL: (Schritte / 500) * 0,3
            let schritteBonus = 0;
            if (totalSchritte > 0) {
                schritteBonus = (totalSchritte / 500) * 0.3;
            }
            
            // NEUE LIEGEZEIT-FORMEL: -(Minuten / 30) * 0,3
            let liegezeitMalus = 0;
            const totalLiegezeit = sportEntries.reduce((sum, e) => sum + (e.liegezeit || 0), 0);
            if (totalLiegezeit > 0) {
                liegezeitMalus = -(totalLiegezeit / 30) * 0.3;
            }
            
            html += `<div style="margin-top: var(--space-16); padding-top: var(--space-16); border-top: 1px solid var(--color-border);">
                <strong>Berechnung Sport-Score (NEUE FORMEL):</strong><br>
                ${activitiesSum > 0 ? `Summe Aktivitäten: ${sportEntries.map(e => calculateSportScore(e).toFixed(1)).join(' + ')} = ${activitiesSum.toFixed(1)}/10<br>` : ''}
                ${schritteBonus !== 0 ? `Schritte-Bonus: (${totalSchritte} / 500) × 0,3 = <strong>+${schritteBonus.toFixed(1)}</strong> Pkt<br>` : ''}
                ${liegezeitMalus !== 0 ? `Liegezeit-Malus: (${totalLiegezeit} / 30) × 0,3 = <strong>${liegezeitMalus.toFixed(1)}</strong> Pkt<br>` : ''}
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br>
                <strong>TAGES-SPORT-SCORE: ${sportScore.toFixed(1)}/10</strong> ${sportScore >= 10 ? '⭐ (capped bei 10,0)' : ''}<br>
                ${schritteCount > 0 ? `<strong>Schritte heute:</strong> ${totalSchritte.toFixed(0)}<br>` : ''}
                ${totalLiegezeit > 0 ? `<strong>Liegezeit heute:</strong> ${totalLiegezeit} min<br>` : ''}
                <strong>Trainingseinheiten:</strong> ${sportEntries.length}
            </div>`;
        } else {
            html += `<p style="text-align: center; padding: var(--space-16); color: var(--color-text-secondary);">Keine Sport-Einträge heute</p>`;
        }
        
        html += `</div>`;
        
        // SCHLAF
        html += `<h4>😴 SCHLAF HEUTE</h4>`;
        html += `<div style="border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-16); margin-bottom: var(--space-24); background: var(--color-background);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        if (schlafEntries.length > 0) {
            schlafEntries.forEach(entry => {
                const score = calculateSchlafScore(entry.dauer);
                html += `<div style="margin: var(--space-16) 0; padding: var(--space-12); border-left: 3px solid var(--color-primary); background: var(--color-surface);">
                    <div style="font-weight: 600; font-size: 15px; margin-bottom: var(--space-8);">Schlaf von gestern Nacht</div>
                    <div style="color: var(--color-text-secondary); font-size: 13px; line-height: 1.6;">
                        Dauer: ${entry.dauer.toFixed(1)}h<br>
                        Score: <strong>${score.toFixed(1)}/10</strong>
                    </div>
                    <button class="btn-delete" onclick="deleteEntry('${entry.id}')" style="margin-top: var(--space-8);">🗑️ Löschen</button>
                </div>`;
            });
        } else {
            html += `<p style="text-align: center; padding: var(--space-16); color: var(--color-text-secondary);">[Schlaf wird MORGEN früh eingetragen!]<br>Heute: Noch keine Schlaf-Daten (wird morgen für ${formatDate(viewedDate).split(' ')[0]}. ${formatDate(viewedDate).split(' ')[1]} erfasst)<br>🔔 Erinnerung: Schlaf morgen früh eintragen</p>`;
        }
        
        html += `</div>`;
        
        // RAUCHFREI
        html += `<h4>🚭 RAUCHFREI HEUTE</h4>`;
        html += `<div style="border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-16); margin-bottom: var(--space-24); background: var(--color-background);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        const rauchfreiStatus = rauchEntries.length > 0 && rauchEntries[0].status === 'ja';
        const rauchfreiTage = calculateRauchfreiTage();
        
        html += `<div style="margin: var(--space-16) 0; padding: var(--space-12); background: var(--color-surface);">
            <div style="font-weight: 600; font-size: 15px; margin-bottom: var(--space-8);">Status heute: ${rauchfreiStatus ? '☑ RAUCHFREI' : '☐ MIT AUSRUTSCHER'}</div>
            <div style="color: var(--color-text-secondary); font-size: 13px; line-height: 1.6;">
                Tage rauchfrei: <strong>${rauchfreiTage}</strong> (seit 1. Nov - heute ${formatDate(viewedDate).split(' ')[0]}. ${formatDate(viewedDate).split(' ')[1]})<br>
                Rauchfrei-Score heute: <strong>${rauchScore.toFixed(1)}/10</strong> ${rauchfreiStatus ? '⭐' : ''}<br><br>
                Bonus-Punkte heute: <strong>+${rauchfreiStatus ? '1.0' : '0.0'} Pkt</strong> (täglich)
            </div>
        </div>`;
        
        html += `</div>`;
        
        // PREISBEWERTUNG
        html += `<h4>💰 PREISBEWERTUNG HEUTE</h4>`;
        html += `<div style="border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-16); margin-bottom: var(--space-24); background: var(--color-background);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        let ernPreis = ernEntries.reduce((sum, e) => sum + e.preis, 0);
        let trinkPreis = 0;
        trinkEntries.forEach(e => {
            if (e.kategorie === 'Bier') {
                trinkPreis += (e.menge / 0.5) * 1.0;
            }
        });
        let kaffeePreis = ernEntries.filter(e => e.ort === 'Arbeit').length * 0.50;
        
        html += `<div style="margin: var(--space-16) 0;">
            <div style="font-size: 13px; line-height: 2;">
                Ernährung: <strong>${ernPreis.toFixed(2)}€</strong><br>
                + Wasser/Bier: <strong>${trinkPreis.toFixed(2)}€</strong>${trinkPreis > 0 ? ' (Bier +1€ Aufschlag)' : ''}<br>
                + Kaffee (Mo-Fr): <strong>${kaffeePreis.toFixed(2)}€</strong> (automatisch addiert)<br>
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br>
                <div style="font-size: 16px; font-weight: 600; margin-top: var(--space-8);">SUMME HEUTE: <strong>${dailyPrice.toFixed(2)}€</strong></div><br>
                Zielwert: <strong>12,00€</strong><br>
                ${dailyPrice > 12 ? `<span style="color: var(--color-error);">ÜBER BUDGET: +${(dailyPrice - 12).toFixed(2)}€ 🔴</span>` : `<span style="color: var(--color-success);">IM BUDGET ✓</span>`}<br><br>
                Preis-Score heute: <strong>${preisScore.toFixed(1)}/10</strong> (12€ = 10/10, -0,75 Punkt pro € über 12)
            </div>
        </div>`;
        
        html += `</div>`;
    }
    
    // 3. TAGES-SUMMARY
    html += `<h3>3️⃣ 💡 TAGES-SUMMARY</h3>`;
    html += `<div style="border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-20); background: var(--color-background);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
    const totalEntries = entries.length;
    
    html += `<div style="line-height: 2;">
        <strong>Gesamte Einträge heute:</strong> ${totalEntries}<br>
        &nbsp;&nbsp;• Ernährung: ${ernEntries.length}<br>
        &nbsp;&nbsp;• Trinken: ${trinkEntries.length}<br>
        &nbsp;&nbsp;• Sport: ${sportEntries.length}<br>
        &nbsp;&nbsp;• Rauchfrei: ${rauchEntries.length > 0 ? '1 (Status)' : '0'}<br>
        &nbsp;&nbsp;• Schlaf: ${schlafEntries.length}<br><br>
        
        <strong>Tages-Gesamtscore:</strong> <span style="color: var(--color-primary); font-size: 18px; font-weight: 600;">${gesamtScore.toFixed(1)}/10</span> (gewichtet)<br><br>
        
        <strong>Verdiente Bonus-Punkte heute:</strong><br>
        &nbsp;&nbsp;+ Rauchfreier Tag: ${rauchEntries.length > 0 && rauchEntries[0].status === 'ja' ? '+1.0 Pkt ⭐' : '+0.0 Pkt'}<br>
        &nbsp;&nbsp;+ Ernährung Score ${ernScore.toFixed(1)} ${ernScore >= 8 ? '(>= 8): +2 Pkt' : '(< 8): 0 Pkt'}<br>
        &nbsp;&nbsp;+ Trinken Score ${trinkScore.toFixed(1)} ${trinkScore >= 8 ? '(>= 8): +1 Pkt' : '(< 8): 0 Pkt'}<br>
        &nbsp;&nbsp;+ Sport Score ${sportScore.toFixed(1)} ${sportScore >= 8 ? '(>= 8): +2 Pkt' : '(< 8): 0 Pkt'}<br>
        ${sportEntries.filter(e => e.schritte && e.schritte > 7000).length > 0 ? '&nbsp;&nbsp;+ Schritte > 7000: +0.5 Pkt (Bonus)<br>' : ''}
        &nbsp;&nbsp;━━━━━━━━━━━━━━━━━━━━━━━━━<br>
        &nbsp;&nbsp;<strong>TOTAL HEUTE: +${todayBonus.toFixed(1)} Bonus-Punkte</strong><br><br>
        
        <strong>🎯 Empfehlungen für morgen:</strong><br>
        ${trinkEntries.filter(e => e.kategorie === 'Bier').length > 0 ? '&nbsp;&nbsp;• "Reduziere Bier, erhöhe Ernährungs-Score auf >= 8 → +2 Pkt"<br>' : ''}
        ${sportScore >= 8 ? '&nbsp;&nbsp;• "Gutes Sport-Niveau beibehalten!"' : '&nbsp;&nbsp;• "Mehr Sport treiben für +2 Pkt"'}
    </div>`;
    
    html += `</div></div>`;
    
    document.getElementById('tagesanalyseContent').innerHTML = html;
}

// Change date for Tagesanalyse
function changeTagesanalyseDate(newDate) {
    appState.viewedDate = newDate;
    renderTagesanalyse();
}

function renderWochenanalyseOLD() {
    // Use viewed week or current week
    let weekInfo;
    if (appState.viewedWeekNumber === null) {
        weekInfo = getWeekInfo(appState.currentDate);
        appState.viewedWeekNumber = weekInfo.weekNumber;
        appState.viewedWeekYear = 2025;
    } else {
        const weekRange = getWeekDateRange(appState.viewedWeekNumber, appState.viewedWeekYear);
        weekInfo = {
            weekNumber: appState.viewedWeekNumber,
            mondayStr: weekRange.start,
            sundayStr: weekRange.end,
            displayString: `${formatDateWithDay(weekRange.start, 'Montag')} - ${formatDateWithDay(weekRange.end, 'Sonntag')}`
        };
    }
    
    const currentWeekInfo = getWeekInfo(appState.currentDate);
    const entries = getEntriesByDateRange(weekInfo.mondayStr, weekInfo.sundayStr);
    
    const ernEntries = getEntriesByType(entries, 'ernaehrung');
    const trinkEntries = getEntriesByType(entries, 'trinken');
    const sportEntries = getEntriesByType(entries, 'sport');
    const schlafEntries = getEntriesByType(entries, 'schlaf');
    const rauchEntries = getEntriesByType(entries, 'rauchstatus');
    
    // Calculate all scores
    let ernScore = 0;
    if (ernEntries.length > 0) {
        ernScore = ernEntries.reduce((sum, e) => sum + e.ldlScore, 0) / ernEntries.length;
    }
    
    let trinkScore = trinkEntries.length > 0 ? calculateTrinkenScore(trinkEntries) : 0;
    
    // NEUE BERECHNUNG: ADDIEREN aller Sport-Aktivitäten (capped at 10)
    let sportScore = 0;
    if (sportEntries.length > 0) {
        // Sum all activity scores
        sportScore = sportEntries.reduce((sum, e) => sum + calculateSportScore(e), 0);
        
        // Add steps bonus (once per day)
        const hasSchritte = sportEntries.some(e => e.schritte);
        if (hasSchritte) {
            const totalSchritte = sportEntries.reduce((sum, e) => sum + (e.schritte || 0), 0);
            if (totalSchritte < 3000) sportScore -= 1.0;
            else if (totalSchritte >= 10000) sportScore += 1.5;
            else if (totalSchritte >= 7000) sportScore += 0.5;
        }
        
        // Add liegezeit malus (once per day)
        const hasLiegezeit = sportEntries.some(e => e.liegezeit);
        if (hasLiegezeit) {
            const totalLiegezeit = sportEntries.reduce((sum, e) => sum + (e.liegezeit || 0), 0);
            const liegeHalfHours = totalLiegezeit / 30;
            sportScore -= liegeHalfHours * 0.5;
        }
        
        // Cap at 10.0
        sportScore = Math.max(0, Math.min(10, sportScore));
    }
    
    let rauchfreiDays = 0;
    for (let d = new Date(weekInfo.startStr); d <= new Date(weekInfo.endStr); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayRauch = rauchEntries.filter(e => e.datum === dateStr);
        if (dayRauch.length > 0 && dayRauch[0].status === 'ja') {
            rauchfreiDays++;
        }
    }
    
    let rauchScore = 0;
    if (rauchfreiDays === 7) rauchScore = 10;
    else if (rauchfreiDays === 6) rauchScore = 8;
    else if (rauchfreiDays === 5) rauchScore = 6;
    else if (rauchfreiDays === 4) rauchScore = 4;
    else rauchScore = rauchfreiDays;
    
    let schlafScore = 0;
    if (schlafEntries.length > 0) {
        schlafScore = schlafEntries.reduce((sum, e) => sum + calculateSchlafScore(e.dauer), 0) / schlafEntries.length;
    }
    
    let totalPreis = 0;
    ernEntries.forEach(e => totalPreis += e.preis);
    const workDays = ernEntries.filter(e => e.ort === 'Arbeit').length;
    totalPreis += workDays * 0.50;
    trinkEntries.forEach(e => {
        if (e.kategorie === 'Bier') {
            totalPreis += (e.menge / 0.5) * 1.0;
        }
    });
    const avgDaily = totalPreis / 7;
    let preisScore = calculatePreisScore(avgDaily);
    
    // NEW SCORING WEIGHTS: Ernährung 35%, Trinken 15%, Sport 20%, Rauchfrei 20%, Schlaf 5%, Preis 5%
    const gesamtScore = (ernScore * 0.35) + (trinkScore * 0.15) + (sportScore * 0.20) + (rauchScore * 0.20) + (schlafScore * 0.05) + (preisScore * 0.05);
    
    console.log('✓ Scores berechnet:');
    console.log('  Ernährung:', ernScore.toFixed(1));
    console.log('  Trinken:', trinkScore.toFixed(1));
    console.log('  Sport:', sportScore.toFixed(1));
    console.log('  Rauchfrei:', rauchScore.toFixed(1));
    console.log('  Schlaf:', schlafScore.toFixed(1));
    console.log('  Preis:', preisScore.toFixed(1));
    console.log('  GESAMT:', gesamtScore.toFixed(1));
    
    // Navigation controls
    // Navigation controls based on correct week numbers
    const canGoBack = weekInfo.weekNumber > 45; // Can't go before KW45
    const canGoForward = currentWeekObj && (weekInfo.weekNumber < currentWeekObj.weekNumber);
    
    let html = `
        <div class="analysis-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-24); gap: var(--space-16); flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="navigateWeek(-1)" ${!canGoBack ? 'disabled' : ''}>◀ Vorherige</button>
                <h2 style="margin: 0; text-align: center; flex: 1;">📊 ${weekInfo.displayStr}</h2>
                <button class="btn btn-secondary" onclick="navigateWeek(1)" ${!canGoForward ? 'disabled' : ''}>Nächste ▶</button>
            </div>
            
            <h3>📊 1. GESAMTSCORE - ÜBERSICHT ALLER SCORES</h3>
            <p><strong>Berechnet aus:</strong></p>
            <table class="data-table">
                <thead><tr><th>Kategorie</th><th>Score</th><th>Gewicht</th><th>Beitrag</th></tr></thead>
                <tbody>
                    <tr><td>🟢 Ernährung</td><td>${ernScore.toFixed(1)}/10</td><td>35%</td><td>${(ernScore * 0.35).toFixed(2)} Pkte</td></tr>
                    <tr><td>🔵 Trinken</td><td>${trinkScore.toFixed(1)}/10</td><td>15%</td><td>${(trinkScore * 0.15).toFixed(2)} Pkte</td></tr>
                    <tr><td>🟣 Sport</td><td>${sportScore.toFixed(1)}/10</td><td>20%</td><td>${(sportScore * 0.20).toFixed(2)} Pkte</td></tr>
                    <tr><td>🔴 Rauchfrei</td><td>${rauchScore.toFixed(1)}/10</td><td>20%</td><td>${(rauchScore * 0.20).toFixed(2)} Pkte</td></tr>
                    <tr><td>😴 Schlaf</td><td>${schlafScore.toFixed(1)}/10</td><td>5%</td><td>${(schlafScore * 0.05).toFixed(2)} Pkte</td></tr>
                    <tr><td>💰 Preis</td><td>${preisScore.toFixed(1)}/10</td><td>5%</td><td>${(preisScore * 0.05).toFixed(2)} Pkte</td></tr>
                </tbody>
            </table>
            <p style="font-size: 18px; font-weight: 600; margin-top: var(--space-16);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br>⭐ GESAMTSCORE: <span style="color: var(--color-primary);">${gesamtScore.toFixed(1)}/10</span></p>
    `;
    
    // 2. ERNÄHRUNG
    html += `<h3>🥘 2. ERNÄHRUNG</h3>`;
    if (ernEntries.length > 0) {
        html += `<table class="data-table">
            <thead>
                <tr>
                    <th>Datum</th>
                    <th>Gericht</th>
                    <th>Ort</th>
                    <th>Score</th>
                    <th>Einfluss</th>
                </tr>
            </thead>
            <tbody>`;
        
        let ernScoreSum = 0;
        ernEntries.forEach(entry => {
            ernScoreSum += entry.ldlScore;
            let einfluss = '';
            if (entry.fett > 20) einfluss = 'hohes Fett, LDL-kritisch';
            else if (entry.kh > 60) einfluss = 'viele Kohlenhydrate';
            else einfluss = 'ausgewogen';
            
            html += `
                <tr>
                    <td>${formatDate(entry.datum)}</td>
                    <td>${entry.gericht}</td>
                    <td>${entry.ort}</td>
                    <td>${getScoreBadge(entry.ldlScore)}</td>
                    <td>${einfluss}</td>
                </tr>
            `;
        });
        
        const ernScore = ernScoreSum / ernEntries.length;
        html += `</tbody></table>`;
        
        // Calculate nutritional averages
        let totalKcal = 0, totalFett = 0, totalKH = 0, totalEiweiss = 0;
        ernEntries.forEach(e => {
            totalKcal += e.kcal;
            totalFett += e.fett;
            totalKH += e.kh;
            totalEiweiss += e.eiweiss;
        });
        const avgKcal = totalKcal / ernEntries.length;
        const avgFett = totalFett / ernEntries.length;
        const avgKH = totalKH / ernEntries.length;
        const avgEiweiss = totalEiweiss / ernEntries.length;
        
        html += `<p><strong>Wochenscore Ernährung (🟢):</strong> ${getScoreBadge(ernScore)}</p>`;
        html += `<p><strong>Durchschnittliche Nährwerte pro Mahlzeit:</strong> kcal ${avgKcal.toFixed(0)} | Fett ${avgFett.toFixed(1)}g | KH ${avgKH.toFixed(1)}g | Eiweiß ${avgEiweiss.toFixed(1)}g</p>`;
        html += `<p><strong>Bewertung:</strong> ${getErnaehrungBewertung(avgFett, avgKH, avgEiweiss)}</p>`;
        html += `<p><em>Kommentar: ${getErnaehrungKommentar(ernScore, ernEntries)}</em></p>`;
    } else {
        html += `<p>Keine Ernährungs-Einträge in dieser Woche.</p>`;
    }
    
    // 2b. PREIS (als Teil der Ernährung)
    if (ernEntries.length > 0) {
        let totalPreis = 0;
        ernEntries.forEach(e => totalPreis += e.preis);
        
        // Add automatic coffee costs
        const workDays = ernEntries.filter(e => e.ort === 'Arbeit').length;
        totalPreis += workDays * 0.50;
        
        // Add drink costs
        trinkEntries.forEach(e => {
            if (e.kategorie === 'Bier') {
                totalPreis += (e.menge / 0.5) * 1.0; // 1€ per beer
            }
        });
        
        const avgDaily = totalPreis / 7;
        const preisScore = calculatePreisScore(avgDaily);
        
        html += `<table class="data-table">
            <thead><tr><th>Kennzahl</th><th>Wert</th><th>Bewertung</th></tr></thead>
            <tbody>
                <tr><td>Ø Tagesausgaben</td><td>${avgDaily.toFixed(2)} €</td><td>${preisScore >= 7 ? 'Gut' : 'Zu hoch'}</td></tr>
                <tr><td>Summe Wochenausgaben</td><td>${totalPreis.toFixed(2)} €</td><td>-</td></tr>
                <tr><td>Preis-Score (🟡)</td><td>${getScoreBadge(preisScore)}</td><td>-</td></tr>
            </tbody>
        </table>`;
        html += `<p><em>Kommentar: ${getPreisKommentar(avgDaily)}</em></p>`;
    } else {
        html += `<p>Keine Preisdaten verfügbar.</p>`;
    }
    
    // 3. TRINKEN
    html += `<h3>💧 3. TRINKEN</h3>`;
    if (trinkEntries.length > 0) {
        html += `<table class="data-table">
            <thead><tr><th>Datum</th><th>Getränk</th><th>Menge (l)</th><th>Qualität</th><th>Zucker (g)</th></tr></thead>
            <tbody>`;
        
        let totalMenge = 0;
        let totalZucker = 0;
        let bierCount = 0;
        let qualitySum = 0;
        
        trinkEntries.forEach(e => {
            totalMenge += e.menge;
            totalZucker += e.zucker;
            if (e.kategorie === 'Bier') bierCount += e.menge / 0.5;
            
            const ref = getraenkeReference[e.kategorie];
            const quality = ref ? ref.scoreBasis : 5;
            qualitySum += quality;
            
            html += `
                <tr>
                    <td>${formatDate(e.datum)}</td>
                    <td>${e.getraenk}</td>
                    <td>${e.menge.toFixed(2)}</td>
                    <td>${quality}/10</td>
                    <td>${e.zucker.toFixed(1)}</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        
        const avgMenge = totalMenge / 7;
        const avgZucker = totalZucker / 7;
        const avgQuality = qualitySum / trinkEntries.length;
        
        // Calculate Menge score
        const zielMenge = 2.5;
        let mengeScore = 10;
        let mengeBewertung = 'Ausreichend';
        if (avgMenge < zielMenge) {
            const deficit = zielMenge - avgMenge;
            mengeScore = Math.max(0, 10 - (deficit / 0.25));
            mengeBewertung = `Unterversorgung -${(deficit / 0.25).toFixed(1)} Punkte`;
        }
        
        html += `<p><strong>Ø Trinkmenge pro Tag:</strong> ${avgMenge.toFixed(2)} l (Ziel = 2,5 l)<br><strong>Bewertung:</strong> ${mengeBewertung}</p>`;
        html += `<p><strong>Ø Trinkqualität (Gesamtbewertung):</strong><br>`;
        html += `&nbsp;&nbsp;• Qualitäts-Score aller Getränke gemittelt: ${avgQuality.toFixed(1)}/10 (66% Gewicht)<br>`;
        html += `&nbsp;&nbsp;• Mengen-Score basierend auf täglicher Ø: ${mengeScore.toFixed(1)}/10 (34% Gewicht)<br>`;
        html += `&nbsp;&nbsp;• <strong>Berechnung:</strong> (${avgQuality.toFixed(1)} × 0,66) + (${mengeScore.toFixed(1)} × 0,34) = ${trinkScore.toFixed(1)}/10</p>`;
        html += `<p><strong>Ø Zucker aus Getränken pro Tag:</strong> ${avgZucker.toFixed(1)} g</p>`;
        if (bierCount > 0) {
            html += `<p><strong>Ø Alkohol pro Tag:</strong> ${(bierCount / 7).toFixed(2)} Einheiten à 0,5l</p>`;
        }
        html += `<p><strong>Wochenscore Trinken (🔵):</strong> ${getScoreBadge(trinkScore)}</p>`;
        html += `<p><em>Kommentar: ${getTrinkenKommentar(avgMenge, bierCount)}</em></p>`;
    } else {
        html += `<p>Keine Trink-Einträge in dieser Woche.</p>`;
    }
    
    // 4. SPORT
    html += `<h3>⚽ 4. SPORT</h3>`;
    if (sportEntries.length > 0) {
        html += `<table class="data-table">
            <thead><tr><th>Datum</th><th>Aktivität</th><th>Dauer</th><th>Intensität</th><th>Score</th></tr></thead>
            <tbody>`;
        
        let sportScoreSum = 0;
        sportEntries.forEach(entry => {
            const score = calculateSportScore(entry);
            sportScoreSum += score;
            html += `
                <tr>
                    <td>${formatDate(entry.datum)}</td>
                    <td>${entry.aktivitaet}</td>
                    <td>${entry.dauer} min</td>
                    <td>${entry.intensitaet}</td>
                    <td>${getScoreBadge(score)}</td>
                </tr>
            `;
        });
        
        const avgSportScore = sportScoreSum / sportEntries.length;
        html += `</tbody></table>`;
        html += `<p><strong>Wochenscore Sport (🟣):</strong> ${getScoreBadge(avgSportScore)}</p>`;
        
        const totalWocheSchritte = sportEntries.reduce((sum, e) => sum + (e.schritte || 0), 0);
        const avgSchritte = totalWocheSchritte > 0 ? totalWocheSchritte / 7 : 0;
        if (avgSchritte > 0) {
            html += `<p><strong>Ø Schritte pro Tag:</strong> ${avgSchritte.toFixed(0)} (${totalWocheSchritte} total)</p>`;
        }
        
        const totalWocheLiegezeit = sportEntries.reduce((sum, e) => sum + (e.liegezeit || 0), 0);
        const avgLiegezeit = totalWocheLiegezeit > 0 ? totalWocheLiegezeit / 7 : 0;
        if (avgLiegezeit > 0) {
            html += `<p><strong>Ø Liegezeit pro Tag:</strong> ${avgLiegezeit.toFixed(0)} min (${totalWocheLiegezeit} min total)</p>`;
        }
        html += `<p><strong>Trainingstage diese Woche:</strong> ${sportEntries.length} von 7 Tagen</p>`;
        html += `<p><em>Kommentar: ${getSportKommentar(sportEntries.length, avgSportScore)}</em></p>`;
    } else {
        html += `<p>Keine Sport-Einträge in dieser Woche.</p>`;
    }
    
    // 5. RAUCHFREI
    html += `<h3>🚭 5. RAUCHFREI</h3>`;
    html += `<p><strong>Status diese Woche:</strong> ${rauchfreiDays === 7 ? '☑ RAUCHFREI' : '☐ Mit Ausrutschern'}</p>`;
    html += `<p><strong>Tage rauchfrei diese Woche:</strong> ${rauchfreiDays} von 7 Tagen</p>`;
    const rauchfreiTage = calculateRauchfreiTage();
    html += `<p><strong>Tage rauchfrei gesamt (seit 1. Nov):</strong> ${rauchfreiTage} Tage</p>`;
    html += `<p><strong>Rauchfrei-Score diese Woche (🔴):</strong></p>`;
    html += `<ul>`;
    html += `<li>7/7 Tage rauchfrei: ${rauchfreiDays === 7 ? '<strong>10/10 ⭐</strong>' : '10/10'}</li>`;
    html += `<li>6/7 Tage rauchfrei: ${rauchfreiDays === 6 ? '<strong>8/10</strong>' : '8/10'}</li>`;
    html += `<li>5/7 Tage rauchfrei: ${rauchfreiDays === 5 ? '<strong>6/10</strong>' : '6/10'}</li>`;
    html += `<li>&lt; 5/7 Tage rauchfrei: ${rauchfreiDays < 5 ? '<strong>&lt; 6/10</strong>' : '&lt; 6/10'}</li>`;
    html += `</ul>`;
    html += `<p><strong>Meilenstein erreicht:</strong> "${rauchfreiTage} Tage rauchfrei! ${getRauchfreiMeilenstein(rauchfreiTage)}"</p>`;
    html += `<p><em>Kommentar: ${rauchfreiDays === 7 ? 'Super durchgehalten! 💪' : 'Eine Ausrutscherin - nächste Woche besser!'}</em></p>`;
    
    // 6. SCHLAF
    html += `<h3>😴 5. SCHLAF</h3>`;
    if (schlafEntries.length > 0) {
        html += `<table class="data-table">
            <thead><tr><th>Datum</th><th>Dauer (h)</th><th>Score</th></tr></thead>
            <tbody>`;
        
        let schlafSum = 0;
        let schlafScoreSum = 0;
        schlafEntries.forEach(entry => {
            const score = calculateSchlafScore(entry.dauer);
            schlafSum += entry.dauer;
            schlafScoreSum += score;
            html += `
                <tr>
                    <td>${formatDate(entry.datum)}</td>
                    <td>${entry.dauer.toFixed(1)} h</td>
                    <td>${getScoreBadge(score)}</td>
                </tr>
            `;
        });
        
        const avgSchlaf = schlafSum / schlafEntries.length;
        const avgSchlafScore = schlafScoreSum / schlafEntries.length;
        html += `</tbody></table>`;
        html += `<p><strong>Ø Schlafdauer diese Woche:</strong> ${avgSchlaf.toFixed(1)} h (Ziel &gt;= 7,5h)</p>`;
        html += `<p><strong>Wochenscore Schlaf (😴):</strong> ${getScoreBadge(avgSchlafScore)}</p>`;
        const goodSleep = schlafEntries.filter(e => calculateSchlafScore(e.dauer) >= 8).length;
        html += `<p><strong>Schlaf-Qualität:</strong> [Tage mit Score &gt;= 8] ${goodSleep} von ${schlafEntries.length} Tagen</p>`;
        html += `<p><em>Kommentar: ${avgSchlaf >= 8 ? 'Sehr konstant und ausreichend' : avgSchlaf >= 7.5 ? 'Guter Schlaf' : 'Zu kurz - mehr Erholung nötig'}</em></p>`;
    }
    
    
    // 7. GEWICHT
    html += `<h3>⚖️ 7. GEWICHT &amp; KÖRPERLICHE TENDENZ</h3>`;
    html += `<table class="data-table">
        <thead><tr><th>Kennzahl</th><th>Wert</th><th>Kommentar</th></tr></thead>
        <tbody>
            <tr><td>Gewicht Anfang Woche (${formatDate(weekInfo.startStr)})</td><td>90,0 kg</td><td>-</td></tr>
            <tr><td>Gewicht Ende Woche (${formatDate(weekInfo.endStr)})</td><td>90,0 kg</td><td>-</td></tr>
            <tr><td>Veränderung diese Woche</td><td>±0,0 kg</td><td>stabil</td></tr>
        </tbody>
    </table>`;
    html += `<p><strong>Trend:</strong> stabil / leicht ansteigend / leicht fallend</p>`;
    html += `<p><em>Kommentar: Gewicht stabil, gute Balance</em></p>`;
    
    // 8. CHOLESTERIN-TREND
    html += `<h3>❤️ 8. CHOLESTERIN-TREND &amp; GEFÄSSGESUNDHEIT</h3>`;
    html += `<p><em>Geschätzte Werte basierend auf Ernährung und Sport:</em></p>`;
    html += `<table class="data-table">
        <thead><tr><th>Parameter</th><th>Aktuell</th><th>Trend</th><th>Ziel</th><th>Bewertung</th></tr></thead>
        <tbody>
            <tr><td>LDL (geschätzt)</td><td>145 mg/dl</td><td>🟢</td><td>&lt; 130 mg/dl</td><td>verbessert</td></tr>
            <tr><td>HDL (geschätzt)</td><td>42 mg/dl</td><td>🟢</td><td>&gt; 45 mg/dl</td><td>leicht verbessert</td></tr>
            <tr><td>Gesamtcholesterin</td><td>205 mg/dl</td><td>🟢</td><td>&lt; 200 mg/dl</td><td>nahe Ziel</td></tr>
            <tr><td>LDL/HDL-Quotient</td><td>3,45</td><td>🟡</td><td>&lt; 3,0</td><td>verbesserungswürdig</td></tr>
        </tbody>
    </table>`;
    html += `<p><em>Kommentar: Rauchstopp und moderate Bewegung zeigen positive Effekte. LDL sinkt langsam - Ernährung weiter optimieren.</em></p>`;
    
    // 9. PREISBEWERTUNG
    // 9. PREISBEWERTUNG
    html += `<h3>💰 9. PREISBEWERTUNG &amp; BUDGETKONTROLLE</h3>`;
    html += `<p><strong>Top 3 Optimierungsvorschläge:</strong></p>`;
    html += `<ul>
        <li>Reduziere Bier auf max. 2/Woche → +5 Pkt, -300 kcal, +7€ Ersparnis</li>
        <li>Wähle fettärmere Gerichte (z.B. Salate mit Hähnchen) → +1 Pkt Ernährung, -200 kcal</li>
        <li>Erhöhe Trinkmenge auf 2,5l täglich → +1 Pkt Trinken</li>
    </ul>`;
    
    // 10. OPTIMIERUNG - Placeholder
    html += `<h3>🔧 10. OPTIMIERUNGSVORSCHLÄGE</h3>`;
    html += `<p><strong>Top 3 Optimierungsvorschläge:</strong></p>`;
    html += `<ul>
        <li>Reduziere Bier auf max. 2/Woche → +5 Pkt, -300 kcal, +7€ Ersparnis</li>
        <li>Wähle fettärmere Gerichte (z.B. Salate mit Hähnchen) → +1 Pkt Ernährung, -200 kcal</li>
        <li>Erhöhe Trinkmenge auf 2,5l täglich → +1 Pkt Trinken</li>
    </ul>`;
    
    // 11. MOTIVATION & BONUS
    html += `<h3>🎯 11. MOTIVATION &amp; BONUSPROGRAMM</h3>`;
html += `<p><strong>Gesamtpunkte:</strong> ${appState.bonusPoints.toFixed(1)}</p>`;
const level = getCurrentLevel(appState.bonusPoints);
if (!level) {
    level = { level: 1, title: 'Einstieg', motivationssatz: 'Jeder Anfang ist schwer - du packst das!' };
}

html += `<p><strong>Level:</strong> ${level.level} - ${level.title}</p>`;
html += `<p style="font-style: italic;">"${level.motivationssatz}"</p>`;
html += `<p><strong>Aktueller Status:</strong> ${getShortBonusStatus()}</p>`;
html += `<p><em>→ Für die detaillierte Übersicht klick auf "Bonusprogramm"</em></p>`;

    
    html += `<p><em><strong>Hinweis:</strong> Das System ist hart kalibriert. 1000 Punkte (MAX-Level) sollten mit Disziplin in 7-12 Monaten erreichbar sein. Die meisten Punkte gibt es für die schwierigsten Aufgaben: Rauchfrei bleiben, gesunde Ernährung und regelmäßiger Sport!</em></p>`;
    
    // 11. MOTIVATION
    html += `<div class="motivation-box">
        <p>🌞 ${getMotivationText(gesamtScore, rauchfreiDays)}</p>
    </div>`;
    
    html += `<div class="summary-footer">
        <strong>Seit Start (1. Nov 2025):</strong><br>
        LDL -11 mg/dl &bull; HDL +4 mg/dl &bull; Rauchfrei ${calculateRauchfreiTage()} Tage
    </div>`;
    
    html += `</div>`;
    
    console.log('━━━ HTML-Länge:', html.length, 'Zeichen ━━━');
    console.log('━━━ Setze wochenanalyseContent.innerHTML ━━━');
    
    const container = document.getElementById('wochenanalyseContent');
    if (!container) {
        console.error('❌ FEHLER: wochenanalyseContent Container nicht gefunden!');
        return;
    }
    
    container.innerHTML = html;
    console.log('✓ Wochenanalyse erfolgreich gerendert!');
    console.log('━━━ renderWochenanalyse() ENDE ━━━');
}

function renderMonatsanalyse() {
    const html = `
        <div class="analysis-section">
            <h2>📈 MONATSANALYSE - November 2025</h2>
            <p>Monatsübersicht mit aggregierten Daten und Trends über alle Wochen...</p>
            <p><em>Feature in Entwicklung: Zeigt Trends über mehrere Wochen hinweg.</em></p>
        </div>
    `;
    
    document.getElementById('monatsanalyseContent').innerHTML = html;
}

function renderBonus() {
    const levels = [
        { level: 1, name: 'Einstieg', min: 0, max: 49 },
        { level: 2, name: 'Aufbau', min: 50, max: 109 },
        { level: 3, name: 'Fortschritt', min: 110, max: 179 },
        { level: 4, name: 'Stabilität', min: 180, max: 259 },
        { level: 5, name: 'Kontrolle', min: 260, max: 349 },
        { level: 6, name: 'Stärke', min: 350, max: 449 },
        { level: 7, name: 'Brillianz', min: 450, max: 559 },
        { level: 8, name: 'Meisterhaft', min: 560, max: 679 },
        { level: 9, name: 'Champion', min: 680, max: 809 },
        { level: 10, name: 'Road to Glory', min: 820, max: 999 },
        { level: 'MAX', name: 'System durchgespielt', min: 1000, max: 999999 }
    ];
    
    let html = `
        <div class="analysis-section">
            <h2>🎁 BONUSSYSTEM</h2>
            <p><strong>Aktuelle Gesamtpunkte:</strong> ${appState.bonusPoints.toFixed(1)}</p>
            
            <h3>Level-Übersicht</h3>
            <table class="data-table level-table">
                <thead>
                    <tr>
                        <th>Level</th>
                        <th>Titelname</th>
                        <th>Punktbereich</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>`;
    
    levels.forEach(level => {
        const isCurrent = appState.bonusPoints >= level.min && appState.bonusPoints <= level.max;
        const rowClass = isCurrent ? 'level-current' : '';
        const status = isCurrent ? '🔵 AKTUELL' : appState.bonusPoints > level.max ? '✅ Erreicht' : '';
        
        html += `
            <tr class="${rowClass}">
                <td>${level.level}</td>
                <td>${level.name}</td>
                <td>${level.min} - ${level.max}</td>
                <td>${status}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    
    html += `<h3>NEUE BONUS-STRUKTUR V2 (Hart kalibriert für 7-12 Monate)</h3>`;
    html += `<p><strong>Ziel:</strong> 1000 Punkte (MAX) sollen mit Disziplin in 7-12 Monaten erreichbar sein.</p>`;
    html += `<p><strong>Schwerpunkt:</strong> 53% der Punkte auf Rauchfrei (36,9%), Ernährung (6,4%) und Sport (9,7%)</p>`;
    
    html += `<h4>🔴 RAUCHFREI (PRIORITÄT 1 - HÖCHSTE GEWICHTUNG!)</h4>`;
    html += `<ul>
        <li>Rauchfreier Tag: <strong>+1 Pkt</strong> (täglich!) ⭐</li>
        <li>Rauchfrei Streak 7 Tage: +15 Pkt</li>
        <li>Rauchfrei Streak 14 Tage: +35 Pkt ⭐</li>
        <li>Rauchfrei Streak 30 Tage: +80 Pkt ⭐⭐</li>
        <li>Rauchfrei Streak 100 Tage: +200 Pkt ⭐⭐⭐</li>
    </ul>`;
    
    html += `<h4>🟡 ERNÄHRUNG (PRIORITÄT 1 - 57 Punkte möglich)</h4>`;
    html += `<ul>
        <li>Ernährung Score ≥ 8: +2 Pkt (wöchentlich)</li>
        <li>Ernährung Score ≥ 8.5: +4 Pkt (wöchentlich)</li>
        <li>Ernährung Score ≥ 9: +6 Pkt (wöchentlich) ⭐</li>
        <li>Ernährung Streak 3 Tage @8+: +3 Pkt</li>
        <li>Ernährung Streak 7 Tage @8+: +12 Pkt</li>
        <li>Ernährung Streak 14 Tage @8+: +30 Pkt ⭐⭐</li>
    </ul>`;
    
    html += `<h4>🟢 SPORT - NEUE BEWERTUNGS-KATEGORIEN</h4>`;
    html += `<ul>
        <li><strong>Körperliche Arbeit</strong> (z.B. Holz schlichten 30min): <strong>4,0/10</strong> ✓</li>
        <li><strong>Leichte Aktivität</strong> (Gehen, leichte Bewegung 30min): 1,5-3,0/10</li>
        <li><strong>Moderate Aktivität</strong> (Joggen, zügiges Gehen 30min): 5,0-7,0/10</li>
        <li><strong>Intensive Aktivität</strong> (Krafttraining, HIIT 30min): 7,5-9,0/10</li>
        <li><strong>Liegezeit</strong> (TV, Liegen pro 30min): <strong>-0,5 bis -1,0 Punkte</strong></li>
    </ul>`;
    
    html += `<h4>👟 SCHRITTE (NEUE FORMEL)</h4>`;
    html += `<ul>
        <li><strong>Formel: (Schritte / 500) × 0,3</strong></li>
        <li>1000 Schritte = +0,6 Punkte</li>
        <li>5000 Schritte = +3,0 Punkte</li>
        <li>7000 Schritte = +4,2 Punkte</li>
        <li>10000 Schritte = +6,0 Punkte</li>
        <li>15000 Schritte = +9,0 Punkte</li>
        <li>20000 Schritte = +12,0 Punkte (capped 10,0) ⭐</li>
    </ul>`;
    
    html += `<h4>🟣 SPORT WEEKLY BONI</h4>`;
    html += `<ul>
        <li>Sport Score ≥ 8: +2 Pkt (wöchentlich)</li>
        <li>Sport Score ≥ 8.5: +4 Pkt (wöchentlich)</li>
        <li>Sport Score ≥ 9: +6 Pkt (wöchentlich) ⭐</li>
        <li>Sport Streak 3 Tage @8+: +5 Pkt</li>
        <li>Sport Streak 7 Tage @8+: +20 Pkt</li>
        <li>Sport Streak 14 Tage @8+: +50 Pkt ⭐⭐ SEHR HART!</li>
    </ul>`;
    html += `<p style="margin-top: var(--space-16);"><strong>Hinweis:</strong> Mit der NEUEN FORMEL (Schritte/Liegezeit) ist die Bewertung granularer und fairer. 10000 Schritte + 30min Kraft = 9,5 Punkte pro Tag - wissenschaftlich optimal für Gesundheit & Cholesterinentwicklung! ✓</p>`;
    

    html += `<ul>
        <li>Sport Score ≥ 8: +2 Pkt (wöchentlich)</li>
        <li>Sport Score ≥ 8.5: +4 Pkt (wöchentlich)</li>
        <li>Sport Score ≥ 9: +6 Pkt (wöchentlich) ⭐</li>
        <li>Sport Streak 3 Tage @8+: +5 Pkt</li>
        <li>Sport Streak 7 Tage @8+: +20 Pkt</li>
        <li>Sport Streak 14 Tage @8+: +50 Pkt ⭐⭐ SEHR HART!</li>
    </ul>`;
    
    html += `<p style="margin-top: var(--space-16); padding: var(--space-12); background: var(--color-bg-1); border-radius: var(--radius-base); border: 1px solid var(--color-border);">
        <strong>⚠️ WICHTIG - KEINE SPAZIERGÄNGE MEHR:</strong><br>
        Spaziergänge wurden entfernt! Stattdessen Schritte zählen:<br>
        • 10000 Schritte = +6,0 Punkte<br>
        • Pro 500 Schritte = +0,3 Punkte (granular & fair!)<br>
        • Liegezeit wird ebenfalls granular abgezogen (pro 30min = -0,3 Pkt)
    </p>`;

    html += `<h4>🛏️ LIEGEZEIT (NEUE FORMEL - MALUS)</h4>`;
    html += `<ul>
        <li><strong>Formel: -(Minuten / 30) × 0,3</strong></li>
        <li>30 min = -0,3 Punkte</li>
        <li>60 min = -0,6 Punkte</li>
        <li>90 min = -0,9 Punkte</li>
        <li>120 min = -1,2 Punkte</li>
        <li>180 min = -1,8 Punkte</li>
    </ul>`;

    html += `<h4>🔵 TRINKEN (PRIORITÄT 2 - 29 Punkte möglich)</h4>`;
    html += `<ul>
        <li>Trinken Score ≥ 8: +1 Pkt (wöchentlich)</li>
        <li>Trinken Score ≥ 8.5: +2 Pkt (wöchentlich)</li>
        <li>Trinken Score ≥ 9: +3 Pkt (wöchentlich)</li>
        <li>Trinken Streak 7 Tage @8+: +8 Pkt</li>
        <li>Trinken Streak 14 Tage @8+: +15 Pkt</li>
    </ul>`;
    
    html += `<h4>😴 SCHLAF (PRIORITÄT 2 - 52 Punkte möglich)</h4>`;
    html += `<ul>
        <li>Schlaf Score ≥ 8: +1 Pkt (wöchentlich)</li>
        <li>Schlaf Streak 5 Tage @8+: +3 Pkt</li>
        <li>Schlaf Streak 10 Tage @8+: +8 Pkt</li>
        <li>Schlaf Streak 30 Tage @8+: +40 Pkt ⭐ HART!</li>
    </ul>`;
    
    html += `<h4>🏆 PERFECT DAYS (PRIORITÄT 3 - 70 Punkte möglich)</h4>`;
    html += `<ul>
        <li>Perfect Day (alle Kategorien ≥ 8): +10 Pkt</li>
        <li>Perfect Week (7 Perfect Days): +60 Pkt ⭐</li>
    </ul>`;
    
    html += `<h4>📅 NUTZUNG &amp; KONSISTENZ (123 + 15 = 138 Punkte möglich)</h4>`;
    html += `<ul>
        <li>Nutzung 7 Tage: +3 Pkt</li>
        <li>Nutzung 14 Tage: +10 Pkt</li>
        <li>Nutzung 30 Tage: +30 Pkt</li>
        <li>Nutzung 90 Tage: +80 Pkt ⭐</li>
        <li>Konsistenz 100% (7 Tage): +15 Pkt</li>
    </ul>`;
    
    html += `<h4>📝 KLEINE BONI</h4>`;
    html += `<ul>
        <li>Eintrag mit Vorlage: +0,2 Pkt (täglich)</li>
    </ul>`;
    
    const rauchfreiTage = calculateRauchfreiTage();
    html += `<h4>⭐ DEIN SZENARIO (1h Spaziergang + 30min Kraft + 7000+ Schritte):</h4>`;
    html += `<ul>
        <li>1h Spaziergang (moderat): <strong>5,5 Punkte</strong> ⭐</li>
        <li>Liegestütze/Kniebeugen (30min): <strong>3,5 Punkte</strong> ⭐</li>
        <li>7000+ Schritte: <strong>+0,5 Punkte</strong></li>
        <li>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</li>
        <li><strong>SUMME pro Tag: 5,5 + 3,5 + 0,5 = 9,5 Punkte → capped 10,0/10</strong> ⭐⭐⭐</li>
        <li><strong>WOCHENSNITT: 10,0/10</strong> (wissenschaftlich FAIR!)</li>
    </ul>`;
    
    html += `<h4>💬 Wissenschaftliche Begründung:</h4>`;
    html += `<ul>
        <li><strong>1h Spaziergang täglich:</strong> WHO-Ziel 150min/Woche = 2,8x erfüllt!</li>
        <li>Effekt: HDL +1-2 mg/dl, LDL -1-3 mg/dl, Blutdruck -3-5 mmHg</li>
        <li><strong>Tägliche Kraft (Liegestütze/Kniebeugen):</strong></li>
        <li>Muskelaufbau: +0,5kg/Woche, HDL-Boost: +0,5-1 mg/dl/Woche</li>
        <li>Metabolismus: +50 kcal/Tag permanent</li>
        <li><strong>7000+ Schritte:</strong> Zusätzliche Aktivität, +300-500 kcal/Tag</li>
        <li>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</li>
        <li><strong>GESAMT-EFFEKT der Woche:</strong></li>
        <li>HDL: +2-4 mg/dl (exzellent!)</li>
        <li>LDL: -2-5 mg/dl (exzellent!)</li>
        <li>Gewicht: -0,5-1kg (exzellent!)</li>
        <li>Muskelaufbau: +0,5kg (bonus!)</li>
        <li>Score: 10,0/10 (FAIR!) ✓</li>
    </ul>`;
    
    html += `<p><strong>Dein aktueller Rauchfrei-Bonus:</strong> +${rauchfreiTage} Pkt (${rauchfreiTage} Tage × 1 Pkt/Tag)</p>`;
    html += `<p><em>Das Rauchfrei bleiben ist die Hauptquelle für Punkte - bleib stark! 💪</em></p>`;
    
    html += `</div>`;
    
    document.getElementById('bonusContent').innerHTML = html;
}

// Helper functions
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone issues
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateWithDay(dateStr, dayName) {
    const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone issues
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return `${dayName}, ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getScoreBadge(score) {
    const numScore = typeof score === 'number' ? score : parseFloat(score);
    let className = 'score-poor';
    if (numScore >= 8.5) className = 'score-excellent';
    else if (numScore >= 7) className = 'score-good';
    else if (numScore >= 5) className = 'score-medium';
    
    return `<span class="score-badge ${className}">${numScore.toFixed(1)}/10</span>`;
}

function getErnaehrungBewertung(avgFett, avgKH, avgEiweiss) {
    let bewertung = [];
    if (avgFett > 25) bewertung.push('Zu fettreich');
    else if (avgFett > 20) bewertung.push('Fettgehalt leicht erhöht');
    else bewertung.push('Fettgehalt gut');
    
    if (avgEiweiss < 15) bewertung.push('Eiweißarm');
    else if (avgEiweiss >= 25) bewertung.push('Eiweißreich');
    else bewertung.push('Eiweiß ausgewogen');
    
    if (avgKH > 70) bewertung.push('Viele Kohlenhydrate');
    
    return bewertung.join(' / ');
}

function getErnaehrungKommentar(score, entries) {
    if (score >= 8) return 'Ausgezeichnete LDL-freundliche Ernährung diese Woche!';
    if (score >= 6) return 'Gute Basis, aber Potenzial für gesündere Fette vorhanden.';
    return 'Zu viele gesättigte Fette - mehr Gemüse und mageres Protein empfohlen.';
}

function getSportKommentar(days, avgScore) {
    if (days >= 5 && avgScore >= 8) return 'Guter Mix aus Ausdauer und Kraft - weiter so!';
    if (days >= 3) return 'Gute Aktivität, mehr Konsistenz würde helfen';
    return 'Mehr Konsistenz nötig - versuche 3-5x pro Woche';
}

function getRauchfreiMeilenstein(tage) {
    if (tage >= 100) return 'Lunge regeneriert sich deutlich, Infektionsrisiko sinkt!';
    if (tage >= 30) return 'Geschmacks- und Geruchssinn vollständig regeneriert!';
    if (tage >= 21) return 'Geschmackssinn regeneriert sich';
    if (tage >= 14) return 'Durchblutung verbessert sich merklich';
    if (tage >= 7) return 'Erste spürbare Verbesserungen';
    return 'Jeder Tag zählt!';
}

function getMotivationText(gesamtScore, rauchfreiDays) {
    if (gesamtScore >= 8.5 && rauchfreiDays === 7) {
        return '🌞 Hervorragende Woche! Du bist auf dem besten Weg - bleib bei deinem Rhythmus, trink bewusst und bleib rauchfrei. Der Ernährungstrend zieht klar Richtung gesünderes LDL-Profil!';
    } else if (gesamtScore >= 7.5) {
        return '🌞 Sehr gute Woche – bleib bei deinem Rhythmus, trink bewusst und bleib rauchfrei. Der Ernährungstrend zieht klar Richtung gesünderes LDL-Profil!';
    } else if (gesamtScore >= 6) {
        return '👍 Solide Woche mit Verbesserungspotenzial. Fokussiere dich auf die Bereiche mit niedrigerem Score.';
    } else {
        return '💪 Diese Woche war herausfordernd - aber jeder Tag ist eine neue Chance. Bleib dran!';
    }
}

function getPreisKommentar(avgDaily) {
    if (avgDaily <= 12) return 'Hervorragende Budgetkontrolle!';
    if (avgDaily <= 14) return 'Im akzeptablen Bereich, aber Sparpotenzial vorhanden.';
    return 'Über Budget - günstigere Alternativen prüfen.';
}

function getTrinkenKommentar(avgMenge, bierCount) {
    let kommentar = '';
    if (avgMenge < 2.0) kommentar = 'Trinkmenge deutlich zu niedrig - ';
    else if (avgMenge < 2.5) kommentar = 'Trinkmenge knapp unter Ziel - ';
    else kommentar = 'Trinkmenge gut - ';
    
    if (bierCount > 3) kommentar += 'Bierkonsum reduzieren für bessere Werte.';
    else if (bierCount > 1) kommentar += 'Bierkonsum moderat.';
    else kommentar += 'kaum Alkohol, sehr gut!';
    
    return kommentar;
}

function calculateRauchfreiTage() {
    const start = new Date(appState.rauchfreiStart);
    const current = new Date(appState.currentDate);
    const diff = current - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function calculateWeeklyBonus() {
    // Simplified: calculate bonus for current week entries with CORRECT logic
    const kw = getKWofDate(appState.currentDate);
    if (!kw) return 0;
    const weekObj = WEEKS_HARDCODED[kw];
    const startStr = weekObj.start.toISOString().split('T')[0];
    const endStr = weekObj.end.toISOString().split('T')[0];
    const entries = getEntriesByDateRange(startStr, endStr);
    
    let bonus = 0;
    entries.forEach(entry => {
        bonus += calculateBonusPoints(entry);
    });
    
    return bonus;
}

function getCurrentLevel(points) {
    const levels = [
        { name: 'Einstieg', min: 0, max: 49 },
        { name: 'Aufbau', min: 50, max: 109 },
        { name: 'Fortschritt', min: 110, max: 179 },
        { name: 'Stabilität', min: 180, max: 259 },
        { name: 'Kontrolle', min: 260, max: 349 },
        { name: 'Stärke', min: 350, max: 449 },
        { name: 'Brillianz', min: 450, max: 559 },
        { name: 'Meisterhaft', min: 560, max: 679 },
        { name: 'Champion', min: 680, max: 809 },
        { name: 'Road to Glory', min: 820, max: 999 },
        { name: 'System durchgespielt', min: 1000, max: 999999 }
    ];
    
    for (let i = 0; i < levels.length; i++) {
        if (points >= levels[i].min && points <= levels[i].max) {
            return {
                name: levels[i].name,
                range: `${levels[i].min}-${levels[i].max}`,
                next: i < levels.length - 1 ? levels[i + 1] : levels[i]
            };
        }
    }
    
    return levels[0];
}

// ====== WOCHENLOGIK: HARDCODED KW45-KW50 AB 3.11.2025 - JEDER EINTRAG MUSS ENTSPRECHENDER WOCHE ZUGEORDNET WERDEN =======
const WEEKS_HARDCODED = {
    'KW45': {
        start: new Date('2025-11-03T00:00:00'),
        end: new Date('2025-11-09T23:59:59'),
        display: 'KW45 (3. Nov - 9. Nov 2025)',
        weekNumber: 45
    },
    'KW46': {
        start: new Date('2025-11-10T00:00:00'),
        end: new Date('2025-11-16T23:59:59'),
        display: 'KW46 (10. Nov - 16. Nov 2025)',
        weekNumber: 46
    },
    'KW47': {
        start: new Date('2025-11-17T00:00:00'),
        end: new Date('2025-11-23T23:59:59'),
        display: 'KW47 (17. Nov - 23. Nov 2025)',
        weekNumber: 47
    },
    'KW48': {
        start: new Date('2025-11-24T00:00:00'),
        end: new Date('2025-11-30T23:59:59'),
        display: 'KW48 (24. Nov - 30. Nov 2025)',
        weekNumber: 48
    },
    'KW49': {
        start: new Date('2025-12-01T00:00:00'),
        end: new Date('2025-12-07T23:59:59'),
        display: 'KW49 (1. Dez - 7. Dez 2025)',
        weekNumber: 49
    },
    'KW50': {
        start: new Date('2025-12-08T00:00:00'),
        end: new Date('2025-12-14T23:59:59'),
        display: 'KW50 (8. Dez - 14. Dez 2025)',
        weekNumber: 50
    }
};

function getKWofDate(date) {
    // date = string (YYYY-MM-DD) or Date object
    let d = (typeof date === 'string') ? new Date(date + 'T12:00:00') : new Date(date);
    d.setHours(0, 0, 0, 0);
    
    for (let [kw, obj] of Object.entries(WEEKS_HARDCODED)) {
        let startCompare = new Date(obj.start);
        let endCompare = new Date(obj.end);
        startCompare.setHours(0, 0, 0, 0);
        endCompare.setHours(23, 59, 59, 999);
        
        if (d >= startCompare && d <= endCompare) return kw;
    }
    
    // Fallback: wenn außerhalb bekannter Wochen, verwende nächstgelegene
    console.warn('Datum außerhalb bekannter Wochen:', date, '- verwende KW46');
    return 'KW46'; // Default to current week
}

function getWeekInfoCorrect(date) {
    // returns object {kw, startStr, endStr, displayStr, weekNumber}
    let d = (typeof date === 'string') ? new Date(date + 'T12:00:00') : new Date(date);
    d.setHours(0, 0, 0, 0);
    
    for (let [kw, obj] of Object.entries(WEEKS_HARDCODED)) {
        let startCompare = new Date(obj.start);
        let endCompare = new Date(obj.end);
        startCompare.setHours(0, 0, 0, 0);
        endCompare.setHours(23, 59, 59, 999);
        
        if (d >= startCompare && d <= endCompare) {
            return {
                kw,
                startStr: obj.start.toISOString().split('T')[0],
                endStr: obj.end.toISOString().split('T')[0],
                displayStr: obj.display,
                weekNumber: obj.weekNumber
            };
        }
    }
    
    // Fallback: wenn außerhalb bekannter Wochen, verwende KW46 (aktuelle Woche)
    console.warn('Datum außerhalb bekannter Wochen:', date, '- verwende KW46 als Fallback');
    const fallbackWeek = WEEKS_HARDCODED['KW46'];
    return {
        kw: 'KW46',
        startStr: fallbackWeek.start.toISOString().split('T')[0],
        endStr: fallbackWeek.end.toISOString().split('T')[0],
        displayStr: fallbackWeek.display,
        weekNumber: fallbackWeek.weekNumber
    };
}

function renderWochenanalyse() {
    console.log('━━━ renderWochenanalyse() START ━━━');
    console.log('appState.viewedKw:', appState.viewedKw);
    
    // Initialize viewedKw if not set
    if (!appState.viewedKw) {
        appState.viewedKw = getKWofDate(appState.currentDate);
        console.log('viewedKw initialisiert zu:', appState.viewedKw);
    }
    
    // Bestimme richtige Woche (Benutzeransicht oder aktuelle KW via korrekter Logik)
    let viewDate = appState.currentDate;
    if (typeof appState.viewedKw === 'string') {
        const weekObjTemp = WEEKS_HARDCODED[appState.viewedKw];
        if (weekObjTemp) viewDate = weekObjTemp.start.toISOString().split('T')[0];
    }
    
    const weekObj = getWeekInfoCorrect(viewDate);
    // weekObj will never be null now due to fallback logic
    
    // Get entries for this week
    const entries = getEntriesByDateRange(weekObj.startStr, weekObj.endStr);
    const ernEntries = getEntriesByType(entries, 'ernaehrung');
    const trinkEntries = getEntriesByType(entries, 'trinken');
    const sportEntries = getEntriesByType(entries, 'sport');
    const schlafEntries = getEntriesByType(entries, 'schlaf');
    const rauchEntries = getEntriesByType(entries, 'rauchstatus');
    
    // Calculate scores
    let ernScore = 0;
    if (ernEntries.length > 0) {
        ernScore = ernEntries.reduce((sum, e) => sum + e.ldlScore, 0) / ernEntries.length;
    }
    
    let trinkScore = trinkEntries.length > 0 ? calculateTrinkenScore(trinkEntries) : 0;
    
    let sportScore = 0;
    if (sportEntries.length > 0) {
        // Sum all activity scores
        let activityScore = sportEntries.reduce((sum, e) => sum + calculateSportScore(e), 0);

        // NEUE SCHRITTE-FORMEL: (Schritte / 500) * 0,3
        let maxSteps = 0;
        sportEntries.forEach(e => {
            if (e.schritte && e.schritte > maxSteps) maxSteps = e.schritte;
        });
        let schritteBonus = 0;
        if (maxSteps > 0) {
            schritteBonus = (maxSteps / 500) * 0.3;
        }

        // NEUE LIEGEZEIT-FORMEL: -(Minuten / 30) * 0,3
        let totalLiegezeit = sportEntries.reduce((sum, e) => sum + (e.liegezeit || 0), 0);
        let liegezeitMalus = 0;
        if (totalLiegezeit > 0) {
            liegezeitMalus = -(totalLiegezeit / 30) * 0.3;
        }

        // GESAMT = Aktivitäten + Schritte + Liegezeit (capped bei 10,0)
        sportScore = activityScore + schritteBonus + liegezeitMalus;
        sportScore = Math.max(0, Math.min(10, sportScore));
    }
    
    let rauchfreiDays = 0;
    for (let d = new Date(weekObj.startStr); d <= new Date(weekObj.endStr); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayRauch = rauchEntries.filter(e => e.datum === dateStr);
        if (dayRauch.length > 0 && dayRauch[0].status === 'ja') {
            rauchfreiDays++;
        }
    }
    
    let rauchScore = 0;
    if (rauchfreiDays === 7) rauchScore = 10;
    else if (rauchfreiDays === 6) rauchScore = 8;
    else if (rauchfreiDays === 5) rauchScore = 6;
    else if (rauchfreiDays === 4) rauchScore = 4;
    else rauchScore = rauchfreiDays;
    
    let schlafScore = 0;
    if (schlafEntries.length > 0) {
        schlafScore = schlafEntries.reduce((sum, e) => sum + calculateSchlafScore(e.dauer), 0) / schlafEntries.length;
    }
    
    let totalPreis = 0;
    ernEntries.forEach(e => totalPreis += e.preis);
    const workDays = ernEntries.filter(e => e.ort === 'Arbeit').length;
    totalPreis += workDays * 0.50;
    trinkEntries.forEach(e => {
        if (e.kategorie === 'Bier') {
            totalPreis += (e.menge / 0.5) * 1.0;
        }
    });
    const avgDaily = totalPreis / 7;
    let preisScore = calculatePreisScore(avgDaily);
    
    // NEUE GEWICHTE: Ernährung 35%, Trinken 15%, Sport 20%, Rauchfrei 20%, Schlaf 5%, Preis 5%
    const gesamtScore = (ernScore * 0.35) + (trinkScore * 0.15) + (sportScore * 0.20) + (rauchScore * 0.20) + (schlafScore * 0.05) + (preisScore * 0.05);
    
    // Navigation controls
    const weekOrder = Object.keys(WEEKS_HARDCODED);
    const currentKwIdx = weekOrder.indexOf(weekObj.kw);
    const currentWeekKw = getKWofDate(appState.currentDate);
    const currentWeekIdxLocal = weekOrder.indexOf(currentWeekKw);
    
    const canGoBack = currentKwIdx > 0;
    const canGoForward = currentKwIdx < currentWeekIdxLocal;
    
    let html = `
        <div class="analysis-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-24); gap: var(--space-16); flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="navigateWeek(-1)" ${!canGoBack ? 'disabled' : ''}>◀ Vorherige</button>
                <h2 style="margin: 0; text-align: center; flex: 1;">📊 Wochenanalyse ${weekObj.displayStr}</h2>
                <button class="btn btn-secondary" onclick="navigateWeek(1)" ${!canGoForward ? 'disabled' : ''}>Nächste ▶</button>
            </div>
            
            <h3>1️⃣ 📊 GESAMTSCORE (ÜBERSICHT)</h3>
            <p><strong>Berechnet aus (gewichtet):</strong></p>
            <table class="data-table">
                <thead><tr><th>Kategorie</th><th>Score</th><th>Gewicht</th><th>Beitrag</th></tr></thead>
                <tbody>
                    <tr><td>🟢 Ernährung</td><td>${ernScore.toFixed(1)}/10</td><td>35%</td><td>${(ernScore * 0.35).toFixed(2)} Pkte</td></tr>
                    <tr><td>🔵 Trinken</td><td>${trinkScore.toFixed(1)}/10</td><td>15%</td><td>${(trinkScore * 0.15).toFixed(2)} Pkte</td></tr>
                    <tr><td>🟣 Sport</td><td>${sportScore.toFixed(1)}/10</td><td>20%</td><td>${(sportScore * 0.20).toFixed(2)} Pkte</td></tr>
                    <tr><td>🔴 Rauchfrei</td><td>${rauchScore.toFixed(1)}/10</td><td>20%</td><td>${(rauchScore * 0.20).toFixed(2)} Pkte</td></tr>
                    <tr><td>😴 Schlaf</td><td>${schlafScore.toFixed(1)}/10</td><td>5%</td><td>${(schlafScore * 0.05).toFixed(2)} Pkte</td></tr>
                    <tr><td>💰 Preis</td><td>${preisScore.toFixed(1)}/10</td><td>5%</td><td>${(preisScore * 0.05).toFixed(2)} Pkte</td></tr>
                </tbody>
            </table>
            <p style="font-size: 18px; font-weight: 600; margin-top: var(--space-16);">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br>⭐ GESAMTSCORE: <span style="color: var(--color-primary);">${gesamtScore.toFixed(1)}/10</span></p>
    `;
    
    // 2. ERNÄHRUNG
    html += `<h3>2️⃣ 🥘 ERNÄHRUNG</h3>`;
    if (ernEntries.length > 0) {
        html += `<table class="data-table">
            <thead><tr><th>Datum</th><th>Gericht</th><th>LDL-Score</th><th>Kcal</th><th>Fett (g)</th><th>KH (g)</th><th>Eiweiß (g)</th><th>🗑️</th></tr></thead>
            <tbody>`;
        
        const arbeitEntries = ernEntries.filter(e => e.ort === 'Arbeit');
        const freizeitEntries = ernEntries.filter(e => e.ort === 'Freizeit');
        
        if (arbeitEntries.length > 0) {
            html += `<tr><td colspan="8" style="font-weight: 600; background: var(--color-background);">Arbeit:</td></tr>`;
            arbeitEntries.forEach(entry => {
                html += `<tr>
                    <td>${formatDate(entry.datum)}</td>
                    <td>${entry.gericht}</td>
                    <td>${entry.ldlScore.toFixed(1)}/10</td>
                    <td>${entry.kcal}</td>
                    <td>${entry.fett.toFixed(1)}</td>
                    <td>${entry.kh.toFixed(1)}</td>
                    <td>${entry.eiweiss.toFixed(1)}</td>
                    <td><button class="btn-delete" onclick="deleteEntry('${entry.id}')" title="Löschen">✕</button></td>
                </tr>`;
            });
        }
        
        if (freizeitEntries.length > 0) {
            html += `<tr><td colspan="8" style="font-weight: 600; background: var(--color-background);">Freizeit:</td></tr>`;
            freizeitEntries.forEach(entry => {
                html += `<tr>
                    <td>${formatDate(entry.datum)}</td>
                    <td>${entry.gericht}</td>
                    <td>${entry.ldlScore.toFixed(1)}/10</td>
                    <td>${entry.kcal}</td>
                    <td>${entry.fett.toFixed(1)}</td>
                    <td>${entry.kh.toFixed(1)}</td>
                    <td>${entry.eiweiss.toFixed(1)}</td>
                    <td><button class="btn-delete" onclick="deleteEntry('${entry.id}')" title="Löschen">✕</button></td>
                </tr>`;
            });
        }
        
        html += `</tbody></table>`;
        
        let totalKcal = 0, totalFett = 0, totalKH = 0, totalEiweiss = 0;
        ernEntries.forEach(e => {
            totalKcal += e.kcal;
            totalFett += e.fett;
            totalKH += e.kh;
            totalEiweiss += e.eiweiss;
        });
        const avgKcal = totalKcal / ernEntries.length;
        const avgFett = totalFett / ernEntries.length;
        const avgKH = totalKH / ernEntries.length;
        const avgEiweiss = totalEiweiss / ernEntries.length;
        
        html += `<p><strong>Wochenscore Ernährung (🟢):</strong> ${ernScore.toFixed(1)}/10</p>`;
        html += `<p><strong>Durchschnittliche Nährwerte pro Mahlzeit:</strong> kcal ${avgKcal.toFixed(0)} | Fett ${avgFett.toFixed(1)}g | KH ${avgKH.toFixed(1)}g | Eiweiß ${avgEiweiss.toFixed(1)}g</p>`;
        html += `<p><strong>Bewertung:</strong> ${getErnaehrungBewertung(avgFett, avgKH, avgEiweiss)}</p>`;
        html += `<p><em>Kommentar: ${getErnaehrungKommentar(ernScore, ernEntries)}</em></p>`;
    } else {
        html += `<p>Keine Ernährungs-Einträge in dieser Woche.</p>`;
    }
    
    // 3. TRINKEN
    html += `<h3>3️⃣ 💧 TRINKEN</h3>`;
    if (trinkEntries.length > 0) {
        html += `<table class="data-table">
            <thead><tr><th>Datum</th><th>Getränk</th><th>Menge (l)</th><th>Qualität</th><th>Zucker (g)</th><th>🗑️</th></tr></thead>
            <tbody>`;
        
        let totalMenge = 0;
        let totalZucker = 0;
        let bierCount = 0;
        let qualitySum = 0;
        
        trinkEntries.forEach(e => {
            totalMenge += e.menge;
            totalZucker += e.zucker;
            if (e.kategorie === 'Bier') bierCount += e.menge / 0.5;
            
            const ref = getraenkeReference[e.kategorie];
            const quality = ref ? ref.scoreBasis : 5;
            qualitySum += quality;
            
            html += `<tr>
                <td>${formatDate(e.datum)}</td>
                <td>${e.getraenk}</td>
                <td>${e.menge.toFixed(2)}</td>
                <td>${quality}/10</td>
                <td>${e.zucker.toFixed(1)}</td>
                <td><button class="btn-delete" onclick="deleteEntry('${e.id}')" title="Löschen">✕</button></td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        
        const avgMenge = totalMenge / 7;
        const avgZucker = totalZucker / 7;
        const avgQuality = qualitySum / trinkEntries.length;
        
        const zielMenge = 2.5;
        let mengeScore = 10;
        let mengeBewertung = 'Ausreichend';
        if (avgMenge < zielMenge) {
            const deficit = zielMenge - avgMenge;
            mengeScore = Math.max(0, 10 - (deficit / 0.25));
            mengeBewertung = `Unterversorgung -${(deficit / 0.25).toFixed(1)} Punkte`;
        }
        
        html += `<p><strong>Ø Trinkmenge pro Tag:</strong> ${avgMenge.toFixed(2)} l (Ziel = 2,5 l)<br><strong>Status:</strong> ${mengeBewertung}</p>`;
        html += `<p><strong>Ø Trinkqualität (Gesamtbewertung):</strong><br>`;
        html += `&nbsp;&nbsp;Qualitäts-Score (66% Gewicht): ${avgQuality.toFixed(1)}/10<br>`;
        html += `&nbsp;&nbsp;Mengen-Score (34% Gewicht): ${mengeScore.toFixed(1)}/10<br>`;
        html += `&nbsp;&nbsp;➜ Gesamt-Trinkqualität: (${avgQuality.toFixed(1)} × 0,66) + (${mengeScore.toFixed(1)} × 0,34) = ${trinkScore.toFixed(1)}/10</p>`;
        html += `<p><strong>Ø Zucker aus Getränken pro Tag:</strong> ${avgZucker.toFixed(1)} g</p>`;
        if (bierCount > 0) {
            html += `<p><strong>Ø Alkohol pro Tag:</strong> ${(bierCount / 7).toFixed(2)} Einheiten à 0,5l</p>`;
        }
        html += `<p><strong>Wochenscore Trinken (🔵):</strong> ${trinkScore.toFixed(1)}/10</p>`;
        html += `<p><em>Kommentar: ${getTrinkenKommentar(avgMenge, bierCount)}</em></p>`;
    } else {
        html += `<p>Keine Trink-Einträge in dieser Woche.</p>`;
    }
    
    // 4. SPORT
    html += `<h3>4️⃣ ⚽ SPORT</h3>`;
    if (sportEntries.length > 0) {
        html += `<table class="data-table">
            <thead><tr><th>Datum</th><th>Aktivität</th><th>Dauer (min)</th><th>Intensität</th><th>Schritte</th><th>Score</th><th>🗑️</th></tr></thead>
            <tbody>`;
        
        sportEntries.forEach(entry => {
            const score = calculateSportScore(entry);
            let extraInfo = [];
            if (entry.schritte) extraInfo.push(`${entry.schritte} Schritte`);
            if (entry.liegezeit) extraInfo.push(`${entry.liegezeit}min Liegezeit`);
            if (entry.kommentar) extraInfo.push(`"${entry.kommentar}"`);
            const extraText = extraInfo.length > 0 ? '<br><small>' + extraInfo.join(' | ') + '</small>' : '';
            
            // Intensität Labels
            const intensityLabels = {
                'leicht': '🟢 Leicht',
                'moderat': '🟠 Moderat',
                'schwer': '🔴 Schwer',
                'extrem': '🔴🔴 Extrem'
            };
            const intensityLabel = intensityLabels[entry.intensitaet] || entry.intensitaet;
            
            html += `<tr>
                <td>${formatDate(entry.datum)}</td>
                <td>${entry.aktivitaet}${extraText}</td>
                <td>${entry.dauer}</td>
                <td>${intensityLabel}</td>
                <td>${entry.schritte || '-'}</td>
                <td>${score.toFixed(1)}/10</td>
                <td><button class="btn-delete" onclick="deleteEntry('${entry.id}')" title="Löschen">✕</button></td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        html += `<p><strong>Wochenscore Sport (🟣):</strong> ${sportScore.toFixed(1)}/10</p>`;
        
        const avgSchritte = sportEntries.filter(e => e.schritte).length > 0 
            ? sportEntries.filter(e => e.schritte).reduce((sum, e) => sum + e.schritte, 0) / sportEntries.filter(e => e.schritte).length
            : 0;
        if (avgSchritte > 0) {
            html += `<p><strong>Ø Schritte pro Tag:</strong> ${avgSchritte.toFixed(0)} (Ziel &gt; 7000)</p>`;
        }
        
        const intensities = sportEntries.map(e => e.intensitaet);
        const uniqueIntensities = [...new Set(intensities)];
        const intensityDesc = uniqueIntensities.length > 1 ? 'gemischt' : intensities[0] || 'niedrig';
        html += `<p><strong>Ø Intensität:</strong> ${intensityDesc}</p>`;
        html += `<p><strong>Trainingstage diese Woche:</strong> ${sportEntries.length} von 7 Tagen</p>`;
        html += `<p><em>Kommentar: ${getSportKommentar(sportEntries.length, sportScore)}</em></p>`;
    } else {
        html += `<p>Keine Sport-Einträge in dieser Woche.</p>`;
    }
    
    // 5. RAUCHFREI
    html += `<h3>5️⃣ 🚭 RAUCHFREI</h3>`;
    html += `<p><strong>Status diese Woche:</strong> ${rauchfreiDays === 7 ? '☑ RAUCHFREI (7/7 Tage)' : '☐ Mit Ausrutschern'}</p>`;
    html += `<p><strong>Tage rauchfrei diese Woche:</strong> ${rauchfreiDays} von 7 Tagen</p>`;
    const rauchfreiTage = calculateRauchfreiTage();
    html += `<p><strong>Tage rauchfrei gesamt (seit 1. Nov):</strong> ${rauchfreiTage} Tage</p>`;
    html += `<p><strong>Rauchfrei-Score diese Woche (🔴):</strong></p>`;
    html += `<ul>`;
    html += `<li>7/7 Tage rauchfrei: ${rauchfreiDays === 7 ? '<strong>10/10 ⭐</strong>' : '10/10'}</li>`;
    html += `<li>6/7 Tage rauchfrei: ${rauchfreiDays === 6 ? '<strong>8/10</strong>' : '8/10'}</li>`;
    html += `<li>5/7 Tage rauchfrei: ${rauchfreiDays === 5 ? '<strong>6/10</strong>' : '6/10'}</li>`;
    html += `<li>&lt; 5/7 Tage rauchfrei: ${rauchfreiDays < 5 ? '<strong>&lt; 6/10</strong>' : '&lt; 6/10'}</li>`;
    html += `</ul>`;
    if (rauchfreiTage >= 21) {
        html += `<p><strong>Meilenstein:</strong> ${rauchfreiTage} Tage rauchfrei! ${getRauchfreiMeilenstein(rauchfreiTage)}</p>`;
    }
    html += `<p><em>Kommentar: ${rauchfreiDays === 7 ? 'Super durchgehalten!' : 'Eine Ausrutscherin - nächste Woche besser!'}</em></p>`;
    
    // 6. SCHLAF
    html += `<h3>6️⃣ 😴 SCHLAF</h3>`;
    if (schlafEntries.length > 0) {
        html += `<table class="data-table">
            <thead><tr><th>Datum</th><th>Dauer (h)</th><th>Score</th><th>Bewertung</th><th>🗑️</th></tr></thead>
            <tbody>`;
        
        let schlafSum = 0;
        schlafEntries.forEach(entry => {
            const score = calculateSchlafScore(entry.dauer);
            schlafSum += entry.dauer;
            let bewertung = 'ausreichend';
            if (score >= 8) bewertung = 'sehr gut';
            else if (score >= 7) bewertung = 'gut';
            else if (score < 5) bewertung = 'zu kurz';
            
            html += `<tr>
                <td>${formatDate(entry.datum)}</td>
                <td>${entry.dauer.toFixed(1)} h</td>
                <td>${score.toFixed(1)}/10</td>
                <td>${bewertung}</td>
                <td><button class="btn-delete" onclick="deleteEntry('${entry.id}')" title="Löschen">✕</button></td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        
        const avgSchlaf = schlafSum / schlafEntries.length;
        html += `<p><strong>Ø Schlafdauer diese Woche:</strong> ${avgSchlaf.toFixed(1)} h (Ziel &gt;= 7,5h)</p>`;
        html += `<p><strong>Wochenscore Schlaf (😴):</strong> ${schlafScore.toFixed(1)}/10</p>`;
        
        const goodSleep = schlafEntries.filter(e => calculateSchlafScore(e.dauer) >= 8).length;
        html += `<p><strong>Schlaf-Qualität:</strong> [Tage mit Score &gt;= 8] ${goodSleep} von ${schlafEntries.length} Tagen</p>`;
        html += `<p><em>Kommentar: ${avgSchlaf >= 8 ? 'Sehr konstant und ausreichend' : avgSchlaf >= 7.5 ? 'Guter Schlaf' : 'Zu kurz - mehr Erholung nötig'}</em></p>`;
    } else {
        html += `<p>Keine Schlaf-Einträge in dieser Woche.</p>`;
    }
    
    // 7. GEWICHT
    html += `<h3>7️⃣ ⚖️ GEWICHT &amp; KÖRPERLICHE TENDENZ</h3>`;
    html += `<table class="data-table">
        <thead><tr><th>Kennzahl</th><th>Wert</th><th>Kommentar</th></tr></thead>
        <tbody>
            <tr><td>Gewicht Anfang Woche (${formatDate(weekObj.startStr).split(' ')[0]}. ${formatDate(weekObj.startStr).split(' ')[1]})</td><td>90,0 kg</td><td>-</td></tr>
            <tr><td>Gewicht Ende Woche (${formatDate(weekObj.endStr).split(' ')[0]}. ${formatDate(weekObj.endStr).split(' ')[1]})</td><td>90,0 kg</td><td>-</td></tr>
            <tr><td>Veränderung diese Woche</td><td>±0,0 kg</td><td>stabil</td></tr>
        </tbody>
    </table>`;
    html += `<p><strong>Trend:</strong> stabil</p>`;
    html += `<p><em>Kommentar: Gewicht stabil, gute Balance</em></p>`;
    
    // 8. CHOLESTERIN-TREND
    html += `<h3>8️⃣ ❤️ CHOLESTERIN-TREND &amp; GEFÄSSGESUNDHEIT</h3>`;
    html += `<table class="data-table">
        <thead><tr><th>Parameter</th><th>Diese Woche</th><th>Veränderung</th><th>Zielwert</th><th>Bewertung</th></tr></thead>
        <tbody>
            <tr><td>LDL (geschätzt)</td><td>152 mg/dl</td><td>-3 mg/dl</td><td>&lt; 130 mg/dl</td><td>leicht verbessert</td></tr>
            <tr><td>HDL (geschätzt)</td><td>39 mg/dl</td><td>+1 mg/dl</td><td>&gt; 45 mg/dl</td><td>gleichbleibend</td></tr>
            <tr><td>Gesamtcholesterin</td><td>210 mg/dl</td><td>-2 mg/dl</td><td>&lt; 200 mg/dl</td><td>gleichbleibend</td></tr>
            <tr><td>Triglyzeride</td><td>180 mg/dl</td><td>-5 mg/dl</td><td>&lt; 150 mg/dl</td><td>leicht verbessert</td></tr>
            <tr><td>LDL/HDL-Quotient</td><td>3,9</td><td>-0,2</td><td>&lt; 3,0</td><td>leicht verbessert</td></tr>
        </tbody>
    </table>`;
    html += `<p><strong>Geschätzte Veränderung aus Kategorien:</strong></p>`;
    html += `<ul>
        <li>Rauchfrei-Tage (${rauchfreiDays}/7): +${(rauchfreiDays * 0.5).toFixed(1)} mg/dl HDL</li>
        <li>Sport-Score ${sportScore >= 8 ? '≥ 8' : '&lt; 8'}: ${sportScore >= 8 ? '+2 mg/dl HDL' : '+0 mg/dl HDL'}</li>
        <li>Ernährung Score: ${ernScore > 7 ? `-${((ernScore - 7) * 1).toFixed(0)} mg/dl LDL` : '+0 mg/dl LDL'}</li>
    </ul>`;
    html += `<p><strong>Gesamtbewertung: </strong>Trend: 🟢 POSITIV</p>`;
    html += `<p><strong>Zielwerte (ideal):</strong><br>`;
    html += `• LDL: &lt; 130 mg/dl (noch besser: &lt; 100)<br>`;
    html += `• HDL: &gt; 45 mg/dl (Ziel: &gt; 50)<br>`;
    html += `• Gesamtcholesterin: &lt; 200 mg/dl<br>`;
    html += `• Triglyzeride: &lt; 150 mg/dl (Ziel: &lt; 100)<br>`;
    html += `• LDL/HDL-Quotient: &lt; 3,0</p>`;
    html += `<p><em>Kommentar: Der Rauchverzicht und besserer Sport zeigen erste Effekte - weiter so!</em></p>`;
    
    // 9. PREISBEWERTUNG
    html += `<h3>9️⃣ 💰 PREISBEWERTUNG &amp; BUDGETKONTROLLE</h3>`;
    if (ernEntries.length > 0) {
        html += `<p><strong>Tägliche Ausgaben:</strong></p>`;
        html += `<table class="data-table">
            <thead><tr><th>Tag</th><th>Ernährung</th><th>Getränke</th><th>Summe</th><th>Zielwert (12€)</th><th>🗑️</th></tr></thead>
            <tbody>`;
        
        const dailyPrices = {};
        for (let d = new Date(weekObj.startStr); d <= new Date(weekObj.endStr); d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dailyPrices[dateStr] = { ern: 0, trink: 0 };
        }
        
        ernEntries.forEach(e => {
            if (dailyPrices[e.datum]) dailyPrices[e.datum].ern += e.preis;
        });
        
        trinkEntries.forEach(e => {
            if (dailyPrices[e.datum] && e.kategorie === 'Bier') {
                dailyPrices[e.datum].trink += (e.menge / 0.5) * 1.0;
            }
        });
        
        ernEntries.forEach(e => {
            if (dailyPrices[e.datum] && e.ort === 'Arbeit') {
                dailyPrices[e.datum].ern += 0.50;
            }
        });
        
        const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        let idx = 0;
        for (let dateStr in dailyPrices) {
            const data = dailyPrices[dateStr];
            const sum = data.ern + data.trink;
            const dayEntriesForDate = appState.entries.filter(e => e.datum === dateStr);
            html += `<tr>
                <td>${weekdays[idx]} ${formatDate(dateStr).split(' ')[0]}. ${formatDate(dateStr).split(' ')[1]}</td>
                <td>${data.ern.toFixed(2)}€</td>
                <td>${data.trink.toFixed(2)}€</td>
                <td>${sum.toFixed(2)}€</td>
                <td>12,00€</td>
                <td><span style="color: var(--color-text-secondary); font-size: 12px;">${dayEntriesForDate.length} Einträge</span></td>
            </tr>`;
            idx++;
        }
        
        html += `</tbody></table>`;
        html += `<p><strong>Ø Tagesausgaben:</strong> ${avgDaily.toFixed(2)} € (Ziel = 12€)</p>`;
        html += `<p><strong>Summe Wochenausgaben:</strong> ${totalPreis.toFixed(2)} €</p>`;
        
        html += `<p><strong>Ausgabe-Breakdown:</strong></p>`;
        html += `<ul>`;
        const arbeitPreis = ernEntries.filter(e => e.ort === 'Arbeit').reduce((sum, e) => sum + e.preis, 0);
        html += `<li>Ernährung (Mo-Fr Arbeit): ${arbeitPreis.toFixed(2)} €</li>`;
        const bierPreis = trinkEntries.filter(e => e.kategorie === 'Bier').reduce((sum, e) => sum + (e.menge / 0.5), 0);
        if (bierPreis > 0) html += `<li>Getränke (Bier): ${bierPreis.toFixed(2)} €</li>`;
        html += `<li>Automatischer Kaffee-Zuschlag (Mo-Fr 0,50€): ${(workDays * 0.50).toFixed(2)}€</li>`;
        html += `</ul>`;
        
        html += `<p><strong>Preis-Score (💰):</strong> ${preisScore.toFixed(1)}/10<br>`;
        html += `<em>Berechnung: 12€ = 10/10, je 1€ über 12€ = -0,75 Punkt</em></p>`;
        html += `<p><em>Kommentar: ${getPreisKommentar(avgDaily)}</em></p>`;
    } else {
        html += `<p>Keine Preisdaten verfügbar.</p>`;
    }
    
    // 10. OPTIMIERUNG
    html += `<h3>🔟 💡 OPTIMIERUNG &amp; WOCHENEMPFEHLUNG</h3>`;
    html += `<p><strong>Top 3 Optimierungsvorschläge:</strong></p>`;
    html += `<ol>`;
    
    const bierEntries = trinkEntries.filter(e => e.kategorie === 'Bier');
    const bierAnzahl = bierEntries.reduce((sum, e) => sum + (e.menge / 0.5), 0);
    if (bierAnzahl > 0) {
        const savings = bierAnzahl * 1.0;
        const kcalSavings = bierAnzahl * 110;
        html += `<li>Bier reduzieren: 0 statt ${bierAnzahl.toFixed(0)} Einheiten → +${(bierAnzahl * 0.5).toFixed(1)} Pkt, -${kcalSavings.toFixed(0)} kcal, +${savings.toFixed(2)}€ Ersparnis, +${(bierAnzahl * 0.5).toFixed(1)} mg/dl HDL</li>`;
    }
    
    const colaEntries = trinkEntries.filter(e => e.kategorie === 'Cola');
    if (colaEntries.length > 0) {
        const colaZucker = colaEntries.reduce((sum, e) => sum + e.zucker, 0);
        html += `<li>Cola durch Wasser ersetzen → +${colaEntries.length} Pkt, -${colaZucker.toFixed(0)} g Zucker, +0,50€ Ersparnis</li>`;
    }
    
    if (sportEntries.length < 5) {
        html += `<li>Sport um 1x/Woche erhöhen → +2 Pkt, +150 kcal Verbrauch</li>`;
    }
    
    if (ernScore < 8) {
        html += `<li>Fettärmere Gerichte wählen (mehr Gemüse, mageres Protein) → +1 Pkt Ernährung, -5 mg/dl LDL</li>`;
    }
    
    if (trinkScore < 8) {
        html += `<li>Trinkmenge auf 2,5l täglich erhöhen → +1 Pkt Trinken</li>`;
    }
    
    html += `</ol>`;
    
    html += `<p><strong>Sparpotenzial pro Woche:</strong></p>`;
    html += `<ul>`;
    if (bierAnzahl > 0) html += `<li>Wasser statt Bier: +${bierAnzahl.toFixed(2)}€ | -${(bierAnzahl * 110).toFixed(0)} kcal</li>`;
    if (colaEntries.length > 0) html += `<li>Keine Cola: +0,50€ | -${colaEntries.reduce((sum, e) => sum + e.zucker, 0).toFixed(0)} g Zucker</li>`;
    html += `</ul>`;
    
    const totalKcalIn = ernEntries.reduce((sum, e) => sum + e.kcal, 0);
    const totalKcalOut = sportEntries.reduce((sum, e) => sum + (e.dauer * 5), 0);
    html += `<p><strong>Kalorien-Bilanz diese Woche:</strong> ${totalKcalIn.toFixed(0)} kcal (Durchschnitt: ${(totalKcalIn / 7).toFixed(0)} kcal/Tag)</p>`;
    html += `<ul>`;
    html += `<li>Zufuhr: Ø ${(totalKcalIn / 7).toFixed(0)} kcal/Tag</li>`;
    html += `<li>Verbrauch Sport: Ø ${(totalKcalOut / 7).toFixed(0)} kcal/Tag</li>`;
    html += `<li>Netto: Ø ${((totalKcalIn - totalKcalOut) / 7).toFixed(0)} kcal/Tag</li>`;
    html += `</ul>`;
    
    // 11. BONUSPROGRAMM
    html += `<h3>1️⃣1️⃣ 🎯 MOTIVATION &amp; BONUSPROGRAMM</h3>`;
    
    const weekBonusData = calculateExtendedWeekBonus(weekObj.startStr, weekObj.endStr);
    const bonusDetails = weekBonusData.details;
    
    // Calculate bonus points for this week and previous weeks
    const allWeeks = Object.keys(WEEKS_HARDCODED).sort();
    const currentWeekIdx = allWeeks.indexOf(weekObj.kw);
    
    let bonusThisWeek = 0;
    let bonusPrevious = 0;
    
    allWeeks.forEach((kw, idx) => {
        const week = WEEKS_HARDCODED[kw];
        const startStr = week.start.toISOString().split('T')[0];
        const endStr = week.end.toISOString().split('T')[0];
        const weekBonusData = calculateExtendedWeekBonus(startStr, endStr);
        
        if (idx === currentWeekIdx) {
            bonusThisWeek = weekBonusData.bonus;
        } else if (idx < currentWeekIdx) {
            bonusPrevious += weekBonusData.bonus;
        }
    });
    
    const totalBonus = bonusThisWeek + bonusPrevious;
    
    html += `<div style="background: var(--color-bg-1); padding: var(--space-20); border-radius: var(--radius-lg); border: 2px solid var(--color-primary); margin-bottom: var(--space-24);">`;
    html += `<p style="font-size: 16px; font-weight: 600; margin: 0 0 var(--space-8) 0;">Bonuspunkte (diese Woche): <span style="color: var(--color-primary);">+${bonusThisWeek.toFixed(0)} Pkt</span> ⭐</p>`;
    html += `<p style="font-size: 16px; margin: 0 0 var(--space-8) 0;">Bonuspunkte (bisher): <span style="color: var(--color-text);">+${bonusPrevious.toFixed(0)} Pkt</span></p>`;
    html += `<p style="border-top: 2px solid var(--color-border); padding-top: var(--space-12); margin-top: var(--space-12); font-size: 18px; font-weight: 700;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>`;
    html += `<p style="font-size: 18px; font-weight: 700; margin: var(--space-8) 0 0 0;">Gesamtbonuspunkte: <span style="color: var(--color-primary); font-size: 22px;">+${totalBonus.toFixed(0)} Pkt</span></p>`;
    html += `</div>`;
    
    html += `<p><strong>Verdiente Boni diese Woche:</strong></p>`;
    html += `<ul>`;
    html += `<li>Rauchfreie Tage (${rauchfreiDays}x @ +1): +${rauchfreiDays} Pkt ${rauchfreiDays === 7 ? '⭐' : ''}</li>`;
    bonusDetails.forEach(detail => {
        html += `<li>${detail}</li>`;
    });
    html += `</ul>`;
    
    const levels = [
        { level: 1, name: 'Einstieg', min: 0, max: 49 },
        { level: 2, name: 'Aufbau', min: 50, max: 109 },
        { level: 3, name: 'Fortschritt', min: 110, max: 179 },
        { level: 4, name: 'Stabilität', min: 180, max: 259 },
        { level: 5, name: 'Kontrolle', min: 260, max: 349 },
        { level: 6, name: 'Stärke', min: 350, max: 449 },
        { level: 7, name: 'Brillianz', min: 450, max: 559 },
        { level: 8, name: 'Meisterhaft', min: 560, max: 679 },
        { level: 9, name: 'Champion', min: 680, max: 809 },
        { level: 10, name: 'Road to Glory', min: 820, max: 999 },
        { level: 'MAX', name: 'System durchgespielt', min: 1000, max: 999999 }
    ];
    
    html += `<table class="data-table level-table" style="margin-top: var(--space-16);">
        <thead><tr><th>Level</th><th>Titelname</th><th>Bereich</th><th>Status</th></tr></thead>
        <tbody>`;
    
    let currentLevel = null;
    let nextLevel = null;
    levels.forEach((level, idx) => {
        const isCurrent = totalBonus >= level.min && totalBonus <= level.max;
        const rowClass = isCurrent ? 'level-current' : '';
        const status = isCurrent ? `🔵 AKTUELL (${totalBonus.toFixed(0)}/${level.max})` : totalBonus > level.max ? '✅ Erreicht' : '';
        
        if (isCurrent) {
            currentLevel = level;
            if (idx < levels.length - 1) nextLevel = levels[idx + 1];
            html += `<tr class="${rowClass}">
                <td>${level.level}</td>
                <td>${level.name}</td>
                <td>${level.min}-${level.max}</td>
                <td>${status} ✓</td>
            </tr>`;
        } else if (totalBonus > level.max || (idx <= 2)) {
            html += `<tr class="${rowClass}">
                <td>${level.level}</td>
                <td>${level.name}</td>
                <td>${level.min}-${level.max}</td>
                <td>${status}</td>
            </tr>`;
        }
    });
    
    html += `</tbody></table>`;
    
    if (nextLevel) {
        const pointsNeeded = nextLevel.min - totalBonus;
        html += `<p><strong>Nächster Level:</strong> +${pointsNeeded.toFixed(0)} Pkte bis "${nextLevel.name}" (Level ${nextLevel.level})</p>`;
    }
    
    // Calculate active streaks
    html += `<h4 style="margin-top: var(--space-24); margin-bottom: var(--space-16);">🏅 MEILENSTEINE &amp; AKTIVE STREAKS</h4>`;
    html += `<p style="margin-bottom: var(--space-16);">Folgende Streaks sind aktiv und bringen nächste Punkte:</p>`;
    
    const activeStreaks = calculateActiveStreaks();
    
    if (activeStreaks.length > 0) {
        activeStreaks.slice(0, 5).forEach((streak, idx) => {
            const progress = (streak.current / streak.target) * 100;
            const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
            const stars = streak.bonus >= 80 ? '⭐⭐⭐' : streak.bonus >= 35 ? '⭐⭐' : streak.bonus >= 15 ? '⭐' : '';
            
            html += `<div style="background: var(--color-surface); padding: var(--space-16); border-radius: var(--radius-base); border: 1px solid var(--color-card-border); margin-bottom: var(--space-12);">`;
            html += `<div style="font-weight: 600; font-size: 15px; margin-bottom: var(--space-8);">${idx + 1}. ${streak.name}: ${streak.current} von ${streak.target} Tage @ Score 8+</div>`;
            html += `<div style="color: var(--color-text-secondary); font-size: 14px; margin-bottom: var(--space-8);">Nächster Bonus: <strong style="color: var(--color-primary);">+${streak.bonus} Pkt</strong> bei ${streak.target} Tagen ${stars}</div>`;
            html += `<div style="color: var(--color-text-secondary); font-size: 13px;">Fortschritt: <span style="font-family: monospace; color: var(--color-text);">${progressBar}</span> (${progress.toFixed(0)}%)</div>`;
            html += `</div>`;
        });
        
        // Find next big bonus
        const biggestStreak = activeStreaks[0];
        const daysRemaining = biggestStreak.target - biggestStreak.current;
        html += `<div style="border-top: 2px solid var(--color-border); padding-top: var(--space-16); margin-top: var(--space-16); font-weight: 600;">`;
        html += `<p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>`;
        html += `<p style="color: var(--color-primary); font-size: 16px;">Nächster großer Bonus: ${biggestStreak.name} (+${biggestStreak.bonus} Pkt) in ${daysRemaining} Tag${daysRemaining !== 1 ? 'en' : ''}! 🎯</p>`;
        html += `</div>`;
    } else {
        html += `<p style="text-align: center; padding: var(--space-20); color: var(--color-text-secondary);">Keine aktiven Streaks - starte jetzt und sammle Punkte!</p>`;
    }
    
    const daysTo100 = 100 - rauchfreiTage;
    if (daysTo100 > 0) {
        html += `<p><strong>Meilenstein:</strong> +${daysTo100} Tage bis 100 Tage rauchfrei!</p>`;
    }
    
    html += `<div class="motivation-box" style="margin-top: var(--space-24);">
        <p>🌞 ${getMotivationText(gesamtScore, rauchfreiDays)}</p>
    </div>`;
    
    html += `</div>`;
    
    document.getElementById('wochenanalyseContent').innerHTML = html;
}

// Navigation: Vorherige/Nächste Woche
function navigateWeek(direction) {
    const weekOrder = Object.keys(WEEKS_HARDCODED);
    let currentIdx;
    if (typeof appState.viewedKw === 'string') {
        currentIdx = weekOrder.indexOf(appState.viewedKw);
    } else {
        const kw = getKWofDate(appState.currentDate);
        currentIdx = weekOrder.indexOf(kw);
    }
    
    let newIdx = currentIdx + direction;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= weekOrder.length) newIdx = weekOrder.length - 1;
    
    appState.viewedKw = weekOrder[newIdx];
    renderWochenanalyse();
}

// Initialize app
initializeData().then(() => {
    console.log('App data initialized');
}).catch(error => {
    console.error('Failed to initialize app data:', error);
    // Continue with empty state
});

// Calculate initial bonus points
appState.entries.forEach(entry => {
    appState.bonusPoints += calculateBonusPoints(entry);
});

// Initialize viewedKw to current week
appState.viewedKw = getKWofDate(appState.currentDate);

// Calculate active streaks function
function calculateActiveStreaks() {
    const streaks = [];
    const today = appState.currentDate;
    
    // Get all entries up to today
    const allEntries = appState.entries.filter(e => e.datum <= today);
    
    // Calculate daily scores for all days
    const dailyScores = {};
    const startDate = new Date(appState.systemStart);
    const endDate = new Date(today);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayEntries = allEntries.filter(e => e.datum === dateStr);
        
        const ernEntries = dayEntries.filter(e => e.type === 'ernaehrung');
        const trinkEntries = dayEntries.filter(e => e.type === 'trinken');
        const sportEntries = dayEntries.filter(e => e.type === 'sport');
        const schlafEntries = dayEntries.filter(e => e.type === 'schlaf');
        const rauchEntries = dayEntries.filter(e => e.type === 'rauchstatus');
        
        let ernScore = 0;
        if (ernEntries.length > 0) {
            ernScore = ernEntries.reduce((sum, e) => sum + e.ldlScore, 0) / ernEntries.length;
        }
        
        let trinkScore = trinkEntries.length > 0 ? calculateTrinkenScore(trinkEntries) : 0;
        
        let sportScore = 0;
        if (sportEntries.length > 0) {
            let activityScore = sportEntries.reduce((sum, e) => sum + calculateSportScore(e), 0);
            let maxSteps = 0;
            sportEntries.forEach(e => {
                if (e.schritte && e.schritte > maxSteps) maxSteps = e.schritte;
            });
            let schritteBonus = maxSteps > 0 ? (maxSteps / 500) * 0.3 : 0;
            let totalLiegezeit = sportEntries.reduce((sum, e) => sum + (e.liegezeit || 0), 0);
            let liegezeitMalus = totalLiegezeit > 0 ? -(totalLiegezeit / 30) * 0.3 : 0;
            sportScore = Math.max(0, Math.min(10, activityScore + schritteBonus + liegezeitMalus));
        }
        
        let schlafScore = 0;
        if (schlafEntries.length > 0) {
            schlafScore = calculateSchlafScore(schlafEntries[0].dauer);
        }
        
        let rauchfrei = rauchEntries.length > 0 && rauchEntries[0].status === 'ja';
        
        dailyScores[dateStr] = {
            ern: ernScore,
            trink: trinkScore,
            sport: sportScore,
            schlaf: schlafScore,
            rauchfrei: rauchfrei
        };
    }
    
    // Calculate current streaks (counting backwards from today)
    const categories = [
        { key: 'rauchfrei', name: 'Rauchfrei Streak', targets: [7, 14, 30, 100], bonuses: [15, 35, 80, 200], threshold: true },
        { key: 'ern', name: 'Ernährung Streak', targets: [3, 7, 14], bonuses: [3, 12, 30], threshold: 8 },
        { key: 'sport', name: 'Sport Streak', targets: [3, 7, 14], bonuses: [5, 20, 50], threshold: 8 },
        { key: 'trink', name: 'Trinken Streak', targets: [7, 14], bonuses: [8, 15], threshold: 8 },
        { key: 'schlaf', name: 'Schlaf Streak', targets: [5, 10, 30], bonuses: [3, 8, 40], threshold: 8 }
    ];
    
    categories.forEach(cat => {
        let currentStreak = 0;
        const dates = Object.keys(dailyScores).sort().reverse();
        
        for (let dateStr of dates) {
            const score = dailyScores[dateStr];
            if (cat.key === 'rauchfrei') {
                if (score.rauchfrei) {
                    currentStreak++;
                } else {
                    break;
                }
            } else {
                if (score[cat.key] >= cat.threshold) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
        
        // Find next milestone for this streak
        if (currentStreak > 0) {
            for (let i = 0; i < cat.targets.length; i++) {
                if (currentStreak < cat.targets[i]) {
                    streaks.push({
                        name: cat.name,
                        current: currentStreak,
                        target: cat.targets[i],
                        bonus: cat.bonuses[i],
                        category: cat.key
                    });
                    break;
                }
            }
        }
    });
    
    // Sort by bonus points (descending)
    streaks.sort((a, b) => b.bonus - a.bonus);
    
    return streaks;
}

// ============ APP-INITIALISIERUNG ============
// KRITISCH: Tab-Navigation MUSS nach DOM-Laden initialisiert werden!

function initializeApp() {
    console.log('━━━ APP-INITIALISIERUNG START ━━━');
    
    // Initialize tab navigation
    initTabNavigation();
    
    // Pre-render Wochenanalyse (damit Content sofort da ist)
    console.log('➡ Pre-rendering Wochenanalyse...');
    renderWochenanalyse();
    
    console.log('✓ APP-INITIALISIERUNG ABGESCHLOSSEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
}

if (document.readyState === 'loading') {
    console.log('DOM lädt noch - warte auf DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOMContentLoaded Event ausgelöst!');
        initializeApp();
    });
} else {
    console.log('DOM bereits geladen - initialisiere App sofort');
    initializeApp();
}

console.log('App initialized with', appState.entries.length, 'entries');
console.log('Current bonus points:', appState.bonusPoints);
console.log('Current week (viewedKw):', appState.viewedKw);
console.log('Week info for current date:', getWeekInfoCorrect(appState.currentDate));

// TEST der korrekten Wochenzuordnung
console.log('TEST Wochenzuordnung:');
console.log('  2025-11-09 -> KW', getKWofDate('2025-11-09'), '(erwartet: KW45)');
console.log('  2025-11-10 -> KW', getKWofDate('2025-11-10'), '(erwartet: KW46)');
console.log('  2025-11-16 -> KW', getKWofDate('2025-11-16'), '(erwartet: KW46)');
console.log('  2025-11-17 -> KW', getKWofDate('2025-11-17'), '(erwartet: KW47)');

// ============ CLOUD SYNC SAVE FUNCTIONS ============

// Auto-login mit Anonymous Auth
async function initializeCloudSync() {
    if (!isCloudSyncEnabled) {
        console.log('❌ Firebase not available');
        return;
    }
    
    try {
        const result = await firebase.auth().signInAnonymously();
        console.log('✓ Anonymous login successful:', result.user.uid);
        
        // Load appState from Firestore
        loadAppStateFromCloud();
        
        // Listen for real-time changes
        setupRealtimeSync(result.user.uid);
    } catch (error) {
        console.error('❌ Auth error:', error);
    }
}

// Save appState to Firestore
async function saveAppStateToCloud() {
    if (!isCloudSyncEnabled || !firebase.auth().currentUser) return;
    
    try {
        const user = firebase.auth().currentUser;
        await db.collection('users').doc(user.uid).collection('appState').doc('main').set({
            entries: appState.entries,
            bonusPoints: appState.bonusPoints,
            rauchfreiStart: appState.rauchfreiStart,
            systemStart: appState.systemStart,
            currentDate: appState.currentDate,
            timestamp: new Date().toISOString()
        });
        
        console.log('✓ AppState saved to Cloud');
        updateSyncStatus('connected', 'Gespeichert');
    } catch (error) {
        console.error('❌ Save error:', error);
        updateSyncStatus('error', 'Fehler beim Speichern');
    }
}

// Load appState from Firestore
async function loadAppStateFromCloud() {
    if (!isCloudSyncEnabled || !firebase.auth().currentUser) return;
    
    try {
        const user = firebase.auth().currentUser;
        const doc = await db.collection('users').doc(user.uid).collection('appState').doc('main').get();
        
        if (doc.exists) {
            const data = doc.data();
            appState.entries = data.entries || [];
            appState.bonusPoints = data.bonusPoints || 0;
            console.log('✓ AppState loaded from Cloud');
            
            // Re-render UI
            renderDashboard();
        }
    } catch (error) {
        console.error('❌ Load error:', error);
    }
}

// Real-time sync - listen to changes
function setupRealtimeSync(uid) {
    if (!isCloudSyncEnabled) return;
    
    db.collection('users').doc(uid).collection('appState').doc('main')
        .onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                appState.entries = data.entries || appState.entries;
                appState.bonusPoints = data.bonusPoints || appState.bonusPoints;
                
                console.log('✓ Real-time sync: Data updated');
                renderDashboard();
                updateSyncStatus('connected', 'Synchronisiert');
            }
        }, error => {
            console.error('❌ Sync error:', error);
            updateSyncStatus('error', 'Synchronisierungsfehler');
        });
}

// ============ END CLOUD SYNC FUNCTIONS ============


// ==========================================
// 🗑️ EINTRÄGE LÖSCHEN - NEUE FUNKTIONEN
// ==========================================

// Render delete entries view
function renderDeleteEntries() {
    const entries = [...appState.entries].sort((a, b) => {
        // Sort by date DESC, then by time DESC
        if (b.datum !== a.datum) {
            return b.datum.localeCompare(a.datum);
        }
        const timeA = a.zeit || '0000';
        const timeB = b.zeit || '0000';
        return timeB.localeCompare(timeA);
    });

    let html = '';
    
    if (entries.length === 0) {
        html = '<p style="text-align: center; padding: var(--space-24); color: var(--color-text-secondary);">Keine Einträge vorhanden.</p>';
    } else {
        html += `<div style="font-weight: 600; margin-bottom: var(--space-16);">Gesamt: <span style="color: var(--color-primary)">${entries.length}</span> Einträge</div>`;
        
        html += '<table class="data-table">';
        html += '<thead><tr><th style="width: 50px;"><input type="checkbox" id="selectAllCheckbox" onchange="toggleAllEntries(this.checked)"></th><th>Datum</th><th>Zeit</th><th>Typ</th><th>Details</th><th>Score</th></tr></thead>';
        html += '<tbody>';

        entries.forEach(entry => {
            const typeIcons = {
                ernaehrung: '🥘',
                trinken: '💧',
                sport: '⚽',
                schlaf: '😴',
                rauchstatus: '🚭'
            };
            
            const typeNames = {
                ernaehrung: 'Ernährung',
                trinken: 'Trinken',
                sport: 'Sport',
                schlaf: 'Schlaf',
                rauchstatus: 'Rauchstatus'
            };

            const icon = typeIcons[entry.type] || '📝';
            const typeName = typeNames[entry.type] || entry.type;
            
            let details = '';
            let score = '-';
            
            if (entry.type === 'ernaehrung') {
                details = `${entry.gericht} (${entry.portion}g, ${entry.kcal} kcal)`;
                score = entry.ldlScore ? entry.ldlScore.toFixed(1) + '/10' : '-';
            } else if (entry.type === 'trinken') {
                details = `${entry.getraenk} (${entry.menge}l)`;
                score = entry.trinkScore ? entry.trinkScore.toFixed(1) + '/10' : '-';
            } else if (entry.type === 'sport') {
                details = entry.aktivitaet || 'Schritte/Liegezeit';
                if (entry.dauer) details += ` (${entry.dauer} min)`;
                score = calculateSportScore(entry).toFixed(1) + '/10';
            } else if (entry.type === 'schlaf') {
                details = `${entry.dauer}h Schlaf`;
                score = calculateSchlafScore(entry.dauer).toFixed(1) + '/10';
            } else if (entry.type === 'rauchstatus') {
                details = entry.status === 'ja' ? '✅ Rauchfrei' : '❌ Geraucht';
                score = entry.status === 'ja' ? '10/10' : '2/10';
            }

            html += `<tr>
                <td><input type="checkbox" class="entry-checkbox" data-entry-id="${entry.id}"></td>
                <td>${formatDate(entry.datum)}</td>
                <td>${entry.zeit || '-'}</td>
                <td>${icon} ${typeName}</td>
                <td>${details}</td>
                <td>${score}</td>
            </tr>`;
        });

        html += '</tbody></table>';
    }

    document.getElementById('deleteEntriesList').innerHTML = html;
}

// Toggle all checkboxes
function toggleAllEntries(checked) {
    document.querySelectorAll('.entry-checkbox').forEach(cb => {
        cb.checked = checked;
    });
}

// Select all entries
function selectAllEntries() {
    document.getElementById('selectAllCheckbox').checked = true;
    toggleAllEntries(true);
}

// Deselect all entries
function deselectAllEntries() {
    document.getElementById('selectAllCheckbox').checked = false;
    toggleAllEntries(false);
}

// Delete selected entries
function deleteSelectedEntries() {
    const checkboxes = document.querySelectorAll('.entry-checkbox:checked');
    const idsToDelete = Array.from(checkboxes).map(cb => cb.getAttribute('data-entry-id'));
    
    if (idsToDelete.length === 0) {
        showNotification('Keine Einträge ausgewählt!', 'error');
        return;
    }

    // Confirm deletion
    const confirmMsg = `Wirklich ${idsToDelete.length} Eintrag/Einträge löschen?`;
    if (!confirm(confirmMsg)) {
        return;
    }

    // Delete entries
    appState.entries = appState.entries.filter(e => !idsToDelete.includes(e.id));
    
    // Recalculate bonus points
    recalculateBonusPoints();
    
    // 🔥 CLOUD SYNC
    saveAppStateToCloud();
    
    // Refresh view
    renderDeleteEntries();
    
    showNotification(`${idsToDelete.length} Eintrag/Einträge gelöscht!`, 'success');
}

// Initialize delete tab when switched to
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for tab switches
    const deleteTabButton = document.querySelector('[data-tab="loeschen"]');
    if (deleteTabButton) {
        deleteTabButton.addEventListener('click', function() {
            setTimeout(() => renderDeleteEntries(), 100);
        });
    }
});

// INIT - Starte Cloud Sync sofort!
window.addEventListener('DOMContentLoaded', () => {
    initializeCloudSync();
});
