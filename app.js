// ========================================
// DONULAND MANAGEMENT SYSTEM - FINÁLNÍ OPRAVA
// Kompletně opravený aplikační soubor
// ========================================

// Globální stav aplikace
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
    setTimeout(initializeApp, 200);
});

// Bezpečná inicializace aplikace
function initializeApp() {
    try {
        log('📱 Inicializuji aplikaci...');
        
        if (!checkRequiredElements()) {
            throw new Error('Chybějící HTML elementy');
        }
        
        showMainApp();
        setupBasicEvents();
        setDefaultValues();
        initNavigation();
        
        // Inicializace ostatních modulů
        if (typeof navigation !== 'undefined') {
            navigation.init();
        }
        
        if (typeof settings !== 'undefined') {
            settings.loadSettings();
        }
        
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
    
    window.addEventListener('error', (event) => {
        logError('Neočekávaná chyba:', event.error);
        showNotification('⚠️ Došlo k chybě. Zkuste obnovit stránku.', 'warning');
    });
    
    const formFields = [
        'eventName', 'eventCategory', 'eventCity', 'eventDate',
        'expectedVisitors', 'competition', 'businessModel', 'rentType'
    ];
    
    formFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('change', () => {
                log(`Změna v poli: ${fieldId}`);
                if (typeof predictor !== 'undefined' && predictor.updatePrediction) {
                    predictor.updatePrediction();
                }
            });
        }
    });
}

// Nastavení výchozích hodnot
function setDefaultValues() {
    log('⚙️ Nastavuji výchozí hodnoty...');
    
    const dateInput = document.getElementById('eventDate');
    if (dateInput && !dateInput.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0];
    }
    
    const priceInput = document.getElementById('donutPrice');
    if (priceInput && !priceInput.value) {
        priceInput.value = window.donulandApp.config.DONUT_PRICE;
    }
    
    const durationSelect = document.getElementById('eventDuration');
    if (durationSelect && !durationSelect.value) {
        durationSelect.value = '1';
    }
    
    updateStatusIndicator('offline', 'Žádná data');
}

// Inicializace navigace
function initNavigation() {
    log('🧭 Inicializuji navigaci...');
    
    // Globální funkce pro přepínání sekcí
    window.showSection = function(sectionId) {
        log('📋 Přepínám na sekci:', sectionId);
        
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            const onclick = item.getAttribute('onclick');
            if (onclick && onclick.includes(`'${sectionId}'`)) {
                item.classList.add('active');
            }
        });
        
        loadSectionData(sectionId);
    };
}

// Načtení dat pro konkrétní sekci
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'analysis':
            if (window.donulandApp.data.historicalData.length > 0) {
                if (typeof analysis !== 'undefined') {
                    analysis.loadAnalysisData();
                }
            } else {
                loadDataFromSheets().then(() => {
                    if (typeof analysis !== 'undefined') {
                        analysis.loadAnalysisData();
                    }
                }).catch(() => {
                    if (typeof analysis !== 'undefined') {
                        analysis.loadAnalysisData();
                    }
                });
            }
            break;
        case 'calendar':
            if (window.donulandApp.data.historicalData.length > 0) {
                if (typeof analysis !== 'undefined') {
                    analysis.loadCalendarData();
                }
            } else {
                loadDataFromSheets().then(() => {
                    if (typeof analysis !== 'undefined') {
                        analysis.loadCalendarData();
                    }
                }).catch(() => {
                    if (typeof analysis !== 'undefined') {
                        analysis.loadCalendarData();
                    }
                });
            }
            break;
    }
}

// ========================================
// RFC 4180 COMPLIANT CSV PARSER
// ========================================

/**
 * Pokročilý CSV parser podle RFC 4180 standardu
 * Správně zpracovává uvozovky, čárky uvnitř hodnot, nové řádky
 */
