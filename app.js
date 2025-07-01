// ========================================
// DONULAND MANAGEMENT SYSTEM - MAIN APP
// Hlavní soubor aplikace - zjednodušená inicializace
// ========================================

// Globální inicializace aplikace
document.addEventListener('DOMContentLoaded', function() {
    debug('🚀 Spouštím Donuland Management System...');
    
    setTimeout(() => {
        initializeApp();
    }, 500);
});

// Hlavní inicializační funkce
async function initializeApp() {
    debug('📱 Inicializuji aplikace...');
    
    try {
        // Kontrola načtených modulů
        const moduleCheck = checkRequiredModules();
        
        if (!moduleCheck.allLoaded) {
            console.warn(`⚠️ Chybí moduly: ${moduleCheck.missing.join(', ')}`);
            // Pokusíme se pokračovat i bez všech modulů
        }
        
        // 1. Načtení nastavení
        if (typeof settings !== 'undefined') {
            settings.loadSettings();
        }
        
        // 2. Inicializace navigace
        if (typeof navigation !== 'undefined') {
            navigation.init();
        }
        
        // 3. Nastavení event listenerů
        setupEventListeners();
        
        // 4. Počáteční načtení dat (na pozadí)
        performInitialDataLoad().catch(error => {
            debugWarn('⚠️ Počáteční načtení dat selhalo:', error);
        });
        
        // 5. Finalizace
        finalizeInitialization();
        
        debug('✅ Aplikace úspěšně inicializována');
        
    } catch (error) {
        debugError('❌ Chyba při inicializaci aplikace:', error);
        showCriticalError(error);
    }
}

// Kontrola načtených modulů
function checkRequiredModules() {
    const requiredModules = [
        'CONFIG', 'utils', 'ui', 'dataManager', 'predictor', 
        'analysis', 'weatherService', 'mapsService', 'navigation', 'settings'
    ];
    
    const missing = requiredModules.filter(module => typeof window[module] === 'undefined');
    
    return {
        allLoaded: missing.length === 0,
        missing: missing,
        loaded: requiredModules.length - missing.length,
        total: requiredModules.length
    };
}

// Nastavení event listenerů
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
                // Debounced predikce
                const debouncedUpdate = utils.debounce(() => {
                    try {
                        if (isFormReadyForPrediction() && typeof predictor !== 'undefined') {
                            predictor.updatePrediction();
                        }
                    } catch (error) {
                        debugError(`Chyba při aktualizaci predikce z ${elementId}:`, error);
                    }
                }, 1000);
                
                element.addEventListener('input', debouncedUpdate);
                element.addEventListener('change', debouncedUpdate);
            }
        });
        
        // Speciální handlery
        setupSpecialHandlers();
        
        // Globální event listenery
        setupGlobalEventListeners();
        
        debug('✅ Event listenery nastaveny');
        
    } catch (error) {
        debugError('❌ Chyba při nastavování event listenerů:', error);
    }
}

// Speciální handlery pro konkrétní pole
function setupSpecialHandlers() {
    try {
        // City change handler
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
        
        // Date change handler
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
        
        // Business model handler
        const businessModelSelect = document.getElementById('businessModel');
        if (businessModelSelect) {
            businessModelSelect.addEventListener('change', () => {
                try {
                    if (typeof ui !== 'undefined') {
                        ui.updateBusinessModelInfo(businessModelSelect.value);
                        if (isFormReadyForPrediction() && typeof predictor !== 'undefined') {
                            predictor.updatePrediction();
                        }
                    }
                } catch (error) {
                    debugError('Chyba při business model change:', error);
                }
            });
        }
        
        // Rent type handler
        const rentTypeSelect = document.getElementById('rentType');
        if (rentTypeSelect) {
            rentTypeSelect.addEventListener('change', () => {
                try {
                    if (typeof ui !== 'undefined') {
                        ui.updateRentInputs(rentTypeSelect.value);
                        if (isFormReadyForPrediction() && typeof predictor !== 'undefined') {
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
        // Window resize handler
        window.addEventListener('resize', utils.debounce(() => {
            try {
                handleWindowResize();
            } catch (error) {
                debugError('Chyba při resize:', error);
            }
        }, 250));
        
        // Před zavřením stránky
        window.addEventListener('beforeunload', () => {
            try {
                if (typeof navigation !== 'undefined' && typeof navigation.saveFormData === 'function') {
                    navigation.saveFormData();
                }
            } catch (error) {
                debugError('Chyba při ukládání před zavřením:', error);
            }
        });
        
        // Global error handler
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
        
    } catch (error) {
        debugWarn('Chyba při nastavování globálních event listenerů:', error);
    }
}

// Počáteční načtení dat
async function performInitialDataLoad() {
    debug('📊 Spouštím počáteční načtení dat...');
    
    try {
        // Kontrola nastavení
        if (typeof settings !== 'undefined' && typeof settings.areSettingsComplete === 'function') {
            if (!settings.areSettingsComplete()) {
                if (typeof ui !== 'undefined') {
                    ui.showNotification('⚠️ Dokončete prosím nastavení v sekci Nastavení', 'warning');
                }
            }
        }
        
        // Pokus o automatické načtení dat
        if (CONFIG && CONFIG.GOOGLE_SHEETS_URL) {
            debug('🔄 Pokouším se automaticky načíst data...');
            
            if (typeof dataManager !== 'undefined' && typeof dataManager.loadData === 'function') {
                await dataManager.loadData();
                debug('✅ Automatické načtení dat úspěšné');
            }
        }
        
    } catch (error) {
        debugWarn('⚠️ Chyba při počátečním načtení dat:', error);
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
            
            // Aktualizace status indikátoru
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
        
        // Mobile adjustments
        if (width <= 768) {
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
            </div>
        </div>
    `;
    
    document.body.innerHTML = errorHTML;
}

// Globální utility funkce pro debugging
window.donuland = {
    data: () => globalData || {},
    config: () => CONFIG || {},
    loadData: () => typeof dataManager !== 'undefined' ? dataManager.loadData() : console.error('dataManager not loaded'),
    checkModules: () => {
        const moduleCheck = checkRequiredModules();
        console.log(`Načteno ${moduleCheck.loaded}/${moduleCheck.total} modulů`);
        if (moduleCheck.missing.length > 0) {
            console.warn('Chybí moduly:', moduleCheck.missing);
        }
        return moduleCheck;
    },
    restart: () => location.reload()
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
- donuland.checkModules() - kontrola modulů
- donuland.restart() - restart aplikace
`);

debug('🎉 Donuland Management System připraven k použití!');
