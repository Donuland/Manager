// ========================================
// DONULAND MANAGEMENT SYSTEM - OPRAVENÝ APP.JS
// Krok 1: Základní inicializace bez chyb
// ========================================

// Globální stav aplikace - jednoduchý a čistý
window.donulandApp = {
    isInitialized: false,
    data: {
        historicalData: [],
        isLoading: false,
        lastDataLoad: null
    },
    config: {
        DONUT_COST: 32,
        DONUT_PRICE: 50,
        FRANCHISE_PRICE: 52,
        HOURLY_WAGE: 150,
        WORK_HOURS: 10,
        FUEL_COST_PER_KM: 15,
        BASE_CITY: 'Praha',
        DEBUG: true
    }
};

// Zjednodušené logování
function log(message, ...args) {
    if (window.donulandApp.config.DEBUG) {
        console.log('[DONULAND]', message, ...args);
    }
}

function logError(message, ...args) {
    console.error('[DONULAND ERROR]', message, ...args);
}

// Hlavní inicializace
document.addEventListener('DOMContentLoaded', function() {
    log('🚀 Spouštím Donuland Management System...');
    
    // Malé zpoždění pro načtení všech zdrojů
    setTimeout(initializeApp, 200);
});

// Bezpečná inicializace aplikace
function initializeApp() {
    try {
        log('📱 Inicializuji aplikaci...');
        
        // 1. Kontrola existence základních elementů
        if (!checkRequiredElements()) {
            throw new Error('Chybějící HTML elementy');
        }
        
        // 2. Skrytí loading screen a zobrazení aplikace
        showMainApp();
        
        // 3. Nastavení základních event listenerů
        setupBasicEvents();
        
        // 4. Nastavení výchozích hodnot
        setDefaultValues();
        
        // 5. Inicializace navigace
        initNavigation();
        
        // Označení jako inicializováno
        window.donulandApp.isInitialized = true;
        
        log('✅ Aplikace úspěšně inicializována');
        showNotification('🍩 Donuland Management System je připraven!', 'success');
        
    } catch (error) {
        logError('❌ Chyba při inicializaci:', error);
        showCriticalError(error);
    }
}

// Kontrola existence požadovaných elementů
function checkRequiredElements() {
    const required = ['loadingScreen', 'mainApp', 'statusIndicator'];
    const missing = required.filter(id => !document.getElementById(id));
    
    if (missing.length > 0) {
        logError('Chybějící elementy:', missing);
        return false;
    }
    
    return true;
}

// Zobrazení hlavní aplikace
function showMainApp() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    if (mainApp) {
        mainApp.style.display = 'block';
    }
    
    log('👁️ Aplikace zobrazena');
}

// Základní event listenery
function setupBasicEvents() {
    log('🔗 Nastavuji základní event listenery...');
    
    // Globální error handler
    window.addEventListener('error', (event) => {
        logError('Neočekávaná chyba:', event.error);
        showNotification('⚠️ Došlo k chybě. Zkuste obnovit stránku.', 'warning');
    });
    
    // Formulářové prvky - pokud existují
    const formFields = [
        'eventName', 'eventCategory', 'eventCity', 'eventDate',
        'expectedVisitors', 'competition', 'businessModel', 'rentType'
    ];
    
    formFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('change', () => {
                log(`Změna v poli: ${fieldId}`);
                // Zde bude později logika pro predikci
            });
        }
    });
}

// Nastavení výchozích hodnot
function setDefaultValues() {
    log('⚙️ Nastavuji výchozí hodnoty...');
    
    // Datum - zítra
    const dateInput = document.getElementById('eventDate');
    if (dateInput && !dateInput.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0];
    }
    
    // Cena donutu
    const priceInput = document.getElementById('donutPrice');
    if (priceInput && !priceInput.value) {
        priceInput.value = window.donulandApp.config.DONUT_PRICE;
    }
    
    // Délka akce
    const durationSelect = document.getElementById('eventDuration');
    if (durationSelect && !durationSelect.value) {
        durationSelect.value = '1';
    }
    
    // Status indikátor
    updateStatusIndicator('offline', 'Žádná data');
}

