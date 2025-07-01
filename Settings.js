// ========================================
// DONULAND MANAGEMENT SYSTEM - SETTINGS
// Správa nastavení aplikace
// ========================================

const settings = {
    // Uložení všech nastavení
    saveSettings() {
        try {
            const settingsData = {
                // API nastavení
                googleSheetsUrl: document.getElementById('googleSheetsUrl').value.trim(),
// ========================================
// DONULAND MANAGEMENT SYSTEM - SETTINGS
// Správa nastavení aplikace
// ========================================

const settings = {
    // Uložení všech nastavení
    saveSettings() {
        try {
            const settingsData = {
                // API nastavení
                googleSheetsUrl: document.getElementById('googleSheetsUrl').value.trim(),
                weatherApiKey: document.getElementById('weatherApiKey').value.trim(),
                mapsApiKey: document.getElementById('mapsApiKey').value.trim(),
                
                // Business parametry
                donutCost: parseFloat(document.getElementById('donutCost').value) || CONFIG.DONUT_COST,
                franchisePrice: parseFloat(document.getElementById('franchisePrice').value) || CONFIG.FRANCHISE_PRICE,
                hourlyWage: parseFloat(document.getElementById('hourlyWage').value) || CONFIG.HOURLY_WAGE,
                workHours: parseFloat(document.getElementById('workHours').value) || CONFIG.WORK_HOURS,
                fuelCostPerKm: parseFloat(document.getElementById('fuelCostPerKm').value) || CONFIG.FUEL_COST_PER_KM,
                
                // Metadata
                savedAt: new Date().toISOString(),
                version: '1.0'
            };

            // Validace nastavení
            const validation = this.validateSettings(settingsData);
            if (!validation.isValid) {
                ui.showNotification(`❌ Chyba v nastavení: ${validation.errors.join(', ')}`, 'error');
                return false;
            }

            // Uložení do localStorage
            localStorage.setItem('donulandSettings', JSON.stringify(settingsData));
            
            // Aktualizace globální konfigurace
            this.updateGlobalConfig(settingsData);
            
            ui.showNotification('✅ Nastavení byla úspěšně uložena', 'success');
            debug('💾 Nastavení uložena:', settingsData);
            
            return true;

        } catch (error) {
            debugError('Chyba při ukládání nastavení:', error);
            ui.showNotification('❌ Chyba při ukládání nastavení: ' + error.message, 'error');
            return false;
        }
    },

    // Načtení uložených nastavení
    loadSettings() {
        try {
            const saved = localStorage.getItem('donulandSettings');
            if (!saved) {
                debug('📋 Žádná uložená nastavení nenalezena, používám výchozí');
                this.setDefaultSettings();
                return;
            }

            const settingsData = JSON.parse(saved);
            debug('🔄 Načítám uložená nastavení:', settingsData);

            // Aplikace nastavení na formulář
            this.applySettingsToForm(settingsData);
            
            // Aktualizace globální konfigurace
            this.updateGlobalConfig(settingsData);

            debug('✅ Nastavení úspěšně načtena');

        } catch (error) {
            debugError('Chyba při načítání nastavení:', error);
            ui.showNotification('⚠️ Chyba při načítání nastavení, používám výchozí hodnoty', 'warning');
            this.setDefaultSettings();
        }
    },

    // Aplikace nastavení na formulářové prvky
    applySettingsToForm(settingsData) {
        const fieldMap = {
            googleSheetsUrl: 'googleSheetsUrl',
            weatherApiKey: 'weatherApiKey',
            mapsApiKey: 'mapsApiKey',
            donutCost: 'donutCost',
            franchisePrice: 'franchisePrice',
            hourlyWage: 'hourlyWage',
            workHours: 'workHours',
            fuelCostPerKm: 'fuelCostPerKm'
        };

        Object.entries(fieldMap).forEach(([elementId, settingKey]) => {
            const element = document.getElementById(elementId);
            if (element && settingsData[settingKey] !== undefined) {
                element.value = settingsData[settingKey];
            }
        });
    },

    // Nastavení výchozích hodnot
    setDefaultSettings() {
        const defaults = {
            googleSheetsUrl: CONFIG.GOOGLE_SHEETS_URL,
            weatherApiKey: CONFIG.WEATHER_API_KEY,
            mapsApiKey: CONFIG.MAPS_API_KEY,
            donutCost: CONFIG.DONUT_COST,
            franchisePrice: CONFIG.FRANCHISE_PRICE,
            hourlyWage: CONFIG.HOURLY_WAGE,
            workHours: CONFIG.WORK_HOURS,
            fuelCostPerKm: CONFIG.FUEL_COST_PER_KM
        };

        this.applySettingsToForm(defaults);
        debug('🔧 Výchozí nastavení aplikována');
    },

    // Validace nastavení
    validateSettings(settingsData) {
        const errors = [];

        // Validace URL
        if (settingsData.googleSheetsUrl && !utils.isValidUrl(settingsData.googleSheetsUrl)) {
            errors.push('Neplatné Google Sheets URL');
        }

        // Validace API klíčů (základní kontrola délky)
        if (settingsData.weatherApiKey && settingsData.weatherApiKey.length < 10) {
            errors.push('Weather API klíč je příliš krátký');
        }

        if (settingsData.mapsApiKey && settingsData.mapsApiKey.length < 10) {
            errors.push('Google Maps API klíč je příliš krátký');
        }

        // Validace číselných hodnot
        const numericFields = [
            { key: 'donutCost', min: 10, max: 100, name: 'Náklad na donut' },
            { key: 'franchisePrice', min: 30, max: 200, name: 'Cena pro franšízanty' },
            { key: 'hourlyWage', min: 50, max: 1000, name: 'Hodinová mzda' },
            { key: 'workHours', min: 1, max: 24, name: 'Pracovní hodiny' },
            { key: 'fuelCostPerKm', min: 1, max: 50, name: 'Náklady na dopravu' }
        ];

        numericFields.forEach(field => {
            const value = settingsData[field.key];
            if (value !== undefined) {
                if (isNaN(value) || value < field.min || value > field.max) {
                    errors.push(`${field.name} musí být mezi ${field.min} a ${field.max}`);
                }
            }
        });

        // Logická kontrola - franšíza musí být dražší než náklad
        if (settingsData.franchisePrice <= settingsData.donutCost) {
            errors.push('Cena pro franšízanty musí být vyšší než náklad na donut');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // Aktualizace globální konfigurace
    updateGlobalConfig(settingsData) {
        // Aktualizace CONFIG objektu
        if (settingsData.googleSheetsUrl) CONFIG.GOOGLE_SHEETS_URL = settingsData.googleSheetsUrl;
        if (settingsData.weatherApiKey) CONFIG.WEATHER_API_KEY = settingsData.weatherApiKey;
        if (settingsData.mapsApiKey) CONFIG.MAPS_API_KEY = settingsData.mapsApiKey;
        if (settingsData.donutCost) CONFIG.DONUT_COST = settingsData.donutCost;
        if (settingsData.franchisePrice) CONFIG.FRANCHISE_PRICE = settingsData.franchisePrice;
        if (settingsData.hourlyWage) CONFIG.HOURLY_WAGE = settingsData.hourlyWage;
        if (settingsData.workHours) CONFIG.WORK_HOURS = settingsData.workHours;
        if (settingsData.fuelCostPerKm) CONFIG.FUEL_COST_PER_KM = settingsData.fuelCostPerKm;

        debug('🔧 Globální konfigurace aktualizována');
    },

    // Test připojení k API službám
    async testConnections() {
        ui.showNotification('🔧 Testuji připojení ke službám...', 'info');
        
        const results = [];
        let allPassed = true;

        // Test Weather API
        try {
            const weatherKey = document.getElementById('weatherApiKey').value.trim();
            if (!weatherKey) {
                results.push('⚠️ Weather API: Není nastaven klíč');
                allPassed = false;
            } else {
                await this.testWeatherAPI(weatherKey);
                results.push('✅ Weather API: Připojení úspěšné');
            }
        } catch (error) {
            results.push(`❌ Weather API: ${error.message}`);
            allPassed = false;
        }

        // Test Google Sheets
        try {
            const sheetsUrl = document.getElementById('googleSheetsUrl').value.trim();
            if (!sheetsUrl) {
                results.push('⚠️ Google Sheets: Není nastavena URL');
                allPassed = false;
            } else {
                await this.testGoogleSheets(sheetsUrl);
                results.push('✅ Google Sheets: Přístup úspěšný');
            }
        } catch (error) {
            results.push(`❌ Google Sheets: ${error.message}`);
            allPassed = false;
        }

        // Test Google Maps API (základní)
        try {
            const mapsKey = document.getElementById('mapsApiKey').value.trim();
            if (!mapsKey) {
                results.push('⚠️ Google Maps API: Není nastaven klíč');
                allPassed = false;
            } else {
                results.push('ℹ️ Google Maps API: Klíč nastaven (test při výpočtu vzdálenosti)');
            }
        } catch (error) {
            results.push(`❌ Google Maps API: ${error.message}`);
            allPassed = false;
        }

        // Zobrazení výsledků
        const notificationType = allPassed ? 'success' : 'warning';
        const summary = allPassed ? 'Všechna připojení fungují správně' : 'Některá připojení mají problémy';
        
        ui.showNotification(
            `${summary}\n\n${results.join('\n')}`,
            notificationType,
            8000
        );

        debug('🔧 Test připojení dokončen:', results);
    },

    // Test Weather API
    async testWeatherAPI(apiKey) {
        const testUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
            `https://api.openweathermap.org/data/2.5/weather?q=Praha&appid=${apiKey}&units=metric`
        )}`;

        const response = await utils.retry(async () => {
            const res = await fetch(testUrl);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return res;
        }, 2);

        const data = await response.json();
        const weatherData = JSON.parse(data.contents);

        if (weatherData.cod !== 200) {
            throw new Error(`API error: ${weatherData.message}`);
        }

        debug('🌤️ Weather API test úspěšný');
    },

    // Test Google Sheets
    async testGoogleSheets(sheetsUrl) {
        const sheetId = utils.extractSheetId(sheetsUrl);
        if (!sheetId) {
            throw new Error('Neplatné Google Sheets URL');
        }

        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;

        const response = await utils.retry(async () => {
            const res = await fetch(proxyUrl);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return res;
        }, 2);

        const data = await response.json();
        const csvText = data.contents;

        if (!csvText || csvText.trim().length === 0) {
            throw new Error('Prázdný response - zkontrolujte přístupová práva');
        }

        // Pokus o parsování CSV
        const parsed = utils.parseCSV(csvText);
        if (parsed.length === 0) {
            throw new Error('CSV nelze parsovat');
        }

        debug('📊 Google Sheets test úspěšný, načteno řádků:', parsed.length);
    },

    // Reset nastavení na výchozí hodnoty
    resetToDefaults() {
        if (confirm('Opravdu chcete obnovit všechna nastavení na výchozí hodnoty?')) {
            try {
                // Vymazání z localStorage
                localStorage.removeItem('donulandSettings');
                
                // Nastavení výchozích hodnot
                this.setDefaultSettings();
                
                // Vyčištění cache
                utils.clearCache();
                globalData.weatherCache.clear();
                globalData.distanceCache.clear();
                
                ui.showNotification('✅ Nastavení obnovena na výchozí hodnoty', 'success');
                debug('🔧 Nastavení resetována na výchozí');
                
            } catch (error) {
                debugError('Chyba při resetování nastavení:', error);
                ui.showNotification('❌ Chyba při resetování nastavení', 'error');
            }
        }
    },

    // Export nastavení do souboru
    exportSettings() {
        try {
            const settingsData = {
                googleSheetsUrl: document.getElementById('googleSheetsUrl').value,
                weatherApiKey: document.getElementById('weatherApiKey').value,
                mapsApiKey: document.getElementById('mapsApiKey').value,
                donutCost: document.getElementById('donutCost').value,
                franchisePrice: document.getElementById('franchisePrice').value,
                hourlyWage: document.getElementById('hourlyWage').value,
                workHours: document.getElementById('workHours').value,
                fuelCostPerKm: document.getElementById('fuelCostPerKm').value,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(settingsData, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `donuland-nastaveni-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            ui.showNotification('📄 Nastavení exportována do souboru', 'success');

        } catch (error) {
            debugError('Chyba při exportu nastavení:', error);
            ui.showNotification('❌ Chyba při exportu nastavení', 'error');
        }
    },

    // Import nastavení ze souboru
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            try {
                const file = event.target.files[0];
                if (!file) return;

                const text = await file.text();
                const settingsData = JSON.parse(text);

                // Validace importovaných dat
                const validation = this.validateSettings(settingsData);
                if (!validation.isValid) {
                    ui.showNotification(`❌ Neplatná nastavení: ${validation.errors.join(', ')}`, 'error');
                    return;
                }

                // Aplikace nastavení
                this.applySettingsToForm(settingsData);
                
                ui.showNotification('✅ Nastavení úspěšně importována. Nezapomeňte je uložit!', 'success');

            } catch (error) {
                debugError('Chyba při importu nastavení:', error);
                ui.showNotification('❌ Chyba při importu nastavení: ' + error.message, 'error');
            }
        };

        input.click();
    },

    // Získání aktuálního nastavení
    getCurrentSettings() {
        return {
            googleSheetsUrl: document.getElementById('googleSheetsUrl').value,
            weatherApiKey: document.getElementById('weatherApiKey').value,
            mapsApiKey: document.getElementById('mapsApiKey').value,
            donutCost: parseFloat(document.getElementById('donutCost').value),
            franchisePrice: parseFloat(document.getElementById('franchisePrice').value),
            hourlyWage: parseFloat(document.getElementById('hourlyWage').value),
            workHours: parseFloat(document.getElementById('workHours').value),
            fuelCostPerKm: parseFloat(document.getElementById('fuelCostPerKm').value)
        };
    },

    // Kontrola, zda jsou nastavení kompletní
    areSettingsComplete() {
        const settings = this.getCurrentSettings();
        
        const required = [
            'googleSheetsUrl',
            'weatherApiKey', 
            'donutCost',
            'franchisePrice',
            'hourlyWage'
        ];

        return required.every(key => {
            const value = settings[key];
            return value && value.toString().trim().length > 0;
        });
    }
};
