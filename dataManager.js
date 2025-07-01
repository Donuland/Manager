// ========================================
// DONULAND MANAGEMENT SYSTEM - DATA MANAGER
// Zjednodušená správa načítání dat z Google Sheets
// ========================================

const dataManager = {
    // Načtení dat z Google Sheets
    async loadData() {
        if (globalData.isLoading) {
            console.log('Načítání již probíhá...');
            return;
        }

        globalData.isLoading = true;
        ui.showNotification('🔄 Načítám data z Google Sheets...', 'info');
        ui.updateStatusIndicator('loading', 'Načítám...');

        try {
            const sheetUrl = document.getElementById('googleSheetsUrl').value;
            const sheetId = utils.extractSheetId(sheetUrl);
            
            if (!sheetId) {
                throw new Error('Neplatné Google Sheets URL');
            }

            console.log('Načítám data ze Sheet ID:', sheetId);

            // Načtení dat přes CORS proxy
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const csvText = data.contents;

            if (!csvText || csvText.trim().length === 0) {
                throw new Error('Prázdný response z Google Sheets');
            }

            // Parsování CSV dat
            globalData.historicalData = utils.parseCSV(csvText);
            globalData.lastDataLoad = new Date();

            console.log(`✅ Načteno ${globalData.historicalData.length} záznamů`);

            // Aktualizace autocomplete
            this.updateAutocomplete();

            // Aktualizace UI
            ui.showNotification(`✅ Úspěšně načteno ${globalData.historicalData.length} záznamů!`, 'success');
            ui.updateStatusIndicator('online', `${globalData.historicalData.length} záznamů`);

            return globalData.historicalData;

        } catch (error) {
            console.error('Chyba při načítání Google Sheets:', error);
            ui.showNotification(`❌ Chyba při načítání dat: ${error.message}`, 'error');
            ui.updateStatusIndicator('error', 'Chyba načítání');
            throw error;

        } finally {
            globalData.isLoading = false;
        }
    },

    // Aktualizace autocomplete seznamů
    updateAutocomplete() {
        if (globalData.historicalData.length === 0) return;

        try {
            // Nalezení správných sloupců
            const nameColumn = utils.findColumn(globalData.historicalData, ['Název akce', 'D']);
            const cityColumn = utils.findColumn(globalData.historicalData, ['Lokalita', 'C']);

            // Extrakce unikátních názvů akcí
            const eventNames = [...new Set(globalData.historicalData
                .map(row => row[nameColumn] || '')
                .filter(name => name && name.trim().length > 0)
                .map(name => name.trim()))]
                .sort();

            // Extrakce unikátních měst
            const cities = [...new Set(globalData.historicalData
                .map(row => row[cityColumn] || '')
                .filter(city => city && city.trim().length > 0)
                .map(city => city.trim()))]
                .sort();

            // Aktualizace datalist pro názvy akcí
            const eventDatalist = document.getElementById('eventNamesList');
            if (eventDatalist && eventNames.length > 0) {
                eventDatalist.innerHTML = eventNames
                    .map(name => `<option value="${utils.escapeHtml(name)}">`)
                    .join('');
                console.log(`✅ Autocomplete: ${eventNames.length} názvů akcí`);
            }

            // Aktualizace datalist pro města
            const citiesDatalist = document.getElementById('citiesList');
            if (citiesDatalist && cities.length > 0) {
                const existingCities = Array.from(citiesDatalist.options).map(opt => opt.value);
                const allCities = [...new Set([...existingCities, ...cities])].sort();
                
                citiesDatalist.innerHTML = allCities
                    .map(city => `<option value="${utils.escapeHtml(city)}">`)
                    .join('');
                console.log(`✅ Autocomplete: ${allCities.length} měst celkem`);
            }

        } catch (error) {
            console.warn('Chyba při aktualizaci autocomplete:', error);
        }
    },

    // Získání historických dat pro predikci
    getHistoricalData(eventName = '', city = '', category = '') {
        if (globalData.historicalData.length === 0) {
            return { matches: [], summary: null };
        }

        try {
            const nameColumn = utils.findColumn(globalData.historicalData, ['Název akce', 'D']);
            const cityColumn = utils.findColumn(globalData.historicalData, ['Lokalita', 'C']);
            const categoryColumn = utils.findColumn(globalData.historicalData, ['kategorie', 'E']);
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);

            // Filtrování podle kritérií
            let matches = globalData.historicalData.filter(row => {
                const rowName = (row[nameColumn] || '').toLowerCase().trim();
                const rowCity = (row[cityColumn] || '').toLowerCase().trim();
                const rowCategory = (row[categoryColumn] || '').toLowerCase().trim();
                const sales = parseFloat(row[salesColumn] || 0);

                // Musí mít nějaký prodej
                if (sales <= 0) return false;

                let nameMatch = true;
                let cityMatch = true;
                let categoryMatch = true;

                if (eventName) {
                    nameMatch = utils.fuzzySearch(eventName.toLowerCase(), rowName, 0.7);
                }

                if (city) {
                    cityMatch = utils.fuzzySearch(city.toLowerCase(), rowCity, 0.8);
                }

                if (category) {
                    categoryMatch = utils.fuzzySearch(category.toLowerCase(), rowCategory, 0.8);
                }

                return nameMatch && cityMatch && categoryMatch;
            });

            // Seřazení podle prodejů
            matches.sort((a, b) => {
                const aSales = parseFloat(a[salesColumn] || 0);
                const bSales = parseFloat(b[salesColumn] || 0);
                return bSales - aSales;
            });

            // Vytvoření shrnutí
            let summary = null;
            if (matches.length > 0) {
                const totalSales = matches.reduce((sum, row) => sum + parseFloat(row[salesColumn] || 0), 0);
                const avgSales = totalSales / matches.length;

                summary = {
                    count: matches.length,
                    avgSales: Math.round(avgSales),
                    totalSales: Math.round(totalSales)
                };
            }

            console.log(`📊 Nalezeno ${matches.length} historických záznamů`);
            return { matches, summary };

        } catch (error) {
            console.error('Chyba při vyhledávání historických dat:', error);
            return { matches: [], summary: null };
        }
    },

    // Uložení predikce (simulace)
    async savePrediction(predictionData) {
        try {
            console.log('💾 Ukládám predikci:', predictionData);
            ui.showNotification('💾 Ukládám predikci...', 'info');

            // Simulace API volání
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Přidání do lokálních dat
            const newRecord = {
                'Datum': predictionData.date,
                'Lokalita': predictionData.city,
                'Název akce': predictionData.name,
                'kategorie': predictionData.category,
                'realně prodáno': predictionData.predictedSales,
                'návstěvnost': predictionData.expectedVisitors,
                'poznámka': 'PREDIKCE - ' + new Date().toLocaleString('cs-CZ')
            };

            globalData.historicalData.unshift(newRecord);

            ui.showNotification('✅ Predikce byla úspěšně uložena!', 'success');
            return true;

        } catch (error) {
            console.error('Chyba při ukládání predikce:', error);
            ui.showNotification('❌ Chyba při ukládání predikce: ' + error.message, 'error');
            return false;
        }
    },

    // Získání základních statistik
    getDataStats() {
        if (globalData.historicalData.length === 0) {
            return {
                totalEvents: 0,
                eventsWithSales: 0,
                totalSales: 0,
                avgSalesPerEvent: 0
            };
        }

        try {
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);

            const eventsWithSales = globalData.historicalData.filter(row => {
                const sales = parseFloat(row[salesColumn] || 0);
                return sales > 0;
            });

            const totalSales = eventsWithSales.reduce((sum, row) => {
                return sum + parseFloat(row[salesColumn] || 0);
            }, 0);

            return {
                totalEvents: globalData.historicalData.length,
                eventsWithSales: eventsWithSales.length,
                totalSales: Math.round(totalSales),
                avgSalesPerEvent: eventsWithSales.length > 0 ? Math.round(totalSales / eventsWithSales.length) : 0
            };

        } catch (error) {
            console.error('Chyba při výpočtu statistik:', error);
            return {
                totalEvents: globalData.historicalData.length,
                eventsWithSales: 0,
                totalSales: 0,
                avgSalesPerEvent: 0
            };
        }
    },

    // Refresh dat
    async refreshData() {
        utils.clearCache();
        globalData.historicalData = [];
        await this.loadData();
    }
};