// Inicializace navigace
function initNavigation() {
    log('🧭 Inicializuji navigaci...');
    
    // Globální funkce pro přepínání sekcí
    window.showSection = function(sectionId) {
        log('📋 Přepínám na sekci:', sectionId);
        
        // Skrytí všech sekcí
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Zobrazení vybrané sekce
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Aktualizace navigace
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            
            // Kontrola onclick atributu
            const onclick = item.getAttribute('onclick');
            if (onclick && onclick.includes(`'${sectionId}'`)) {
                item.classList.add('active');
            }
        });
    };
    
    // Globální funkce pro načtení dat
    window.loadDataFromSheets = async function(sheetsUrl) {
        if (!sheetsUrl) {
            sheetsUrl = document.getElementById('googleSheetsUrl')?.value;
        }
        
        if (!sheetsUrl) {
            showNotification('❌ Zadejte URL Google Sheets', 'error');
            return;
        }
        
        try {
            log('📊 Načítám data z Google Sheets...');
            showNotification('🔄 Načítám data...', 'info');
            updateStatusIndicator('loading', 'Načítám...');
            
            // Zde bude později implementováno načítání dat
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulace
            
            showNotification('✅ Data načtena (simulace)', 'success');
            updateStatusIndicator('online', 'Simulace dat');
            
        } catch (error) {
            logError('Chyba při načítání dat:', error);
            showNotification(`❌ Chyba: ${error.message}`, 'error');
            updateStatusIndicator('error', 'Chyba');
        }
    };
}

// Aktualizace status indikátoru
function updateStatusIndicator(status, message) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    
    // Odstranění starých tříd
    indicator.classList.remove('online', 'error', 'loading');
    
    // Přidání nové třídy
    if (status !== 'offline') {
        indicator.classList.add(status);
    }
    
    // Aktualizace textu
    const textSpan = indicator.querySelector('span:last-child');
    if (textSpan) {
        textSpan.textContent = message;
    }
    
    log(`📊 Status: ${status} - ${message}`);
}

// Zobrazení notifikace
function showNotification(message, type = 'info') {
    log(`📢 Notifikace [${type}]: ${message}`);
    
    const container = document.getElementById('notificationContainer');
    if (!container) {
        // Fallback na console pokud není kontejner
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }
    
    // Odstranění existujících notifikací
    container.innerHTML = '';
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type] || 'ℹ️'}</span>
            <span class="notification-text">${message}</span>
            <span class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</span>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Animace zobrazení
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto odstranění po 5 sekundách
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Zobrazení kritické chyby
function showCriticalError(error) {
    const errorHTML = `
        <div style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; color: white; font-family: sans-serif;
        ">
            <div style="text-align: center; max-width: 500px; padding: 40px;">
                <div style="font-size: 4em; margin-bottom: 20px;">💥</div>
                <h1>Kritická chyba aplikace</h1>
                <p style="margin: 20px 0;">Došlo k neočekávané chybě při inicializaci.</p>
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <code>${error.message}</code>
                </div>
                <button onclick="location.reload()" style="
                    background: white; color: #ff6b6b; border: none;
                    padding: 15px 30px; border-radius: 8px; font-weight: bold; cursor: pointer;
                ">🔄 Obnovit stránku</button>
            </div>
        </div>
    `;
    
    document.body.innerHTML = errorHTML;
}

log('📜 App.js načten a připraven k inicializaci');
// ========================================
// DONULAND - KROK 2: ZÁKLADNÍ NAČÍTÁNÍ DAT
// Přidejte tento kód na konec app.js (nebo vytvořte nový soubor dataManager.js)
// ========================================

