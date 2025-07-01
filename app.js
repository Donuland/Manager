// ========================================
// DONULAND MANAGEMENT SYSTEM - MAIN APP
// Hlavní soubor aplikace - inicializace a koordinace
// ========================================

// Globální inicializace aplikace
document.addEventListener('DOMContentLoaded', function() {
    debug('🚀 Spouštím Donuland Management System...');
    
    // Robustnější inicializace s retry mechanismem
    initializeAppWithRetry();
});

// Hlavní inicializační funkce s retry
async function initializeAppWithRetry(attempt = 1, maxAttempts = 3) {
    debug(`📱 Inicializuji aplikaci (pokus ${attempt}/${maxAttempts})...`);
    
    try {
        // Kontrola, že všechny potřebné moduly jsou načtené
        const moduleCheck = checkRequiredModules();
        
        if (!moduleCheck.allLoaded && attempt < maxAttempts) {
            console.warn(`⚠️ Chybí moduly: ${moduleCheck.missing.join(', ')}. Zkouším znovu za 1s...`);
            setTimeout(() => {
                initializeAppWithRetry(attempt + 1, maxAttempts);
            }, 1000);
            return;
        }
        
        if (!moduleCheck.allLoaded) {
            throw new Error(`Kritické moduly nenačtené: ${moduleCheck.missing.join(', ')}`);
        }
        
        // Postupná inicializace s error handling
        await initializeApp();
        
    } catch (error) {
        debugError('❌ Kritická chyba při inicializaci aplikace:', error);
        
        if (attempt < maxAttempts) {
            console.warn(`⚠️ Zkouším reinicializaci za 2s (pokus ${attempt + 1}/${maxAttempts})`);
            setTimeout(() => {
                initializeAppWithRetry(attempt + 1, maxAttempts);
            }, 2000);
        } else {
            showCriticalError(error);
        }
    }
}

// Kontrola načtených modulů
function checkRequiredModules() {
    const requiredModules = [
        { name: 'CONFIG', obj: window.CONFIG },
        { name: 'utils', obj: window.utils },
        { name: 'ui', obj: window.ui },
        { name: 'dataManager', obj: window.dataManager },
        { name: 'predictor', obj: window.predictor },
        { name: 'analysis', obj: window.analysis },
        { name: 'weatherService', obj: window.weatherService },
        { name: 'mapsService', obj: window.mapsService },
        { name: 'navigation', obj: window.navigation },
        { name: 'settings', obj: window.settings }
    ];
    
    const missing = [];
    
    for (const module of requiredModules) {
        if (typeof module.obj === 'undefined') {
            missing.push(module.name);
        }
    }
    
    return {
        allLoaded: missing.length === 0,
        missing: missing,
        loaded: requiredModules.length - missing.length,
        total: requiredModules.length
    };
}

// Hlavní inicializační funkce
async function initializeApp() {
    debug('📱 Inicializuji aplikaci...');
    
    try {
        // 1. Načtení a aplikace nastavení
        await safeModuleCall('settings.loadSettings', () => {
            if (typeof settings !== 'undefined' && typeof settings.loadSettings === 'function') {
                settings.loadSettings();
                return true;
            }
            return false;
        });
        
        // 2. Inicializace navigace
        await safeModuleCall('navigation.init', () => {
            if (typeof navigation !== 'undefined' && typeof navigation.init === 'function') {
                navigation.init();
                return true;
            }
            return false;
        });
        
        // 3. Nastavení event listenerů
        setupEventListeners();
        
        // 4. Počáteční načtení dat (non-blocking)
        performInitialDataLoad().catch(error => {
            debugWarn('⚠️ Počáteční načtení dat selhalo:', error);
        });
        
        // 5. Finalizace UI
        finalizeInitialization();
        
        debug('✅ Aplikace úspěšně inicializována');
        
    } catch (error) {
        debugError('❌ Chyba při inicializaci aplikace:', error);
        throw error;
    }
}

// Bezpečné volání modulů
async function safeModuleCall(moduleName, moduleFunction) {
    try {
        const result = await moduleFunction();
        if (result !== false) {
            debug(`✅ ${moduleName} - úspěšně inicializován`);
        } else {
            debugWarn(`⚠️ ${moduleName} - modul není dostupný`);
        }
        return result;
    } catch (error) {
        debugError(`❌ ${moduleName} - chyba při inicializaci:`, error);
        return false;
    }
}

