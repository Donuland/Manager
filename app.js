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
    
    // ========================================
// KROK 3: SYNCHRONIZACE DAT - PŘIDEJTE NA KONEC APP.JS
// ========================================

// Původní funkce loadDataFromSheets rozšířená o synchronizaci
window.loadDataFromSheets = async function(sheetsUrl) {
    // Pokud není zadána URL, zkus najít v nastavení
    if (!sheetsUrl) {
        sheetsUrl = document.getElementById('googleSheetsUrl')?.value;
    }
    
    // Pokud stále není URL, použij výchozí
    if (!sheetsUrl) {
        sheetsUrl = 'https://docs.google.com/spreadsheets/d/1LclCz9hb0hlb1D92OyVqk6Cbam7PRK6KgAzGgiGs6iE/edit?usp=sharing';
        log('📋 Používám výchozí Google Sheets URL');
    }
    
    // Kontrola, zda již neprobíhá načítání
    if (window.donulandApp.data.isLoading) {
        showNotification('⏳ Načítání již probíhá...', 'warning');
        return;
    }
    
    window.donulandApp.data.isLoading = true;
    updateStatusIndicator('loading', 'Načítám data...');
    
    try {
        log('📊 Začínám načítání dat z:', sheetsUrl);
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
        
        // Pokus o načtení dat s podrobnějším logováním
        const csvData = await fetchCSVDataWithLogging(csvUrl);
        
        // Kontrola, zda data nejsou prázdná
        if (!csvData || csvData.trim().length === 0) {
            throw new Error('Google Sheets vrátil prázdná data. Zkontrolujte přístupová práva k tabulce.');
        }
        
        log('📄 Načteno CSV dat (první 200 znaků):', csvData.substring(0, 200));
        
        // Parsování CSV dat
        const parsedData = parseCSVDataSafely(csvData);
        
        // KLÍČOVÁ ZMĚNA: Synchronizace dat do VŠECH globálních objektů
        // 1. Nový systém
        window.donulandApp.data.historicalData = parsedData;
        window.donulandApp.data.lastDataLoad = new Date();
        
        // 2. Starý systém (pro kompatibilitu s analysis.js a ostatními)
        if (typeof globalData !== 'undefined') {
            globalData.historicalData = parsedData;
            globalData.lastDataLoad = new Date();
        }
        
        // 3. Vytvoření globalData pokud neexistuje
        if (typeof globalData === 'undefined') {
            window.globalData = {
                historicalData: parsedData,
                weatherCache: new Map(),
                distanceCache: new Map(),
                isLoading: false,
                lastDataLoad: new Date()
            };
        }
        
        log('🔄 Data synchronizována do všech globálních objektů');
        
        // Aktualizace autocomplete
        updateAutocompleteData(parsedData);
        
        // Úspěšné dokončení
        const count = parsedData.length;
        updateStatusIndicator('online', `${count} záznamů`);
        showNotification(`✅ Úspěšně načteno ${count} záznamů!`, 'success');
        
        log(`✅ Data úspěšně načtena a synchronizována: ${count} záznamů`);
        
        return parsedData;
        
    } catch (error) {
        logError('❌ Chyba při načítání dat:', error);
        updateStatusIndicator('error', 'Chyba načítání');
        showNotification(`❌ Chyba: ${error.message}`, 'error');
        
        // ODSTRANĚNÍ testovacích dat - chcete reálná data
        // loadTestData();
        
    } finally {
        window.donulandApp.data.isLoading = false;
        if (typeof globalData !== 'undefined') {
            globalData.isLoading = false;
        }
    }
};

// Rozšíření updateAutocompleteData pro práci s oběma systémy
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

// Aliasy pro kompatibilitu se starými moduly
window.dataManager = {
    loadData: () => loadDataFromSheets(),
    getHistoricalData: (eventName = '', city = '', category = '') => {
        const data = window.donulandApp.data.historicalData || globalData?.historicalData || [];
        
        if (data.length === 0) {
            return { matches: [], summary: null };
        }
        
        // Zjednodušené vyhledávání podobných akcí
        try {
            const matches = data.filter(row => {
                const rowName = (row['Název akce'] || row['D'] || '').toLowerCase().trim();
                const rowCity = (row['Lokalita'] || row['C'] || '').toLowerCase().trim();
                const rowCategory = (row['kategorie'] || row['E'] || '').toLowerCase().trim();
                const sales = parseFloat(row['realně prodáno'] || row['N'] || 0);
                
                // Musí mít nějaký prodej
                if (sales <= 0) return false;
                
                // Fuzzy search na název, město, kategorii
                if (eventName && !rowName.includes(eventName.toLowerCase())) return false;
                if (city && !rowCity.includes(city.toLowerCase())) return false;
                if (category && !rowCategory.includes(category.toLowerCase())) return false;
                
                return true;
            }).slice(0, 10); // Top 10
            
            // Vytvoření shrnutí
            let summary = null;
            if (matches.length > 0) {
                const totalSales = matches.reduce((sum, row) => {
                    return sum + parseFloat(row['realně prodáno'] || row['N'] || 0);
                }, 0);
                
                summary = {
                    count: matches.length,
                    avgSales: Math.round(totalSales / matches.length),
                    totalSales: Math.round(totalSales)
                };
            }
            
            return { matches, summary };
            
        } catch (error) {
            logError('Chyba při vyhledávání historických dat:', error);
            return { matches: [], summary: null };
        }
    }
};

