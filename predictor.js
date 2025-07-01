// ========================================
// DONULAND MANAGEMENT SYSTEM - AI PREDICTOR
// Zjednodušený predikční engine
// ========================================

const predictor = {
    // Hlavní funkce pro aktualizaci predikce
    async updatePrediction() {
        debug('🤖 Spouštím aktualizaci predikce...');
        
        const eventData = this.gatherEventData();
        const validationErrors = ui.validateForm();
        
        if (validationErrors.length > 0) {
            document.getElementById('predictionResults').innerHTML = `
                <div class="error-state">
                    <div class="error-state-icon">📋</div>
                    <div class="error-state-title">Vyplňte všechny povinné údaje</div>
                    <div class="error-state-message">Chybí: ${validationErrors.join(', ')}</div>
                </div>
            `;
            return;
        }

        try {
            ui.showLoading('predictionResults', 'Počítám predikci...');

            // AI predikce
            const prediction = await this.calculatePrediction(eventData);
            
            // Business výpočty
            const businessResults = this.calculateBusinessMetrics(eventData, prediction);
            
            // Zobrazení výsledků
            ui.displayPredictionResults(prediction, businessResults, eventData);
            
            // Zobrazení historických dat
            const historicalData = dataManager.getHistoricalData(
                eventData.name, 
                eventData.city, 
                eventData.category
            );
            ui.displayHistoricalInsights(historicalData);

        } catch (error) {
            debugError('Chyba při výpočtu predikce:', error);
            ui.showError('predictionResults', 
                'Chyba při výpočtu predikce', 
                error.message,
                { text: '🔄 Zkusit znovu', onclick: 'predictor.updatePrediction()' }
            );
        }
    },

    // Sběr dat z formuláře
    gatherEventData() {
        return {
            name: document.getElementById('eventName').value.trim(),
            category: document.getElementById('eventCategory').value.trim(),
            city: document.getElementById('eventCity').value.trim(),
            date: document.getElementById('eventDate').value,
            duration: parseInt(document.getElementById('eventDuration').value) || 1,
            expectedVisitors: parseInt(document.getElementById('expectedVisitors').value) || 0,
            competition: parseInt(document.getElementById('competition').value) || 2,
            businessModel: document.getElementById('businessModel').value,
            rentType: document.getElementById('rentType').value,
            fixedRent: parseFloat(document.getElementById('fixedRent').value) || 0,
            percentageRent: parseFloat(document.getElementById('percentageRent').value) || 0,
            mixedFixed: parseFloat(document.getElementById('mixedFixed').value) || 0,
            mixedPercentage: parseFloat(document.getElementById('mixedPercentage').value) || 0,
            distance: parseFloat(document.getElementById('distance').value) || 0,
            donutPrice: parseFloat(document.getElementById('donutPrice').value) || CONFIG.DONUT_PRICE
        };
    },

    // Zjednodušený predikční algoritmus
    async calculatePrediction(eventData) {
        debug('🧠 Spouštím predikční algoritmus...');
        
        // Základní konverzní poměr podle kategorie
        let baseConversion = this.getBaseConversionRate(eventData.category);
        
        // Faktor podle historických dat
        const historicalFactor = this.calculateHistoricalFactor(eventData);
        
        // Faktor podle počasí (zjednodušený)
        const weatherFactor = await this.calculateWeatherFactor(eventData);
        
        // Faktor podle konkurence
        const competitionFactor = CONFIG.COMPETITION_FACTORS[eventData.competition] || 1.0;
        
        // Faktor podle velikosti města
        const cityFactor = this.calculateCityFactor(eventData.city);
        
        // Faktor podle délky akce
        const durationFactor = Math.min(eventData.duration * 0.8 + 0.2, 2.0);
        
        // Finální konverzní poměr
        const finalConversion = baseConversion * 
                              historicalFactor * 
                              weatherFactor * 
                              competitionFactor * 
                              cityFactor * 
                              durationFactor;
        
        // Výpočet predikovaného prodeje
        let predictedSales = Math.round(eventData.expectedVisitors * finalConversion);
        
        // Minimální a maximální hodnoty
        const minSales = Math.max(Math.round(eventData.expectedVisitors * 0.02), 20);
        const maxSales = Math.round(eventData.expectedVisitors * 0.4);
        
        predictedSales = Math.max(Math.min(predictedSales, maxSales), minSales);
        
        // Výpočet spolehlivosti predikce
        const confidence = this.calculateConfidence(eventData, historicalFactor);
        
        debug('📊 Predikční faktory:', {
            base: baseConversion,
            historical: historicalFactor,
            weather: weatherFactor,
            competition: competitionFactor,
            city: cityFactor,
            duration: durationFactor,
            final: finalConversion,
            predictedSales: predictedSales
        });
        
        return {
            predictedSales: predictedSales,
            confidence: confidence,
            factors: {
                historical: historicalFactor,
                weather: weatherFactor,
                competition: competitionFactor,
                city: cityFactor,
                duration: durationFactor
            }
        };
    },

    // Základní konverzní poměr podle kategorie
    getBaseConversionRate(category) {
        const categoryFactors = {
            'veletrh': 0.18,                    // ČokoFest a podobné
            'food festival': 0.15,             // Food festivaly
            'rodinný festival': 0.14,          // Rodinné akce
            'kulturní akce (rodinná)': 0.12,   // Kulturní akce
            'koncert': 0.08,                   // Koncerty
            'Sportovní akce (dospělí)': 0.06,  // Sportovní akce
            'ostatní': 0.10                    // Výchozí hodnota
        };

        return categoryFactors[category] || 0.10;
    },
    // Faktor podle historických dat (zjednodušený)
    calculateHistoricalFactor(eventData) {
        if (globalData.historicalData.length === 0) {
            debug('📊 Žádná historická data - používám neutrální faktor');
            return 1.0;
        }

        try {
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);
            const nameColumn = utils.findColumn(globalData.historicalData, ['Název akce', 'D']);
            const categoryColumn = utils.findColumn(globalData.historicalData, ['kategorie', 'E']);

            // Hledáme podobné akce
            const similarEvents = globalData.historicalData.filter(row => {
                const rowName = (row[nameColumn] || '').toLowerCase().trim();
                const rowCategory = (row[categoryColumn] || '').toLowerCase().trim();
                const eventName = eventData.name.toLowerCase().trim();
                const eventCategory = eventData.category.toLowerCase().trim();
                const sales = parseFloat(row[salesColumn] || 0);
                
                return sales > 0 && (
                    utils.fuzzySearch(eventName, rowName, 0.8) ||
                    rowCategory === eventCategory
                );
            });

            if (similarEvents.length > 0) {
                const avgSales = similarEvents.reduce((sum, row) => {
                    return sum + parseFloat(row[salesColumn] || 0);
                }, 0) / similarEvents.length;

                // Porovnání s očekávaným průměrem
                const expectedAvg = eventData.expectedVisitors * this.getBaseConversionRate(eventData.category);
                const factor = avgSales / expectedAvg;
                
                debug(`📈 Historický faktor: ${factor.toFixed(2)} (${similarEvents.length} podobných akcí)`);
                return Math.max(Math.min(factor, 3.0), 0.3);
            }

            return 1.0;

        } catch (error) {
            debugError('Chyba při výpočtu historického faktoru:', error);
            return 1.0;
        }
    },

    // Faktor podle počasí (zjednodušený)
    async calculateWeatherFactor(eventData) {
        try {
            const weather = await weatherService.getWeather(eventData.city, eventData.date);
            return weatherService.calculateWeatherFactor(weather);
        } catch (error) {
            debugWarn('Chyba při získávání počasí:', error);
            return 1.0; // Neutrální faktor
        }
    },

    // Faktor podle velikosti města
    calculateCityFactor(city) {
        const cityLower = utils.removeDiacritics(city.toLowerCase());
        
        for (const [knownCity, factor] of Object.entries(CONFIG.CITY_FACTORS)) {
            if (cityLower.includes(knownCity) || knownCity.includes(cityLower)) {
                debug(`🏙️ City faktor pro ${city}: ${factor}`);
                return factor;
            }
        }
        
        debug(`🏙️ City faktor pro ${city}: ${CONFIG.CITY_FACTORS.default} (default)`);
        return CONFIG.CITY_FACTORS.default;
    },

    // Výpočet spolehlivosti predikce
    calculateConfidence(eventData, historicalFactor) {
        let confidence = 60; // Základní spolehlivost

        // Zvýšení podle množství historických dat
        const dataCount = globalData.historicalData.length;
        if (dataCount > 50) {
            confidence += 20;
        } else if (dataCount > 20) {
            confidence += 15;
        } else if (dataCount > 5) {
            confidence += 10;
        }

        // Snížení pro extrémní případy
        if (eventData.expectedVisitors > 10000) {
            confidence -= 15;
        } else if (eventData.expectedVisitors < 100) {
            confidence -= 10;
        }

        // Úprava podle historického faktoru
        if (historicalFactor > 2 || historicalFactor < 0.5) {
            confidence -= 10;
        }

        return Math.max(Math.min(confidence, 95), 25);
    },

    // Výpočet business metrik
    calculateBusinessMetrics(eventData, prediction) {
        const donutPrice = eventData.donutPrice;
        const donutCost = parseFloat(document.getElementById('donutCost').value) || CONFIG.DONUT_COST;
        const franchisePrice = parseFloat(document.getElementById('franchisePrice').value) || CONFIG.FRANCHISE_PRICE;
        const hourlyWage = parseFloat(document.getElementById('hourlyWage').value) || CONFIG.HOURLY_WAGE;
        const workHours = parseFloat(document.getElementById('workHours').value) || CONFIG.WORK_HOURS;
        const fuelCostPerKm = parseFloat(document.getElementById('fuelCostPerKm').value) || CONFIG.FUEL_COST_PER_KM;

        // Základní výpočty
        const revenue = prediction.predictedSales * donutPrice;
        const productionCosts = prediction.predictedSales * donutCost;

        // Doprava (tam a zpět)
        const transportCosts = eventData.distance * 2 * fuelCostPerKm;

        // Mzdy podle business modelu
        let laborCosts = 0;
        let revenueShare = 0;
        let franchiseProfit = 0;

        switch(eventData.businessModel) {
            case 'owner':
                laborCosts = 2 * hourlyWage * workHours; // 2 brigádníci
                break;
            case 'employee':
                laborCosts = 2 * hourlyWage * workHours; // vy + 1 brigádník
                revenueShare = revenue * 0.05; // 5% z obratu
                break;
            case 'franchise':
                franchiseProfit = prediction.predictedSales * (franchisePrice - donutCost);
                break;
        }

        // Nájem
        let rentCosts = 0;
        switch(eventData.rentType) {
            case 'fixed':
                rentCosts = eventData.fixedRent;
                break;
            case 'percentage':
                rentCosts = revenue * (eventData.percentageRent / 100);
                break;
            case 'mixed':
                rentCosts = eventData.mixedFixed + (revenue * (eventData.mixedPercentage / 100));
                break;
            case 'free':
                rentCosts = 0;
                break;
        }

        // Celkové náklady
        const totalCosts = productionCosts + transportCosts + laborCosts + revenueShare + rentCosts;

        // Zisk
        let profit;
        if (eventData.businessModel === 'franchise') {
            profit = franchiseProfit;
        } else {
            profit = revenue - totalCosts;
        }

        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
            revenue,
            costs: {
                production: productionCosts,
                transport: transportCosts,
                labor: laborCosts,
                revenueShare,
                rent: rentCosts,
                total: totalCosts
            },
            profit,
            profitMargin,
            franchiseProfit
        };
    },
    // Aktualizace vzdálenosti
    async updateDistance() {
        const city = document.getElementById('eventCity').value.trim();
        const distanceInput = document.getElementById('distance');
        
        if (!city) {
            distanceInput.value = '';
            return;
        }

        try {
            distanceInput.value = 'Počítám...';
            const distance = await mapsService.calculateDistance(CONFIG.BASE_CITY, city);
            distanceInput.value = distance;
            
            // Automaticky aktualizovat predikci pokud jsou všechna pole vyplněná
            if (this.isFormReadyForPrediction()) {
                this.updatePrediction();
            }
            
        } catch (error) {
            debugError('Chyba při výpočtu vzdálenosti:', error);
            distanceInput.value = 150; // Fallback
        }
    },

    // Aktualizace počasí
    async updateWeather() {
        const city = document.getElementById('eventCity').value.trim();
        const date = document.getElementById('eventDate').value;
        
        if (!city || !date) {
            weatherService.displayWeather({
                temp: 20,
                description: 'Vyberte město a datum pro načtení předpovědi počasí',
                main: 'Clear',
                humidity: 50,
                windSpeed: 2
            });
            return;
        }

        try {
            ui.showLoading('weatherDisplay', 'Načítám počasí...');
            const weather = await weatherService.getWeather(city, date);
            weatherService.displayWeather(weather);
            
            // Automaticky aktualizovat predikci pokud jsou všechna pole vyplněná
            if (this.isFormReadyForPrediction()) {
                this.updatePrediction();
            }
            
        } catch (error) {
            debugError('Chyba při načítání počasí:', error);
            ui.showError('weatherDisplay', 
                'Chyba při načítání počasí', 
                error.message,
                { text: '🔄 Zkusit znovu', onclick: 'predictor.updateWeather()' }
            );
        }
    },

    // Kontrola, zda je formulář připraven pro predikci
    isFormReadyForPrediction() {
        const requiredFields = [
            'eventName', 'eventCategory', 'eventCity', 'eventDate',
            'expectedVisitors', 'competition', 'businessModel', 'rentType'
        ];
        
        return requiredFields.every(fieldId => {
            const element = document.getElementById(fieldId);
            return element && element.value && element.value.trim().length > 0;
        });
    },

    // Uložení predikce
    async savePrediction() {
        const eventData = this.gatherEventData();
        const validationErrors = ui.validateForm();
        
        if (validationErrors.length > 0) {
            ui.showNotification('❌ Vyplňte všechny povinné údaje před uložením', 'error');
            return;
        }

        try {
            const prediction = await this.calculatePrediction(eventData);
            const businessResults = this.calculateBusinessMetrics(eventData, prediction);
            
            const predictionData = {
                ...eventData,
                predictedSales: prediction.predictedSales,
                confidence: prediction.confidence,
                estimatedRevenue: businessResults.revenue,
                estimatedProfit: businessResults.profit,
                timestamp: new Date().toISOString()
            };

            const success = await dataManager.savePrediction(predictionData);
            
            if (success) {
                ui.showNotification('✅ Predikce byla úspěšně uložena!', 'success');
            }

        } catch (error) {
            debugError('Chyba při ukládání predikce:', error);
            ui.showNotification('❌ Chyba při ukládání predikce: ' + error.message, 'error');
        }
    },

    // Export predikce do souboru
    exportPrediction() {
        try {
            const eventData = this.gatherEventData();
            
            let exportText = `DONULAND - PREDIKCE AKCE\n`;
            exportText += `==============================\n\n`;
            exportText += `Název akce: ${eventData.name}\n`;
            exportText += `Kategorie: ${eventData.category}\n`;
            exportText += `Město: ${eventData.city}\n`;
            exportText += `Datum: ${utils.formatDate(eventData.date)}\n`;
            exportText += `Očekávaná návštěvnost: ${utils.formatNumber(eventData.expectedVisitors)}\n`;
            exportText += `Business model: ${eventData.businessModel}\n\n`;
            
            // Získání aktuálních výsledků
            const resultsDiv = document.getElementById('predictionResults');
            if (resultsDiv) {
                const resultItems = resultsDiv.querySelectorAll('.result-item');
                exportText += `VÝSLEDKY PREDIKCE:\n`;
                exportText += `==================\n`;
                
                resultItems.forEach(item => {
                    const value = item.querySelector('.result-value')?.textContent || '';
                    const label = item.querySelector('.result-label')?.textContent || '';
                    exportText += `${label}: ${value}\n`;
                });
            }
            
            exportText += `\n\nExportováno: ${new Date().toLocaleString('cs-CZ')}\n`;
            exportText += `Donuland Management System\n`;
            
            // Stažení jako textový soubor
            const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `donuland-predikce-${eventData.name.replace(/[^a-z0-9]/gi, '_')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ui.showNotification('📄 Predikce exportována do souboru', 'success');
            
        } catch (error) {
            debugError('Chyba při exportu:', error);
            ui.showNotification('❌ Chyba při exportu predikce', 'error');
        }
    }
};