// Rozšíření globální funkce loadDataFromSheets
window.loadDataFromSheets = async function(sheetsUrl) {
    if (!sheetsUrl) {
        sheetsUrl = document.getElementById('googleSheetsUrl')?.value;
    }
    
    if (!sheetsUrl) {
        showNotification('❌ Zadejte URL Google Sheets v nastavení', 'error');
        return;
    }
    
    // Kontrola, zda již neprobíhá načítání
    if (window.donulandApp.data.isLoading) {
        showNotification('⏳ Načítání již probíhá...', 'warning');
        return;
    }
    
    window.donulandApp.data.isLoading = true;
    updateStatusIndicator('loading', 'Načítám data...');
    
    try {
        log('📊 Začínám načítání dat z Google Sheets...');
        showNotification('🔄 Načítám data z Google Sheets...', 'info');
        
        // Extrakce Sheet ID z URL
        const sheetId = extractSheetId(sheetsUrl);
        if (!sheetId) {
            throw new Error('Neplatné Google Sheets URL. Zkontrolujte formát URL.');
        }
        
        log('📋 Sheet ID:', sheetId);
        
        // Sestavení CSV URL
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        log('🔗 CSV URL:', csvUrl);
        
        // Pokus o načtení dat
        const csvData = await fetchCSVData(csvUrl);
        
        // Parsování CSV dat
        const parsedData = parseCSVData(csvData);
        
        // Uložení dat
        window.donulandApp.data.historicalData = parsedData;
        window.donulandApp.data.lastDataLoad = new Date();
        
        // Aktualizace autocomplete
        updateAutocompleteData(parsedData);
        
        // Úspěšné dokončení
        const count = parsedData.length;
        updateStatusIndicator('online', `${count} záznamů`);
        showNotification(`✅ Úspěšně načteno ${count} záznamů!`, 'success');
        
        log(`✅ Data úspěšně načtena: ${count} záznamů`);
        
        return parsedData;
        
    } catch (error) {
        logError('❌ Chyba při načítání dat:', error);
        updateStatusIndicator('error', 'Chyba načítání');
        showNotification(`❌ Chyba při načítání dat: ${error.message}`, 'error');
        throw error;
        
    } finally {
        window.donulandApp.data.isLoading = false;
    }
};