// Utility funkce pro kompatibilitu
window.utils = window.utils || {};
Object.assign(window.utils, {
    findColumn: (data, possibleNames) => {
        if (!data || data.length === 0) return null;
        
        const headers = Object.keys(data[0]);
        for (const name of possibleNames) {
            if (headers.includes(name)) return name;
            
            const found = headers.find(header => 
                header.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(header.toLowerCase())
            );
            if (found) return found;
        }
        return null;
    },
    
    formatNumber: (number) => new Intl.NumberFormat('cs-CZ').format(number),
    formatCurrency: (amount) => new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount),
    formatDate: (date) => {
        if (typeof date === 'string') date = new Date(date);
        return new Intl.DateTimeFormat('cs-CZ', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
        }).format(date);
    },
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

log('🔗 Synchronizace dat a kompatibilita nastavena');
    // ========================================
// CHYBĚJÍCÍ FUNKCE - PŘIDEJTE NA KONEC APP.JS
// ========================================

// Extrakce Sheet ID z URL
function extractSheetId(url) {
    const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        /spreadsheets\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Načtení CSV dat s podrobným logováním
async function fetchCSVDataWithLogging(csvUrl) {
    log('🌐 Pokouším se načíst CSV data z:', csvUrl);
    
    // Pokus s CORS proxy
    try {
        log('🔄 Používám CORS proxy...');
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;
        log('🔗 Proxy URL:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        log('📦 Proxy response keys:', Object.keys(result));
        
        if (result.contents) {
            log('✅ Data úspěšně načtena přes proxy');
            return result.contents;
        } else {
            throw new Error('Proxy vrátil prázdný obsah');
        }
        
    } catch (error) {
        logError('❌ CORS proxy selhal:', error);
        throw new Error(`Nepodařilo se načíst data z Google Sheets. Možné příčiny: 1) Tabulka není veřejně přístupná, 2) Neplatné URL, 3) Problém se sítí. Chyba: ${error.message}`);
    }
}

// Bezpečnější parsování CSV
function parseCSVDataSafely(csvText) {
    log('📝 Začínám parsování CSV...');
    
    if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSV data nejsou validní string');
    }
    
    if (csvText.trim().length === 0) {
        throw new Error('CSV data jsou prázdná');
    }
    
    try {
        // Rozdělení na řádky
        const lines = csvText.split('\n').filter(line => line.trim().length > 0);
        log(`📄 Počet řádků: ${lines.length}`);
        
        if (lines.length < 1) {
            throw new Error('CSV neobsahuje žádné řádky');
        }
        
        if (lines.length < 2) {
            log('⚠️ CSV obsahuje pouze hlavičku, žádná data');
            return [];
        }
        
        // Parsování hlavičky
        const headers = parseCSVLineSafely(lines[0]);
        log('📋 Hlavičky:', headers);
        
        if (headers.length === 0) {
            throw new Error('Hlavička CSV je prázdná');
        }
        
        const data = [];
        let validRows = 0;
        
        // Parsování datových řádků
        for (let i = 1; i < Math.min(lines.length, 1000); i++) { // Limit na prvních 1000 řádků
            try {
                const values = parseCSVLineSafely(lines[i]);
                
                if (values.length > 0) {
                    const row = {};
                    
                    // Mapování hodnot na hlavičky
                    headers.forEach((header, index) => {
                        row[header.trim()] = (values[index] || '').trim();
                    });
                    
                    // Přidání pouze řádků s nějakými daty
                    if (Object.values(row).some(value => value && value.length > 0)) {
                        data.push(row);
                        validRows++;
                    }
                }
                
            } catch (error) {
                log(`⚠️ Chyba při parsování řádku ${i + 1}:`, error.message);
            }
        }
        
        log(`✅ CSV úspěšně naparsováno: ${validRows} validních řádků`);
        
        if (data.length === 0) {
            log('⚠️ Žádné validní data v CSV');
        }
        
        return data;
        
    } catch (error) {
        logError('❌ Chyba při parsování CSV:', error);
        throw new Error(`Chyba při parsování CSV dat: ${error.message}`);
    }
}

// Bezpečnější parsování řádku CSV
function parseCSVLineSafely(line) {
    if (!line || typeof line !== 'string') {
        return [];
    }
    
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
    return result.map(value => value.replace(/^"|"$/g, ''));
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

log('🔧 Všechny potřebné funkce načteny');