// Nastavení event listenerů s error handling
function setupEventListeners() {
    debug('🔗 Nastavuji event listenery...');
    
    try {
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
                    try {
                        if (isFormReadyForPrediction()) {
                            predictor.updatePrediction();
                        }
                    } catch (error) {
                        debugError(`Chyba při aktualizaci predikce z ${elementId}:`, error);
                    }
                }, 1000);
                
                element.addEventListener('input', debouncedUpdate);
                element.addEventListener('change', () => {
                    try {
                        if (isFormReadyForPrediction()) {
                            predictor.updatePrediction();
                        }
                    } catch (error) {
                        debugError(`Chyba při change predikce z ${elementId}:`, error);
                    }
                });
            }
        });
        
        // Speciální handlery s error handling
        setupSpecialHandlers();
        
        // Globální event listenery
        setupGlobalEventListeners();
        
        debug('✅ Event listenery nastaveny');
        
    } catch (error) {
        debugError('❌ Chyba při nastavování event listenerů:', error);
        throw error;
    }
}

// Speciální handlery pro konkrétní pole
function setupSpecialHandlers() {
    try {
        const cityInput = document.getElementById('eventCity');
        if (cityInput) {
            cityInput.addEventListener('change', () => {
                try {
                    if (typeof predictor !== 'undefined') {
                        predictor.updateDistance();
                        if (document.getElementById('eventDate').value) {
                            predictor.updateWeather();
                        }
                    }
                } catch (error) {
                    debugError('Chyba při city change:', error);
                }
            });
        }
        
        const dateInput = document.getElementById('eventDate');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                try {
                    if (typeof predictor !== 'undefined' && document.getElementById('eventCity').value) {
                        predictor.updateWeather();
                    }
                } catch (error) {
                    debugError('Chyba při date change:', error);
                }
            });
        }
        
        const businessModelSelect = document.getElementById('businessModel');
        if (businessModelSelect) {
            businessModelSelect.addEventListener('change', () => {
                try {
                    if (typeof ui !== 'undefined') {
                        ui.updateBusinessModelInfo(businessModelSelect.value);
                        if (isFormReadyForPrediction()) {
                            predictor.updatePrediction();
                        }
                    }
                } catch (error) {
                    debugError('Chyba při business model change:', error);
                }
            });
        }
        
        const rentTypeSelect = document.getElementById('rentType');
        if (rentTypeSelect) {
            rentTypeSelect.addEventListener('change', () => {
                try {
                    if (typeof ui !== 'undefined') {
                        ui.updateRentInputs(rentTypeSelect.value);
                        if (isFormReadyForPrediction()) {
                            predictor.updatePrediction();
                        }
                    }
                } catch (error) {
                    debugError('Chyba při rent type change:', error);
                }
            });
        }
        
    } catch (error) {
        debugWarn('Chyba při nastavování speciálních handlerů:', error);
    }
}

// Globální event listenery
function setupGlobalEventListeners() {
    try {
        // Window resize handler pro responsive design
        window.addEventListener('resize', utils.debounce(() => {
            try {
                handleWindowResize();
            } catch (error) {
                debugError('Chyba při resize:', error);
            }
        }, 250));
        
        // Před zavřením stránky - uložení dat
        window.addEventListener('beforeunload', () => {
            try {
                if (typeof navigation !== 'undefined' && typeof navigation.saveFormData === 'function') {
                    navigation.saveFormData();
                }
            } catch (error) {
                debugError('Chyba při ukládání před zavřením:', error);
            }
        });
        
        // Handler pro chyby JavaScriptu
        window.addEventListener('error', (event) => {
            debugError('Neočekávaná chyba:', event.error);
            try {
                if (typeof ui !== 'undefined') {
                    ui.showNotification('⚠️ Došlo k neočekávané chybě. Zkuste obnovit stránku.', 'warning');
                }
            } catch (uiError) {
                console.error('Chyba při zobrazování error notifikace:', uiError);
            }
        });
        
        // Handler pro unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            debugError('Unhandled promise rejection:', event.reason);
            try {
                if (typeof ui !== 'undefined') {
                    ui.showNotification('⚠️ Došlo k chybě při komunikaci se službami.', 'warning');
                }
            } catch (uiError) {
                console.error('Chyba při zobrazování promise error notifikace:', uiError);
            }
        });
        
    } catch (error) {
        debugWarn('Chyba při nastavování globálních event listenerů:', error);
    }
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
    
    try {
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
            updateInitialStatusIndicator();
            
        }, 1000);
        
    } catch (error) {
        debugError('Chyba při finalizaci:', error);
        // Pokusíme se alespoň skrýt loading screen
        try {
            const loadingScreen = document.getElementById('loadingScreen');
            const mainApp = document.getElementById('mainApp');
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (mainApp) mainApp.style.display = 'block';
        } catch (finalError) {
            debugError('Kritická chyba při finalizaci UI:', finalError);
        }
    }
}