// Extrakce Sheet ID z Google Sheets URL
function extractSheetId(url) {
    const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        /spreadsheets\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Načtení CSV dat s fallback mechanismy
async function fetchCSVData(csvUrl) {
    log('🌐 Pokouším se načíst CSV data...');
    
    // Pokus 1: Přímé volání (obvykle selže kvůli CORS)
    try {
        log('🔄 Pokus 1: Přímé volání...');
        const response = await fetch(csvUrl);
        if (response.ok) {
            const data = await response.text();
            log('✅ Přímé volání úspěšné');
            return data;
        }
    } catch (error) {
        log('⚠️ Přímé volání selhalo (CORS):', error.message);
    }
    
    // Pokus 2: CORS proxy - allorigins.win
    try {
        log('🔄 Pokus 2: CORS proxy (allorigins.win)...');
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (result.contents) {
            log('✅ CORS proxy úspěšný');
            return result.contents;
        } else {
            throw new Error('Prázdný obsah z proxy');
        }
    } catch (error) {
        log('⚠️ CORS proxy selhal:', error.message);
    }
    
    // Pokus 3: Alternativní CORS proxy
    try {
        log('🔄 Pokus 3: Alternativní CORS proxy...');
        const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(csvUrl)}`;
        const response = await fetch(proxyUrl2);
        
        if (response.ok) {
            const data = await response.text();
            log('✅ Alternativní proxy úspěšný');
            return data;
        }
    } catch (error) {
        log('⚠️ Alternativní proxy selhal:', error.message);
    }
    
    // Všechny pokusy selhaly
    throw new Error('Nepodařilo se načíst data ze všech dostupných zdrojů. Zkontrolujte přístupová práva k Google Sheets.');
}

// Jednoduché parsování CSV dat
function parseCSVData(csvText) {
    log('📝 Parsuji CSV data...');
    
    if (!csvText || csvText.trim().length === 0) {
        throw new Error('CSV data jsou prázdná');
    }
    
    try {
        // Rozdělení na řádky
        const lines = csvText.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length < 2) {
            throw new Error('CSV musí obsahovat alespoň hlavičku a jeden řádek dat');
        }
        
        // Parsování hlavičky
        const headers = parseCSVLine(lines[0]);
        log('📋 Hlavičky:', headers);
        
        const data = [];
        
        // Parsování datových řádků
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                const row = {};
                
                // Mapování hodnot na hlavičky
                headers.forEach((header, index) => {
                    row[header.trim()] = (values[index] || '').trim();
                });
                
                // Přidání pouze neprázdných řádků
                if (Object.values(row).some(value => value && value.length > 0)) {
                    data.push(row);
                }
                
            } catch (error) {
                log(`⚠️ Chyba při parsování řádku ${i + 1}:`, error.message);
            }
        }
        
        log(`✅ CSV úspěšně naparsováno: ${data.length} řádků`);
        return data;
        
    } catch (error) {
        logError('❌ Chyba při parsování CSV:', error);
        throw new Error(`Chyba při parsování CSV dat: ${error.message}`);
    }
}

// Parsování jednotlivého řádku CSV
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result.map(value => value.replace(/^"|"$/g, '')); // Odstranění úvodních/koncových uvozovek
}

// Aktualizace autocomplete dat
function updateAutocompleteData(data) {
    if (!data || data.length === 0) {
        log('⚠️ Žádná data pro autocomplete');
        return;
    }
    
    try {
        log('🔄 Aktualizuji autocomplete data...');
        
        // Hledání sloupců s názvy akcí a městy
        const sampleRow = data[0];
        const headers = Object.keys(sampleRow);
        
        // Možné názvy sloupců pro akce
        const eventNameColumns = headers.filter(h => 
            h.toLowerCase().includes('název') || 
            h.toLowerCase().includes('akce') ||
            h.toLowerCase().includes('event') ||
            h === 'D'
        );
        
        // Možné názvy sloupců pro města
        const cityColumns = headers.filter(h => 
            h.toLowerCase().includes('lokalita') || 
            h.toLowerCase().includes('město') ||
            h.toLowerCase().includes('city') ||
            h === 'C'
        );
        
        log('📋 Sloupce pro názvy akcí:', eventNameColumns);
        log('📋 Sloupce pro města:', cityColumns);
        
        // Extrakce unikátních názvů akcí
        if (eventNameColumns.length > 0) {
            const eventNames = [...new Set(
                data.map(row => row[eventNameColumns[0]])
                    .filter(name => name && name.trim().length > 0)
                    .map(name => name.trim())
            )].sort();
            
            updateDatalist('eventNamesList', eventNames);
            log(`✅ Aktualizováno ${eventNames.length} názvů akcí`);
        }
        
        // Extrakce unikátních měst
        if (cityColumns.length > 0) {
            const cities = [...new Set(
                data.map(row => row[cityColumns[0]])
                    .filter(city => city && city.trim().length > 0)
                    .map(city => city.trim())
            )].sort();
            
            // Kombinace s existujícími městy
            const existingCities = ['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové', 'Ústí nad Labem', 'Pardubice'];
            const allCities = [...new Set([...existingCities, ...cities])].sort();
            
            updateDatalist('citiesList', allCities);
            log(`✅ Aktualizováno ${allCities.length} měst`);
        }
        
    } catch (error) {
        logError('❌ Chyba při aktualizaci autocomplete:', error);
    }
}

// Aktualizace datalist elementu
function updateDatalist(datalistId, options) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) {
        log(`⚠️ Datalist ${datalistId} nenalezen`);
        return;
    }
    
    datalist.innerHTML = options
        .map(option => `<option value="${escapeHtml(option)}">`)
        .join('');
}

// Escape HTML pro bezpečnost
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Získání základních statistik dat
window.getDataStats = function() {
    const data = window.donulandApp.data.historicalData;
    if (!data || data.length === 0) {
        return {
            totalEvents: 0,
            eventsWithSales: 0,
            totalSales: 0,
            avgSalesPerEvent: 0
        };
    }
    
    // Hledání sloupce s prodeji
    const sampleRow = data[0];
    const headers = Object.keys(sampleRow);
    
    const salesColumns = headers.filter(h => 
        h.toLowerCase().includes('prodáno') || 
        h.toLowerCase().includes('prodej') ||
        h.toLowerCase().includes('sales') ||
        h === 'N'
    );
    
    if (salesColumns.length === 0) {
        log('⚠️ Nenalezen sloupec s prodeji');
        return {
            totalEvents: data.length,
            eventsWithSales: 0,
            totalSales: 0,
            avgSalesPerEvent: 0
        };
    }
    
    const salesColumn = salesColumns[0];
    const eventsWithSales = data.filter(row => {
        const sales = parseFloat(row[salesColumn] || 0);
        return sales > 0;
    });
    
    const totalSales = eventsWithSales.reduce((sum, row) => {
        return sum + parseFloat(row[salesColumn] || 0);
    }, 0);
    
    return {
        totalEvents: data.length,
        eventsWithSales: eventsWithSales.length,
        totalSales: Math.round(totalSales),
        avgSalesPerEvent: eventsWithSales.length > 0 ? Math.round(totalSales / eventsWithSales.length) : 0
    };
};

log('📊 Data manager připraven');
