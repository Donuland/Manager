// ========================================
// DONULAND MANAGEMENT SYSTEM - DATA MANAGER
// Správa načítání a ukládání dat z Google Sheets
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

            // Pokusíme se načíst data pomocí CORS proxy
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;
            
            const response = await utils.retry(async () => {
                const res = await fetch(proxyUrl);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res;
            });

            const data = await response.json();
            const csvText = data.contents;

            if (!csvText || csvText.trim().length === 0) {
                throw new Error('Prázdný response z Google Sheets');
            }

            // Parsování CSV dat
            globalData.historicalData = utils.parseCSV(csvText);
            globalData.lastDataLoad = new Date();

            console.log(`✅ Načteno ${globalData.historicalData.length} záznamů`);
            console.log('📊 Ukázka dat:', globalData.historicalData.slice(0, 2));

            // Aktualizace autocomplete s reálnými daty
            this.updateAutocomplete();

            // Aktualizace UI
            ui.showNotification(`✅ Úspěšně načteno ${globalData.historicalData.length} záznamů z Google Sheets!`, 'success');
            ui.updateStatusIndicator('online', `${globalData.historicalData.length} záznamů`);

            return globalData.historicalData;

        } catch (error) {
            console.error('Chyba při načítání Google Sheets:', error);
            
            // Pokusíme se o přímé připojení jako fallback
            try {
                const directUrl = `https://docs.google.com/spreadsheets/d/${utils.extractSheetId(document.getElementById('googleSheetsUrl').value)}/export?format=csv&gid=0`;
                console.log('🔄 Zkouším přímé připojení...');
                
                const directResponse = await fetch(directUrl, { 
                    mode: 'cors',
                    headers: {
                        'Accept': 'text/csv'
                    }
                });
                
                if (directResponse.ok) {
                    const csvText = await directResponse.text();
                    globalData.historicalData = utils.parseCSV(csvText);
                    ui.showNotification('✅ Data načtena přímým připojením', 'success');
                    ui.updateStatusIndicator('online', `${globalData.historicalData.length} záznamů`);
                    return globalData.historicalData;
                }
            } catch (directError) {
                console.warn('Přímé připojení také selhalo:', directError);
            }

            ui.showNotification(`❌ Chyba při načítání dat: ${error.message}. Zkontrolujte že Google Sheets je veřejný.`, 'error');
            ui.updateStatusIndicator('error', 'Chyba načítání');
            
            throw error;

        } finally {
            globalData.isLoading = false;
        }
    },

    // Aktualizace autocomplete seznamů z načtených dat
    updateAutocomplete() {
        if (globalData.historicalData.length === 0) return;

        try {
            // Nalezení správných sloupců
            const nameColumn = utils.findColumn(globalData.historicalData, ['Název akce', 'D', 'Event Name', 'Name']);
            const cityColumn = utils.findColumn(globalData.historicalData, ['Lokalita', 'C', 'Location', 'City']);

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
                console.log(`✅ Autocomplete aktualizován - ${eventNames.length} názvů akcí`);
            }

            // Aktualizace datalist pro města (přidáme k existujícím)
            const citiesDatalist = document.getElementById('citiesList');
            if (citiesDatalist && cities.length > 0) {
                // Zachováme existující města a přidáme nová z dat
                const existingCities = Array.from(citiesDatalist.options).map(opt => opt.value);
                const allCities = [...new Set([...existingCities, ...cities])].sort();
                
                citiesDatalist.innerHTML = allCities
                    .map(city => `<option value="${utils.escapeHtml(city)}">`)
                    .join('');
                console.log(`✅ Autocomplete aktualizován - ${allCities.length} měst celkem`);
            }

        } catch (error) {
            console.warn('Chyba při aktualizaci autocomplete:', error);
        }
    },

    // Získání historických dat pro konkrétní akci/město
    getHistoricalData(eventName = '', city = '', category = '') {
        if (globalData.historicalData.length === 0) {
            return { matches: [], summary: null };
        }

        try {
            const nameColumn = utils.findColumn(globalData.historicalData, ['Název akce', 'D']);
            const cityColumn = utils.findColumn(globalData.historicalData, ['Lokalita', 'C']);
            const categoryColumn = utils.findColumn(globalData.historicalData, ['kategorie', 'E']);
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);
            const ratingColumn = utils.findColumn(globalData.historicalData, ['hodnocení akce 1-5', 'X']);
            const visitorsColumn = utils.findColumn(globalData.historicalData, ['návstěvnost', 'Q']);

            // Filtrování podle kritérií
            let matches = globalData.historicalData.filter(row => {
                const rowName = (row[nameColumn] || '').toLowerCase().trim();
                const rowCity = (row[cityColumn] || '').toLowerCase().trim();
                const rowCategory = (row[categoryColumn] || '').toLowerCase().trim();
                const sales = parseFloat(row[salesColumn] || 0);

                // Musí mít nějaký prodej aby byl relevantní
                if (sales <= 0) return false;

                let nameMatch = true;
                let cityMatch = true;
                let categoryMatch = true;

                if (eventName) {
                    const eventLower = eventName.toLowerCase().trim();
                    nameMatch = utils.fuzzySearch(eventLower, rowName, 0.7);
                }

                if (city) {
                    const cityLower = city.toLowerCase().trim();
                    cityMatch = utils.fuzzySearch(cityLower, rowCity, 0.8);
                }

                if (category) {
                    const categoryLower = category.toLowerCase().trim();
                    categoryMatch = utils.fuzzySearch(categoryLower, rowCategory, 0.8);
                }

                return nameMatch && cityMatch && categoryMatch;
            });

            // Seřazení podle relevance (přesné shody první)
            matches.sort((a, b) => {
                const aName = (a[nameColumn] || '').toLowerCase();
                const bName = (b[nameColumn] || '').toLowerCase();
                const searchName = eventName.toLowerCase();

                if (aName === searchName && bName !== searchName) return -1;
                if (bName === searchName && aName !== searchName) return 1;
                
                // Seřazení podle prodejů
                const aSales = parseFloat(a[salesColumn] || 0);
                const bSales = parseFloat(b[salesColumn] || 0);
                return bSales - aSales;
            });

            // Vytvoření shrnutí
            let summary = null;
            if (matches.length > 0) {
                const totalSales = matches.reduce((sum, row) => sum + parseFloat(row[salesColumn] || 0), 0);
                const avgSales = totalSales / matches.length;
                const avgRating = matches.reduce((sum, row) => sum + parseFloat(row[ratingColumn] || 0), 0) / matches.length;
                const avgVisitors = matches.reduce((sum, row) => sum + parseFloat(row[visitorsColumn] || 0), 0) / matches.length;

                summary = {
                    count: matches.length,
                    avgSales: Math.round(avgSales),
                    totalSales: Math.round(totalSales),
                    avgRating: Math.round(avgRating * 10) / 10,
                    avgVisitors: Math.round(avgVisitors)
                };
            }

            console.log(`📊 Nalezeno ${matches.length} historických záznamů pro "${eventName}" v "${city}"`);
            return { matches, summary };

        } catch (error) {
            console.error('Chyba při vyhledávání historických dat:', error);
            return { matches: [], summary: null };
        }
    },

    // Uložení predikce do Google Sheets
    async savePrediction(predictionData) {
        try {
            console.log('💾 Ukládám predikci:', predictionData);

            // Pro demonstraci zatím jen simulujeme uložení
            // V reálné implementaci by se použilo Google Sheets API
            ui.showNotification('💾 Ukládám predikci...', 'info');

            // Simulace API volání
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Přidání do lokálních dat pro okamžité zobrazení
            const newRecord = {
                'Datum': predictionData.date,
                'Lokalita': predictionData.city,
                'Název akce': predictionData.name,
                'kategorie': predictionData.category,
                'realně prodáno': predictionData.predictedSales,
                'návstěvnost': predictionData.expectedVisitors,
                'konkurence': predictionData.competition,
                'hodnocení akce 1-5': '', // Bude vyplněno po akci
                'poznámka': 'PREDIKCE - ' + new Date().toLocaleString('cs-CZ')
            };

            globalData.historicalData.unshift(newRecord);

            ui.showNotification('✅ Predikce byla úspěšně uložena!', 'success');
            console.log('✅ Predikce uložena úspěšně');

            return true;

        } catch (error) {
            console.error('Chyba při ukládání predikce:', error);
            ui.showNotification('❌ Chyba při ukládání predikce: ' + error.message, 'error');
            return false;
        }
    },

    // Získání statistik dat
    getDataStats() {
        if (globalData.historicalData.length === 0) {
            return {
                totalEvents: 0,
                eventsWithSales: 0,
                totalSales: 0,
                avgSalesPerEvent: 0,
                dateRange: null
            };
        }

        try {
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);
            const dateColumn = utils.findColumn(globalData.historicalData, ['Datum', 'B']);

            const eventsWithSales = globalData.historicalData.filter(row => {
                const sales = parseFloat(row[salesColumn] || 0);
                return sales > 0;
            });

            const totalSales = eventsWithSales.reduce((sum, row) => {
                return sum + parseFloat(row[salesColumn] || 0);
            }, 0);

            const dates = globalData.historicalData
                .map(row => row[dateColumn])
                .filter(date => date && date.trim())
                .sort();

            return {
                totalEvents: globalData.historicalData.length,
                eventsWithSales: eventsWithSales.length,
                totalSales: Math.round(totalSales),
                avgSalesPerEvent: eventsWithSales.length > 0 ? Math.round(totalSales / eventsWithSales.length) : 0,
                dateRange: dates.length > 0 ? {
                    from: dates[0],
                    to: dates[dates.length - 1]
                } : null,
                lastUpdate: globalData.lastDataLoad
            };

        } catch (error) {
            console.error('Chyba při výpočtu statistik:', error);
            return {
                totalEvents: globalData.historicalData.length,
                eventsWithSales: 0,
                totalSales: 0,
                avgSalesPerEvent: 0,
                dateRange: null
            };
        }
    },

    // Vymazání cache a refresh dat
    async refreshData() {
        utils.clearCache();
        globalData.historicalData = [];
        await this.loadData();
    }
};