function parseCSVContent(csvText) {
    log('📝 Spouštím RFC 4180 CSV parser...');
    
    if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSV obsah není validní string');
    }
    
    const result = [];
    const lines = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    // Nejdříve rozdělíme text na řádky, respektujeme uvozovky
    while (i < csvText.length) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote ""
                current += '"';
                i += 2;
                continue;
            } else {
                inQuotes = !inQuotes;
            }
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            // Konec řádku mimo uvozovky
            if (current.trim()) {
                lines.push(current.trim());
            }
            current = '';
            
            // Přeskočíme \r\n kombinaci
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            i++;
            continue;
        } else {
            current += char;
        }
        
        i++;
    }
    
    // Přidáme poslední řádek
    if (current.trim()) {
        lines.push(current.trim());
    }
    
    log(`📄 Nalezeno ${lines.length} řádků v CSV`);
    
    if (lines.length === 0) {
        throw new Error('CSV neobsahuje žádné řádky');
    }
    
    // Parsování hlavičky
    const headers = parseCSVRow(lines[0]);
    log(`📋 Hlavičky (${headers.length}):`, headers.slice(0, 10));
    
    if (headers.length === 0) {
        throw new Error('Hlavička CSV je prázdná');
    }
    
    // Parsování datových řádků
    let validRows = 0;
    for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
        try {
            const values = parseCSVRow(lines[lineIndex]);
            
            if (values.length > 0) {
                const row = {};
                let hasData = false;
                
                // Mapování hodnot na hlavičky
                for (let colIndex = 0; colIndex < headers.length; colIndex++) {
                    const header = headers[colIndex].trim();
                    const value = (values[colIndex] || '').trim();
                    row[header] = value;
                    
                    if (value && value.length > 0) {
                        hasData = true;
                    }
                }
                
                // Přidáme pouze řádky s nějakými daty
                if (hasData) {
                    result.push(row);
                    validRows++;
                }
            }
            
        } catch (error) {
            log(`⚠️ Chyba na řádku ${lineIndex + 1}: ${error.message}`);
        }
    }
    
    log(`✅ RFC 4180 CSV parser dokončen: ${validRows} validních řádků`);
    
    if (result.length === 0) {
        throw new Error('CSV neobsahuje žádná validní data');
    }
    
    return result;
}

/**
 * Parsování jednotlivého řádku CSV podle RFC 4180
 */
function parseCSVRow(line) {
    if (!line || typeof line !== 'string') {
        return [];
    }
    
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote ""
                current += '"';
                i += 2;
                continue;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Konec pole
            result.push(current);
            current = '';
        } else {
            current += char;
        }
        
        i++;
    }
    
    // Přidáme poslední pole
    result.push(current);
    
    return result;
}

// ========================================
// VYLEPŠENÉ NAČÍTÁNÍ DAT Z GOOGLE SHEETS
// ========================================

window.loadDataFromSheets = async function(sheetsUrl) {
    if (!sheetsUrl) {
        sheetsUrl = document.getElementById('googleSheetsUrl')?.value;
    }
    
    if (!sheetsUrl) {
        sheetsUrl = 'https://docs.google.com/spreadsheets/d/1LclCz9hb0hlb1D92OyVqk6Cbam7PRK6KgAzGgiGs6iE/edit?usp=sharing';
        log('📋 Používám výchozí Google Sheets URL');
    }
    
    if (window.donulandApp.data.isLoading) {
        showNotification('⏳ Načítání již probíhá...', 'warning');
        return;
    }
    
    window.donulandApp.data.isLoading = true;
    updateStatusIndicator('loading', 'Načítám data...');
    
    try {
        log('📊 Začínám načítání dat z:', sheetsUrl);
        showNotification('🔄 Načítám data z Google Sheets...', 'info');
        
        const sheetId = extractSheetId(sheetsUrl);
        if (!sheetId) {
            throw new Error('Neplatné Google Sheets URL. Zkontrolujte formát URL.');
        }
        
        log('📋 Sheet ID:', sheetId);
        
        const csvData = await fetchCSVWithMultipleProxies(sheetId);
        
        if (!csvData || csvData.trim().length === 0) {
            throw new Error('Google Sheets vrátil prázdná data. Zkontrolujte přístupová práva k tabulce.');
        }
        
        log('📄 Načteno CSV dat (první 200 znaků):', csvData.substring(0, 200));
        
        // Použití nového RFC 4180 parseru
        const parsedData = parseCSVContent(csvData);
        
        // Synchronizace dat do všech globálních objektů
        window.donulandApp.data.historicalData = parsedData;
        window.donulandApp.data.lastDataLoad = new Date();
        
        // Kompatibilita se starými moduly
        if (typeof globalData !== 'undefined') {
            globalData.historicalData = parsedData;
            globalData.lastDataLoad = new Date();
        } else {
            window.globalData = {
                historicalData: parsedData,
                weatherCache: new Map(),
                distanceCache: new Map(),
                isLoading: false,
                lastDataLoad: new Date()
            };
        }
        
        log('🔄 Data synchronizována do všech globálních objektů');
        
        updateAutocompleteData(parsedData);
        
        const count = parsedData.length;
        updateStatusIndicator('online', `${count} záznamů`);
        showNotification(`✅ Úspěšně načteno ${count} záznamů!`, 'success');
        
        // Logování struktury dat pro diagnostiku
        if (parsedData.length > 0) {
            const sampleRow = parsedData[0];
            const headers = Object.keys(sampleRow);
            log('📊 Struktura dat:', {
                pocetRadku: parsedData.length,
                pocetSloupcu: headers.length,
                sloupce: headers.slice(0, 15), // Prvních 15 sloupců
                vzoroveData: sampleRow
            });
        }
        
        log(`✅ Data úspěšně načtena: ${count} záznamů`);
        
        return parsedData;
        
    } catch (error) {
        logError('❌ Chyba při načítání dat:', error);
        updateStatusIndicator('error', 'Chyba načítání');
        showNotification(`❌ Chyba: ${error.message}`, 'error');
        
        throw error;
        
    } finally {
        window.donulandApp.data.isLoading = false;
        if (typeof globalData !== 'undefined') {
            globalData.isLoading = false;
        }
    }
};

