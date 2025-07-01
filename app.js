// ========================================
// DONULAND MANAGEMENT SYSTEM - MAIN APP
// Hlavní soubor aplikace - inicializace a koordinace
// ========================================

// Globální inicializace aplikace
document.addEventListener('DOMContentLoaded', function() {
    debug('🚀 Spouštím Donuland Management System...');
    
    // Delší zpoždění pro zajištění načtení všech scriptů
    setTimeout(() => {
        initializeApp();
    }, 1000);
});

// Hlavní inicializační funkce
async function initializeApp() {
    debug('📱 Inicializuji aplikaci...');
    
    try {
        // Kontrola, že všechny potřebné moduly jsou načtené
        const requiredModules = ['settings', 'navigation', 'ui', 'dataManager', 'predictor'];
        const missingModules = requiredModules.filter(module => typeof window[module] === 'undefined');
        
        if (missingModules.length > 0) {
            console.warn('⚠️ Chybí moduly:', missingModules);
            // Pokus o druhé spuštění za 1 sekundu
            setTimeout(() => {
                initializeApp();
            }, 1000);
            return;
        }
        
        // 1. Načtení a aplikace nastavení
        if (typeof settings !== 'undefined' && typeof settings.loadSettings === 'function') {
            settings.loadSettings();
        } else {
            console.warn('⚠️ Settings modul není dostupný');
        }
        
        // 2. Inicializace navigace
        if (typeof navigation !== 'undefined' && typeof navigation.init === 'function') {
            navigation.init();
        } else {
            console.warn('⚠️ Navigation modul není dostupný');
        }
        
        // 3. Nastavení event listenerů
        setupEventListeners();
        
        // 4. Počáteční načtení dat
        await performInitialDataLoad();
        
        // 5. Finalizace UI
        finalizeInitialization();
        
        debug('✅ Aplikace úspěšně inicializována');
        
    } catch (error) {
        debugError('❌ Kritická chyba při inicializaci aplikace:', error);
        showCriticalError(error);
    }
}

// Nastavení event listenerů
function setupEventListeners() {
    debug('🔗 Nastavuji event listenery...');
    
    // Formulářové prvky pro automatickou aktualizaci predikce
    const formElements = [
        'eventName', 'eventCategory', 'eventCity', 'eventDate',
        'expectedVisitors', 'eventDuration', 'competition', 
        'businessModel', 'rentType', 'donutPrice',
        'fixedRent', 'percentageRent', 'mixedFixed', 'mixedPercentage'
    ];
    
    formElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            // Debounced predikce pro input události
            const debouncedUpdate = utils.debounce(() => {
                if (isFormReadyForPrediction()) {
                    predictor.updatePrediction();
                }
            }, 1000);
            
            element.addEventListener('input', debouncedUpdate);
            element.addEventListener('change', () => {
                if (isFormReadyForPrediction()) {
                    predictor.updatePrediction();
                }
            });
        }
    });
    
    // Speciální handlery pro konkrétní pole
    const cityInput = document.getElementById('eventCity');
    if (cityInput) {
        cityInput.addEventListener('change', () => {
            if (typeof predictor !== 'undefined') {
                predictor.updateDistance();
                if (document.getElementById('eventDate').value) {
                    predictor.updateWeather();
                }
            }
        });
    }
    
    const dateInput = document.getElementById('eventDate');
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            if (typeof predictor !== 'undefined' && document.getElementById('eventCity').value) {
                predictor.updateWeather();
            }
        });
    }
    
    const businessModelSelect = document.getElementById('businessModel');
    if (businessModelSelect) {
        businessModelSelect.addEventListener('change', () => {
            if (typeof ui !== 'undefined') {
                ui.updateBusinessModelInfo(businessModelSelect.value);
                if (isFormReadyForPrediction()) {
                    predictor.updatePrediction();
                }
            }
        });
    }
    
    const rentTypeSelect = document.getElementById('rentType');
    if (rentTypeSelect) {
        rentTypeSelect.addEventListener('change', () => {
            if (typeof ui !== 'undefined') {
                ui.updateRentInputs(rentTypeSelect.value);
                if (isFormReadyForPrediction()) {
                    predictor.updatePrediction();
                }
            }
        });
    }
    
    // Window resize handler pro responsive design
    window.addEventListener('resize', utils.debounce(() => {
        handleWindowResize();
    }, 250));
    
    // Před zavřením stránky - uložení dat
    window.addEventListener('beforeunload', () => {
        if (typeof navigation !== 'undefined' && typeof navigation.saveFormData === 'function') {
            navigation.saveFormData();
        }
    });
    
    // Handler pro chyby JavaScriptu
    window.addEventListener('error', (event) => {
        debugError('Neočekávaná chyba:', event.error);
        if (typeof ui !== 'undefined') {
            ui.showNotification('⚠️ Došlo k neočekávané chybě. Zkuste obnovit stránku.', 'warning');
        }
    });
    
    debug('✅ Event listenery nastaveny');
}

