// ========================================
// DONULAND MANAGEMENT SYSTEM - OPRAVENÝ APP.JS
// Hlavní aplikační soubor s opravenými funkcemi
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
        
        // Inicializace navigačního systému
        if (typeof navigation !== 'undefined') {
            navigation.init();
        }
        
        // Načtení uložených nastavení
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
        
        // Načtení dat pro konkrétní sekci
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
// NAČÍTÁNÍ DAT Z GOOGLE SHEETS - OPRAVENÁ VERZE
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
        
        // Použití správného CSV exportu s gid=0
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        log('🔗 CSV URL:', csvUrl);
        
        const csvData = await fetchCSVData(csvUrl);
        
        if (!csvData || csvData.trim().length === 0) {
            throw new Error('Google Sheets vrátil prázdná data. Zkontrolujte přístupová práva k tabulce.');
        }
        
        log('📄 Načteno CSV dat (první 200 znaků):', csvData.substring(0, 200));
        
        const parsedData = parseCSVData(csvData);
        
        // Synchronizace dat do všech globálních objektů
        window.donulandApp.data.historicalData = parsedData;
        window.donulandApp.data.lastDataLoad = new Date();
        
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
        
        log(`✅ Data úspěšně načtena: ${count} záznamů`);
        
        return parsedData;
        
    } catch (error) {
        logError('❌ Chyba při načítání dat:', error);
        updateStatusIndicator('error', 'Chyba načítání');
        showNotification(`❌ Chyba: ${error.message}`, 'error');
        
    } finally {
        window.donulandApp.data.isLoading = false;
        if (typeof globalData !== 'undefined') {
            globalData.isLoading = false;
        }
    }
};

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

// Načtení CSV dat s lepším error handlingem
async function fetchCSVData(csvUrl) {
    log('🌐 Načítám CSV data z:', csvUrl);
    
    // Zkusíme několik různých proxy služeb
    const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`,
        `https://cors-anywhere.herokuapp.com/${csvUrl}`,
        csvUrl // Přímé volání (pokud CORS není problém)
    ];
    
    for (let i = 0; i < proxies.length; i++) {
        try {
            log(`🔄 Zkouším proxy ${i + 1}/${proxies.length}:`, proxies[i]);
            
            const response = await fetch(proxies[i], {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv, text/plain, */*'
                }
            });
            
            log('📡 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            let csvText;
            if (i === 0) { // allorigins proxy
                const result = await response.json();
                csvText = result.contents;
            } else {
                csvText = await response.text();
            }
            
            if (csvText && csvText.trim().length > 0) {
                log('✅ Data úspěšně načtena');
                return csvText;
            } else {
                throw new Error('Prázdný response');
            }
            
        } catch (error) {
            logError(`❌ Proxy ${i + 1} selhala:`, error.message);
            if (i === proxies.length - 1) {
                throw new Error(`Nepodařilo se načíst data z Google Sheets. Zkuste: 1) Ověřit že je tabulka veřejně přístupná, 2) Zkontrolovat URL, 3) Zkusit později. Poslední chyba: ${error.message}`);
            }
        }
    }
}

// Vylepšené parsování CSV
function parseCSVData(csvText) {
    log('📝 Parsování CSV...');
    
    if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
        throw new Error('CSV data nejsou validní');
    }
    
    try {
        // Rozdělení na řádky a vyčištění
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        log(`📄 Počet řádků: ${lines.length}`);
        
        if (lines.length < 2) {
            throw new Error('CSV musí obsahovat alespoň hlavičku a jeden řádek dat');
        }
        
        // Parsování hlavičky
        const headers = parseCSVLine(lines[0]);
        log('📋 Hlavičky:', headers.slice(0, 10)); // Zobrazíme prvních 10
        
        if (headers.length === 0) {
            throw new Error('Hlavička CSV je prázdná');
        }
        
        const data = [];
        let validRows = 0;
        
        // Parsování datových řádků
        for (let i = 1; i < Math.min(lines.length, 1000); i++) {
            try {
                const values = parseCSVLine(lines[i]);
                
                if (values.length > 0) {
                    const row = {};
                    
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
        
        // Kontrola klíčových sloupců
        const sampleRow = data[0];
        if (sampleRow) {
            const hasDateColumn = headers.some(h => h.toLowerCase().includes('datum') || h === 'B');
            const hasNameColumn = headers.some(h => h.toLowerCase().includes('název') || h === 'D');
            const hasSalesColumn = headers.some(h => h.toLowerCase().includes('prodán') || h === 'N');
            
            log('📊 Detekované sloupce:', {
                datum: hasDateColumn,
                nazev: hasNameColumn,
                prodej: hasSalesColumn
            });
        }
        
        return data;
        
    } catch (error) {
        logError('❌ Chyba při parsování CSV:', error);
        throw new Error(`Chyba při parsování CSV dat: ${error.message}`);
    }
}

// Vylepšené parsování řádku CSV
function parseCSVLine(line) {
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
                // Escaped quote
                current += '"';
                i += 2;
                continue;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
        
        i++;
    }
    
    result.push(current.trim());
    return result.map(value => value.replace(/^"|"$/g, ''));
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
        
        // Detekce sloupců pro názvy akcí
        const eventNameColumns = headers.filter(h => 
            h.toLowerCase().includes('název') || 
            h.toLowerCase().includes('akce') ||
            h === 'D'
        );
        
        // Detekce sloupců pro města
        const cityColumns = headers.filter(h => 
            h.toLowerCase().includes('lokalita') || 
            h.toLowerCase().includes('město') ||
            h === 'C'
        );
        
        log('📋 Sloupce pro názvy akcí:', eventNameColumns);
        log('📋 Sloupce pro města:', cityColumns);
        
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
            
            const existingCities = ['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec'];
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
    
    // Odstranění existujících notifikací
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

// Kompatibilita se starými moduly
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

// Utility objekty pro kompatibilitu
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
        }
    };
}

log('🔧 Aplikace připravena');