// Aktualizace počátečního status indikátoru
function updateInitialStatusIndicator() {
    try {
        if (typeof ui !== 'undefined' && globalData && globalData.historicalData) {
            if (globalData.historicalData.length > 0) {
                ui.updateStatusIndicator('online', `${globalData.historicalData.length} záznamů`);
            } else {
                ui.updateStatusIndicator('offline', 'Žádná data');
            }
        }
    } catch (error) {
        debugWarn('Chyba při aktualizaci status indikátoru:', error);
    }
}

// Kontrola, zda je formulář připraven pro predikci
function isFormReadyForPrediction() {
    try {
        const requiredFields = [
            'eventName', 'eventCategory', 'eventCity', 'eventDate',
            'expectedVisitors', 'competition', 'businessModel', 'rentType'
        ];
        
        return requiredFields.every(fieldId => {
            const element = document.getElementById(fieldId);
            return element && element.value && element.value.trim().length > 0;
        });
    } catch (error) {
        debugError('Chyba při kontrole formuláře:', error);
        return false;
    }
}

// Handler pro změnu velikosti okna
function handleWindowResize() {
    try {
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
    } catch (error) {
        debugError('Chyba při resize handling:', error);
    }
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
                <div style="margin-top: 20px; font-size: 0.9em; opacity: 0.8;">
                    Pokud problém přetrvává, zkontrolujte konzoli prohlížeče (F12)
                </div>
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
    loadData: () => {
        try {
            return typeof dataManager !== 'undefined' ? dataManager.loadData() : console.error('dataManager not loaded');
        } catch (error) {
            console.error('Error loading data:', error);
        }
    },
    refreshData: () => {
        try {
            return typeof dataManager !== 'undefined' ? dataManager.refreshData() : console.error('dataManager not loaded');
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    },
    clearCache: () => {
        try {
            return typeof utils !== 'undefined' ? utils.clearCache() : console.error('utils not loaded');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    },
    getStats: () => {
        try {
            return typeof dataManager !== 'undefined' ? dataManager.getDataStats() : console.error('dataManager not loaded');
        } catch (error) {
            console.error('Error getting stats:', error);
        }
    },
    
    // Test funkce
    testWeather: (city, date) => {
        try {
            return typeof weatherService !== 'undefined' ? weatherService.getWeather(city, date) : console.error('weatherService not loaded');
        } catch (error) {
            console.error('Error testing weather:', error);
        }
    },
    testDistance: (from, to) => {
        try {
            return typeof mapsService !== 'undefined' ? mapsService.calculateDistance(from, to) : console.error('mapsService not loaded');
        } catch (error) {
            console.error('Error testing distance:', error);
        }
    },
    testPrediction: () => {
        try {
            return typeof predictor !== 'undefined' ? predictor.updatePrediction() : console.error('predictor not loaded');
        } catch (error) {
            console.error('Error testing prediction:', error);
        }
    },
    
    // Debug funkce
    enableDebug: () => { 
        try {
            if (CONFIG) CONFIG.DEBUG = true; 
            debug('Debug mode enabled'); 
        } catch (error) {
            console.error('Error enabling debug:', error);
        }
    },
    disableDebug: () => { 
        try {
            if (CONFIG) CONFIG.DEBUG = false; 
            console.log('Debug mode disabled'); 
        } catch (error) {
            console.error('Error disabling debug:', error);
        }
    },
    showData: () => {
        try {
            return globalData && globalData.historicalData ? console.table(globalData.historicalData.slice(0, 10)) : console.log('No data available');
        } catch (error) {
            console.error('Error showing data:', error);
        }
    },
    
    // Status check
    checkModules: () => {
        try {
            const moduleCheck = checkRequiredModules();
            console.log(`Načteno ${moduleCheck.loaded}/${moduleCheck.total} modulů`);
            if (moduleCheck.missing.length > 0) {
                console.warn('Chybí moduly:', moduleCheck.missing);
            }
            return moduleCheck;
        } catch (error) {
            console.error('Error checking modules:', error);
        }
    },

    // Restart aplikace
    restart: () => {
        try {
            console.log('🔄 Restartování aplikace...');
            location.reload();
        } catch (error) {
            console.error('Error restarting app:', error);
        }
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
- donuland.restart() - restart aplikace

Pro více informací: https://github.com/donuland/management-system
`);

debug('🎉 Donuland Management System připraven k použití!');