// Počáteční načtení dat
async function performInitialDataLoad() {
    debug('📊 Spouštím počáteční načtení dat...');
    
    try {
        // Kontrola, zda jsou nastavení kompletní
        if (typeof settings !== 'undefined' && typeof settings.areSettingsComplete === 'function') {
            if (!settings.areSettingsComplete()) {
                if (typeof ui !== 'undefined') {
                    ui.showNotification('⚠️ Dokončete prosím nastavení v sekci Nastavení', 'warning');
                }
            }
        }
        
        // Pokus o automatické načtení dat z Google Sheets
        if (CONFIG && CONFIG.GOOGLE_SHEETS_URL) {
            debug('🔄 Pokouším se automaticky načíst data...');
            
            try {
                if (typeof dataManager !== 'undefined' && typeof dataManager.loadData === 'function') {
                    await dataManager.loadData();
                    debug('✅ Automatické načtení dat úspěšné');
                }
            } catch (error) {
                debugWarn('⚠️ Automatické načtení dat selhalo:', error.message);
                // Není kritické, uživatel může načíst data manuálně
            }
        }
        
    } catch (error) {
        debugWarn('⚠️ Chyba při počátečním načtení dat:', error);
        // Není kritická chyba, aplikace může fungovat bez dat
    }
}

// Finalizace inicializace
function finalizeInitialization() {
    debug('🎯 Finalizuji inicializaci...');
    
    // Skrytí loading screen a zobrazení hlavní aplikace
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        // Zobrazení uvítací zprávy
        if (typeof ui !== 'undefined') {
            ui.showNotification('🍩 Donuland Management System je připraven k použití!', 'success');
        }
        
        // Nastavení správného stavu status indikátoru
        if (typeof ui !== 'undefined' && globalData && globalData.historicalData) {
            if (globalData.historicalData.length > 0) {
                ui.updateStatusIndicator('online', `${globalData.historicalData.length} záznamů`);
            } else {
                ui.updateStatusIndicator('offline', 'Žádná data');
            }
        }
        
    }, 1000); // 1 sekunda místo 3 sekund
}

// Kontrola, zda je formulář připraven pro predikci
function isFormReadyForPrediction() {
    const requiredFields = [
        'eventName', 'eventCategory', 'eventCity', 'eventDate',
        'expectedVisitors', 'competition', 'businessModel', 'rentType'
    ];
    
    return requiredFields.every(fieldId => {
        const element = document.getElementById(fieldId);
        return element && element.value && element.value.trim().length > 0;
    });
}