// Vylepšené načítání CSV s více proxy službami
async function fetchCSVWithMultipleProxies(sheetId) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    
    // Seznam proxy služeb v pořadí podle spolehlivosti
    const proxies = [
        {
            name: 'AllOrigins',
            url: `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`,
            parseResponse: (response) => response.json().then(data => data.contents)
        },
        {
            name: 'CORS Anywhere',
            url: `https://cors-anywhere.herokuapp.com/${csvUrl}`,
            parseResponse: (response) => response.text()
        },
        {
            name: 'ThingProxy',
            url: `https://thingproxy.freeboard.io/fetch/${csvUrl}`,
            parseResponse: (response) => response.text()
        },
        {
            name: 'Direct (no proxy)',
            url: csvUrl,
            parseResponse: (response) => response.text()
        }
    ];
    
    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        
        try {
            log(`🔄 Zkouším ${proxy.name} (${i + 1}/${proxies.length})...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(proxy.url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (compatible; DonulandApp/1.0)'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await proxy.parseResponse(response);
            
            if (csvText && csvText.trim().length > 0) {
                log(`✅ ${proxy.name} úspěšně načetl data (${csvText.length} znaků)`);
                return csvText;
            } else {
                throw new Error('Prázdný response');
            }
            
        } catch (error) {
            logError(`❌ ${proxy.name} selhal:`, error.message);
            
            if (i === proxies.length - 1) {
                throw new Error(`Všechny proxy služby selhaly. Posledná chyba: ${error.message}. Zkontrolujte: 1) Že je Google Sheets veřejně přístupný, 2) Správnost URL, 3) Síťové připojení.`);
            }
        }
    }
}

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

// Aktualizace autocomplete dat
function updateAutocompleteData(data) {
    if (!data || data.length === 0) {
        log('⚠️ Žádná data pro autocomplete');
        return;
    }
    
    try {
        log('🔄 Aktualizuji autocomplete data...');
        
        const sampleRow = data[0];
        const headers = Object.keys(sampleRow);
        
        // Detekce sloupců pro názvy akcí - více možností
        const eventNameColumns = headers.filter(h => {
            const lower = h.toLowerCase();
            return lower.includes('název') || 
                   lower.includes('akce') ||
                   lower.includes('event') ||
                   lower.includes('name') ||
                   h === 'D';
        });
        
        // Detekce sloupců pro města - více možností
        const cityColumns = headers.filter(h => {
            const lower = h.toLowerCase();
            return lower.includes('lokalita') || 
                   lower.includes('město') ||
                   lower.includes('city') ||
                   lower.includes('location') ||
                   h === 'C';
        });
        
        log('📋 Detekované sloupce:', {
            nazvy: eventNameColumns,
            mesta: cityColumns,
            vsechnySloupce: headers
        });
        
        // Extrakce názvů akcí
        if (eventNameColumns.length > 0) {
            const eventNames = [...new Set(
                data.map(row => row[eventNameColumns[0]])
                    .filter(name => name && name.trim().length > 0)
                    .map(name => name.trim())
            )].sort();
            
            updateDatalist('eventNamesList', eventNames);
            log(`✅ Aktualizováno ${eventNames.length} názvů akcí`);
        }
        
        // Extrakce měst
        if (cityColumns.length > 0) {
            const cities = [...new Set(
                data.map(row => row[cityColumns[0]])
                    .filter(city => city && city.trim().length > 0)
                    .map(city => city.trim())
            )].sort();
            
            const existingCities = ['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc'];
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

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Aktualizace status indikátoru
function updateStatusIndicator(status, message) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    
    indicator.classList.remove('online', 'error', 'loading');
    
    if (status !== 'offline') {
        indicator.classList.add(status);
    }
    
    const textSpan = indicator.querySelector('span:last-child');
    if (textSpan) {
        textSpan.textContent = message;
    }
    
    log(`📊 Status: ${status} - ${message}`);
}

// Zobrazení notifikace
function showNotification(message, type = 'info') {
    log(`📢 Notifikace [${type}]: ${message}`);
    
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
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
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
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

// ========================================
// KOMPATIBILITA SE STARÝMI MODULY
// ========================================

// DataManager kompatibilita
window.dataManager = {
    loadData: () => loadDataFromSheets(),
    getHistoricalData: (eventName = '', city = '', category = '') => {
        const data = window.donulandApp.data.historicalData || globalData?.historicalData || [];
        
        if (data.length === 0) {
            return { matches: [], summary: null };
        }
        
        try {
            const matches = data.filter(row => {
                const rowName = (row['Název akce'] || row['D'] || '').toLowerCase().trim();
                const rowCity = (row['Lokalita'] || row['C'] || '').toLowerCase().trim();
                const rowCategory = (row['kategorie'] || row['E'] || '').toLowerCase().trim();
                const sales = parseFloat(row['realně prodáno'] || row['N'] || 0);
                
                if (sales <= 0) return false;
                
                if (eventName && !rowName.includes(eventName.toLowerCase())) return false;
                if (city && !rowCity.includes(city.toLowerCase())) return false;
                if (category && !rowCategory.includes(category.toLowerCase())) return false;
                
                return true;
            }).slice(0, 10);
            
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

// Utils kompatibilita
if (typeof utils === 'undefined') {
    window.utils = {
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
        },
        parseCSV: (csvText) => parseCSVContent(csvText),
        
        // Utility funkce pro fuzzy search
        fuzzySearch: (needle, haystack, threshold = 0.6) => {
            const needleLower = needle.toLowerCase();
            const haystackLower = haystack.toLowerCase();
            
            if (haystackLower.includes(needleLower)) {
                return true;
            }
            
            // Jednoduché porovnání podobnosti
            const maxLength = Math.max(needleLower.length, haystackLower.length);
            let matches = 0;
            
            for (let i = 0; i < Math.min(needleLower.length, haystackLower.length); i++) {
                if (needleLower[i] === haystackLower[i]) {
                    matches++;
                }
            }
            
            const similarity = matches / maxLength;
            return similarity >= threshold;
        },
        
        // Odstranění diakritiky
        removeDiacritics: (str) => {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        },
        
        // Retry funkce pro API volání
        retry: async (fn, maxAttempts = 3, delay = 1000) => {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await fn();
                } catch (error) {
                    if (attempt === maxAttempts) {
                        throw error;
                    }
                    
                    log(`Pokus ${attempt} selhal, zkouším znovu za ${delay}ms:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                }
            }
        },
        
        // Debounce funkce
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // Cache funkce
        clearCache: () => {
            if (typeof globalData !== 'undefined') {
                if (globalData.weatherCache) globalData.weatherCache.clear();
                if (globalData.distanceCache) globalData.distanceCache.clear();
            }
        },
        
        // Extrakce Sheet ID
        extractSheetId: extractSheetId
    };
}

// CONFIG kompatibilita
if (typeof CONFIG === 'undefined') {
    window.CONFIG = {
        GOOGLE_SHEETS_URL: 'https://docs.google.com/spreadsheets/d/1LclCz9hb0hlb1D92OyVqk6Cbam7PRK6KgAzGgiGs6iE/edit?usp=sharing',
        WEATHER_API_KEY: 'c2fb0e86623880dc86162892b0fd9c95',
        MAPS_API_KEY: 'AIzaSyBTTA_MKa6FrxKpkcd7c5-d3FnC6FBLVTc',
        
        DONUT_COST: 32,
        DONUT_PRICE: 50,
        FRANCHISE_PRICE: 52,
        HOURLY_WAGE: 150,
        WORK_HOURS: 10,
        FUEL_COST_PER_KM: 15,
        BASE_CITY: 'Praha',
        
        CONVERSION_FACTORS: {
            'čokofest': 2.0,
            'cokofest': 2.0,
            'chocolate': 2.0,
            'čokolád': 2.0,
            'burger': 1.8,
            'food festival': 1.5,
            'gastro': 1.5,
            'street food': 1.4,
            'rodinný festival': 1.4,
            'kulturní akce (rodinná)': 1.3,
            'veletrh': 1.2,
            'koncert': 0.9,
            'majáles': 0.8,
            'Sportovní akce (dospělí)': 0.7,
            'ostatní': 1.0
        },
        
        CITY_FACTORS: {
            'praha': 1.3,
            'brno': 1.2,
            'ostrava': 1.1,
            'plzeň': 1.05,
            'liberec': 1.0,
            'olomouc': 1.0,
            'hradec králové': 0.95,
            'pardubice': 0.95,
            'české budějovice': 0.9,
            'ústí nad labem': 0.9,
            'default': 0.85
        },
        
        COMPETITION_FACTORS: {
            1: 1.3,
            2: 1.0,
            3: 0.7
        },
        
        WEATHER_FACTORS: {
            temperature: {
                ideal: { min: 18, max: 25, factor: 1.2 },
                hot: { min: 25, max: 35, factor: 0.8 },
                cold: { min: -10, max: 10, factor: 0.7 }
            },
            conditions: {
                'Clear': 1.15,
                'Clouds': 1.0,
                'Rain': 0.5,
                'Drizzle': 0.6,
                'Snow': 0.4,
                'Thunderstorm': 0.3,
                'Mist': 0.8,
                'Fog': 0.8
            }
        },
        
        CACHE_TTL: {
            weather: 30 * 60 * 1000,
            distance: 24 * 60 * 60 * 1000,
            sheets: 5 * 60 * 1000
        },
        
        DEBUG: true
    };
}