// Handler pro změnu velikosti okna
function handleWindowResize() {
    const width = window.innerWidth;
    
    // Mobile/tablet adjustments
    if (width <= 768) {
        // Zajistíme, že sidebar je skrytý na mobilech
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !sidebar.querySelector('.mobile-menu-toggle')) {
            if (typeof navigation !== 'undefined' && typeof navigation.setupMobileMenu === 'function') {
                navigation.setupMobileMenu();
            }
        }
    }
    
    debug(`📱 Window resized to: ${width}x${window.innerHeight}`);
}

// Zobrazení kritické chyby
function showCriticalError(error) {
    const errorHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            font-family: 'Segoe UI', sans-serif;
        ">
            <div style="text-align: center; max-width: 500px; padding: 40px;">
                <div style="font-size: 4em; margin-bottom: 20px;">💥</div>
                <h1 style="margin-bottom: 20px;">Kritická chyba aplikace</h1>
                <p style="margin-bottom: 30px; font-size: 1.1em;">
                    Došlo k neočekávané chybě při inicializaci aplikace.
                </p>
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                    <code style="color: #ffeb3b;">${error.message}</code>
                </div>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #ff6b6b;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-size: 1.1em;
                    font-weight: bold;
                    cursor: pointer;
                ">
                    🔄 Obnovit stránku
                </button>
            </div>
        </div>
    `;
    
    document.body.innerHTML = errorHTML;
}

// Globální utility funkce dostupné v konzoli pro debugging
window.donuland = {
    // Data
    data: () => globalData || {},
    config: () => CONFIG || {},
    
    // Funkce
    loadData: () => typeof dataManager !== 'undefined' ? dataManager.loadData() : console.error('dataManager not loaded'),
    refreshData: () => typeof dataManager !== 'undefined' ? dataManager.refreshData() : console.error('dataManager not loaded'),
    clearCache: () => typeof utils !== 'undefined' ? utils.clearCache() : console.error('utils not loaded'),
    getStats: () => typeof dataManager !== 'undefined' ? dataManager.getDataStats() : console.error('dataManager not loaded'),
    
    // Test funkce
    testWeather: (city, date) => typeof weatherService !== 'undefined' ? weatherService.getWeather(city, date) : console.error('weatherService not loaded'),
    testDistance: (from, to) => typeof mapsService !== 'undefined' ? mapsService.calculateDistance(from, to) : console.error('mapsService not loaded'),
    testPrediction: () => typeof predictor !== 'undefined' ? predictor.updatePrediction() : console.error('predictor not loaded'),
    
    // Debug funkce
    enableDebug: () => { if (CONFIG) CONFIG.DEBUG = true; debug('Debug mode enabled'); },
    disableDebug: () => { if (CONFIG) CONFIG.DEBUG = false; console.log('Debug mode disabled'); },
    showData: () => globalData && globalData.historicalData ? console.table(globalData.historicalData.slice(0, 10)) : console.log('No data available'),
    
    // Status check
    checkModules: () => {
        const modules = ['CONFIG', 'utils', 'dataManager', 'ui', 'weatherService', 'mapsService', 'predictor', 'analysis', 'navigation', 'settings'];
        const status = {};
        modules.forEach(module => {
            status[module] = typeof window[module] !== 'undefined' ? '✅ Loaded' : '❌ Missing';
        });
        console.table(status);
        return status;
    }
};

// Export verzí pro debugging
console.log(`
🍩 Donuland Management System
============================
Verze: 1.0.0
Načteno: ${new Date().toLocaleString('cs-CZ')}
Debug: ${CONFIG && CONFIG.DEBUG ? 'Zapnut' : 'Vypnut'}

Dostupné funkce v konzoli:
- donuland.loadData() - načtení dat
- donuland.getStats() - statistiky dat
- donuland.testWeather('Praha', '2025-07-01') - test počasí
- donuland.enableDebug() - zapnutí debug módu
- donuland.showData() - zobrazení ukázky dat
- donuland.checkModules() - kontrola načtených modulů

Pro více informací: https://github.com/donuland/management-system
`);

debug('🎉 Donuland Management System připraven k použití!');