// Debug funkce kompatibilita
if (typeof debug === 'undefined') {
    window.debug = log;
    window.debugError = logError;
    window.debugWarn = (...args) => console.warn('[DONULAND WARNING]', ...args);
}

// GlobalData inicializace pokud neexistuje
if (typeof globalData === 'undefined') {
    window.globalData = {
        historicalData: [],
        weatherCache: new Map(),
        distanceCache: new Map(),
        isLoading: false,
        lastDataLoad: null
    };
}

// ========================================
// DIAGNOSTICKÉ FUNKCE PRO DEBUGGING
// ========================================

// Diagnostická funkce pro kontrolu stavu aplikace
window.getDiagnosticInfo = function() {
    const info = {
        timestamp: new Date().toISOString(),
        appState: {
            isInitialized: window.donulandApp.isInitialized,
            dataCount: window.donulandApp.data.historicalData.length,
            lastDataLoad: window.donulandApp.data.lastDataLoad,
            isLoading: window.donulandApp.data.isLoading
        },
        modules: {
            CONFIG: typeof CONFIG !== 'undefined',
            globalData: typeof globalData !== 'undefined',
            utils: typeof utils !== 'undefined',
            ui: typeof ui !== 'undefined',
            navigation: typeof navigation !== 'undefined',
            predictor: typeof predictor !== 'undefined',
            analysis: typeof analysis !== 'undefined',
            weatherService: typeof weatherService !== 'undefined',
            mapsService: typeof mapsService !== 'undefined',
            dataManager: typeof dataManager !== 'undefined',
            settings: typeof settings !== 'undefined'
        },
        dataStructure: null,
        errors: []
    };
    
    // Analýza struktury dat
    if (window.donulandApp.data.historicalData.length > 0) {
        const sampleRow = window.donulandApp.data.historicalData[0];
        info.dataStructure = {
            rowCount: window.donulandApp.data.historicalData.length,
            columnCount: Object.keys(sampleRow).length,
            columns: Object.keys(sampleRow),
            sampleData: sampleRow
        };
    }
    
    return info;
};

// Test načítání dat
window.testDataLoading = async function() {
    try {
        log('🧪 Spouštím test načítání dat...');
        const data = await loadDataFromSheets();
        log('✅ Test úspěšný:', data.length, 'záznamů');
        return { success: true, count: data.length };
    } catch (error) {
        logError('❌ Test selhal:', error);
        return { success: false, error: error.message };
    }
};

// ========================================
// FINÁLNÍ INICIALIZACE
// ========================================

log('🔧 Aplikační jádro načteno a připraveno');

// Export hlavních funkcí pro globální použití
window.donulandApp.loadData = loadDataFromSheets;
window.donulandApp.parseCSV = parseCSVContent;
window.donulandApp.getDiagnostics = window.getDiagnosticInfo;
window.donulandApp.testData = window.testDataLoading;

log('✅ Všechny funkce exportovány a dostupné globálně');
